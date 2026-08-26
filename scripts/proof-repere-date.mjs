/**
 * Preuve — le repère de jour sous les champs de date (2026-08-26).
 *
 * Retour de Maude : « le calendrier d'IziSolo affiche le premier septembre un
 * jeudi alors que c'est un mardi ». Le code d'IziSolo était juste : le
 * calendrier qu'elle regardait était celui du NAVIGATEUR, ouvert sur le mois
 * de la valeur déjà présente dans le champ. Une année mal tapée l'ouvre sur
 * une année où le 1er septembre EST un jeudi (2011, 2016, 2022, 2033), et rien
 * à l'écran ne le signalait : un `<input type="date">` n'écrit jamais le jour.
 *
 * Ce que cette preuve vérifie, en vrai navigateur, sur les vrais écrans :
 *   1. Le repère est RENDU sous le champ (le piège §12 du `<style jsx>` scopé
 *      aurait pu le sortir nu, ou le composant ne pas monter du tout).
 *   2. Il dit le bon jour pour le cas exact du retour terrain.
 *   3. Une année fautive déclenche l'alerte, qui NOMME l'année, et sort dans
 *      la couleur d'alerte, lue en style CALCULÉ et jamais par la classe.
 *   4. Un champ VIDE n'affiche RIEN (parseDate('') renvoie AUJOURD'HUI :
 *      un repère bâti dessus mentirait avec aplomb).
 *   5. Le champ « jusqu'à une date » d'une série l'a aussi (il est enveloppé
 *      dans un fragment, donc sa structure JSX diffère).
 *   6. La modification d'une séance existante l'a aussi.
 *   7. Console propre.
 *
 * Prérequis : dev server sur :3333. AUCUNE écriture en base : on remplit des
 * champs, on ne valide jamais un formulaire.
 */
import { createClient } from '@supabase/supabase-js';
import { readFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = process.cwd();
const OUT = process.argv[2] || join(process.env.TEMP || '.', 'proof-repere-date');
mkdirSync(OUT, { recursive: true });
const BASE = 'http://localhost:3333';
const PROF_EMAIL = 'bonjour@melutek.com';
const DANGER = 'rgb(196, 87, 78)'; // var(--danger) #C4574E

const env = Object.fromEntries(
  readFileSync(join(ROOT, '.env.local'), 'utf8')
    .split('\n').filter(l => l.includes('=') && !l.startsWith('#'))
    .map(l => [l.slice(0, l.indexOf('=')).trim(), l.slice(l.indexOf('=') + 1).trim()])
);
const PROJECT_REF = new URL(env.NEXT_PUBLIC_SUPABASE_URL).hostname.split('.')[0];
const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
const anon = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

let ok = 0, ko = 0;
const assert = (cond, label, vu) => {
  if (cond) { ok++; console.log(`  OK  ${label}`); }
  else { ko++; console.log(`  KO  ${label}${vu !== undefined ? `  (vu : ${JSON.stringify(vu)})` : ''}`); }
};

async function sessionCookies(email) {
  const { data: linkData, error: eLink } = await admin.auth.admin.generateLink({ type: 'magiclink', email });
  if (eLink) throw new Error(`generateLink(${email}): ${eLink.message}`);
  const { data: otpData, error: eOtp } = await anon.auth.verifyOtp({ type: 'magiclink', token_hash: linkData.properties.hashed_token });
  if (eOtp || !otpData?.session) throw new Error(`verifyOtp(${email}): ${eOtp?.message || 'pas de session'}`);
  const value = 'base64-' + Buffer.from(JSON.stringify(otpData.session)).toString('base64url');
  const nom = `sb-${PROJECT_REF}-auth-token`;
  const cookies = [];
  if (value.length <= 3180) cookies.push({ name: nom, value });
  else for (let i = 0; i * 3180 < value.length; i++) cookies.push({ name: `${nom}.${i}`, value: value.slice(i * 3180, (i + 1) * 3180) });
  return { cookies, userId: otpData.session.user.id };
}

// Le repère est le frère IMMÉDIAT du champ : on le lit là où il est rendu,
// et on relève sa couleur CALCULÉE (une classe présente ne prouve rien, §12).
const lireRepere = (page, n = 0) => page.evaluate(i => {
  const champs = [...document.querySelectorAll('input[type=date]')];
  const el = champs[i] && champs[i].nextElementSibling;
  if (!el || el.tagName !== 'P') return null;
  return { texte: el.textContent, couleur: getComputedStyle(el).color };
}, n);

const jourLisible = (iso) => {
  const [y, m, d] = iso.split('-').map(Number);
  const s = new Date(y, m - 1, d).toLocaleDateString('fr-FR', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });
  return s.charAt(0).toUpperCase() + s.slice(1);
};

for (let i = 0; i < 60; i++) {
  try { const r = await fetch(`${BASE}/login`); if (r.ok) break; } catch { /* pas prêt */ }
  await new Promise(r => setTimeout(r, 1000));
}

const { cookies, userId: profileId } = await sessionCookies(PROF_EMAIL);
let browser;
try {
  let chromium;
  try { ({ chromium } = await import('playwright')); }
  catch { ({ chromium } = await import('@playwright/test')); }
  try { browser = await chromium.launch(); }
  catch { browser = await chromium.launch({ channel: 'msedge' }); }

  const ctx = await browser.newContext({ viewport: { width: 900, height: 1100 } });
  await ctx.addCookies(cookies.map(c => ({ ...c, domain: 'localhost', path: '/' })));
  const page = await ctx.newPage();

  const BRUIT_CONNU = [/unique "key" prop.*OuterLayoutRouter/s];
  const erreurs = [];
  const noter = t => { if (!BRUIT_CONNU.some(r => r.test(t))) erreurs.push(t); };
  page.on('console', m => { if (m.type() === 'error') noter(m.text()); });
  page.on('pageerror', e => noter(`pageerror: ${e.message}`));

  // ── 1. Le cas exact du retour terrain ─────────────────────────────────────
  console.log('\n1. Creation d un cours : le jour est ECRIT sous la date');
  await page.goto(`${BASE}/cours/nouveau`, { waitUntil: 'networkidle' });
  await page.waitForSelector('input[type=date]');
  await page.fill('input[type=date]', '2026-09-01');
  await page.waitForTimeout(300);
  let r = await lireRepere(page);
  assert(!!r, 'le repere est RENDU sous le champ');
  assert(r && r.texte === 'Mardi 1 septembre 2026', 'il dit « Mardi 1 septembre 2026 » (le cas de Maude)', r && r.texte);
  assert(r && r.couleur !== DANGER, 'une annee normale ne declenche aucune alerte', r && r.couleur);
  await page.screenshot({ path: join(OUT, '1-jour-normal.png') });

  // ── 2. L'année fautive, celle qui a fabriqué le malentendu ────────────────
  console.log('\n2. Une annee mal tapee est SIGNALEE');
  await page.fill('input[type=date]', '2022-09-01');
  await page.waitForTimeout(300);
  r = await lireRepere(page);
  assert(r && r.texte.includes('Jeudi 1 septembre 2022'), 'le repere avoue : en 2022 le 1er septembre EST un jeudi', r && r.texte);
  assert(r && r.texte.includes('2022') && r.texte.includes('?'), 'l alerte NOMME l annee et pose la question', r && r.texte);
  assert(r && r.couleur === DANGER, 'elle sort en couleur d alerte (style CALCULE)', r && r.couleur);
  await page.screenshot({ path: join(OUT, '2-annee-suspecte.png') });

  // ── 3. Le piège parseDate('') ─────────────────────────────────────────────
  console.log('\n3. Un champ VIDE n affiche RIEN');
  await page.fill('input[type=date]', '');
  await page.waitForTimeout(300);
  r = await lireRepere(page);
  assert(r === null, 'aucun repere sous un champ vide (parseDate rendrait AUJOURD HUI)', r && r.texte);

  // ── 4. La date de fin d'une série (structure JSX différente) ──────────────
  console.log('\n4. La date de fin d une serie l a aussi');
  await page.goto(`${BASE}/cours/nouveau?frequence=hebdomadaire`, { waitUntil: 'networkidle' });
  await page.waitForSelector('input[type=date]');
  await page.getByRole('button', { name: /une date/i }).first().click();
  await page.waitForTimeout(300);
  const nbChamps = await page.locator('input[type=date]').count();
  assert(nbChamps >= 2, 'le champ « jusqu a une date » est bien affiche', nbChamps);
  await page.locator('input[type=date]').nth(1).fill('2026-12-15');
  await page.waitForTimeout(300);
  r = await lireRepere(page, 1);
  assert(r && r.texte === 'Mardi 15 décembre 2026', 'le repere de la date de fin est rendu et juste', r && r.texte);
  await page.screenshot({ path: join(OUT, '4-date-fin.png') });

  // ── 5. Modifier une séance existante ──────────────────────────────────────
  console.log('\n5. Modifier une seance existante l a aussi');
  const { data: unCours } = await admin.from('cours')
    .select('id, date').eq('profile_id', profileId).order('date', { ascending: false }).limit(1).maybeSingle();
  if (!unCours) {
    assert(false, 'un cours du compte demo a ete trouve pour le test');
  } else {
    await page.goto(`${BASE}/cours/${unCours.id}?edit=1`, { waitUntil: 'networkidle' });
    await page.waitForSelector('input[type=date]');
    await page.waitForTimeout(300);
    r = await lireRepere(page);
    assert(!!r, 'le repere est rendu sur la fiche de la seance');
    assert(r && r.texte === jourLisible(unCours.date), `il dit le vrai jour de la seance (${unCours.date})`, r && r.texte);
    await page.screenshot({ path: join(OUT, '5-seance-existante.png') });
  }

  // ── 6. Console ────────────────────────────────────────────────────────────
  console.log('\n6. Console propre sur tout le parcours');
  assert(erreurs.length === 0, `aucune erreur console (${erreurs.length} relevee(s))`, erreurs.slice(0, 2));
} catch (e) {
  ko++;
  console.log(`\n  KO  exception : ${e.message}`);
} finally {
  if (browser) await browser.close();
}

console.log(`\n${ok}/${ok + ko} verifications passees`);
console.log(`captures : ${OUT}`);
process.exit(ko ? 1 : 0);
