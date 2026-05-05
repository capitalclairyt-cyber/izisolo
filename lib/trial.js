// ============================================================================
// IziSolo — Trial 14 jours (Option B)
// ----------------------------------------------------------------------------
// Helpers pour manipuler l'état du trial d'un profile.
//
// Logique :
//   - Tout nouveau profil reçoit trial_started_at = NOW() à l'inscription
//     (via trigger SQL v33, sauf les comptes 'free' interne)
//   - Pendant 14 jours, le user a accès au plan PRO (peu importe son plan
//     enregistré qui est par défaut 'solo')
//   - À J14, le trial expire. Si pas de subscription Stripe active, l'app
//     passe en read-only avec un banner forçant à choisir un plan.
//   - Si l'user souscrit avant ou après J14, son plan effectif devient ce
//     qu'il paie (solo / pro / premium). Le trial est ignoré.
//   - Plan 'free' ignore complètement la logique trial (full access infini).
// ============================================================================

import { TRIAL_DAYS } from './constantes';

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/**
 * Retourne l'état du trial pour un profile donné.
 *
 * @param {object} profile - row profiles (au minimum { plan, trial_started_at, stripe_subscription_status })
 * @returns {{
 *   eligible: boolean,    // Le user est dans le scope trial (≠ free, ≠ déjà souscrit)
 *   active: boolean,      // Trial en cours
 *   expired: boolean,     // Trial dépassé sans subscription
 *   subscribed: boolean,  // A une subscription Stripe active (trial pas pertinent)
 *   daysLeft: number,     // Jours restants si active (0 sinon, jamais négatif)
 *   endsAt: Date | null,  // Date de fin du trial
 *   startedAt: Date | null,
 * }}
 */
export function getTrialStatus(profile) {
  const NOW = Date.now();

  // Plan free = exempt total, pas de trial
  if (profile?.plan === 'free') {
    return {
      eligible: false,
      active: false,
      expired: false,
      subscribed: false,
      daysLeft: 0,
      endsAt: null,
      startedAt: null,
    };
  }

  // Subscription Stripe active = trial irrelevant
  const subStatus = profile?.stripe_subscription_status;
  if (subStatus === 'active' || subStatus === 'trialing') {
    return {
      eligible: false,
      active: false,
      expired: false,
      subscribed: true,
      daysLeft: 0,
      endsAt: null,
      startedAt: null,
    };
  }

  // Pas de trial démarré (legacy / cas edge) → considéré comme déjà expiré
  // pour ne pas leakage de full Pro à des comptes pre-feature
  if (!profile?.trial_started_at) {
    return {
      eligible: true,
      active: false,
      expired: true,
      subscribed: false,
      daysLeft: 0,
      endsAt: null,
      startedAt: null,
    };
  }

  const startedAt = new Date(profile.trial_started_at);
  const endsAt = new Date(startedAt.getTime() + TRIAL_DAYS * MS_PER_DAY);
  const msLeft = endsAt.getTime() - NOW;
  const active = msLeft > 0;
  const daysLeft = active ? Math.ceil(msLeft / MS_PER_DAY) : 0;

  return {
    eligible: true,
    active,
    expired: !active,
    subscribed: false,
    daysLeft,
    endsAt,
    startedAt,
  };
}

/**
 * Plan effectif d'un user en tenant compte du trial.
 * - Si trial actif → 'pro' (full access pendant le trial)
 * - Sinon → profile.plan (ou 'solo' par défaut)
 *
 * @param {object} profile
 * @returns {string} - 'free' | 'solo' | 'pro' | 'premium'
 */
export function effectivePlan(profile) {
  if (!profile) return 'solo';
  if (profile.plan === 'free') return 'free';
  const trial = getTrialStatus(profile);
  if (trial.active) return 'pro';
  return profile.plan || 'solo';
}

/**
 * Le user a-t-il accès aux features pro/premium en ce moment ?
 * Utile pour tester rapidement "puis-je laisser passer cette action ?"
 */
export function hasFullAccess(profile) {
  if (!profile) return false;
  if (profile.plan === 'free') return true;
  if (profile.plan === 'premium') return true;
  if (profile.plan === 'pro') return true;
  const trial = getTrialStatus(profile);
  return trial.active; // Solo pendant trial = accès Pro
}

/**
 * L'app doit-elle être en mode read-only pour ce user ?
 * → trial expiré ET pas de subscription active
 */
export function isReadOnly(profile) {
  if (!profile) return false;
  if (profile.plan === 'free') return false;
  const trial = getTrialStatus(profile);
  return trial.expired && !trial.subscribed;
}
