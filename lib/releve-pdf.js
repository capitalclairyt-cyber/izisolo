// ============================================================================
// IziSolo — Le relevé de séances en PDF (v112). Même moteur que la facture
// (pdf-lib, Helvetica WinAnsi). Rendu depuis le relevé CALCULÉ ou FIGÉ dans
// une prestation : jamais une lecture de la base ici.
// ============================================================================

import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { winAnsiSafe } from './factures.js';
import { labelMois, euros, labelRemuneration } from './remuneration.js';

const NOIR = rgb(0, 0, 0);
const GRIS = rgb(0.4, 0.4, 0.4);
const GRIS_CLAIR = rgb(0.85, 0.85, 0.85);
const BRAND = rgb(0.72, 0.45, 0.2);
const LEFT = 50;
const RIGHT = 545;

const fmtJour = (d) => (d ? String(d).slice(0, 10).split('-').reverse().join('/') : '');

/**
 * @param {object} opts
 * @param {string} opts.structureNom
 * @param {string} opts.intervenanteNom
 * @param {string} opts.mois           'AAAA-MM'
 * @param {object} opts.releve         calculerReleve()
 * @param {string} [opts.statut]       'brouillon' | 'valide'
 */
export async function genererRelevePdf({ structureNom, intervenanteNom, mois, releve, statut = 'brouillon' }) {
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  let page = pdf.addPage([595, 842]);
  let y = 800;
  const txt = (s, o = {}) => { page.drawText(winAnsiSafe(s), { x: o.x ?? LEFT, y, size: o.size ?? 10, font: o.bold ? bold : font, color: o.color ?? GRIS }); y -= o.dy ?? 14; };
  const filet = () => { page.drawRectangle({ x: LEFT, y: y - 4, width: RIGHT - LEFT, height: 1, color: GRIS_CLAIR }); };
  const entete = () => {
    filet(); y -= 18;
    page.drawText('Date', { x: LEFT, y, size: 10, font: bold, color: NOIR });
    page.drawText('Séance', { x: 140, y, size: 10, font: bold, color: NOIR });
    page.drawText('Durée', { x: 360, y, size: 10, font: bold, color: NOIR });
    page.drawText('Présentes', { x: 420, y, size: 10, font: bold, color: NOIR });
    page.drawText('CA', { x: 495, y, size: 10, font: bold, color: NOIR });
    y -= 12; filet(); y -= 18;
  };

  txt(structureNom || 'Structure', { size: 20, bold: true, color: NOIR, dy: 26 });
  txt(`Relevé de séances · ${labelMois(mois)}`, { size: 13, bold: true, color: BRAND, dy: 18 });
  txt(`Intervenante : ${intervenanteNom || ''}`, { size: 11, color: NOIR, dy: 16 });
  txt(statut === 'valide' ? 'Relevé validé par la structure.' : 'Relevé provisoire (recalculé à la lecture).', { size: 9, dy: 22 });

  entete();
  for (const l of (releve?.lignes || [])) {
    if (y < 120) { page = pdf.addPage([595, 842]); y = 800; entete(); }
    const nom = winAnsiSafe(l.nom || 'Séance');
    page.drawText(`${fmtJour(l.date)}${l.heure ? ` ${l.heure}` : ''}`, { x: LEFT, y, size: 10, font, color: NOIR });
    page.drawText(nom.length > 40 ? nom.slice(0, 37) + '...' : nom, { x: 140, y, size: 10, font, color: NOIR });
    page.drawText(`${l.duree_minutes} min`, { x: 360, y, size: 10, font, color: NOIR });
    page.drawText(String(l.nb_presentes), { x: 420, y, size: 10, font, color: NOIR });
    page.drawText(euros(l.ca) + (l.ca_inconnu ? ' *' : ''), { x: 495, y, size: 10, font, color: NOIR });
    y -= 18;
  }
  if (!(releve?.lignes || []).length) txt('Aucune séance donnée sur ce mois.', { color: NOIR, dy: 18 });

  if (y < 170) { page = pdf.addPage([595, 842]); y = 800; }
  y -= 8; filet(); y -= 20;
  txt(`${releve?.nb_seances || 0} séance(s) · ${String(releve?.heures || 0).replace('.', ',')} h · ${releve?.nb_presentes || 0} présente(s) · CA rattaché ${euros(releve?.ca || 0)}${releve?.ca_inconnu ? ' *' : ''}`, { size: 11, bold: true, color: NOIR, dy: 18 });
  if (releve?.remuneration) txt(`Rémunération convenue : ${labelRemuneration(releve.remuneration)}`, { size: 10, color: NOIR, dy: 16 });
  if (releve?.montant_du != null) {
    page.drawText('MONTANT DÛ', { x: 360, y, size: 12, font: bold, color: NOIR });
    page.drawText(euros(releve.montant_du), { x: 470, y, size: 14, font: bold, color: BRAND });
    y -= 22;
  }
  if (releve?.ca_inconnu) txt(`* ${releve.ca_inconnu} présence(s) décomptée(s) d'un abonnement sans prix par séance : le CA affiché est un plancher.`, { size: 8, dy: 12 });
  y = 90;
  txt('Relevé généré par IziSolo depuis les séances pointées. Il ne vaut pas facture.', { size: 8 });
  return pdf.save();
}
