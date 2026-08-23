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

import { withRoute } from '@/lib/api-route';
import Stripe from 'stripe';
import { STRIPE_API_VERSION } from '@/lib/stripe-api-version';
import { reportError } from '@/lib/report';

export const runtime = 'nodejs';

export const POST = withRoute({ auth: 'user' }, async ({ auth }) => {
  const { user, supabase } = auth;

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
    apiVersion: STRIPE_API_VERSION,
  });

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://www.izisolo.fr';

  try {
    // Une configuration de portail créée par l'API naît is_default:false.
    // Sans la nommer, Stripe cherche « la configuration par défaut », qui
    // n'existe que si quelqu'un a cliqué « Save » dans le Dashboard : la route
    // répondait alors 503 à une prof en past_due, c'est-à-dire exactement au
    // moment où elle vient changer sa carte. Le script de setup imprime cet id.
    const session = await stripe.billingPortal.sessions.create({
      customer: profile.stripe_customer_id,
      return_url: `${baseUrl}/parametres?tab=abonnement`,
      ...(process.env.STRIPE_PORTAL_CONFIG_ID
        ? { configuration: process.env.STRIPE_PORTAL_CONFIG_ID }
        : {}),
    });
    return Response.json({ url: session.url });
  } catch (err) {
    reportError('[customer-portal] error:', err);
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
    // Détail conservé côté serveur uniquement (cf. console.error ci-dessus) ;
    // on ne fuite pas le message brut Stripe au client.
    return Response.json(
      { error: 'Une erreur est survenue, réessaie.' },
      { status: 500 }
    );
  }
});
