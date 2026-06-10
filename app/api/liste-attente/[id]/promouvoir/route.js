import { NextResponse } from 'next/server';
import { withRoute } from '@/lib/api-route';
import { createAdminClient } from '@/lib/supabase-admin';
import { Resend } from 'resend';
import { infosPratiquesBlock } from '@/lib/email-helpers';

/**
 * POST /api/liste-attente/[id]/promouvoir
 *
 * Promeut manuellement une personne de la liste d'attente vers une place
 * disponible : crée la presence, marque l'entrée comme notifiée, envoie l'email.
 *
 * Vérifications :
 *   - L'entrée existe et appartient au prof
 *   - Le cours n'est pas annulé / pas passé
 *   - Une place est dispo (count < capacite_max) — sinon refus
 *
 * Retour : { ok, presence_id, client_id }
 */
export const POST = withRoute({ auth: 'active' }, async ({ params, auth }) => {
  const { profile, user, supabase } = auth;
  const { id } = params;

  // Récupérer l'entrée liste_attente (filtrée par RLS profile_id)
  const { data: entry } = await supabase
    .from('liste_attente')
    .select('id, profile_id, cours_id, client_id, email, nom, telephone, notified_at, cours:cours_id(id, nom, date, heure, lieu, capacite_max, est_annule)')
    .eq('id', id)
    .eq('profile_id', profile.id)
    .single();

  if (!entry) return NextResponse.json({ error: 'Entrée introuvable' }, { status: 404 });
  if (entry.notified_at) {
    return NextResponse.json({ error: 'Personne déjà promue (notifiée le ' + new Date(entry.notified_at).toLocaleDateString('fr-FR') + ')' }, { status: 409 });
  }

  const cours = entry.cours;
  if (!cours) return NextResponse.json({ error: 'Cours introuvable' }, { status: 404 });
  if (cours.est_annule) return NextResponse.json({ error: 'Ce cours est annulé' }, { status: 400 });

  const today = new Date().toISOString().slice(0, 10);
  if (cours.date < today) return NextResponse.json({ error: 'Ce cours est passé' }, { status: 400 });

  const supabaseAdmin = createAdminClient();

  // Vérifier qu'il y a bien une place dispo
  if (cours.capacite_max) {
    const { count } = await supabaseAdmin
      .from('presences')
      .select('id', { count: 'exact', head: true })
      .eq('cours_id', cours.id);
    if ((count || 0) >= cours.capacite_max) {
      return NextResponse.json({
        error: 'Aucune place disponible — le cours est encore complet. Attends une annulation ou augmente la capacité.',
      }, { status: 409 });
    }
  }

  // Trouver ou créer le client
  let clientId = entry.client_id;
  if (!clientId) {
    const { data: existingClient } = await supabaseAdmin
      .from('clients')
      .select('id')
      .eq('profile_id', profile.id)
      .ilike('email', entry.email)
      .maybeSingle();
    if (existingClient) {
      clientId = existingClient.id;
    } else {
      const nomParts = (entry.nom || '').split(' ');
      const prenom = nomParts[0] || entry.email.split('@')[0];
      const clientNom = nomParts.slice(1).join(' ') || '';
      const { data: newClient, error } = await supabaseAdmin
        .from('clients')
        .insert({
          profile_id: profile.id,
          prenom,
          nom: clientNom,
          email: entry.email,
          telephone: entry.telephone || null,
        })
        .select('id')
        .single();
      if (error) return NextResponse.json({ error: 'Erreur création client : ' + error.message }, { status: 500 });
      clientId = newClient.id;
    }
  }

  // Créer la presence — RPC v53 atomique. NB : l'ancien insert utilisait des
  // colonnes INEXISTANTES (present, source) → 500 systématique, la promotion
  // manuelle n'a jamais fonctionné.
  const { data: resa, error: presErr } = await supabaseAdmin
    .rpc('reserver_place', {
      p_profile_id: profile.id,
      p_cours_id: cours.id,
      p_client_id: clientId,
    });

  if (presErr || !resa?.ok) {
    if (resa?.reason === 'doublon') {
      return NextResponse.json({ error: 'Cette personne est déjà inscrite à ce cours.' }, { status: 409 });
    }
    if (resa?.reason === 'complet') {
      return NextResponse.json({ error: 'Le cours est complet — la place a été reprise entre-temps.' }, { status: 409 });
    }
    console.error('[promouvoir] presence err:', presErr || resa?.reason);
    return NextResponse.json({ error: 'Erreur lors de la création de la place' }, { status: 500 });
  }
  const newPresence = { id: resa.presence_id };

  // Marquer la ligne comme notifiée
  await supabaseAdmin
    .from('liste_attente')
    .update({ notified_at: new Date().toISOString() })
    .eq('id', id);

  // Email de notification (best effort)
  try {
    if (process.env.RESEND_API_KEY) {
      const resend = new Resend(process.env.RESEND_API_KEY);
      const dateStr = cours.date
        ? new Date(cours.date + 'T12:00:00').toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })
        : 'la date prévue';
      const heureStr = cours.heure ? cours.heure.slice(0, 5).replace(':', 'h') : '';
      const { data: studio } = await supabase
        .from('profiles')
        .select('studio_nom, studio_slug, adresse, code_postal, ville, telephone, email_contact')
        .eq('id', profile.id)
        .single();
      const infosBlock = infosPratiquesBlock({ adresse: studio?.adresse, codePostal: studio?.code_postal, ville: studio?.ville, telephone: studio?.telephone, email: studio?.email_contact, studioSlug: studio?.studio_slug, profileNom: studio?.studio_nom });
      await resend.emails.send({
        from: process.env.RESEND_FROM_EMAIL || 'IziSolo <bonjour@izisolo.fr>',
        ...(user?.email ? { reply_to: user.email } : {}),
        to: entry.email,
        subject: `🎉 Une place s'est libérée pour ${cours.nom} !`,
        html: `
          <div style="font-family:-apple-system,BlinkMacSystemFont,sans-serif;max-width:560px;margin:0 auto;padding:24px;">
            <h2 style="color:#b87333;margin:0 0 6px;">Bonne nouvelle !</h2>
            <p style="color:#555;margin:0 0 14px;">Bonjour ${(entry.nom || '').split(' ')[0] || ''},</p>
            <p style="color:#555;margin:0 0 14px;">Une place s'est libérée pour le cours auquel tu étais sur liste d'attente :</p>
            <div style="background:#faf8f5;border-radius:12px;padding:16px 20px;margin:0 0 20px;">
              <strong style="font-size:1.1rem;color:#1a1a2e;">${cours.nom}</strong><br/>
              <span style="color:#888;">📅 ${dateStr}${heureStr ? ' · 🕐 ' + heureStr : ''}</span>
              ${cours.lieu ? `<br/><span style="color:#888;">📍 ${cours.lieu}</span>` : ''}
            </div>
            <p style="color:#555;margin:0 0 20px;">Ta réservation est <strong>déjà enregistrée</strong>. Tu n'as rien à faire — à très bientôt !</p>
            ${infosBlock}
            <p style="color:#aaa;font-size:0.8rem;margin:32px 0 0;border-top:1px solid #eee;padding-top:16px;text-align:center;">
              Propulsé par <a href="https://www.izisolo.fr" style="color:#b87333;">IziSolo</a>
            </p>
          </div>
        `,
      });
    }
  } catch (e) {
    console.warn('[promouvoir] email non-bloquant:', e?.message);
  }

  return NextResponse.json({ ok: true, presence_id: newPresence.id, client_id: clientId });
});

/**
 * DELETE /api/liste-attente/[id]/promouvoir
 *
 * Retire la personne de la liste d'attente (cas : ne veut plus venir, ou doublon).
 */
export const DELETE = withRoute({ auth: 'active' }, async ({ params, auth }) => {
  const { profile, supabase } = auth;
  const { id } = params;

  const { error } = await supabase
    .from('liste_attente')
    .delete()
    .eq('id', id)
    .eq('profile_id', profile.id);

  if (error) {
    console.error('[liste-attente DELETE] err:', error);
    return NextResponse.json({ error: 'Une erreur est survenue.' }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
});
