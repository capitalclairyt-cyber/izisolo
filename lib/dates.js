// ============================================
// IziSolo — Utilitaires de dates (sans UTC)
// Toutes les dates sont manipulées en LOCAL
// Format de sortie : 'YYYY-MM-DD' (pour Supabase)
// ============================================

/**
 * Un cours (date 'YYYY-MM-DD' + heure Postgres 'HH:MM:SS'|null) a-t-il déjà
 * commencé, en HEURE DE PARIS ? — l'horloge unique des routes portail
 * (audit 2026-07-25 : il y avait DEUX horloges — reserver à la minute Paris,
 * essai/liste d'attente/promotion au jour UTC → entre minuit et 2 h l'été,
 * « aujourd'hui » était hier, et un cours du soir restait demandable toute
 * la journée). Sans heure : commencé à partir du lendemain (jour révolu).
 */
export function coursDejaCommence(cours, now = new Date()) {
  if (!cours?.date) return false;
  const nowParis = now.toLocaleString('sv-SE', { timeZone: 'Europe/Paris' });
  return cours.heure
    ? `${cours.date} ${String(cours.heure).slice(0, 5)}` <= nowParis.slice(0, 16)
    : cours.date < nowParis.slice(0, 10);
}

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
 * Nombre de semaines CALENDAIRES entre deux dates locales (Date ou 'YYYY-MM-DD').
 * Compte en jours civils via Date.UTC — insensible aux changements d'heure.
 * (Le calcul « (b - a) / 7 jours de millisecondes » sur des Dates locales
 * perdait 1 h au passage à l'heure d'été → la parité bimensuelle retombait
 * sur la semaine N-1 : série « 1 sem./2 » ancrée lundi 02/03 qui générait
 * 02/03, 16/03 puis 06/04 au lieu du 30/03. Audit B1b 2026-07-25.)
 */
export function semainesEntre(a, b) {
  const da = a instanceof Date ? a : parseDate(a);
  const db = b instanceof Date ? b : parseDate(b);
  const utcA = Date.UTC(da.getFullYear(), da.getMonth(), da.getDate());
  const utcB = Date.UTC(db.getFullYear(), db.getMonth(), db.getDate());
  return Math.floor(Math.round((utcB - utcA) / 86400000) / 7);
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
