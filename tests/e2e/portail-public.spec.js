import { test, expect } from '@playwright/test';

test('un slug studio inexistant renvoie une 404 ou page vide propre', async ({ page }) => {
  const response = await page.goto('/p/studio-inexistant-slug-test-1234567890');
  // Soit 404, soit page vide propre — pas de 500
  expect([200, 404]).toContain(response?.status() ?? 200);
});

test('la page de connexion publique du portail est accessible sans auth', async ({ page }) => {
  const response = await page.goto('/p/studio-inexistant-slug-test-1234567890/connexion');
  expect(response?.status()).toBeLessThan(500);
});
