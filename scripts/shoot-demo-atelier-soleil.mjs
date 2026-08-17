/**
 * Captures du compte démo « L'Atelier Soleil » connecté, sur la prod.
 * Connexion via magic link admin (`generateLink` → `verifyOtp`, aucun mot de
 * passe touché) → cookie de session @supabase/ssr injecté (`base64-` + chunks
 * 3180) → captures Playwright sur https://www.izisolo.fr.
 * Usage : node scripts/shoot-demo-atelier-soleil.mjs <dossier-sortie>
 * ⚠️ Ouvrir une conversation la marque « lue » — remettre le non-lu ensuite si
 * besoin (UPDATE conversation_members.last_read_at du membre prof).
 */
import { createClient } from '@supabase/supabase-js';
import { readFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = process.cwd();
const env = Object.fromEntries(
  readFileSync(join(ROOT, '.env.local'), 'utf8')
    .split('\n').filter(l => l.includes('=') && !l.startsWith('#'))
    .map(l => [l.slice(0, l.indexOf('=')).trim(), l.slice(l.indexOf('=') + 1).trim()])
);
const OUT = process.argv[2] || join(ROOT, 'docs', 'shots-demo');
mkdirSync(OUT, { recursive: true });
const BASE = 'https://www.izisolo.fr';
const EMAIL = 'camille@atelier-soleil.fr';
const PROJECT_REF = new URL(env.NEXT_PUBLIC_SUPABASE_URL).hostname.split('.')[0];

// 1. Session via magic link admin → verifyOtp (ne touche pas au mot de passe)
const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
const { data: linkData, error: eLink } = await admin.auth.admin.generateLink({ type: 'magiclink', email: EMAIL });
if (eLink) { console.error('generateLink:', eLink.message); process.exit(1); }
const anon = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
const { data: otpData, error: eOtp } = await anon.auth.verifyOtp({ type: 'magiclink', token_hash: linkData.properties.hashed_token });
if (eOtp || !otpData?.session) { console.error('verifyOtp:', eOtp?.message || 'pas de session'); process.exit(1); }
const session = otpData.session;
console.log('🔑 session obtenue pour', session.user.email);

// 2. Cookies au format @supabase/ssr (préfixe base64-, chunks de 3180)
const cookieName = `sb-${PROJECT_REF}-auth-token`;
const value = 'base64-' + Buffer.from(JSON.stringify(session)).toString('base64url');
const cookies = [];
if (value.length <= 3180) {
  cookies.push({ name: cookieName, value });
} else {
  for (let i = 0; i * 3180 < value.length; i++) {
    cookies.push({ name: `${cookieName}.${i}`, value: value.slice(i * 3180, (i + 1) * 3180) });
  }
}
console.log(`🍪 ${cookies.length} cookie(s) (${value.length} car.)`);

// 3. Playwright
let chromium;
try { ({ chromium } = await import('playwright')); }
catch { ({ chromium } = await import('@playwright/test')); }
let browser;
try { browser = await chromium.launch(); }
catch { browser = await chromium.launch({ channel: 'msedge' }); }

const errorsConsole = [];
async function shoot(context, url, file, { full = true, before } = {}) {
  const page = await context.newPage();
  page.on('console', m => { if (m.type() === 'error') errorsConsole.push(`${url} → ${m.text().slice(0, 160)}`); });
  try {
    await page.goto(`${BASE}${url}`, { waitUntil: 'domcontentloaded', timeout: 45000 });
    await page.waitForTimeout(3000);
    if (before) { try { await before(page); } catch (e) { console.log(`   (interaction ${file} sautée : ${e.message.slice(0, 80)})`); } }
    await page.screenshot({ path: join(OUT, file), fullPage: full });
    console.log(`📸 ${file} — ${page.url().replace(BASE, '')}`);
    const finalUrl = page.url();
    await page.close();
    return finalUrl;
  } catch (e) {
    console.log(`❌ ${file} : ${e.message.slice(0, 120)}`);
    await page.close();
    return null;
  }
}

const ctx = await browser.newContext({ viewport: { width: 1280, height: 860 }, deviceScaleFactor: 1 });
await ctx.addCookies(cookies.map(c => ({ ...c, url: BASE, sameSite: 'Lax' })));

// Test de connexion
const landed = await shoot(ctx, '/dashboard', 'dashboard.png', {
  full: false,
  before: async (page) => {
    // Ouvre la cloche (déclenche /api/notifications/check → notifs dérivées)
    const bell = page.locator('button[aria-label*="otification" i], button:has(svg.lucide-bell), header button:has(svg)').first();
    await bell.click({ timeout: 4000 });
    await page.waitForTimeout(2500);
  },
});
if (!landed || landed.includes('/login')) {
  console.error('⚠️ Connexion échouée (redirigé vers /login) — captures dashboard impossibles.');
} else {
  await shoot(ctx, '/agenda', 'agenda.png', { full: false });
  await shoot(ctx, '/clients', 'clients.png');
  await shoot(ctx, '/messagerie', 'messagerie.png', {
    before: async (page) => { await page.getByText('Léa', { exact: false }).first().click({ timeout: 4000 }); await page.waitForTimeout(1500); },
  });
  await shoot(ctx, '/sondages', 'sondages.png', {
    before: async (page) => { await page.getByText('Nouveaux créneaux', { exact: false }).first().click({ timeout: 4000 }); await page.waitForTimeout(2000); },
  });
  await shoot(ctx, '/cas-a-traiter', 'cas-a-traiter.png');
  await shoot(ctx, '/essais', 'essais.png');
  await shoot(ctx, '/liste-attente', 'liste-attente.png');
  await shoot(ctx, '/revenus', 'revenus.png');
  await shoot(ctx, '/pointage', 'pointage.png');
  await shoot(ctx, '/cours', 'cours.png');
}
// Portail public (desktop + mobile, sans auth)
const pub = await browser.newContext({ viewport: { width: 1280, height: 860 } });
await shoot(pub, '/p/atelier-soleil', 'portail-desktop.png');
const mob = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
await shoot(mob, '/p/atelier-soleil', 'portail-mobile.png');

await browser.close();
if (errorsConsole.length) {
  console.log(`\n⚠️ ${errorsConsole.length} erreur(s) console :`);
  [...new Set(errorsConsole)].slice(0, 10).forEach(e => console.log('  ·', e));
} else {
  console.log('\n✅ zéro erreur console');
}
console.log('Sortie :', OUT);
