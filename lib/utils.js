// ============================================
// IziSolo — Utilitaires
// ============================================

/**
 * Formate une date en français
 */
export function formatDate(date, options = {}) {
  const d = new Date(date);
  const { year: yearOpt, ...rest } = options;
  return d.toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: yearOpt !== false ? 'numeric' : undefined,
    ...rest,
  });
}

/**
 * Formate une date courte : "Mar. 25 mars"
 */
export function formatDateCourte(date) {
  const d = new Date(date);
  const jour = d.toLocaleDateString('fr-FR', { weekday: 'short' });
  const num = d.getDate();
  const mois = d.toLocaleDateString('fr-FR', { month: 'short' });
  return `${jour} ${num} ${mois}`;
}

/**
 * Formate une heure : "10:00"
 */
export function formatHeure(time) {
  if (!time) return '';
  return time.substring(0, 5);
}

/**
 * Formate un montant en euros.
 * - Si pas de centimes (entier rond) → "120 €" (sans ",00")
 * - Sinon → "120,50 €"
 * Choix de design (audit UX 2026-05-07) : afficher ",00" pour des montants
 * entiers parasite la lecture sur mobile (overflow cellules) et n'apporte
 * aucune info utile.
 */
export function formatMontant(montant) {
  const num = Number(montant) || 0;
  const isWhole = Math.abs(num - Math.round(num)) < 0.005;
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: isWhole ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(num);
}

/**
 * Génère un slug à partir d'un texte
 */
export function slugify(text) {
  return text
    .toString()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Classe conditionnelle (mini clsx)
 */
export function cn(...args) {
  return args.filter(Boolean).join(' ');
}

/**
 * Calcule le lundi de la semaine courante
 */
export function getLundi(date = new Date()) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

/**
 * Retourne les 7 jours de la semaine à partir d'un lundi
 */
export function getSemaine(lundi) {
  const jours = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(lundi);
    d.setDate(lundi.getDate() + i);
    jours.push(d);
  }
  return jours;
}

/**
 * Vérifie si une date est aujourd'hui
 */
export function isAujourdhui(date) {
  const d = new Date(date);
  const now = new Date();
  return d.toDateString() === now.toDateString();
}

/**
 * Normalise types_cours vers le format hiérarchique :
 * [{ categorie: string|null, items: string[] }]
 *
 * Supporte l'ancien format plat ["type1", "type2"]
 * et le nouveau [{categorie:"X", items:[...]}]
 */
export function normalizeTypesCours(raw) {
  if (!raw) return [];
  const arr = typeof raw === 'string' ? JSON.parse(raw) : raw;
  if (!Array.isArray(arr) || arr.length === 0) return [];
  // Ancien format plat
  if (typeof arr[0] === 'string') {
    return [{ categorie: null, items: arr }];
  }
  return arr;
}

/**
 * Retourne la liste plate de tous les types de cours
 * (compatible ancien format et nouveau format hiérarchique)
 */
export function getAllTypesFromCategories(raw) {
  return normalizeTypesCours(raw).flatMap(cat => cat.items || []);
}
