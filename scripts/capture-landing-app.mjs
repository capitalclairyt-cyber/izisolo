/**
 * scripts/capture-landing-app.mjs
 * ─────────────────────────────────────────────────────────────────
 * Capture des 6 vraies vues de l'app pour la landing publique.
 * Remplace les `screen-1.png` / `screen-2.png` / `screen-3.png` génériques
 * par des captures d'un compte de démo réaliste.
 *
 * Pré-requis :
 *   1. Le seed a été appliqué : `seed-demo-bonjour.sql` exécuté dans
 *      Supabase SQL Editor (compte `bonjour@melutek.com`).
 *   2. Le dev server tourne sur http://localhost:3333.
 *   3. Le mot de passe du compte est dans la variable d'env DEMO_PASSWORD
 *      (ou passé en arg en clair, déconseillé) :
 *
 *        $env:DEMO_PASSWORD="motdepasse" ; node scripts/capture-landing-app.mjs
 *
 *   4. (Optionnel) BASE_URL si tu testes contre prod (ex: https://izisolo.fr)
 *
 * Sortie : public/landing/screen-{slug}.png (1280×800, format PNG @1x)
 *
 * Usage :
 *   node scripts/capture-landing-app.mjs
 *   node scripts/capture-landing-app.mjs --headed   # voir le navigateur
 *
 * ─────────────────────────────────────────────────────────────────
 */

import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
// /public/icons/ au lieu de /public/landing/ — Next.js dev sert /icons/* mais
// pas /landing/* sur cet env (raison inconnue, peut-être un index cache de
// Next.js qui considère le dossier `landing` comme une route.
const OUT_DIR = resolve(__dirname, '..', 'public', 'icons');
const BASE = process.env.BASE_URL || 'http://localhost:3333';
const EMAIL = process.env.DEMO_EMAIL || 'bonjour@melutek.com';
const PASSWORD = process.env.DEMO_PASSWORD;

const HEADED = process.argv.includes('--headed');

if (!PASSWORD) {
  console.error('❌ DEMO_PASSWORD env var is required.');
  console.error('   Lance avec :  $env:DEMO_PASSWORD="..." ; node scripts/capture-landing-app.mjs');
  console.error('   (ou bien $DEMO_PASSWORD=... node scripts/capture-landing-app.mjs en bash)');
  process.exit(1);
}

// Pages à capturer pour la landing.
// Ordre = ordre dans lequel elles seront utilisées sur la page d'accueil.
// `wait` = sélecteur attendu pour considérer la page chargée.
// `prep` = action optionnelle à exécuter AVANT la capture (ex: hover, scroll, click).
const PAGES = [
  {
    slug: 'screen-1-dashboard',
    url: '/dashboard',
    wait: 'h1, [class*="dashboard"], main',
    label: 'Dashboard (KPIs, prochains cours)',
  },
  {
    slug: 'screen-2-agenda',
    url: '/agenda',
    wait: '[class*="agenda"], [class*="calendar"], main',
    label: 'Agenda (vue semaine)',
  },
  {
    slug: 'screen-3-revenus',
    url: '/revenus',
    wait: '[class*="revenus"], [class*="paiement"], main',
    label: 'Revenus (mini-compta)',
  },
  {
    slug: 'screen-4-eleves',
    url: '/clients',
    wait: '[class*="client"], main',
    label: 'Élèves (liste + filtres)',
  },
  {
    slug: 'screen-5-cas-a-traiter',
    url: '/cas-a-traiter',
    wait: 'main',
    label: 'Cas à traiter (différenciant)',
  },
  {
    slug: 'screen-6-pointage',
    // On vise un cours passé (le 1er du listing). On ouvre la liste cours
    // d'abord, on clique sur le 1er cours, puis on screenshot la fiche.
    url: '/cours',
    wait: 'main',
    label: 'Pointage (fiche cours)',
    // Action custom : cliquer sur le 1er cours passé pour aller au pointage
    prep: async (page) => {
      // Attendre les liens de cours
      await page.waitForTimeout(800);
      const firstCoursLink = page.locator('a[href*="/cours/"][href*="-"]').first();
      if (await firstCoursLink.count() > 0) {
        await firstCoursLink.click();
        await page.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => {});
        await page.waitForTimeout(600);
      }
    },
  },
  {
    slug: 'screen-7-messagerie',
    url: '/messagerie',
    wait: 'main',
    label: 'Messagerie (6 conversations)',
  },
  {
    slug: 'screen-8-sondage',
    url: '/sondages',
    wait: 'main',
    label: 'Sondages planning (1 actif)',
  },
];

const VIEWPORT = { width: 1280, height: 800 };

async function login(page) {
  console.log(`🔑 Login (${EMAIL})...`);
  await page.goto(`${BASE}/login`, { waitUntil: 'networkidle' });
  await page.fill('#email', EMAIL);
  await page.fill('#password', PASSWORD);
  await page.click('button.auth-submit, button[type="submit"]:has-text("Se connecter")');
  // Attendre la redirection vers /dashboard
  await page.waitForURL(/\/dashboard|\/onboarding/, { timeout: 10000 });
  console.log('✅ Connecté.');
}

async function captureOne(page, { slug, url, wait, prep, label }) {
  console.log(`📸 ${slug.padEnd(28)} ${label}`);
  await page.goto(`${BASE}${url}`, { waitUntil: 'networkidle' });
  if (wait) {
    await page.waitForSelector(wait, { timeout: 8000 }).catch(() => {});
  }
  if (prep) {
    await prep(page);
  }
  // Petit délai pour laisser les animations se finir
  await page.waitForTimeout(700);
  // Hide la sidebar mobile bottom-nav si on capture en desktop large
  // (la bottom nav peut polluer la capture sur certaines vues)
  await page.evaluate(() => {
    const bn = document.querySelector('[class*="bottom-nav"], [class*="BottomNav"]');
    if (bn) bn.style.display = 'none';
  }).catch(() => {});

  const out = resolve(OUT_DIR, `${slug}.png`);
  await page.screenshot({ path: out, fullPage: false });
  console.log(`   → ${out}`);
}

(async () => {
  await mkdir(OUT_DIR, { recursive: true });

  console.log('🚀 Capture landing app screenshots');
  console.log(`   BASE     : ${BASE}`);
  console.log(`   EMAIL    : ${EMAIL}`);
  console.log(`   OUT_DIR  : ${OUT_DIR}`);
  console.log(`   HEADED   : ${HEADED ? 'oui' : 'non'}`);
  console.log('');

  // VC++ Redistributable cassé sur ce Windows → Chromium bundled crash.
  // Fallback : utiliser le Edge installé sur Windows (channel: 'msedge')
  // qui partage le même moteur Blink mais utilise les DLL système.
  const browser = await chromium.launch({
    headless: !HEADED,
    channel: 'msedge',
  });
  const context = await browser.newContext({
    viewport: VIEWPORT,
    deviceScaleFactor: 1, // mets 2 pour du retina (fichiers 4× plus lourds)
    locale: 'fr-FR',
  });
  const page = await context.newPage();

  try {
    await login(page);

    for (const cfg of PAGES) {
      await captureOne(page, cfg);
    }

    console.log('');
    console.log('🎉 Toutes les captures sont dans /public/landing/');
    console.log('   N\'oublie pas d\'ajuster le mapping SCREENS dans');
    console.log('   components/landing/Sections.js si tu veux utiliser screen-4/5/6.');
  } catch (e) {
    console.error('❌ Erreur :', e.message);
    process.exitCode = 1;
  } finally {
    await context.close();
    await browser.close();
  }
})();
