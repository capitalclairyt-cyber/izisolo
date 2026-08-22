/**
 * Preuve — le jour d'une série récurrente est un CHOIX (retour Colin
 * 2026-08-22 : « Maude a mis une date de démarrage à aujourd'hui pour un cours
 * récurrent le mercredi et ça l'a mis tous les samedis, ensuite impossible de
 * modifier, trop compliqué »).
 *
 * En fréquence hebdomadaire, le jour était DÉDUIT de la date de première
 * séance et n'apparaissait nulle part comme un choix : les boutons de jours
 * n'existaient qu'en mode « personnalisé ». L'aperçu listait bien « sam. 22
 * août, sam. 29 août… », mais en chips abrégées, sous un titre qui ne parlait
 * que de quantité (« 12 cours seront créés »).
 *
 * Déroulé (vrai navigateur sur dev local :3333 + DB réelle, compte démo) :
 *   1. /cours/nouveau en « Chaque semaine » : le sélecteur « Quel jour ? »
 *      existe, et le jour d'aujourd'hui y est déjà coché.
 *   2. L'aperçu DIT la règle en toutes lettres (« Tous les samedis, à partir
 *      du … »), avant la liste de dates.
 *   3. Le scénario de Maude : cliquer « Mer » recale la date de première
 *      séance sur le prochain mercredi, sans jamais reculer dans le passé.
 *   4. L'aperçu suit : « Tous les mercredis ».
 *   5. Création → EN BASE : TOUTES les occurrences tombent un mercredi.
 *      C'est le bug exact, prouvé résolu.
 *   6. Non-régression : « Toutes les 2 semaines » a le même sélecteur et dit
 *      « Un mercredi sur deux » ; « Sur mesure » garde son choix multi-jours.
 *   7. Ménage : témoins purgés, même en cas d'échec.
 *
 * Usage : node scripts/proof-jour-serie.mjs [dossier-captures]
 * Prérequis : dev server sur :3333 (npm run dev).
 */
import { createClient } from '@supabase/supabase-js';
import { readFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = process.cwd();
const OUT = process.argv[2] || join(process.env.TEMP || '.', 'proof-jour-serie');
mkdirSync(OUT, { recursive: true });
const BASE = 'http://localhost:3333';
const PROF_EMAIL = 'bonjour@melutek.com';
const MARQUEUR = '[preuve jour]';

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

// 1 = lundi … 7 = dimanche, à partir d'une date ISO (sans dérive de fuseau).
const jourDe = iso => {
  const [y, m, d] = iso.split('-').map(Number);
  const j = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
  return j === 0 ? 7 : j;
};

async function sessionCookies(email) {
  const { data: linkData, error: eLink } = await admin.auth.admin.generateLink({ type: 'magiclink', email });
  if (eLink) throw new Error(`generateLink(${email}): ${eLink.message}`);
  const anon = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: otpData, error: eOtp } = await anon.auth.verifyOtp({ type: 'magiclink', token_hash: linkData.properties.hashed_token });
  if (eOtp || !otpData?.session) throw new Error(`verifyOtp(${email}): ${eOtp?.message || 'pas de session'}`);
  const value = 'base64-' + Buffer.from(JSON.stringify(otpData.session)).toString('base64url');
  const cookieName = `sb-${PROJECT_REF}-auth-token`;
  const cookies = [];
  if (value.length <= 3180) cookies.push({ name: cookieName, value });
  else for (let i = 0; i * 3180 < value.length; i++) cookies.push({ name: `${cookieName}.${i}`, value: value.slice(i * 3180, (i + 1) * 3180) });
  return { cookies, userId: otpData.session.user.id };
}

for (let i = 0; i < 60; i++) {
  try { const r = await fetch(`${BASE}/login`); if (r.ok) break; } catch { /* pas prêt */ }
  await attendre(2000);
  if (i === 59) { console.error('dev server injoignable sur :3333'); process.exit(1); }
}
console.log('dev server pret');

const { cookies, userId: profileId } = await sessionCookies(PROF_EMAIL);

const purger = async () => {
  const { data: c } = await admin.from('cours').select('id').eq('profile_id', profileId).ilike('nom', `${MARQUEUR}%`);
  const ids = (c || []).map(x => x.id);
  if (ids.length) await admin.from('presences').delete().in('cours_id', ids);
  await admin.from('cours').delete().eq('profile_id', profileId).ilike('nom', `${MARQUEUR}%`);
  await admin.from('recurrences').delete().eq('profile_id', profileId).ilike('nom', `${MARQUEUR}%`);
};

let browser;
try {
  await purger();

  let chromium;
  try { ({ chromium } = await import('playwright')); }
  catch { ({ chromium } = await import('@playwright/test')); }
  try { browser = await chromium.launch(); }
  catch { browser = await chromium.launch({ channel: 'msedge' }); }

  const ctx = await browser.newContext({ viewport: { width: 900, height: 1100 } });
  await ctx.addCookies(cookies.map(c => ({ ...c, domain: 'localhost', path: '/' })));
  const page = await ctx.newPage();

  const BRUIT_CONNU = [/unique "key" prop.*OuterLayoutRouter/s];
  const erreursConsole = [];
  const noter = t => { if (!BRUIT_CONNU.some(r => r.test(t))) erreursConsole.push(t); };
  page.on('console', m => { if (m.type() === 'error') noter(m.text()); });
  page.on('pageerror', e => noter(`pageerror: ${e.message}`));

  const dateInput = () => page.locator('input[type="date"]').first();
  const regle = () => page.locator('.rec-preview-regle').first();

  // ── 1. Le jour est un choix, et il est déjà juste ─────────────────────────
  console.log('\n1. Le selecteur de jour existe et reflete la date');
  await page.goto(`${BASE}/cours/nouveau?frequence=hebdomadaire`, { waitUntil: 'networkidle' });
  await page.waitForSelector('text=Quel jour ?', { timeout: 60000 });
  assert(true, 'le bloc « Quel jour ? » est present en hebdomadaire');

  const dateDepart = await dateInput().inputValue();
  const jourDepart = jourDe(dateDepart);
  const LABELS = { 1: 'Lun', 2: 'Mar', 3: 'Mer', 4: 'Jeu', 5: 'Ven', 6: 'Sam', 7: 'Dim' };
  const boutonSel = page.locator('.jour-btn.selected');
  assert(await boutonSel.count() === 1, 'un seul jour est coche');
  assert((await boutonSel.innerText()).trim() === LABELS[jourDepart],
    `le jour coche correspond a la date de depart (${dateDepart} = ${LABELS[jourDepart]})`);

  // ── 2. L'aperçu DIT la règle ──────────────────────────────────────────────
  console.log('\n2. L\'apercu annonce la regle en toutes lettres');
  await page.waitForSelector('.rec-preview-regle', { timeout: 20000 });
  const LONGS = { 1: 'lundis', 2: 'mardis', 3: 'mercredis', 4: 'jeudis', 5: 'vendredis', 6: 'samedis', 7: 'dimanches' };
  const texteRegle = await regle().innerText();
  assert(texteRegle.startsWith('Tous les '), `l'apercu commence par la regle (« ${texteRegle} »)`);
  assert(texteRegle.includes(LONGS[jourDepart]), `il nomme le bon jour (${LONGS[jourDepart]})`);
  await attendre(500);
  await page.screenshot({ path: join(OUT, '1-jour-deduit.png'), fullPage: false });

  // ── 3. Le scénario de Maude : je veux le mercredi ─────────────────────────
  console.log('\n3. Choisir « Mer » recale la premiere seance');
  await page.getByRole('button', { name: 'Mer', exact: true }).click();
  await attendre(700);
  const dateApres = await dateInput().inputValue();
  assert(jourDe(dateApres) === 3, `la date de depart est devenue un mercredi (${dateApres})`);
  assert(dateApres >= dateDepart, `elle n'a jamais recule dans le passe (${dateDepart} -> ${dateApres})`);
  assert((await page.locator('.jour-btn.selected').innerText()).trim() === 'Mer', '« Mer » est coche');

  // ── 4. L'aperçu suit ──────────────────────────────────────────────────────
  console.log('\n4. L\'apercu suit le nouveau jour');
  const regleApres = await regle().innerText();
  assert(regleApres.includes('mercredis'), `l'apercu dit « ${regleApres} »`);
  const chips = await page.locator('.rec-preview-chip').allInnerTexts();
  assert(chips.length > 0 && chips.every(c => /^mer\./i.test(c.trim())), `les ${chips.length} dates de l'apercu sont des mercredis`);
  await attendre(500);
  await page.screenshot({ path: join(OUT, '2-jour-choisi.png'), fullPage: false });

  // ── 5. En base, toutes les séances tombent un mercredi ────────────────────
  console.log('\n5. La serie creee tombe bien tous les mercredis');
  await page.getByPlaceholder('Ex : Yoga Vinyasa').fill(`${MARQUEUR} Serie mercredi`);
  await page.getByRole('button', { name: /Créer la série de cours/ }).click();
  await page.waitForURL(/\/agenda/, { timeout: 40000 });
  await attendre(2000);

  const { data: seances } = await admin.from('cours').select('date')
    .eq('profile_id', profileId).ilike('nom', `${MARQUEUR}%`).order('date');
  assert((seances?.length || 0) > 1, `serie creee (${seances?.length} seances)`);
  const mauvaises = (seances || []).filter(s => jourDe(s.date) !== 3);
  assert(mauvaises.length === 0,
    mauvaises.length ? `${mauvaises.length} seance(s) au mauvais jour : ${mauvaises.slice(0, 3).map(s => s.date).join(', ')}`
      : `les ${seances.length} seances tombent un mercredi (${seances[0].date} … ${seances[seances.length - 1].date})`);

  // ── 6. Non-régression des autres fréquences ───────────────────────────────
  console.log('\n6. Les autres frequences sont intactes');
  await page.goto(`${BASE}/cours/nouveau?frequence=bimensuel`, { waitUntil: 'networkidle' });
  await page.waitForSelector('text=Quel jour ?', { timeout: 60000 });
  await page.waitForSelector('text=Quel jour ?', { timeout: 30000 });
  await page.getByRole('button', { name: 'Mer', exact: true }).click();
  await attendre(700);
  const regleBi = await regle().innerText();
  assert(/Un mercredi sur deux/.test(regleBi), `bimensuel : « ${regleBi} »`);

  await page.getByText('Sur mesure', { exact: false }).first().click().catch(async () => {
    await page.getByText('Personnalisé', { exact: false }).first().click();
  });
  await attendre(700);
  assert(await page.locator('text=Quel jour ?').count() === 0, 'le bloc « Quel jour ? » disparait en sur-mesure');
  assert(await page.locator('text=Jours de cours').count() === 1, 'le choix multi-jours du sur-mesure est intact');

  // ── 7. Console propre ─────────────────────────────────────────────────────
  console.log('\n7. Console propre sur tout le parcours');
  if (erreursConsole.length) erreursConsole.forEach(e => console.log(`     > ${e.slice(0, 200)}`));
  assert(erreursConsole.length === 0, `aucune erreur console (${erreursConsole.length} relevee(s))`);

} catch (e) {
  ko++;
  console.error(`\nECHEC : ${e.message}`);
  console.error(e.stack);
} finally {
  if (browser) await browser.close().catch(() => {});
  await purger();
  console.log('\ntemoins purges');
}

console.log(`\n${ok}/${ok + ko} verifications passees`);
console.log(`captures : ${OUT}`);
process.exit(ko === 0 ? 0 : 1);
