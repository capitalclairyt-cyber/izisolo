/**
 * Comptabilité des séances au pointage.
 *
 * Une séance est « comptée » (décomptée du carnet) selon l'état de pointage :
 *   - 'present'                        → toujours comptée (l'élève était là)
 *   - 'absent' + politique stricte     → comptée (no-show décompté)
 *   - 'absent' + politique souple      → NON comptée
 *   - 'inscrit' (pas encore pointé)    → NON comptée
 *   - 'excuse'                         → NON comptée (absence légitime)
 *
 * ET selon le TYPE de présence (v70) :
 *   - 'normal' (ou absent/null)        → comptée selon le statut ci-dessus
 *   - 'essai' / 'offert'               → JAMAIS comptée (séance gratuite,
 *                                        cf. MODELE-PAIEMENTS-2026.md §4.3)
 *
 * `absenceCompte` = la règle no_show du studio est en mode strict
 * (auto + decompter_auto).
 *
 * Le delta à appliquer à seances_utilisees lors d'un changement de statut =
 * (le nouvel état compte ?) − (l'ancien comptait ?). Cette formule unifiée
 * gère correctement TOUTES les transitions, y compris celles qui quittent un
 * 'absent' déjà décompté (absent→présent, absent→excusé, présent→absent-strict)
 * que l'ancienne logique en cascade traitait mal.
 */
export function statutCompte(statut, absenceCompte) {
  return statut === 'present' || (statut === 'absent' && absenceCompte);
}

/** Un type de présence 'essai' / 'offert' est gratuit : jamais décompté. */
export function typePresenceCompte(typePresence) {
  return !typePresence || typePresence === 'normal';
}

/**
 * Delta lors d'un changement de STATUT (le type de présence ne change pas).
 * `typePresence` est optionnel (absent = 'normal', rétro-compatible) : pour
 * une présence essai/offert le delta est toujours 0.
 */
export function seanceDelta(oldStatut, newStatut, absenceCompte, typePresence) {
  if (!typePresenceCompte(typePresence)) return 0;
  const oldCompte = statutCompte(oldStatut, absenceCompte);
  const newCompte = statutCompte(newStatut, absenceCompte);
  return (newCompte ? 1 : 0) - (oldCompte ? 1 : 0);
}

/**
 * Delta lors d'un changement de TYPE de présence (le statut ne change pas).
 * Symétrie de gratuité : passer une séance déjà comptée en essai/offert la
 * re-crédite ; repasser en normal une séance présente la décompte.
 *   normal(present) → offert  = -1 (on rend la séance)
 *   offert(present) → normal  = +1 (on la décompte)
 *   inscrit/excuse            =  0 (rien n'était compté, rien ne le devient)
 */
export function seanceDeltaChangementType(statut, oldType, newType, absenceCompte) {
  const sc = statutCompte(statut, absenceCompte);
  const avant = typePresenceCompte(oldType) && sc;
  const apres = typePresenceCompte(newType) && sc;
  return (apres ? 1 : 0) - (avant ? 1 : 0);
}
