// ============================================
// IziSolo — Rendu PDF facture / reçu (v84)
// ============================================
//
// Rend un document A4 depuis un SNAPSHOT (cf. lib/factures.js) : le PDF ne
// lit JAMAIS la DB — re-rendre le snapshot d'une facture émise redonne le
// document à l'identique (immutabilité comptable).
//
// Deux types :
//   'facture' — FACTURE acquittée : n° séquentiel, SIRET, dates de règlement
//               par ligne, mention TVA du studio. Le document CSE/mutuelle.
//   'recu'    — l'ancien « REÇU DE PAIEMENT » (SIRET absent) : conservé tel
//               quel pour les studios sans facturation configurée.
//
// ⚠️ StandardFonts = WinAnsi only : le snapshot arrive déjà nettoyé
// (winAnsiSafe), ne rien injecter ici sans passer par lib/factures.js.

import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { formaterSiret } from './validation.js';

const NOIR = rgb(0, 0, 0);
const GRIS = rgb(0.4, 0.4, 0.4);
const GRIS_CLAIR = rgb(0.85, 0.85, 0.85);
const BRAND = rgb(0.83, 0.63, 0.63); // #d4a0a0

const LEFT = 50;
const RIGHT = 545;
// Colonnes du tableau (facture multi-lignes)
const COL_DATE = 300;
const COL_MODE = 385;
const COL_MONTANT = RIGHT - 90;

function fmtDateLongue(dateStr) {
  if (!dateStr) return '';
  // Midi : évite le recul de date en TZ négative (piège maison des dates ISO).
  return new Date(String(dateStr).slice(0, 10) + 'T12:00:00')
    .toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });
}

function fmtDateCourte(dateStr) {
  if (!dateStr) return '—';
  return new Date(String(dateStr).slice(0, 10) + 'T12:00:00')
    .toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function fmtMontant(m) {
  return `${(parseFloat(m) || 0).toFixed(2).replace('.', ',')} €`;
}

function fmtMode(mode) {
  const map = { especes: 'Espèces', cheque: 'Chèque', virement: 'Virement', CB: 'CB', cb: 'CB' };
  return map[mode] || mode || '—';
}

/**
 * @param {Object} opts
 * @param {'facture'|'recu'} opts.type
 * @param {string} opts.numeroAffiche  'FAC-2026-0042' (facture) ou 'N° AB12CD34' (reçu)
 * @param {string} opts.dateEmission   'YYYY-MM-DD'
 * @param {Object} opts.snapshot       cf. construireSnapshot (lib/factures.js)
 * @returns {Promise<Uint8Array>}
 */
export async function genererFacturePdf({ type, numeroAffiche, dateEmission, snapshot }) {
  const { emetteur = {}, client = {}, lignes = [], total = 0, mention_tva: mentionTva } = snapshot || {};
  const estFacture = type === 'facture';

  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdf.embedFont(StandardFonts.HelveticaBold);

  let page = pdf.addPage([595, 842]); // A4
  let y = 800;

  const ligneTexte = (txt, opts = {}) => {
    page.drawText(txt, { x: opts.x ?? LEFT, y, size: opts.size ?? 10, font: opts.bold ? fontBold : font, color: opts.color ?? GRIS });
    y -= opts.dy ?? 14;
  };
  const filet = (x1, x2) => {
    page.drawRectangle({ x: x1, y: y - 4, width: x2 - x1, height: 1, color: GRIS_CLAIR });
  };
  const enTeteTableau = () => {
    filet(LEFT, RIGHT);
    y -= 20;
    page.drawText('Désignation', { x: LEFT, y, size: 10, font: fontBold, color: NOIR });
    page.drawText('Réglé le', { x: COL_DATE, y, size: 10, font: fontBold, color: NOIR });
    page.drawText('Mode', { x: COL_MODE, y, size: 10, font: fontBold, color: NOIR });
    page.drawText('Montant TTC', { x: COL_MONTANT, y, size: 10, font: fontBold, color: NOIR });
    y -= 12;
    filet(LEFT, RIGHT);
    y -= 20;
  };

  // ── En-tête émetteur ──────────────────────────────────────────────────────
  ligneTexte(emetteur.nom || 'Studio', { size: 22, bold: true, color: NOIR, dy: 28 });
  // Libellé et mise en forme venus du PAYS (v105) : imprimer « SIRET » sur la
  // facture d'une prof belge est un défaut sur un document qui engage.
  // Repli sur l'ancien rendu pour les factures ÉMISES avant v105 : leur
  // snapshot ne porte pas ces clés, et une facture figée ne se réécrit pas.
  if (estFacture && emetteur.siret) {
    ligneTexte(`${emetteur.identifiant_label || 'SIRET'} : ${emetteur.identifiant_affiche || formaterSiret(emetteur.siret)}`);
  }
  if (emetteur.adresse) ligneTexte(emetteur.adresse);
  const cpVille = [emetteur.code_postal, emetteur.ville].filter(Boolean).join(' ');
  if (cpVille) ligneTexte(cpVille);
  if (emetteur.telephone) ligneTexte(emetteur.telephone);
  if (emetteur.email) ligneTexte(emetteur.email);

  // ── Titre + numéro + date d'émission ─────────────────────────────────────
  y = Math.min(y - 14, 706);
  page.drawText(estFacture ? 'FACTURE' : 'REÇU DE PAIEMENT', { x: LEFT, y, size: 14, font: fontBold, color: BRAND });
  y -= 18;
  page.drawText(estFacture ? `N° ${numeroAffiche}` : numeroAffiche, { x: LEFT, y, size: 10, font, color: GRIS });
  page.drawText(`Émise le ${fmtDateLongue(dateEmission)}`, { x: RIGHT - 170, y, size: 10, font, color: GRIS });
  y -= 30;

  // ── Client ────────────────────────────────────────────────────────────────
  ligneTexte(estFacture ? 'Facturée à :' : 'Émis pour :', { dy: 16 });
  ligneTexte(client.nom || 'Client·e', { size: 12, bold: true, color: NOIR });
  if (client.email) ligneTexte(client.email);
  if (client.adresse) ligneTexte(client.adresse);
  if (client.ville) ligneTexte(client.ville);

  // ── Tableau des lignes (paginé — ~20 lignes par page) ────────────────────
  y -= 16;
  enTeteTableau();
  for (const l of lignes) {
    if (y < 150) {
      page = pdf.addPage([595, 842]);
      y = 800;
      enTeteTableau();
    }
    const intitule = l.intitule || 'Prestation';
    page.drawText(intitule.length > 44 ? intitule.slice(0, 41) + '...' : intitule, { x: LEFT, y, size: 11, font, color: NOIR });
    page.drawText(fmtDateCourte(l.date_reglement), { x: COL_DATE, y, size: 11, font, color: NOIR });
    page.drawText(fmtMode(l.mode), { x: COL_MODE, y, size: 11, font, color: NOIR });
    page.drawText(fmtMontant(l.montant), { x: COL_MONTANT, y, size: 11, font, color: NOIR });
    y -= 20;
  }

  // ── Total + acquittement ─────────────────────────────────────────────────
  if (y < 170) {
    page = pdf.addPage([595, 842]);
    y = 800;
  }
  y -= 20;
  filet(350, RIGHT);
  y -= 20;
  page.drawText('TOTAL', { x: COL_MODE, y, size: 12, font: fontBold, color: NOIR });
  page.drawText(fmtMontant(total), { x: COL_MONTANT, y, size: 14, font: fontBold, color: BRAND });
  y -= 24;
  if (estFacture) {
    const acquit = lignes.length === 1
      ? `Facture acquittée : règlement reçu le ${fmtDateLongue(lignes[0].date_reglement)}${lignes[0].mode ? ` (${fmtMode(lignes[0].mode)})` : ''}.`
      : 'Facture acquittée : règlements reçus aux dates indiquées ci-dessus.';
    page.drawText(acquit, { x: LEFT, y, size: 10, font: fontBold, color: NOIR });
  }

  // ── Mentions légales (pied de la dernière page) ──────────────────────────
  y = 100;
  // Plus de repli codé en dur : hors de France, la mention vient de la prof ou
  // n'existe pas. Écrire « art. 293 B du CGI » sur une facture belge serait
  // faux, et faux sur un document qui engage.
  if (mentionTva) {
    page.drawText(mentionTva, { x: LEFT, y, size: 8, font, color: GRIS });
  }
  y -= 12;
  page.drawText(
    estFacture
      ? `Document généré via IziSolo, re-téléchargeable à l'identique depuis l'espace élève.`
      : `Reçu généré automatiquement le ${new Date().toLocaleDateString('fr-FR')} par IziSolo.`,
    { x: LEFT, y, size: 8, font, color: GRIS }
  );

  return pdf.save();
}

/** Réponse HTTP standard pour un PDF téléchargeable. */
export function reponsePdf(pdfBytes, filename) {
  return new Response(pdfBytes, {
    status: 200,
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'private, no-store',
    },
  });
}
