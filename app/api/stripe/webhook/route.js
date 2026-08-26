import { withRoute } from '@/lib/api-route';
import { createAdminClient } from '@/lib/supabase-admin';
import { verifyStripeSignature, getCheckoutSessionAmount, getCheckoutSessionEmail } from '@/lib/stripe';
import { estRefPresence } from '@/lib/paiement-seance';
import { dateSessionStripe } from '@/lib/paiement-en-ligne';
import { sendPushToUser } from '@/lib/push-server';
import { escapeIlike } from '@/lib/utils';
import { reportError } from '@/lib/report';

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

// auth:'public' : l'authentification est la SIGNATURE Stripe, vérifiée dans
// le handler sur le body brut (que le wrapper ne consomme jamais sans schema).
export const POST = withRoute({ auth: 'public' }, async ({ request }) => {
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
    reportError('[stripe/webhook] signature verification failed:', err.message);
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
    reportError('[stripe/webhook] handler error:', err);
    return new Response(`Handler error: ${err.message}`, { status: 500 });
  }
});

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

  // ─── Paiement PAR SÉANCE (v2 de v86, 2026-08-19) ──────────────────────────
  // La résa d'un cours à tarif_unitaire tague le Payment Link du cours avec
  // client_reference_id=<presenceId> (lib/paiement-seance). Si la référence
  // est là et pointe une vraie présence du studio, le paiement se rattache à
  // la séance — ce qui la sort de « à régler » partout et déverrouille le
  // lien visio d'un cours en ligne (lib/visio). Prioritaire sur le matching
  // d'offre : une référence de présence est plus précise qu'un plink.
  if (estRefPresence(session.client_reference_id)) {
    const traite = await handleSeancePayee(supabase, profileId, session, { email, amount });
    if (traite) return;
    // Référence inconnue/étrangère : on retombe sur le flux générique
    // (paiement enregistré quand même — l'argent est réel).
  }

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
      .ilike('email', escapeIlike(email))
      .maybeSingle();
    clientId = client?.id || null;
  }

  // Insérer le paiement avec calcul de la commission IziSolo.
  // La date est celle de la SESSION Stripe, pas celle du traitement : quand
  // une prof branche son webhook après coup et REJOUE l'événement depuis son
  // dashboard (le geste de rattrapage, cf. Manon 2026-08-26), l'encaissement
  // doit rester daté du jour où l'élève a payé — sinon la déclaration URSSAF,
  // qui compte en trésorerie (v93), tombe dans le mauvais trimestre.
  const today = dateSessionStripe(session);
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
    reportError('[stripe/webhook] insert paiement error:', insertErr);
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

/**
 * Paiement d'UNE séance via le Payment Link du cours (client_reference_id =
 * presence id). Retourne true si traité ici, false pour retomber sur le flux
 * générique (référence qui ne pointe aucune présence de CE studio).
 */
async function handleSeancePayee(supabase, profileId, session, { email, amount }) {
  const presenceId = session.client_reference_id;

  const { data: presence, error: pErr } = await supabase
    .from('presences')
    .select('id, client_id, cours_id')
    .eq('id', presenceId)
    .maybeSingle();
  if (pErr) {
    reportError('[stripe/webhook] séance — lecture présence err:', pErr, { profileId });
    return false;
  }
  if (!presence) return false;

  // OWNERSHIP : la présence doit appartenir au studio du webhook — un
  // client_reference_id forgé vers la présence d'un AUTRE studio ne doit
  // jamais créer un paiement chez lui.
  const { data: cours } = await supabase
    .from('cours')
    .select('id, nom, date, profile_id')
    .eq('id', presence.cours_id)
    .maybeSingle();
  if (!cours || cours.profile_id !== profileId) return false;

  // Même règle que pour les offres : la date comptable est celle de la session.
  const today = dateSessionStripe(session);
  const dateStr = cours.date
    ? new Date(cours.date + 'T12:00:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })
    : '';
  const intitule = `${cours.nom || 'Séance'}${dateStr ? ` — ${dateStr}` : ''}`;
  const commission = parseFloat((amount * COMMISSION_RATE).toFixed(2));

  // La séance est-elle DÉJÀ payée (double clic = 2 sessions Stripe, l'argent
  // est parti 2 fois) ? On enregistre quand même le 2e paiement — le cacher
  // serait mentir sur l'argent encaissé — mais SANS presence_id (la séance
  // est déjà couverte) et avec une note explicite pour rembourser.
  const { data: dejaPayee } = await supabase
    .from('paiements')
    .select('id')
    .eq('presence_id', presence.id)
    .eq('statut', 'paid')
    .limit(1)
    .maybeSingle();

  const { error: insertErr } = await supabase.from('paiements').insert({
    profile_id: profileId,
    client_id: presence.client_id,
    presence_id: dejaPayee ? null : presence.id, // paiement à la séance (v65)
    intitule,
    montant: amount,
    statut: 'paid',
    mode: 'CB',
    date: today,
    date_encaissement: today,
    stripe_session_id: session.id,
    stripe_payment_intent: typeof session.payment_intent === 'string' ? session.payment_intent : null,
    commission_taux: COMMISSION_RATE,
    commission_montant: commission,
    notes: dejaPayee
      ? `⚠️ Séance déjà payée — possible DOUBLE paiement Stripe, à vérifier/rembourser. Stripe · ${email || 'email inconnu'}`
      : `Payé en ligne à la réservation. Stripe · ${email || 'email inconnu'}`,
  });
  if (insertErr) {
    reportError('[stripe/webhook] insert paiement séance error:', insertErr);
    throw new Error('Failed to create paiement séance: ' + insertErr.message);
  }

  // Le cas « workshop à régler » de cette présence est réglé de fait —
  // best effort : un échec ici ne perd pas le paiement, la prof verra juste
  // un cas déjà réglé dans son inbox.
  if (!dejaPayee) {
    const { error: casErr } = await supabase
      .from('cas_a_traiter')
      .update({
        resolu_at: new Date().toISOString(),
        resolu_action: 'encaisse',
        resolu_notes: 'Payé en ligne (Stripe) à la réservation',
      })
      .eq('profile_id', profileId)
      .eq('presence_id', presence.id)
      .eq('case_type', 'workshop_vs_cours')
      .is('resolu_at', null);
    if (casErr) reportError('[stripe/webhook] résolution cas workshop err:', casErr);
  }

  sendPushToUser(profileId, {
    title: dejaPayee ? '⚠️ Possible double paiement séance' : 'Séance payée en ligne 💳',
    body: `${amount} € — ${intitule}`,
    url: '/revenus',
    tag: `stripe-${session.id}`,
  }, { type: 'paiement_stripe' }).catch(() => {});

  return true;
}

async function handleChargeRefunded(supabase, profileId, charge) {
  // Sprint 5 audit : l'ancien matching cherchait charge.payment_intent (pi_…)
  // dans stripe_session_id (cs_…) → AUCUN remboursement n'était jamais
  // répercuté. On matche désormais sur stripe_payment_intent (stocké à
  // l'encaissement depuis v55), avec fallback legacy sur la session.
  // B1f : un remboursement PARTIEL (5 € sur 50 €) basculait TOUT le paiement
  // « overdue » → gonflait « à encaisser » chez la prof ET « À régler » chez
  // l'élève (contraire à la promesse du code espace) ; et les notes (trace
  // « Stripe · email ») étaient ÉCRASÉES. Désormais : partiel = note ajoutée,
  // statut intact ; complet = overdue (sémantique existante) + note AJOUTÉE.
  const totalRefund = Number(charge.amount_refunded || 0);
  const totalCharge = Number(charge.amount || 0);
  const remboursementComplet = totalCharge > 0 && totalRefund >= totalCharge;
  const montantStr = (totalRefund / 100).toFixed(2).replace('.', ',');
  const noteAjout = `[${remboursementComplet ? 'REMBOURSÉ' : `REMBOURSEMENT PARTIEL ${montantStr} €`} ${new Date().toISOString().slice(0, 10)}] Stripe charge: ${charge.id}`;
  const ID_FORMAT = /^[a-zA-Z0-9_]+$/; // ids Stripe : pas d'injection PostgREST

  let touched = 0;

  const majPaiements = async (col, val) => {
    const { data: rows, error: selErr } = await supabase
      .from('paiements')
      .select('id, notes')
      .eq('profile_id', profileId)
      .eq(col, val);
    if (selErr) {
      reportError(`[stripe/webhook] refund select (${col}) error:`, selErr);
      return 0;
    }
    let n = 0;
    for (const row of (rows || [])) {
      const notes = [row.notes, noteAjout].filter(Boolean).join('\n');
      const patch = remboursementComplet ? { statut: 'overdue', notes } : { notes };
      const { error } = await supabase.from('paiements').update(patch).eq('id', row.id);
      if (error) reportError(`[stripe/webhook] refund update (${col}) error:`, error);
      else n++;
    }
    return n;
  };

  const paymentIntent = typeof charge.payment_intent === 'string' ? charge.payment_intent : null;
  if (paymentIntent && ID_FORMAT.test(paymentIntent)) {
    touched = await majPaiements('stripe_payment_intent', paymentIntent);
  }

  // Fallback : metadata.session_id (paiements antérieurs à v55)
  const sessionId = charge.metadata?.session_id || null;
  if (!touched && sessionId && ID_FORMAT.test(sessionId)) {
    touched = await majPaiements('stripe_session_id', sessionId);
  }

  if (!touched) {
    // Remboursement orphelin : visible dans erreurs_app au lieu de disparaître
    reportError('[stripe/webhook] refund non rattaché à un paiement:', charge.id, { profileId });
  }
}
