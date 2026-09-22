/**
 * Preuve — « Ajouter des élèves » dit quand la personne cherchée est DÉJÀ sur
 * la séance (retour Maude 2026-09-22, le soir de son Yoga du Mardi) :
 *
 *   « Elle tape Catherine, et elle ne trouve pas Catherine Mazoyer dans la
 *   liste des possibilités. »
 *
 * En base, Catherine était déjà sur la séance (réservation portail du 17/09),
 * pointée présente. Le modal la retirait des propositions (voulu) mais disait
 * « Aucun résultat » et proposait « Créer la fiche » : un doublon sans email.
 *
 * Déroulé (vrai navigateur sur :3333, session prof démo, chemin réel) :
 *   A. Une séance témoin avec deux inscrites (une présente, une simplement
 *      inscrite) et une élève NON inscrite, homonyme par le prénom.
 *   B. On tape le prénom de l'inscrite présente : la note la NOMME avec son
 *      état, « Aucun résultat » n'apparaît pas, « Créer la fiche » non plus.
 *   C. On tape le prénom partagé : la note nomme l'inscrite ET la liste
 *      propose la non-inscrite (rien n'est caché dans les deux sens).
 *   D. On tape un nom inconnu : « Aucun résultat » + « Créer la fiche »
 *      restent (le chemin de la personne sans fiche n'a pas bougé).
 *   E. Ménage : témoins purgés, même en cas d'échec.
 *
 * Usage : node scripts/proof-deja-inscrite.mjs
 * Prérequis : dev server sur :3333 (npm run dev).
 */
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = process.cwd();
const BASE = process.env.PROOF_BASE || 'http://localhost:3333';
const PROF_EMAIL = 'bonjour@melutek.com';
const MARQUEUR = '[preuve deja]';

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

async function sessionCookies(email) {
  const { data: linkData, error: eLink } = await admin.auth.admin.generateLink({ type: 'magiclink', email });
  if (eLink) throw new Error(`generateLink(${email}): ${eLink.message}`);
  const anon = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: otpData, error: eOtp } = await anon.auth.verifyOtp({ type: 'magiclink', token_hash: linkData.properties.hashed_token });
  if (eOtp || !otpData?.session) throw new Error(`verifyOtp(${email}): ${eOtp?.message || 'pas de session'}`);
  const value = 'base64-' + Buffer.from(JSON.stringify(otpData.session)).toString('base64url');
  const nom = `sb-${PROJECT_REF}-auth-token`;
  const cookies = [];
  if (value.length <= 3180) cookies.push({ name: nom, value });
  else for (let i = 0; i * 3180 < value.length; i++) cookies.push({ name: `${nom}.${i}`, value: value.slice(i * 3180, (i + 1) * 3180) });
  return { cookies, userId: otpData.session.user.id };
}

for (let i = 0; i < 90; i++) {
  try { const r = await fetch(`${BASE}/login`); if (r.ok) break; } catch { /* pas prêt */ }
  await attendre(2000);
  if (i === 89) { console.error('dev server injoignable'); process.exit(1); }
}
console.log('dev server pret');

const { cookies, userId: profileId } = await sessionCookies(PROF_EMAIL);
const aujourdhui = (() => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; })();

const purger = async () => {
  const { data: co } = await admin.from('cours').select('id').eq('profile_id', profileId).ilike('nom', `${MARQUEUR}%`);
  const coIds = (co || []).map(c => c.id);
  const { data: cl } = await admin.from('clients').select('id').eq('profile_id', profileId).ilike('nom', `${MARQUEUR}%`);
  const clIds = (cl || []).map(c => c.id);
  if (coIds.length) { await admin.from('presences').delete().in('cours_id', coIds); await admin.from('notifications').delete().in('cours_id', coIds); }
  if (clIds.length) { await admin.from('presences').delete().in('client_id', clIds); await admin.from('abonnements').delete().in('client_id', clIds); }
  if (coIds.length) await admin.from('cours').delete().in('id', coIds);
  if (clIds.length) await admin.from('clients').delete().in('id', clIds);
};

let browser;
try {
  await purger();

  // ── A. Décor ──────────────────────────────────────────────────────────────
  const { data: seance, error: eCo } = await admin.from('cours').insert({
    profile_id: profileId, nom: `${MARQUEUR} Yoga du soir`, date: aujourdhui, heure: '06:00',
    duree_minutes: 60, type_cours: 'Hatha', capacite_max: 20, visibilite: 'public', est_annule: false,
  }).select('id').single();
  if (eCo) throw new Error(`cours : ${eCo.message}`);

  const mk = async (prenom, nom) => {
    const { data, error } = await admin.from('clients').insert({
      profile_id: profileId, prenom, nom: `${MARQUEUR} ${nom}`,
      email: `preuve-deja-${prenom.toLowerCase()}-${nom.toLowerCase()}-${Date.now()}@example.com`,
      statut: 'actif', type_client: 'particulier',
    }).select('id, prenom, nom').single();
    if (error) throw new Error(`client ${prenom} : ${error.message}`);
    return data;
  };
  const catherine = await mk('Catherine', 'Mazoyer');   // inscrite, présente (le cas de Maude)
  const anne      = await mk('Anne', 'Dupont');         // inscrite, pas encore pointée
  await mk('Anne', 'Lefort');                            // PAS inscrite : doit rester proposable

  const { error: ePr } = await admin.from('presences').insert([
    { profile_id: profileId, cours_id: seance.id, client_id: catherine.id, statut_pointage: 'present', pointee: true },
    { profile_id: profileId, cours_id: seance.id, client_id: anne.id, statut_pointage: 'inscrit', pointee: false },
  ]);
  if (ePr) throw new Error(`presences : ${ePr.message}`);

  let chromium;
  try { ({ chromium } = await import('playwright')); }
  catch { ({ chromium } = await import('@playwright/test')); }
  try { browser = await chromium.launch(); }
  catch { browser = await chromium.launch({ channel: 'msedge' }); }

  const ctx = await browser.newContext({ viewport: { width: 420, height: 900 } });
  await ctx.addCookies(cookies.map(c => ({ ...c, domain: 'localhost', path: '/' })));
  const page = await ctx.newPage();
  const BRUIT_CONNU = [/unique "key" prop.*OuterLayoutRouter/s, /status of 409/];
  const erreursConsole = [];
  const noter = t => { if (!BRUIT_CONNU.some(r => r.test(t))) erreursConsole.push(t); };
  page.on('console', m => { if (m.type() === 'error') noter(m.text()); });
  page.on('pageerror', e => noter(`pageerror: ${e.message}`));

  await page.goto(`${BASE}/pointage/${seance.id}`, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('.pres-row', { timeout: 60000 });
  assert(await page.locator('.pres-row').filter({ hasText: 'Catherine' }).count() === 1, 'A. Catherine est sur la liste de pointage');

  // Ouvrir le modal d'ajout (re-clic jusqu'à l'effet : hydratation, piège v100).
  const ouvrirModal = async () => {
    for (let i = 0; i < 8; i++) {
      const b = page.locator('button', { hasText: 'Ajouter des élèves' }).first();
      if (await b.count()) await b.click().catch(() => {});
      await attendre(400);
      if (await page.locator('.modal-search').count()) return true;
    }
    return false;
  };
  assert(await ouvrirModal(), 'A. le modal « Ajouter des élèves » s\'ouvre');
  const champ = page.locator('.modal-search');
  const taper = async (t) => { await champ.fill(''); await champ.fill(t); await attendre(250); };
  const texteListe = async () => (await page.locator('.modal-list').innerText()).replace(/\s+/g, ' ');

  // ── B. Le cas de Maude ────────────────────────────────────────────────────
  await taper('Catherine');
  let txt = await texteListe();
  assert(await page.locator('[data-testid="deja-inscrite"]').count() === 1, 'B. une note nomme l\'inscrite');
  assert(/Catherine \[preuve deja\] Mazoyer est déjà sur cette séance \(présent·e\)/.test(txt), `B. la note dit qui et dans quel état : « ${txt} »`);
  assert(/Rien à ajouter/.test(txt), 'B. la note dit qu\'il n\'y a rien à ajouter');
  assert(!/Aucun résultat/.test(txt), 'B. « Aucun résultat » a disparu');
  assert(await page.locator('.modal-list button', { hasText: 'Créer la fiche' }).count() === 0, 'B. « Créer la fiche » n\'est PAS proposé (le doublon)');

  // ── C. Prénom partagé : la note ET la liste ───────────────────────────────
  await taper('Anne');
  txt = await texteListe();
  assert(/Anne \[preuve deja\] Dupont est déjà sur cette séance \(inscrit·e\)/.test(txt), `C. la note nomme Anne Dupont, inscrite : « ${txt} »`);
  assert(await page.locator('.modal-item', { hasText: 'Lefort' }).count() === 1, 'C. Anne Lefort, pas inscrite, reste proposée dans la liste');
  assert(await page.locator('.modal-item', { hasText: 'Dupont' }).count() === 0, 'C. Anne Dupont, inscrite, n\'est pas proposée en double');
  assert(!/Rien à ajouter/.test(txt), 'C. pas de « rien à ajouter » quand la liste propose quelqu\'un');

  // ── D. Une inconnue : le chemin de création est intact ────────────────────
  await taper('Inconnue Totale');
  txt = await texteListe();
  assert(/Aucun résultat pour « Inconnue Totale »/.test(txt), 'D. « Aucun résultat » pour une inconnue');
  assert(await page.locator('.modal-list button', { hasText: 'Créer la fiche « Inconnue Totale »' }).count() === 1, 'D. « Créer la fiche » reste proposé pour une inconnue');
  assert(await page.locator('[data-testid="deja-inscrite"]').count() === 0, 'D. aucune note « déjà sur cette séance »');

  // Recherche vide : la liste, sans note.
  await taper('');
  assert(await page.locator('[data-testid="deja-inscrite"]').count() === 0, 'D. recherche vide : aucune note');
  assert(await page.locator('.modal-item', { hasText: 'Lefort' }).count() === 1, 'D. recherche vide : la liste propose la non-inscrite');

  assert(erreursConsole.length === 0, `console propre (${erreursConsole.length} erreur(s))${erreursConsole.length ? ' : ' + erreursConsole.slice(0, 3).join(' | ') : ''}`);
} catch (e) {
  ko++;
  console.error('  KO  exception :', e.message);
} finally {
  if (browser) await browser.close().catch(() => {});
  await purger();
  console.log(`\nRésultat : ${ok} OK / ${ko} KO`);
  process.exit(ko ? 1 : 0);
}
