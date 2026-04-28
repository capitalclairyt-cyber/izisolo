import { z } from 'zod';
import { createServerClient } from '@/lib/supabase-server';
import Stripe from 'stripe';

export const runtime = 'nodejs';

/**
 * Crée une Checkout Session Stripe pour que le pro souscrive à Solo ou Pro.
 *
 * Env vars requises (côté Mélutek) :
 *   - STRIPE_SECRET_KEY (clé secrète Mélutek)
 *   - STRIPE_PRICE_ID_SOLO_MENSUEL / _ANNUEL
 *   - STRIPE_PRICE_ID_PRO_MENSUEL / _ANNUEL
 *   - NEXT_PUBLIC_APP_URL (pour les success/cancel URLs)
 *
 * Body : { plan: 'solo'|'pro', periode: 'mensuel'|'annuel' }
 */

const schema = z.object({
  plan: z.enum(['solo', 'pro']),
  periode: z.enum(['mensuel', 'annuel']),
});

const PRICE_IDS = {
  solo: {
    mensuel: process.env.STRIPE_PRICE_ID_SOLO_MENSUEL,
    annuel:  process.env.STRIPE_PRICE_ID_SOLO_ANNUEL,
  },
  pro: {
    mensuel: process.env.STRIPE_PRICE_ID_PRO_MENSUEL,
    annuel:  process.env.STRIPE_PRICE_ID_PRO_ANNUEL,
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

  // Récupérer le profile (pour stripe_customer_id existant)
  const { data: profile } = await supabase
    .from('profiles')
    .select('id, stripe_customer_id, email_contact')
    .eq('id', user.id)
    .single();

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
    apiVersion: '2025-09-30.clover',
  });

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://izisolo.fr';

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
      subscription_data: {
        metadata: { profile_id: user.id, plan, periode },
      },
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
