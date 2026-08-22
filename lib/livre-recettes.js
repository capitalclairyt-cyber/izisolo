// ============================================================================
// IziSolo — Livre des recettes (v93, 2026-08-22)
// ----------------------------------------------------------------------------
// Le registre que la micro-entreprise DOIT tenir : le document qu'on réclame
// en cas de contrôle. Cinq colonnes obligatoires, et IziSolo les possède déjà
// toutes :
//     date d'encaissement · référence de la pièce · origine (client·e) ·
//     montant · mode de règlement
//
// Choix assumés :
//   • CHRONOLOGIQUE sur la date d'ENCAISSEMENT (assiette de trésorerie), pas
//     sur la date de vente. Même règle que tout le reste, cf. lib/urssaf.js.
//   • `paid` uniquement : une créance n'est pas une recette.
//   • Référence = le numéro de facture v84 s'il existe, sinon un identifiant
//     court dérivé de l'id du paiement (stable, retrouvable dans l'app).
//   • Rien n'est stocké : le livre se REGÉNÈRE à la demande depuis les
//     paiements. Pas de numérotation gelée ici (≠ factures v84, où le numéro
//     engage) — le registre est un reflet, la facture est un engagement.
//
// Module PUR (dépendances pures uniquement) : testable en spec Node, réutilisable par le
// rendu PDF comme par un futur export tableur.
// ============================================================================

import { dateComptable, moisComptable, montantFr } from './urssaf.js';
import { labelMode } from './modes-paiement.js';

const MOIS_FR = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin',
  'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];

/** Libellé humain d'un mois 'AAAA-MM'. */
export function libelleMois(mois) {
  const [a, m] = String(mois || '').split('-').map(Number);
  if (!MOIS_FR[m - 1]) return String(mois || '');
  return `${MOIS_FR[m - 1]} ${a}`;
}

/** Nom affiché d'une fiche client (structure d'abord, comme partout ailleurs). */
export function origineClient(client) {
  if (!client) return 'Non renseigné';
  return client.nom_structure
    || [client.prenom, client.nom].filter(Boolean).join(' ').trim()
    || 'Non renseigné';
}

/**
 * Référence de la pièce justificative.
 * Facture v84 si elle existe (c'est LA pièce), sinon un identifiant court et
 * stable dérivé du paiement — retrouvable dans l'app, jamais inventé.
 */
export function referencePiece(paiement, numeroFacture) {
  if (numeroFacture) return numeroFacture;
  const id = String(paiement?.id || '').replace(/-/g, '');
  return id ? `ENC-${id.slice(0, 8).toUpperCase()}` : 'ENC-?';
}

/**
 * Construit le registre complet.
 * @param {Object} opts
 * @param {Array}  opts.paiements   paiements 'paid' de la période (bruts DB)
 * @param {Map}    opts.numeros     Map paiement_id → numéro de facture (v84)
 * @param {Object} opts.periode     {label, from, to} (cf. lib/urssaf.js)
 * @param {Object} opts.emetteur    {nom, siret, ville}
 */
export function construireLivreRecettes({ paiements = [], numeros = new Map(), periode, emetteur = {} }) {
  const lignes = paiements
    .map(p => ({
      id: p.id,
      date: dateComptable(p, 'encaissement'),
      mois: moisComptable(p, 'encaissement'),
      reference: referencePiece(p, numeros.get(p.id)),
      origine: origineClient(p.clients),
      intitule: p.intitule || 'Prestation',
      mode: labelMode(p.mode),
      montant: Math.round((parseFloat(p.montant) || 0) * 100) / 100,
    }))
    // Chronologique strict ; à date égale, l'id départage (ordre stable d'un
    // téléchargement à l'autre — un registre qui se réordonne serait suspect).
    .sort((a, b) => (a.date === b.date
      ? String(a.id).localeCompare(String(b.id))
      : String(a.date || '').localeCompare(String(b.date || ''))));

  const parMoisMap = new Map();
  let total = 0;
  for (const l of lignes) {
    total += l.montant;
    const cur = parMoisMap.get(l.mois) || { mois: l.mois, label: libelleMois(l.mois), total: 0, nombre: 0 };
    cur.total += l.montant;
    cur.nombre += 1;
    parMoisMap.set(l.mois, cur);
  }

  const parMois = [...parMoisMap.values()]
    .map(m => ({ ...m, total: Math.round(m.total * 100) / 100 }))
    .sort((a, b) => a.mois.localeCompare(b.mois));

  return {
    periode: periode || null,
    emetteur,
    lignes,
    parMois,
    nombre: lignes.length,
    total: Math.round(total * 100) / 100,
  };
}

/** Le livre en lignes CSV (pour qui préfère le tableur au PDF). */
export function livreEnCsv(livre) {
  const esc = (v) => {
    const s = String(v ?? '');
    return /[;"\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const l = (cells) => cells.map(esc).join(';');

  const out = [
    l(['Date', 'Référence', 'Origine', 'Nature', 'Mode de règlement', 'Montant']),
    ...livre.lignes.map(x => l([x.date, x.reference, x.origine, x.intitule, x.mode, montantFr(x.montant)])),
    l([`TOTAL (${livre.nombre} recette${livre.nombre > 1 ? 's' : ''})`, '', '', '', '', montantFr(livre.total)]),
  ];

  if (livre.parMois.length > 0) {
    out.push('', l(['TOTAUX PAR MOIS']));
    for (const m of livre.parMois) out.push(l([m.label, '', '', '', String(m.nombre), montantFr(m.total)]));
  }
  return '﻿' + out.join('\r\n');
}
