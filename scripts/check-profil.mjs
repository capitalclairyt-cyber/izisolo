import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(__dirname, '..', 'docs', 'screenshots', 'bigbang');
await mkdir(OUT, { recursive: true });

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 480, height: 1000 } });
const page = await ctx.newPage();

// Open dashboard view
await page.goto('http://localhost:3333/np-preview', { waitUntil: 'networkidle' });
await page.waitForTimeout(800);
await page.screenshot({ path: `${OUT}/np-dash.jpg`, fullPage: true, type: 'jpeg', quality: 85 });

// Click "Profil" toggle
await page.click('button:has-text("Profil")');
await page.waitForTimeout(800);
await page.screenshot({ path: `${OUT}/np-profil.jpg`, fullPage: true, type: 'jpeg', quality: 85 });

// Click "+" central to open sheet
await page.click('button:has-text("Dashboard")');
await page.waitForTimeout(500);
await page.click('button[aria-label="Nouveau"]');
await page.waitForTimeout(800);
await page.screenshot({ path: `${OUT}/np-sheet.jpg`, fullPage: true, type: 'jpeg', quality: 85 });

await browser.close();
console.log('Saved to', OUT);
