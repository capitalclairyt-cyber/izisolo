// ============================================================================
// IziSolo — Plan Guard
// ----------------------------------------------------------------------------
// Helpers d'enforcement des limites/features par plan.
//
// Usage server-side (route API) :
//   const result = await verifierLimite(supabase, profileId, 'ajouter_client');
//   if (!result.allowed) return Response.json({ error: result.message, upgradeTo: result.upgradeTo }, { status: 403 });
//
// Usage client-side (UX upgrade prompt) :
//   import { canUseFeature, planLabel } from '@/lib/plan-guard';
//   if (!canUseFeature(profile.plan, 'mailing')) showUpgradePrompt('pro');
//
// ⚠️ Ces checks JS sont une 1ère couche. Pour les limites critiques
// (clients, lieux), une seconde couche existe au niveau DB via triggers
// SQL (migration v32) — defense in depth.
// ============================================================================

import { PLANS } from './constantes';
import { effectivePlan as effectivePlanWithTrial } from './trial';

// Plan effectif d'un profile.
// Délègue à lib/trial.js qui gère la logique du trial 14j en plan Pro
// (Option B validée : tout nouveau signup a un trial Pro pendant 14j,
// sans CB, puis bascule sur son plan réel ou en read-only à expiration).
export function effectivePlan(profile) {
  return effectivePlanWithTrial(profile);
}

// Configuration du plan effectif
export function planConfig(planKey) {
  return PLANS[planKey] || PLANS.solo;
}

// Plan minimum requis pour une feature donnée → utilisé pour les upgrade prompts.
// Retourne le slug du plan minimal qui débloque la feature, ou null si déjà dispo.
const FEATURE_TO_MIN_PLAN = {
  mailing:                  'pro',
  sms:                      'pro',
  stripePaymentLink:        'pro',
  notifsElevesAuto:         'pro',
  sondages:                 'pro',
  coursEssai:               'pro',
  visibiliteCours:          'pro',
  listeAttente:             'pro',
  pageBrouillon:            'pro',
  annulationParEleve:       'pro',
  detteAnnulation:          'pro',
  exportCompta:             'pro',
  templatesCommunication:   'pro',
  anniversairesAuto:        'pro',
  reglesAnnulationAvancees: 'pro',
  portailEnrichi:           'pro',
  brandingEmail:            'premium',
};

// Vérifie si un plan inclut une feature
export function canUseFeature(planKey, feature) {
  const plan = planConfig(planKey);
  return plan?.[feature] === true;
}

// Plan minimum qui débloque une feature
export function minPlanForFeature(feature) {
  return FEATURE_TO_MIN_PLAN[feature] || 'pro';
}

// Label lisible d'un plan
export function planLabel(planKey) {
  return planConfig(planKey).nom;
}

// ─── Vérification des limites côté serveur ────────────────────────────────

/**
 * Vérifie si le pro peut effectuer une action selon son plan.
 *
 * @param {SupabaseClient} supabase - client Supabase (createServerClient)
 * @param {string} profileId - id du profile (auth.uid)
 * @param {string} action - une des actions énumérées ci-dessous
 * @returns {Promise<{allowed: boolean, message?: string, upgradeTo?: string, current?: number, limit?: number}>}
 */
export async function verifierLimite(supabase, profileId, action) {
  const { data: profile } = await supabase
    .from('profiles')
    .select('plan, trial_started_at, stripe_subscription_status')
    .eq('id', profileId)
    .single();

  // Utilise le plan EFFECTIF (qui peut être 'pro' pendant un trial actif,
  // même si profile.plan = 'solo' en BDD)
  const planKey = effectivePlan(profile);
  const plan = planConfig(planKey);

  switch (action) {
    case 'ajouter_client': {
      if (plan.limiteClients == null) return { allowed: true };
      const { count } = await supabase
        .from('clients')
        .select('*', { count: 'exact', head: true })
        .eq('profile_id', profileId)
        .in('statut', ['prospect', 'actif', 'fidele']);
      if ((count || 0) >= plan.limiteClients) {
        return {
          allowed: false,
          message: `Tu as atteint la limite de ${plan.limiteClients} élèves du plan ${plan.nom}. Passe en Pro pour des élèves illimités.`,
          upgradeTo: 'pro',
          current: count,
          limit: plan.limiteClients,
        };
      }
      return { allowed: true, current: count, limit: plan.limiteClients };
    }

    case 'ajouter_lieu': {
      if (plan.limiteLieux == null) return { allowed: true };
      const { count } = await supabase
        .from('lieux')
        .select('*', { count: 'exact', head: true })
        .eq('profile_id', profileId);
      if ((count || 0) >= plan.limiteLieux) {
        return {
          allowed: false,
          message: `Tu as atteint la limite de ${plan.limiteLieux} ${plan.limiteLieux > 1 ? 'lieux' : 'lieu'} du plan ${plan.nom}. ${plan.limiteLieux === 1 ? 'Passe en Pro pour gérer jusqu\'à 3 lieux.' : 'Passe en Premium pour des lieux illimités.'}`,
          upgradeTo: plan.limiteLieux === 1 ? 'pro' : 'premium',
          current: count,
          limit: plan.limiteLieux,
        };
      }
      return { allowed: true, current: count, limit: plan.limiteLieux };
    }

    // Features booléennes — pas de comptage, juste un check d'inclusion
    case 'mailing':
    case 'sms':
    case 'stripe_payment_link':
    case 'notifs_eleves_auto':
    case 'sondages':
    case 'cours_essai':
    case 'visibilite_cours':
    case 'liste_attente':
    case 'page_brouillon':
    case 'annulation_par_eleve':
    case 'dette_annulation':
    case 'export_compta':
    case 'templates_communication':
    case 'anniversaires_auto':
    case 'regles_annulation_avancees':
    case 'portail_enrichi':
    case 'branding_email': {
      // Convertir snake_case → camelCase pour matcher les clefs PLANS
      const featureKey = action.replace(/_(.)/g, (_, c) => c.toUpperCase());
      if (plan[featureKey] === true) return { allowed: true };
      const minPlan = minPlanForFeature(featureKey);
      return {
        allowed: false,
        message: `Cette fonctionnalité nécessite le plan ${planLabel(minPlan)}. Tu es actuellement en ${plan.nom}.`,
        upgradeTo: minPlan,
      };
    }

    default:
      // Action inconnue → on laisse passer (fail-open pour éviter de bloquer
      // par erreur). Si tu veux fail-closed, change en `return { allowed: false }`.
      return { allowed: true };
  }
}

// ─── Helper pour route API : 403 typé si limite atteinte ──────────────────

/**
 * Wrapper qui transforme un check en réponse HTTP 403 prête à retourner.
 * Usage :
 *   const guard = await guardOrFail(supabase, user.id, 'ajouter_client');
 *   if (guard) return guard; // déjà une Response
 *   ... continue
 */
export async function guardOrFail(supabase, profileId, action) {
  const result = await verifierLimite(supabase, profileId, action);
  if (result.allowed) return null;
  return Response.json(
    {
      error: result.message,
      upgradeTo: result.upgradeTo,
      current: result.current,
      limit: result.limit,
    },
    { status: 403 }
  );
}
