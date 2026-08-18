/**
 * Lien de connexion UNE-FOIS pour le compte démo Atelier Soleil (Camille).
 * ─────────────────────────────────────────────────────────────────────────
 * Pour ouvrir le démo sur un appareil de tournage/démo sans mot de passe :
 * imprime un magic link admin à ouvrir sur l'appareil (même mécanique que
 * shoot-demo-atelier-soleil.mjs, aucun mot de passe touché).
 *
 * Usage : node scripts/demo-login-link.mjs
 * ⚠️ Le lien est à usage unique et expire vite — le générer au moment de s'en servir.
 */
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const env = Object.fromEntries(
  readFileSync(join(process.cwd(), '.env.local'), 'utf8')
    .split('\n').filter(l => l.includes('=') && !l.startsWith('#'))
    .map(l => [l.slice(0, l.indexOf('=')).trim(), l.slice(l.indexOf('=') + 1).trim()])
);
const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

const EMAIL = 'camille@atelier-soleil.fr';
const { data, error } = await admin.auth.admin.generateLink({
  type: 'magiclink', email: EMAIL,
  options: { redirectTo: 'https://www.izisolo.fr/dashboard' },
});
if (error) { console.error('❌', error.message); process.exit(1); }
console.log('🔑 Lien de connexion une-fois (Camille / Atelier Soleil) :\n');
console.log(data.properties.action_link);
console.log('\nÀ ouvrir sur l\'appareil de démo/tournage. Usage unique.');
