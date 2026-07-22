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
import { seanceDelta, seanceDeltaChangementType } from '../../lib/pointage-delta.js';

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

// ─── Présences gratuites (essai / offert) — gate v70 ─────────────────────────
// Une séance essai/offert ne décompte JAMAIS un carnet, quel que soit le
// statut de pointage ou la politique no-show (MODELE-PAIEMENTS-2026.md §4.3).
test.describe('seanceDelta — type essai/offert = toujours 0', () => {
  const transitions = [
    ['inscrit', 'present'], ['present', 'inscrit'],
    ['inscrit', 'absent'], ['absent', 'excuse'], ['present', 'absent'],
  ];
  for (const type of ['essai', 'offert']) {
    for (const strict of [true, false]) {
      for (const [from, to] of transitions) {
        test(`${type} ${from} → ${to} (strict=${strict}) = 0`, () => {
          expect(seanceDelta(from, to, strict, type)).toBe(0);
        });
      }
    }
  }
  test('type normal / absent → formule inchangée (rétro-compat)', () => {
    expect(seanceDelta('inscrit', 'present', false, 'normal')).toBe(1);
    expect(seanceDelta('inscrit', 'present', false, undefined)).toBe(1);
    expect(seanceDelta('inscrit', 'present', false, null)).toBe(1);
  });
});

// ─── Changement de TYPE (statut inchangé) — symétrie de gratuité ─────────────
test.describe('seanceDeltaChangementType', () => {
  const souple = false, strict = true;
  const cases = [
    // [statut, oldType, newType, absenceCompte, delta]
    ['present', 'normal', 'offert', souple, -1],  // séance comptée → offerte : on la rend
    ['present', 'normal', 'essai',  souple, -1],
    ['present', 'offert', 'normal', souple, 1],   // offerte → normale : on la décompte
    ['present', 'essai',  'normal', souple, 1],
    ['present', 'essai',  'offert', souple, 0],   // gratuit → gratuit
    ['inscrit', 'normal', 'offert', souple, 0],   // rien n'était compté
    ['inscrit', 'offert', 'normal', souple, 0],
    ['excuse',  'normal', 'offert', souple, 0],
    ['absent',  'normal', 'offert', souple, 0],   // absence souple : rien n'était compté
    ['absent',  'normal', 'offert', strict, -1],  // absence stricte décomptée → offerte : on la rend
    ['absent',  'offert', 'normal', strict, 1],
  ];
  for (const [statut, oldT, newT, ac, expected] of cases) {
    test(`${statut} : ${oldT} → ${newT} (strict=${ac}) = ${expected}`, () => {
      expect(seanceDeltaChangementType(statut, oldT, newT, ac)).toBe(expected);
    });
  }
});
