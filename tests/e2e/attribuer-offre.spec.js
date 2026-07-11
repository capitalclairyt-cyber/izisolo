/**
 * Attribution d'une offre à un élève — modes de règlement (2026-07-11).
 *
 * Vérifie le câblage de l'étape paiement : les 3 modes de règlement
 * (Payé maintenant / À régler plus tard / En plusieurs fois), le libellé
 * du bouton qui s'adapte, et l'apparition de l'échéancier. Ne SOUMET PAS
 * (aucune écriture en base) — on teste l'UI, la logique de statut est
 * couverte cote code (handleConfirm).
 */
import { test, expect } from '@playwright/test';

const DEMO_EMAIL = 'bonjour@melutek.com';
const DEMO_PASSWORD = '123456';

test('modale attribution offre : 3 modes de règlement', async ({ page }) => {
  test.setTimeout(90_000);

  await page.goto('/login');
  await page.fill('input[type="email"]', DEMO_EMAIL);
  await page.fill('input[type="password"]', DEMO_PASSWORD);
  await page.click('button[type="submit"]');
  await page.waitForURL(/\/dashboard|\/onboarding/, { timeout: 20_000 });

  // Ouvrir la première fiche élève
  await page.goto('/clients');
  const ficheLink = page.locator('a[href^="/clients/"]').filter({ hasNotText: 'importer' }).first();
  await ficheLink.click();
  await page.waitForURL(/\/clients\/[0-9a-f-]{10,}$/, { timeout: 15_000 });

  // Ouvrir la modale d'attribution + choisir la 1re offre
  await page.getByRole('button', { name: 'Ajouter une offre' }).click();
  await expect(page.locator('.modal-sheet')).toBeVisible();
  await page.locator('.offre-choice-btn').first().click();

  // Étape paiement : les 3 modes de règlement sont présents
  const reglement = page.locator('.reglement-btn');
  await expect(reglement).toHaveCount(3);
  await expect(reglement.nth(0)).toHaveText('Payé maintenant');
  await expect(reglement.nth(1)).toHaveText('À régler plus tard');
  await expect(reglement.nth(2)).toHaveText('En plusieurs fois');

  // Par défaut : bouton "Valider le paiement"
  const confirm = page.locator('.confirm-btn');
  await expect(confirm).toContainText('Valider le paiement');

  // "À régler plus tard" → le bouton devient "Attribuer l'offre (à régler)"
  await reglement.nth(1).click();
  await expect(confirm).toContainText('à régler');

  // "En plusieurs fois" → échéancier (case "1er versement encaissé" + chips)
  await reglement.nth(2).click();
  await expect(page.locator('.premier-encaisse-row')).toBeVisible();
  await expect(page.locator('.multi-nb-chip').first()).toBeVisible();
  await expect(confirm).toContainText('échéancier');
});
