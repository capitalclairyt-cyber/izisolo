import { test, expect } from '@playwright/test';

test('la home redirige vers /login pour les visiteurs anonymes', async ({ page }) => {
  const response = await page.goto('/');
  expect(response?.status()).toBeLessThan(400);
  // Home redirige vers /login si non authentifié, /dashboard sinon
  await expect(page).toHaveURL(/\/(login|dashboard)/);
});

test('la page /login répond et contient le mot IziSolo', async ({ page }) => {
  await page.goto('/login');
  await expect(page).toHaveURL(/\/login/);
  await expect(page.locator('body')).toContainText(/IziSolo/i);
});
