/**
 * REFRESH du compte démo « L'Atelier Soleil » — wrapper CLI.
 * ─────────────────────────────────────────────────────────────────────────────
 * Le moteur vit dans lib/demo-atelier-soleil.js (partagé avec le bouton de
 * l'admin, POST /api/admin/demo/refresh — demande Colin 2026-08-18).
 *
 * Usage : node scripts/refresh-demo-atelier-soleil.mjs
 * Test du décalage : DEMO_TODAY=2026-10-06 node scripts/refresh-demo-atelier-soleil.mjs
 */
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { refreshDemoAtelierSoleil } from '../lib/demo-atelier-soleil.js';

const env = Object.fromEntries(
  readFileSync(join(process.cwd(), '.env.local'), 'utf8')
    .split('\n').filter(l => l.includes('=') && !l.startsWith('#'))
    .map(l => [l.slice(0, l.indexOf('=')).trim(), l.slice(l.indexOf('=') + 1).trim()])
);
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

try {
  await refreshDemoAtelierSoleil(sb, { demoToday: process.env.DEMO_TODAY || null });
  process.exit(0); // les avertissements non bloquants sont déjà affichés par le moteur
} catch (e) {
  console.error('❌', e.message);
  process.exit(1);
}
