// ============================================================================
// IziSolo — Essai, plan effectif, statut de compte
// ----------------------------------------------------------------------------
// Refondu le 2026-09-13 pour le FREEMIUM (décision Colin, PLAN-ASSOS-STUDIOS
// §3). Ce que ce module décide, et rien d'autre :
//
//   - Tout nouveau profil reçoit trial_started_at = NOW() à l'inscription
//     (trigger SQL v33, sauf les comptes 'free' internes).
//   - Pendant TRIAL_DAYS (30), la structure a le plan qu'elle ESSAIE :
//     Complet pour une prof seule, Association pour une association, Studio
//     pour un studio (lib/structure planEssai). Peu importe son plan en base,
//     qui vaut 'solo' par défaut (v56).
//   - À J30 sans abonnement, elle retombe sur ESSENTIEL GRATUIT. Rien n'est
//     gelé, rien n'est refusé : elle perd la boucle élève, c'est tout.
//   - Un abonnement Stripe vivant (active / trialing) donne le plan payé.
//     past_due garde l'accès (Stripe relance) ; canceled, incomplete_expired
//     et paused retombent sur Essentiel gratuit ; SEUL `unpaid` (le dunning
//     a rendu les armes, l'argent est dû) gèle le compte.
//   - Un plan payant POSÉ À LA MAIN (PLANS_OFFRABLES, sans Stripe) vaut
//     « abonné » pour l'app et « offert » pour l'admin.
//   - Plan 'free' ignore tout : accès complet, pour toujours (interne).
//
// Les alias legacy sont traduits ICI et nulle part ailleurs :
//   premium → pro ; multi, multi_free → studio.
//
// Le miroir SQL de ces règles vit dans `plan_effectif()` et `compte_gele()`
// (migration v110) : les deux doivent dire la même chose, sinon c'est la base
// qui gagne, en silence.
// ============================================================================

import { TRIAL_DAYS, PLANS_OFFRABLES, PALIERS } from './constantes';
import { planEssai } from './structure';

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/** Les statuts Stripe qui font vivre un abonnement (accès au plan payé). */
const STATUTS_VIVANTS = ['active', 'trialing', 'past_due'];
/** Les statuts Stripe qui ramènent sur Essentiel gratuit, sans rien geler. */
const STATUTS_TERMINES = ['canceled', 'incomplete_expired', 'paused'];

/** Traduit une clé de plan en base vers la clé EFFECTIVE (alias legacy). */
export function planCanonique(plan) {
  if (plan === 'premium') return 'pro';
  if (plan === 'multi' || plan === 'multi_free') return 'studio';
  if (PALIERS.solo.includes(plan)) return plan;
  return 'solo';
}

/**
 * Retourne l'état de l'essai pour un profil donné.
 *
 * @param {object} profile - row profiles (au minimum { plan, trial_started_at, stripe_subscription_status, type_structure })
 * @returns {{
 *   eligible: boolean,    // Le compte est dans le scope essai (≠ free, ≠ abonné)
 *   active: boolean,      // Essai en cours
 *   expired: boolean,     // Essai dépassé sans abonnement (= Essentiel gratuit)
 *   subscribed: boolean,  // A un abonnement (Stripe ou plan posé à la main)
 *   daysLeft: number,     // Jours restants si active (0 sinon, jamais négatif)
 *   endsAt: Date | null,
 *   startedAt: Date | null,
 *   planEssai: string,    // Le plan essayé (pro | asso | studio)
 * }}
 */
export function getTrialStatus(profile) {
  const NOW = Date.now();
  const essai = planEssai(profile);
  const vide = { eligible: false, active: false, expired: false, subscribed: false, daysLeft: 0, endsAt: null, startedAt: null, planEssai: essai };

  // Plan free = exempt total, pas d'essai
  if (profile?.plan === 'free') return vide;

  // Abonnement Stripe vivant, ou plan payant posé à la main : l'essai ne
  // compte plus. ⚠️ Un plan offert sans Stripe DOIT être reconnu ici : son
  // essai est fini depuis longtemps, et sans cette ligne il retomberait sur
  // Essentiel gratuit (trouvé par la preuve du lot 3 multi-prof).
  const subStatus = profile?.stripe_subscription_status;
  const manualPaid = PLANS_OFFRABLES.includes(profile?.plan) && !subStatus;
  if (STATUTS_VIVANTS.includes(subStatus) || manualPaid) {
    return { ...vide, subscribed: true };
  }

  // Pas d'essai démarré (legacy / cas edge) → considéré comme fini : on ne
  // fuit pas un plan payant à un compte d'avant la feature.
  if (!profile?.trial_started_at) {
    return { ...vide, eligible: true, expired: true };
  }

  const startedAt = new Date(profile.trial_started_at);
  const endsAt = new Date(startedAt.getTime() + TRIAL_DAYS * MS_PER_DAY);
  const msLeft = endsAt.getTime() - NOW;
  const active = msLeft > 0;
  const daysLeft = active ? Math.ceil(msLeft / MS_PER_DAY) : 0;

  return { eligible: true, active, expired: !active, subscribed: false, daysLeft, endsAt, startedAt, planEssai: essai };
}

/**
 * Plan effectif d'une structure.
 *   - 'free' interne → 'free'
 *   - abonnement Stripe vivant ou plan posé à la main → le plan (alias traduits)
 *   - essai en cours → le plan essayé (pro | asso | studio selon la structure)
 *   - sinon → 'solo' (Essentiel gratuit), y compris après une résiliation
 *
 * @returns {'free'|'solo'|'pro'|'asso'|'studio'} jamais 'premium' ni 'multi'
 */
export function effectivePlan(profile) {
  if (!profile) return 'solo';
  if (profile.plan === 'free') return 'free';
  const trial = getTrialStatus(profile);
  if (trial.subscribed) return planCanonique(profile.plan);
  if (trial.active) return trial.planEssai;
  return 'solo';
}

/**
 * Le compte a-t-il accès à plus qu'Essentiel en ce moment ?
 * (essai en cours, abonnement vivant, plan offert, compte interne)
 */
export function hasFullAccess(profile) {
  return effectivePlan(profile) !== 'solo';
}

/**
 * Statut détaillé du compte pour piloter l'UX (bandeau, admin).
 *
 *   - 'free'         : compte interne (Maude/Colin/démo), accès illimité
 *   - 'trial_active' : essai 30 j en cours, accès au plan essayé
 *   - 'subscribed'   : abonnement Stripe vivant (active / trialing) ou plan
 *                      payant posé à la main (l'admin lit alors 'offert')
 *   - 'past_due'     : paiement échoué, accès maintenu, bandeau urgent
 *   - 'impaye'       : dunning épuisé (Stripe `unpaid`), l'argent est dû →
 *                      COMPTE GELÉ, le seul cas qui gèle encore
 *   - 'canceled'     : abonnement terminé (résiliation, échec initial, pause)
 *                      → Essentiel gratuit, rien de gelé
 *   - 'gratuit'      : essai fini, jamais abonnée → Essentiel gratuit
 *
 * NB : l'essai 30 jours n'est utilisable QU'UNE fois par compte
 * (trial_started_at posé à la création, v33, protégé, v39). Après une
 * résiliation on tombe en 'canceled', jamais de nouveau en 'trial_active'.
 */
export function getAccountStatus(profile) {
  if (!profile) return 'gratuit';
  if (profile.plan === 'free') return 'free';

  const subStatus = profile.stripe_subscription_status;

  // Stripe définit HUIT statuts d'abonnement ; on les nomme tous, explicitement.
  if (subStatus === 'active' || subStatus === 'trialing') return 'subscribed';

  // Paiement échoué, Stripe relance : on garde l'accès le temps qu'elle mette
  // sa carte à jour (c'est le rôle du dunning, pas le nôtre de couper).
  if (subStatus === 'past_due') return 'past_due';

  // 'unpaid' = le dunning a rendu les armes, Stripe a cessé de relancer et la
  // facture reste due. C'est LE cas qui gèle (décision Colin 2026-09-13 :
  // « le gel ne reste que pour l'impayé »).
  if (subStatus === 'unpaid') return 'impaye';

  // Abonnement terminé, quelle qu'en soit la voie : on retombe sur Essentiel
  // gratuit. 'incomplete_expired' = le premier paiement n'a jamais abouti,
  // 'paused' = pause de fin d'essai Stripe sans moyen de paiement.
  if (STATUTS_TERMINES.includes(subStatus)) return 'canceled';

  // 'incomplete' = paiement initial en cours (3-D Secure typiquement). On ne
  // ferme rien à quelqu'un qui est en train de valider sa banque : on retombe
  // sur son essai, qui décidera.
  if (subStatus === 'incomplete') {
    const t = getTrialStatus({ ...profile, stripe_subscription_status: null, plan: 'solo' });
    return t.active ? 'trial_active' : 'gratuit';
  }

  // Un statut inconnu ne doit JAMAIS ouvrir l'accès en silence : on le signale
  // et on retombe sur l'essai plutôt que d'inventer un abonnement.
  if (subStatus) {
    if (typeof console !== 'undefined') console.warn('[trial] statut Stripe inconnu :', subStatus);
    const t = getTrialStatus({ ...profile, stripe_subscription_status: null, plan: 'solo' });
    return t.active ? 'trial_active' : 'gratuit';
  }

  // Plan payant posé À LA MAIN (bêta, geste admin), sans Stripe.
  if (PLANS_OFFRABLES.includes(profile.plan)) return 'subscribed';

  // Pas de statut Stripe → l'essai décide.
  const trial = getTrialStatus(profile);
  if (trial.active) return 'trial_active';

  // Essai fini, jamais abonnée : Essentiel gratuit. Plus jamais un gel.
  return 'gratuit';
}

/**
 * Le compte est-il gelé (aucune création possible) ? Depuis le freemium,
 * UN seul cas : l'impayé. Miroir SQL : compte_gele() (v110).
 */
export function isAccountFrozen(profile) {
  return getAccountStatus(profile) === 'impaye';
}

/** Alias historique, même règle. */
export function isReadOnly(profile) {
  return isAccountFrozen(profile);
}

/**
 * Le compte demande-t-il une action urgente (paiement échoué) ?
 * Ne bloque pas l'accès, mais doit être vu IMMÉDIATEMENT.
 */
export function needsPaymentUpdate(profile) {
  return getAccountStatus(profile) === 'past_due';
}

/**
 * Vrai si l'essai s'est terminé il y a moins de `jours` jours : le bandeau
 * « ton essai est fini, tu es sur Essentiel » ne s'affiche que là, jamais à
 * vie. Une résiliation n'a pas de date de fin lisible ici : false.
 */
export function essaiFiniDepuisMoinsDe(profile, jours) {
  const t = getTrialStatus(profile);
  if (!t.expired || !t.endsAt) return false;
  return Date.now() - t.endsAt.getTime() < jours * MS_PER_DAY;
}

/**
 * Le statut tel que l'ADMIN doit le lire (2026-09-07, question Colin : « pourquoi
 * Atout Gym est en multi_free ET en abonné ? »). Pour l'app, un plan payant posé
 * à la main sans Stripe vaut « subscribed » : c'est ce qui garde le compte
 * ouvert. Ici, sans abonnement Stripe, ce statut devient 'offert' : même
 * comportement dans l'app, lecture juste dans l'admin (le MRR ne compte que
 * 'subscribed').
 * → free | trial_active | gratuit | subscribed | offert | past_due | impaye | canceled
 */
export function getAdminStatus(profile) {
  const statut = getAccountStatus(profile);
  if (statut === 'subscribed' && !profile?.stripe_subscription_status) return 'offert';
  return statut;
}
