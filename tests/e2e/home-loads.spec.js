import { test, expect } from '@playwright/test';

test('la home publique répond 200 et affiche la landing IziSolo', async ({ page }) => {
  const response = await page.goto('/');
  expect(response?.status()).toBeLessThan(400);
  // La home est désormais une landing publique (refonte 2026-05) — pas de
  // redirect, on doit voir le H1 du hero et le pill de la nav.
  await expect(page).toHaveURL(/localhost:3333\/?$/);
  await expect(page.locator('body')).toContainText(/IziSolo/i);
  await expect(page.locator('h1')).toContainText(/Moins d['']admin/i);
});

test('la page /login répond et contient le mot IziSolo', async ({ page }) => {
  await page.goto('/login');
  await expect(page).toHaveURL(/\/login/);
  await expect(page.locator('body')).toContainText(/IziSolo/i);
});

test('la page /register répond et contient le mot IziSolo', async ({ page }) => {
  await page.goto('/register');
  await expect(page).toHaveURL(/\/register/);
  await expect(page.locator('body')).toContainText(/IziSolo/i);
});

test('les 4 pages légales répondent 200', async ({ page }) => {
  for (const path of ['/legal/cgv', '/legal/cgu', '/legal/mentions', '/legal/rgpd']) {
    const response = await page.goto(path);
    expect(response?.status()).toBeLessThan(400);
    await expect(page.locator('h1')).toBeVisible();
  }
});
