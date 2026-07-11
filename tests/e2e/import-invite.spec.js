/**
 * Import CSV → invitation groupée (mini-sprint « Activation élèves », 2026-07-11).
 *
 * Vérifie le flux : upload CSV → mapping auto → import → écran de fin avec la
 * carte « Envoie-leur leur accès élève ? » → invitation groupée séquentielle.
 *
 * Les routes /api/clients/import et /api/invite sont MOCKÉES (page.route) :
 * aucune écriture en base, aucun email Resend — le test valide l'UI et le
 * contrat d'API (payload envoyé à /api/invite), pas le backend.
 */
import { test, expect } from '@playwright/test';

const DEMO_EMAIL = 'bonjour@melutek.com';
const DEMO_PASSWORD = '123456';

const CSV = 'prenom;nom;email\nAnna;Test;test1@exemple.fr\nLea;Test;test2@exemple.fr\nZoe;Test;test3@exemple.fr\n';

test('import CSV puis invitation groupée des importés', async ({ page }) => {
  test.setTimeout(90_000);

  // ── Mocks API : rien ne part réellement ──
  const inviteCalls = [];
  await page.route('**/api/clients/import', (route) =>
    route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({
        ok: true, total: 3, importes: 3, doublons: 0, bloques_limite: 0, invalides: 0,
        invitables: [
          { email: 'test1@exemple.fr', prenom: 'Anna' },
          { email: 'test2@exemple.fr', prenom: 'Lea' },
          { email: 'test3@exemple.fr', prenom: 'Zoe' },
        ],
      }),
    })
  );
  await page.route('**/api/invite', async (route) => {
    inviteCalls.push(route.request().postDataJSON());
    await route.fulfill({ contentType: 'application/json', body: JSON.stringify({ ok: true }) });
  });

  // ── Login compte démo ──
  await page.goto('/login');
  await page.fill('input[type="email"]', DEMO_EMAIL);
  await page.fill('input[type="password"]', DEMO_PASSWORD);
  await page.click('button[type="submit"]');
  await page.waitForURL(/\/dashboard|\/onboarding/, { timeout: 20_000 });

  // ── Upload CSV ──
  await page.goto('/clients/importer');
  await page.setInputFiles('input[type="file"]', {
    name: 'eleves.csv', mimeType: 'text/csv', buffer: Buffer.from(CSV, 'utf-8'),
  });
  await expect(page.locator('.imp-map')).toBeVisible({ timeout: 10_000 });

  // ── Import ──
  await page.click('button:has-text("Importer 3")');
  await expect(page.locator('.imp-done')).toBeVisible({ timeout: 10_000 });

  // ── Carte d'invitation groupée ──
  const inviteCard = page.locator('.imp-invite-card');
  await expect(inviteCard).toBeVisible();
  await expect(inviteCard).toContainText('Envoie-leur leur accès élève');

  await page.click('button:has-text("Inviter les 3")');
  await expect(inviteCard.locator('.imp-invite-done')).toBeVisible({ timeout: 15_000 });
  await expect(inviteCard).toContainText('3 invitations envoyées');

  // ── Contrat d'API : 3 appels /api/invite avec email + prenom ──
  expect(inviteCalls).toHaveLength(3);
  expect(inviteCalls.map(c => c.email).sort()).toEqual(
    ['test1@exemple.fr', 'test2@exemple.fr', 'test3@exemple.fr']
  );
  expect(inviteCalls[0].prenom).toBeTruthy();
});
