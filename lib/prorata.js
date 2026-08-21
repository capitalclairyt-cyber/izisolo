/**
 * lib/prorata.js — LE calcul du pro-rata des abonnements à période fixe,
 * source unique (2026-08-21). Était dupliqué en 3 exemplaires divergents
 * (offres/nouveau, VenteOffreModal, FicheClientClient : les deux derniers
 * comparaient « aujourd'hui » AVEC l'heure courante, l'aperçu de création à
 * minuit → montants différents possibles en limite de semaine).
 *
 * La règle, en français :
 *   1. La période de l'abonnement (début → fin) est convertie en SEMAINES
 *      (arrondi à la semaine la plus proche, minimum 1).
 *   2. Prix par semaine = prix de l'offre ÷ semaines totales.
 *   3. Semaines RESTANTES = de la date de référence (aujourd'hui, ou la date
 *      limite pour l'aperçu) jusqu'à la fin, même arrondi.
 *   4. Pro-rata = prix/semaine × semaines restantes, arrondi aux 0,50 € les
 *      plus proches.
 *   Pas de pro-rata si : option désactivée, avant le début de la période
 *   (prix plein), après la date limite de souscription (ou la fin), ou s'il
 *   ne reste aucune semaine.
 *
 * Toutes les dates sont des chaînes AAAA-MM-JJ comparées À MINUIT (aucune
 * heure courante dans le calcul : le montant proposé ne change pas selon
 * l'heure de la journée).
 */

const JOUR_MS = 24 * 3600 * 1000;

export function joursEntreISO(d1, d2) {
  if (!d1 || !d2) return null;
  const diff = new Date(d2 + 'T00:00:00Z') - new Date(d1 + 'T00:00:00Z');
  return Math.round(diff / JOUR_MS);
}

export function semainesEntreISO(d1, d2) {
  const j = joursEntreISO(d1, d2);
  if (j === null) return null;
  return Math.max(0, Math.round(j / 7));
}

/** Date du jour en AAAA-MM-JJ (heure de Paris). */
export function aujourdhuiISO() {
  return new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Paris' }).format(new Date());
}

/**
 * Calcule le pro-rata d'un abonnement à période fixe.
 * @param {object} p
 * @param {boolean} p.actif        pro_rata_actif de l'offre
 * @param {string}  p.dateDebut    AAAA-MM-JJ (début de période)
 * @param {string}  p.dateFin      AAAA-MM-JJ (fin de période)
 * @param {number|string} p.prix   prix plein de l'offre
 * @param {string}  [p.dateRef]    date de souscription (défaut : aujourd'hui)
 * @param {string}  [p.dateLimite] pro_rata_date_limite (défaut : dateFin)
 * @returns {null | { montant, prixSemaine, totalSemaines, resteSemaines }}
 */
export function calcProRata({ actif = true, dateDebut, dateFin, prix, dateRef, dateLimite } = {}) {
  if (!actif || !dateDebut || !dateFin) return null;
  const prixNum = parseFloat(prix);
  if (!prixNum || Number.isNaN(prixNum)) return null;
  const ref = dateRef || aujourdhuiISO();
  // Avant (ou le jour du) début : prix plein, pas de pro-rata.
  if (ref <= dateDebut) return null;
  // Après la date limite de souscription (ou la fin) : plus de pro-rata.
  const limite = dateLimite || dateFin;
  if (ref > limite) return null;
  const totalSemaines = Math.max(1, semainesEntreISO(dateDebut, dateFin));
  const resteSemaines = semainesEntreISO(ref, dateFin);
  if (!resteSemaines || resteSemaines <= 0) return null;
  const prixSemaine = prixNum / totalSemaines;
  const montant = Math.round(prixSemaine * resteSemaines * 2) / 2;
  return { montant, prixSemaine, totalSemaines, resteSemaines };
}
