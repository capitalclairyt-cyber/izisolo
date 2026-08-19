/**
 * Paiement Stripe par séance (lib/paiement-seance, v2 de v86) — verrou des
 * règles du rapprochement :
 *
 *   1. L'URL de paiement porte TOUJOURS la référence de la présence
 *      (client_reference_id) — sans elle, le webhook ne peut pas rattacher le
 *      paiement et le lien visio ne se déverrouille jamais.
 *   2. Un lien invalide (http, javascript:, vide) → PAS d'URL ('') : l'élève
 *      retombe sur « à régler », jamais sur un lien cassé ou dangereux.
 *   3. estRefPresence : seul un UUID est traité par le webhook — tout autre
 *      client_reference_id (autre usage du lien par la prof) est ignoré.
 *
 * Test Node pur (aucun navigateur).
 */
import { test, expect } from '@playwright/test';
import { sanitizeLienPaiement, urlPaiementSeance, estRefPresence } from '../../lib/paiement-seance.js';

const LIEN = 'https://buy.stripe.com/test_abc123';
const PRESENCE = 'a1b2c3d4-e5f6-4a1b-8c2d-1234567890ab';

test.describe('sanitizeLienPaiement — https obligatoire', () => {
  test('https gardé tel quel, protocole ajouté s\'il manque', () => {
    expect(sanitizeLienPaiement(LIEN)).toBe(LIEN);
    expect(sanitizeLienPaiement('buy.stripe.com/test_abc')).toBe('https://buy.stripe.com/test_abc');
  });

  test('http, javascript: et vide → rejetés', () => {
    expect(sanitizeLienPaiement('http://buy.stripe.com/x')).toBe('');
    expect(sanitizeLienPaiement('javascript:alert(1)')).toBe('');
    expect(sanitizeLienPaiement('   ')).toBe('');
    expect(sanitizeLienPaiement(null)).toBe('');
  });
});

test.describe('urlPaiementSeance — la référence de présence est le contrat', () => {
  test('URL taguée client_reference_id + email pré-rempli', () => {
    const url = urlPaiementSeance(LIEN, PRESENCE, 'emma@example.com');
    expect(url).toBe(`${LIEN}?client_reference_id=${PRESENCE}&prefilled_email=emma%40example.com`);
  });

  test('lien avec query existante → & au lieu de ?', () => {
    const url = urlPaiementSeance(`${LIEN}?locale=fr`, PRESENCE);
    expect(url).toBe(`${LIEN}?locale=fr&client_reference_id=${PRESENCE}`);
  });

  test('email absent ou invalide → pas de prefilled_email, l\'URL reste valide', () => {
    expect(urlPaiementSeance(LIEN, PRESENCE)).toBe(`${LIEN}?client_reference_id=${PRESENCE}`);
    expect(urlPaiementSeance(LIEN, PRESENCE, 'pasunemail')).toBe(`${LIEN}?client_reference_id=${PRESENCE}`);
  });

  test('lien invalide ou présence manquante → \'\' (retombe sur « à régler »)', () => {
    expect(urlPaiementSeance('http://insecure.com', PRESENCE)).toBe('');
    expect(urlPaiementSeance(LIEN, null)).toBe('');
    expect(urlPaiementSeance(LIEN, 'pas-un-uuid')).toBe('');
    expect(urlPaiementSeance('', PRESENCE)).toBe('');
  });
});

test.describe('estRefPresence — seul un UUID entre dans le webhook', () => {
  test('UUID accepté, le reste ignoré', () => {
    expect(estRefPresence(PRESENCE)).toBe(true);
    expect(estRefPresence(PRESENCE.toUpperCase())).toBe(true);
    expect(estRefPresence('commande-42')).toBe(false);
    expect(estRefPresence('')).toBe(false);
    expect(estRefPresence(null)).toBe(false);
    expect(estRefPresence(42)).toBe(false);
  });
});
