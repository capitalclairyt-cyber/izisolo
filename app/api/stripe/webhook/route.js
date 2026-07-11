import * as Sentry from '@sentry/nextjs';
import { createAdminClient } from '@/lib/supabase-admin';
import { verifyStripeSignature, getCheckoutSessionAmount, getCheckoutSessionEmail } from '@/lib/stripe';
import { sendPushToUser } from '@/lib/push-server';

// Frais de fonctionnement IziSolo sur chaque paiement encaissé via le portail (Stripe).
// Calculés et stockés en DB pour facturation SaaS mensuelle (sprint post-launch).
// 1% du volume — ajouté à la facture mensuelle du pro, jamais prélevé sur le paiement Stripe.
const COMMISSION_RATE = 0.01; // 1%

// Désactiver le parsing JSON automatique : on a besoin du raw body pour la signature.
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function adminClient() {
  return createAdminClient();
}

export async function POST(request) {
  // Le profile_id du pro est passé en query param dans l'URL configurée sur Stripe.
  const url = new URL(request.url);
  const profileId = url.searchParams.get('profile');

  if (!profileId) {
    return new Response('Missing profile query param', { status: 400 });
  }

  const supabase = adminClient();

  // Récupérer le webhook secret du pro
  const { data: profile, error: profileErr } = await supabase
    .from('profiles')
    .select('id, stripe_webhook_secret')
    .eq('id', profileId)
    .single();

  if (profileErr || !profile) {
    return new Response('Profile not found', { status: 404 });
  }

  if (!profile.stripe_webhook_secret) {
    return new Response('No webhook secret configured for this profile', { status: 400 });
  }

  // Vérifier la signature
  const rawBody = await request.text();
  const signature = request.headers.get('stripe-signature');

  let event;
  try {
    event = verifyStripeSignature(rawBody, signature, profile.stripe_webhook_secret);
  } catch (err) {
    console.error('[stripe/webhook] signature verification failed:', err.message);
    return new Response(`Webhook signature verification failed: ${err.message}`, { status: 400 });
  }

  // Dispatch sur le type d'événement
  try {
    if (event.type === 'checkout.session.completed') {
      await handleCheckoutCompleted(supabase, profile.id, event.data.object);
    } else if (event.type === 'charge.refunded') {
      await handleChargeRefunded(supabase, profile.id, event.data.object);
    }
    // Autres événements : on accepte sans traiter (Stripe attend un 200).
    return Response.json({ received: true });
  } catch (err) {
    console.error('[stripe/webhook] handler error:', err);
    Sentry.captureException(err);
    return new Response(`Handler error: ${err.message}`, { status: 500 });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Handlers d'événements
// ─────────────────────────────────────────────────────────────────────────────

async function handleCheckoutCompleted(supabase, profileId, session) {
  // Idempotence : si un paiement existe déjà pour cette session, on ne re-traite pas.
  const { data: existing } = await supabase
    .from('paiements')
    .select('id')
    .eq('stripe_session_id', session.id)
    .maybeSingle();

  if (existing) {
    console.log(`[stripe/webhook] session ${session.id} already processed, skipping`);
    return;
  }

  const email = getCheckoutSessionEmail(session);
  const amount = getCheckoutSessionAmount(session);

  // Récupérer le payment_link pour matcher l'offre IziSolo
  // Stripe envoie payment_link dans session.payment_link (string ID, ex: "plink_xyz")
  const paymentLinkId = session.payment_link || null;

  let offre = null;
  if (paymentLinkId) {
    // Cherche une offre dont stripe_payment_link contient le paymentLinkId
    const { data: offres } = await supabase
      .from('offres')
      .select('id, nom, type, prix')
      .eq('profile_id', profileId)
      .ilike('stripe_payment_link', `%${paymentLinkId}%`);
    offre = offres && offres[0] ? offres[0] : null;
  }

  // Match du client par email (case-insensitive). null si inconnu.
  let clientId = null;
  if (email) {
    const { data: client } = await supabase
      .from('clients')
      .select('id')
      .eq('profile_id', profileId)
      .ilike('email', email)
      .maybeSingle();
    clientId = client?.id || null;
  }

  // Insérer le paiement avec calcul de la commission IziSolo
  const today = new Date().toISOString().slice(0, 10);
  const intitule = offre?.nom || session.metadata?.offre_nom || 'Paiement Stripe';
  const commission = parseFloat((amount * COMMISSION_RATE).toFixed(2));

  const { error: insertErr } = await supabase.from('paiements').insert({
    profile_id: profileId,
    client_id: clientId,
    offre_id: offre?.id || null,
    intitule,
    type: offre?.type || null,
    montant: amount,
    statut: 'paid',
    mode: 'CB',
    date: today,
    date_encaissement: today,
    stripe_session_id: session.id,
    // v55 : permet de rattacher les remboursements (charge.payment_intent)
    stripe_payment_intent: typeof session.payment_intent === 'string' ? session.payment_intent : null,
    commission_taux: COMMISSION_RATE,
    commission_montant: commission,
    notes: `Stripe · ${email || 'email inconnu'}${clientId ? '' : ' · client à attribuer'}`,
  });

  if (insertErr) {
    console.error('[stripe/webhook] insert paiement error:', insertErr);
    throw new Error('Failed to create paiement: ' + insertErr.message);
  }

  // Push prof « paiement en ligne reçu » (gaté sur pref ; no-op sans abo)
  sendPushToUser(profileId, {
    title: `Paiement en ligne reçu 💳`,
    body: `${amount} € — ${intitule}`,
    url: '/revenus',
    tag: `stripe-${session.id}`,
  }, { type: 'paiement_stripe' }).catch(() => {});

  // Si l'offre est de type carnet/abonnement et qu'un client est matché,
  // on peut auto-créer l'abonnement correspondant.
  if (offre && clientId && (offre.type === 'carnet' || offre.type === 'abonnement')) {
    const { data: offreFull } = await supabase
      .from('offres')
      .select('seances, duree_jours')
      .eq('id', offre.id)
      .single();
    if (offreFull) {
      const dateFin = offreFull.duree_jours
        ? new Date(Date.now() + offreFull.duree_jours * 86400000).toISOString().slice(0, 10)
        : null;
      await supabase.from('abonnements').insert({
        profile_id: profileId,
        client_id: clientId,
        offre_id: offre.id,
        offre_nom: offre.nom,
        type: offre.type,
        date_debut: today,
        date_fin: dateFin,
        seances_total: offreFull.seances || null,
        seances_utilisees: 0,
        statut: 'actif',
      });
    }
  }
}

async function handleChargeRefunded(supabase, profileId, charge) {
  // Sprint 5 audit : l'ancien matching cherchait charge.payment_intent (pi_…)
  // dans stripe_session_id (cs_…) → AUCUN remboursement n'était jamais
  // répercuté. On matche désormais sur stripe_payment_intent (stocké à
  // l'encaissement depuis v55), avec fallback legacy sur la session.
  const notesRembourse = `[REMBOURSÉ ${new Date().toISOString().slice(0, 10)}] Stripe charge: ${charge.id}`;
  const ID_FORMAT = /^[a-zA-Z0-9_]+$/; // ids Stripe : pas d'injection PostgREST

  let touched = 0;

  const paymentIntent = typeof charge.payment_intent === 'string' ? charge.payment_intent : null;
  if (paymentIntent && ID_FORMAT.test(paymentIntent)) {
    const { data, error } = await supabase
      .from('paiements')
      .update({ statut: 'overdue', notes: notesRembourse })
      .eq('profile_id', profileId)
      .eq('stripe_payment_intent', paymentIntent)
      .select('id');
    if (error) console.error('[stripe/webhook] refund update (pi) error:', error);
    else touched = data?.length || 0;
  }

  // Fallback : metadata.session_id (paiements antérieurs à v55)
  const sessionId = charge.metadata?.session_id || null;
  if (!touched && sessionId && ID_FORMAT.test(sessionId)) {
    const { data, error } = await supabase
      .from('paiements')
      .update({ statut: 'overdue', notes: notesRembourse })
      .eq('profile_id', profileId)
      .eq('stripe_session_id', sessionId)
      .select('id');
    if (error) console.error('[stripe/webhook] refund update (session) error:', error);
    else touched = data?.length || 0;
  }

  if (!touched) {
    // Remboursement orphelin : visible dans Sentry au lieu de disparaître
    console.error('[stripe/webhook] refund non rattaché à un paiement:', charge.id);
    Sentry.captureMessage(`[stripe/webhook] refund non rattaché : charge ${charge.id} (profile ${profileId})`);
  }
}
