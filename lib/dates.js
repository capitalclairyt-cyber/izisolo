// ============================================
// IziSolo — Utilitaires de dates (sans UTC)
// Toutes les dates sont manipulées en LOCAL
// Format de sortie : 'YYYY-MM-DD' (pour Supabase)
// ============================================

/**
 * Crée une date locale à partir d'un string 'YYYY-MM-DD'
 * Évite le piège de new Date('2025-04-07') qui crée en UTC
 */
export function parseDate(str) {
  if (!str) return new Date();
  if (str instanceof Date) return new Date(str);
  const [y, m, d] = str.split('-').map(Number);
  return new Date(y, m - 1, d);
}

/**
 * Formate une date locale en 'YYYY-MM-DD'
 */
export function toDateStr(date) {
  const d = date instanceof Date ? date : new Date(date);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/**
 * Retourne le lundi de la semaine contenant `date`
 */
export function getLundi(date = new Date()) {
  const d = new Date(date);
  const day = d.getDay(); // 0=dim, 1=lun...
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

/**
 * Retourne les 7 jours (Date[]) de la semaine à partir d'un lundi
 */
export function getSemaine(lundi) {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(lundi);
    d.setDate(lundi.getDate() + i);
    return d;
  });
}

/**
 * Ajoute N jours à une date
 */
export function addDays(date, n) {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}

/**
 * Ajoute N mois à une date
 */
export function addMonths(date, n) {
  const d = new Date(date);
  d.setMonth(d.getMonth() + n);
  return d;
}

/**
 * Vérifie si une date est aujourd'hui
 */
export function isAujourdhui(date) {
  const d = date instanceof Date ? date : parseDate(date);
  const now = new Date();
  return d.getFullYear() === now.getFullYear()
    && d.getMonth() === now.getMonth()
    && d.getDate() === now.getDate();
}

/**
 * Vérifie si deux dates sont le même jour
 */
export function isSameDay(a, b) {
  const da = a instanceof Date ? a : parseDate(a);
  const db = b instanceof Date ? b : parseDate(b);
  return da.getFullYear() === db.getFullYear()
    && da.getMonth() === db.getMonth()
    && da.getDate() === db.getDate();
}

/**
 * Retourne tous les jours d'un mois donné (Date[])
 */
export function getJoursDuMois(year, month) {
  const jours = [];
  const d = new Date(year, month, 1);
  while (d.getMonth() === month) {
    jours.push(new Date(d));
    d.setDate(d.getDate() + 1);
  }
  return jours;
}

/**
 * Retourne la grille du mois (6 semaines × 7 jours) pour un calendrier
 * Inclut les jours du mois précédent et suivant pour remplir
 */
export function getGrilleMois(year, month) {
  const premierJour = new Date(year, month, 1);
  const lundi = getLundi(premierJour);
  const grille = [];
  const d = new Date(lundi);
  for (let i = 0; i < 42; i++) { // 6 semaines max
    grille.push(new Date(d));
    d.setDate(d.getDate() + 1);
  }
  return grille;
}

/**
 * Noms des jours courts
 */
export const JOURS_COURTS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];

/**
 * Noms des mois
 */
export const MOIS = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
];

/**
 * Formate une date en français : "Mardi 7 avril 2025"
 */
export function formatDateLong(date) {
  const d = date instanceof Date ? date : parseDate(date);
  return d.toLocaleDateString('fr-FR', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
  });
}

/**
 * Formate une date courte : "7 avr."
 */
export function formatDateCourte(date) {
  const d = date instanceof Date ? date : parseDate(date);
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
}
