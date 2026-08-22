// ============================================
// Preuve de rendu du livre des recettes (v93, Node pur, aucune DB)
// ============================================
// Génère 3 registres depuis des paiements factices — vide, 4 recettes, 70
// recettes sur 3 mois (pagination) — vérifie l'en-tête %PDF, le nombre de
// pages, et que rien ne jette sur des caractères hors WinAnsi (émojis,
// intitulés à rallonge). Écrit les fichiers dans un dossier passé en argument.
//
//   node scripts/proof-livre-recettes-pdf.mjs [dossier-sortie]

import { PDFDocument } from 'pdf-lib';
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { construireLivreRecettes, livreEnCsv } from '../lib/livre-recettes.js';
import { genererLivreRecettesPdf } from '../lib/livre-recettes-pdf.js';
import { periodeTrimestre, periodeAnnee } from '../lib/urssaf.js';

const outDir = process.argv[2] || '.';
const emetteur = { nom: 'Manon Dupont EI', siret: '552 100 554 00013', ville: 'Voiron' };

const uuid = (n) => `${String(n).padStart(8, '0')}-1111-2222-3333-444444444444`;
const MODES = ['especes', 'cheque', 'virement', 'CB'];

const pay = (n, date, montant, intitule, client, mode) => ({
  id: uuid(n), date, date_encaissement: date, montant, intitule, mode: mode || MODES[n % 4], clients: client,
});

// Cas 2 : 4 recettes, dont un émoji, une structure et un intitulé à rallonge.
const quatre = [
  pay(1, '2026-07-03', 45, 'Abonnement mensuel juillet', { prenom: 'Léa', nom: 'Martin' }),
  pay(2, '2026-07-19', 20, 'Atelier Yin & Sonothérapie ✨', { prenom: 'Emma', nom: 'Durand' }),
  pay(3, '2026-08-02', 150, 'Carnet 10 séances valable un an, tous cours collectifs confondus', { nom_structure: 'CSE Machin & Fils' }),
  pay(4, '2026-09-30', 15, "Séance à l'unité", null),
];

// Cas 3 : 70 recettes réparties sur le trimestre → pagination + totaux/mois.
const soixanteDix = Array.from({ length: 70 }, (_, i) => {
  const mois = ['07', '08', '09'][i % 3];
  const jour = String((i % 28) + 1).padStart(2, '0');
  return pay(10 + i, `2026-${mois}-${jour}`, 10 + (i % 7) * 5, `Cours du ${jour}/${mois}`, { prenom: `Élève${i}`, nom: 'Test' });
});

const T3 = periodeTrimestre(2026, 3, '2026-10-01');

const cas = [
  { nom: 'vide',      paiements: [],           periode: T3,                        pagesMin: 1 },
  { nom: '4-lignes',  paiements: quatre,       periode: T3,                        pagesMin: 1 },
  { nom: '70-lignes', paiements: soixanteDix,  periode: periodeAnnee(2026, '2026-12-31'), pagesMin: 2 },
];

let ok = 0, ko = 0;
const verif = (cond, label) => { if (cond) { ok++; console.log(`  ✅ ${label}`); } else { ko++; console.log(`  ❌ ${label}`); } };

for (const c of cas) {
  console.log(`\n── Cas « ${c.nom} » ────────────────────────────`);
  const livre = construireLivreRecettes({ paiements: c.paiements, periode: c.periode, emetteur });

  const attendu = c.paiements.reduce((s, p) => s + p.montant, 0);
  verif(livre.total === Math.round(attendu * 100) / 100, `total = ${livre.total} (attendu ${attendu})`);
  verif(livre.nombre === c.paiements.length, `${livre.nombre} ligne(s)`);
  const dates = livre.lignes.map(l => l.date);
  verif(dates.every((d, i) => i === 0 || dates[i - 1] <= d), 'ordre chronologique respecté');
  verif(
    livre.parMois.reduce((s, m) => s + m.total, 0).toFixed(2) === livre.total.toFixed(2),
    'la somme des mois retombe sur le total'
  );

  const bytes = await genererLivreRecettesPdf(livre);
  const entete = Buffer.from(bytes.slice(0, 5)).toString('latin1');
  verif(entete === '%PDF-', `en-tête PDF (${entete})`);

  const relu = await PDFDocument.load(bytes);
  verif(relu.getPageCount() >= c.pagesMin, `${relu.getPageCount()} page(s), au moins ${c.pagesMin} attendue(s)`);

  const fichier = join(outDir, `livre-recettes-${c.nom}.pdf`);
  writeFileSync(fichier, bytes);
  const csv = livreEnCsv(livre);
  writeFileSync(join(outDir, `livre-recettes-${c.nom}.csv`), csv, 'utf8');
  verif(csv.includes('TOTAL'), 'la version CSV porte une ligne TOTAL');
  console.log(`  → ${fichier} (${(bytes.length / 1024).toFixed(1)} Ko)`);
}

console.log(`\n${ko === 0 ? '✅' : '❌'} ${ok}/${ok + ko} vérifications`);
process.exit(ko === 0 ? 0 : 1);
