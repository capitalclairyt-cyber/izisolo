/**
 * Preuve — l'identité de l'éditeur et du vendeur est bien « Maude Yoga »
 * (décision Colin 2026-08-22 : la caisse IziSolo sera encaissée par l'EI de
 * Maude, SIREN 520 888 967, Montgontier 38260 Gillonnay, en franchise de TVA).
 *
 * Avant ce lot, les pages publiques désignaient « Atelier Mélusine, SASU,
 * SIREN 889 060 901 » comme éditeur ET comme vendeur, avec un numéro de TVA
 * intracommunautaire. Encaisser au nom d'une entité pendant que le contrat en
 * nomme une autre est le genre d'écart qu'on découvre des mois plus tard, sur
 * une facture.
 *
 * Ce script lit les pages RENDUES (pas le source) et vérifie, sur chacune :
 *   - la nouvelle identité complète est présente ;
 *   - l'ancienne a totalement disparu, y compris en prose ;
 *   - aucun numéro de TVA intracommunautaire ne subsiste (franchise 293 B) ;
 *   - les CGV ne décrivent plus des offres abandonnées (Solo, Pro, Studio) ;
 *   - la page rend vraiment (pas d'erreur, contenu non vide).
 *
 * Usage : node scripts/proof-identite-maude-yoga.mjs
 * Prérequis : dev server sur :3333 (npm run dev).
 */
const BASE = 'http://localhost:3333';

let ok = 0, ko = 0;
const assert = (cond, label) => {
  if (cond) { ok++; console.log(`  OK  ${label}`); }
  else { ko++; console.log(`  KO  ${label}`); }
};
const attendre = ms => new Promise(r => setTimeout(r, ms));

for (let i = 0; i < 60; i++) {
  try { const r = await fetch(`${BASE}/login`); if (r.ok) break; } catch { /* pas prêt */ }
  await attendre(2000);
  if (i === 59) { console.error('dev server injoignable sur :3333'); process.exit(1); }
}
console.log('dev server pret');

// Ce qui ne doit PLUS jamais apparaître nulle part.
const INTERDITS = [
  ['Atelier Mélusine', /Atelier\s+Mélusine/i],
  ['ancien SIREN', /889\s?060\s?901/],
  ['ancienne adresse', /Elsa\s+Triolet|La\s+Côte-Saint-André/i],
  ['TVA intracommunautaire', /TVA\s+intracommunautaire/i],
  ['SASU au capital', /SASU\s+au\s+capital/i],
];

const PAGES = [
  {
    url: '/legal/mentions',
    attendus: [
      ['la dénomination', /Maude\s+Yoga/],
      ['la forme', /entreprise\s+individuelle/i],
      ['le SIREN', /520\s?888\s?967/],
      ["l'adresse", /Montgontier[\s\S]{0,40}38260\s+Gillonnay/i],
      ['la franchise de TVA', /293\s*B/],
      ['la directrice de publication', /Maude\s+Pontet/],
    ],
  },
  {
    url: '/legal/cgv',
    attendus: [
      ['le vendeur', /Maude\s+Yoga/],
      ['le SIREN', /520\s?888\s?967/],
      ['la franchise de TVA', /293\s*B/],
      ['les offres actuelles', /Essentiel[\s\S]{0,40}Complet/],
    ],
    absents: [['les offres abandonnées', /\(Solo,\s*Pro,\s*Studio/]],
  },
  {
    url: '/legal/rgpd',
    attendus: [
      ['le responsable de traitement', /Maude\s+Yoga/],
      ['le SIREN', /520\s?888\s?967/],
      ['le contact postal', /Montgontier/],
    ],
  },
  {
    url: '/legal/cgu',
    attendus: [
      ["l'éditeur", /Maude\s+Yoga/],
      ['la forme', /entreprise\s+individuelle/i],
    ],
  },
  {
    url: '/unsubscribe',
    attendus: [
      ["l'identification de l'expéditeur", /Maude\s+Yoga/],
      ['le SIREN', /520\s?888\s?967/],
    ],
  },
];

const nettoyer = html => html
  .replace(/<script[\s\S]*?<\/script>/gi, '')  // le payload RSC de dev contient le source
  .replace(/<[^>]+>/g, ' ')
  .replace(/&nbsp;|&#160;/g, ' ')
  .replace(/&amp;/g, '&')
  .replace(/&eacute;/g, 'é')
  .replace(/\s+/g, ' ');

for (const p of PAGES) {
  console.log(`\n${p.url}`);
  const res = await fetch(`${BASE}${p.url}`);
  assert(res.ok, `la page répond (HTTP ${res.status})`);
  const texte = nettoyer(await res.text());
  assert(texte.length > 500, `la page a du contenu (${texte.length} caractères)`);

  for (const [nom, re] of p.attendus) assert(re.test(texte), `${nom} est présent`);
  for (const [nom, re] of (p.absents || [])) assert(!re.test(texte), `${nom} a disparu`);
  for (const [nom, re] of INTERDITS) assert(!re.test(texte), `plus de trace de : ${nom}`);
}

// Le pied de page commun aux pages légales.
console.log('\npied de page légal');
const footer = nettoyer(await (await fetch(`${BASE}/legal/mentions`)).text());
assert(/©\s*\d{4}\s*Maude\s+Yoga/.test(footer), 'le copyright porte Maude Yoga');

console.log(`\n${ok}/${ok + ko} verifications passees`);
process.exit(ko === 0 ? 0 : 1);
