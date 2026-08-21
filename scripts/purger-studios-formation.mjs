/**
 * Purge des studios d'ENTRAÎNEMENT (exercices de formation Maude).
 *
 * Cible EXCLUSIVEMENT les comptes auth dont l'email est en
 * `formation-*@example.com` (le pattern imposé par le guide d'exercices).
 * Supprime leurs données métier (présences, cours, récurrences, clients,
 * offres, paiements, conversations…) puis le profil et le compte auth.
 *
 * Usage :
 *   node scripts/purger-studios-formation.mjs           → LISTE seulement
 *   node scripts/purger-studios-formation.mjs --force   → supprime
 */
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const FORCE = process.argv.includes('--force');

const env = Object.fromEntries(
  readFileSync(join(process.cwd(), '.env.local'), 'utf8')
    .split('\n').filter(l => l.includes('=') && !l.startsWith('#'))
    .map(l => [l.slice(0, l.indexOf('=')).trim(), l.slice(l.indexOf('=') + 1).trim()])
);
const svc = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

const { data: page, error } = await svc.auth.admin.listUsers({ page: 1, perPage: 1000 });
if (error) { console.error('listUsers :', error.message); process.exit(1); }
const cibles = page.users.filter(u => /^formation-.*@example\.com$/i.test(u.email || ''));

if (cibles.length === 0) {
  console.log('Aucun studio de formation (formation-*@example.com) trouvé. Rien à faire.');
  process.exit(0);
}

console.log(`${cibles.length} compte(s) de formation :`);
for (const u of cibles) console.log('  -', u.email, '(', u.id.slice(0, 8), '… )');

if (!FORCE) {
  console.log('\nListe seulement. Pour supprimer : node scripts/purger-studios-formation.mjs --force');
  process.exit(0);
}

for (const u of cibles) {
  const pid = u.id;
  console.log(`\nPurge de ${u.email}…`);
  // Ordre : dépendances d'abord. Chaque erreur est LUE (jamais de purge muette).
  const etape = async (nomEtape, promesse) => {
    const { error: e } = await promesse;
    if (e) console.log(`  ⚠️ ${nomEtape} : ${e.message}`);
  };

  const { data: sesCours } = await svc.from('cours').select('id').eq('profile_id', pid);
  const coursIds = (sesCours || []).map(c => c.id);
  if (coursIds.length) {
    await etape('présences', svc.from('presences').delete().in('cours_id', coursIds));
    await etape('liste_attente', svc.from('liste_attente').delete().in('cours_id', coursIds));
  }
  await etape('presences (profil)', svc.from('presences').delete().eq('profile_id', pid));
  await etape('paiements', svc.from('paiements').delete().eq('profile_id', pid));
  await etape('factures_paiements', (async () => {
    const { data: f } = await svc.from('factures').select('id').eq('profile_id', pid);
    const ids = (f || []).map(x => x.id);
    if (!ids.length) return { error: null };
    return svc.from('factures_paiements').delete().in('facture_id', ids);
  })());
  await etape('factures', svc.from('factures').delete().eq('profile_id', pid));
  await etape('abonnements', svc.from('abonnements').delete().eq('profile_id', pid));
  await etape('cas_a_traiter', svc.from('cas_a_traiter').delete().eq('profile_id', pid));
  await etape('messages/conversations', (async () => {
    const { data: convs } = await svc.from('conversations').select('id').eq('profile_id', pid);
    const ids = (convs || []).map(c => c.id);
    if (ids.length) {
      await svc.from('messages').delete().in('conversation_id', ids);
      await svc.from('conversation_members').delete().in('conversation_id', ids);
    }
    return svc.from('conversations').delete().eq('profile_id', pid);
  })());
  await etape('sondages', svc.from('sondages').delete().eq('profile_id', pid));
  await etape('cours', svc.from('cours').delete().eq('profile_id', pid));
  await etape('recurrences', svc.from('recurrences').delete().eq('profile_id', pid));
  await etape('clients', svc.from('clients').delete().eq('profile_id', pid));
  await etape('offres', svc.from('offres').delete().eq('profile_id', pid));
  await etape('lieux', svc.from('lieux').delete().eq('profile_id', pid));
  await etape('notifications', svc.from('notifications').delete().eq('profile_id', pid));

  const { error: eUser } = await svc.auth.admin.deleteUser(pid);
  if (eUser) { console.log(`  ⚠️ deleteUser : ${eUser.message}`); continue; }
  // Le profil part en cascade avec le compte ; filet si jamais.
  await svc.from('profiles').delete().eq('id', pid);
  console.log('  ✅ purgé');
}
console.log('\nTerminé.');
