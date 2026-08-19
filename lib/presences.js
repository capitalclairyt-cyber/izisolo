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

/**
 * Places occupées PAR COURS, en une requête d'agrégat (RPC v89).
 * Retourne { [coursId]: count }.
 *
 * Motif (AUDIT-PERF-2026 cat. 1.1) : charger les LIGNES presences via
 * .in(240 ids) heurte le cap PostgREST 1000 en silence → jauges fausses sur
 * le portail public dès un studio bien rempli. La RPC renvoie 1 ligne par
 * cours (jamais 1 par présence) et applique la formule v74 côté SQL.
 *
 * Dégrade pré-migration v89 : lignes brutes chunkées à 100 cours et paginées
 * à 1000 (le fallback reproduit l'ancien comportement, sans la troncature).
 * Les erreurs remontent au caller (qui reportError + continue à son échelle).
 */
export async function compterPlacesOccupeesParCours(supabase, coursIds) {
  const counts = {};
  const ids = (coursIds || []).filter(Boolean);
  if (ids.length === 0) return counts;

  const { data, error } = await supabase.rpc('places_occupees', { p_cours_ids: ids });
  if (!error) {
    for (const row of data || []) counts[row.cours_id] = Number(row.occupees) || 0;
    return counts;
  }

  // Fallback pré-migration (RPC absente) — toute autre erreur remonte aussi
  // par ici : on retente en lignes brutes, c'est le chemin d'avant v89.
  for (let i = 0; i < ids.length; i += 100) {
    const chunk = ids.slice(i, i + 100);
    for (let page = 0; page < 20; page++) {
      const from = page * 1000;
      const { data: rows, error: err } = await supabase
        .from('presences')
        .select('cours_id, statut_pointage, annulation_tardive')
        .in('cours_id', chunk)
        .range(from, from + 999);
      if (err) throw err;
      for (const p of rows || []) {
        if (presenceOccupePlace(p)) counts[p.cours_id] = (counts[p.cours_id] || 0) + 1;
      }
      if (!rows || rows.length < 1000) break;
    }
  }
  return counts;
}
