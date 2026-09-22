/**
 * scripts/i18n-cles-manquantes.mjs — quelles clés t('…') du portail n'ont pas
 * encore leur anglais ? (2026-09-22)
 *
 *   node scripts/i18n-cles-manquantes.mjs                → tout le portail
 *   node scripts/i18n-cles-manquantes.mjs app/p/[studioSlug]/PortailHome.js …
 *
 * Sortie : une ligne par clé absente de lib/i18n/en-*.js (fichier:ligne), les
 * appels t(`…`) en template literal (refusés), et les clés du dictionnaire que
 * plus personne n'utilise. Code de sortie 1 s'il manque quelque chose.
 */
import { join } from 'node:path';
import { auditerFichiers, listerFichiers } from '../lib/i18n-audit.js';
import { DICTIONNAIRES } from '../lib/i18n-portail.js';

const racine = process.cwd();
const args = process.argv.slice(2);
const fichiers = args.length ? args.map(f => join(racine, f)) : listerFichiers(racine);
const { cles, templates } = auditerFichiers(fichiers);
const en = DICTIONNAIRES.en;

const manquantes = cles.filter(c => typeof en[c.cle] !== 'string');
const vues = new Set(cles.map(c => c.cle));

if (templates.length) {
  console.log(`\n✗ ${templates.length} appel(s) t(\`…\`) en template literal (clé illisible) :`);
  for (const x of templates) console.log(`  ${x.fichier.replace(racine, '').replace(/\\/g, '/')}:${x.ligne}`);
}
if (manquantes.length) {
  console.log(`\n✗ ${manquantes.length} clé(s) sans anglais :`);
  const parCle = new Map();
  for (const m of manquantes) {
    const l = parCle.get(m.cle) || [];
    l.push(`${m.fichier.replace(racine, '').replace(/\\/g, '/')}:${m.ligne}`);
    parCle.set(m.cle, l);
  }
  for (const [cle, ou] of parCle) console.log(`  ${JSON.stringify(cle)}   ← ${ou.join(', ')}`);
} else {
  console.log(`\n✓ ${cles.length} appel(s) t(), ${vues.size} clé(s) distinctes, toutes traduites.`);
}
if (!args.length) {
  const inutiles = Object.keys(en).filter(k => !vues.has(k));
  if (inutiles.length) {
    console.log(`\n· ${inutiles.length} clé(s) du dictionnaire que personne n'appelle (à retirer ou à brancher) :`);
    for (const k of inutiles) console.log(`  ${JSON.stringify(k)}`);
  }
}
process.exit(manquantes.length || templates.length ? 1 : 0);
