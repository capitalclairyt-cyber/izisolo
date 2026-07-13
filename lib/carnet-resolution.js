/**
 * Résolution du carnet applicable à une séance.
 * Cf. MODELE-PAIEMENTS-2026.md §2. Miroir JS de la logique SQL du RPC
 * `pointer_presence` (migration v64) : mêmes filtres, même ordre de choix.
 *
 * Le décompte réel (facturation) est fait ATOMIQUEMENT par le RPC — cette
 * fonction sert côté client à l'AFFICHAGE (« sur carnet » vs « à régler ») et au
 * branchement pay-as-you-go (Lot 2b). Les deux doivent rester alignées.
 *
 * Règles (figées 2026-07-13) :
 *   - candidat = carnet `actif`, avec séances restantes (ou illimité), non
 *     expiré à la date du cours, pas en pause, dont le type est autorisé ;
 *   - carnet NON restreint (types_cours_autorises vide) = couvre TOUS les cours ;
 *   - choix : le plus SPÉCIFIQUE d'abord (restreint au type avant « tous »),
 *     puis celui qui EXPIRE LE PLUS TÔT (les « jamais » en dernier).
 *
 * @param {Array<object>} abos - carnets de l'élève. Champs lus : statut,
 *   seances_total, seances_utilisees, date_fin, date_pause_debut,
 *   date_pause_fin, types_cours_autorises.
 * @param {{type_cours?: string|null, date?: string|null}} cours
 * @returns {object|null} le carnet applicable, ou null si aucun.
 */
export function resoudreCarnetApplicable(abos, cours) {
  const today = (cours && cours.date) || new Date().toISOString().slice(0, 10);
  const type = (cours && cours.type_cours) || null;

  const estRestreint = (a) =>
    Array.isArray(a.types_cours_autorises) && a.types_cours_autorises.length > 0;

  const candidats = (abos || []).filter((a) => {
    if (!a || a.statut !== 'actif') return false;
    // séances restantes (null = illimité)
    if (a.seances_total != null && (a.seances_utilisees || 0) >= a.seances_total) return false;
    // non expiré à la date du cours
    if (a.date_fin && a.date_fin < today) return false;
    // pas en pause à la date du cours
    if (a.date_pause_debut && a.date_pause_fin
        && a.date_pause_debut <= today && a.date_pause_fin >= today) return false;
    // type de cours autorisé (non restreint = tous ; cours sans type = accepté)
    if (estRestreint(a) && type && !a.types_cours_autorises.includes(type)) return false;
    return true;
  });

  if (candidats.length === 0) return null;

  candidats.sort((a, b) => {
    const ar = estRestreint(a), br = estRestreint(b);
    if (ar !== br) return ar ? -1 : 1;          // spécifique d'abord
    if (!a.date_fin && !b.date_fin) return 0;    // deux « jamais »
    if (!a.date_fin) return 1;                   // « jamais » en dernier
    if (!b.date_fin) return -1;
    return a.date_fin < b.date_fin ? -1 : a.date_fin > b.date_fin ? 1 : 0; // expire tôt
  });

  return candidats[0];
}
