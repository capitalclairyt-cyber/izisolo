import { withRoute } from '@/lib/api-route';
import { createAdminClient } from '@/lib/supabase-admin';
import { reportError } from '@/lib/report';
import { getRegle } from '@/lib/regles-metier';
import { statutCompte, typePresenceCompte } from '@/lib/pointage-delta';
import { promouvoirListeAttente } from '@/lib/promotion-liste-attente';

// ════════════════════════════════════════════════════════════════════════════
// DELETE /api/presences/[presenceId] — la prof DÉSINSCRIT un·e élève d'une
// séance depuis la fiche du cours (demande Colin 2026-07-28).
//
// Comptabilité alignée sur l'annulation prof d'une séance (fix 2026-07-25 :
// jamais de recrédit aveugle) : on ne re-crédite QUE si la séance était
// réellement comptée (formule verrouillée lib/pointage-delta) ou sanctionnée
// en annulation tardive décomptée. Un encaissement à la séance lié BLOQUE la
// suppression (409) — la prof annule d'abord l'encaissement au pointage.
// Une place se libère → promotion de la liste d'attente (la promesse produit
// « annulation, désinscription → IziSolo place automatiquement le suivant »).
// ════════════════════════════════════════════════════════════════════════════

export const DELETE = withRoute({ auth: 'active' }, async ({ params, auth }) => {
  const { user, supabase, profile } = auth;
  const { presenceId } = params;

  const { data: presence, error: presErr } = await supabase
    .from('presences')
    .select('id, abonnement_id, client_id, statut_pointage, type_presence, annulation_tardive, cours:cours_id (id, nom, date, heure)')
    .eq('id', presenceId)
    .eq('profile_id', user.id)
    .single();
  if (presErr || !presence) {
    return Response.json({ error: 'Réservation introuvable' }, { status: 404 });
  }

  // Séance encaissée à l'unité (v65) : supprimer la résa orphelinerait le
  // paiement — on refuse avec le geste à faire.
  const { data: paiementLie } = await supabase
    .from('paiements')
    .select('id')
    .eq('presence_id', presenceId)
    .eq('statut', 'paid')
    .limit(1)
    .maybeSingle();
  if (paiementLie) {
    return Response.json({
      error: 'Un encaissement est lié à cette séance — annule-le d\'abord depuis le pointage (💶 → Annuler l\'encaissement).',
    }, { status: 409 });
  }

  // Recrédit UNIQUEMENT si réellement décompté : séance comptée (present, ou
  // absent en politique no-show stricte ; essai/offert jamais) ou annulation
  // tardive sanctionnée (liée en décomptant).
  const regleNoShow = getRegle({ regles_metier: profile?.regles_metier }, 'no_show');
  const absenceCompte = regleNoShow.mode === 'auto' && regleNoShow.choix === 'decompter_auto';
  const compte = typePresenceCompte(presence.type_presence)
    && statutCompte(presence.statut_pointage, absenceCompte);
  let recredite = false;
  if (presence.abonnement_id && (compte || presence.annulation_tardive === true)) {
    const { error: decErr } = await supabase.rpc('ajuster_seances', {
      p_abo_id: presence.abonnement_id,
      p_delta: -1,
    });
    if (decErr) reportError('[presences DELETE] recredit err:', decErr, { presenceId });
    else recredite = true;
  }

  const { error: delErr } = await supabase.from('presences').delete().eq('id', presenceId);
  if (delErr) {
    reportError('[presences DELETE] delete err:', delErr, { presenceId });
    return Response.json({ error: 'Suppression impossible, réessaie.' }, { status: 500 });
  }

  // Place libérée → promotion liste d'attente (admin : la promotion crée la
  // présence de la personne promue et envoie ses notifications).
  let promu = false;
  if (presence.cours) {
    try {
      const res = await promouvoirListeAttente(createAdminClient(), user.id, presence.cours, {
        proEmail: profile?.email_contact || user.email || null,
        studioSlug: profile?.studio_slug || null,
      });
      promu = res === true;
    } catch (e) {
      reportError('[presences DELETE] promotion err:', e, { coursId: presence.cours?.id });
    }
  }

  return Response.json({ ok: true, recredite, promu });
});
