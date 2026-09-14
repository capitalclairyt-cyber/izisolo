// ============================================================================
// IziSolo — Encaisser un paiement en attente en PLUSIEURS moyens (2026-09-14)
// ----------------------------------------------------------------------------
// Déclencheur : Maude, abonnement annuel de Marie-Pierre vendu le 25/08 « à
// régler plus tard » (une ligne de 480 € en attente), puis DEUX chèques qui
// arrivent le mois suivant. « En plusieurs fois » et « Plusieurs moyens »
// n'existaient qu'au moment de la VENTE ; après coup, « Encaisser » était tout
// ou rien (un mode, un numéro de chèque) et « Encaisser un versement »
// AJOUTAIT une ligne en attente. Aucune sortie ne disait « ces 480 € arrivent
// en deux chèques ».
//
// Ce module est la règle PURE du découpage après coup, miroir de « Plusieurs
// moyens » à la vente : la ligne en attente devient N lignes RÉGLÉES, chacune
// avec son moyen, son numéro de chèque et sa date d'encaissement, rattachées
// au même échéancier. Un découpage qui ne fait pas le total est REFUSÉ, et
// rien n'est écrit tant que le compte n'y est pas.
//
// Aucune requête ici : la route /api/paiements/[id]/encaisser exécute.
// Verrou CI : tests/e2e/encaissement-parts.spec.js.
// ============================================================================

import { MODES_REGLEMENT } from './modes-paiement.js';

/** Au-delà de quatre moyens, c'est un échéancier, pas un panachage. */
export const MAX_PARTS = 4;
export const MIN_PARTS = 2;

const TOLERANCE = 0.011; // arrondis de saisie à deux décimales
const DATE_ISO = /^\d{4}-\d{2}-\d{2}$/;

const arrondi = n => Math.round(n * 100) / 100;

/** Une date ISO valide, sans débordement (le 31/02 ne devient pas le 03/03). */
export function dateIsoValide(s) {
  if (typeof s !== 'string' || !DATE_ISO.test(s)) return false;
  const [y, m, d] = s.split('-').map(Number);
  if (m < 1 || m > 12 || d < 1) return false;
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
}

/**
 * Découpe un total en `nb` parts à deux décimales, le reliquat sur la
 * première (même règle que decouperEnMoyens à la vente).
 */
export function decouperMontant(total, nb) {
  const t = Number(total);
  const n = Math.max(MIN_PARTS, Math.min(MAX_PARTS, Number(nb) || MIN_PARTS));
  if (!Number.isFinite(t) || t <= 0) return Array.from({ length: n }, () => 0);
  const base = Math.floor((t / n) * 100) / 100;
  const reste = arrondi(t - base * n);
  return Array.from({ length: n }, (_, i) => arrondi(i === 0 ? base + reste : base));
}

/**
 * Valide et normalise les parts saisies. Rend { ok, erreur, parts }.
 * `parts` normalisées : { montant, mode, numero_cheque, date_encaissement }.
 * - 2 à 4 parts, chaque montant > 0, chaque mode déclaré (jamais deviné) ;
 * - la somme fait le total, à l'arrondi de saisie près ;
 * - numéro de chèque conservé SEULEMENT sur un chèque ;
 * - date d'encaissement facultative (défaut = `aujourdhui`), jamais dans
 *   le futur au-delà d'aujourd'hui : on encaisse ce qui est arrivé.
 */
export function validerParts(parts, total, { aujourdhui } = {}) {
  const t = Number(total);
  if (!Number.isFinite(t) || t <= 0) return { ok: false, erreur: 'Montant à encaisser inconnu.', parts: [] };
  if (!Array.isArray(parts)) return { ok: false, erreur: 'Aucun découpage fourni.', parts: [] };
  if (parts.length < MIN_PARTS) return { ok: false, erreur: `Il faut au moins ${MIN_PARTS} moyens pour découper : sinon, encaisse en un seul.`, parts: [] };
  if (parts.length > MAX_PARTS) return { ok: false, erreur: `Au plus ${MAX_PARTS} moyens pour un même paiement.`, parts: [] };

  const auj = dateIsoValide(aujourdhui) ? aujourdhui : null;
  const normalisees = [];
  for (let i = 0; i < parts.length; i++) {
    const p = parts[i] || {};
    const montant = arrondi(Number(p.montant));
    if (!Number.isFinite(montant) || montant <= 0) {
      return { ok: false, erreur: `Le montant du moyen n°${i + 1} est manquant ou nul.`, parts: [] };
    }
    const mode = typeof p.mode === 'string' ? p.mode : '';
    if (!MODES_REGLEMENT[mode]) {
      return { ok: false, erreur: `Déclare comment est arrivé le moyen n°${i + 1} (espèces, chèque, virement ou CB).`, parts: [] };
    }
    let date = p.date_encaissement;
    if (date == null || date === '') date = auj;
    if (date != null && !dateIsoValide(date)) {
      return { ok: false, erreur: `La date d'encaissement du moyen n°${i + 1} n'est pas une date.`, parts: [] };
    }
    if (auj && date && date > auj) {
      return { ok: false, erreur: `Le moyen n°${i + 1} est daté dans le futur : on n'encaisse que ce qui est arrivé.`, parts: [] };
    }
    const cheque = mode === 'cheque' && typeof p.numero_cheque === 'string' && p.numero_cheque.trim()
      ? p.numero_cheque.trim().slice(0, 100)
      : null;
    normalisees.push({ montant, mode, numero_cheque: cheque, date_encaissement: date || null });
  }

  const somme = arrondi(normalisees.reduce((s, p) => s + p.montant, 0));
  if (Math.abs(somme - arrondi(t)) > TOLERANCE) {
    return {
      ok: false,
      erreur: `Le détail des moyens fait ${somme.toFixed(2).replace('.', ',')} € au lieu de ${arrondi(t).toFixed(2).replace('.', ',')} €. Ajuste les lignes : rien n'est enregistré tant que le compte n'y est pas.`,
      parts: [],
    };
  }
  return { ok: true, erreur: null, parts: normalisees };
}

const sansSuffixe = s => String(s || '').replace(/\s*\(\d+\/\d+\)\s*$/, '').trim();

/**
 * Construit ce que la route écrit : la ligne d'origine devient la part n°1
 * (même id, donc une facture ou une présence déjà rattachée reste sur elle),
 * les parts suivantes sont des lignes NEUVES, sœurs par l'échéancier.
 * `paiement` = la ligne en attente lue en base ; `parts` = validées.
 */
export function lignesEncaissement(paiement, parts, { echeancierId, notes } = {}) {
  const n = parts.length;
  const base = sansSuffixe(paiement.intitule) || 'Paiement';
  const echId = paiement.echeancier_id || echeancierId || null;
  const [premiere, ...suivantes] = parts;
  const notesFusionnees = notes
    ? (paiement.notes ? `${paiement.notes}\n${notes}` : notes)
    : (paiement.notes ?? null);
  return {
    principale: {
      statut: 'paid',
      montant: premiere.montant,
      mode: premiere.mode,
      numero_cheque: premiere.numero_cheque,
      date_encaissement: premiere.date_encaissement,
      intitule: `${base} (1/${n})`,
      echeancier_id: echId,
      notes: notesFusionnees,
    },
    nouvelles: suivantes.map((p, i) => ({
      profile_id: paiement.profile_id,
      client_id: paiement.client_id ?? null,
      offre_id: paiement.offre_id ?? null,
      abonnement_id: paiement.abonnement_id ?? null,
      echeancier_id: echId,
      intitule: `${base} (${i + 2}/${n})`,
      type: paiement.type ?? null,
      montant: p.montant,
      statut: 'paid',
      mode: p.mode,
      numero_cheque: p.numero_cheque,
      date: paiement.date ?? p.date_encaissement,
      date_encaissement: p.date_encaissement,
      notes: null,
      // Jamais recopiés : une présence ou une session Stripe ne se
      // rattachent qu'à UNE ligne, celle d'origine.
      presence_id: null,
      stripe_session_id: null,
    })),
  };
}

/** « 240 € par chèque + 240 € par chèque » pour un toast ou un aperçu. */
export function texteParts(parts) {
  const fmt = n => `${Number(n).toFixed(2).replace(/\.00$/, '').replace('.', ',')} €`;
  return (parts || []).map(p => `${fmt(p.montant)} ${p.mode === 'especes' ? 'en espèces' : `par ${(MODES_REGLEMENT[p.mode]?.label || p.mode || '?').toLowerCase()}`}`).join(' + ');
}
