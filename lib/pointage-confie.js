// ============================================================================
// IziSolo — Le pointage CONFIÉ : le chemin commun des liens sans session
// (v100 lien de pointage d'une séance ; v111 lien permanent d'intervenante)
// ----------------------------------------------------------------------------
// ⚠️ SERVEUR uniquement, en service_role : la personne n'a pas de session
// Supabase, donc la RLS ne protège rien ici. Ce module est LA frontière :
//   1. toute présence touchée est re-vérifiée contre le studio ET la séance
//      passés en paramètre (jamais lus dans la requête HTTP) ;
//   2. le pointage emprunte le chemin NORMAL (`seanceDelta` puis la RPC
//      `pointer_presence`, mêmes cas no_show) : un pointage confié écrit
//      exactement ce qu'écrit la prof, sinon les deux chemins divergeraient ;
//   3. ce qui sort passe par les filtres de lib/lien-pointage (minimisation).
//
// Extrait de app/api/pointage-invite/[token]/route.js le 2026-09-13 pour que
// le lien d'intervenante n'en soit pas une copie qui finirait par diverger.
// ============================================================================

import { getRegle } from './regles-metier';
import { seanceDelta } from './pointage-delta';
import { reportError } from './report';
import { presencePourInvitee, statutInviteValide } from './lien-pointage';

/** La liste d'appel d'une séance, minimisée. Scopée cours ET studio. */
export async function chargerListeConfiee(admin, { profileId, coursId }) {
  const { data: presences } = await admin
    .from('presences')
    .select('id, statut_pointage, pointee, type_presence, annulation_tardive, clients(prenom, nom)')
    .eq('cours_id', coursId)
    .eq('profile_id', profileId);

  return (presences || [])
    .map(presencePourInvitee)
    .sort((a, b) => (a.prenom || '').localeCompare(b.prenom || '', 'fr'));
}

/**
 * Pointe une présence par un chemin confié.
 *
 * @param admin      client service_role
 * @param profileId  le studio (lu dans le lien, jamais dans l'URL)
 * @param cours      la séance (lue par l'id stocké dans le lien)
 * @param reglesMetier `profiles.regles_metier` du studio
 * @param presenceId ce que la personne a cliqué
 * @param statut     'present' | 'absent' | 'excuse'
 * @param source     'lien_pointage' | 'lien_intervenante' (tracé dans le cas)
 * @param invitee    le nom à écrire dans le cas no_show
 * @returns {{ ok:true, resultat } | { ok:false, status, code, error }}
 */
export async function pointerConfie(admin, { profileId, cours, reglesMetier, presenceId, statut, source, invitee }) {
  if (!statutInviteValide(statut)) {
    return { ok: false, status: 400, code: 'STATUT', error: 'Statut non autorisé' };
  }

  // Règle 1 : la présence doit appartenir à CETTE séance et à CE studio.
  const { data: presence } = await admin
    .from('presences')
    .select('id, cours_id, profile_id, client_id, statut_pointage, pointee, type_presence, annulation_tardive, clients(prenom, nom)')
    .eq('id', presenceId)
    .eq('cours_id', cours.id)
    .eq('profile_id', profileId)
    .maybeSingle();

  if (!presence) {
    return { ok: false, status: 404, code: 'HORS_SEANCE', error: 'Cette personne ne fait pas partie de la séance.' };
  }

  const ancien = presence.statut_pointage || (presence.pointee ? 'present' : 'inscrit');
  if (presence.annulation_tardive || ['annule', 'declinee'].includes(ancien)) {
    return { ok: false, status: 409, code: 'LIGNE_INFO', error: 'Cette ligne est une information : elle se règle côté studio.' };
  }

  // Même politique no-show que l'écran de la prof : l'absence ne décompte
  // que si le studio l'a décidé (auto + decompter_auto).
  const regleNoShow = getRegle({ regles_metier: reglesMetier }, 'no_show');
  const absenceCompte = regleNoShow.mode === 'auto' && regleNoShow.choix === 'decompter_auto';
  const delta = seanceDelta(ancien, statut, absenceCompte, presence.type_presence);
  const estPresent = statut === 'present';

  const { data: resultat, error: rpcErr } = await admin.rpc('pointer_presence', {
    p_presence_id: presence.id,
    p_statut: statut,
    p_pointee: estPresent,
    p_heure: estPresent ? new Date().toISOString() : null,
    p_delta: delta,
  });

  if (rpcErr || !resultat?.ok) {
    await reportError(`[${source}] RPC pointer_presence :`, rpcErr || new Error(resultat?.reason || 'ko'), {
      cours: cours.id, presence: presence.id,
    });
    return { ok: false, status: 500, code: 'RPC', error: 'Pointage non enregistré, réessaie.' };
  }

  // Cas no_show : mêmes règles que PointageClient. On repart propre à chaque
  // entrée/sortie d'« absent », et on n'en crée qu'un seul.
  const estAbsent = statut === 'absent';
  const etaitAbsent = ancien === 'absent';
  if (estAbsent || etaitAbsent) {
    try {
      await admin.from('cas_a_traiter')
        .delete()
        .eq('presence_id', presence.id)
        .eq('case_type', 'no_show')
        .is('resolu_at', null);
      if (estAbsent && (regleNoShow.mode === 'manuel' || regleNoShow.notifProf)) {
        await admin.from('cas_a_traiter').insert({
          profile_id: profileId,
          case_type: 'no_show',
          client_id: presence.client_id,
          cours_id: cours.id,
          presence_id: presence.id,
          context: {
            mode: regleNoShow.mode,
            choix: regleNoShow.choix,
            seance_decomptee: delta > 0 && !!resultat?.abonnement_id,
            client_nom: `${presence.clients?.prenom || ''} ${presence.clients?.nom || ''}`.trim(),
            cours_nom: cours.nom,
            cours_date: cours.date,
            // D'où vient ce cas : la prof doit pouvoir le lire sans enquêter.
            source,
            invitee: invitee || null,
          },
        });
      }
    } catch { /* non bloquant : le pointage, lui, est enregistré */ }
  }

  return { ok: true, resultat };
}
