/**
 * Comment une offre borne sa période — source unique.
 *
 * Une offre d'abonnement se borne de DEUX façons, et une seule des deux
 * existait dans le formulaire de création jusqu'au 2026-08-22 :
 *
 *   - PÉRIODE FIXE : l'offre porte `date_debut` et `date_fin`. Tout le monde a
 *     les mêmes dates, c'est la saison de septembre à juin. Le pro-rata sert
 *     précisément à rejoindre cette période commune en cours de route.
 *
 *   - DURÉE GLISSANTE : l'offre ne porte que `duree_jours`, et la période se
 *     calcule à la VENTE, à partir du jour où la prof l'attribue. C'est
 *     l'abonnement mensuel : une seule offre à créer, vendable toute l'année.
 *     Le pro-rata n'a alors aucun sens (chacune démarre à sa date).
 *
 * Le chemin de vente savait déjà faire le glissant (`date_fin` dérivée de
 * `duree_jours` quand l'offre n'a pas de dates), le portail et la fiche élève
 * aussi. Seul le formulaire de création l'interdisait, ce qui obligeait à
 * recréer une offre « Abonnement mensuel » douze fois par an (retour Colin).
 *
 * ⚠️ La date se calcule en heure de PARIS via `aujourdhuiISO()`, jamais par
 * `new Date().toISOString()` : entre minuit et 2 h du matin, l'UTC renvoie la
 * veille et la période partirait décalée d'un jour (les deux copies locales
 * que ce module remplace avaient ce défaut).
 */
import { aujourdhuiISO } from './prorata.js';

/**
 * L'offre se compte-t-elle à partir de la vente ?
 * Une offre d'abonnement sans dates est glissante par construction.
 */
export function estPeriodeGlissante(offre) {
  if (!offre) return false;
  return !offre.date_debut && !offre.date_fin && !!offre.duree_jours;
}

/**
 * Date de fin d'une période glissante, en AAAA-MM-JJ.
 * @param {number|string} dureeJours  durée en jours (>= 1)
 * @param {string} [dateRefISO]       jour de départ (défaut : aujourd'hui, Paris)
 * @returns {string|null}             null si la durée est absente ou invalide
 */
export function finGlissanteISO(dureeJours, dateRefISO) {
  const n = parseInt(dureeJours, 10);
  if (!Number.isFinite(n) || n < 1) return null;
  const depart = dateRefISO || aujourdhuiISO();
  const [y, m, d] = depart.split('-').map(Number);
  if (!y || !m || !d) return null;
  // Date UTC pure : pas de décalage possible, on ne manipule que des jours.
  const fin = new Date(Date.UTC(y, m - 1, d + n));
  return fin.toISOString().split('T')[0];
}

/**
 * Les bornes à écrire sur l'abonnement d'un·e élève au moment de la vente.
 * Période fixe → les dates de l'offre. Glissante → aujourd'hui + durée.
 * @returns {{date_debut: string, date_fin: string|null}}
 */
export function bornesVente(offre, dateRefISO) {
  const depart = dateRefISO || aujourdhuiISO();
  return {
    date_debut: offre?.date_debut || depart,
    date_fin: offre?.date_fin || finGlissanteISO(offre?.duree_jours, depart),
  };
}
