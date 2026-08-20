// ═══════════════════════════════════════════════════════════════════════════
// Verrou CI — tarif du cours d'essai par type de cours (v92, retour Kim
// 2026-08-20). Spec Node pur (zéro navigateur, zéro serveur) : fige les
// règles de lib/essai-tarif.js — surcharges sur_place uniquement, gratuit = 0,
// stripe = prix unique (un seul lien), sans type / type inconnu = défaut.
// ═══════════════════════════════════════════════════════════════════════════
import { test, expect } from '@playwright/test';
import { sanitizeEssaiPrixParType, prixEssai, essaiVarieParType, minPrixEssai } from '../../lib/essai-tarif.js';

const PROF = (over = {}) => ({ essai_paiement: 'sur_place', essai_prix: 15, ...over });

test.describe('sanitizeEssaiPrixParType — la carte est nettoyée, jamais crue', () => {
  test('entrées valides gardées, arrondies au centime', () => {
    expect(sanitizeEssaiPrixParType({ Collectif: 15, Particulier: '25,50' }))
      .toEqual({ Collectif: 15, Particulier: 25.5 });
  });

  test('entrées difformes jetées ; carte vide = null', () => {
    expect(sanitizeEssaiPrixParType({ '': 10, Yoga: -5, Yin: 0, Flow: 'abc', Ok: null })).toBeNull();
    expect(sanitizeEssaiPrixParType({})).toBeNull();
    expect(sanitizeEssaiPrixParType(null)).toBeNull();
    expect(sanitizeEssaiPrixParType([15, 25])).toBeNull();
    expect(sanitizeEssaiPrixParType('{"a":1}')).toBeNull();
  });
});

test.describe('prixEssai — le prix suit le type, dans les limites du mode', () => {
  const CARTE = { Particulier: 40, 'Semi-privé': 25 };

  test('sur_place : surcharge du type, sinon prix par défaut', () => {
    expect(prixEssai(PROF(), 'Particulier', CARTE)).toBe(40);
    expect(prixEssai(PROF(), 'Semi-privé', CARTE)).toBe(25);
    expect(prixEssai(PROF(), 'Collectif', CARTE)).toBe(15);  // type sans surcharge
    expect(prixEssai(PROF(), null, CARTE)).toBe(15);          // cours sans type
    expect(prixEssai(PROF(), 'Particulier', null)).toBe(15);  // pas de carte (pré-v92)
  });

  test('gratuit = 0, même avec des surcharges posées', () => {
    expect(prixEssai(PROF({ essai_paiement: 'gratuit' }), 'Particulier', CARTE)).toBe(0);
  });

  test('stripe = prix unique (un seul lien de paiement), surcharges ignorées', () => {
    expect(prixEssai(PROF({ essai_paiement: 'stripe' }), 'Particulier', CARTE)).toBe(15);
  });

  test('profil difforme → 0/défaut, jamais NaN', () => {
    expect(prixEssai(null, 'Particulier', CARTE)).toBe(0);
    expect(prixEssai(PROF({ essai_prix: 'abc' }), 'Collectif', CARTE)).toBe(0);
    expect(Number.isFinite(prixEssai(PROF(), 'Particulier', { Particulier: 'zz' }))).toBe(true);
  });
});

test.describe('essaiVarieParType / minPrixEssai — l\'affichage « dès X € »', () => {
  test('varie seulement si une surcharge diffère du défaut, en sur_place', () => {
    expect(essaiVarieParType(PROF(), { Particulier: 40 })).toBe(true);
    expect(essaiVarieParType(PROF(), { Particulier: 15 })).toBe(false); // égale au défaut
    expect(essaiVarieParType(PROF(), null)).toBe(false);
    expect(essaiVarieParType(PROF({ essai_paiement: 'stripe' }), { Particulier: 40 })).toBe(false);
    expect(essaiVarieParType(PROF({ essai_paiement: 'gratuit' }), { Particulier: 40 })).toBe(false);
  });

  test('minPrixEssai = plancher entre défaut et surcharges', () => {
    expect(minPrixEssai(PROF(), { Particulier: 40, Doux: 10 })).toBe(10);
    expect(minPrixEssai(PROF(), { Particulier: 40 })).toBe(15);
    expect(minPrixEssai(PROF(), null)).toBe(15);
  });
});
