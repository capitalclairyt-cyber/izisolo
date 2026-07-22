import { createAdminClient } from '@/lib/supabase-admin';
import { listeAttenteSchema } from '@/lib/validation';
import { checkAntiBot, ipFromRequest } from '@/lib/antibot';
import { studioHasFeature } from '@/lib/plan-guard';
import { sendEmail } from '@/lib/email';
import { sendPushToUser } from '@/lib/push-server';
import { wantsNotif } from '@/lib/notif-prefs';
import { escapeIlike } from '@/lib/utils';

export async function POST(request, { params }) {
  const { studioSlug } = await params;
  // Body brut lu une seule fois : website/turnstileToken sont hors schéma zod.
  const rawBody = await request.json().catch(() => null);
  if (!rawBody) return Response.json({ error: 'Body JSON invalide' }, { status: 400 });

  // Anti-bot : honeypot + rate limit + Turnstile — même pipeline que /reserver.
  // Route publique qui insère nom/email/tel arbitraires → borne anti-spam.
  const antibot = await checkAntiBot(request, {
    honeypot: rawBody.website,
    turnstileToken: rawBody.turnstileToken,
    max: 10,
    scope: 'liste-attente',
  });
  if (!antibot.ok) {
    console.warn('[liste-attente] antibot rejected:', antibot.code, 'ip=', ipFromRequest(request));
    return Response.json({ error: antibot.reason }, { status: antibot.code === 'RATE_LIMITED' ? 429 : 400 });
  }

  const parsed = listeAttenteSchema.safeParse(rawBody);
  if (!parsed.success) return Response.json({ error: 'Données invalides' }, { status: 400 });
  const { coursId, nom, email, tel } = parsed.data;

  const supabaseAdmin = createAdminClient();

  // Vérifier studio + cours
  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('id, studio_nom, plan, trial_started_at, stripe_subscription_status, notif_prefs')
    .eq('studio_slug', studioSlug)
    .single();
  if (!profile) return Response.json({ error: 'Studio introuvable' }, { status: 404 });

  // Gate plan (Sprint 3) : la liste d'attente est une feature Pro du STUDIO
  if (!studioHasFeature(profile, 'listeAttente')) {
    return Response.json({
      error: 'La liste d\'attente n\'est pas disponible pour ce studio.',
    }, { status: 403 });
  }

  const { data: cours } = await supabaseAdmin
    .from('cours')
    .select('id, nom, date, heure, capacite_max, est_annule, profile_id')
    .eq('id', coursId)
    .eq('profile_id', profile.id)
    .single();
  if (!cours) return Response.json({ error: 'Cours introuvable' }, { status: 404 });
  if (cours.est_annule) return Response.json({ error: 'Ce cours est annulé' }, { status: 400 });

  const today = new Date().toISOString().slice(0, 10);
  if (cours.date < today) return Response.json({ error: 'Ce cours est passé' }, { status: 400 });

  // Vérifier que le cours est BIEN complet (sécurité : pas la peine d'inscrire en LA si une place est libre)
  if (!cours.capacite_max) {
    return Response.json({ error: 'Ce cours n\'a pas de capacité limitée' }, { status: 400 });
  }
  const { count: nbInscrits } = await supabaseAdmin
    .from('presences')
    .select('id', { count: 'exact', head: true })
    .eq('cours_id', coursId);
  if ((nbInscrits || 0) < cours.capacite_max) {
    return Response.json({ error: 'Ce cours a encore des places — réserve directement.' }, { status: 400 });
  }

  // Lier au client si email connu dans ce studio
  const { data: existingClient } = await supabaseAdmin
    .from('clients')
    .select('id')
    .eq('profile_id', profile.id)
    .ilike('email', escapeIlike(email))
    .maybeSingle();

  // Bloquer si l'élève est déjà inscrit (presence) à ce cours
  if (existingClient?.id) {
    const { data: dejaInscrit } = await supabaseAdmin
      .from('presences')
      .select('id')
      .eq('cours_id', coursId)
      .eq('client_id', existingClient.id)
      .maybeSingle();
    if (dejaInscrit) {
      return Response.json({ error: 'Tu es déjà inscrit·e à ce cours — pas besoin de la liste d\'attente.' }, { status: 409 });
    }
  }

  // Déjà en liste d'attente pour ce cours ? → idempotent, on renvoie sa
  // position EXISTANTE sans la recalculer (bug historique : le re-submit
  // faisait un upsert avec position = count+1, qui s'incrémentait à chaque
  // envoi) et sans re-notifier (pas de spam prof/élève).
  const { data: dejaEnListe } = await supabaseAdmin
    .from('liste_attente')
    .select('id, position')
    .eq('cours_id', coursId)
    .ilike('email', escapeIlike(email))
    .maybeSingle();
  if (dejaEnListe) {
    return Response.json({ ok: true, position: dejaEnListe.position, deja: true });
  }

  // Nouvelle inscription : position = taille actuelle + 1 (INSERT, pas upsert).
  const { count: tailleListe } = await supabaseAdmin
    .from('liste_attente')
    .select('id', { count: 'exact', head: true })
    .eq('cours_id', coursId);
  const position = (tailleListe || 0) + 1;

  const { data: row, error: insertErr } = await supabaseAdmin
    .from('liste_attente')
    .insert({
      profile_id: profile.id,
      cours_id: coursId,
      client_id: existingClient?.id || null,
      email,
      nom,
      telephone: tel || null,
      position,
    })
    .select('id, position')
    .single();

  if (insertErr) {
    // 23505 = deux inscriptions simultanées du même email (course rare) →
    // l'autre a gagné, l'élève est bien en liste : on ne montre pas d'erreur.
    if (insertErr.code === '23505') {
      return Response.json({ ok: true, position, deja: true });
    }
    console.error('liste-attente insert error:', insertErr);
    return Response.json({ error: 'Erreur lors de l\'inscription' }, { status: 500 });
  }

  // Email de PROF pour reply-to (l'élève peut répondre pour se retirer)
  let proEmail = null;
  try {
    const { data: { user: proUser } } = await supabaseAdmin.auth.admin.getUserById(profile.id);
    proEmail = proUser?.email || null;
  } catch {}

  const dateStr = cours.date
    ? new Date(cours.date + 'T12:00:00').toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })
    : 'la date prévue';
  const heureStr = cours.heure ? ` à ${cours.heure.slice(0, 5).replace(':', 'h')}` : '';
  const finalPosition = row?.position || position;
  const prenom = (nom || '').split(' ')[0] || '';

  // Email de confirmation à l'élève (non bloquant) : position + comment se retirer.
  try {
    await sendEmail({
      categorie: 'notification',
      replyTo: proEmail,
      to: email,
      subject: `Tu es sur la liste d'attente — ${cours.nom || 'ton cours'}`,
      html: `
        <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:560px;margin:0 auto;padding:24px;">
          <h2 style="color:#b87333;margin:0 0 6px;">C'est noté !</h2>
          <p style="color:#555;margin:0 0 14px;">${prenom ? `Bonjour ${prenom},` : 'Bonjour,'}</p>
          <p style="color:#555;margin:0 0 14px;">
            Le cours <strong>${cours.nom || ''}</strong> (${dateStr}${heureStr}) est complet.
            Tu es inscrit·e sur la liste d'attente en <strong>position ${finalPosition}</strong>.
          </p>
          <p style="color:#555;margin:0 0 14px;">
            Si une place se libère, tu recevras automatiquement un email — ta place
            sera alors réservée, tu n'auras rien à faire.
          </p>
          <p style="color:#999;margin:16px 0 0;font-size:0.8125rem;">
            Tu ne veux plus attendre ce cours ? Réponds simplement à cet email et
            ${profile.studio_nom || 'ton studio'} te retirera de la liste.
          </p>
        </div>
      `,
    });
  } catch (e) { console.error('[liste-attente] email confirmation non-bloquant:', e?.message); }

  // Notification cloche côté prof (non bloquant, gaté sur pref Appli).
  if (wantsNotif(profile.notif_prefs, 'liste_attente', 'prof', 'inapp')) {
    try {
      await supabaseAdmin.from('notifications').insert({
        profile_id: profile.id,
        type: 'liste_attente',
        titre: 'Nouvelle inscription en liste d\'attente',
        corps: `${nom || email} attend une place — ${cours.nom || 'cours'} (${dateStr}${heureStr}).`,
        data: { cours_id: coursId, email },
        lu: false,
      });
    } catch (e) { console.error('[liste-attente] notif prof non-bloquant:', e?.message); }
  }

  // Push prof (gaté sur pref liste_attente ; no-op sans abonnement)
  sendPushToUser(profile.id, {
    title: `Nouvelle inscription en liste d'attente ⏳`,
    body: `${nom || email} attend une place — ${cours.nom || 'cours'} (${dateStr}${heureStr}).`,
    url: '/liste-attente',
    tag: `la-inscr-${coursId}`,
  }, { type: 'liste_attente' }).catch(() => {});

  return Response.json({ ok: true, position: finalPosition });
}
