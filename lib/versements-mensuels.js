// ============================================
// IziSolo — Versements mensuels (PUR, aucune requête)
// ============================================
//
// Retour Manon (Soleya), 2026-09-07 : « pour mes abonnements au mois,
// comment je fais pour que ça génère automatiquement une facture chaque
// début de mois ? Je n'arrive à générer qu'une facture pour le mois
// d'août. » Diagnostic en base : son « Abonnement au mois » est un abo de
// SAISON (28/06 → 28/06) vendu avec UN paiement de 55 €. Une facture v84 est
// acquittée : elle naît d'un paiement reçu. Une facture par mois veut donc
// dire un paiement par mois — c'est ce que ce module fabrique.
//
// Deux consommateurs, UNE règle :
//   • la fiche élève, sur un abo déjà vendu : « Programmer un versement
//     chaque mois » (route /api/abonnements/[id]/versements-mensuels) ;
//   • le tunnel de vente : le préréglage « Chaque mois » de l'échéancier
//     (nombre de mois déduit de la durée de l'offre).
//
// Règles gravées :
//   • un mois déjà couvert par un paiement de l'abo (réglé OU en attente)
//     n'est JAMAIS doublé — re-valider ne fabrique rien ;
//   • on ne dépasse jamais la fin de l'abo ;
//   • le jour choisi se replie sur le dernier jour du mois quand il n'existe
//     pas (le 31 → le 30 avril, le 28 février) ;
//   • plafond de 24 versements : au-delà, ce n'est plus un échéancier.

import { moisDePaiement } from './factures.js';

export const MAX_VERSEMENTS = 24;
export const MAX_VERSEMENTS_TUNNEL = 12;

const REGEX_MOIS = /^\d{4}-\d{2}$/;
const REGEX_DATE = /^\d{4}-\d{2}-\d{2}$/;

const MOIS_FR = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];

const pad = n => String(n).padStart(2, '0');

/** Nombre de jours du mois (annee, mois 1..12). */
export function joursDansMois(annee, mois) {
  return new Date(Date.UTC(annee, mois, 0)).getUTCDate();
}

/** 'YYYY-MM' + jour → date ISO, jour replié sur le dernier jour du mois. */
export function dateDuMois(mois, jour) {
  if (!REGEX_MOIS.test(String(mois || ''))) return null;
  const [a, m] = mois.split('-').map(Number);
  const j = Math.min(Math.max(1, parseInt(jour, 10) || 1), joursDansMois(a, m));
  return `${a}-${pad(m)}-${pad(j)}`;
}

/** 'YYYY-MM' + n → le mois n plus tard (n peut être négatif). */
export function moisPlus(mois, n) {
  if (!REGEX_MOIS.test(String(mois || ''))) return null;
  const [a, m] = mois.split('-').map(Number);
  const total = a * 12 + (m - 1) + n;
  return `${Math.floor(total / 12)}-${pad((total % 12) + 1)}`;
}

/** 'YYYY-MM' → 'septembre 2026'. */
export function labelMoisLong(mois) {
  if (!REGEX_MOIS.test(String(mois || ''))) return String(mois || '');
  const [a, m] = mois.split('-');
  return `${MOIS_FR[parseInt(m, 10) - 1]} ${a}`;
}

/** Date ISO → '1 septembre 2026' (pas de « 1er » : c'est ce qui s'imprime partout ailleurs). */
export function labelDate(iso) {
  if (!REGEX_DATE.test(String(iso || ''))) return String(iso || '');
  const [a, m, j] = iso.split('-');
  return `${parseInt(j, 10)} ${MOIS_FR[parseInt(m, 10) - 1]} ${a}`;
}

/**
 * Mois déjà COUVERTS par les paiements d'un abo. Un paiement réglé compte
 * pour son mois d'encaissement (la même règle que « Facture du mois »,
 * moisDePaiement) ; un paiement en attente compte pour son échéance. Les
 * paiements annulés/remboursés ne couvrent rien.
 * → Set('2026-08', …)
 */
export function moisCouverts(paiements) {
  const set = new Set();
  for (const p of paiements || []) {
    if (!p) continue;
    const statut = p.statut || 'pending';
    if (statut !== 'paid' && statut !== 'pending' && statut !== 'overdue') continue;
    const mois = statut === 'paid' ? moisDePaiement(p) : String(p.date || '').slice(0, 7);
    if (REGEX_MOIS.test(mois)) set.add(mois);
  }
  return set;
}

/**
 * Le premier mois qu'on proposera : le mois courant s'il n'est pas couvert,
 * sinon le premier mois libre qui suit. `aujourdhui` en ISO (testable).
 */
export function premierMoisLibre(aujourdhui, couverts = new Set()) {
  let mois = String(aujourdhui || '').slice(0, 7);
  if (!REGEX_MOIS.test(mois)) return null;
  for (let i = 0; i < MAX_VERSEMENTS * 2; i++) {
    if (!couverts.has(mois)) return mois;
    mois = moisPlus(mois, 1);
  }
  return mois;
}

/**
 * Génère les versements mensuels.
 *   montant   : le montant de CHAQUE versement (> 0)
 *   jour      : jour du mois (1..31, replié)
 *   debut     : 'YYYY-MM' du premier mois voulu
 *   fin       : date ISO de fin de l'abo (null = pas de borne → nbMax)
 *   couverts  : Set des mois déjà couverts (jamais doublés)
 *   nbMax     : plafond (défaut MAX_VERSEMENTS)
 * → { versements: [{ mois, date, montant }], ignores: ['2026-10', …] }
 *   `ignores` = les mois sautés parce que déjà couverts (le compte rendu
 *   AVOUE ce qu'il n'a pas créé, règle des inscriptions en série).
 */
export function genererVersementsMensuels({ montant, jour = 1, debut, fin = null, couverts = new Set(), nbMax = MAX_VERSEMENTS } = {}) {
  const m = Math.round((parseFloat(montant) || 0) * 100) / 100;
  const out = { versements: [], ignores: [] };
  if (!(m > 0) || !REGEX_MOIS.test(String(debut || ''))) return out;
  const borne = REGEX_DATE.test(String(fin || '')) ? fin : null;
  const plafond = Math.max(0, Math.min(nbMax, MAX_VERSEMENTS));
  let mois = debut;
  // On parcourt au plus MAX_VERSEMENTS × 2 mois : les mois ignorés ne
  // consomment pas le plafond, mais la boucle doit finir.
  for (let i = 0; i < MAX_VERSEMENTS * 2 && out.versements.length < plafond; i++) {
    const date = dateDuMois(mois, jour);
    if (borne && date > borne) break;
    if (couverts.has(mois)) out.ignores.push(mois);
    else out.versements.push({ mois, date, montant: m });
    mois = moisPlus(mois, 1);
  }
  return out;
}

/** Formatage euros sans dépendre de lib/utils (module pur, testé seul). */
function euros(n) {
  const v = Math.round((parseFloat(n) || 0) * 100) / 100;
  const s = Number.isInteger(v) ? String(v) : v.toFixed(2).replace('.', ',');
  return `${s} €`;
}

/**
 * La phrase de l'aperçu, celle que la prof lit AVANT de confirmer.
 *   « 10 versements de 55 €, du 1 septembre 2026 au 1 juin 2027 »
 *   « 1 versement de 55 €, le 1 septembre 2026 »
 *   « Aucun versement à programmer »
 */
export function resumeVersements(versements, ignores = []) {
  const n = (versements || []).length;
  let phrase;
  if (n === 0) phrase = 'Aucun versement à programmer';
  else if (n === 1) phrase = `1 versement de ${euros(versements[0].montant)}, le ${labelDate(versements[0].date)}`;
  else phrase = `${n} versements de ${euros(versements[0].montant)}, du ${labelDate(versements[0].date)} au ${labelDate(versements[n - 1].date)}`;
  const k = (ignores || []).length;
  if (k > 0) {
    phrase += ` (${k} mois déjà ${k > 1 ? 'couverts' : 'couvert'} : ${ignores.map(labelMoisLong).join(', ')})`;
  }
  return phrase;
}

/**
 * Nombre de mois d'une OFFRE, pour le préréglage « Chaque mois » du tunnel :
 * dates fixes → mois entre les deux (arrondi, plancher 1) ; sinon
 * duree_jours / 30 (un mois vaut 30 jours ici, choix documenté dans
 * PRESETS_DUREE_ABO). null si l'offre ne dit rien. Plafonné au tunnel (12).
 */
export function nbMoisOffre(offre) {
  if (!offre) return null;
  const { date_debut, date_fin, duree_jours } = offre;
  let mois = null;
  if (REGEX_DATE.test(String(date_debut || '')) && REGEX_DATE.test(String(date_fin || '')) && date_fin > date_debut) {
    const [a1, m1, j1] = date_debut.split('-').map(Number);
    const [a2, m2, j2] = date_fin.split('-').map(Number);
    const brut = (a2 * 12 + m2) - (a1 * 12 + m1) + (j2 - j1) / 30;
    mois = Math.round(brut);
  } else if (parseInt(duree_jours, 10) > 0) {
    mois = Math.round(parseInt(duree_jours, 10) / 30);
  }
  if (mois == null) return null;
  return Math.min(MAX_VERSEMENTS_TUNNEL, Math.max(1, mois));
}

/**
 * Versements du tunnel en mode « Chaque mois » : n versements ÉGAUX de
 * `parMois`, à partir d'aujourd'hui, un mois d'écart. Le premier est coché
 * « encaissé » (l'élève règle le premier mois à la vente), sans mode : le
 * mode se déclare, jamais présumé (leçon Kim).
 */
export function versementsChaqueMois({ parMois, nb, aujourdhui }) {
  const m = Math.round((parseFloat(parMois) || 0) * 100) / 100;
  const n = Math.min(MAX_VERSEMENTS_TUNNEL, Math.max(1, parseInt(nb, 10) || 0));
  if (!(m > 0) || !REGEX_DATE.test(String(aujourdhui || ''))) return [];
  const mois0 = aujourdhui.slice(0, 7);
  const jour = parseInt(aujourdhui.slice(8, 10), 10);
  return Array.from({ length: n }, (_, i) => ({
    montant: m,
    date: dateDuMois(moisPlus(mois0, i), jour),
    encaisse: i === 0,
    mode: '',
  }));
}
