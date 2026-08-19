/**
 * Preuve — accusé de lecture ADMIN (2026-08-19, demande Colin).
 * L'équipe écrit → « ✓ Envoyé » ; la prof ouvre son fil → « ✓✓ Lu » côté
 * admin. Côté prof : AUCUN accusé (vérifié). ⚠️ 1 email réel part (réponse
 * équipe → compte démo). Re-runnable (ménage préalable).
 * Usage : node scripts/proof-v87c-accuse-lecture.mjs [dossier-captures]
 */
import { createClient } from '@supabase/supabase-js';
import { readFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = process.cwd();
const OUT = process.argv[2] || join(process.env.TEMP || '.', 'proof-v87c');
mkdirSync(OUT, { recursive: true });
const BASE = 'http://localhost:3333';
const PROF_EMAIL = 'bonjour@melutek.com';
const ADMIN_EMAIL = 'colin.boulgakoff@free.fr';
const env = Object.fromEntries(readFileSync(join(ROOT, '.env.local'), 'utf8').split('\n').filter(l => l.includes('=') && !l.startsWith('#')).map(l => [l.slice(0, l.indexOf('=')).trim(), l.slice(l.indexOf('=') + 1).trim()]));
const PROJECT_REF = new URL(env.NEXT_PUBLIC_SUPABASE_URL).hostname.split('.')[0];
const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
let ok = 0, ko = 0;
const assert = (c, l) => { if (c) { ok++; console.log(`  ✅ ${l}`); } else { ko++; console.log(`  ❌ ${l}`); } };
const attendre = ms => new Promise(r => setTimeout(r, ms));

async function sessionCookies(email) {
  const { data: linkData, error: eL } = await admin.auth.admin.generateLink({ type: 'magiclink', email });
  if (eL) throw new Error(eL.message);
  const anon = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: otp, error: eO } = await anon.auth.verifyOtp({ type: 'magiclink', token_hash: linkData.properties.hashed_token });
  if (eO || !otp?.session) throw new Error(eO?.message || 'pas de session');
  const value = 'base64-' + Buffer.from(JSON.stringify(otp.session)).toString('base64url');
  const name = `sb-${PROJECT_REF}-auth-token`;
  const cookies = [];
  if (value.length <= 3180) cookies.push({ name, value });
  else for (let i = 0; i * 3180 < value.length; i++) cookies.push({ name: `${name}.${i}`, value: value.slice(i * 3180, (i + 1) * 3180) });
  return { cookies, userId: otp.session.user.id };
}

for (let i = 0; i < 60; i++) {
  try { const r = await fetch(`${BASE}/login`); if (r.ok) break; } catch { /* pas prêt */ }
  await attendre(2000);
}
console.log('🌐 dev server prêt');

const profSession = await sessionCookies(PROF_EMAIL);
const profId = profSession.userId;
await admin.from('conversations').delete().eq('profile_id', profId).eq('type', 'support');
await admin.from('emails_envoyes').delete().eq('type', 'support_msg').eq('destinataire', PROF_EMAIL);
console.log('🧹 témoins purgés');

let chromium; try { ({ chromium } = await import('playwright')); } catch { ({ chromium } = await import('@playwright/test')); }
let browser; try { browser = await chromium.launch(); } catch { browser = await chromium.launch({ channel: 'msedge' }); }

// 1. Admin écrit → ✓ Envoyé
console.log('\n— 1. L\'équipe écrit → « ✓ Envoyé » —');
const adminSession = await sessionCookies(ADMIN_EMAIL);
const ctxA = await browser.newContext({ viewport: { width: 1280, height: 900 } });
await ctxA.addCookies(adminSession.cookies.map(c => ({ ...c, url: BASE, sameSite: 'Lax' })));
const pa = await ctxA.newPage();
await pa.goto(`${BASE}/admin/messagerie?studio=${profId}`, { waitUntil: 'domcontentloaded', timeout: 90000 });
await pa.waitForSelector('textarea', { timeout: 60000 });
await pa.locator('textarea').fill('[preuve v87c] Petit message pour tester la lecture 🌿');
await pa.locator('button:has-text("Envoyer")').click();
await pa.waitForSelector('text=[preuve v87c]', { timeout: 20000 });
await pa.waitForSelector('text=✓ Envoyé', { timeout: 15000 });
assert(true, 'bulle équipe marquée « ✓ Envoyé » (la prof n\'a pas encore ouvert)');
await pa.screenshot({ path: join(OUT, '1-envoye-non-lu.png') });

const { data: conv } = await admin.from('conversations').select('id').eq('profile_id', profId).eq('type', 'support').single();

// 2. La prof ouvre son fil (markRead)
console.log('\n— 2. La prof ouvre le fil (côté elle : AUCUN accusé) —');
const ctxP = await browser.newContext({ viewport: { width: 1280, height: 900 } });
await ctxP.addCookies(profSession.cookies.map(c => ({ ...c, url: BASE, sameSite: 'Lax' })));
const pp = await ctxP.newPage();
await pp.goto(`${BASE}/messagerie?conv=${conv.id}`, { waitUntil: 'domcontentloaded', timeout: 90000 });
await pp.waitForSelector('text=[preuve v87c]', { timeout: 60000 });
await attendre(3000); // markRead posté par ChatRoom
const bodyProf = (await pp.locator('body').textContent()) || '';
assert(!bodyProf.includes('✓✓') && !bodyProf.includes('✓ Envoyé'), 'côté PROF : aucun accusé de lecture (réservé admin)');
await pp.screenshot({ path: join(OUT, '2-prof-ouvre-sans-accuse.png') });
await ctxP.close();

// 3. Côté admin : ✓✓ Lu (au poll suivant / reload)
console.log('\n— 3. Côté admin : « ✓✓ Lu » —');
const pa2 = await ctxA.newPage();
await pa2.goto(`${BASE}/admin/messagerie?studio=${profId}`, { waitUntil: 'domcontentloaded', timeout: 90000 });
await pa2.waitForSelector('text=✓✓ Lu', { timeout: 30000 });
assert(true, 'bulle équipe passée « ✓✓ Lu » après ouverture par la prof');
await pa2.screenshot({ path: join(OUT, '3-lu-par-la-prof.png') });
await ctxA.close();
await browser.close();

// 4. Ménage
await admin.from('conversations').delete().eq('id', conv.id);
await admin.from('emails_envoyes').delete().eq('type', 'support_msg').eq('destinataire', PROF_EMAIL);
console.log('\n🧹 conv témoin + claims purgés');
console.log(`\n${ko === 0 ? '✅' : '❌'} ${ok} assertions vertes, ${ko} rouges — captures dans ${OUT}`);
process.exit(ko === 0 ? 0 : 1);
