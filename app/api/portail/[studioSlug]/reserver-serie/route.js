import { createServerClient } from '@/lib/supabase-server';
import { createAdminClient } from '@/lib/supabase-admin';
import { reserverSerieSchema } from '@/lib/validation';
import { checkRateLimitIP } from '@/lib/antibot';
import { sendPushToUser } from '@/lib/push-server';
import { wantsNotif } from '@/lib/notif-prefs';
import { escapeIlike } from '@/lib/utils';
import { reportError } from '@/lib/report';
import { canSeeCours, resolveClientInfo } from '@/lib/visibilite';
import { coursDejaCommence } from '@/lib/dates';
import { getRegle } from '@/lib/regles-metier';
import { sendEmail } from '@/lib/email';
import { buildPortailMagicLink } from '@/lib/portail-magic-link';

/**
 * POST /api/portail/[studioSlug]/reserver-serie
 *
 * Inscrit l'élève authentifié à toutes les occurrences futures d'un cours
 * récurrent jusqu'à une date donnée.
 *
 * Body : { coursId, jusquAu (YYYY-MM-DD) }
 *
 * Retourne : { ok, booked: [...], skipped: [...] }
 *   - booked : { coursId, date, heure } pour chaque inscription créée
 *   - skipped : { coursId, date, reason } pour chaque skip
 */
export async function POST(request, { params }) {
  const { studioSlug } = await params;

  // Rate-limit IP : route d'écriture qui boucle sur N occurrences — on borne
  // le volume par IP (10/h), compteur isolé du reste via le scope.
  const rl = await checkRateLimitIP(request, { max: 10, scope: 'reserver-serie' });
  if (!rl.ok) return Response.json({ error: rl.reason }, { status: 429 });

  let body;
  try { body = await request.json(); } catch { return Response.json({ error: 'JSON invalide' }, { status: 400 }); }
  const { coursId, jusquAu } = body || {};
  if (!coursId || !jusquAu) {
    return Response.json({ error: 'coursId et jusquAu requis' }, { status: 400 });
  }
  // Validation zod : coursId UUID + jusquAu date YYYY-MM-DD.
  // On ne renvoie pas le détail brut zod.
  if (!reserverSerieSchema.safeParse(body).success) {
    return Response.json({ error: 'Données invalides' }, { status: 400 });
  }

  // Auth requise (l'élève doit être connecté pour s'inscrire en série)
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: 'Tu dois être connecté·e' }, { status: 401 });

  const supabaseAdmin = createAdminClient();

  // Studio
  const { data: profile } = await supabaseAdmin
    .from('profiles').select('id, studio_nom, notif_prefs').eq('studio_slug', studioSlug).single();
  if (!profile) return Response.json({ error: 'Studio introuvable' }, { status: 404 });

  // Client lié à cet email dans ce studio
  const { data: client } = await supabaseAdmin
    .from('clients').select('id, prenom').eq('profile_id', profile.id).ilike('email', escapeIlike(user.email)).maybeSingle();
  if (!client) return Response.json({ error: 'Client introuvable' }, { status: 404 });

  // Cours de référence
  const { data: baseCours } = await supabaseAdmin
    .from('cours')
    .select('id, recurrence_parent_id, date, nom, heure, visibilite')
    .eq('id', coursId)
    .eq('profile_id', profile.id)
    .single();
  if (!baseCours) return Response.json({ error: 'Cours introuvable' }, { status: 404 });
  if (!baseCours.recurrence_parent_id) {
    return Response.json({ error: 'Ce cours n\'est pas récurrent' }, { status: 400 });
  }

  // ── Visibilité (v73) : mêmes règles que l'UI, appliquées à la série ──────
  // (les occurrences d'une même série partagent la visibilité du cours de
  // référence). Un cours privé ne se réserve jamais côté élève.
  if (baseCours.visibilite && baseCours.visibilite !== 'public') {
    if (baseCours.visibilite === 'prive') {
      return Response.json({ error: 'Ce cours est sur invitation.' }, { status: 403 });
    }
    const clientInfo = await resolveClientInfo(supabaseAdmin, profile.id, user.email);
    if (!canSeeCours(baseCours.visibilite, clientInfo)) {
      return Response.json({ error: 'Ce cours est réservé à certain·es élèves du studio.' }, { status: 403 });
    }
  }

  if (jusquAu < baseCours.date) {
    return Response.json({ error: 'La date limite doit être après le cours initial' }, { status: 400 });
  }

  // Toutes les occurrences futures (même recurrence_parent_id, date entre base et jusquAu, non annulées)
  const { data: futureCourses } = await supabaseAdmin
    .from('cours')
    .select('id, date, heure, capacite_max, est_annule')
    .eq('recurrence_parent_id', baseCours.recurrence_parent_id)
    .eq('profile_id', profile.id)
    .gte('date', baseCours.date)
    .lte('date', jusquAu)
    .order('date', { ascending: true });

  // ── Garde-fous alignés sur la résa unitaire (audit 2026-07-25) ───────────
  // La série sautait 3 contrôles de /reserver : occurrences passées, cap
  // hebdo d'abonnement, règle « élève sans carnet ».
  const { data: abosActifs } = await supabaseAdmin
    .from('abonnements')
    .select('id, statut, date_fin, offre:offres(seances_par_semaine)')
    .eq('client_id', client.id)
    .eq('profile_id', profile.id)
    .eq('statut', 'actif');
  const aboCap = Math.max(0, ...(abosActifs || []).map(a => a.offre?.seances_par_semaine || 0));

  // Sans AUCUN abo actif : la règle eleve_sans_carnet s'applique à la série.
  const regleSansCarnet = getRegle({ regles_metier: profile.regles_metier }, 'eleve_sans_carnet');
  if ((abosActifs || []).length === 0) {
    if (regleSansCarnet.mode === 'auto' && regleSansCarnet.choix === 'bloquer') {
      return Response.json({
        error: 'Tu dois avoir un carnet ou un abonnement actif pour réserver. Contacte ton studio pour acheter un carnet.',
        code: 'NO_PACKAGE',
      }, { status: 403 });
    }
    // Autres choix (dette / sur place / manuel) : UN cas pour la série entière.
    try {
      await supabaseAdmin.from('cas_a_traiter').insert({
        profile_id: profile.id,
        case_type: 'eleve_sans_carnet',
        client_id: client.id,
        cours_id: baseCours.id,
        context: {
          serie: true,
          jusqu_au: jusquAu,
          mode: regleSansCarnet.mode,
          choix_applique: regleSansCarnet.mode === 'auto' ? (regleSansCarnet.choix || 'paiement_sur_place') : null,
          client_nom: client.prenom || '',
          client_email: user.email,
        },
      });
    } catch (e) { reportError('[reserver-serie] cas sans-carnet (non-bloquant):', e); }
  }

  // Semaine ISO (lundi) d'une date — pour le cap hebdo sur TOUTES les semaines
  // de la série (la résa unitaire ne regarde qu'une semaine à la fois).
  const lundiDe = (dateStr) => {
    const d = new Date(dateStr + 'T00:00:00');
    const day = d.getDay() || 7;
    d.setDate(d.getDate() - (day - 1));
    return d.toISOString().slice(0, 10);
  };
  const parSemaine = {};
  if (aboCap > 0) {
    const { data: presExistantes } = await supabaseAdmin
      .from('presences')
      .select('id, cours:cours_id(date)')
      .eq('client_id', client.id)
      .eq('profile_id', profile.id);
    for (const p of presExistantes || []) {
      if (!p.cours?.date) continue;
      const sem = lundiDe(p.cours.date);
      parSemaine[sem] = (parSemaine[sem] || 0) + 1;
    }
  }

  const booked = [];
  const skipped = [];

  for (const c of futureCourses || []) {
    if (c.est_annule) {
      skipped.push({ coursId: c.id, date: c.date, reason: 'Cours annulé' });
      continue;
    }
    if (coursDejaCommence(c)) {
      skipped.push({ coursId: c.id, date: c.date, reason: 'Séance passée' });
      continue;
    }
    if (aboCap > 0) {
      const sem = lundiDe(c.date);
      if ((parSemaine[sem] || 0) >= aboCap) {
        skipped.push({ coursId: c.id, date: c.date, reason: `Limite ${aboCap}×/semaine atteinte` });
        continue;
      }
    }

    // Réservation ATOMIQUE (RPC v53) : doublon + capacité vérifiés sous
    // verrou par cours — remplace le check-insert-recheck-delete.
    const { data: resa, error: pErr } = await supabaseAdmin
      .rpc('reserver_place', {
        p_profile_id: profile.id,
        p_cours_id: c.id,
        p_client_id: client.id,
      });

    if (pErr) {
      reportError('[reserver-serie] rpc err:', pErr);
      skipped.push({ coursId: c.id, date: c.date, reason: 'Erreur' });
      continue;
    }
    if (!resa?.ok) {
      skipped.push({
        coursId: c.id,
        date: c.date,
        reason: resa?.reason === 'doublon' ? 'Déjà inscrit·e'
          : resa?.reason === 'complet' ? 'Complet'
          : resa?.reason === 'annule' ? 'Cours annulé'
          : 'Erreur',
      });
      continue;
    }

    booked.push({ coursId: c.id, date: c.date, heure: c.heure });
    if (aboCap > 0) {
      const sem = lundiDe(c.date);
      parSemaine[sem] = (parSemaine[sem] || 0) + 1; // la résa qu'on vient de poser compte
    }
  }

  // Notif prof — UNE seule notif récapitulative pour toute la série (≠ N notifs
  // qui spammeraient la cloche). Cloche in-app + push, non-bloquant.
  if (booked.length > 0) {
    const dDeb = new Date(booked[0].date + 'T12:00:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' });
    const dFin = new Date(booked[booked.length - 1].date + 'T12:00:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' });
    const corps = `${baseCours.nom} · ${booked.length} séance${booked.length > 1 ? 's' : ''} (du ${dDeb} au ${dFin})`;

    if (wantsNotif(profile.notif_prefs, 'reservation', 'prof', 'inapp')) {
      try {
        const expire = new Date(); expire.setDate(expire.getDate() + 3);
        await supabaseAdmin.from('notifications').upsert({
          profile_id: profile.id,
          type: 'reservation',
          titre: `🎉 Inscription en série — ${client.prenom || 'un·e élève'}`,
          corps,
          data: { client_id: client.id, cours_id: baseCours.id, cours_date: booked[0].date, nb: booked.length },
          ref_key: `serie_${baseCours.recurrence_parent_id}_${client.id}_${booked[0].date}`,
          expires_at: expire.toISOString(),
        }, { onConflict: 'profile_id,ref_key', ignoreDuplicates: true });
      } catch (e) { console.warn('[reserver-serie] notif cloche non-bloquant:', e?.message); }
    }

    sendPushToUser(profile.id, {
      title: `Inscription en série 🎉`,
      body: `${client.prenom || 'un·e élève'} — ${corps}`,
      url: '/agenda',
      tag: `resa-serie-${baseCours.recurrence_parent_id}`,
    }, { type: 'reservation' }).catch(() => {});

    // Email récap à l'ÉLÈVE (audit 2026-07-25 : N réservations sans aucune
    // trace écrite — la résa unitaire, elle, confirme toujours). Transactionnel
    // (confirmation de SES réservations) + accès direct à son espace.
    try {
      if (process.env.RESEND_API_KEY) {
        const magicLink = await buildPortailMagicLink({ email: user.email, studioSlug });
        const lignes = booked.slice(0, 8).map(b => {
          const d = new Date(b.date + 'T12:00:00').toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
          return `<li style="margin:2px 0;">${d}${b.heure ? ` à ${String(b.heure).slice(0, 5).replace(':', 'h')}` : ''}</li>`;
        }).join('');
        const reste = booked.length - Math.min(8, booked.length);
        await sendEmail({
          categorie: 'transactionnel',
          to: user.email,
          subject: `Tes ${booked.length} séances « ${baseCours.nom} » sont réservées ✓`,
          html: `
            <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:560px;margin:0 auto;padding:24px;">
              <h2 style="color:#b87333;margin:0 0 6px;">C'est noté ${client.prenom || ''} !</h2>
              <p style="color:#555;margin:0 0 12px;">
                Tu es inscrit·e à <strong>${booked.length} séance${booked.length > 1 ? 's' : ''}</strong> de
                « <strong>${baseCours.nom}</strong> » :
              </p>
              <ul style="color:#555;margin:0 0 12px;padding-left:20px;">${lignes}</ul>
              ${reste > 0 ? `<p style="color:#888;margin:0 0 12px;">… et ${reste} autre${reste > 1 ? 's' : ''}.</p>` : ''}
              ${skipped.length > 0 ? `<p style="color:#888;font-size:0.85rem;margin:0 0 12px;">${skipped.length} date${skipped.length > 1 ? 's' : ''} n'a/ont pas pu être réservée${skipped.length > 1 ? 's' : ''} (complet, passé…) — le détail est dans ton espace.</p>` : ''}
              ${magicLink ? `
              <div style="text-align:center;margin:20px 0;">
                <a href="${magicLink}" style="display:inline-block;padding:12px 26px;background:#b87333;color:white;text-decoration:none;border-radius:99px;font-weight:700;">Gérer mes séances</a>
              </div>` : ''}
              <p style="color:#999;font-size:0.8125rem;margin:16px 0 0;">Un empêchement ? Tu peux annuler chaque séance depuis ton espace, selon les règles du studio.</p>
            </div>
          `,
        });
      }
    } catch (e) { reportError('[reserver-serie] email récap élève (non-bloquant):', e?.message); }
  }

  return Response.json({
    ok: true,
    totalBooked: booked.length,
    totalSkipped: skipped.length,
    booked,
    skipped,
  });
}
