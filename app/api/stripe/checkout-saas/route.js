import { z } from 'zod';
import { createServerClient } from '@/lib/supabase-server';
import { TRIAL_DAYS } from '@/lib/constantes';
import { getTrialStatus } from '@/lib/trial';
import Stripe from 'stripe';

export const runtime = 'nodejs';

/**
 * Crée une Checkout Session Stripe pour que le pro souscrive à Solo / Pro / Premium.
 *
 * Trial 14 jours appliqué automatiquement (cf. TRIAL_DAYS dans constantes.js).
 *
 * MENSUEL UNIQUEMENT pour l'instant (l'annuel sera réintroduit plus tard
 * avec -20%, mais on garde la signature `periode` pour ne pas casser l'API).
 *
 * Env vars requises (côté Mélutek) :
 *   - STRIPE_SECRET_KEY (clé secrète Mélutek)
 *   - STRIPE_PRICE_ID_SOLO_MENSUEL    (12€/mois)
 *   - STRIPE_PRICE_ID_PRO_MENSUEL     (24€/mois)
 *   - STRIPE_PRICE_ID_PREMIUM_MENSUEL (49€/mois)
 *   - NEXT_PUBLIC_APP_URL
 *
 * Body : { plan: 'solo'|'pro'|'premium', periode: 'mensuel' }
 */

const schema = z.object({
  plan: z.enum(['solo', 'pro', 'premium']),
  periode: z.enum(['mensuel']), // 'annuel' désactivé temporairement
});

const PRICE_IDS = {
  solo: {
    mensuel: process.env.STRIPE_PRICE_ID_SOLO_MENSUEL,
  },
  pro: {
    mensuel: process.env.STRIPE_PRICE_ID_PRO_MENSUEL,
  },
  premium: {
    mensuel: process.env.STRIPE_PRICE_ID_PREMIUM_MENSUEL,
  },
};

export async function POST(request) {
  // Auth
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: 'Non authentifié' }, { status: 401 });

  // Validation
  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Body JSON invalide' }, { status: 400 });
  }
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: 'Plan ou période invalide' }, { status: 400 });
  }
  const { plan, periode } = parsed.data;

  const priceId = PRICE_IDS[plan]?.[periode];
  if (!priceId) {
    return Response.json({
      error: `Prix Stripe non configuré pour ${plan}/${periode}. L'admin doit définir l'env var.`,
    }, { status: 500 });
  }

  if (!process.env.STRIPE_SECRET_KEY || process.env.STRIPE_SECRET_KEY.startsWith('sk_dummy')) {
    return Response.json({
      error: 'Stripe SaaS pas encore configuré côté Mélutek. Contacte le support.',
    }, { status: 503 });
  }

  // Récupérer le profile (pour stripe_customer_id existant + état du trial)
  const { data: profile } = await supabase
    .from('profiles')
    .select('id, stripe_customer_id, email_contact, plan, trial_started_at, stripe_subscription_status')
    .eq('id', user.id)
    .single();

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
    apiVersion: '2025-09-30.clover',
  });

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://izisolo.fr';

  // Calcul du trial restant : si l'user souscrit AVANT la fin de son
  // trial in-app (14j à partir de signup), Stripe doit respecter le temps
  // restant (pas le re-démarrer à 14j). On utilise `trial_end` (timestamp
  // Unix de la fin) au lieu de `trial_period_days`.
  // Si le trial est déjà expiré → pas de trial Stripe (paiement immédiat).
  // Si trial actif → trial Stripe = même endsAt que celui in-app.
  const trialStatus = getTrialStatus(profile);
  const subscriptionData = {
    metadata: { profile_id: user.id, plan, periode },
  };
  if (trialStatus.active && trialStatus.endsAt) {
    subscriptionData.trial_end = Math.floor(trialStatus.endsAt.getTime() / 1000);
  }
  // Si trialStatus.expired ou ineligible → pas de trial Stripe, paiement immédiat

  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      customer: profile?.stripe_customer_id || undefined,
      customer_email: !profile?.stripe_customer_id ? (profile?.email_contact || user.email) : undefined,
      client_reference_id: user.id,
      metadata: {
        profile_id: user.id,
        plan,
        periode,
      },
      subscription_data: subscriptionData,
      success_url: `${baseUrl}/parametres?abo=success`,
      cancel_url: `${baseUrl}/parametres?abo=cancel`,
      allow_promotion_codes: true,
    });

    return Response.json({ url: session.url });
  } catch (err) {
    console.error('[checkout-saas] error:', err);
    return Response.json({ error: err.message || 'Erreur Stripe' }, { status: 500 });
  }
}
