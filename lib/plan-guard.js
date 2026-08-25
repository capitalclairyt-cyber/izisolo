// ============================================================================
// IziSolo — Plan Guard (refondu B3a 2026-07-26 : gating par CAPACITÉS)
// ----------------------------------------------------------------------------
// UNE source de vérité : CAPACITES (lib/constantes) — capacité → plan minimum.
// UN helper : can(profile, 'capacite'). Fini les 17 flags booléens par plan,
// le FEATURE_TO_MIN_PLAN parallèle et les quotas (40 élèves / 5 offres — v80
// retire aussi les triggers DB correspondants).
//
// Usage route API (via withRoute) :
//   export const POST = withRoute({ auth: 'active', plan: 'mailing' }, …)
//
// Usage direct (serveur ou client) :
//   import { can } from '@/lib/plan-guard';
//   if (!can(profile, 'reservation_en_ligne')) { … }
//
// Le gel de compte (trial expiré / abo annulé) n'est PAS l'affaire de ce
// module : c'est requireActiveAccount (auth:'active') + lib/trial.js.
// ============================================================================

import { PLANS, CAPACITES } from './constantes';
import { effectivePlan as effectivePlanWithTrial } from './trial';

// Plan effectif d'un profile — délègue à lib/trial.js (trial 14 j = 'pro',
// premium legacy = 'pro', free = interne). Ré-exporté ici par commodité.
export function effectivePlan(profile) {
  return effectivePlanWithTrial(profile);
}

// Configuration d'un plan (nom, prix, frais) — affichage uniquement.
export function planConfig(planKey) {
  return PLANS[planKey] || PLANS.solo;
}

// Label lisible d'un plan
export function planLabel(planKey) {
  return planConfig(planKey).nom;
}

// Rang des plans pour la comparaison capacité → plan minimum.
// `premium` et `multi_free` n'y figurent pas : effectivePlan() les a déjà
// traduits (→ pro / → multi). Une échelle, deux alias, zéro cas particulier ici.
const RANG = { solo: 1, pro: 2, multi: 3 };

/**
 * LE test de capacité. `profile` = row profiles (plan, trial_started_at,
 * stripe_subscription_status) — celui du STUDIO concerné : pour une route
 * portail public, c'est le profil de la prof, pas de l'appelant.
 *
 * Capacité inconnue = erreur de programmation → exigence 'pro' (on ne fuit
 * pas une feature par typo) + warn console pour la voir en dev.
 */
export function can(profile, capacite) {
  const planEff = effectivePlan(profile);
  if (planEff === 'free') return true; // comptes internes : tout ouvert
  const minPlan = CAPACITES[capacite];
  if (!minPlan) {
    console.warn(`[plan-guard] capacité inconnue « ${capacite} » — traitée comme réservée Complet`);
    return RANG[planEff] >= RANG.pro;
  }
  return (RANG[planEff] || 0) >= (RANG[minPlan] || RANG.pro);
}

/**
 * Variante « le studio a-t-il cette capacité ? » pour les routes portail —
 * même fonction, nom explicite côté public (l'élève n'utilise la résa en
 * ligne que si le STUDIO l'a).
 */
export function studioCan(profileRow, capacite) {
  return can(profileRow, capacite);
}

/**
 * Garde HTTP pour route API : null si autorisé, Response 403 typée sinon.
 * Utilisée par withRoute (option `plan:`) — utilisable aussi à la main.
 */
export function requireCapacite(profile, capacite) {
  if (can(profile, capacite)) return null;
  // Le plan à nommer est celui que la capacité EXIGE, pas « Complet » en dur :
  // renvoyer une prof vers Complet pour une feature Multi l'enverrait payer
  // le mauvais abonnement, puis revenir se plaindre que ça ne marche pas.
  const minPlan = CAPACITES[capacite] || 'pro';
  return Response.json(
    {
      error: `Cette fonctionnalité est réservée au plan ${planLabel(minPlan)}.`,
      code: 'PLAN_REQUIS',
      upgradeTo: minPlan,
    },
    { status: 403 }
  );
}
