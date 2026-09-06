/**
 * Visuels produit de la LANDING v3 (2026-09-06) — cinq captures RÉELLES prises
 * sur le compte démo « L'Atelier Soleil » fraîchement refreshé, contre la PROD,
 * recadrées et compressées pour la page d'accueil. Même discipline que les
 * illustrations du guide (shoot-aide-illustrations.mjs) : elles se REFONT
 * quand l'UI d'un écran montré change.
 *
 *   hero-pointage.jpg   le pointage d'une séance, sur mobile (LE visuel du hero)
 *   row-agenda.jpg      l'agenda en vue semaine, desktop
 *   row-portail.jpg     le planning du portail public, mobile
 *   row-revenus.jpg     la page Revenus sur 3 mois, desktop
 *   row-messagerie.jpg  le canal « Yoga Pleine Lune » avec la photo de Maude, mobile
 *
 * Sortie : public/icons/landing/*.jpg + manifest.json (dimensions pour next/image).
 * ⚠️ /public/icons/ est le SEUL dossier public servi (proxy default-deny, §12).
 *
 * ZÉRO ÉCRITURE côté données, à une exception près et assumée : ouvrir le canal
 * pleine lune le marque « lu » par la prof (c'est déjà le cas dans le seed).
 * Aucune séance pointée, aucun formulaire validé.
 *
 * Prérequis : node scripts/refresh-demo-atelier-soleil.mjs (le pointage capturé
 * est une séance PASSÉE du seed, donc déjà pointée ; la conversation pleine lune
 * vient du seed aussi). Re-runnable à volonté.
 * Usage : node scripts/shoot-landing-visuels.mjs
 */
import { createClient } from '@supabase/supabase-js';
import sharp from 'sharp';
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = process.cwd();
const env = Object.fromEntries(
  readFileSync(join(ROOT, '.env.local'), 'utf8')
    .split('\n').filter(l => l.includes('=') && !l.startsWith('#'))
    .map(l => [l.slice(0, l.indexOf('=')).trim(), l.slice(l.indexOf('=') + 1).trim()])
);
const OUT = join(ROOT, 'public', 'icons', 'landing');
mkdirSync(OUT, { recursive: true });
const BASE = process.env.SHOOT_BASE || 'https://www.izisolo.fr';
const EMAIL = 'camille@atelier-soleil.fr';
const PROFILE_ID = '17a6194a-87e6-47e2-ac31-c6224cd78f44';
const SLUG = 'atelier-soleil';
const PROJECT_REF = new URL(env.NEXT_PUBLIC_SUPABASE_URL).hostname.split('.')[0];

// ── Session démo : magic link admin → verifyOtp → cookie @supabase/ssr ──────
const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
const { data: linkData, error: eLink } = await admin.auth.admin.generateLink({ type: 'magiclink', email: EMAIL });
if (eLink) { console.error('generateLink:', eLink.message); process.exit(1); }
const anon = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
const { data: otpData, error: eOtp } = await anon.auth.verifyOtp({ type: 'magiclink', token_hash: linkData.properties.hashed_token });
if (eOtp || !otpData?.session) { console.error('verifyOtp:', eOtp?.message || 'pas de session'); process.exit(1); }
const cookieName = `sb-${PROJECT_REF}-auth-token`;
const value = 'base64-' + Buffer.from(JSON.stringify(otpData.session)).toString('base64url');
const cookies = [];
if (value.length <= 3180) cookies.push({ name: cookieName, value });
else for (let i = 0; i * 3180 < value.length; i++) cookies.push({ name: `${cookieName}.${i}`, value: value.slice(i * 3180, (i + 1) * 3180) });
console.log('🔑 session démo obtenue');

// ── Ce qu'on photographie : lu en base, jamais codé en dur ──────────────────
const today = new Date().toLocaleDateString('sv-SE', { timeZone: 'Europe/Paris' });
// Le pointage : la dernière séance PASSÉE « Reformer » (petit groupe, déjà
// pointée par le seed → six présentes, la liste tient dans un écran de téléphone).
const { data: reformer } = await admin.from('cours').select('id, nom, date')
  .eq('profile_id', PROFILE_ID).lt('date', today).ilike('nom', 'Reformer%').eq('est_annule', false)
  .order('date', { ascending: false }).limit(1).single();
if (!reformer) { console.error('Aucune séance Reformer passée : lancer le refresh du démo'); process.exit(1); }
const { data: conv } = await admin.from('conversations').select('id')
  .eq('profile_id', PROFILE_ID).ilike('titre', '%lune%').limit(1).single();
if (!conv) { console.error('Canal pleine lune absent : lancer le refresh du démo'); process.exit(1); }
console.log(`📅 pointage : ${reformer.nom} du ${reformer.date} · 💬 canal ${conv.id.slice(0, 8)}`);

// ── Playwright ──────────────────────────────────────────────────────────────
let chromium;
try { ({ chromium } = await import('playwright')); } catch { ({ chromium } = await import('@playwright/test')); }
let browser;
try { browser = await chromium.launch(); } catch { browser = await chromium.launch({ channel: 'msedge' }); }

const HIDE = `
  [class*="fab" i], [class*="feedback" i] { display: none !important; }
`;
const manifest = {};
let ok = 0, ko = 0;

/** Ouvre une page, cache le FAB, rend le buffer PNG de la zone demandée. */
async function capture(ctx, url, { clip, prepare, fullPage = false } = {}) {
  const page = await ctx.newPage();
  await page.goto(`${BASE}${url}`, { waitUntil: 'networkidle', timeout: 60000 }).catch(() => {});
  await page.waitForTimeout(2500);
  await page.addStyleTag({ content: HIDE });
  let clipBox = clip;
  if (prepare) clipBox = (await prepare(page)) || clip;
  await page.waitForTimeout(400);
  const buf = await page.screenshot({ fullPage, clip: clipBox });
  await page.close();
  return buf;
}

/** Recadre (en px de capture) puis écrit un JPEG de largeur donnée. */
async function ecrire(id, buf, { extract, width, quality = 80 }) {
  try {
    let img = sharp(buf);
    if (extract) img = img.extract(extract);
    const info = await img.resize({ width }).jpeg({ quality, mozjpeg: true }).toFile(join(OUT, `${id}.jpg`));
    manifest[id] = { w: info.width, h: info.height };
    console.log(`📸 ${id}.jpg ${info.width}×${info.height} · ${Math.round(info.size / 1024)} Ko`);
    ok++;
  } catch (e) {
    console.log(`❌ ${id} : ${e.message.slice(0, 120)}`);
    ko++;
  }
}

const desk = await browser.newContext({ viewport: { width: 1280, height: 820 }, deviceScaleFactor: 2, locale: 'fr-FR' });
await desk.addCookies(cookies.map(c => ({ ...c, url: BASE, sameSite: 'Lax' })));
const mob = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true, locale: 'fr-FR' });
await mob.addCookies(cookies.map(c => ({ ...c, url: BASE, sameSite: 'Lax' })));
const pub = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true, locale: 'fr-FR' });

// Sur mobile, le bouton burger flotte en haut à gauche : on le cache pour les
// visuels qui commencent sous lui (il n'appartient pas à l'écran montré).
const cacherBurger = async (page) => {
  await page.evaluate(() => {
    for (const el of document.querySelectorAll('button, a')) {
      const r = el.getBoundingClientRect();
      const st = getComputedStyle(el);
      if (st.position === 'fixed' && r.top < 150 && r.left < 150 && r.width < 140) el.style.visibility = 'hidden';
    }
  });
};

// 1. HERO — le pointage sur mobile, de la ligne titre à la 3e élève
await ecrire('hero-pointage', await capture(mob, `/pointage/${reformer.id}`, { prepare: cacherBurger }),
  { extract: { left: 0, top: 200, width: 1170, height: 2332 }, width: 640 });

// 2. AGENDA — vue semaine, zone de contenu (sans la barre latérale)
await ecrire('row-agenda', await capture(desk, '/agenda', { clip: { x: 230, y: 10, width: 1050, height: 320 } }),
  { width: 1400 });

// 3. PORTAIL — le planning public, à partir des onglets (Cours / À propos / Tarifs / Infos)
await ecrire('row-portail', await capture(pub, `/p/${SLUG}`, {
  fullPage: true,
  prepare: async (page) => {
    // Le seuil du planning : l'onglet « À propos ». On cadre 12 px au-dessus, sur
    // une hauteur d'écran de téléphone (813 px CSS = 2439 px capturés).
    const total = await page.evaluate(() => document.body.scrollHeight);
    for (let y = 0; y < total; y += 600) { await page.evaluate(v => window.scrollTo(0, v), y); await page.waitForTimeout(120); }
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(500);
    const y = await page.evaluate(() => {
      // L'onglet porte une icône : on lit le texte, pas la feuille.
      const el = [...document.querySelectorAll('button, a')].find(e => e.textContent.replace(/\s+/g, ' ').trim() === 'À propos');
      return el ? el.getBoundingClientRect().top + window.scrollY : null;
    });
    if (y == null) throw new Error("onglet « À propos » introuvable sur le portail");
    return { x: 0, y: Math.max(0, y - 12), width: 390, height: 813 };
  },
}), { width: 600 });

// 4. REVENUS — l'onglet « 3 derniers mois » (le mois courant, tôt dans le mois, ne montre rien)
await ecrire('row-revenus', await capture(desk, '/revenus', {
  prepare: async (page) => {
    await page.getByRole('button', { name: '3 derniers mois' }).click();
    await page.waitForTimeout(2000);
    return { x: 230, y: 10, width: 1050, height: 590 };
  },
}), { width: 1400 });

// 5. MESSAGERIE — le canal pleine lune déroulé jusqu'aux dernières réponses
await ecrire('row-messagerie', await capture(mob, `/messagerie?conv=${conv.id}`, {
  prepare: async (page) => {
    await page.waitForTimeout(1500);
    await page.evaluate(() => {
      for (const el of document.querySelectorAll('*')) {
        const st = getComputedStyle(el);
        if ((st.overflowY === 'auto' || st.overflowY === 'scroll') && el.scrollHeight > el.clientHeight + 20) el.scrollTop = el.scrollHeight;
      }
      window.scrollTo(0, document.body.scrollHeight);
    });
    await page.waitForTimeout(800);
    await cacherBurger(page);
  },
}), { extract: { left: 0, top: 100, width: 1170, height: 2110 }, width: 600 });

await browser.close();
writeFileSync(join(OUT, 'manifest.json'), JSON.stringify(manifest, null, 2));
console.log(`\n${ok} visuel(s), ${ko} échec(s) — manifest écrit.`);
process.exit(ko ? 1 : 0);
