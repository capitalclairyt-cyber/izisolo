// ═══════════════════════════════════════════════════════════════════════════
// Verrou CI — le freemium et le type de structure (lot 0 Associations &
// Studios, 2026-09-13, décisions Colin : Essentiel 0 € pour toujours, Multi
// retiré, annuel pour Association et Studio, RNA obligatoire, gel réservé à
// l'impayé, essai = le plan de la structure).
//
// Ce qu'on ne laisse pas glisser :
//   1. La fin d'un essai ne gèle JAMAIS : elle ramène sur Essentiel gratuit.
//   2. Le seul gel est l'impayé (Stripe `unpaid`) ; une résiliation retombe
//      sur Essentiel, ouverte.
//   3. Une association essaie Association, un studio Studio, une prof seule
//      Complet ; le RNA est validé par son format et jamais inventé.
//   4. La grille : Essentiel à 0 €, sans Price ; Association et Studio
//      vendus à l'année ; Multi n'est plus public.
//   5. Le vocabulaire de l'app et celui de la base restent alignés : la
//      migration v110 porte les mêmes règles (relecture textuelle).
// ═══════════════════════════════════════════════════════════════════════════
import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
import {
  getTrialStatus, effectivePlan, getAccountStatus, isAccountFrozen, isReadOnly,
  needsPaymentUpdate, essaiFiniDepuisMoinsDe, planCanonique, getAdminStatus,
} from '../../lib/trial.js';
import {
  TYPES_STRUCTURE, CODES_STRUCTURE, sanitizeTypeStructure, typeStructure, planEssai,
  normaliserRna, rnaValide, sanitizeRna, formaterRna, erreurRna,
} from '../../lib/structure.js';
import { PLANS, PUBLIC_PLANS, PLANS_PAYANTS, PLANS_ANNUEL, PLANS_OFFRABLES, ALL_PLANS, TRIAL_DAYS } from '../../lib/constantes.js';
import { tablePlansParPrice, planDepuisSubscription, periodeDepuisSubscription } from '../../lib/stripe-abonnement.js';

const j = (n) => new Date(Date.now() + n * 864e5).toISOString();

test.describe('la fin d\'essai ne gèle plus', () => {
  test('essai fini, jamais abonnée : gratuit, ouverte, Essentiel', () => {
    const p = { plan: 'solo', trial_started_at: j(-60), stripe_subscription_status: null };
    expect(getAccountStatus(p)).toBe('gratuit');
    expect(isAccountFrozen(p)).toBe(false);
    expect(isReadOnly(p)).toBe(false);
    expect(effectivePlan(p)).toBe('solo');
    expect(getTrialStatus(p).expired).toBe(true);
  });

  test('sans trial_started_at (compte d\'avant la feature) : gratuit, pas gelé', () => {
    const p = { plan: 'solo' };
    expect(getAccountStatus(p)).toBe('gratuit');
    expect(isAccountFrozen(p)).toBe(false);
  });

  test('résiliation : Essentiel, ouverte, statut canceled pour l\'admin', () => {
    const p = { plan: 'pro', trial_started_at: j(-90), stripe_subscription_status: 'canceled' };
    expect(getAccountStatus(p)).toBe('canceled');
    expect(isAccountFrozen(p)).toBe(false);
    expect(effectivePlan(p)).toBe('solo');
    for (const s of ['incomplete_expired', 'paused']) {
      expect(getAccountStatus({ ...p, stripe_subscription_status: s }), s).toBe('canceled');
      expect(isAccountFrozen({ ...p, stripe_subscription_status: s }), s).toBe(false);
    }
  });

  test('LE seul gel : l\'impayé (dunning épuisé)', () => {
    const p = { plan: 'pro', stripe_subscription_status: 'unpaid' };
    expect(getAccountStatus(p)).toBe('impaye');
    expect(isAccountFrozen(p)).toBe(true);
    // past_due garde l'accès : Stripe relance, ce n'est pas à nous de couper.
    const relance = { plan: 'pro', stripe_subscription_status: 'past_due' };
    expect(getAccountStatus(relance)).toBe('past_due');
    expect(isAccountFrozen(relance)).toBe(false);
    expect(needsPaymentUpdate(relance)).toBe(true);
    expect(effectivePlan(relance)).toBe('pro');
  });

  test('un plan payant posé à la main reste ouvert, sans essai ni Stripe', () => {
    for (const plan of PLANS_OFFRABLES) {
      const p = { plan, trial_started_at: j(-200), stripe_subscription_status: null };
      expect(getAccountStatus(p), plan).toBe('subscribed');
      expect(getAdminStatus(p), plan).toBe('offert');
      expect(isAccountFrozen(p), plan).toBe(false);
      expect(effectivePlan(p), plan).toBe(planCanonique(plan));
    }
    // Et `solo` n'y est pas : posé à la main, il vaut ce qu'il est, gratuit.
    expect(PLANS_OFFRABLES).not.toContain('solo');
  });

  test('le bandeau « essai fini » ne vit que deux semaines', () => {
    expect(essaiFiniDepuisMoinsDe({ plan: 'solo', trial_started_at: j(-(TRIAL_DAYS + 3)) }, 14)).toBe(true);
    expect(essaiFiniDepuisMoinsDe({ plan: 'solo', trial_started_at: j(-(TRIAL_DAYS + 30)) }, 14)).toBe(false);
    expect(essaiFiniDepuisMoinsDe({ plan: 'solo', trial_started_at: j(-3) }, 14)).toBe(false);
    expect(essaiFiniDepuisMoinsDe({ plan: 'solo' }, 14)).toBe(false);
  });
});

test.describe('l\'essai est celui de la structure', () => {
  test('planEssai : solo → pro, association → asso, studio → studio, inconnu → pro', () => {
    expect(planEssai({ type_structure: 'solo' })).toBe('pro');
    expect(planEssai({ type_structure: 'association' })).toBe('asso');
    expect(planEssai({ type_structure: 'studio' })).toBe('studio');
    expect(planEssai({})).toBe('pro');
    expect(planEssai(null)).toBe('pro');
    expect(planEssai({ type_structure: 'n_importe_quoi' })).toBe('pro');
  });

  test('getTrialStatus porte le plan essayé, et effectivePlan le rend', () => {
    const asso = { plan: 'solo', type_structure: 'association', trial_started_at: j(-2) };
    expect(getTrialStatus(asso).planEssai).toBe('asso');
    expect(effectivePlan(asso)).toBe('asso');
    expect(getAccountStatus(asso)).toBe('trial_active');
  });

  test('les types : trois codes, un défaut sûr, des libellés', () => {
    expect(CODES_STRUCTURE).toEqual(['solo', 'association', 'studio']);
    for (const c of CODES_STRUCTURE) {
      expect(TYPES_STRUCTURE[c].label.length).toBeGreaterThan(3);
      expect(TYPES_STRUCTURE[c].description.length).toBeGreaterThan(10);
    }
    expect(sanitizeTypeStructure('studio')).toBe('studio');
    expect(sanitizeTypeStructure('STUDIO')).toBe('solo');
    expect(sanitizeTypeStructure(undefined)).toBe('solo');
    expect(typeStructure({ type_structure: null })).toBe('solo');
  });
});

test.describe('le RNA : W + neuf chiffres, validé par le format, jamais inventé', () => {
  test('normalisation et validité', () => {
    expect(normaliserRna(' w751 234-567 ')).toBe('W751234567');
    expect(rnaValide('W751234567')).toBe(true);
    expect(rnaValide('w751234567')).toBe(true);
    expect(rnaValide('W75123456')).toBe(false);   // huit chiffres
    expect(rnaValide('W7512345678')).toBe(false); // dix
    expect(rnaValide('751234567')).toBe(false);   // sans W
    expect(rnaValide('')).toBe(false);
    expect(rnaValide(null)).toBe(false);
  });

  test('sanitizeRna n\'écrit jamais un numéro difforme', () => {
    expect(sanitizeRna('w 751 234 567')).toBe('W751234567');
    expect(sanitizeRna('W751')).toBeNull();
    expect(sanitizeRna('')).toBeNull();
    expect(sanitizeRna(undefined)).toBeNull();
  });

  test('formaterRna : lisible, et inoffensif sur une valeur douteuse', () => {
    expect(formaterRna('W751234567')).toBe('W751 234 567');
    expect(formaterRna('bidon')).toBe('BIDON');
  });

  test('erreurRna : obligatoire pour une association, indifférent aux autres', () => {
    expect(erreurRna('association', '')).toContain('obligatoire');
    expect(erreurRna('association', 'W12')).toContain('neuf chiffres');
    expect(erreurRna('association', 'W751234567')).toBeNull();
    expect(erreurRna('solo', '')).toBeNull();
    expect(erreurRna('studio', 'n_importe_quoi')).toBeNull();
  });
});

test.describe('la grille', () => {
  test('Essentiel est à 0 €, Complet 29, Association 39/390, Studio 59/590', () => {
    expect(PLANS.solo.prix).toBe(0);
    expect(PLANS.solo.prixAnnuel).toBe(0);
    expect(PLANS.pro.prix).toBe(29);
    expect(PLANS.asso.prix).toBe(39);
    expect(PLANS.asso.prixAnnuel).toBe(390);
    expect(PLANS.studio.prix).toBe(59);
    expect(PLANS.studio.prixAnnuel).toBe(590);
    // Deux mois offerts, pas plus, pas moins.
    expect(PLANS.asso.prixAnnuel).toBe(PLANS.asso.prix * 10);
    expect(PLANS.studio.prixAnnuel).toBe(PLANS.studio.prix * 10);
  });

  test('publics, payants, annuels, legacy', () => {
    expect(PUBLIC_PLANS).toEqual(['solo', 'pro', 'asso', 'studio']);
    expect(PLANS_PAYANTS).toEqual(['pro', 'asso', 'studio']);
    expect(PLANS_ANNUEL).toEqual(['asso', 'studio']);
    expect(PLANS.multi.public).toBe(false);
    expect(PLANS.multi_free.public).toBe(false);
    expect(PLANS.premium.public).toBe(false);
    for (const p of ALL_PLANS) expect(PLANS[p], p).toBeTruthy();
    // Forfaits PLATS : aucun quota nulle part.
    for (const p of ['asso', 'studio']) {
      expect(PLANS[p].limiteClients).toBeNull();
      expect(PLANS[p].limiteLieux).toBeNull();
      expect(PLANS[p].limiteOffres).toBeNull();
    }
  });

  test('planCanonique : les alias, et rien d\'inventé', () => {
    expect(planCanonique('premium')).toBe('pro');
    expect(planCanonique('multi')).toBe('studio');
    expect(planCanonique('multi_free')).toBe('studio');
    expect(planCanonique('asso')).toBe('asso');
    expect(planCanonique('bidon')).toBe('solo');
  });
});

test.describe('Stripe : les Prices des structures, mensuels et annuels', () => {
  const ENV = {
    STRIPE_PRICE_ID_PRO_MENSUEL: 'price_complet',
    STRIPE_PRICE_ID_ASSO_MENSUEL: 'price_asso_m',
    STRIPE_PRICE_ID_ASSO_ANNUEL: 'price_asso_a',
    STRIPE_PRICE_ID_STUDIO_MENSUEL: 'price_studio_m',
    STRIPE_PRICE_ID_STUDIO_ANNUEL: 'price_studio_a',
  };
  const subAvec = (id, interval) => ({ items: { data: [{ price: { id, recurring: { interval } } }] } });

  test('quatre Prices, deux plans', () => {
    const t = tablePlansParPrice(ENV);
    expect(t.price_asso_m).toBe('asso');
    expect(t.price_asso_a).toBe('asso');
    expect(t.price_studio_m).toBe('studio');
    expect(t.price_studio_a).toBe('studio');
    expect(planDepuisSubscription(subAvec('price_studio_a', 'year'), ENV)).toBe('studio');
  });

  test('la périodicité se lit sur le price, la metadata dépanne', () => {
    expect(periodeDepuisSubscription(subAvec('price_asso_a', 'year'))).toBe('annuel');
    expect(periodeDepuisSubscription(subAvec('price_asso_m', 'month'))).toBe('mensuel');
    expect(periodeDepuisSubscription({ metadata: { periode: 'annuel' } })).toBe('annuel');
    expect(periodeDepuisSubscription({})).toBe('mensuel');
  });

  test('aucune env var pour Essentiel n\'est requise : il est gratuit', () => {
    const t = tablePlansParPrice(ENV);
    expect(Object.values(t)).not.toContain('solo');
  });
});

test.describe('la migration v110 dit la même chose que le code', () => {
  const sql = readFileSync('migrations-v110-freemium-structures.sql', 'utf8');
  test('les trois types, le RNA au format, les plans asso/studio', () => {
    expect(sql).toContain("check (type_structure in ('solo', 'association', 'studio'))");
    expect(sql).toContain("rna ~ '^W[0-9]{9}$'");
    expect(sql).toContain("'asso', 'studio', 'multi', 'multi_free', 'premium'");
  });
  test('30 jours, pas 14 ; le gel = unpaid seul', () => {
    expect(sql).toContain("interval '30 days'");
    expect(sql).not.toContain("interval '14 days'");
    expect(sql).toContain("when p.stripe_subscription_status = 'unpaid' then true");
    expect(sql).not.toContain("p.stripe_subscription_status = 'canceled' then true");
  });
  test('les alias SQL sont ceux du JS', () => {
    expect(sql).toContain("when p_plan = 'premium' then 'pro'");
    expect(sql).toContain("when p_plan in ('multi', 'multi_free') then 'studio'");
    expect(sql).toContain("when p_type_structure = 'association' then 'asso'");
  });
});
