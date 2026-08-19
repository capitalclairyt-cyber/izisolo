/**
 * Preuve navigateur PRÉ-migration v87 (chemin dégradé) + charte liens.
 * - Prof (démo melutek) : fil épinglé « Équipe IziSolo » visible, clic → toast
 *   explicite « migration v87 », AUCUNE conversation créée.
 * - « ? » AideContextuelle : couleur à la charte (plus le bleu navigateur),
 *   clic → /aide#messagerie DÉFILÉ sur la section + bouton retour fonctionnel.
 * - Admin : /admin/messagerie affiche le hint migration + entrée nav.
 * Cible : dev server local (http://localhost:3333) branché sur la DB réelle —
 * le chemin dégradé ne crée AUCUNE ligne (c'est ce qu'on prouve).
 */
import { createClient } from '@supabase/supabase-js';
import { readFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = 'C:/Users/Colin/Documents/Claude/IziSolo/izisolo';
const OUT = process.argv[2] || join(process.env.TEMP || '.', 'proof-v87');
mkdirSync(OUT, { recursive: true });
const BASE = 'http://localhost:3333';
const env = Object.fromEntries(
  readFileSync(join(ROOT, '.env.local'), 'utf8')
    .split('\n').filter(l => l.includes('=') && !l.startsWith('#'))
    .map(l => [l.slice(0, l.indexOf('=')).trim(), l.slice(l.indexOf('=') + 1).trim()])
);
const PROJECT_REF = new URL(env.NEXT_PUBLIC_SUPABASE_URL).hostname.split('.')[0];
const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

let ok = 0, ko = 0;
const assert = (cond, label) => {
  if (cond) { ok++; console.log(`  ✅ ${label}`); }
  else { ko++; console.log(`  ❌ ${label}`); }
};

// ── Session par magic link (pattern shoot-demo) ──────────────────────────────
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
  return cookies;
}

// ── Attendre le dev server ───────────────────────────────────────────────────
for (let i = 0; i < 60; i++) {
  try { const r = await fetch(`${BASE}/login`); if (r.ok) break; } catch { /* pas prêt */ }
  await new Promise(r => setTimeout(r, 2000));
  if (i === 59) { console.error('dev server injoignable'); process.exit(1); }
}
console.log('🌐 dev server prêt');

let chromium;
try { ({ chromium } = await import('playwright')); }
catch { ({ chromium } = await import('@playwright/test')); }
let browser;
try { browser = await chromium.launch(); }
catch { browser = await chromium.launch({ channel: 'msedge' }); }

// ═══ CÔTÉ PROF (démo melutek) ═══
console.log('\n— Côté prof (bonjour@melutek.com) —');
const PROF_ID_QUERY = await admin.from('profiles').select('id, studio_slug').eq('studio_slug', 'melutek').maybeSingle();
// (slug réel inconnu : on résout le profil par l'email auth)
const { data: { users } } = await admin.auth.admin.listUsers({ perPage: 200 });
const profUser = users.find(u => u.email === 'bonjour@melutek.com');
if (!profUser) { console.error('compte démo introuvable'); process.exit(1); }

const ctxProf = await browser.newContext({ viewport: { width: 1280, height: 860 } });
await ctxProf.addCookies((await sessionCookies('bonjour@melutek.com')).map(c => ({ ...c, url: BASE, sameSite: 'Lax' })));
const page = await ctxProf.newPage();
const consoleErrors = [];
page.on('console', m => { if (m.type() === 'error') consoleErrors.push(m.text().slice(0, 160)); });

await page.goto(`${BASE}/messagerie`, { waitUntil: 'domcontentloaded', timeout: 90000 });
await page.waitForTimeout(5000); // 1re compile dev

// 1. Fil épinglé visible
const supportRow = page.locator('.conv-support');
assert(await supportRow.count() === 1, 'fil épinglé « Équipe IziSolo » rendu en tête de liste');
assert((await supportRow.textContent() || '').includes('Équipe IziSolo'), 'libellé « Équipe IziSolo » présent');

// 2. « ? » à la charte (plus de bleu navigateur rgb(0,0,238))
const aideCtx = page.locator('.aide-ctx').first();
const couleur = await aideCtx.evaluate(el => getComputedStyle(el).color);
console.log(`  couleur du « ? » : ${couleur}`);
assert(couleur !== 'rgb(0, 0, 238)' && couleur !== 'rgb(0, 0, 255)', `« ? » n'est plus en bleu navigateur (${couleur})`);
await page.screenshot({ path: join(OUT, '1-messagerie-fil-epingle.png') });

// 3. Clic sur le fil pré-migration → toast explicite, AUCUNE conv créée
// (clic-sonde d'hydratation : on re-clique si le 1er n'a rien déclenché)
await supportRow.click();
let toastText = '';
for (let i = 0; i < 10; i++) {
  await page.waitForTimeout(800);
  toastText = (await page.locator('body').textContent()) || '';
  if (/migration v87/i.test(toastText)) break;
  if (i === 4) await supportRow.click();
}
assert(/migration v87/i.test(toastText), 'toast explicite « migration v87 à appliquer » affiché');
await page.screenshot({ path: join(OUT, '2-toast-v87.png') });
const { data: convsFantomes } = await admin.from('conversations').select('id').eq('type', 'support');
assert((convsFantomes || []).length === 0, 'aucune conversation support créée en DB (CHECK a refusé)');

// 4. « ? » → /aide#messagerie défilé sur la section + bouton retour
await aideCtx.click();
await page.waitForURL('**/aide**', { timeout: 30000 });
await page.waitForTimeout(2500); // compile /aide + double rAF + retry 250ms
const section = page.locator('#messagerie.aide-section');
assert(await section.count() === 1, 'section #messagerie existe sur /aide');
const box = await section.boundingBox();
console.log(`  position de la section : y=${box ? Math.round(box.y) : 'n/a'}`);
assert(box && box.y > -80 && box.y < 400, `la page est DÉFILÉE sur la section (y=${box ? Math.round(box.y) : '?'} ≈ haut du viewport)`);
const backBtn = page.locator('.aide-back');
assert(await backBtn.count() === 1, 'bouton retour présent sur le guide');
await page.screenshot({ path: join(OUT, '3-aide-ancre-defilee.png') });
await backBtn.click();
await page.waitForURL('**/messagerie**', { timeout: 30000 });
assert(page.url().includes('/messagerie'), 'le retour ramène sur la page d\'origine (/messagerie)');

await ctxProf.close();

// ═══ CÔTÉ ADMIN ═══
console.log('\n— Côté admin (colin.boulgakoff@free.fr) —');
const ctxAdmin = await browser.newContext({ viewport: { width: 1280, height: 860 } });
await ctxAdmin.addCookies((await sessionCookies('colin.boulgakoff@free.fr')).map(c => ({ ...c, url: BASE, sameSite: 'Lax' })));
const pa = await ctxAdmin.newPage();
await pa.goto(`${BASE}/admin/messagerie`, { waitUntil: 'domcontentloaded', timeout: 90000 });
await pa.waitForTimeout(5000);
const adminBody = (await pa.locator('body').textContent()) || '';
assert(adminBody.includes('Messagerie profs'), 'page /admin/messagerie rendue (titre + entrée nav)');
assert(/v87/.test(adminBody), 'hint « migration v87 » affiché pré-migration (lecture défensive 42703)');
await pa.screenshot({ path: join(OUT, '4-admin-messagerie-hint-v87.png') });
await ctxAdmin.close();

await browser.close();
console.log(`\n${ko === 0 ? '✅' : '❌'} ${ok} assertions vertes, ${ko} rouges`);
if (consoleErrors.length) console.log('⚠️ erreurs console:', consoleErrors.slice(0, 5));
process.exit(ko === 0 ? 0 : 1);
