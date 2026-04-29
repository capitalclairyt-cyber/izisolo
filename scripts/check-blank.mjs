/**
 * Diag : vérifier si les pages rendent leur contenu ou sont vides.
 * On teste les pages publiques + login redirect chain.
 */
import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(__dirname, '..', 'docs', 'screenshots', 'blank-check');
await mkdir(OUT, { recursive: true });

const PAGES = ['/', '/login', '/register', '/np-preview', '/components-showcase', '/test-tokens'];

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
const page = await ctx.newPage();

// Capture console errors
const errors = [];
page.on('console', (msg) => {
  if (msg.type() === 'error') errors.push(msg.text());
});
page.on('pageerror', (err) => errors.push('PAGEERR: ' + err.message));

for (const url of PAGES) {
  errors.length = 0;
  try {
    process.stdout.write(`${url} → `);
    await page.goto(`http://localhost:3333${url}`, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(800);
    const text = (await page.textContent('body'))?.slice(0, 100) || '';
    const slug = url.replace(/\//g, '_') || 'home';
    await page.screenshot({ path: `${OUT}/${slug}.jpg`, fullPage: false, type: 'jpeg', quality: 80 });
    console.log(`OK  text="${text.replace(/\s+/g, ' ').slice(0, 60)}"  errors=${errors.length}`);
    if (errors.length) errors.slice(0, 3).forEach(e => console.log('   ⚠', e.slice(0, 200)));
  } catch (e) {
    console.log('FAIL:', e.message);
  }
}

await browser.close();
console.log('done — screenshots in', OUT);
