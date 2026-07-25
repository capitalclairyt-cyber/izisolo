/**
 * B1e — Nettoyage du walkthrough : supprime l'élève de test (auth + fiche +
 * présences + fiche invitée), restaure le plan du démo. Les 3 cours seedés
 * RESTENT (la vitrine démo était vide — ils la réparent).
 */
import { createClient } from '@supabase/supabase-js';
import { readFileSync, existsSync, unlinkSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = process.cwd();
const env = Object.fromEntries(
  readFileSync(join(ROOT, '.env.local'), 'utf8')
    .split('\n').filter(l => l.includes('=') && !l.startsWith('#'))
    .map(l => [l.slice(0, l.indexOf('=')).trim(), l.slice(l.indexOf('=') + 1).trim()])
);
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

const FIX = join(ROOT, 'scripts', '.b1e-fixtures.json');
if (!existsSync(FIX)) { console.log('Pas de fixtures — rien à nettoyer.'); process.exit(0); }
const f = JSON.parse(readFileSync(FIX, 'utf8'));

// 1. Présences + fiches de test (élève connectée + invitée) — presences suivent en CASCADE
const emailsTest = [f.eleveEmail, 'b1e.guest@example.com'];
const { data: fiches } = await sb.from('clients')
  .select('id, email').eq('profile_id', f.demoId).in('email', emailsTest);
for (const fiche of (fiches || [])) {
  const { error } = await sb.from('clients').delete().eq('id', fiche.id);
  console.log(error ? `❌ fiche ${fiche.email}: ${error.message}` : `fiche supprimée: ${fiche.email}`);
}

// 2. Compte auth élève de test
if (f.eleveUserId) {
  const { error } = await sb.auth.admin.deleteUser(f.eleveUserId);
  console.log(error ? `❌ auth: ${error.message}` : 'compte auth test supprimé');
}

// 3. Cas à traiter / notifications de test éventuels sur le démo (annulation walkthrough)
await sb.from('cas_a_traiter').delete().eq('profile_id', f.demoId).gte('created_at', new Date(Date.now() - 2 * 3600 * 1000).toISOString());

// 4. Restaurer le plan
const { error: ePlan } = await sb.from('profiles').update({ plan: f.planAvant || 'free' }).eq('id', f.demoId);
console.log(ePlan ? `❌ plan: ${ePlan.message}` : `plan démo restauré: ${f.planAvant || 'free'}`);

// 5. Vérification post-nettoyage
const { count } = await sb.from('clients').select('id', { count: 'exact', head: true })
  .eq('profile_id', f.demoId).in('email', emailsTest);
console.log(`vérif fiches test restantes: ${count}`);

unlinkSync(FIX);
console.log('✅ nettoyage terminé (les 3 cours démo restent — vitrine réparée)');
