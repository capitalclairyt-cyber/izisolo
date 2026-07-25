/**
 * IziSolo — Radar d'erreurs (lecture seule)
 * ─────────────────────────────────────────────────────────────────────────────
 * Lit la table `erreurs_app` (journal maison v71, purgé à 30 j par le cron
 * expirations) et présente les erreurs GROUPÉES pour le rituel de début de
 * batch (PLAN-BATAILLE-MVP-2026.md §2 : « ouvrir le radar d'abord »).
 *
 * Usage :  node scripts/radar-erreurs.mjs [--jours=30] [--details]
 *   --jours=N    fenêtre en jours (défaut 30 = tout ce que garde la purge)
 *   --details    affiche chaque occurrence (sinon : groupes seulement)
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

const jours = Number((process.argv.find(a => a.startsWith('--jours=')) || '').split('=')[1] || 30);
const details = process.argv.includes('--details');
const depuis = new Date(Date.now() - jours * 24 * 3600 * 1000).toISOString();

const { data, error } = await sb
  .from('erreurs_app')
  .select('id, created_at, message, stack, contexte')
  .gte('created_at', depuis)
  .order('created_at', { ascending: false })
  .limit(1000);

if (error) {
  console.error('❌ Lecture erreurs_app impossible :', error.message);
  console.error('   (v71 appliquée ? .env.local présent ?)');
  process.exit(1);
}

if (!data.length) {
  console.log(`✅ Radar propre : 0 erreur dans erreurs_app sur ${jours} j.`);
  process.exit(0);
}

// Groupement : route/source du contexte + début du message (normalisé).
const norme = (m) => (m || '')
  .replace(/[0-9a-f]{8}-[0-9a-f-]{27,}/gi, '<uuid>')
  .replace(/\d{4}-\d{2}-\d{2}[T ]?[\d:.]*Z?/g, '<date>')
  .replace(/\d+/g, '<n>')
  .slice(0, 140);

const groupes = new Map();
for (const e of data) {
  const ou = e.contexte?.route || e.contexte?.source || e.contexte?.ou || '(sans route)';
  const cle = `${ou} ␟ ${norme(e.message)}`;
  if (!groupes.has(cle)) groupes.set(cle, { ou, message: e.message, n: 0, premiere: e.created_at, derniere: e.created_at, exemples: [] });
  const g = groupes.get(cle);
  g.n++;
  if (e.created_at < g.premiere) g.premiere = e.created_at;
  if (e.created_at > g.derniere) g.derniere = e.created_at;
  if (g.exemples.length < 3) g.exemples.push(e);
}

const tri = [...groupes.values()].sort((a, b) => b.n - a.n);
console.log(`🛰️  Radar erreurs_app — ${data.length} erreur(s) sur ${jours} j, ${tri.length} groupe(s)\n`);
for (const g of tri) {
  const d = (iso) => iso.slice(0, 16).replace('T', ' ');
  console.log(`■ ×${g.n}  [${g.ou}]  ${g.message.slice(0, 180)}`);
  console.log(`   première: ${d(g.premiere)} · dernière: ${d(g.derniere)}`);
  const ctx = g.exemples[0]?.contexte;
  if (ctx && Object.keys(ctx).length) console.log(`   contexte: ${JSON.stringify(ctx).slice(0, 220)}`);
  if (details) {
    for (const e of g.exemples) {
      console.log(`   — ${e.created_at}`);
      if (e.stack) console.log('     ' + e.stack.split('\n').slice(0, 3).join('\n     '));
    }
  }
  console.log('');
}
