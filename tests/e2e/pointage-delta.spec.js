/**
 * Comptabilité des séances au pointage (lib/pointage-delta).
 *
 * Verrouille la table de transitions du décompte carnet — le correctif du
 * 2026-07-11 qui a unifié la formule pour couvrir les transitions quittant un
 * 'absent' déjà décompté (double-décompte / séance jamais rendue).
 *
 * Test Node pur (aucun navigateur) : on importe la fonction directement.
 */
import { test, expect } from '@playwright/test';
import { seanceDelta } from '../../lib/pointage-delta.js';

test.describe('seanceDelta — politique souple (absence ne compte pas)', () => {
  const souple = false;
  const cases = [
    ['inscrit', 'present', 1],   // arrivée pointée présente
    ['present', 'inscrit', -1],  // retour arrière → on rend la séance
    ['inscrit', 'absent', 0],    // absence souple = neutre
    ['absent', 'inscrit', 0],
    ['absent', 'excuse', 0],
    ['present', 'absent', -1],   // était compté présent → devient neutre
    ['present', 'excuse', -1],
  ];
  for (const [from, to, expected] of cases) {
    test(`${from} → ${to} = ${expected}`, () => {
      expect(seanceDelta(from, to, souple)).toBe(expected);
    });
  }
});

test.describe('seanceDelta — politique stricte (absence décompte)', () => {
  const strict = true;
  const cases = [
    ['inscrit', 'present', 1],
    ['inscrit', 'absent', 1],    // no-show strict = séance décomptée
    ['absent', 'present', 0],    // les deux comptent → pas de double décompte
    ['absent', 'excuse', -1],    // excuse d'un absent décompté → on rend la séance
    ['present', 'absent', 0],    // les deux comptent → pas de remboursement à tort
    ['absent', 'inscrit', -1],   // annule le décompte de l'absence
    ['excuse', 'present', 1],
    ['present', 'inscrit', -1],
  ];
  for (const [from, to, expected] of cases) {
    test(`${from} → ${to} = ${expected}`, () => {
      expect(seanceDelta(from, to, strict)).toBe(expected);
    });
  }
});
