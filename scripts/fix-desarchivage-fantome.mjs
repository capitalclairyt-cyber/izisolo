/**
 * IziSolo — Fix one-shot : désarchivage des fiches archivées à tort (2026-07-23)
 * ─────────────────────────────────────────────────────────────────────────────
 * Version exécutable de `fix-desarchivage-fantome.sql` (même logique, mêmes
 * critères). L'ancien cron d'archivage auto (supprimé le 23/07) archivait des
 * fiches actives. On désarchive celles qui montrent un signe de vie :
 *   - présence < 300 j, OU paiement < 300 j, OU abonnement actif,
 *   - OU fiche créée < 90 j.
 * Les fiches archivées SANS activité ET anciennes restent archivées
 * (archivages volontaires probables).
 *
 * Usage :
 *   node scripts/fix-desarchivage-fantome.mjs           → liste (lecture seule)
 *   node scripts/fix-desarchivage-fantome.mjs --apply   → désarchive (statut='actif')
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = process.cwd();
const env = Object.fromEntries(
  readFileSync(join(ROOT, '.env.local'), 'utf8')
    .split('\n').filter(l => l.includes('=') && !l.startsWith('#'))
    .map(l => [l.slice(0, l.indexOf('=')).trim(), l.slice(l.indexOf('=') + 1).trim()])
);
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
const APPLY = process.argv.includes('--apply');

const j300 = new Date(Date.now() - 300 * 24 * 3600 * 1000).toISOString();
const j300date = j300.slice(0, 10);
const j90 = new Date(Date.now() - 90 * 24 * 3600 * 1000).toISOString();

// 1. Toutes les fiches archivées (+ studio pour lisibilité)
const { data: archives, error: e1 } = await sb
  .from('clients')
  .select('id, prenom, nom, email, created_at, profile_id')
  .eq('statut', 'archive')
  .limit(1000);
if (e1) { console.error('❌ clients :', e1.message); process.exit(1); }
if (!archives.length) { console.log('✅ Aucune fiche archivée — rien à faire.'); process.exit(0); }

const { data: profils, error: e2 } = await sb
  .from('profiles').select('id, studio_nom').in('id', [...new Set(archives.map(c => c.profile_id))]);
if (e2) { console.error('❌ profiles :', e2.message); process.exit(1); }
const studioDe = Object.fromEntries((profils || []).map(p => [p.id, p.studio_nom]));

// 2. Signe de vie, fiche par fiche (volumes minuscules — pas d'optimisation)
const candidats = [];
for (const c of archives) {
  const raisons = [];
  if (c.created_at >= j90) raisons.push('fiche < 90 j');

  const { count: nPres, error: ep } = await sb.from('presences')
    .select('*', { count: 'exact', head: true })
    .eq('client_id', c.id).gte('created_at', j300);
  if (ep) { console.error(`❌ presences (${c.id}) :`, ep.message); process.exit(1); }
  if (nPres > 0) raisons.push(`présence < 300 j (${nPres})`);

  const { count: nPai, error: epa } = await sb.from('paiements')
    .select('*', { count: 'exact', head: true })
    .eq('client_id', c.id).gte('date', j300date);
  if (epa) { console.error(`❌ paiements (${c.id}) :`, epa.message); process.exit(1); }
  if (nPai > 0) raisons.push(`paiement < 300 j (${nPai})`);

  const { count: nAbo, error: ea } = await sb.from('abonnements')
    .select('*', { count: 'exact', head: true })
    .eq('client_id', c.id).eq('statut', 'actif');
  if (ea) { console.error(`❌ abonnements (${c.id}) :`, ea.message); process.exit(1); }
  if (nAbo > 0) raisons.push('abo actif');

  if (raisons.length) candidats.push({ ...c, raisons });
}

console.log(`Fiches archivées : ${archives.length} — à désarchiver : ${candidats.length}\n`);
for (const c of candidats) {
  console.log(`• ${c.prenom || ''} ${c.nom || ''} <${c.email || 'sans email'}> — ${studioDe[c.profile_id] || c.profile_id}`);
  console.log(`  créée ${String(c.created_at).slice(0, 10)} · ${c.raisons.join(' · ')}`);
}
const restent = archives.length - candidats.length;
if (restent) console.log(`\n(${restent} fiche(s) restent archivées — aucune activité et > 90 j = volontaire probable)`);

if (!candidats.length) process.exit(0);

if (!APPLY) {
  console.log('\nLecture seule. Pour désarchiver : node scripts/fix-desarchivage-fantome.mjs --apply');
  process.exit(0);
}

// 3. UPDATE ciblé par ids (jamais de critère large à l'écriture)
const { error: eu } = await sb.from('clients')
  .update({ statut: 'actif' })
  .in('id', candidats.map(c => c.id));
if (eu) { console.error('❌ UPDATE :', eu.message); process.exit(1); }

// Contrôle post-écriture
const { count: verif, error: ev } = await sb.from('clients')
  .select('*', { count: 'exact', head: true })
  .in('id', candidats.map(c => c.id)).eq('statut', 'actif');
if (ev) { console.error('❌ vérif :', ev.message); process.exit(1); }
console.log(`\n✅ ${verif}/${candidats.length} fiche(s) repassée(s) en 'actif' (vérifié).`);
