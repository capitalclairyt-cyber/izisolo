import { createServerClient } from '@/lib/supabase-server';
import { createClient as createAdminSupabase } from '@supabase/supabase-js';
import { parseJsonBody, annulationSchema } from '@/lib/validation';
import { evaluerAnnulation } from '@/lib/regles-annulation';

export async function POST(request, { params }) {
  const { studioSlug } = await params;
  const { data, errorResponse } = await parseJsonBody(request, annulationSchema);
  if (errorResponse) return errorResponse;
  const { presenceId } = data;

  // Vérifier que l'utilisateur est authentifié
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return Response.json({ error: 'Non authentifié' }, { status: 401 });
  }

  const supabaseAdmin = createAdminSupabase(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  // Vérifier que le studio existe + récupérer ses règles d'annulation
  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('id, regles_annulation')
    .eq('studio_slug', studioSlug)
    .single();

  if (!profile) {
    return Response.json({ error: 'Studio introuvable' }, { status: 404 });
  }

  // Trouver le client lié à cet user dans ce studio
  const { data: client } = await supabaseAdmin
    .from('clients')
    .select('id')
    .eq('profile_id', profile.id)
    .ilike('email', user.email)
    .single();

  if (!client) {
    return Response.json({ error: 'Client introuvable' }, { status: 404 });
  }

  // Vérifier que la présence appartient bien à ce client dans ce studio
  const { data: presence } = await supabaseAdmin
    .from('presences')
    .select('id, abonnement_id, cours:cours_id(date, heure, type_cours, est_annule)')
    .eq('id', presenceId)
    .eq('client_id', client.id)
    .eq('profile_id', profile.id)
    .single();

  if (!presence) {
    return Response.json({ error: 'Réservation introuvable' }, { status: 404 });
  }

  // Vérifier que le cours n'est pas déjà passé
  const today = new Date().toISOString().slice(0, 10);
  if (presence.cours && presence.cours.date < today) {
    return Response.json({ error: 'Ce cours est déjà passé' }, { status: 400 });
  }

  // Évaluer la règle d'annulation (délai libre vs tardif)
  const evaluation = evaluerAnnulation(
    profile,
    presence.cours?.date,
    presence.cours?.heure,
    presence.cours?.type_cours
  );

  // ── Cas 1 : Annulation libre (dans les délais) → suppression de la presence
  if (evaluation.annulable) {
    const { error: deleteErr } = await supabaseAdmin
      .from('presences')
      .delete()
      .eq('id', presenceId);

    if (deleteErr) {
      console.error('annulation libre — delete error:', deleteErr);
      return Response.json({ error: 'Erreur lors de l\'annulation' }, { status: 500 });
    }

    // Promotion auto : s'il y a quelqu'un en liste d'attente sur ce cours,
    // on promeut le 1er (n°1 par created_at), on lui crée une presence et
    // on lui envoie un email de notification.
    try {
      await promouvoirListeAttente(supabaseAdmin, profile.id, presence.cours);
    } catch (promErr) {
      console.error('promotion liste attente (non-blocking):', promErr);
    }

    return Response.json({ ok: true, tardive: false });
  }

  // ── Cas 2 : Annulation tardive (au-delà du délai libre) → la séance est due
  // On NE supprime PAS la presence : on la garde marquée comme "annulation tardive"
  // ET on incrémente seances_utilisees du carnet/abonnement (si lié) — la séance compte.
  const motif = `Annulation tardive (moins de ${evaluation.delaiHeures}h avant le cours)`;

  const { error: updateErr } = await supabaseAdmin
    .from('presences')
    .update({
      annulation_tardive: true,
      est_due: true,
      motif_due: motif,
    })
    .eq('id', presenceId);

  if (updateErr) {
    console.error('annulation tardive — update error:', updateErr);
    return Response.json({ error: 'Erreur lors de l\'annulation' }, { status: 500 });
  }

  // Incrémenter le compteur de séances utilisées de l'abonnement (si lié)
  if (presence.abonnement_id) {
    const { data: abo } = await supabaseAdmin
      .from('abonnements')
      .select('seances_utilisees')
      .eq('id', presence.abonnement_id)
      .single();
    if (abo) {
      await supabaseAdmin
        .from('abonnements')
        .update({ seances_utilisees: (abo.seances_utilisees || 0) + 1 })
        .eq('id', presence.abonnement_id);
    }
  }

  return Response.json({
    ok: true,
    tardive: true,
    motif,
    delaiHeures: evaluation.delaiHeures,
  });
}

// ─── Promotion automatique de la liste d'attente ────────────────────────────
async function promouvoirListeAttente(supabaseAdmin, profileId, cours) {
  if (!cours?.id) return;

  // Cherche le 1er de la liste (par position puis created_at)
  const { data: nextRow } = await supabaseAdmin
    .from('liste_attente')
    .select('id, email, nom, telephone, client_id')
    .eq('cours_id', cours.id)
    .eq('profile_id', profileId)
    .is('notified_at', null)
    .order('position', { ascending: true })
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle();

  if (!nextRow) return;

  // Trouver ou créer le client
  let clientId = nextRow.client_id;
  if (!clientId) {
    const { data: existingClient } = await supabaseAdmin
      .from('clients')
      .select('id')
      .eq('profile_id', profileId)
      .ilike('email', nextRow.email)
      .maybeSingle();
    if (existingClient) {
      clientId = existingClient.id;
    } else {
      const nomParts = (nextRow.nom || '').split(' ');
      const prenom = nomParts[0] || nextRow.email.split('@')[0];
      const clientNom = nomParts.slice(1).join(' ') || '';
      const { data: newClient } = await supabaseAdmin
        .from('clients')
        .insert({
          profile_id: profileId,
          prenom,
          nom: clientNom,
          email: nextRow.email,
          telephone: nextRow.telephone || null,
        })
        .select('id')
        .single();
      clientId = newClient?.id;
    }
  }
  if (!clientId) return;

  // Créer la presence (inscrit, pas pointé)
  const { error: presErr } = await supabaseAdmin
    .from('presences')
    .insert({
      cours_id: cours.id,
      client_id: clientId,
      profile_id: profileId,
      present: false,
      source: 'liste_attente',
    });
  if (presErr) {
    console.error('promotion: create presence error:', presErr);
    return;
  }

  // Marquer la ligne comme notifiée
  await supabaseAdmin
    .from('liste_attente')
    .update({ notified_at: new Date().toISOString() })
    .eq('id', nextRow.id);

  // Email de notification
  try {
    if (process.env.RESEND_API_KEY) {
      const { Resend } = await import('resend');
      const resend = new Resend(process.env.RESEND_API_KEY);
      const dateStr = cours.date
        ? new Date(cours.date + 'T12:00:00').toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })
        : 'la date prévue';
      await resend.emails.send({
        from: process.env.RESEND_FROM_EMAIL || 'IziSolo <no-reply@izisolo.fr>',
        to: nextRow.email,
        subject: `🎉 Une place s'est libérée !`,
        html: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, sans-serif; max-width: 560px; margin: 0 auto; padding: 24px;">
            <h2 style="color: #d4a0a0; margin: 0 0 6px;">Bonne nouvelle !</h2>
            <p style="color: #555; margin: 0 0 14px;">Bonjour ${(nextRow.nom || '').split(' ')[0] || ''},</p>
            <p style="color: #555; margin: 0 0 14px;">Une place s'est libérée pour le cours auquel tu étais sur liste d'attente :</p>
            <div style="background: #faf8f5; border-radius: 12px; padding: 16px 20px; margin: 0 0 20px;">
              <strong style="font-size: 1.1rem; color: #1a1a2e;">${cours.nom || 'Ton cours'}</strong><br/>
              <span style="color: #888;">📅 ${dateStr}</span>
            </div>
            <p style="color: #555; margin: 0 0 20px;">Ta réservation est <strong>déjà enregistrée</strong>. Tu n'as rien à faire.</p>
            <p style="color: #aaa; font-size: 0.8rem; margin: 32px 0 0; border-top: 1px solid #eee; padding-top: 16px; text-align: center;">
              Propulsé par <a href="https://izisolo.fr" style="color: #d4a0a0;">IziSolo</a>
            </p>
          </div>
        `,
      });
    }
  } catch (emailErr) {
    console.error('promotion: email error (non-blocking):', emailErr);
  }
}
