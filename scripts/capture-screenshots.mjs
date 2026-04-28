/**
 * scripts/capture-screenshots.mjs
 * ─────────────────────────────────────────────────────────────────
 * Capture des screenshots de toutes les pages publiques pour DESIGN-REVIEW.md.
 *
 * Pré-requis : dev server tournant sur http://localhost:3333.
 * Lancer : node scripts/capture-screenshots.mjs
 *
 * Sortie : docs/screenshots/{name}-{viewport}.png
 * ─────────────────────────────────────────────────────────────────
 */

import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = resolve(__dirname, '..', 'docs', 'screenshots');
const BASE = process.env.BASE_URL || 'http://localhost:3333';

const VIEWPORTS = [
  { name: 'desktop', width: 1280, height: 800 },
  { name: 'mobile',  width: 390,  height: 844 },
];

// Format de sortie : JPEG quality 80 = bon compromis taille/qualité (~150-300 Ko/page).
// Si tu veux du PNG retina pour un export final, mets EXT='png' et deviceScaleFactor=2.
const EXT = 'jpg';
const QUALITY = 80;
const SCALE = 1;

const PAGES = [
  { slug: 'landing',           url: '/' },
  { slug: 'seo-yoga',          url: '/profs-de-yoga' },
  { slug: 'seo-pilates',       url: '/profs-de-pilates' },
  { slug: 'seo-coachs',        url: '/coachs-bien-etre' },
  { slug: 'seo-therapeutes',   url: '/therapeutes' },
  { slug: 'login',             url: '/login' },
  { slug: 'register',          url: '/register' },
  { slug: 'mot-de-passe',      url: '/mot-de-passe-oublie' },
  { slug: 'legal-cgu',         url: '/legal/cgu' },
  { slug: 'legal-cgv',         url: '/legal/cgv' },
  { slug: 'legal-mentions',    url: '/legal/mentions' },
  { slug: 'legal-rgpd',        url: '/legal/rgpd' },
];

async function main() {
  await mkdir(OUT_DIR, { recursive: true });
  const browser = await chromium.launch();

  for (const viewport of VIEWPORTS) {
    const context = await browser.newContext({
      viewport: { width: viewport.width, height: viewport.height },
      deviceScaleFactor: SCALE,
    });
    const page = await context.newPage();

    for (const p of PAGES) {
      const target = `${BASE}${p.url}`;
      const file = `${OUT_DIR}/${p.slug}-${viewport.name}.${EXT}`;
      try {
        process.stdout.write(`  ${viewport.name}  ${p.url} → `);
        await page.goto(target, { waitUntil: 'networkidle', timeout: 30000 });
        await page.waitForTimeout(800);
        await page.screenshot({
          path: file,
          fullPage: true,
          type: EXT === 'jpg' ? 'jpeg' : 'png',
          ...(EXT === 'jpg' ? { quality: QUALITY } : {}),
        });
        console.log('ok');
      } catch (err) {
        console.log('FAIL:', err.message);
      }
    }
    await context.close();
  }

  await browser.close();
  console.log('\nDone. Screenshots saved in docs/screenshots/');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
