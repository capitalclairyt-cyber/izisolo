/**
 * La matrice des 2 plans (B3a 2026-07-26) — verrou du gating par capacités.
 *
 * Verrouille :
 *  1. effectivePlan : trial actif → 'pro' ; premium (legacy Studio) → 'pro' ;
 *     free → 'free' ; jamais 'premium' en sortie.
 *  2. can(profile, capacite) : LA frontière « boucle élève » — Essentiel
 *     (solo) n'a jamais une capacité 'pro', Complet a tout, free a tout,
 *     capacité INCONNUE = traitée réservée Pro (pas de fuite par typo).
 *  3. requireCapacite : la 403 typée { code: 'PLAN_REQUIS', upgradeTo }.
 *
 * Test Node pur — les dates de trial sont relatives à l'horloge réelle
 * (TRIAL_DAYS = 14) : -3 j = actif, -60 j = expiré, quel que soit le jour.
 */
import { test, expect } from '@playwright/test';
import { can, requireCapacite, effectivePlan } from '../../lib/plan-guard.js';
import { CAPACITES } from '../../lib/constantes.js';

const j = (n) => new Date(Date.now() + n * 864e5).toISOString();

const SOLO_ACTIF   = { plan: 'solo', trial_started_at: j(-60), stripe_subscription_status: 'active' };
const SOLO_EN_TRIAL = { plan: 'solo', trial_started_at: j(-3) };
const SOLO_GELE    = { plan: 'solo', trial_started_at: j(-60) };
const PRO          = { plan: 'pro' };
const PREMIUM      = { plan: 'premium' };
const FREE         = { plan: 'free' };

test.describe('effectivePlan — trial, premium legacy, free', () => {
  test('trial actif → pro, quel que soit le plan DB', () => {
    expect(effectivePlan(SOLO_EN_TRIAL)).toBe('pro');
  });
  test('trial expiré → retombe sur le plan DB', () => {
    expect(effectivePlan(SOLO_GELE)).toBe('solo');
  });
  test('premium (ex-Studio) N\'EXISTE PLUS : mappé → pro', () => {
    expect(effectivePlan(PREMIUM)).toBe('pro');
  });
  test('free et pro inchangés ; null → solo', () => {
    expect(effectivePlan(FREE)).toBe('free');
    expect(effectivePlan(PRO)).toBe('pro');
    expect(effectivePlan(null)).toBe('solo');
  });
});

test.describe('can — la frontière boucle élève', () => {
  test('Essentiel (solo abonné) : la prof seule OUI, la boucle élève NON', () => {
    expect(can(SOLO_ACTIF, 'carnets_manuels')).toBe(true);   // D1
    expect(can(SOLO_ACTIF, 'export_compta')).toBe(true);     // D2
    expect(can(SOLO_ACTIF, 'reservation_en_ligne')).toBe(false);
    expect(can(SOLO_ACTIF, 'espace_eleve')).toBe(false);
    expect(can(SOLO_ACTIF, 'messagerie')).toBe(false);
    expect(can(SOLO_ACTIF, 'paiement_en_ligne')).toBe(false);
    expect(can(SOLO_ACTIF, 'photo_import')).toBe(false);
  });
  test('Complet (pro) et premium legacy : toute la matrice', () => {
    for (const cap of Object.keys(CAPACITES)) {
      expect(can(PRO, cap)).toBe(true);
      expect(can(PREMIUM, cap)).toBe(true); // le mapping en action
    }
  });
  test('trial actif = Complet ; trial expiré = les capacités de son plan', () => {
    expect(can(SOLO_EN_TRIAL, 'reservation_en_ligne')).toBe(true);
    expect(can(SOLO_GELE, 'reservation_en_ligne')).toBe(false);
    expect(can(SOLO_GELE, 'export_compta')).toBe(true); // le gel ≠ le plan (géré par auth:'active')
  });
  test('free (interne) : tout, y compris une capacité inconnue', () => {
    expect(can(FREE, 'reservation_en_ligne')).toBe(true);
    expect(can(FREE, 'capacite_qui_n_existe_pas')).toBe(true);
  });
  test('capacité inconnue = réservée Pro (pas de fuite par typo)', () => {
    expect(can(SOLO_ACTIF, 'capacite_qui_n_existe_pas')).toBe(false);
    expect(can(PRO, 'capacite_qui_n_existe_pas')).toBe(true);
  });
  test('la matrice ne contient que solo|pro', () => {
    for (const [cap, min] of Object.entries(CAPACITES)) {
      expect(['solo', 'pro'], `capacité ${cap}`).toContain(min);
    }
  });
});

test.describe('requireCapacite — la 403 typée', () => {
  test('autorisé → null', () => {
    expect(requireCapacite(PRO, 'mailing')).toBe(null);
  });
  test('refusé → 403 { code: PLAN_REQUIS, upgradeTo: pro }', async () => {
    const res = requireCapacite(SOLO_ACTIF, 'mailing');
    expect(res).not.toBe(null);
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.code).toBe('PLAN_REQUIS');
    expect(body.upgradeTo).toBe('pro');
  });
});
