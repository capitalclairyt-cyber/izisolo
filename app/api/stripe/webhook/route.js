import { createClient as createAdminSupabase } from '@supabase/supabase-js';
import { verifyStripeSignature, getCheckoutSessionAmount, getCheckoutSessionEmail } from '@/lib/stripe';

// Commission IziSolo prélevée sur chaque paiement encaissé via le portail (Stripe).
// Calculée et stockée en DB pour facturation SaaS mensuelle (sprint post-launch).
const COMMISSION_RATE = 0.01; // 1%

// Désactiver le parsing JSON automatique : on a besoin du raw body pour la signature.
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function adminClient() {
  return createAdminSupabase(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
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
    commission_taux: COMMISSION_RATE,
    commission_montant: commission,
    notes: `Stripe · ${email || 'email inconnu'}${clientId ? '' : ' · client à attribuer'}`,
  });

  if (insertErr) {
    console.error('[stripe/webhook] insert paiement error:', insertErr);
    throw new Error('Failed to create paiement: ' + insertErr.message);
  }

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
  // Trouver le paiement via la session associée
  const sessionId = charge.metadata?.session_id || charge.payment_intent;
  if (!sessionId) return;

  // Marquer le paiement comme remboursé via les notes (pas de statut "refunded" en DB)
  const { error } = await supabase
    .from('paiements')
    .update({
      statut: 'unpaid',
      notes: `[REMBOURSÉ ${new Date().toISOString().slice(0, 10)}] Stripe charge: ${charge.id}`,
    })
    .eq('profile_id', profileId)
    .or(`stripe_session_id.eq.${sessionId},notes.ilike.%${sessionId}%`);

  if (error) {
    console.error('[stripe/webhook] refund update error:', error);
  }
}
