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

export function seanceDelta(oldStatut, newStatut, absenceCompte) {
  const oldCompte = statutCompte(oldStatut, absenceCompte);
  const newCompte = statutCompte(newStatut, absenceCompte);
  return (newCompte ? 1 : 0) - (oldCompte ? 1 : 0);
}
