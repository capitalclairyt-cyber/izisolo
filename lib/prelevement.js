// ============================================
// IziSolo — Prélèvement automatique par carte (PUR, aucune requête)
// ============================================
//
// Décision Colin, 2026-09-07 (« on ne peut pas proposer le prélèvement auto
// par carte, différent de la caisse Stripe qui encaisse les profs ? ») :
// oui, et c'est l'option A validée le 2026-08-19 — la prof crée un Payment
// Link RÉCURRENT dans SON Stripe et le colle sur l'offre. IziSolo n'a ni
// clé API ni Connect : tout ce qu'il sait vient des événements SIGNÉS que
// Stripe lui envoie. Ce module lit ces événements et décide ; le webhook
// écrit.
//
// Les quatre politiques (recommandées le 2026-09-07, validées par « go ») :
//   1. Échec de prélèvement : Stripe réessaie (dunning). Chaque échec prévient
//      la prof (cloche) et l'élève (email). Quand Stripe ABANDONNE (plus de
//      prochaine tentative) ou après 3 échecs, l'abo passe « en pause »
//      (gele) — la réservation reste possible entre-temps. Un prélèvement
//      qui finit par passer réactive l'abo.
//   2. Résiliation : par le Customer Portal Stripe de la prof ; l'événement
//      customer.subscription.deleted ferme l'abo À LA FIN de la période déjà
//      payée (l'élève garde ce qu'elle a réglé), jamais avant.
//   3. Engagement : mensuel sans fin par défaut. Sans clé API, IziSolo ne
//      peut pas poser de cancel_at : un engagement se règle dans Stripe.
//   4. Pause : interdite côté IziSolo sur un abo prélevé (la carte
//      continuerait d'être débitée) — l'écran renvoie vers Stripe.

const REGEX_DATE = /^\d{4}-\d{2}-\d{2}$/;
const MOIS_FR = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];

/** Nombre d'échecs après lequel l'abo est mis en pause même si Stripe réessaie encore. */
export const ECHECS_AVANT_PAUSE = 3;

/** Les événements que la prof doit cocher sur son endpoint Stripe. */
export const EVENEMENTS_WEBHOOK = [
  'checkout.session.completed',
  'invoice.paid',
  'invoice.payment_failed',
  'customer.subscription.deleted',
  'charge.refunded',
];

/** Un abo IziSolo est « prélevé auto » dès qu'il porte un abonnement Stripe. */
export function estAboPreleve(abo) {
  const id = abo?.stripe_subscription_id;
  return typeof id === 'string' && id.trim().length > 0;
}

/** Epoch secondes Stripe → 'YYYY-MM-DD' (UTC, comme dateSessionStripe). null si absent. */
export function dateStripe(epoch) {
  if (typeof epoch !== 'number' || !Number.isFinite(epoch) || epoch <= 0) return null;
  const d = new Date(epoch * 1000);
  return Number.isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
}

function idDe(x) {
  if (typeof x === 'string') return x || null;
  if (x && typeof x === 'object' && typeof x.id === 'string') return x.id;
  return null;
}

/**
 * Une session de checkout est-elle un ABONNEMENT (Payment Link récurrent) ?
 * Stripe pose mode='subscription' et un id sub_… sur la session.
 */
export function estSessionAbonnement(session) {
  return session?.mode === 'subscription' || !!idDe(session?.subscription);
}

/**
 * Ce qu'on retient d'une session de checkout en mode abonnement.
 * → { subscriptionId, customerId, email, paymentLinkId, clientReferenceId }
 */
export function lireSessionAbonnement(session) {
  return {
    subscriptionId: idDe(session?.subscription),
    customerId: idDe(session?.customer),
    email: (session?.customer_details?.email || session?.customer_email || session?.metadata?.email || null),
    paymentLinkId: idDe(session?.payment_link),
    clientReferenceId: session?.client_reference_id || null,
  };
}

/**
 * Ce qu'on retient d'une facture Stripe (invoice.paid / invoice.payment_failed).
 * Tolère les deux formes de l'API : `invoice.subscription` (ancienne) et
 * `invoice.parent.subscription_details.subscription` (2025+).
 * → { invoiceId, subscriptionId, customerId, email, montant (euros),
 *     datePaiement ('YYYY-MM-DD' | null), periodeDebut, periodeFin,
 *     billingReason, description, tentatives, prochaineTentative }
 */
export function lireInvoice(invoice) {
  const ligne = invoice?.lines?.data?.[0] || null;
  const subscriptionId = idDe(invoice?.subscription)
    || idDe(invoice?.parent?.subscription_details?.subscription)
    || idDe(ligne?.subscription)
    || idDe(ligne?.parent?.subscription_item_details?.subscription)
    || null;
  const centimes = typeof invoice?.amount_paid === 'number' && invoice.amount_paid > 0
    ? invoice.amount_paid
    : (typeof invoice?.amount_due === 'number' ? invoice.amount_due : 0);
  return {
    invoiceId: idDe(invoice) || (typeof invoice?.id === 'string' ? invoice.id : null),
    subscriptionId,
    customerId: idDe(invoice?.customer),
    email: invoice?.customer_email || invoice?.customer_details?.email || null,
    montant: Math.round(centimes) / 100,
    datePaiement: dateStripe(invoice?.status_transitions?.paid_at) || dateStripe(invoice?.created),
    periodeDebut: dateStripe(ligne?.period?.start) || dateStripe(invoice?.period_start),
    periodeFin: dateStripe(ligne?.period?.end) || dateStripe(invoice?.period_end),
    billingReason: invoice?.billing_reason || null,
    description: (ligne?.description || invoice?.description || '').trim() || null,
    tentatives: typeof invoice?.attempt_count === 'number' ? invoice.attempt_count : 0,
    prochaineTentative: dateStripe(invoice?.next_payment_attempt),
  };
}

/**
 * L'échec est-il FINAL ? Stripe n'a plus de prochaine tentative, ou le
 * plafond IziSolo (3) est atteint. Politique 1.
 */
export function echecFinal(lecture) {
  if (!lecture) return false;
  if ((lecture.tentatives || 0) >= ECHECS_AVANT_PAUSE) return true;
  return !lecture.prochaineTentative;
}

/** 'YYYY-MM-DD' → 'septembre 2026'. */
export function labelMoisDe(iso) {
  if (!REGEX_DATE.test(String(iso || ''))) return null;
  const [a, m] = iso.split('-');
  return `${MOIS_FR[parseInt(m, 10) - 1]} ${a}`;
}

/**
 * L'intitulé du paiement d'un prélèvement : « Abonnement au mois · septembre
 * 2026 ». Le mois est celui du DÉBUT de période (ce que l'élève paie), pas
 * celui du prélèvement. Sans offre connue, la description Stripe, sinon
 * « Prélèvement ».
 */
export function intitulePrelevement({ offreNom, periodeDebut, description }) {
  const base = (offreNom || '').trim() || (description || '').trim() || 'Prélèvement';
  const mois = labelMoisDe(periodeDebut);
  return mois ? `${base} · ${mois}` : base;
}

/**
 * La fin d'abo après un prélèvement : la fin de période Stripe si elle
 * PROLONGE, sinon la fin actuelle (on ne recule jamais une date de fin sur
 * un événement rejoué ou tardif).
 */
export function finApresPrelevement(finActuelle, periodeFin) {
  const fin = REGEX_DATE.test(String(periodeFin || '')) ? periodeFin : null;
  const actuelle = REGEX_DATE.test(String(finActuelle || '')) ? finActuelle : null;
  if (!fin) return actuelle;
  if (!actuelle) return fin;
  return fin > actuelle ? fin : actuelle;
}

/**
 * Fin de période courante d'un objet subscription Stripe (résiliation) :
 * `current_period_end` (ancienne API) ou sur le premier item (2025+).
 */
export function finPeriodeSubscription(subscription) {
  return dateStripe(subscription?.current_period_end)
    || dateStripe(subscription?.items?.data?.[0]?.current_period_end)
    || dateStripe(subscription?.ended_at)
    || dateStripe(subscription?.canceled_at)
    || null;
}

/**
 * Le statut de l'abo IziSolo après une résiliation Stripe (politique 2) :
 * la période payée reste acquise → 'actif' jusqu'à sa fin (le cron
 * expirations la fermera), 'expire' si elle est déjà passée.
 */
export function statutApresResiliation(finPeriode, aujourdhui) {
  const fin = REGEX_DATE.test(String(finPeriode || '')) ? finPeriode : null;
  if (!fin) return 'expire';
  return fin >= aujourdhui ? 'actif' : 'expire';
}

/** La phrase du badge côté élève et côté prof. */
export function libellePreleve(abo) {
  if (!estAboPreleve(abo)) return null;
  const fin = REGEX_DATE.test(String(abo?.date_fin || '')) ? abo.date_fin : null;
  if (!fin) return 'Prélèvement automatique par carte';
  const [a, m, j] = fin.split('-');
  return `Prélèvement automatique par carte · prochain autour du ${parseInt(j, 10)} ${MOIS_FR[parseInt(m, 10) - 1]} ${a}`;
}
