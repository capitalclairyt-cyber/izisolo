/**
 * B1e — Parcours élève de bout en bout, VIEWPORT MOBILE, vrai navigateur.
 * ─────────────────────────────────────────────────────────────────────────────
 * Spec LOCALE uniquement (jamais en CI) : elle exige un serveur local pointé
 * sur la prod (npm run start) + les fixtures créées par
 * `node scripts/b1e-prepare-walkthrough.mjs` (studio démo, élève de test).
 * Sans fixtures, la spec se skippe proprement.
 *
 * Parcours prouvé : portail (cours listés, privé invisible) → réservation
 * invitée → connexion élève → espace (cours à venir, badge, annulation
 * self-service) → messages → manifest PWA → accès refusé au cours privé.
 */
import { test, expect } from '@playwright/test';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const FIXTURES_PATH = join(process.cwd(), 'scripts', '.b1e-fixtures.json');
const fixtures = existsSync(FIXTURES_PATH) ? JSON.parse(readFileSync(FIXTURES_PATH, 'utf8')) : null;
const BASE = process.env.E2E_BASE_URL || 'http://localhost:3334';

test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });

test.describe('B1e — parcours élève mobile (live, local uniquement)', () => {
  test.skip(!fixtures, 'Fixtures absentes — lancer scripts/b1e-prepare-walkthrough.mjs');

  test('portail → résa invitée → espace → annulation → messages → PWA', async ({ page }) => {
    test.setTimeout(180000);
    const consoleErrors = [];
    page.on('pageerror', e => consoleErrors.push('pageerror: ' + e.message));
    page.on('console', m => {
      if (m.type() === 'error' && !/_vercel|favicon|manifest|worker|sw\.js/i.test(m.text())) {
        consoleErrors.push(m.text().slice(0, 180));
      }
    });
    // Requêtes ≥ 400 AVEC URL (la console ne dit pas d'où viennent 404/406)
    const failedReqs = [];
    page.on('response', r => {
      if (r.status() >= 400 && !/_vercel|favicon/i.test(r.url())) {
        failedReqs.push(`${r.status()} ${r.url().replace(BASE, '').slice(0, 160)}`);
      }
    });

    // ── 1. Portail public : les cours futurs sont là, le privé est INVISIBLE
    await page.goto(`${BASE}/p/${fixtures.slug}`);
    await expect(page.locator('body')).toContainText('Yoga du soir', { timeout: 30000 });
    await expect(page.locator('body')).not.toContainText('Cours privé — coaching');
    console.log('OK portail : cours listés, privé masqué');

    // ── 2. Page du cours + réservation INVITÉE (sans compte)
    await page.locator('a', { hasText: 'Yoga du soir' }).first().click();
    await expect(page.locator('body')).toContainText('Yoga du soir', { timeout: 20000 });
    const nomInput = page.locator('input[placeholder="Marie Dupont"]').first();
    await expect(nomInput).toBeVisible({ timeout: 20000 });
    await nomInput.fill('Invitée TestB1e');
    const emailInput = page.locator('input[placeholder="marie@exemple.fr"]').first();
    await emailInput.fill('b1e.guest@example.com');
    await page.locator('button[type="submit"], button:has-text("Réserver")').first().click();
    await expect(page.locator('body')).toContainText(/réserv|confirm|inscrit/i, { timeout: 30000 });
    console.log('OK résa invitée : confirmation affichée');

    // ── 3. Connexion élève (mot de passe posé par le script de prépa)
    await page.goto(`${BASE}/login`);
    await page.fill('input[type="email"]', fixtures.eleveEmail);
    await page.fill('input[type="password"]', fixtures.elevePassword);
    await page.click('button[type="submit"]');
    await page.waitForTimeout(3000); // role=eleve → redirections internes

    // ── 4. Espace élève : cours à venir + badge + annulation self-service
    await page.goto(`${BASE}/p/${fixtures.slug}/espace`);
    await expect(page.locator('body')).toContainText('Yoga du soir', { timeout: 30000 });
    await expect(page.locator('body')).toContainText(/Inscrit/i);
    console.log('OK espace : cours à venir + badge Inscrit·e');

    // Header portail : l'icône messages n'apparaît QUE si le prénom est résolu
    // — c'était mort depuis toujours (406 RLS silencieux, fix B1e).
    await expect(page.locator('.portail-msg-icon')).toBeVisible({ timeout: 15000 });
    console.log('OK header : prénom résolu, badge messages vivant');

    // Annulation self-service (délai > 24 h → libre, plan pro temporaire)
    const annulerBtn = page.locator('button', { hasText: 'Annuler' }).first();
    await expect(annulerBtn).toBeVisible({ timeout: 15000 });
    await annulerBtn.click();
    const confirmBtn = page.locator('button', { hasText: /Oui|Confirmer/ }).first();
    if (await confirmBtn.isVisible({ timeout: 4000 }).catch(() => false)) {
      await confirmBtn.click();
    }
    await expect(page.locator('body')).toContainText(/annulé|libéré|à bientôt/i, { timeout: 30000 });
    console.log('OK annulation élève : feedback affiché');

    // ── 5. Messages élève (fix B1a : liste filtrée par studio)
    await page.goto(`${BASE}/p/${fixtures.slug}/espace/messages`);
    await expect(page.locator('body')).toContainText(/message/i, { timeout: 20000 });
    console.log('OK page messages');

    // ── 6. Manifest PWA dynamique du studio
    const res = await page.request.get(`${BASE}/p/${fixtures.slug}/manifest.webmanifest`);
    expect(res.status()).toBe(200);
    const manifest = await res.json();
    expect(String(manifest.name || manifest.short_name || '')).not.toHaveLength(0);
    console.log('OK manifest PWA :', manifest.name || manifest.short_name);

    // ── 7. Cours privé : page directe REFUSÉE à un élève non invité
    const prive = fixtures.cours.find(c => c.visibilite === 'prive');
    const resPrive = await page.request.get(`${BASE}/p/${fixtures.slug}/cours/${prive.id}`);
    expect(resPrive.status()).toBe(404);
    console.log('OK cours privé : 404 pour non-invitée');

    console.log('CONSOLE ERRORS filtrées :', JSON.stringify(consoleErrors.slice(0, 5)));
    console.log('FAILED REQS :', JSON.stringify(failedReqs.slice(0, 12)));
    // Les 404/406 attendus du parcours (page privée 404 volontaire, sondes)
    // sont tolérés — on échoue seulement sur les erreurs applicatives dures.
    expect(consoleErrors.filter(e => /pageerror/.test(e))).toHaveLength(0);
  });
});
