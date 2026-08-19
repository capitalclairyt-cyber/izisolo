/**
 * Preuve CHEMIN RÉEL v87 — messagerie support prof ↔ IziSolo, DEUX côtés.
 * À lancer APRÈS application de la migration v87 (le pré-migration se prouve
 * avec proof-v87-degrade.mjs).
 *
 * Déroulé (vrai navigateur sur dev local + DB réelle) :
 *   1. PROF (compte démo melutek) : ouvre le fil épinglé « Équipe IziSolo »
 *      (création réelle de la conversation) → envoie un message.
 *   2. DB : message sender_type='pro' + claim email `prof:<msgId>` vers
 *      bonjour@izisolo.fr qui PERSISTE (un claim libéré = envoi raté).
 *   3. ADMIN : /admin/messagerie liste le fil « à répondre » → ouvre → répond.
 *   4. DB : message sender_type='izisolo', support_admin_last_read_at posé,
 *      claim `reponse:<id>` vers l'email du compte prof qui persiste.
 *   5. PROF : badge non-lu sur le fil épinglé → ouvre → la réponse s'affiche
 *      signée « Équipe IziSolo ».
 *   6. MÉNAGE : conversation témoin supprimée (cascade) + claims purgés.
 *
 * ⚠️ 2 EMAILS RÉELS partent : la sonnette à bonjour@izisolo.fr et la réponse
 * à l'email du compte démo (bonjour@melutek.com).
 * Usage : node scripts/proof-v87-walkthrough.mjs [dossier-captures]
 */
import { createClient } from '@supabase/supabase-js';
import { readFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = process.cwd();
const OUT = process.argv[2] || join(process.env.TEMP || '.', 'proof-v87-walkthrough');
mkdirSync(OUT, { recursive: true });
const BASE = 'http://localhost:3333';
const PROF_EMAIL = 'bonjour@melutek.com';
const ADMIN_EMAIL = 'colin.boulgakoff@free.fr';
const SUPPORT_DEST = 'bonjour@izisolo.fr';

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

// Poll DB jusqu'à condition (les emails partent en after(), quelques secondes)
async function pollDb(label, fn, { tries = 15, delay = 2000 } = {}) {
  for (let i = 0; i < tries; i++) {
    const res = await fn();
    if (res) return res;
    await attendre(delay);
  }
  console.log(`  ⏱ poll épuisé : ${label}`);
  return null;
}

// ── Dev server prêt ──────────────────────────────────────────────────────────
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

const marqueur = `[preuve v87 · ${new Date().toISOString().slice(0, 16)}]`;
const msgProf = `${marqueur} Bonjour l'équipe, comment je paramètre mes rappels ?`;
const msgAdmin = `${marqueur} Bonjour ! Ça se passe dans Paramètres → Mes notifications 🌿`;

const profSession = await sessionCookies(PROF_EMAIL);
const profileId = profSession.userId;
const { data: profil } = await admin.from('profiles').select('studio_nom').eq('id', profileId).maybeSingle();
console.log(`👤 prof démo : ${profil?.studio_nom || '?'} (${profileId.slice(0, 8)}…)`);

// ═══ 1. PROF écrit ═══
console.log('\n— 1. La prof ouvre le fil et écrit —');
const ctxProf = await browser.newContext({ viewport: { width: 1280, height: 860 } });
await ctxProf.addCookies(profSession.cookies.map(c => ({ ...c, url: BASE, sameSite: 'Lax' })));
const pp = await ctxProf.newPage();
await pp.goto(`${BASE}/messagerie`, { waitUntil: 'domcontentloaded', timeout: 90000 });
await pp.waitForSelector('.conv-support', { timeout: 60000 });
await pp.waitForTimeout(1500); // hydratation
await pp.locator('.conv-support').click();
await pp.waitForSelector('.chat-room', { timeout: 30000 });
assert(((await pp.locator('.cr-title').textContent()) || '').includes('Équipe IziSolo'), 'fil ouvert, header « Équipe IziSolo » (conversation créée en vrai)');
assert(await pp.locator('.cr-title-row button').count() === 0, 'ni renommage ni suppression sur le fil support');

await pp.waitForTimeout(1000);
await pp.locator('.ci-textarea').click();
await pp.locator('.ci-textarea').fill(msgProf);
assert((await pp.locator('.ci-textarea').inputValue()) === msgProf, 'texte saisi (hydratation OK)');
await pp.locator('button.ci-send').click();
await pp.waitForSelector(`text=${marqueur} Bonjour l'équipe`, { timeout: 20000 });
assert(true, 'message envoyé et affiché dans le fil');
await pp.screenshot({ path: join(OUT, '1-prof-ecrit.png') });

// ═══ 2. DB : message + sonnette email ═══
console.log('\n— 2. DB : message pro + claim sonnette bonjour@ —');
const conv = await pollDb('conversation support', async () => {
  const { data } = await admin.from('conversations').select('id, support_admin_last_read_at').eq('profile_id', profileId).eq('type', 'support').maybeSingle();
  return data;
});
assert(!!conv, 'conversation type=support créée pour le studio démo');
assert(conv && conv.support_admin_last_read_at === null, 'support_admin_last_read_at naît NULL (jamais lu — anti-pattern §12 respecté)');

const msgRow = await pollDb('message prof', async () => {
  const { data } = await admin.from('messages').select('id, sender_type').eq('conversation_id', conv.id).eq('sender_type', 'pro').ilike('content', `%${marqueur}%`).maybeSingle();
  return data;
});
assert(!!msgRow, 'message enregistré en sender_type=pro');

const claimSonnette = await pollDb('claim sonnette', async () => {
  const { data } = await admin.from('emails_envoyes').select('id, created_at').eq('type', 'support_msg').eq('destinataire', SUPPORT_DEST).eq('ref', `prof:${msgRow?.id}`).maybeSingle();
  return data;
});
assert(!!claimSonnette, `sonnette email vers ${SUPPORT_DEST} : claim posé…`);
await attendre(6000); // un claim d'envoi RATÉ est libéré — persistance = envoi ok
const { data: claimEncore } = await admin.from('emails_envoyes').select('id').eq('type', 'support_msg').eq('destinataire', SUPPORT_DEST).eq('ref', `prof:${msgRow?.id}`).maybeSingle();
assert(!!claimEncore, '…et il PERSISTE (un claim libéré = envoi raté) → email réellement parti');

// ═══ 3. ADMIN voit et répond ═══
console.log('\n— 3. L\'équipe voit le fil et répond —');
const adminSession = await sessionCookies(ADMIN_EMAIL);
const ctxAdmin = await browser.newContext({ viewport: { width: 1280, height: 860 } });
await ctxAdmin.addCookies(adminSession.cookies.map(c => ({ ...c, url: BASE, sameSite: 'Lax' })));
const pa = await ctxAdmin.newPage();
await pa.goto(`${BASE}/admin/messagerie`, { waitUntil: 'domcontentloaded', timeout: 90000 });
await pa.waitForSelector(`text=${profil?.studio_nom}`, { timeout: 60000 });
const bodyListe = (await pa.locator('body').textContent()) || '';
assert(bodyListe.includes('à répondre'), 'badge « à répondre » sur le fil (non-lu admin)');
await pa.screenshot({ path: join(OUT, '2-admin-liste.png') });

await pa.locator(`button:has-text("${profil?.studio_nom}")`).first().click();
await pa.waitForSelector(`text=${marqueur} Bonjour l'équipe`, { timeout: 30000 });
assert(true, 'le fil affiche le message de la prof');

await pa.locator('textarea').fill(msgAdmin);
await pa.locator('button:has-text("Envoyer")').click();
await pa.waitForSelector(`text=${marqueur} Bonjour ! Ça se passe`, { timeout: 20000 });
assert(true, 'réponse de l\'équipe envoyée et affichée');
await pa.screenshot({ path: join(OUT, '3-admin-repond.png') });

// ═══ 4. DB : réponse izisolo + lecture + email prof ═══
console.log('\n— 4. DB : réponse izisolo + last_read + claim email prof —');
const replyRow = await pollDb('message izisolo', async () => {
  const { data } = await admin.from('messages').select('id, sender_type, sender_profile_id').eq('conversation_id', conv.id).eq('sender_type', 'izisolo').maybeSingle();
  return data;
});
assert(!!replyRow, 'réponse enregistrée en sender_type=izisolo');
assert(replyRow && replyRow.sender_profile_id === null, 'sender_profile_id NULL (c\'est l\'équipe, pas un compte)');

const { data: convApres } = await admin.from('conversations').select('support_admin_last_read_at').eq('id', conv.id).maybeSingle();
assert(!!convApres?.support_admin_last_read_at, 'répondre vaut lecture : support_admin_last_read_at posé');

const claimReponse = await pollDb('claim réponse', async () => {
  const { data } = await admin.from('emails_envoyes').select('id').eq('type', 'support_msg').eq('destinataire', PROF_EMAIL).eq('ref', `reponse:${replyRow?.id}`).maybeSingle();
  return data;
});
assert(!!claimReponse, `email « L'équipe IziSolo t'a répondu 🌿 » vers ${PROF_EMAIL} : claim posé…`);
await attendre(6000);
const { data: claimReponseEncore } = await admin.from('emails_envoyes').select('id').eq('type', 'support_msg').eq('destinataire', PROF_EMAIL).eq('ref', `reponse:${replyRow?.id}`).maybeSingle();
assert(!!claimReponseEncore, '…et il persiste → email réellement parti');

// ═══ 5. PROF reçoit ═══
console.log('\n— 5. La prof voit la réponse (badge + signature équipe) —');
const pp2 = await ctxProf.newPage();
await pp2.goto(`${BASE}/messagerie`, { waitUntil: 'domcontentloaded', timeout: 90000 });
await pp2.waitForSelector('.conv-support', { timeout: 60000 });
const badge = pp2.locator('.conv-support-badge');
assert(await badge.count() === 1 && parseInt(await badge.textContent(), 10) >= 1, 'badge non-lu sur le fil épinglé (countUnread compte la réponse izisolo)');
await pp2.screenshot({ path: join(OUT, '4-prof-badge-nonlu.png') });
await pp2.locator('.conv-support').click();
await pp2.waitForSelector(`text=${marqueur} Bonjour ! Ça se passe`, { timeout: 30000 });
assert(await pp2.locator('.msg-sender-izisolo').count() >= 1, 'réponse signée « 🌿 Équipe IziSolo » dans la bulle');
await pp2.screenshot({ path: join(OUT, '5-prof-recoit.png') });

await ctxProf.close();
await ctxAdmin.close();
await browser.close();

// ═══ 6. Ménage ═══
console.log('\n— 6. Ménage (conversation témoin + claims) —');
const { error: eDel } = await admin.from('conversations').delete().eq('id', conv.id);
assert(!eDel, 'conversation témoin supprimée (cascade messages + membres)');
await admin.from('emails_envoyes').delete().eq('type', 'support_msg').in('ref', [`prof:${msgRow?.id}`, `reponse:${replyRow?.id}`]);
console.log('  🧹 claims emails_envoyes purgés (les emails, eux, sont partis — c\'est la preuve)');

console.log(`\n${ko === 0 ? '✅' : '❌'} ${ok} assertions vertes, ${ko} rouges — captures dans ${OUT}`);
process.exit(ko === 0 ? 0 : 1);
