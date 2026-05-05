import { createClient as createAdminSupabase } from '@supabase/supabase-js';
import Stripe from 'stripe';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Webhook Stripe pour les abonnements SaaS Mélutek.
 *
 * Env vars requises :
 *   - STRIPE_SECRET_KEY (Mélutek)
 *   - STRIPE_WEBHOOK_SECRET_SAAS (signing secret du webhook configuré sur Stripe)
 *
 * À configurer sur dashboard.stripe.com côté MÉLUTEK :
 *   Endpoint : https://izisolo.fr/api/stripe/webhook-saas
 *   Events :
 *     - checkout.session.completed
 *     - customer.subscription.created
 *     - customer.subscription.updated
 *     - customer.subscription.deleted
 *     - invoice.payment_failed
 */

function adminClient() {
  return createAdminSupabase(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
}

export async function POST(request) {
  if (!process.env.STRIPE_SECRET_KEY || !process.env.STRIPE_WEBHOOK_SECRET_SAAS) {
    return new Response('Stripe SaaS not configured', { status: 503 });
  }

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2025-09-30.clover' });

  const rawBody = await request.text();
  const signature = request.headers.get('stripe-signature');

  let event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, process.env.STRIPE_WEBHOOK_SECRET_SAAS);
  } catch (err) {
    console.error('[webhook-saas] signature failed:', err.message);
    return new Response(`Signature failed: ${err.message}`, { status: 400 });
  }

  const supabase = adminClient();

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        const profileId = session.metadata?.profile_id || session.client_reference_id;
        if (!profileId) break;
        // Stocker stripe_customer_id pour retrouver le client lors des prochains events
        if (session.customer) {
          await supabase
            .from('profiles')
            .update({ stripe_customer_id: session.customer })
            .eq('id', profileId);
        }
        break;
      }
      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const sub = event.data.object;
        const profileId = sub.metadata?.profile_id;
        const plan = sub.metadata?.plan; // 'solo' | 'pro' | 'premium'
        if (!profileId || !plan) break;
        // À la souscription, le trial in-app devient irrelevant (Stripe gère
        // sa propre logique trial). On ne nullify PAS trial_started_at pour
        // garder l'historique, mais le helper effectivePlan() retournera le
        // plan Stripe (sub active) au lieu de 'pro' trial. Aussi on remet à
        // false les flags reminder pour permettre un futur trial sur un
        // autre cycle si jamais (edge case).
        await supabase
          .from('profiles')
          .update({
            plan,
            stripe_subscription_id: sub.id,
            stripe_subscription_status: sub.status,
            stripe_current_period_end: sub.current_period_end
              ? new Date(sub.current_period_end * 1000).toISOString()
              : null,
          })
          .eq('id', profileId);
        break;
      }
      case 'customer.subscription.deleted': {
        const sub = event.data.object;
        const profileId = sub.metadata?.profile_id;
        if (!profileId) break;

        // ⚠️ NE PAS downgrade vers 'free' — `free` est désormais le plan
        // INTERNE EXEMPTÉ FULL-ACCESS (réservé Colin/Maude/démos), pas un
        // plan gratuit-restreint comme avant la refonte 2026-05-05.
        //
        // Au lieu de ça, on bascule vers 'solo' (plan d'entrée payant).
        // L'abo étant marqué 'canceled', l'utilisateur sera invité à
        // re-souscrire via la page /parametres. Tant qu'il ne paie pas,
        // les triggers DB v32 lui appliqueront les limites Solo (40 élèves,
        // 1 lieu) — il pourra continuer à voir ses données mais pas en
        // ajouter au-delà des limites Solo.
        //
        // À implémenter plus tard : un état "subscription_expired" qui
        // affiche un bandeau "ton abo a expiré, re-souscris" + bloque
        // certaines features critiques (mailing, SMS, Stripe Payment Link).
        await supabase
          .from('profiles')
          .update({
            plan: 'solo',
            stripe_subscription_status: 'canceled',
            stripe_subscription_id: null,
          })
          .eq('id', profileId);
        break;
      }
      case 'invoice.payment_failed': {
        const invoice = event.data.object;
        const customerId = invoice.customer;
        if (!customerId) break;
        await supabase
          .from('profiles')
          .update({ stripe_subscription_status: 'past_due' })
          .eq('stripe_customer_id', customerId);
        break;
      }
    }
    return Response.json({ received: true });
  } catch (err) {
    console.error('[webhook-saas] handler error:', err);
    return new Response(`Handler error: ${err.message}`, { status: 500 });
  }
}
