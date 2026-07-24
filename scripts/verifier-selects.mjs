/**
 * IziSolo — Vérificateur de SELECTs contre le schéma PROD (lecture seule)
 * ─────────────────────────────────────────────────────────────────────────────
 * La classe de bug la plus meurtrière du projet : un `.select('...')` qui
 * référence une colonne inexistante → 42703 → data null non vérifié →
 * « introuvable » / feature morte EN SILENCE. A tué : l'annulation élève
 * (depuis v21 !), l'annulation prof, le reçu PDF, 2 stats admin, le cron
 * d'archivage (variante), et 2 enquêtes de debug.
 *
 * Ce script EXTRAIT statiquement chaque paire `.from('table')…select('cols')`
 * de app/ et lib/, déduplique, puis REJOUE chaque select contre la base
 * (limit 1, jamais d'écriture) et rapporte chaque erreur avec file:line.
 * Il croise aussi les `rpc('nom')` du code avec les CREATE FUNCTION des
 * migrations (vérification statique, les RPC ne sont PAS exécutées).
 *
 * Usage :  node scripts/verifier-selects.mjs
 * Sortie : liste des ❌ (échec = code de sortie 1) — zéro ❌ attendu.
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const ROOT = process.cwd();
const env = Object.fromEntries(
  readFileSync(join(ROOT, '.env.local'), 'utf8')
    .split('\n').filter(l => l.includes('=') && !l.startsWith('#'))
    .map(l => [l.slice(0, l.indexOf('=')).trim(), l.slice(l.indexOf('=') + 1).trim()])
);
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

// ── 1. Collecte des fichiers ────────────────────────────────────────────────
function* walk(dir) {
  for (const name of readdirSync(dir)) {
    if (name === 'node_modules' || name.startsWith('.')) continue;
    const p = join(dir, name);
    if (statSync(p).isDirectory()) yield* walk(p);
    else if (p.endsWith('.js') || p.endsWith('.mjs')) yield p;
  }
}
const files = [...walk(join(ROOT, 'app')), ...walk(join(ROOT, 'lib'))];

// ── 2. Extraction .from('t')...select('cols' | `cols`) ─────────────────────
// On capture la CHAÎNE depuis .from jusqu'au select suivant (même requête).
const paires = new Map(); // clé "table␟select" → { table, select, sites: [file:line] }
const fromSansSelect = [];
const rpcAppels = new Map(); // nom → [file:line]

for (const file of files) {
  const src = readFileSync(file, 'utf8');
  const rel = relative(ROOT, file).replaceAll('\\', '/');
  const ligneDe = (idx) => src.slice(0, idx).split('\n').length;

  // rpc('nom')
  for (const m of src.matchAll(/\.rpc\(\s*['"`]([a-zA-Z0-9_]+)['"`]/g)) {
    const nom = m[1];
    if (!rpcAppels.has(nom)) rpcAppels.set(nom, []);
    rpcAppels.get(nom).push(`${rel}:${ligneDe(m.index)}`);
  }

  // .from('table') … .select('...' ou `...`)
  for (const m of src.matchAll(/\.from\(\s*'([a-zA-Z0-9_]+)'\s*\)/g)) {
    const table = m[1];
    const apres = src.slice(m.index, m.index + 1200); // fenêtre de chaîne
    const sel = apres.match(/\.select\(\s*(?:'((?:[^'\\]|\\.)*)'|`([^`]*)`)/);
    if (!sel) { fromSansSelect.push(`${rel}:${ligneDe(m.index)} (${table})`); continue; }
    // Le select trouvé doit appartenir à CETTE chaîne : pas d'autre .from entre les deux.
    const entre = apres.slice(0, sel.index);
    if (/\.from\(/.test(entre.slice(5))) continue;
    const select = (sel[1] ?? sel[2]).replace(/\s+/g, ' ').trim();
    if (!select || select === '*') continue;
    const cle = `${table}␟${select}`;
    if (!paires.has(cle)) paires.set(cle, { table, select, sites: [] });
    paires.get(cle).sites.push(`${rel}:${ligneDe(m.index)}`);
  }
}

// ── 3. Rejeu de chaque select (lecture seule, limit 1) ──────────────────────
console.log(`\n🔎 ${paires.size} selects distincts extraits de ${files.length} fichiers — rejeu contre la prod…\n`);
let echecs = 0;
for (const { table, select, sites } of paires.values()) {
  const { error } = await sb.from(table).select(select).limit(1);
  if (error) {
    echecs++;
    console.log(`❌ ${table} · ${error.message}`);
    console.log(`   select: ${select.length > 110 ? select.slice(0, 107) + '…' : select}`);
    for (const s of sites) console.log(`   → ${s}`);
  }
}
if (echecs === 0) console.log('✓ Tous les selects passent contre le schéma prod.');

// ── 4. RPC du code vs migrations ────────────────────────────────────────────
const RPC_ATTENDUES_HORS_MIGRATIONS = new Set(['reset_demo_data']); // v62 démo (bible : à retirer)
let migSrc = '';
for (const name of readdirSync(ROOT)) {
  if (/^migrations.*\.sql$/.test(name)) migSrc += readFileSync(join(ROOT, name), 'utf8').toLowerCase();
}
let rpcManquantes = 0;
for (const [nom, sites] of rpcAppels) {
  const defined = migSrc.includes(`function public.${nom.toLowerCase()}`) || migSrc.includes(`function ${nom.toLowerCase()}`);
  if (!defined && !RPC_ATTENDUES_HORS_MIGRATIONS.has(nom)) {
    rpcManquantes++;
    console.log(`\n⚠️ RPC « ${nom} » appelée mais AUCUN CREATE FUNCTION dans les migrations :`);
    for (const s of sites) console.log(`   → ${s}`);
  }
}
if (rpcManquantes === 0) console.log(`✓ Les ${rpcAppels.size} RPC appelées ont toutes une définition en migration.`);
if (fromSansSelect.length > 0) {
  console.log(`\nℹ️ ${fromSansSelect.length} .from() sans select statique (delete/update/insert ou select dynamique) — non vérifiables ici.`);
}

console.log(`\n${echecs > 0 ? `❌ ${echecs} select(s) cassé(s)` : '✅ Schéma cohérent'}\n`);
process.exit(echecs > 0 ? 1 : 0);
