/**
 * lib/paiement-seance.js — paiement Stripe PAR SÉANCE (v2 de v86, 2026-08-19)
 * ─────────────────────────────────────────────────────────────────
 * Le chaînon manquant du P0 anti double-paiement (AUDIT-PORTAIL-ELEVE §P0) :
 * la place est réservée D'ABORD (RPC reserver_place), le paiement Stripe est
 * proposé ENSUITE via le Payment Link du cours (cours.stripe_payment_link_unit,
 * v35, dormant jusqu'ici) tagué `client_reference_id=<presenceId>`. Le webhook
 * élève (app/api/stripe/webhook) retrouve la présence par cette référence et
 * pose le paiement `paid` rattaché (presence_id, v65) — ce qui déverrouille
 * au passage le lien visio d'un cours en ligne (lib/visio, v86).
 *
 * Doc Stripe vérifiée le 2026-08-19 (docs.stripe.com/payment-links/*) :
 *   - `client_reference_id` : alphanumérique + tirets + underscores, ≤ 200
 *     caractères (un UUID passe), renvoyé tel quel dans le webhook
 *     checkout.session.completed. Valeur invalide = ignorée par Stripe.
 *   - `prefilled_email` : pré-remplit l'email du checkout (modifiable par
 *     l'élève — le webhook fait foi sur la présence, PAS sur l'email payeur).
 *
 * Helpers PURS (verrou CI tests/e2e/paiement-seance.spec.js).
 * ─────────────────────────────────────────────────────────────────
 */

/**
 * Nettoie un lien de paiement fourni par la prof : https obligatoire
 * (protocole ajouté s'il manque), tout schéma non-web rejeté.
 * Miroir de sanitizeLienVisio (v86) — même politique, même raison.
 */
export function sanitizeLienPaiement(lien) {
  const brut = (lien || '').trim();
  if (!brut) return '';
  const avecProtocole = /^[a-z][a-z0-9+.-]*:/i.test(brut) ? brut : `https://${brut}`;
  try {
    const u = new URL(avecProtocole);
    if (u.protocol !== 'https:') return '';
    return u.toString();
  } catch {
    return '';
  }
}

/** La référence renvoyée par Stripe est-elle un id de présence plausible ?
 *  (UUID — tout autre client_reference_id vient d'un autre usage, on l'ignore.) */
export function estRefPresence(ref) {
  return typeof ref === 'string'
    && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(ref);
}

/**
 * Construit l'URL de paiement d'UNE séance : le Payment Link du cours tagué
 * de la présence (rapprochement webhook) + email pré-rempli.
 * Retourne '' si le lien est invalide ou la présence absente — l'appelant
 * retombe alors sur le flux « à régler » classique (jamais un lien cassé).
 */
export function urlPaiementSeance(lien, presenceId, email = '') {
  const base = sanitizeLienPaiement(lien);
  if (!base || !estRefPresence(presenceId)) return '';
  const sep = base.includes('?') ? '&' : '?';
  let url = `${base}${sep}client_reference_id=${encodeURIComponent(presenceId)}`;
  const mail = (email || '').trim();
  if (mail.includes('@')) url += `&prefilled_email=${encodeURIComponent(mail)}`;
  return url;
}
