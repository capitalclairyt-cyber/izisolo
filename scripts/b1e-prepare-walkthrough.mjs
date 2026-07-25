/**
 * B1e — Préparation du walkthrough élève sur le STUDIO DÉMO (compte de test).
 * ─────────────────────────────────────────────────────────────────────────────
 * 1. Seed 3 cours FUTURS sur le démo (le portail était vide : seed d'origine
 *    périmé — ces cours RESTENT après le test, la vitrine revit).
 * 2. Plan démo → 'pro' temporairement (walkthrough de la boucle élève
 *    complète : annulation self-service, liste d'attente…). Le script
 *    b1e-cleanup restaure 'free'.
 * 3. Élève de test jetable : auth user (password) + fiche client + 1 résa.
 *
 * Sortie : scripts/.b1e-fixtures.json (lu par la spec, gitignoré via .claude? →
 * supprimé au cleanup).
 */
import { createClient } from '@supabase/supabase-js';
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = process.cwd();
const env = Object.fromEntries(
  readFileSync(join(ROOT, '.env.local'), 'utf8')
    .split('\n').filter(l => l.includes('=') && !l.startsWith('#'))
    .map(l => [l.slice(0, l.indexOf('=')).trim(), l.slice(l.indexOf('=') + 1).trim()])
);
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

const DEMO_ID = '80d143d1-c2f6-421f-9a75-bdf90767ddb3';
const ELEVE_EMAIL = 'b1e.eleve.test@example.com';
const ELEVE_PASSWORD = 'B1e-test-' + Math.random().toString(36).slice(2, 10);

const dPlus = (n) => {
  const d = new Date(Date.now() + n * 86400000);
  return d.toLocaleDateString('sv-SE', { timeZone: 'Europe/Paris' });
};

const out = { demoId: DEMO_ID, eleveEmail: ELEVE_EMAIL, elevePassword: ELEVE_PASSWORD };

// 0. Slug + plan actuel
const { data: prof, error: eProf } = await sb.from('profiles')
  .select('studio_slug, plan').eq('id', DEMO_ID).single();
if (eProf) { console.error('❌ profil:', eProf.message); process.exit(1); }
out.slug = prof.studio_slug;
out.planAvant = prof.plan;

// 1. Plan → pro (temporaire, restauré par cleanup)
const { error: ePlan } = await sb.from('profiles').update({ plan: 'pro' }).eq('id', DEMO_ID);
if (ePlan) { console.error('❌ plan:', ePlan.message); process.exit(1); }
console.log(`plan démo: ${prof.plan} → pro (temporaire)`);

// 2. Trois cours futurs (RESTENT après le test — vitrine réparée)
const coursRows = [
  { nom: 'Yoga du soir', type_cours: 'Hatha', date: dPlus(3), heure: '18:30', duree_minutes: 60, capacite_max: 8, visibilite: 'public' },
  { nom: 'Vinyasa du matin', type_cours: 'Vinyasa', date: dPlus(5), heure: '09:00', duree_minutes: 75, capacite_max: 2, visibilite: 'public' },
  { nom: 'Cours privé — coaching', type_cours: 'Coaching', date: dPlus(6), heure: '12:00', duree_minutes: 60, capacite_max: 1, visibilite: 'prive' },
].map(c => ({ ...c, profile_id: DEMO_ID, lieu: 'Studio principal', est_annule: false }));

const { data: crees, error: eCours } = await sb.from('cours').insert(coursRows).select('id, nom, date, heure, capacite_max, visibilite');
if (eCours) { console.error('❌ cours:', eCours.message); process.exit(1); }
out.cours = crees;
console.log('cours seedés:', crees.map(c => `${c.nom} ${c.date} ${String(c.heure).slice(0, 5)}`).join(' | '));

// 3. Élève de test : auth user (role eleve → le trigger v57 ne crée PAS de profil)
const { data: created, error: eUser } = await sb.auth.admin.createUser({
  email: ELEVE_EMAIL,
  password: ELEVE_PASSWORD,
  email_confirm: true,
  user_metadata: { role: 'eleve', prenom: 'TestB1e' },
});
let eleveUserId = created?.user?.id || null;
if (eUser) {
  if (String(eUser.message || '').includes('already')) {
    const { data: list } = await sb.auth.admin.listUsers({ perPage: 200 });
    eleveUserId = (list?.users || []).find(u => u.email === ELEVE_EMAIL)?.id || null;
    if (eleveUserId) await sb.auth.admin.updateUserById(eleveUserId, { password: ELEVE_PASSWORD });
  }
  if (!eleveUserId) { console.error('❌ user:', eUser.message); process.exit(1); }
}
out.eleveUserId = eleveUserId;

// 4. Fiche client démo + une réservation sur le cours 1 (via RPC atomique v53)
const { data: fiche, error: eFiche } = await sb.from('clients').insert({
  profile_id: DEMO_ID, prenom: 'TestB1e', nom: 'Walkthrough',
  email: ELEVE_EMAIL, statut: 'actif', source: 'test-b1e',
}).select('id').single();
if (eFiche) { console.error('❌ fiche:', eFiche.message); process.exit(1); }
out.ficheId = fiche.id;

const { error: ePres } = await sb.from('presences').insert({
  profile_id: DEMO_ID, cours_id: crees[0].id, client_id: fiche.id,
});
if (ePres) { console.error('❌ présence:', ePres.message); process.exit(1); }

writeFileSync(join(ROOT, 'scripts', '.b1e-fixtures.json'), JSON.stringify(out, null, 2));
console.log('✅ fixtures →', 'scripts/.b1e-fixtures.json', '| slug:', out.slug, '| élève:', ELEVE_EMAIL);
