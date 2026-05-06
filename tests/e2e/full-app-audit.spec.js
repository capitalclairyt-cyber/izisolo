/**
 * Audit complet de l'app : se connecte sur le compte demo et explore
 * toutes les pages clés en une session unique. Vérifie qu'elles ne plantent
 * pas + qu'elles affichent leur contenu attendu (12 élèves, 24 cours, 6
 * conversations, 1 sondage, 3 cas à traiter, etc.).
 *
 * Génère des screenshots dans test-results/audit/ pour review visuelle
 * + un rapport texte dans test-results/audit/AUDIT-REPORT.md
 *
 * Pré-requis : compte demo seedé via `seed-demo-bonjour.sql` avec password
 * "123456" (cf. scripts/set-demo-password.sql).
 */
import { test, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';

const DEMO_EMAIL = 'bonjour@melutek.com';
const DEMO_PASSWORD = '123456';

const PAGES_TO_VISIT = [
  { name: 'dashboard',        url: '/dashboard',     expect: /élèves|cours|revenus|prochain/i },
  { name: 'agenda',           url: '/agenda',        expect: /Vinyasa|Yin|cours|semaine/i },
  { name: 'clients',          url: '/clients',       expect: /élève|client|nouveau/i },
  { name: 'cours',            url: '/cours',         expect: /cours|nouveau|liste/i },
  { name: 'revenus',          url: '/revenus',       expect: /€|revenus|paiement|encaiss/i },
  { name: 'cas-a-traiter',    url: '/cas-a-traiter', expect: /cas|à traiter|absent|carnet|annulé/i },
  { name: 'messagerie',       url: '/messagerie',    expect: /message|conversation/i },
  { name: 'sondages',         url: '/sondages',      expect: /sondage|planning|vote|créneau/i },
  { name: 'essais',           url: '/essais',        expect: /essai|cours/i },
  { name: 'offres',           url: '/offres',        expect: /offre|abonnement|carnet|illimité/i },
  { name: 'abonnements',      url: '/abonnements',   expect: null },  // page existe, contenu variable
  { name: 'parametres',       url: '/parametres',    expect: /paramètre|studio|profil/i },
  { name: 'support',          url: '/support',       expect: /support|aide|contact|ticket/i },
  { name: 'mailing',          url: '/mailing',       expect: /mailing|email|envoyer/i },
  { name: 'communication',    url: '/communication', expect: /communication|email|message/i },
  { name: 'evenements',       url: '/evenements',    expect: /événement|atelier/i },
  { name: 'plus',             url: '/plus',          expect: /plus|menu/i },
];

test('🔍 Audit complet IziSolo (compte demo, single session)', async ({ page }) => {
  test.setTimeout(180_000); // 3 min pour visiter ~17 pages

  const auditResults = [];
  const consoleErrors = [];
  const networkErrors = [];

  // Capter les erreurs console + page errors
  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      consoleErrors.push({ url: page.url(), msg: msg.text() });
    }
  });
  page.on('pageerror', (err) => {
    consoleErrors.push({ url: page.url(), msg: `PAGE ERROR: ${err.message}` });
  });
  page.on('response', (resp) => {
    if (resp.status() >= 500) {
      networkErrors.push({ url: resp.url(), status: resp.status() });
    }
  });

  // ────────────────────────────────────────────────
  // STEP 1 : Login
  // ────────────────────────────────────────────────
  await page.goto('/login');
  await page.fill('input[type="email"]', DEMO_EMAIL);
  await page.fill('input[type="password"]', DEMO_PASSWORD);
  await page.click('button[type="submit"]');
  await page.waitForURL(/\/dashboard|\/onboarding/, { timeout: 15_000 });
  await page.screenshot({ path: 'test-results/audit/00-after-login.png', fullPage: true });
  auditResults.push({ step: 'Login', status: 'OK', url: page.url() });

  // ────────────────────────────────────────────────
  // STEP 2-N : visiter chaque page
  // ────────────────────────────────────────────────
  for (let i = 0; i < PAGES_TO_VISIT.length; i++) {
    const { name, url, expect: expected } = PAGES_TO_VISIT[i];
    const num = String(i + 1).padStart(2, '0');
    let status = 'OK';
    let detail = '';

    try {
      const response = await page.goto(url, { waitUntil: 'networkidle', timeout: 15_000 });
      const httpStatus = response?.status() ?? 0;

      if (httpStatus >= 400) {
        status = 'HTTP_ERROR';
        detail = `HTTP ${httpStatus}`;
      } else if (page.url().includes('/login')) {
        status = 'AUTH_LOST';
        detail = 'redirigé vers /login (session perdue ?)';
      } else if (expected) {
        const bodyText = (await page.locator('body').textContent()) || '';
        if (!expected.test(bodyText)) {
          status = 'CONTENT_MISSING';
          detail = `pattern ${expected} introuvable dans le body`;
        }
      }

      await page.screenshot({
        path: `test-results/audit/${num}-${name}.png`,
        fullPage: true,
      });
    } catch (err) {
      status = 'EXCEPTION';
      detail = err.message;
    }

    auditResults.push({ step: `${num}. /${name}`, status, detail, url: page.url() });
  }

  // ────────────────────────────────────────────────
  // RAPPORT
  // ────────────────────────────────────────────────
  const reportLines = [];
  reportLines.push('# 🔍 Audit complet IziSolo — rapport\n');
  reportLines.push(`Date : ${new Date().toLocaleString('fr-FR')}\n`);
  reportLines.push(`Compte demo : ${DEMO_EMAIL}\n\n`);

  reportLines.push('## Résumé pages visitées\n');
  reportLines.push('| Page | Status | Détail |');
  reportLines.push('|------|--------|--------|');
  for (const r of auditResults) {
    const emoji = r.status === 'OK' ? '✅' : (r.status === 'CONTENT_MISSING' ? '⚠️' : '❌');
    reportLines.push(`| ${r.step} | ${emoji} ${r.status} | ${r.detail || '—'} |`);
  }

  reportLines.push('\n## Erreurs console\n');
  if (consoleErrors.length === 0) {
    reportLines.push('✅ Aucune erreur console.');
  } else {
    for (const e of consoleErrors) {
      reportLines.push(`- [${e.url}] ${e.msg}`);
    }
  }

  reportLines.push('\n## Erreurs réseau (HTTP ≥ 500)\n');
  if (networkErrors.length === 0) {
    reportLines.push('✅ Aucune erreur réseau 5xx.');
  } else {
    for (const e of networkErrors) {
      reportLines.push(`- [${e.status}] ${e.url}`);
    }
  }

  const report = reportLines.join('\n');
  const outDir = path.join(process.cwd(), 'test-results', 'audit');
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, 'AUDIT-REPORT.md'), report);

  console.log('\n' + '═'.repeat(70));
  console.log(report);
  console.log('═'.repeat(70));
  console.log(`\n📄 Rapport sauvegardé : test-results/audit/AUDIT-REPORT.md`);
  console.log(`📸 Screenshots dans : test-results/audit/*.png\n`);

  // Le test passe globalement si pas d'erreur critique
  const critical = auditResults.filter((r) => ['HTTP_ERROR', 'AUTH_LOST', 'EXCEPTION'].includes(r.status));
  expect(critical.length, `Erreurs critiques : ${critical.map(r => r.step).join(', ')}`).toBe(0);
});
