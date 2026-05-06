/**
 * POST /api/stripe/customer-portal
 *
 * Crée une session du Customer Portal Stripe pour que la prof gère son
 * abonnement IziSolo : changer de carte, voir factures, annuler, etc.
 *
 * Pré-requis :
 *   - La prof doit avoir un `stripe_customer_id` (rempli par le webhook
 *     checkout.session.completed après sa première souscription)
 *   - Customer Portal doit être configuré dans dashboard.stripe.com
 *     (Settings → Billing → Customer Portal)
 *
 * Réponse : { url: string } (URL à laquelle rediriger la prof)
 */

import { createServerClient } from '@/lib/supabase-server';
import Stripe from 'stripe';

export const runtime = 'nodejs';

export async function POST() {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return Response.json({ error: 'Non authentifié' }, { status: 401 });
  }

  if (!process.env.STRIPE_SECRET_KEY || process.env.STRIPE_SECRET_KEY.startsWith('sk_dummy')) {
    return Response.json(
      { error: 'Stripe SaaS pas configuré côté Mélutek.' },
      { status: 503 }
    );
  }

  // Récupérer le stripe_customer_id de la prof
  const { data: profile } = await supabase
    .from('profiles')
    .select('stripe_customer_id')
    .eq('id', user.id)
    .single();

  if (!profile?.stripe_customer_id) {
    return Response.json(
      {
        error: 'Pas de compte Stripe lié. Souscris d\'abord à un plan.',
      },
      { status: 400 }
    );
  }

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
    apiVersion: '2025-09-30.clover',
  });

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://izisolo.fr';

  try {
    const session = await stripe.billingPortal.sessions.create({
      customer: profile.stripe_customer_id,
      return_url: `${baseUrl}/parametres`,
    });
    return Response.json({ url: session.url });
  } catch (err) {
    console.error('[customer-portal] error:', err);
    // Erreur typique : "No configuration provided" si Customer Portal pas
    // activé dans dashboard.stripe.com → message d'aide à la prof.
    if (err.message?.includes('No configuration')) {
      return Response.json(
        {
          error: 'Customer Portal pas encore activé. L\'admin Mélutek doit le configurer dans le dashboard Stripe (Settings → Billing → Customer Portal → Save).',
        },
        { status: 503 }
      );
    }
    return Response.json(
      { error: err.message || 'Erreur Stripe' },
      { status: 500 }
    );
  }
}
