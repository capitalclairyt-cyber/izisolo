// ============================================================================
// IziSolo — Plan Guard (refondu B3a 2026-07-26 : gating par CAPACITÉS ;
// paliers non linéaires depuis le 2026-09-13, lot 0 Associations & Studios)
// ----------------------------------------------------------------------------
// UNE source de vérité : CAPACITES (lib/constantes) — capacité → PALIER, et
// PALIERS — palier → la liste des plans qui l'ouvrent. Association et Studio
// sont deux frères (Complet + équipe + leur famille), pas deux marches : une
// échelle de rangs ne sait pas dire « Association OU Studio », une liste oui.
//
// UN helper : can(profile, 'capacite'). Fini les flags booléens par plan, le
// FEATURE_TO_MIN_PLAN parallèle et les quotas (v80).
//
// Usage route API (via withRoute) :
//   export const POST = withRoute({ auth: 'active', plan: 'mailing' }, …)
//
// Usage direct (serveur ou client) :
//   import { can } from '@/lib/plan-guard';
//   if (!can(profile, 'reservation_en_ligne')) { … }
//
// Le gel de compte (impayé) n'est PAS l'affaire de ce module : c'est
// requireActiveAccount (auth:'active') + lib/trial.js.
// ============================================================================

import { PLANS, CAPACITES, PALIERS } from './constantes';
import { effectivePlan as effectivePlanWithTrial } from './trial';

// Plan effectif d'un profile — délègue à lib/trial.js (essai = le plan essayé,
// legacy traduits, free = interne). Ré-exporté ici par commodité.
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

/**
 * Les plans qui ouvrent une capacité, dans l'ordre du moins cher au plus cher.
 * Capacité inconnue = erreur de programmation → palier 'pro' (on ne fuit pas
 * une feature par typo) + warn console pour la voir en dev.
 */
export function plansPour(capacite) {
  const palier = CAPACITES[capacite];
  if (!palier || !PALIERS[palier]) {
    if (typeof console !== 'undefined') {
      console.warn(`[plan-guard] capacité inconnue « ${capacite} » — traitée comme réservée Complet`);
    }
    return PALIERS.pro;
  }
  return PALIERS[palier];
}

/** Le plan le moins cher qui ouvre une capacité : celui qu'on nomme à l'écran. */
export function planMinimum(capacite) {
  return plansPour(capacite)[0];
}

/**
 * « Fait partie du plan Complet » / « des plans Association et Studio » : la
 * phrase à écrire quand une capacité manque. Une capacité ouverte par un seul
 * plan le nomme ; une capacité ouverte par plusieurs les nomme tous, sinon on
 * renverrait une association vers Studio.
 */
export function libellePlansPour(capacite) {
  const plans = plansPour(capacite).filter(p => PLANS[p]?.public);
  const noms = plans.map(p => PLANS[p].nom);
  if (noms.length <= 1) return `du plan ${noms[0] || PLANS.pro.nom}`;
  // On ne cite que les plans d'ENTRÉE du palier : pour 'pro', Complet suffit
  // (Association et Studio l'incluent, mais on ne vend pas Studio à une prof
  // seule qui veut la messagerie).
  const palier = CAPACITES[capacite];
  if (palier === 'pro' || palier === 'solo') return `du plan ${noms[0]}`;
  return `des plans ${noms.slice(0, -1).join(', ')} et ${noms[noms.length - 1]}`;
}

/**
 * LE test de capacité. `profile` = row profiles (plan, trial_started_at,
 * stripe_subscription_status, type_structure) — celui du STUDIO concerné :
 * pour une route portail public, c'est le profil de la prof, pas de l'appelant.
 */
export function can(profile, capacite) {
  const planEff = effectivePlan(profile);
  if (planEff === 'free') return true; // comptes internes : tout ouvert
  return plansPour(capacite).includes(planEff);
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
  // renvoyer une prof vers Complet pour une feature d'équipe l'enverrait payer
  // le mauvais abonnement, puis revenir se plaindre que ça ne marche pas.
  return Response.json(
    {
      error: `Cette fonctionnalité fait partie ${libellePlansPour(capacite)}.`,
      code: 'PLAN_REQUIS',
      upgradeTo: planMinimum(capacite),
      plans: plansPour(capacite),
    },
    { status: 403 }
  );
}
