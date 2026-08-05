// ============================================
// Preuve de rendu PDF factures v84 (Node pur, aucune DB)
// ============================================
// Génère une facture 3 lignes, une facture 26 lignes (pagination) et le reçu
// legacy depuis des snapshots factices, vérifie l'en-tête %PDF + le nombre de
// pages, et écrit les fichiers dans un dossier passé en argument (défaut: cwd).
//
//   node scripts/proof-facture-pdf.mjs [dossier-sortie]

import { PDFDocument } from 'pdf-lib';
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { construireSnapshot } from '../lib/factures.js';
import { genererFacturePdf } from '../lib/facture-pdf.js';

const outDir = process.argv[2] || '.';

const profile = { studio_nom: 'Studio Lune 🌙', adresse: '2 rue des Lilas', code_postal: '38260', ville: 'Gillonnay', telephone: '06 12 34 56 78', email_contact: 'bonjour@studiolune.fr' };
const facturation = { facturation_siret: '552 100 554 00013', facturation_raison_sociale: 'Manon Dupont EI', facturation_mention_tva: '' };
const client = { prenom: 'Léa', nom: 'Martin', email: 'lea@exemple.fr', adresse_postale: '4 chemin Vert', ville: 'Voiron' };

const pay = (id, jour, montant, intitule, mode = 'virement') => ({
  id, intitule, montant, mode, date: `2026-08-${jour}`, date_encaissement: `2026-08-${jour}`, statut: 'paid',
});

const paiements3 = [
  pay('a', '03', '45', 'Abonnement mensuel — août'),
  pay('b', '10', '20', 'Atelier Yin & Sonothérapie ✨', 'especes'),
  pay('c', '17', '15', "Séance à l'unité", 'CB'),
];
const paiements26 = Array.from({ length: 26 }, (_, i) =>
  pay(`p${i}`, String(1 + (i % 28)).padStart(2, '0'), '12.5', `Séance n°${i + 1}`));

for (const [nom, type, numero, paiements] of [
  ['proof-facture-3lignes', 'facture', 'FAC-2026-0042', paiements3],
  ['proof-facture-26lignes', 'facture', 'FAC-2026-0043', paiements26],
  ['proof-recu-legacy', 'recu', 'N° AB12CD34', [paiements3[0]]],
]) {
  const snapshot = construireSnapshot({ profile, facturation: type === 'facture' ? facturation : null, client, paiements });
  const bytes = await genererFacturePdf({ type, numeroAffiche: numero, dateEmission: '2026-08-05', snapshot });
  const header = Buffer.from(bytes.slice(0, 5)).toString();
  if (header !== '%PDF-') throw new Error(`${nom}: pas un PDF (${header})`);
  const doc = await PDFDocument.load(bytes);
  const out = join(outDir, `${nom}.pdf`);
  writeFileSync(out, bytes);
  console.log(`${nom}: ${bytes.length} octets · ${doc.getPageCount()} page(s) · total ${snapshot.total} € → ${out}`);
}
console.log('✅ rendu OK (3 documents)');
