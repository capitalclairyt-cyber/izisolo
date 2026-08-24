/**
 * PREUVE — le Web Push est VIVANT de bout en bout (2026-08-23).
 *
 * L'enquête du jour : next-pwa@5.6 n'a JAMAIS enregistré le service worker en
 * App Router (son register vit dans l'entry `main` du Pages Router, chargée
 * par personne) → serviceWorker.ready pendait → PushToggle/PushPrompt
 * invisibles → 0 abonnement en prod depuis la naissance de la feature (v59).
 *
 * On prouve ici, contre le BUILD PROD LOCAL (:3334, npm run start, clés VAPID
 * de .env.local) et en session prof démo :
 *   1. Le SW s'enregistre et s'active à l'arrivée sur la page (RegisterSW).
 *   2. Le bouton « Activer les notifications » se REND enfin.
 *   3. Le clic crée un VRAI abonnement (permission accordée au contexte) et
 *      la ligne naît dans push_subscriptions (role prof).
 *   4. Un VRAI push part par web-push (VAPID) et le service worker AFFICHE la
 *      notification (registration.getNotifications() en témoigne).
 *   5. Purge : désabonnement navigateur + ligne DB supprimée.
 *
 * Prérequis : build à jour + serveur `npm run start -- -p 3334` lancé.
 */
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import webpush from 'web-push';

const BASE = process.env.SONDE_BASE || 'http://localhost:3334';
const env = Object.fromEntries(
  readFileSync(join(process.cwd(), '.env.local'), 'utf8')
    .split('\n').filter(l => l.includes('=') && !l.startsWith('#'))
    .map(l => [l.slice(0, l.indexOf('=')).trim(), l.slice(l.indexOf('=') + 1).trim()])
);
const PROJECT_REF = new URL(env.NEXT_PUBLIC_SUPABASE_URL).hostname.split('.')[0];
const svc = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

let ok = 0, ko = 0;
const c = (l, cond, d = '') => { if (cond) { ok++; console.log('  OK  ' + l + (d ? ' - ' + d : '')); } else { ko++; console.log('  KO  ' + l + (d ? ' - ' + d : '')); } };
const attendre = async (fn, ms = 20000, pas = 500) => {
  const fin = Date.now() + ms;
  for (;;) { const r = await fn(); if (r) return r; if (Date.now() > fin) return null; await new Promise(r2 => setTimeout(r2, pas)); }
};

// Session Camille.
const EMAIL = 'camille@atelier-soleil.fr';
const { data: linkData } = await svc.auth.admin.generateLink({ type: 'magiclink', email: EMAIL });
const anon = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
const { data: otp } = await anon.auth.verifyOtp({ type: 'magiclink', token_hash: linkData.properties.hashed_token });
const USER_ID = otp.user.id;
const value = 'base64-' + Buffer.from(JSON.stringify(otp.session)).toString('base64url');
const nm = `sb-${PROJECT_REF}-auth-token`;
const cookies = [];
if (value.length <= 3180) cookies.push({ name: nm, value });
else for (let i = 0; i * 3180 < value.length; i++) cookies.push({ name: `${nm}.${i}`, value: value.slice(i * 3180, (i + 1) * 3180) });

const purgeDB = async () => { await svc.from('push_subscriptions').delete().eq('user_id', USER_ID); };
await purgeDB(); // run précédent

let chromium; try { ({ chromium } = await import('playwright')); } catch { ({ chromium } = await import('@playwright/test')); }
// ⚠️ pushManager.subscribe exige un service push RÉEL (FCM), et Chrome le
// REFUSE en incognito — or un contexte Playwright éphémère EST de l'incognito
// (« Registration failed - permission denied », crbug 41124656). PROOF_HEADED=1
// ouvre donc un PROFIL PERSISTANT jetable, en fenêtré (~30 s), pour la preuve
// complète abonnement + envoi + réception ; sans lui, les phases 1-2 (SW +
// bouton rendu) restent prouvées et 3-4 échouent proprement.
const HEADED = process.env.PROOF_HEADED === '1';
const { mkdtempSync, rmSync } = await import('node:fs');
const { tmpdir } = await import('node:os');
let ctx, fermer, profilDir = null;
if (HEADED) {
  profilDir = mkdtempSync(join(tmpdir(), 'izi-push-proof-'));
  try { ctx = await chromium.launchPersistentContext(profilDir, { channel: 'msedge', headless: false }); }
  catch { ctx = await chromium.launchPersistentContext(profilDir, { headless: false }); }
  fermer = () => ctx.close();
} else {
  let browser; try { browser = await chromium.launch({ channel: 'msedge' }); } catch { browser = await chromium.launch(); }
  ctx = await browser.newContext();
  fermer = () => browser.close();
}

try {
  await ctx.grantPermissions(['notifications'], { origin: BASE });
  await ctx.addCookies(cookies.map(cc => ({ ...cc, url: BASE, sameSite: 'Lax' })));
  const page = HEADED ? (ctx.pages()[0] || await ctx.newPage()) : await ctx.newPage();
  page.on('console', m => { if (m.text().includes('[push-client]') || m.type() === 'error') console.log('  [console]', m.text().slice(0, 180)); });

  // ── 1. Le SW s'enregistre tout seul ────────────────────────────────────────
  console.log('\n— 1. RegisterSW : le service worker s\'active à l\'arrivée —');
  await page.goto(`${BASE}/parametres?tab=notifications`, { waitUntil: 'domcontentloaded', timeout: 120000 });
  await page.waitForSelector('text=Mes notifications', { timeout: 90000 });
  const swActif = await attendre(() => page.evaluate(async () => {
    const reg = await navigator.serviceWorker.getRegistration();
    return reg?.active ? reg.active.scriptURL : null;
  }), 30000);
  c('SW enregistré ET actif sans aucun geste', !!swActif, swActif || 'jamais actif');

  // ── 2. Le bouton se rend ───────────────────────────────────────────────────
  console.log('\n— 2. Le bouton « Activer les notifications » existe enfin —');
  const rendu = await attendre(async () => (await page.locator('.push-toggle').count()) > 0 ? true : null, 20000);
  c('PushToggle rendu', !!rendu);
  const label = rendu ? (await page.locator('.push-toggle').first().innerText()).trim() : '(absent)';
  c('il propose « Activer les notifications »', label === 'Activer les notifications', `« ${label} »`);

  // ── 3. Le clic crée un vrai abonnement ─────────────────────────────────────
  console.log('\n— 3. L\'activation crée l\'abonnement (DB) —');
  const btn = page.locator('.push-toggle').first();
  let messageAttenteVu = false;
  const active = await attendre(async () => {
    const t = (await btn.innerText().catch(() => '')).trim();
    if (t === 'Notifications activées') return true;
    // Depuis le retour Maude (2026-08-24) : si le SW précache encore, l'échec
    // n'est plus muet — le message « finit de s'installer » doit s'afficher.
    if (!messageAttenteVu) {
      const corps = await page.innerText('body').catch(() => '');
      if (corps.includes('finit de s\'installer')) {
        messageAttenteVu = true;
        console.log('  [info] ✓ le message « l\'appli finit de s\'installer » s\'affiche pendant l\'attente (plus d\'échec muet)');
      }
    }
    await btn.click().catch(() => {});
    await new Promise(r => setTimeout(r, 1200));
    return (await btn.innerText().catch(() => '')).trim() === 'Notifications activées' ? true : null;
  }, 90000, 400);
  c('le bouton passe « Notifications activées »', !!active);
  const ligne = await attendre(async () => {
    const { data } = await svc.from('push_subscriptions').select('id, role, email, endpoint').eq('user_id', USER_ID);
    return data?.length ? data[0] : null;
  });
  c('la ligne push_subscriptions est née', !!ligne, ligne ? `role=${ligne.role} · ${new URL(ligne.endpoint).hostname}` : 'aucune');

  // ── 4. Un vrai push part et le SW l'affiche ────────────────────────────────
  console.log('\n— 4. Envoi web-push réel → réception par le service worker —');
  if (ligne) {
    const { data: subFull } = await svc.from('push_subscriptions').select('endpoint, p256dh, auth').eq('id', ligne.id).single();
    webpush.setVapidDetails(env.VAPID_SUBJECT || 'mailto:bonjour@izisolo.fr', env.NEXT_PUBLIC_VAPID_PUBLIC_KEY, env.VAPID_PRIVATE_KEY);
    let statut = null;
    try {
      const r = await webpush.sendNotification(
        { endpoint: subFull.endpoint, keys: { p256dh: subFull.p256dh, auth: subFull.auth } },
        JSON.stringify({ title: 'Preuve IziSolo 🔔', body: 'Le push est vivant.', url: '/dashboard', tag: 'proof-push' })
      );
      statut = r.statusCode;
    } catch (e) { statut = e?.statusCode || String(e); }
    c('le service push accepte l\'envoi (201)', statut === 201, `statut ${statut}`);
    const recue = await attendre(() => page.evaluate(async () => {
      const reg = await navigator.serviceWorker.getRegistration();
      const notifs = await reg.getNotifications();
      return notifs.length ? { titre: notifs[0].title, corps: notifs[0].body } : null;
    }), 20000);
    c('le service worker AFFICHE la notification', !!recue, recue ? `« ${recue.titre} — ${recue.corps} »` : 'rien reçu');
  } else {
    c('envoi impossible sans abonnement', false);
  }

  // ── 5. Purge ───────────────────────────────────────────────────────────────
  await page.evaluate(async () => {
    const reg = await navigator.serviceWorker.getRegistration();
    const sub = await reg?.pushManager.getSubscription();
    if (sub) await sub.unsubscribe();
    (await reg?.getNotifications() || []).forEach(n => n.close());
  }).catch(() => {});
} finally {
  await fermer().catch(() => {});
  if (profilDir) { try { rmSync(profilDir, { recursive: true, force: true }); } catch {} }
  await purgeDB();
  console.log('\nTémoins purgés (abonnement DB + navigateur + profil jetable).');
}

console.log(`\nRésultat : ${ok} OK / ${ko} KO`);
process.exit(ko === 0 ? 0 : 1);
