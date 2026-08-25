import { z } from 'zod';
import { withRoute } from '@/lib/api-route';
import { reportError } from '@/lib/report';
import { getRegle } from '@/lib/regles-metier';
import { statutCompte, typePresenceCompte } from '@/lib/pointage-delta';

// ════════════════════════════════════════════════════════════════════════════
// B2f lot C (MODELE-COURS-CARNETS-2026.md R3) — la prof choisit/corrige le
// carnet d'une présence depuis le pointage : « utiliser un autre carnet » ou
// « passer à l'unité » (abonnement_id: null).
//
// Répartition des rôles : le JS décide des mouvements de compteur avec la
// formule unifiée lib/pointage-delta (verrouillée par spec) — la séance
// était-elle comptée ? — et la RPC relier_presence_carnet (v82) exécute
// atomiquement : re-crédit ancien + décompte nouveau + re-liaison dans UNE
// transaction (SECURITY INVOKER : la RLS scoppe tout au studio du JWT).
// ════════════════════════════════════════════════════════════════════════════

const relierSchema = z.object({
  // null = délier (à l'unité / sans carnet)
  abonnement_id: z.string().uuid().nullable(),
});

export const POST = withRoute({ auth: 'active', schema: relierSchema, perm: 'pointer' }, async ({ params, auth, body }) => {
  const { studioId, supabase, profile } = auth;
  const { presenceId } = params;
  const nouvelAboId = body.abonnement_id;

  const { data: presence, error: presErr } = await supabase
    .from('presences')
    .select('id, abonnement_id, client_id, statut_pointage, type_presence, annulation_tardive')
    .eq('id', presenceId)
    .eq('profile_id', studioId)
    .single();
  if (presErr || !presence) {
    return Response.json({ error: 'Présence introuvable' }, { status: 404 });
  }

  // Lignes non re-pointables : la re-liaison n'a pas de sens dessus (le
  // décompte tardive/annulée suit ses propres chemins — resolve / annuler).
  if (presence.annulation_tardive || ['annule', 'declinee'].includes(presence.statut_pointage)) {
    return Response.json({ error: 'Cette ligne ne peut pas changer de carnet (réservation annulée ou annulation tardive).' }, { status: 400 });
  }

  if ((nouvelAboId || null) === (presence.abonnement_id || null)) {
    return Response.json({ ok: true, noop: true });
  }

  // Séance déjà encaissée à l'unité → basculer sur un carnet créerait un
  // double paiement silencieux. On refuse avec un message honnête.
  if (nouvelAboId) {
    const { data: paiementLie } = await supabase
      .from('paiements')
      .select('id')
      .eq('presence_id', presenceId)
      .eq('statut', 'paid')
      .limit(1)
      .maybeSingle();
    if (paiementLie) {
      return Response.json({
        error: 'Cette séance a déjà été encaissée à l\'unité — corrige d\'abord le règlement (bouton ✓ payé) avant de la passer sur un carnet.',
      }, { status: 409 });
    }
  }

  // La séance est-elle actuellement COMPTÉE ? (même formule que le pointage :
  // present, ou absent en politique no-show stricte ; essai/offert jamais).
  const regleNoShow = getRegle({ regles_metier: profile?.regles_metier }, 'no_show');
  const absenceCompte = regleNoShow.mode === 'auto' && regleNoShow.choix === 'decompter_auto';
  const compte = typePresenceCompte(presence.type_presence)
    && statutCompte(presence.statut_pointage, absenceCompte);

  const { data: result, error: rpcErr } = await supabase.rpc('relier_presence_carnet', {
    p_presence_id: presenceId,
    p_abo_id: nouvelAboId,
    p_crediter_ancien: compte && !!presence.abonnement_id,
    p_decompter_nouveau: compte && !!nouvelAboId,
  });

  if (rpcErr) {
    reportError('[relier] rpc error:', rpcErr);
    return Response.json({ error: 'La re-liaison a échoué — réessaie.' }, { status: 500 });
  }
  if (!result?.ok) {
    const messages = {
      introuvable: 'Présence introuvable.',
      abo_invalide: 'Ce carnet n\'appartient pas à cet·te élève.',
      abo_inactif: 'Ce carnet n\'est plus actif.',
      abo_epuise: 'Ce carnet est épuisé — impossible d\'y décompter la séance.',
    };
    return Response.json({ error: messages[result?.reason] || 'Re-liaison impossible.' }, { status: 400 });
  }

  return Response.json({
    ok: true,
    abonnement_id: result.abonnement_id || null,
    ancien_abo: result.ancien_abo || null,
    seances_utilisees: result.seances_utilisees ?? null,
    compte,
  });
});
