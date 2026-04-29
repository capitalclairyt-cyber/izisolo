/**
 * Visual check du BottomDock après fix Tailwind.
 * Capture le composants-showcase + le test-tokens (publics, pas besoin d'auth).
 */
import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(__dirname, '..', 'docs', 'screenshots', 'bigbang');
await mkdir(OUT, { recursive: true });

const browser = await chromium.launch();

// Mobile viewport
const ctxMobile = await browser.newContext({ viewport: { width: 390, height: 844 } });
const pageMobile = await ctxMobile.newPage();

const PAGES = [
  { url: '/np-preview',          name: 'np-preview' },
  { url: '/components-showcase', name: 'showcase' },
];

for (const p of PAGES) {
  try {
    process.stdout.write(`mobile ${p.url} → `);
    await pageMobile.goto(`http://localhost:3333${p.url}`, { waitUntil: 'networkidle', timeout: 60000 });
    await pageMobile.waitForTimeout(1500);
    await pageMobile.screenshot({ path: `${OUT}/${p.name}-mobile.jpg`, fullPage: true, type: 'jpeg', quality: 80 });
    console.log('ok');
  } catch (e) {
    console.log('FAIL:', e.message);
  }
}

await browser.close();
console.log('Saved to', OUT);
