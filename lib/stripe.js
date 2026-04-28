/**
 * Helper Stripe minimaliste.
 *
 * Architecture : chaque pro IziSolo a son propre compte Stripe.
 * On n'utilise PAS de clé secrète Stripe Mélutek pour les paiements pro→élève.
 * On reçoit juste les webhooks signés avec le webhook_secret du pro
 * (stocké dans profiles.stripe_webhook_secret).
 *
 * Le SDK Stripe est utilisé uniquement pour `webhooks.constructEvent` (vérification de signature).
 */

import Stripe from 'stripe';

// Une instance "vide" suffit pour utiliser webhooks.constructEvent.
// (Pas de clé API requise pour vérifier une signature.)
// Si STRIPE_SECRET_KEY est dispo, on l'utilise (pour usages futurs : Stripe SaaS Mélutek).
const apiKey = process.env.STRIPE_SECRET_KEY || 'sk_dummy_for_webhook_verification_only';

export const stripe = new Stripe(apiKey, {
  apiVersion: '2025-09-30.clover',
});

/**
 * Vérifie la signature d'un webhook Stripe.
 * @param {string} rawBody - Corps brut de la requête (string).
 * @param {string|null} signature - Header 'stripe-signature'.
 * @param {string} webhookSecret - Le webhook signing secret du pro.
 * @returns {Stripe.Event} L'événement Stripe vérifié.
 * @throws si la signature est invalide.
 */
export function verifyStripeSignature(rawBody, signature, webhookSecret) {
  if (!signature) throw new Error('Missing stripe-signature header');
  if (!webhookSecret) throw new Error('Missing webhook secret for this profile');
  return stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
}

/**
 * Extrait le montant en euros depuis une session checkout.
 * Stripe stocke en centimes ; on retourne en euros.
 */
export function getCheckoutSessionAmount(session) {
  if (!session) return 0;
  const amount = session.amount_total ?? session.amount_subtotal ?? 0;
  return parseFloat((amount / 100).toFixed(2));
}

/**
 * Récupère l'email du customer depuis une session checkout.
 * Préférence : customer_details.email > customer_email > metadata.email.
 */
export function getCheckoutSessionEmail(session) {
  if (!session) return null;
  return (
    session.customer_details?.email ||
    session.customer_email ||
    session.metadata?.email ||
    null
  );
}
