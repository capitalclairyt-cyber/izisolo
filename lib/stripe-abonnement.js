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
 */

/** Fin de la période en cours, en ISO, ou null si Stripe ne la donne pas. */
export function finPeriodeISO(sub) {
  const ts = sub?.items?.data?.[0]?.current_period_end ?? sub?.current_period_end ?? null;
  if (!ts) return null;
  const d = new Date(ts * 1000);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

/**
 * Table price → clé de plan, construite depuis les env vars.
 * `premium` est legacy (plus jamais vendu) mais reste reconnu : un abonnement
 * historique doit continuer d'être lu correctement.
 */
export function tablePlansParPrice(env = process.env) {
  const table = {};
  if (env.STRIPE_PRICE_ID_SOLO_MENSUEL) table[env.STRIPE_PRICE_ID_SOLO_MENSUEL] = 'solo';
  if (env.STRIPE_PRICE_ID_PRO_MENSUEL) table[env.STRIPE_PRICE_ID_PRO_MENSUEL] = 'pro';
  if (env.STRIPE_PRICE_ID_PREMIUM_MENSUEL) table[env.STRIPE_PRICE_ID_PREMIUM_MENSUEL] = 'premium';
  return table;
}

const PLANS_CONNUS = ['solo', 'pro', 'premium'];

/**
 * Le plan porté par un abonnement : le PRICE fait foi, la metadata dépanne.
 * @returns {'solo'|'pro'|'premium'|null} null si rien ne permet de trancher.
 */
export function planDepuisSubscription(sub, env = process.env) {
  const priceId = sub?.items?.data?.[0]?.price?.id;
  const parPrice = priceId ? tablePlansParPrice(env)[priceId] : null;
  if (parPrice) return parPrice;

  const parMetadata = sub?.metadata?.plan;
  return PLANS_CONNUS.includes(parMetadata) ? parMetadata : null;
}
