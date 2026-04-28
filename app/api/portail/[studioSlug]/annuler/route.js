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
