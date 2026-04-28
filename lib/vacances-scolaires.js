/**
 * lib/vacances-scolaires.js
 * ─────────────────────────────────────────────────────────────────
 * Vacances scolaires françaises + jours fériés (2025-2027).
 *
 * Source officielle : https://data.education.gouv.fr/explore/dataset/fr-en-calendrier-scolaire/
 * Bundlé en local pour éviter une dépendance runtime.
 *
 * Format : { debut: 'YYYY-MM-DD', fin: 'YYYY-MM-DD', label: '...' }
 *   - debut/fin : INCLUS de chaque côté
 *   - les dates correspondent aux jours OÙ L'ÉLÈVE NE VIENT PAS
 *     (= du premier samedi de vacances jusqu'au dimanche avant la rentrée)
 *
 * Utilisation :
 *   import { estPendantVacances, estJourFerie, ZONES_VACANCES } from '@/lib/vacances-scolaires';
 *   if (estPendantVacances('2026-02-20', 'A')) { ... }
 *   if (estJourFerie('2026-05-01')) { ... }
 *
 * Mise à jour : à refresh chaque année en mai (publication officielle juin).
 * Dernier refresh : avril 2026.
 * ─────────────────────────────────────────────────────────────────
 */

export const ZONES_VACANCES = [
  { value: 'A', label: 'Zone A — Besançon, Bordeaux, Clermont-Ferrand, Dijon, Grenoble, Limoges, Lyon, Poitiers' },
  { value: 'B', label: 'Zone B — Aix-Marseille, Amiens, Caen, Lille, Nancy-Metz, Nantes, Nice, Orléans-Tours, Reims, Rennes, Rouen, Strasbourg' },
  { value: 'C', label: 'Zone C — Créteil, Montpellier, Paris, Toulouse, Versailles' },
  { value: 'Corse', label: 'Corse' },
];

// ── Vacances scolaires par zone ──────────────────────────────────────────────
const VACANCES = {
  A: [
    // 2025-2026
    { debut: '2025-10-18', fin: '2025-11-02', label: 'Toussaint 2025' },
    { debut: '2025-12-20', fin: '2026-01-04', label: 'Noël 2025' },
    { debut: '2026-02-07', fin: '2026-02-22', label: 'Hiver 2026' },
    { debut: '2026-04-11', fin: '2026-04-26', label: 'Printemps 2026' },
    { debut: '2026-07-04', fin: '2026-08-31', label: 'Été 2026' },
    // 2026-2027
    { debut: '2026-10-17', fin: '2026-11-01', label: 'Toussaint 2026' },
    { debut: '2026-12-19', fin: '2027-01-03', label: 'Noël 2026' },
    { debut: '2027-02-06', fin: '2027-02-21', label: 'Hiver 2027' },
    { debut: '2027-04-03', fin: '2027-04-18', label: 'Printemps 2027' },
    { debut: '2027-07-03', fin: '2027-08-29', label: 'Été 2027' },
  ],
  B: [
    // 2025-2026
    { debut: '2025-10-18', fin: '2025-11-02', label: 'Toussaint 2025' },
    { debut: '2025-12-20', fin: '2026-01-04', label: 'Noël 2025' },
    { debut: '2026-02-21', fin: '2026-03-08', label: 'Hiver 2026' },
    { debut: '2026-04-25', fin: '2026-05-10', label: 'Printemps 2026' },
    { debut: '2026-07-04', fin: '2026-08-31', label: 'Été 2026' },
    // 2026-2027
    { debut: '2026-10-17', fin: '2026-11-01', label: 'Toussaint 2026' },
    { debut: '2026-12-19', fin: '2027-01-03', label: 'Noël 2026' },
    { debut: '2027-02-20', fin: '2027-03-07', label: 'Hiver 2027' },
    { debut: '2027-04-17', fin: '2027-05-02', label: 'Printemps 2027' },
    { debut: '2027-07-03', fin: '2027-08-29', label: 'Été 2027' },
  ],
  C: [
    // 2025-2026
    { debut: '2025-10-18', fin: '2025-11-02', label: 'Toussaint 2025' },
    { debut: '2025-12-20', fin: '2026-01-04', label: 'Noël 2025' },
    { debut: '2026-02-14', fin: '2026-03-01', label: 'Hiver 2026' },
    { debut: '2026-04-18', fin: '2026-05-03', label: 'Printemps 2026' },
    { debut: '2026-07-04', fin: '2026-08-31', label: 'Été 2026' },
    // 2026-2027
    { debut: '2026-10-17', fin: '2026-11-01', label: 'Toussaint 2026' },
    { debut: '2026-12-19', fin: '2027-01-03', label: 'Noël 2026' },
    { debut: '2027-02-13', fin: '2027-02-28', label: 'Hiver 2027' },
    { debut: '2027-04-10', fin: '2027-04-25', label: 'Printemps 2027' },
    { debut: '2027-07-03', fin: '2027-08-29', label: 'Été 2027' },
  ],
  Corse: [
    // 2025-2026 (calendrier Corse — souvent identique zone B avec quelques décalages)
    { debut: '2025-10-18', fin: '2025-11-02', label: 'Toussaint 2025' },
    { debut: '2025-12-20', fin: '2026-01-04', label: 'Noël 2025' },
    { debut: '2026-02-21', fin: '2026-03-08', label: 'Hiver 2026' },
    { debut: '2026-04-11', fin: '2026-04-26', label: 'Printemps 2026' },
    { debut: '2026-07-04', fin: '2026-08-31', label: 'Été 2026' },
    // 2026-2027
    { debut: '2026-10-17', fin: '2026-11-01', label: 'Toussaint 2026' },
    { debut: '2026-12-19', fin: '2027-01-03', label: 'Noël 2026' },
    { debut: '2027-02-20', fin: '2027-03-07', label: 'Hiver 2027' },
    { debut: '2027-04-03', fin: '2027-04-18', label: 'Printemps 2027' },
    { debut: '2027-07-03', fin: '2027-08-29', label: 'Été 2027' },
  ],
};

// ── Jours fériés métropole France (2025-2027) ────────────────────────────────
// Inclut les fixes (1er janvier, 1er mai, 8 mai, 14 juillet, 15 août, 1er novembre,
// 11 novembre, 25 décembre) + mobiles (Lundi de Pâques, Ascension, Lundi de Pentecôte).
const JOURS_FERIES = new Set([
  // 2025
  '2025-01-01', '2025-04-21', '2025-05-01', '2025-05-08', '2025-05-29',
  '2025-06-09', '2025-07-14', '2025-08-15', '2025-11-01', '2025-11-11',
  '2025-12-25',
  // 2026
  '2026-01-01', '2026-04-06', '2026-05-01', '2026-05-08', '2026-05-14',
  '2026-05-25', '2026-07-14', '2026-08-15', '2026-11-01', '2026-11-11',
  '2026-12-25',
  // 2027
  '2027-01-01', '2027-03-29', '2027-05-01', '2027-05-06', '2027-05-08',
  '2027-05-17', '2027-07-14', '2027-08-15', '2027-11-01', '2027-11-11',
  '2027-12-25',
]);

/**
 * Vérifie si une date (YYYY-MM-DD) tombe pendant les vacances scolaires de la zone.
 * @param {string} dateISO  ex: '2026-02-20'
 * @param {'A'|'B'|'C'|'Corse'} zone
 * @returns {boolean}
 */
export function estPendantVacances(dateISO, zone) {
  if (!dateISO || !zone) return false;
  const periodes = VACANCES[zone];
  if (!periodes) return false;
  return periodes.some(p => dateISO >= p.debut && dateISO <= p.fin);
}

/**
 * Vérifie si une date est un jour férié français (métropole).
 */
export function estJourFerie(dateISO) {
  return JOURS_FERIES.has(dateISO);
}

/**
 * Trouve la période de vacances qui contient la date (pour afficher "Toussaint 2025" en tooltip).
 */
export function getPeriodeVacances(dateISO, zone) {
  if (!dateISO || !zone) return null;
  const periodes = VACANCES[zone];
  if (!periodes) return null;
  return periodes.find(p => dateISO >= p.debut && dateISO <= p.fin) || null;
}

/**
 * Liste les jours fériés sur une plage de dates (utile pour aperçu).
 */
export function listerJoursFeries(dateDebutISO, dateFinISO) {
  return [...JOURS_FERIES].filter(d => d >= dateDebutISO && d <= dateFinISO).sort();
}

/**
 * Liste les périodes de vacances qui chevauchent une plage (utile pour résumé).
 */
export function listerVacancesEntre(dateDebutISO, dateFinISO, zone) {
  if (!zone) return [];
  return (VACANCES[zone] || []).filter(p => p.fin >= dateDebutISO && p.debut <= dateFinISO);
}
