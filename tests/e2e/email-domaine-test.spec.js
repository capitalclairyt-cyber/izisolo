/**
 * estEmailDeTest (lib/email) — verrou du skip « domaine de test » (RFC 2606/6761).
 *
 * sendEmail() n'appelle jamais Resend pour un destinataire dont le domaine est
 * réservé à la doc/aux tests : ces adresses ne délivrent jamais, et chaque
 * tentative devenait une erreur au radar erreurs_app (fixtures @example.com du
 * démo relancées quotidiennement par les crons — 2026-08-01).
 *
 * Test Node pur (aucun navigateur) : on importe la fonction directement.
 */
import { test, expect } from '@playwright/test';
import { estEmailDeTest } from '../../lib/email-domaines.js';

test.describe('estEmailDeTest — domaines réservés (skippés)', () => {
  const skippes = [
    'lea.bernard@example.com',      // la fixture réelle du démo
    'x@example.org',
    'y@example.net',
    'z@sub.example.com',            // sous-domaine d'un domaine réservé
    'a@foo.test',                   // TLD .test (RFC 6761)
    'b@bar.invalid',
    'c@demo.localhost',
    'd@site.example',
    'MAJ@EXAMPLE.COM',              // insensible à la casse
    '  espaces@example.com  ',      // trim
  ];
  for (const email of skippes) {
    test(`skippe ${email.trim()}`, () => {
      expect(estEmailDeTest(email)).toBe(true);
    });
  }
});

test.describe('estEmailDeTest — vraies adresses (envoyées)', () => {
  const envoyables = [
    'maude@gmail.com',
    'delivered@resend.dev',         // l'adresse de test Resend DOIT passer (smokes)
    'contact@example-studio.fr',    // contient « example » sans être le domaine réservé
    'prof@monexample.com',          // suffixe example.com sans point frontière
    'x@test.com',                   // test.com est un vrai domaine registrable
    'y@testeuse.fr',
    'bonjour@izisolo.fr',
  ];
  for (const email of envoyables) {
    test(`laisse passer ${email}`, () => {
      expect(estEmailDeTest(email)).toBe(false);
    });
  }
});
