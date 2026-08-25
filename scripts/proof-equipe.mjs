/**
 * Preuve — l'équipe d'un studio et le plan Multi (lot 3 du chantier multi-prof,
 * 2026-08-25 ; demande Colin : « on est d'accord que tout ça n'est accessible
 * qu'au plan multi ? il faut aussi un plan free multi pour les tests »).
 *
 * Ce qu'on prouve, dans l'ordre de gravité :
 *   A. Le plan garde la porte, DES DEUX CÔTÉS. Sur un studio Complet, l'écran
 *      Équipe le dit et la route refuse. Le passage en bêta Multi ouvre.
 *   B. Inviter fabrique une invitation, pas un accès : la ligne naît « invite »,
 *      le compte auth naît role='membre' et SANS studio à lui.
 *   C. L'invitée se connecte : son invitation devient une appartenance, elle
 *      entre dans le studio.
 *   D. Elle est accueillie par SON prénom, pas celui de la propriétaire —
 *      le « Bonjour Maude ! » vu sur la capture du lot 2.
 *   E. Sa nav ne dessine QUE des portes qui s'ouvrent : ni Revenus, ni
 *      Messagerie, ni Paramètres, ni Équipe.
 *   F. LE test du lot : elle appelle une route interdite À LA MAIN et se fait
 *      refuser. Une permission qui ne vit que dans l'UI ne vaut rien.
 *   G. La propriétaire élargit ses droits : la même route passe.
 *   H. Retirée, elle est dehors immédiatement.
 *   I. Downgrade du studio : une invitée encore listée voit /acces-suspendu.
 *   J. Ménage : plan démo restauré, comptes jetables supprimés, MÊME en échec.
 *
 * ⚠️ Modifie TEMPORAIREMENT le plan du studio de démo (restauré en fin de
 * script, y compris sur exception) et crée un compte auth jetable @example.com.
 *
 * Usage : node scripts/proof-equipe.mjs [dossier-captures]
 * Prérequis : dev server sur :3333, migration v101 appliquée.
 */
import { createClient } from '@supabase/supabase-js';
import { readFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = process.cwd();
const OUT = process.argv[2] || join(process.env.TEMP || '.', 'proof-equipe');
mkdirSync(OUT, { recursive: true });
const BASE = 'http://localhost:3333';
const PROF_EMAIL = 'bonjour@melutek.com';
const CLAIRE = 'preuve-equipe-claire@example.com';

const env = Object.fromEntries(
  readFileSync(join(ROOT, '.env.local'), 'utf8')
    .split('\n').filter(l => l.includes('=') && !l.startsWith('#'))
    .map(l => [l.slice(0, l.indexOf('=')).trim(), l.slice(l.indexOf('=') + 1).trim()])
);
const PROJECT_REF = new URL(env.NEXT_PUBLIC_SUPABASE_URL).hostname.split('.')[0];
const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

let ok = 0, ko = 0;
const assert = (cond, label) => {
  if (cond) { ok++; console.log(`  OK  ${label}`); }
  else { ko++; console.log(`  KO  ${label}`); }
};
const attendre = ms => new Promise(r => setTimeout(r, ms));

async function session(email) {
  const { data: lien, error: eLink } = await admin.auth.admin.generateLink({ type: 'magiclink', email });
  if (eLink) throw new Error(`generateLink(${email}): ${eLink.message}`);
  const anon = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: otp, error: eOtp } = await anon.auth.verifyOtp({ type: 'magiclink', token_hash: lien.properties.hashed_token });
  if (eOtp || !otp?.session) throw new Error(`verifyOtp(${email}): ${eOtp?.message || 'pas de session'}`);
  const value = 'base64-' + Buffer.from(JSON.stringify(otp.session)).toString('base64url');
  const nom = `sb-${PROJECT_REF}-auth-token`;
  const cookies = [];
  if (value.length <= 3180) cookies.push({ name: nom, value });
  else for (let i = 0; i * 3180 < value.length; i++) cookies.push({ name: `${nom}.${i}`, value: value.slice(i * 3180, (i + 1) * 3180) });
  return { cookies, userId: otp.session.user.id };
}

for (let i = 0; i < 90; i++) {
  try { const r = await fetch(`${BASE}/login`); if (r.ok) break; } catch { /* pas prêt */ }
  await attendre(2000);
  if (i === 89) { console.error('dev server injoignable sur :3333'); process.exit(1); }
}
console.log('dev server pret\n');

const { error: eSonde } = await admin.from('studio_membres').select('id').limit(1);
if (eSonde) {
  console.error(`v101 absente (${eSonde.code}) : ce lot ne se prouve pas sans elle.`);
  process.exit(1);
}

const { cookies: cookiesProf, userId: profId } = await session(PROF_EMAIL);
const { data: profilInitial } = await admin.from('profiles').select('plan, prenom, studio_nom').eq('id', profId).single();
const PLAN_INITIAL = profilInitial?.plan || 'pro';
console.log(`studio démo : plan « ${PLAN_INITIAL} », propriétaire « ${profilInitial?.prenom} »\n`);

const purger = async () => {
  await admin.from('studio_membres').delete().eq('profile_id', profId).ilike('email', CLAIRE);
  const { data } = await admin.auth.admin.listUsers({ page: 1, perPage: 200 });
  const u = (data?.users || []).find(x => x.email === CLAIRE);
  if (u) {
    await admin.from('studio_membres').delete().eq('auth_user_id', u.id);
    await admin.auth.admin.deleteUser(u.id);
  }
};
const restaurerPlan = () => admin.from('profiles').update({ plan: PLAN_INITIAL }).eq('id', profId);

/**
 * Poser un plan EN LISANT l'erreur. La première version ignorait le retour :
 * le CHECK `profiles_plan_check` (v56) refusait 'multi_free' en 23514, le
 * script continuait comme si de rien n'était, et six assertions tombaient
 * plus loin sur une cause invisible. Une écriture dont on ne lit pas l'erreur
 * ment sur ce qui s'est passé.
 */
async function poserPlan(plan) {
  const { error } = await admin.from('profiles').update({ plan }).eq('id', profId).select('plan').single();
  if (error) {
    if (error.code === '23514') {
      throw new Error(`Le plan « ${plan} » est refusé par profiles_plan_check : applique migrations-v102-plan-multi.sql avant de relancer.`);
    }
    throw new Error(`plan ${plan} : ${error.message}`);
  }
}

let browser;
try {
  await purger();

  let chromium;
  try { ({ chromium } = await import('playwright')); }
  catch { ({ chromium } = await import('@playwright/test')); }
  try { browser = await chromium.launch(); }
  catch { browser = await chromium.launch({ channel: 'msedge' }); }

  const ctxProf = await browser.newContext({ viewport: { width: 1280, height: 950 } });
  await ctxProf.addCookies(cookiesProf.map(c => ({ ...c, domain: 'localhost', path: '/' })));
  const pProf = await ctxProf.newPage();

  // ══ A. Le plan garde la porte, des DEUX côtés ═════════════════════════════
  console.log('A. Le plan Multi garde la porte');
  await poserPlan('pro');
  await pProf.goto(`${BASE}/equipe`, { waitUntil: 'domcontentloaded' });
  await pProf.waitForTimeout(5000);
  const texteSansPlan = await pProf.innerText('body');
  assert(/plan Multi/i.test(texteSansPlan), 'sur Complet, l\'écran Équipe explique qu\'il faut Multi');
  await pProf.screenshot({ path: join(OUT, 'A-sans-plan.png') });

  const refus = await pProf.request.post(`${BASE}/api/equipe`, { data: { email: CLAIRE, role: 'prof' } });
  const corpsRefus = await refus.json().catch(() => ({}));
  assert(refus.status() === 403 && corpsRefus.code === 'PLAN_REQUIS',
    'et la ROUTE refuse aussi (403 PLAN_REQUIS) : l\'écran n\'est jamais la garde');
  assert(corpsRefus.upgradeTo === 'multi',
    `le refus nomme le BON plan (${corpsRefus.upgradeTo}) — envoyer vers Complet serait faire payer le mauvais abonnement`);

  const navSansPlan = await pProf.innerText('nav').catch(() => texteSansPlan);
  assert(!/Équipe/.test(navSansPlan), 'la nav ne propose pas Équipe sans le plan');

  // ══ Bêta Multi : le plan offert ouvre EXACTEMENT ce que le payant ouvre ══
  console.log('\nA2. La bêta offerte (multi_free)');
  await poserPlan('multi_free');
  await pProf.goto(`${BASE}/equipe`, { waitUntil: 'domcontentloaded' });
  await pProf.waitForTimeout(4000);
  const texteBeta = await pProf.innerText('body');
  assert(!/plan Multi/i.test(texteBeta) && /Inviter une prof/i.test(texteBeta),
    'en bêta multi_free, l\'écran Équipe est PLEINEMENT ouvert (comme le plan payant)');
  const navBeta = await pProf.innerText('nav').catch(() => '');
  assert(/Équipe/.test(navBeta), 'et la nav affiche l\'entrée Équipe');
  await pProf.screenshot({ path: join(OUT, 'A2-ecran-equipe.png') });

  // ══ B. Inviter fabrique une invitation, pas un accès ══════════════════════
  console.log('\nB. L\'invitation');
  const inv = await pProf.request.post(`${BASE}/api/equipe`, {
    data: { email: CLAIRE, prenom: 'Claire', role: 'prof' },
  });
  const corpsInv = await inv.json().catch(() => ({}));
  assert(inv.ok(), `l'invitation est acceptée (${inv.status()})`);
  assert(corpsInv.membre?.statut === 'invite',
    'EN BASE : la ligne naît « invite », pas « actif » — afficher Actif à quelqu\'un qui n\'est jamais venu serait faux');
  assert(!JSON.stringify(corpsInv).includes(profId), 'la réponse ne laisse fuir aucun identifiant interne');

  const { data: users } = await admin.auth.admin.listUsers({ page: 1, perPage: 200 });
  const claire = (users?.users || []).find(u => u.email === CLAIRE);
  assert(!!claire, 'un compte auth a été créé pour elle');
  assert(claire?.user_metadata?.role === 'membre', "il porte role='membre'");
  const { data: profilFantome } = await admin.from('profiles').select('id').eq('id', claire.id).maybeSingle();
  assert(!profilFantome, 'EN BASE : aucun studio fantôme à son nom (l\'incident Bruno évité)');

  const rejeu = await pProf.request.post(`${BASE}/api/equipe`, { data: { email: CLAIRE, role: 'prof' } });
  assert(rejeu.status() === 409, 'ré-inviter la même adresse est refusé proprement (409), pas par un 500 SQL');

  const soi = await pProf.request.post(`${BASE}/api/equipe`, { data: { email: PROF_EMAIL, role: 'prof' } });
  assert(soi.status() === 400, 's\'inviter soi-même est refusé avec un message, pas une erreur de contrainte');

  // ══ C + D + E. Claire entre ══════════════════════════════════════════════
  console.log('\nC/D/E. Claire se connecte');
  const { cookies: cookiesClaire } = await session(CLAIRE);
  const ctxC = await browser.newContext({ viewport: { width: 1280, height: 950 } });
  await ctxC.addCookies(cookiesClaire.map(c => ({ ...c, domain: 'localhost', path: '/' })));
  const pC = await ctxC.newPage();
  const erreursC = [];
  pC.on('pageerror', e => erreursC.push(String(e)));
  await pC.goto(`${BASE}/dashboard`, { waitUntil: 'domcontentloaded' });
  await pC.waitForTimeout(6000);
  const texteC = await pC.innerText('body');
  await pC.screenshot({ path: join(OUT, 'C-dashboard-claire.png') });

  assert(!pC.url().includes('/onboarding'), 'son invitation est devenue une appartenance : elle entre dans le studio');
  const { data: ligne } = await admin.from('studio_membres')
    .select('statut, auth_user_id, accepte_at').eq('profile_id', profId).ilike('email', CLAIRE).maybeSingle();
  assert(ligne?.statut === 'actif' && ligne?.auth_user_id === claire.id && !!ligne?.accepte_at,
    'EN BASE : la ligne est passée « actif », rattachée à son compte, avec sa date');
  assert(erreursC.length === 0, `console propre (${erreursC.length} erreur(s))`);

  assert(/Bonjour Claire/.test(texteC),
    `elle est accueillie par SON prénom${/Bonjour Maude/.test(texteC) ? ' (or on lit « Bonjour Maude »)' : ''}`);
  assert(!/Bonjour Maude/.test(texteC), 'et jamais par celui de la propriétaire');

  const navC = await pC.innerText('nav').catch(() => texteC);
  const portesInterdites = ['Revenus', 'Messagerie', 'Paramètres', 'Équipe'].filter(p => navC.includes(p));
  assert(portesInterdites.length === 0,
    `sa nav ne dessine QUE des portes qui s'ouvrent${portesInterdites.length ? ' (visibles à tort : ' + portesInterdites.join(', ') + ')' : ''}`);
  assert(navC.includes('Élèves') && navC.includes('Agenda'), 'elle garde ce dont elle a besoin (Agenda, Élèves)');

  // ══ F. LE test : la route refuse aussi ═══════════════════════════════════
  console.log('\nF. La permission vit dans la ROUTE, pas dans l\'écran');
  const { data: unClient } = await admin.from('clients').select('id').eq('profile_id', profId).limit(1).maybeSingle();
  const suppr = await pC.request.delete(`${BASE}/api/clients/${unClient.id}`);
  const corpsSuppr = await suppr.json().catch(() => ({}));
  assert(suppr.status() === 403 && corpsSuppr.code === 'PERMISSION_REQUISE',
    'elle appelle la suppression d\'une fiche À LA MAIN et se fait refuser (403 PERMISSION_REQUISE)');
  const { data: toujoursLa } = await admin.from('clients').select('id').eq('id', unClient.id).maybeSingle();
  assert(!!toujoursLa, 'EN BASE : la fiche est toujours là');

  const majProfil = await pC.request.put(`${BASE}/api/profile`, { data: { studio_nom: 'PIRATÉ' } });
  assert(majProfil.status() === 403, 'elle ne peut pas non plus toucher aux réglages du studio');
  const { data: nomApres } = await admin.from('profiles').select('studio_nom').eq('id', profId).single();
  assert(nomApres?.studio_nom !== 'PIRATÉ', 'EN BASE : le nom du studio est intact');

  // ══ G. La propriétaire élargit ses droits ════════════════════════════════
  console.log('\nG. Élargir les droits');
  const idMembre = corpsInv.membre.id;
  const patch = await pProf.request.patch(`${BASE}/api/equipe/${idMembre}`, {
    data: { role: 'prof', permissions: { pointer: true, cours_gerer: true, eleves_voir: true, eleves_gerer: true } },
  });
  assert(patch.ok(), 'la propriétaire élargit les droits de Claire');
  const suppr2 = await pC.request.delete(`${BASE}/api/clients/${unClient.id}`);
  assert(suppr2.status() !== 403,
    `la MÊME route passe désormais (${suppr2.status()}) : le droit est bien ce qui décide, pas l'écran`);

  const autoPatch = await pC.request.patch(`${BASE}/api/equipe/${idMembre}`, { data: { role: 'admin' } });
  assert(autoPatch.status() === 403,
    'elle ne peut pas s\'auto-promouvoir admin (elle n\'a pas equipe_gerer)');

  // ══ H. Retirée ═══════════════════════════════════════════════════════════
  console.log('\nH. Retrait');
  const del = await pProf.request.delete(`${BASE}/api/equipe/${idMembre}`);
  assert(del.ok(), 'la propriétaire la retire');
  await pC.goto(`${BASE}/dashboard`, { waitUntil: 'domcontentloaded' });
  await pC.waitForTimeout(4000);
  assert(pC.url().includes('/onboarding'),
    'elle est dehors à la requête suivante, sans redéploiement ni reconnexion');

  // ══ I. Downgrade : la porte se ferme, et on lui dit pourquoi ═════════════
  console.log('\nI. Downgrade du studio');
  await admin.from('studio_membres')
    .update({ statut: 'actif', revoque_at: null }).eq('id', idMembre);
  await poserPlan('pro');
  await pC.goto(`${BASE}/dashboard`, { waitUntil: 'domcontentloaded' });
  await pC.waitForTimeout(4000);
  const texteSuspendu = await pC.innerText('body');
  assert(pC.url().includes('/acces-suspendu'),
    'un studio repassé en Complet ferme la porte à ses invitées');
  assert(/en pause/i.test(texteSuspendu) && /place est gardée/i.test(texteSuspendu),
    'et on lui DIT pourquoi, en lui garantissant que sa place reste');
  await pC.screenshot({ path: join(OUT, 'I-acces-suspendu.png') });

  const { data: ligneGardee } = await admin.from('studio_membres').select('statut').eq('id', idMembre).maybeSingle();
  assert(ligneGardee?.statut === 'actif',
    'EN BASE : sa ligne n\'est PAS supprimée — re-souscrire rendra tout sans rien refaire');

  await ctxC.close();
  await ctxProf.close();
} catch (e) {
  ko++;
  console.error('\nEXCEPTION :', e.message);
} finally {
  try { await restaurerPlan(); } catch (e) { console.error('restauration plan :', e.message); }
  try { await purger(); } catch (e) { console.error('ménage :', e.message); }
  const { data: p } = await admin.from('profiles').select('plan').eq('id', profId).single();
  assert(p?.plan === PLAN_INITIAL, `ménage : le studio démo est revenu au plan « ${p?.plan} »`);
  const { count } = await admin.from('studio_membres').select('id', { count: 'exact', head: true }).eq('profile_id', profId);
  assert((count || 0) === 1, `ménage : le studio démo n'a plus que son propriétaire (${count})`);
  if (browser) await browser.close();
}

console.log(`\n${'═'.repeat(62)}`);
console.log(`  ${ok} OK · ${ko} KO`);
console.log(`  captures : ${OUT}`);
console.log('═'.repeat(62));
process.exit(ko === 0 ? 0 : 1);
