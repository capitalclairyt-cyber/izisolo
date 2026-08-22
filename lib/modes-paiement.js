// ============================================================================
// IziSolo — Modes de règlement : LE vocabulaire unique (v93, 2026-08-22)
// ----------------------------------------------------------------------------
// Découvert en relisant un vrai export comptable : `paiements.mode` contenait
// SEPT orthographes pour quatre moyens de paiement, dont la plus fréquente en
// production n'était reconnue par aucun écran.
//
//     "Espèces" 46 · "especes" 38 · "CB" 28 · "cheque" 20
//     "virement" 7 · "Virement" 2 · "Chèque" 2 · null 1
//
// Cause : l'écran de pointage écrivait les LIBELLÉS comme valeurs
// (['Espèces','CB','Chèque','Virement'], espèces par défaut = le chemin le
// plus emprunté du terrain), alors que tout le reste de l'app écrit des clés
// ('especes', 'cheque'…). Dégâts silencieux :
//   • la tuile « Encaissé par mode » de /revenus affichait 0 € d'espèces
//     alors que c'est le mode n°1 (elle ne sommait que les clés connues) ;
//   • le filtre « mode » de l'export comptable ratait ces lignes, donc un
//     document filtré incomplet, sans un mot ;
//   • le récapitulatif sortait « Virement » deux fois, sur deux lignes.
//
// Depuis : tout ce qui LIT un mode passe par `normaliserMode`, tout ce qui
// l'AFFICHE par `labelMode`, tout ce qui l'ÉCRIT prend une clé de
// MODES_REGLEMENT. v93 normalise l'historique.
//
// Module PUR — verrou CI dans urssaf.spec.js.
// ============================================================================

/** Les 4 moyens de paiement du produit. La CLÉ est ce qui va en base. */
export const MODES_REGLEMENT = {
  especes:  { label: 'Espèces',  emoji: '💶' },
  cheque:   { label: 'Chèque',   emoji: '📝' },
  virement: { label: 'Virement', emoji: '🔁' },
  CB:       { label: 'CB',       emoji: '💳' },
};

/** Clés dans l'ordre d'affichage (terrain d'abord : l'espèce domine). */
export const MODES_ORDRE = ['especes', 'cheque', 'virement', 'CB'];

// Orthographes rencontrées, une fois minusculisées et désaccentuées.
const ALIAS = {
  especes: 'especes',
  espece: 'especes',
  cash: 'especes',
  liquide: 'especes',
  cheque: 'cheque',
  cheques: 'cheque',
  virement: 'virement',
  vir: 'virement',
  cb: 'CB',
  carte: 'CB',
  'carte bancaire': 'CB',
  'carte bleue': 'CB',
  stripe: 'CB',
};

// Marques combinantes laissées par la décomposition NFD. Construit depuis une
// chaîne ASCII : un intervalle écrit en dur dans la source contiendrait des
// diacritiques isolés, que le moindre ré-encodage de fichier abîmerait.
const DIACRITIQUES = new RegExp('[\\u0300-\\u036f]', 'g');

/** Minuscules + accents retirés : « Espèces » et « especes » se rejoignent. */
function pivot(mode) {
  return String(mode ?? '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(DIACRITIQUES, '');
}

/**
 * Ramène n'importe quelle écriture à SA clé canonique.
 * Vide / null → 'autre' (un paiement sans mode existe en base, une ligne
 * comptable sans moyen de règlement doit se voir, pas disparaître).
 * Mode inconnu (un studio qui saisirait « Lydia ») → sa forme pivot, pour que
 * les variantes de casse fusionnent quand même sur une seule ligne.
 */
export function normaliserMode(mode) {
  const p = pivot(mode);
  if (!p) return 'autre';
  return ALIAS[p] || p;
}

/** Le libellé à afficher, depuis n'importe quelle écriture. */
export function labelMode(mode) {
  const canon = normaliserMode(mode);
  if (canon === 'autre') return 'Non précisé';
  if (MODES_REGLEMENT[canon]) return MODES_REGLEMENT[canon].label;
  return canon.charAt(0).toUpperCase() + canon.slice(1);
}

/** Deux écritures désignent-elles le même moyen de paiement ? */
export function memeMode(a, b) {
  return normaliserMode(a) === normaliserMode(b);
}

/** La clé est-elle l'un des 4 moyens du produit ? (validation d'entrée) */
export function estModeConnu(mode) {
  return Object.hasOwn(MODES_REGLEMENT, normaliserMode(mode));
}
