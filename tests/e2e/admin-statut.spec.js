// ═══════════════════════════════════════════════════════════════════════════
// Verrou CI — le statut de compte tel que l'ADMIN le lit (2026-09-07).
// Question Colin : « pourquoi Atout Gym est en multi_free ET en abonné ? »
// Pour l'app, un plan payant posé à la main sans Stripe vaut « subscribed »
// (le compte reste ouvert). Pour l'admin, il vaut « offert » : même pastille
// que les payants = compteur « Abonnés » gonflé à chaque bêta.
// ═══════════════════════════════════════════════════════════════════════════
import { test, expect } from '@playwright/test';
import { getAccountStatus, getAdminStatus, isAccountFrozen } from '../../lib/trial.js';

const il_y_a = (jours) => new Date(Date.now() - jours * 86400000).toISOString();

test.describe('getAdminStatus — offert vs abonné', () => {
  test('multi_free posé à la main, essai fini : ouvert pour l\'app, « offert » pour l\'admin', () => {
    const atoutGym = { plan: 'multi_free', trial_started_at: il_y_a(60), stripe_subscription_status: null };
    expect(getAccountStatus(atoutGym)).toBe('subscribed');
    expect(isAccountFrozen(atoutGym)).toBe(false);
    expect(getAdminStatus(atoutGym)).toBe('offert');
  });

  test('pro ou multi posés à la main sans Stripe : offert aussi', () => {
    expect(getAdminStatus({ plan: 'pro', trial_started_at: il_y_a(90), stripe_subscription_status: null })).toBe('offert');
    expect(getAdminStatus({ plan: 'multi', trial_started_at: il_y_a(90) })).toBe('offert');
  });

  test('une prof qui PAIE (Stripe actif) reste « subscribed »', () => {
    expect(getAdminStatus({ plan: 'pro', trial_started_at: il_y_a(90), stripe_subscription_status: 'active' })).toBe('subscribed');
    expect(getAdminStatus({ plan: 'solo', stripe_subscription_status: 'trialing' })).toBe('subscribed');
  });

  test('les autres statuts passent tels quels', () => {
    expect(getAdminStatus({ plan: 'solo', trial_started_at: il_y_a(3) })).toBe('trial_active');
    expect(getAdminStatus({ plan: 'solo', trial_started_at: il_y_a(90) })).toBe('trial_expired');
    expect(getAdminStatus({ plan: 'pro', stripe_subscription_status: 'past_due' })).toBe('past_due');
    expect(getAdminStatus({ plan: 'pro', stripe_subscription_status: 'canceled', trial_started_at: il_y_a(90) })).toBe('canceled');
    expect(getAdminStatus({ plan: 'free' })).toBe('free');
  });
});
