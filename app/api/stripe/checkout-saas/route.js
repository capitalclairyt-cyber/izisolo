import { z } from 'zod';
import { withRoute } from '@/lib/api-route';
import { estCompteTest } from '@/lib/admin-stats';
import Stripe from 'stripe';
import { STRIPE_API_VERSION } from '@/lib/stripe-api-version';
import { reportError } from '@/lib/report';

export const runtime = 'nodejs';

/**
 * Crée une Checkout Session Stripe pour que le pro souscrive à Solo / Pro / Studio.
 *
 * Trial 14 jours appliqué automatiquement (cf. TRIAL_DAYS dans constantes.js).
 *
 * MENSUEL UNIQUEMENT pour l'instant (l'annuel sera réintroduit plus tard
 * avec -20%, mais on garde la signature `periode` pour ne pas casser l'API).
 *
 * Env vars requises (côté Mélutek) :
 *   - STRIPE_SECRET_KEY (clé secrète Mélutek)
 *   - STRIPE_PRICE_ID_SOLO_MENSUEL    (15 €/mois — Essentiel)
 *   - STRIPE_PRICE_ID_PRO_MENSUEL     (29 €/mois — Complet)
 *   - STRIPE_PRICE_ID_PREMIUM_MENSUEL (legacy Studio — plus vendu, jamais posée :
 *     un checkout premium répond « plan indisponible », c'est voulu)
 *   - NEXT_PUBLIC_APP_URL
 *
 * Body : { plan: 'solo'|'pro', periode: 'mensuel' }
 */

// 'premium' (ex-Studio) est LEGACY : plus jamais vendu, aucun Product ni Price
// créé côté Stripe. Le laisser dans l'enum rendait un 500 qui nommait des env
// vars internes à qui le demandait.
const schema = z.object({
  plan: z.enum(['solo', 'pro']),
  periode: z.enum(['mensuel']), // 'annuel' désactivé temporairement
});

const PRICE_IDS = {
  solo: {
    mensuel: process.env.STRIPE_PRICE_ID_SOLO_MENSUEL,
  },
  pro: {
    mensuel: process.env.STRIPE_PRICE_ID_PRO_MENSUEL,
  },
};

// Un abonnement déjà vivant : re-souscrire créerait un SECOND abonnement chez
// Stripe, facturé immédiatement, et le webhook écraserait l'id du premier —
// qui continuerait de débiter en étant devenu invisible dans l'app.
const STATUTS_ABONNEE = ['active', 'trialing', 'past_due'];

export const POST = withRoute({ auth: 'user' }, async ({ request, auth }) => {
  const { user, supabase } = auth;

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
    .select('id, stripe_customer_id, plan, trial_started_at, stripe_subscription_status, studio_slug, studio_nom')
    .eq('id', user.id)
    .single();

  // ── Trois refus, avant que Stripe ne voie quoi que ce soit ───────────────
  // (a) Déjà abonnée : sinon double prélèvement, et le premier abonnement
  //     devient invisible tout en continuant de débiter.
  if (STATUTS_ABONNEE.includes(profile?.stripe_subscription_status)) {
    return Response.json({
      error: 'Tu as déjà un abonnement en cours. Gère-le depuis « Gérer mon abonnement ».',
      code: 'DEJA_ABONNEE',
    }, { status: 409 });
  }

  // (b) Comptes internes : le démo est en plan 'free', donc getTrialStatus rend
  //     active:false, donc AUCUN trial_end n'est posé — un clic curieux pendant
  //     une démo débiterait pour de vrai, immédiatement.
  if (profile?.plan === 'free' || estCompteTest({ email: user.email, studio_slug: profile?.studio_slug, studio_nom: profile?.studio_nom })) {
    return Response.json({
      error: 'Ce compte est un compte de démonstration : il ne peut pas souscrire.',
      code: 'COMPTE_TEST',
    }, { status: 403 });
  }

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
    apiVersion: STRIPE_API_VERSION,
  });

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://www.izisolo.fr';

  // AUCUN trial Stripe (décision Colin 2026-08-22) : les 14 jours sont déjà
  // comptés par IziSolo, la prof paie le jour où elle décide de rester.
  //
  // Ce choix supprime un bug qui frappait au pire moment : l'ancien code posait
  // trial_end dès que `daysLeft >= 2`, or daysLeft est un Math.ceil — à 25 h
  // restantes il vaut 2, et Stripe REFUSE un trial_end à moins de 48 h. Le
  // checkout rendait donc 500 pendant les dernières 24 h d'essai, c'est-à-dire
  // le jour de l'email de relance J-1, le pic de conversion.
  const subscriptionData = {
    metadata: { profile_id: user.id, plan, periode },
  };

  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      customer: profile?.stripe_customer_id || undefined,
      // user.email et JAMAIS email_contact : ce dernier est le contact PUBLIC
      // du studio, modifiable et videable. Les reçus et les relances d'impayé
      // doivent arriver sur la boîte avec laquelle elle se connecte.
      customer_email: !profile?.stripe_customer_id ? user.email : undefined,
      client_reference_id: user.id,
      metadata: {
        profile_id: user.id,
        plan,
        periode,
      },
      subscription_data: subscriptionData,
      // La session revient dans l'URL : l'écran peut CONSTATER l'abonnement au
      // lieu d'annoncer « activé » sur la foi d'une redirection, même quand le
      // webhook a échoué.
      success_url: `${baseUrl}/parametres?tab=abonnement&abo=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/parametres?tab=abonnement&abo=cancel`,
      allow_promotion_codes: true,
    }, {
      // Double clic sur « Passer à Complet » : une seule session créée.
      idempotencyKey: `checkout-saas:${user.id}:${plan}:${periode}`,
    });

    return Response.json({ url: session.url });
  } catch (err) {
    // Détail conservé côté serveur uniquement ; on ne fuite pas le message
    // brut Stripe au client (peut révéler des infos internes).
    reportError('[checkout-saas] error:', err);
    return Response.json({ error: 'Une erreur est survenue, réessaie.' }, { status: 500 });
  }
});
