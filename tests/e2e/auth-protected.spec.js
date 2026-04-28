import { test, expect } from '@playwright/test';

const PROTECTED_PATHS = ['/dashboard', '/agenda', '/clients', '/cours', '/admin'];

for (const path of PROTECTED_PATHS) {
  test(`${path} redirige un visiteur non-authentifié vers /login`, async ({ page }) => {
    await page.goto(path);
    await expect(page).toHaveURL(/\/login/);
  });
}
