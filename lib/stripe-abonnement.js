/**
 * Lecture d'un objet Subscription Stripe — source unique.
 *
 * Deux pièges que ce module ferme, tous deux trouvés à l'audit du 2026-08-22.
 *
 * 1. `subscription.current_period_end` N'EXISTE PLUS à la racine depuis l'API
 *    `basil` (2025-03-31) : le champ a été déplacé sur l'ITEM d'abonnement. Le
 *    code le lisait à la racine, donc `stripe_current_period_end` s'écrivait
 *    null en silence et le bandeau « prochain renouvellement le X » n'a jamais
 *    pu s'afficher. On lit l'item d'abord, la racine en secours (un compte
 *    épinglé sur une version plus ancienne renvoie encore l'ancienne forme).
 *
 * 2. Le plan était lu dans `subscription.metadata.plan`, figée à la CRÉATION.
 *    Le portail Stripe permet désormais de changer de formule : Stripe change
 *    alors le price sans jamais toucher la metadata. Une prof qui passe en
 *    Complet paierait 29 € en restant bridée en Essentiel. Le price fait foi,
 *    la metadata ne sert plus que de secours.
 *
 * Le mapping price → plan vient des env vars, donc de ce que le script de setup
 * a réellement créé sur le compte : aucune constante à tenir à jour à la main.
 *
 * Depuis le 2026-09-13 (freemium + Association / Studio) : plus de Price pour
 * `solo` (Essentiel est gratuit), deux Prices par plan de structure (mensuel et
 * annuel). `multi` (legacy) et `solo` restent RECONNUS si leur env var est
 * encore posée : un abonnement historique doit continuer d'être lu.
 */

/** Fin de la période en cours, en ISO, ou null si Stripe ne la donne pas. */
export function finPeriodeISO(sub) {
  const ts = sub?.items?.data?.[0]?.current_period_end ?? sub?.current_period_end ?? null;
  if (!ts) return null;
  const d = new Date(ts * 1000);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

/** Les env vars de Prices, dans l'ordre : [envVar, plan]. */
export const ENV_PRICES = [
  ['STRIPE_PRICE_ID_SOLO_MENSUEL', 'solo'],       // legacy : plus vendu depuis le freemium
  ['STRIPE_PRICE_ID_PRO_MENSUEL', 'pro'],
  ['STRIPE_PRICE_ID_ASSO_MENSUEL', 'asso'],
  ['STRIPE_PRICE_ID_ASSO_ANNUEL', 'asso'],
  ['STRIPE_PRICE_ID_STUDIO_MENSUEL', 'studio'],
  ['STRIPE_PRICE_ID_STUDIO_ANNUEL', 'studio'],
  ['STRIPE_PRICE_ID_MULTI_MENSUEL', 'multi'],     // legacy : archivé, encore lu
  ['STRIPE_PRICE_ID_PREMIUM_MENSUEL', 'premium'], // legacy
];

/**
 * Table price → clé de plan, construite depuis les env vars.
 * `premium` et `multi` sont legacy (plus jamais vendus) mais restent reconnus.
 */
export function tablePlansParPrice(env = process.env) {
  const table = {};
  for (const [envVar, plan] of ENV_PRICES) {
    if (env[envVar]) table[env[envVar]] = plan;
  }
  return table;
}

const PLANS_CONNUS = ['solo', 'pro', 'asso', 'studio', 'multi', 'premium'];

/**
 * Le plan porté par un abonnement : le PRICE fait foi, la metadata dépanne.
 * @returns {'solo'|'pro'|'asso'|'studio'|'multi'|'premium'|null} null si rien ne permet de trancher.
 */
export function planDepuisSubscription(sub, env = process.env) {
  const priceId = sub?.items?.data?.[0]?.price?.id;
  const parPrice = priceId ? tablePlansParPrice(env)[priceId] : null;
  if (parPrice) return parPrice;

  const parMetadata = sub?.metadata?.plan;
  return PLANS_CONNUS.includes(parMetadata) ? parMetadata : null;
}

/**
 * La périodicité d'un abonnement, lue sur le PRICE (interval), la metadata en
 * secours : 'annuel' | 'mensuel'. Sert à l'admin (MRR d'un annuel = prix / 12)
 * et au bandeau « prochain renouvellement ».
 */
export function periodeDepuisSubscription(sub) {
  const interval = sub?.items?.data?.[0]?.price?.recurring?.interval;
  if (interval === 'year') return 'annuel';
  if (interval === 'month') return 'mensuel';
  return sub?.metadata?.periode === 'annuel' ? 'annuel' : 'mensuel';
}
