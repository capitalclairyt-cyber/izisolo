/**
 * Preuve v87b — l'équipe INITIE la conversation (2026-08-19, retour Colin :
 * « je suis obligé d'attendre qu'elle écrive »).
 *
 * Déroulé (vrai navigateur sur dev local + DB réelle) :
 *   1. Un feedback témoin est posé pour le studio démo → /admin/feedbacks
 *      affiche le bouton « 💬 Répondre » → clic → /admin/messagerie?studio=X
 *      ouvre LE fil de cette prof (créé à la volée).
 *   2. L'équipe écrit → message izisolo + claim email persistant (variante
 *      « t'a écrit », premier contact).
 *   3. Le picker « ✉️ Écrire à une prof » retombe sur le MÊME fil (idempotent,
 *      le message y est déjà).
 *   4. Côté prof : badge non-lu sur le fil épinglé + aperçu du message.
 *   5. Ménage : feedback témoin + conversation + claims purgés.
 *
 * ⚠️ 1 EMAIL RÉEL part (« L'équipe IziSolo t'a écrit 🌿 » au compte démo).
 * Usage : node scripts/proof-v87b-admin-initie.mjs [dossier-captures]
 */
import { createClient } from '@supabase/supabase-js';
import { readFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = process.cwd();
const OUT = process.argv[2] || join(process.env.TEMP || '.', 'proof-v87b');
mkdirSync(OUT, { recursive: true });
const BASE = 'http://localhost:3333';
const PROF_EMAIL = 'bonjour@melutek.com';
const ADMIN_EMAIL = 'colin.boulgakoff@free.fr';

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
const attendre = ms => new Promise(r => setTimeout(r, ms));

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

async function pollDb(label, fn, { tries = 15, delay = 2000 } = {}) {
  for (let i = 0; i < tries; i++) {
    const res = await fn();
    if (res) return res;
    await attendre(delay);
  }
  console.log(`  ⏱ poll épuisé : ${label}`);
  return null;
}

for (let i = 0; i < 60; i++) {
  try { const r = await fetch(`${BASE}/login`); if (r.ok) break; } catch { /* pas prêt */ }
  await attendre(2000);
  if (i === 59) { console.error('dev server injoignable'); process.exit(1); }
}
console.log('🌐 dev server prêt');

let chromium;
try { ({ chromium } = await import('playwright')); }
catch { ({ chromium } = await import('@playwright/test')); }
let browser;
try { browser = await chromium.launch(); }
catch { browser = await chromium.launch({ channel: 'msedge' }); }

const marqueur = `[preuve v87b · ${new Date().toISOString().slice(0, 16)}]`;
const profSession = await sessionCookies(PROF_EMAIL);
const profileId = profSession.userId;
const { data: profil } = await admin.from('profiles').select('studio_nom').eq('id', profileId).maybeSingle();
console.log(`👤 prof démo : ${profil?.studio_nom} (${profileId.slice(0, 8)}…)`);

// ═══ 0a. Ménage préalable (re-runnable : un run crashé laisse ses témoins) ═══
await admin.from('feedback').delete().eq('user_id', profileId).ilike('message', '[preuve v87b%');
await admin.from('conversations').delete().eq('profile_id', profileId).eq('type', 'support');
await admin.from('emails_envoyes').delete().eq('type', 'support_msg').eq('destinataire', PROF_EMAIL);
console.log('🧹 témoins d\'un éventuel run précédent purgés');

// ═══ 0. Feedback témoin ═══
const { data: fb, error: eFb } = await admin.from('feedback')
  .insert({ user_id: profileId, type: 'manque', message: `${marqueur} je voudrais pouvoir dupliquer un atelier`, status: 'new' })
  .select('id').single();
if (eFb) { console.error('insert feedback:', eFb.message); process.exit(1); }
console.log('📝 feedback témoin posé');

// ═══ 1. /admin/feedbacks → bouton Répondre → fil ouvert ═══
console.log('\n— 1. Feedback → « 💬 Répondre » → le fil de la prof s\'ouvre —');
const adminSession = await sessionCookies(ADMIN_EMAIL);
const ctxAdmin = await browser.newContext({ viewport: { width: 1280, height: 860 } });
await ctxAdmin.addCookies(adminSession.cookies.map(c => ({ ...c, url: BASE, sameSite: 'Lax' })));
const pa = await ctxAdmin.newPage();
await pa.goto(`${BASE}/admin/feedbacks`, { waitUntil: 'domcontentloaded', timeout: 90000 });
const carte = pa.locator('.admin-card', { hasText: marqueur });
await carte.waitFor({ timeout: 60000 });
const btnRepondre = carte.locator('a:has-text("Répondre")');
assert(await btnRepondre.count() === 1, 'bouton « 💬 Répondre » sur le feedback');
await pa.screenshot({ path: join(OUT, '1-feedback-bouton.png') });
await btnRepondre.click();
await pa.waitForURL('**/admin/messagerie**', { timeout: 30000 });
await pa.waitForSelector(`text=${profil?.studio_nom}`, { timeout: 60000 });
assert(true, `le fil « ${profil?.studio_nom} » s'ouvre (conversation créée à la volée)`);
await pa.screenshot({ path: join(OUT, '2-fil-ouvert-depuis-feedback.png') });

// ═══ 2. L'équipe écrit la première ═══
console.log('\n— 2. L\'équipe écrit (premier contact) —');
await pa.locator('textarea').fill(`${marqueur} Bonjour ! On a bien vu ton retour sur la duplication, on y travaille.`);
await pa.locator('button:has-text("Envoyer")').click();
await pa.waitForSelector(`text=${marqueur} Bonjour ! On a bien vu`, { timeout: 20000 });
assert(true, 'message envoyé et affiché');

const conv = await pollDb('conversation', async () => {
  const { data } = await admin.from('conversations').select('id').eq('profile_id', profileId).eq('type', 'support').maybeSingle();
  return data;
});
assert(!!conv, 'conversation support créée par l\'ADMIN (sans attendre la prof)');
const msgRow = await pollDb('message izisolo', async () => {
  const { data } = await admin.from('messages').select('id').eq('conversation_id', conv.id).eq('sender_type', 'izisolo').ilike('content', `%${marqueur}%`).maybeSingle();
  return data;
});
assert(!!msgRow, 'message enregistré en sender_type=izisolo');
const claim = await pollDb('claim email', async () => {
  const { data } = await admin.from('emails_envoyes').select('id').eq('type', 'support_msg').eq('destinataire', PROF_EMAIL).eq('ref', `reponse:${msgRow?.id}`).maybeSingle();
  return data;
});
assert(!!claim, 'claim email « t\'a écrit » posé…');
await attendre(6000);
const { data: claimEncore } = await admin.from('emails_envoyes').select('id').eq('type', 'support_msg').eq('destinataire', PROF_EMAIL).eq('ref', `reponse:${msgRow?.id}`).maybeSingle();
assert(!!claimEncore, '…et il persiste → email réellement parti');

// ═══ 3. Le picker retombe sur le MÊME fil ═══
console.log('\n— 3. « ✉️ Écrire à une prof » (picker) → même fil, idempotent —');
const pa2 = await ctxAdmin.newPage();
await pa2.goto(`${BASE}/admin/messagerie`, { waitUntil: 'domcontentloaded', timeout: 90000 });
await pa2.waitForSelector('button:has-text("Écrire à une prof")', { timeout: 60000 });
// Clic-sonde d'hydratation (piège connu) : le bouton est dans le DOM avant
// que React ne branche son onClick — on re-clique jusqu'à ce que le panneau
// (select ou « Chargement ») apparaisse.
for (let i = 0; i < 8; i++) {
  await pa2.locator('button:has-text("Écrire à une prof")').click();
  try {
    await pa2.waitForSelector('select, span:has-text("Chargement des studios")', { timeout: 2500 });
    break;
  } catch { /* pas encore hydraté : on re-cliquera */ }
}
await pa2.waitForSelector('select', { timeout: 30000 });
await pa2.locator('select').selectOption(profileId);
await pa2.locator('button:has-text("Ouvrir le fil")').click();
await pa2.waitForSelector(`text=${marqueur} Bonjour ! On a bien vu`, { timeout: 30000 });
assert(true, 'le picker ouvre le MÊME fil (le message y est déjà — pas de doublon de conversation)');
const { count: nbConvs } = await admin.from('conversations').select('id', { count: 'exact', head: true }).eq('profile_id', profileId).eq('type', 'support');
assert(nbConvs === 1, 'une seule conversation support pour ce studio en DB');
await pa2.screenshot({ path: join(OUT, '3-picker-meme-fil.png') });

// ═══ 4. Côté prof : badge non-lu + aperçu ═══
console.log('\n— 4. Côté prof : le fil épinglé annonce le message —');
const ctxProf = await browser.newContext({ viewport: { width: 1280, height: 860 } });
await ctxProf.addCookies(profSession.cookies.map(c => ({ ...c, url: BASE, sameSite: 'Lax' })));
const pp = await ctxProf.newPage();
await pp.goto(`${BASE}/messagerie`, { waitUntil: 'domcontentloaded', timeout: 90000 });
await pp.waitForSelector('.conv-support', { timeout: 60000 });
const badge = pp.locator('.conv-support-badge');
assert(await badge.count() === 1 && parseInt(await badge.textContent(), 10) >= 1, 'badge non-lu sur le fil épinglé');
assert(((await pp.locator('.conv-support-preview').textContent()) || '').includes('Bonjour ! On a bien vu'), 'aperçu du message de l\'équipe');
await pp.screenshot({ path: join(OUT, '4-prof-badge.png') });

await ctxAdmin.close();
await ctxProf.close();
await browser.close();

// ═══ 5. Ménage ═══
console.log('\n— 5. Ménage —');
const { error: eDelFb } = await admin.from('feedback').delete().eq('id', fb.id);
const { error: eDelConv } = await admin.from('conversations').delete().eq('id', conv.id);
await admin.from('emails_envoyes').delete().eq('type', 'support_msg').eq('ref', `reponse:${msgRow?.id}`);
assert(!eDelFb && !eDelConv, 'feedback témoin + conversation + claims purgés');

console.log(`\n${ko === 0 ? '✅' : '❌'} ${ok} assertions vertes, ${ko} rouges — captures dans ${OUT}`);
process.exit(ko === 0 ? 0 : 1);
