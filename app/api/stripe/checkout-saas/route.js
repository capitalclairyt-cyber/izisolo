import { z } from 'zod';
import { withRoute } from '@/lib/api-route';
import { estCompteTest } from '@/lib/admin-stats';
import { PLANS_PAYANTS, PLANS_ANNUEL } from '@/lib/constantes';
import { typeStructure } from '@/lib/structure';
import Stripe from 'stripe';
import { STRIPE_API_VERSION } from '@/lib/stripe-api-version';
import { reportError } from '@/lib/report';

export const runtime = 'nodejs';

/**
 * Crée une Checkout Session Stripe pour qu'une structure souscrive à un plan
 * PAYANT : Complet (29 €/mois), Association (39 €/mois ou 390 €/an), Studio
 * (59 €/mois ou 590 €/an).
 *
 * Depuis le freemium (Colin, 2026-09-13) : Essentiel est GRATUIT, il n'a
 * aucun Price et ne se souscrit pas ; `plan: 'solo'` est refusé en 400.
 * Multi (49 €) est retiré : refusé aussi.
 *
 * L'annuel n'existe que pour Association et Studio (deux mois offerts) :
 * une asso vote un budget et paie par virement après décision du bureau.
 *
 * Le plan Association exige une structure de type `association` (RNA saisi à
 * l'onboarding) : c'est le garde-fou contre le studio qui se déclarerait asso
 * pour payer 20 € de moins.
 *
 * Env vars requises (côté vendeur, compte Stripe « Maude Yoga ») :
 *   - STRIPE_SECRET_KEY
 *   - STRIPE_PRICE_ID_PRO_MENSUEL
 *   - STRIPE_PRICE_ID_ASSO_MENSUEL, STRIPE_PRICE_ID_ASSO_ANNUEL
 *   - STRIPE_PRICE_ID_STUDIO_MENSUEL, STRIPE_PRICE_ID_STUDIO_ANNUEL
 *   - NEXT_PUBLIC_APP_URL
 *
 * Body : { plan: 'pro'|'asso'|'studio', periode: 'mensuel'|'annuel' }
 */

const schema = z.object({
  plan: z.enum(PLANS_PAYANTS),
  periode: z.enum(['mensuel', 'annuel']).default('mensuel'),
});

const PRICE_IDS = {
  pro: {
    mensuel: process.env.STRIPE_PRICE_ID_PRO_MENSUEL,
  },
  asso: {
    mensuel: process.env.STRIPE_PRICE_ID_ASSO_MENSUEL,
    annuel: process.env.STRIPE_PRICE_ID_ASSO_ANNUEL,
  },
  studio: {
    mensuel: process.env.STRIPE_PRICE_ID_STUDIO_MENSUEL,
    annuel: process.env.STRIPE_PRICE_ID_STUDIO_ANNUEL,
  },
};

// Un abonnement déjà vivant : re-souscrire créerait un SECOND abonnement chez
// Stripe, facturé immédiatement, et le webhook écraserait l'id du premier —
// qui continuerait de débiter en étant devenu invisible dans l'app.
const STATUTS_ABONNEE = ['active', 'trialing', 'past_due', 'unpaid'];

const colonneInconnue = (e) => e && (e.code === '42703' || e.code === 'PGRST204');

export const POST = withRoute({ auth: 'user' }, async ({ request, auth }) => {
  const { studioId, user, supabase } = auth;

  // Validation
  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Body JSON invalide' }, { status: 400 });
  }
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    // 'solo' (Essentiel) arrive ici : gratuit, il ne se souscrit pas.
    const demande = body?.plan;
    if (demande === 'solo') {
      return Response.json({
        error: 'Essentiel est gratuit : il n\'y a rien à souscrire, tu y es déjà.',
        code: 'PLAN_GRATUIT',
      }, { status: 400 });
    }
    return Response.json({ error: 'Plan ou période invalide', code: 'PLAN_INVALIDE' }, { status: 400 });
  }
  const { plan, periode } = parsed.data;

  if (periode === 'annuel' && !PLANS_ANNUEL.includes(plan)) {
    return Response.json({
      error: 'L\'abonnement annuel n\'existe que pour les plans Association et Studio.',
      code: 'PERIODE_INVALIDE',
    }, { status: 400 });
  }

  // Récupérer le profile (stripe_customer_id existant, état de l'abonnement,
  // type de structure). `type_structure` est neuve (v110) : on relit sans elle
  // si la base ne la connaît pas encore, une prof seule reste une prof seule.
  // (Listes écrites en toutes lettres : verifier-selects ne lit pas un template, §12.)
  let { data: profile, error: eProfil } = await supabase
    .from('profiles')
    .select('id, stripe_customer_id, plan, trial_started_at, stripe_subscription_status, studio_slug, studio_nom, type_structure')
    .eq('id', studioId)
    .single();
  if (colonneInconnue(eProfil)) {
    ({ data: profile } = await supabase
      .from('profiles')
      .select('id, stripe_customer_id, plan, trial_started_at, stripe_subscription_status, studio_slug, studio_nom')
      .eq('id', studioId)
      .single());
  }

  // ── Quatre refus, avant que Stripe ne voie quoi que ce soit ──────────────
  // (a) Déjà abonnée : sinon double prélèvement, et le premier abonnement
  //     devient invisible tout en continuant de débiter.
  if (STATUTS_ABONNEE.includes(profile?.stripe_subscription_status)) {
    return Response.json({
      error: 'Tu as déjà un abonnement en cours. Gère-le depuis « Gérer mon abonnement ».',
      code: 'DEJA_ABONNEE',
    }, { status: 409 });
  }

  // (b) Le plan Association est réservé aux associations déclarées (RNA).
  const type = typeStructure(profile);
  if (plan === 'asso' && type !== 'association') {
    return Response.json({
      error: 'Le plan Association est réservé aux associations déclarées : indique ton numéro RNA dans Paramètres → Studio & lieux.',
      code: 'ASSOCIATION_REQUISE',
    }, { status: 403 });
  }
  // (c) Et inversement, une association ne prend pas le plan Studio : ses
  //     rubriques (bureau, adhésions, AG) vivent dans le sien.
  if (plan === 'studio' && type === 'association') {
    return Response.json({
      error: 'Ton IziSolo est déclaré comme association : son plan est Association, pas Studio.',
      code: 'PLAN_HORS_FAMILLE',
    }, { status: 403 });
  }

  // (d) Comptes internes : le démo est en plan 'free', donc getTrialStatus rend
  //     active:false, donc AUCUN trial_end n'est posé — un clic curieux pendant
  //     une démo débiterait pour de vrai, immédiatement.
  if (profile?.plan === 'free' || estCompteTest({ email: user.email, studio_slug: profile?.studio_slug, studio_nom: profile?.studio_nom })) {
    return Response.json({
      error: 'Ce compte est un compte de démonstration : il ne peut pas souscrire.',
      code: 'COMPTE_TEST',
    }, { status: 403 });
  }

  // Les refus « métier » passent AVANT la configuration : une prof seule qui
  // demande Association doit lire « réservé aux associations », jamais « prix
  // non configuré » (trouvé par la preuve du lot 0, en local sans env vars).
  const priceId = PRICE_IDS[plan]?.[periode];
  if (!priceId) {
    return Response.json({
      error: `Prix Stripe non configuré pour ${plan}/${periode}. L'admin doit définir l'env var.`,
      code: 'PRIX_NON_CONFIGURE',
    }, { status: 500 });
  }

  if (!process.env.STRIPE_SECRET_KEY || process.env.STRIPE_SECRET_KEY.startsWith('sk_dummy')) {
    return Response.json({
      error: 'Stripe SaaS pas encore configuré côté Mélutek. Contacte le support.',
    }, { status: 503 });
  }

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
    apiVersion: STRIPE_API_VERSION,
  });

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://www.izisolo.fr';

  // AUCUN trial Stripe (décision Colin 2026-08-22) : les 30 jours sont déjà
  // comptés par IziSolo, la prof paie le jour où elle décide de rester.
  const subscriptionData = {
    metadata: { profile_id: studioId, plan, periode },
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
        profile_id: studioId,
        plan,
        periode,
      },
      subscription_data: subscriptionData,
      // La session revient dans l'URL : l'écran peut CONSTATER l'abonnement au
      // lieu d'annoncer « activé » sur la foi d'une redirection, même quand le
      // webhook a échoué.
      success_url: `${baseUrl}/parametres/abonnement?abo=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/parametres/abonnement?abo=cancel`,
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
