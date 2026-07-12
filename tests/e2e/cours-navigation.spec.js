/**
 * Navigation cours — non-régression du bug P0 (audit 2026-07-12).
 *
 * Bug : cliquer un cours récurrent renvoyait vers `/agenda` nu (vue générique
 * sur aujourd'hui, souvent vide) → « mon cours a disparu ». Ce test verrouille :
 *   - aucune carte de cours sur /cours ne pointe vers `/agenda` nu ;
 *   - une carte pointe vers une cible réelle (/cours/[id] ou /cours/recurrences) ;
 *   - l'agenda accepte ?date= et se positionne dessus (ne redirige pas).
 */
import { test, expect } from '@playwright/test';

const DEMO_EMAIL = 'bonjour@melutek.com';
const DEMO_PASSWORD = '123456';

test('clic sur un cours ne mène jamais à un agenda nu', async ({ page }) => {
  test.setTimeout(90_000);

  await page.goto('/login');
  await page.fill('input[type="email"]', DEMO_EMAIL);
  await page.fill('input[type="password"]', DEMO_PASSWORD);
  await page.click('button[type="submit"]');
  await page.waitForURL(/\/dashboard|\/onboarding/, { timeout: 20_000 });

  await page.goto('/cours');
  await expect(page.locator('.ce-card').first()).toBeVisible({ timeout: 15_000 });

  // Le corps cliquable de chaque carte de cours (récurrents + ponctuels)
  const hrefs = await page.locator('.ce-card-body').evaluateAll(
    els => els.map(e => e.getAttribute('href'))
  );
  expect(hrefs.length).toBeGreaterThan(0);

  // Régression : plus AUCUNE carte ne doit pointer vers `/agenda` nu.
  for (const h of hrefs) {
    expect(h, `une carte de cours pointe vers "${h}"`).not.toBe('/agenda');
    expect(h).toMatch(/^\/cours\//); // /cours/[id] ou /cours/recurrences
  }

  // L'agenda accepte ?date= et ne redirige pas ailleurs.
  await page.goto('/agenda?date=2026-08-20');
  await expect(page).toHaveURL(/\/agenda\?date=2026-08-20/);
  await expect(page.locator('body')).toContainText(/Agenda|août|Aujourd/i, { timeout: 15_000 });
});
