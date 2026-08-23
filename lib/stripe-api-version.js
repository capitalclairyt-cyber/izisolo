/**
 * LA version d'API Stripe du projet — source unique.
 *
 * Elle était recopiée en six endroits (lib/stripe.js, les trois routes SaaS,
 * le script de setup, le script de preuve du paiement par séance). Une version
 * qui diverge d'un fichier à l'autre ne se voit pas : le SDK accepte, et c'est
 * la FORME du payload reçu qui change, donc un champ lu ailleurs devient null
 * en silence. C'est exactement ce qui est arrivé à `current_period_end`, retiré
 * de l'objet Subscription par l'API `basil` du 2025-03-31.
 *
 * ⚠️ Cette constante est aussi celle passée à `webhookEndpoints.create` : elle
 * décide de la sérialisation des events reçus en production. La changer sans
 * relire les routes qui lisent ces objets casse la chaîne d'abonnement.
 *
 * Fichier volontairement en JS pur, sans import : il est lu par des scripts
 * Node hors Next (pas de résolution d'alias `@/`).
 */
export const STRIPE_API_VERSION = '2025-09-30.clover';
