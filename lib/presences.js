// ============================================================================
// IziSolo — Présences : la formule de capacité v74, en UN seul endroit JS
// ----------------------------------------------------------------------------
// Miroir exact de la RPC reserver_place (migrations-v74) :
//   occupe une place ⇔ pas d'annulation tardive
//                      ET coalesce(statut_pointage, 'inscrit') ∉ (annule, declinee)
//
// Toute surface qui compte des inscrits DOIT passer par ici. L'audit B1b
// (2026-07-25) a trouvé 6 comptages « bruts » restés d'avant v74 : portail
// public « Complet » à tort (places vendables perdues), page de réservation
// qui poussait vers la liste d'attente pour une place libre, détail prof qui
// cachait « Promouvoir », liste des cours et agenda qui gonflaient les
// effectifs, stats de pointage qui ne se terminaient jamais.
//
// NB : en prod les réservations vivantes portent statut_pointage='inscrit'
// (DEFAULT v5) — le fallback 'inscrit' couvre un éventuel NULL d'insert brut.
// ============================================================================

export const STATUTS_PLACE_LIBEREE = ['annule', 'declinee'];

/** La présence occupe-t-elle une place ? (formule v74) */
export function presenceOccupePlace(p) {
  if (!p || p.annulation_tardive) return false;
  return !STATUTS_PLACE_LIBEREE.includes(p.statut_pointage || 'inscrit');
}

/** Réservation active non encore pointée — pour les gardes-fous de suppression. */
export function presenceEstReservationActive(p) {
  return presenceOccupePlace(p) && (p.statut_pointage || 'inscrit') === 'inscrit';
}

/** Nombre de places occupées dans un tableau de présences (formule v74). */
export function compterPlacesOccupees(presences) {
  return (presences || []).filter(presenceOccupePlace).length;
}
