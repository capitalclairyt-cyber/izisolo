// ═══════════════════════════════════════════════════════════════════════════
// Verrou CI — lecture d'un objet Subscription Stripe (audit caisse 2026-08-22).
// Spec Node pure : fige les deux règles de lib/stripe-abonnement.js.
//   1. current_period_end vit sur l'ITEM depuis l'API basil, plus à la racine.
//   2. Le plan se lit sur le PRICE, pas sur la metadata figée à la création —
//      sinon un changement de formule dans le portail Stripe fait payer 29 €
//      pour un accès resté en Essentiel.
// ═══════════════════════════════════════════════════════════════════════════
import { test, expect } from '@playwright/test';
import { finPeriodeISO, planDepuisSubscription, tablePlansParPrice } from '../../lib/stripe-abonnement.js';

const ENV = {
  STRIPE_PRICE_ID_SOLO_MENSUEL: 'price_essentiel',
  STRIPE_PRICE_ID_PRO_MENSUEL: 'price_complet',
};

// 2026-09-15T10:00:00Z
const TS = 1789466400;
const sub = (over = {}) => ({ id: 'sub_1', items: { data: [{ price: { id: 'price_complet' }, current_period_end: TS }] }, ...over });

test.describe('finPeriodeISO — la fin de période vit sur l\'item', () => {
  test('lue sur l\'item (forme actuelle de l\'API)', () => {
    expect(finPeriodeISO(sub())).toBe(new Date(TS * 1000).toISOString());
  });

  test('secours sur la racine (compte épinglé sur une version ancienne)', () => {
    expect(finPeriodeISO({ id: 'sub_1', items: { data: [{ price: { id: 'p' } }] }, current_period_end: TS }))
      .toBe(new Date(TS * 1000).toISOString());
  });

  test('l\'item prime sur la racine quand les deux existent', () => {
    const autre = TS + 86400;
    expect(finPeriodeISO({ items: { data: [{ current_period_end: TS }] }, current_period_end: autre }))
      .toBe(new Date(TS * 1000).toISOString());
  });

  test('absente ou difforme : null, jamais une date inventée', () => {
    expect(finPeriodeISO({ items: { data: [{}] } })).toBeNull();
    expect(finPeriodeISO({ items: { data: [] } })).toBeNull();
    expect(finPeriodeISO({})).toBeNull();
    expect(finPeriodeISO(null)).toBeNull();
    expect(finPeriodeISO({ current_period_end: 'pas-un-timestamp' })).toBeNull();
  });
});

test.describe('planDepuisSubscription — le price fait foi', () => {
  test('le plan vient du price', () => {
    expect(planDepuisSubscription(sub(), ENV)).toBe('pro');
    expect(planDepuisSubscription({ items: { data: [{ price: { id: 'price_essentiel' } }] } }, ENV)).toBe('solo');
  });

  test('LE cas qui coûte de l\'argent : la metadata dit Essentiel, le price dit Complet', () => {
    // Exactement ce que produit un changement de formule dans le portail Stripe :
    // le price change, la metadata reste celle de la souscription initiale.
    const apresUpsell = { items: { data: [{ price: { id: 'price_complet' } }] }, metadata: { plan: 'solo' } };
    expect(planDepuisSubscription(apresUpsell, ENV)).toBe('pro');
  });

  test('metadata en secours quand le price est inconnu', () => {
    const inconnu = { items: { data: [{ price: { id: 'price_jamais_vu' } }] }, metadata: { plan: 'pro' } };
    expect(planDepuisSubscription(inconnu, ENV)).toBe('pro');
  });

  test('premium (legacy) reste lisible, mais n\'est plus vendu', () => {
    const env = { ...ENV, STRIPE_PRICE_ID_PREMIUM_MENSUEL: 'price_studio' };
    expect(planDepuisSubscription({ items: { data: [{ price: { id: 'price_studio' } }] } }, env)).toBe('premium');
    expect(planDepuisSubscription({ metadata: { plan: 'premium' } }, ENV)).toBe('premium');
  });

  test('rien d\'exploitable : null, pour que l\'appelant refuse au lieu d\'inventer', () => {
    expect(planDepuisSubscription({ items: { data: [{ price: { id: 'price_x' } }] } }, ENV)).toBeNull();
    expect(planDepuisSubscription({ metadata: { plan: 'offert' } }, ENV)).toBeNull();
    expect(planDepuisSubscription({}, ENV)).toBeNull();
    expect(planDepuisSubscription(null, ENV)).toBeNull();
  });

  test('env vars absentes (caisse pas encore branchée) : pas de plan fantôme', () => {
    expect(tablePlansParPrice({})).toEqual({});
    expect(planDepuisSubscription(sub(), {})).toBeNull();
    // ... mais la metadata dépanne quand même, sinon un abonnement existant
    // deviendrait illisible le jour d'un déploiement sans env vars.
    expect(planDepuisSubscription({ ...sub(), metadata: { plan: 'pro' } }, {})).toBe('pro');
  });
});
