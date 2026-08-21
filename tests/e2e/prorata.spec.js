/**
 * Verrou — lib/prorata.js (LE calcul du pro-rata des abonnements, source
 * unique depuis 2026-08-21). Règles gravées : semaines arrondies (min 1
 * pour le total), arrondi du montant aux 0,50 €, prix plein avant le début,
 * rien après la date limite, rien s'il ne reste aucune semaine, dates à
 * minuit (jamais l'heure courante). Spec Node pur, lancé en CI.
 */
import { test, expect } from '@playwright/test';
import { calcProRata, semainesEntreISO, joursEntreISO } from '../../lib/prorata.js';

// Saison type : 1er sept → 30 juin (302 jours ≈ 43 semaines), 430 €.
const SAISON = { dateDebut: '2026-09-01', dateFin: '2027-06-30', prix: 430 };

test.describe('semainesEntreISO', () => {
  test('saison sept → juin = 43 semaines', () => {
    expect(joursEntreISO('2026-09-01', '2027-06-30')).toBe(302);
    expect(semainesEntreISO('2026-09-01', '2027-06-30')).toBe(43);
  });
  test('arrondi à la semaine la plus proche', () => {
    expect(semainesEntreISO('2026-09-01', '2026-09-04')).toBe(0);  // 3 j
    expect(semainesEntreISO('2026-09-01', '2026-09-05')).toBe(1);  // 4 j
    expect(semainesEntreISO('2026-09-01', '2026-09-11')).toBe(1);  // 10 j
  });
});

test.describe('calcProRata', () => {
  test('mi-saison : prix/semaine × semaines restantes, arrondi aux 0,50 €', () => {
    // Au 1er février : reste 149 j ≈ 21 semaines. 430/43 = 10 €/sem → 210 €.
    const r = calcProRata({ ...SAISON, dateRef: '2027-02-01' });
    expect(r.totalSemaines).toBe(43);
    expect(r.resteSemaines).toBe(21);
    expect(r.montant).toBe(210);
  });

  test("l'arrondi tombe toujours sur un multiple de 0,50", () => {
    const r = calcProRata({ dateDebut: '2026-09-01', dateFin: '2027-06-30', prix: 415, dateRef: '2027-02-01' });
    // 415/43 × 21 = 202.674… → 202.5
    expect(r.montant).toBe(202.5);
    expect((r.montant * 2) % 1).toBe(0);
  });

  test('avant ou au jour du début : null (prix plein)', () => {
    expect(calcProRata({ ...SAISON, dateRef: '2026-08-15' })).toBeNull();
    expect(calcProRata({ ...SAISON, dateRef: '2026-09-01' })).toBeNull();
  });

  test('après la date limite de souscription : null', () => {
    expect(calcProRata({ ...SAISON, dateLimite: '2027-03-31', dateRef: '2027-04-01' })).toBeNull();
    expect(calcProRata({ ...SAISON, dateLimite: '2027-03-31', dateRef: '2027-03-31' })).not.toBeNull();
  });

  test('plus aucune semaine restante : null', () => {
    expect(calcProRata({ ...SAISON, dateRef: '2027-06-28' })).toBeNull();
  });

  test('désactivé, prix invalide ou dates manquantes : null, jamais un crash', () => {
    expect(calcProRata({ ...SAISON, actif: false, dateRef: '2027-02-01' })).toBeNull();
    expect(calcProRata({ ...SAISON, prix: 'abc', dateRef: '2027-02-01' })).toBeNull();
    expect(calcProRata({ dateDebut: null, dateFin: null, prix: 100 })).toBeNull();
    expect(calcProRata()).toBeNull();
  });

  test('période ultra-courte : total plancher à 1 semaine (jamais de division par 0)', () => {
    const r = calcProRata({ dateDebut: '2026-09-01', dateFin: '2026-09-08', prix: 20, dateRef: '2026-09-02' });
    expect(r.totalSemaines).toBe(1);
    expect(r.montant).toBe(20);
  });
});
