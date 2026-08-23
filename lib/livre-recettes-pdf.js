// ============================================================================
// IziSolo — Rendu PDF du livre des recettes (v93)
// ----------------------------------------------------------------------------
// Registre A4 paginé, en-tête de colonnes répété sur chaque page, pagination
// « Page N/M » (un registre se lit page à page, et une page isolée doit dire
// d'où elle vient). Totaux par mois puis total général en fin de document.
//
// ⚠️ StandardFonts = WinAnsi only, comme lib/facture-pdf.js : tout texte passe
// par winAnsiSafe avant d'être dessiné, sinon pdf-lib jette sur un emoji ou un
// caractère exotique venu d'un intitulé saisi à la main.
// ============================================================================

import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { winAnsiSafe } from './factures.js';
import { formaterSiret } from './validation.js';
import { montantFr } from './urssaf.js';

const NOIR = rgb(0, 0, 0);
const GRIS = rgb(0.4, 0.4, 0.4);
const GRIS_CLAIR = rgb(0.85, 0.85, 0.85);
const BRAND = rgb(0.72, 0.45, 0.20); // cuivre IziSolo

const LEFT = 40;
const RIGHT = 555;
const COL = { date: 40, ref: 108, origine: 188, nature: 310, mode: 432, montant: 496 };
const BAS_DE_PAGE = 90;

function fmtJour(d) {
  if (!d) return '';
  const [a, m, j] = String(d).slice(0, 10).split('-');
  return a ? `${j}/${m}/${a}` : '';
}

export async function genererLivreRecettesPdf(livre) {
  const { emetteur = {}, periode, lignes = [], parMois = [], total = 0, nombre = 0, mentionExclusions = '' } = livre || {};

  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdf.embedFont(StandardFonts.HelveticaBold);

  let page;
  let y = 0;

  // Tronque au plus près de la largeur réelle de la colonne (mesure de la
  // police, pas un compte de caractères : « WWW » et « iii » ne font pas la
  // même largeur et la colonne Nature déborderait sur Mode).
  const tronquer = (txt, largeur, size) => {
    let s = winAnsiSafe(txt);
    if (font.widthOfTextAtSize(s, size) <= largeur) return s;
    while (s.length > 1 && font.widthOfTextAtSize(s + '...', size) > largeur) s = s.slice(0, -1);
    return s + '...';
  };

  const texte = (txt, x, opts = {}) => {
    page.drawText(winAnsiSafe(txt), {
      x, y: opts.y ?? y, size: opts.size ?? 9,
      font: opts.bold ? fontBold : font,
      color: opts.color ?? NOIR,
    });
  };

  const filet = (yy) => page.drawRectangle({ x: LEFT, y: yy, width: RIGHT - LEFT, height: 0.8, color: GRIS_CLAIR });

  const enTeteColonnes = () => {
    filet(y + 12);
    texte('Date', COL.date, { bold: true, size: 9, color: GRIS });
    texte('Référence', COL.ref, { bold: true, size: 9, color: GRIS });
    texte('Origine', COL.origine, { bold: true, size: 9, color: GRIS });
    texte('Nature', COL.nature, { bold: true, size: 9, color: GRIS });
    texte('Mode', COL.mode, { bold: true, size: 9, color: GRIS });
    texte('Montant', COL.montant, { bold: true, size: 9, color: GRIS });
    y -= 6;
    filet(y);
    y -= 16;
  };

  const nouvellePage = ({ premiere = false } = {}) => {
    page = pdf.addPage([595, 842]);
    y = 800;
    if (premiere) {
      texte(emetteur.nom || 'Studio', LEFT, { size: 18, bold: true });
      y -= 20;
      if (emetteur.siret) { texte(`SIRET : ${formaterSiret(emetteur.siret)}`, LEFT, { size: 9, color: GRIS }); y -= 13; }
      if (emetteur.ville) { texte(emetteur.ville, LEFT, { size: 9, color: GRIS }); y -= 13; }
      y -= 10;
      texte('LIVRE DES RECETTES', LEFT, { size: 14, bold: true, color: BRAND });
      y -= 18;
      texte(periode?.label || '', LEFT, { size: 10, color: GRIS });
      texte(`du ${fmtJour(periode?.from)} au ${fmtJour(periode?.to)}`, RIGHT - 150, { size: 10, color: GRIS });
      y -= 30;
    } else {
      texte(`${emetteur.nom || 'Studio'} — Livre des recettes ${periode?.label || ''}`, LEFT, { size: 9, color: GRIS });
      y -= 24;
    }
    enTeteColonnes();
  };

  nouvellePage({ premiere: true });

  if (lignes.length === 0) {
    texte('Aucune recette encaissée sur cette période.', LEFT, { size: 10, color: GRIS });
    y -= 20;
  }

  for (const l of lignes) {
    if (y < BAS_DE_PAGE) nouvellePage();
    texte(fmtJour(l.date), COL.date);
    texte(tronquer(l.reference, COL.origine - COL.ref - 8, 9), COL.ref);
    texte(tronquer(l.origine, COL.nature - COL.origine - 8, 9), COL.origine);
    texte(tronquer(l.intitule, COL.mode - COL.nature - 8, 9), COL.nature);
    texte(tronquer(l.mode, COL.montant - COL.mode - 8, 9), COL.mode);
    const m = `${montantFr(l.montant)} EUR`;
    texte(m, RIGHT - font.widthOfTextAtSize(m, 9));
    y -= 15;
  }

  // ── Total général ─────────────────────────────────────────────────────────
  if (y < BAS_DE_PAGE + 40) nouvellePage();
  y -= 6;
  filet(y + 12);
  y -= 8;
  texte(`TOTAL — ${nombre} recette${nombre > 1 ? 's' : ''}`, COL.date, { bold: true, size: 11 });
  const totalTxt = `${montantFr(total)} EUR`;
  texte(totalTxt, RIGHT - fontBold.widthOfTextAtSize(totalTxt, 12), { bold: true, size: 12, color: BRAND });
  y -= 30;

  // ── Totaux par mois ───────────────────────────────────────────────────────
  if (parMois.length > 1) {
    if (y < BAS_DE_PAGE + 30 + parMois.length * 14) nouvellePage();
    texte('TOTAUX PAR MOIS', COL.date, { bold: true, size: 10, color: GRIS });
    y -= 18;
    for (const m of parMois) {
      if (y < BAS_DE_PAGE) nouvellePage();
      texte(m.label, COL.date, { size: 9 });
      texte(`${m.nombre} recette${m.nombre > 1 ? 's' : ''}`, COL.origine, { size: 9, color: GRIS });
      const t = `${montantFr(m.total)} EUR`;
      texte(t, RIGHT - font.widthOfTextAtSize(t, 9), { size: 9 });
      y -= 14;
    }
  }

  // ── Pied de page + pagination (après coup : M n'est connu qu'à la fin) ────
  // Ce que le registre ne contient PAS (v95) : ecrit sur le document, jamais
  // laisse a deviner. Un registre muet sur ses exclusions serait un faux.
  if (mentionExclusions) {
    if (y < BAS_DE_PAGE + 30) nouvellePage();
    y -= 10;
    texte(mentionExclusions, COL.date, { size: 8, color: GRIS });
    y -= 14;
  }

  const pages = pdf.getPages();
  pages.forEach((p, i) => {
    p.drawText(winAnsiSafe(
      "Registre des recettes encaissées, tenu par ordre chronologique de date d'encaissement. Genere par IziSolo."
    ), { x: LEFT, y: 42, size: 7.5, font, color: GRIS });
    const num = `Page ${i + 1}/${pages.length}`;
    p.drawText(num, { x: RIGHT - font.widthOfTextAtSize(num, 8), y: 42, size: 8, font, color: GRIS });
  });

  return pdf.save();
}
