/**
 * Secours MFA admin — « téléphone perdu ».
 * Supprime TOUS les facteurs MFA (TOTP) d'un compte via service_role :
 * la prochaine connexion redevient mot de passe seul, la double
 * authentification peut être réactivée depuis /admin/securite.
 *
 * Usage : node scripts/admin-mfa-reset.mjs email@exemple.fr
 */
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const email = (process.argv[2] || '').trim().toLowerCase();
if (!email) {
  console.error('Usage : node scripts/admin-mfa-reset.mjs email@exemple.fr');
  process.exit(1);
}

const env = Object.fromEntries(
  readFileSync(join(process.cwd(), '.env.local'), 'utf8')
    .split('\n').filter(l => l.includes('=') && !l.startsWith('#'))
    .map(l => [l.slice(0, l.indexOf('=')).trim(), l.slice(l.indexOf('=') + 1).trim()])
);
const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

// Retrouve l'utilisateur par email (pagination : la base reste petite,
// mais on ne s'arrête pas à la première page par principe).
let user = null;
for (let page = 1; page <= 20 && !user; page++) {
  const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
  if (error) { console.error('listUsers :', error.message); process.exit(1); }
  user = data.users.find(u => (u.email || '').toLowerCase() === email) || null;
  if (data.users.length < 1000) break;
}
if (!user) { console.error(`Aucun compte auth pour ${email}`); process.exit(1); }

const { data: facteurs, error: eList } = await admin.auth.admin.mfa.listFactors({ userId: user.id });
if (eList) { console.error('listFactors :', eList.message); process.exit(1); }
const tous = facteurs?.factors || [];
if (!tous.length) { console.log(`Aucun facteur MFA sur ${email} — rien à faire.`); process.exit(0); }

for (const f of tous) {
  const { error } = await admin.auth.admin.mfa.deleteFactor({ id: f.id, userId: user.id });
  if (error) { console.error(`deleteFactor ${f.id} :`, error.message); process.exit(1); }
  console.log(`Facteur supprimé : ${f.factor_type} « ${f.friendly_name || f.id} » (statut ${f.status})`);
}
console.log(`\n✅ MFA réinitialisée pour ${email}. Connexion au mot de passe seul, réactivation possible dans /admin/securite.`);
