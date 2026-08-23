import { withRoute } from '@/lib/api-route';
import { createAdminClient } from '@/lib/supabase-admin';
import { parseJsonBody, adminUpdatePlanSchema } from '@/lib/validation';
import { reportError } from '@/lib/report';
import Stripe from 'stripe';
import { STRIPE_API_VERSION } from '@/lib/stripe-api-version';

/**
 * Changer le plan d'un studio depuis /admin/users.
 *
 * ⚠️ Ce geste touche de l'ARGENT RÉEL depuis le 2026-08-22.
 *
 * Avant, la route écrivait `{ plan }` et rien d'autre : passer une bêta-testeuse
 * en « free » (le plan interne tout-inclus et gratuit) la laissait PRÉLEVÉE chez
 * Stripe. Le grep était sans appel, aucun appel à subscriptions.cancel n'existait
 * nulle part dans le repo. On offrait l'accès à quelqu'un qui continuait de payer.
 *
 * Désormais : passer un compte en `free` annule d'abord son abonnement Stripe,
 * puis écrit le plan. Si Stripe refuse, on n'écrit RIEN — mieux vaut un plan non
 * changé qu'un compte « offert » qui se fait débiter le mois suivant.
 *
 * L'annulation est IMMÉDIATE et non `at_period_end` : la prof passe en accès
 * complet gratuit dans la seconde, elle ne perd donc rien de ce qu'elle a payé.
 */
export const POST = withRoute({ auth: 'admin' }, async ({ request }) => {
  const { data, errorResponse } = await parseJsonBody(request, adminUpdatePlanSchema);
  if (errorResponse) return errorResponse;
  const { userId, plan } = data;

  // Écriture via le client ADMIN : avec le client session, la RLS de profiles
  // (id = auth.uid()) rendait l'update d'un AUTRE profil silencieusement sans
  // effet (0 ligne touchée, { ok: true } mensonger). Sprint 3 audit.
  const admin = createAdminClient();

  const { data: profil, error: eLecture } = await admin
    .from('profiles')
    .select('id, studio_nom, plan, stripe_subscription_id, stripe_subscription_status')
    .eq('id', userId)
    .maybeSingle();
  if (eLecture) {
    reportError('update-plan lecture:', eLecture);
    return new Response('Server error', { status: 500 });
  }
  if (!profil) return Response.json({ error: 'Profil introuvable' }, { status: 404 });

  const abonnementVivant = ['active', 'trialing', 'past_due', 'unpaid', 'incomplete']
    .includes(profil.stripe_subscription_status) && !!profil.stripe_subscription_id;

  const majStripe = {};

  if (plan === 'free' && abonnementVivant) {
    if (!process.env.STRIPE_SECRET_KEY || process.env.STRIPE_SECRET_KEY.startsWith('sk_dummy')) {
      return Response.json({
        error: `${profil.studio_nom || 'Ce studio'} a un abonnement Stripe ${profil.stripe_subscription_status}, et Stripe n'est pas configuré ici : annule son abonnement dans le dashboard Stripe avant de la passer en offert.`,
        code: 'STRIPE_ABSENT',
      }, { status: 409 });
    }
    try {
      const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: STRIPE_API_VERSION });
      const annule = await stripe.subscriptions.cancel(profil.stripe_subscription_id);
      majStripe.stripe_subscription_status = annule.status; // 'canceled'
      majStripe.stripe_subscription_id = null;
      majStripe.stripe_current_period_end = null;
    } catch (err) {
      // Abonnement déjà annulé ou introuvable chez Stripe : la base ment, on la
      // remet d'équerre. Tout autre échec bloque, pour ne jamais afficher
      // « offert » à quelqu'un qui reste prélevé.
      const introuvable = err?.statusCode === 404 || err?.code === 'resource_missing';
      if (!introuvable) {
        reportError('update-plan annulation Stripe:', err, { userId, subscription: profil.stripe_subscription_id });
        return Response.json({
          error: `Stripe a refusé d'annuler l'abonnement (${err?.message || 'erreur inconnue'}). Le plan n'a PAS été changé : annule d'abord dans le dashboard Stripe.`,
          code: 'ANNULATION_REFUSEE',
        }, { status: 502 });
      }
      majStripe.stripe_subscription_status = 'canceled';
      majStripe.stripe_subscription_id = null;
      majStripe.stripe_current_period_end = null;
    }
  }

  const { data: updated, error } = await admin
    .from('profiles')
    .update({ plan, ...majStripe })
    .eq('id', userId)
    .select('id');

  if (error) {
    reportError('update-plan error:', error);
    return new Response('Server error', { status: 500 });
  }
  if (!updated?.length) {
    return Response.json({ error: 'Profil introuvable' }, { status: 404 });
  }

  return Response.json({
    ok: true,
    abonnementAnnule: Object.keys(majStripe).length > 0,
  });
});
