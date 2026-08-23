import { withRoute } from '@/lib/api-route';
import { createAdminClient } from '@/lib/supabase-admin';
import Stripe from 'stripe';
import { STRIPE_API_VERSION } from '@/lib/stripe-api-version';
import { reportError } from '@/lib/report';
import { planDepuisSubscription, finPeriodeISO } from '@/lib/stripe-abonnement';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Webhook Stripe des abonnements SaaS (la prof paie IziSolo).
 *
 * ⚠️ À ne pas confondre avec /api/stripe/webhook, qui est le webhook ÉLÈVE :
 * celui-là vit sur le compte Stripe de chaque prof et lit son secret depuis
 * profiles.stripe_webhook_secret. Ici, c'est NOTRE compte, un seul secret.
 *
 * Env vars requises : STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET_SAAS.
 * Endpoint : https://www.izisolo.fr/api/stripe/webhook-saas (TOUJOURS www,
 * sans www un redirect 307 casse la signature).
 *
 * Events écoutés : checkout.session.completed, customer.subscription.created,
 * customer.subscription.updated, customer.subscription.deleted,
 * invoice.payment_failed.
 *
 * ── Deux règles apprises à l'audit du 2026-08-22, à ne pas défaire ──────────
 *
 * 1. TOUTE écriture est VÉRIFIÉE. supabase-js ne LÈVE pas sur une erreur SQL :
 *    il résout avec { data, error }. Un `await supabase.update()` sans lecture
 *    de `error` avale une colonne inconnue, un CHECK violé ou un 0 ligne, et le
 *    try/catch autour ne sert à rien. Le scénario : la prof paie, l'update
 *    échoue, la route rend 200, l'event est marqué traité, et le rejeu de
 *    Stripe (3 jours) est neutralisé par la déduplication. Argent encaissé,
 *    plan jamais activé, zéro trace.
 *
 * 2. L'ORDRE des events n'est PAS garanti et un event peut être rejoué. D'où :
 *    stripe_customer_id écrit par tous les bras qui le connaissent, `deleted`
 *    borné à l'abonnement réellement en cours, et le marqueur d'idempotence
 *    posé SEULEMENT si le traitement a abouti.
 */

const echoue = async (etape, details) => {
  // await : la lambda gèle dès la réponse rendue, un reportError non attendu
  // n'atteint jamais erreurs_app (lib/report.js le documente).
  await reportError(`[webhook-saas] ${etape}`, details);
  return new Response('Handler error', { status: 500 }); // 500 → Stripe rejoue
};

/** Applique un update sur profiles et EXIGE qu'il ait touché une ligne. */
async function majProfil(supabase, filtre, valeurs, contexte) {
  let q = supabase.from('profiles').update(valeurs);
  for (const [col, val] of Object.entries(filtre)) q = q.eq(col, val);
  const { error, count } = await q.select('id', { count: 'exact' });
  if (error) return { ok: false, raison: `erreur SQL : ${error.message}`, contexte };
  if (!count) return { ok: false, raison: 'aucune ligne touchée', contexte };
  return { ok: true, count };
}

export const POST = withRoute({ auth: 'public' }, async ({ request }) => {
  if (!process.env.STRIPE_SECRET_KEY || !process.env.STRIPE_WEBHOOK_SECRET_SAAS) {
    return new Response('Stripe SaaS not configured', { status: 503 });
  }

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: STRIPE_API_VERSION });

  const rawBody = await request.text();
  const signature = request.headers.get('stripe-signature');

  let event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, process.env.STRIPE_WEBHOOK_SECRET_SAAS);
  } catch (err) {
    await reportError('[webhook-saas] signature failed:', err.message);
    return new Response(`Signature failed: ${err.message}`, { status: 400 });
  }

  const supabase = createAdminClient();

  // ─── Idempotence ────────────────────────────────────────────────────────
  // Stripe redélivre (timeout, replay). Sans ça, un customer.subscription.deleted
  // rejoué après un nouveau checkout dégraderait une prof qui vient de
  // re-souscrire. Table créée par la migration v37.
  const { data: dejaTraite, error: eDedup } = await supabase
    .from('stripe_events_processed')
    .select('event_id')
    .eq('event_id', event.id)
    .maybeSingle();
  if (eDedup) {
    // La table manque ou est illisible : on le DIT, au lieu du try/catch muet
    // d'avant qui laissait croire à une déduplication inexistante.
    await reportError('[webhook-saas] déduplication indisponible', { event: event.id, error: eDedup.message });
  } else if (dejaTraite) {
    return Response.json({ received: true, deduped: true });
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        const profileId = session.metadata?.profile_id || session.client_reference_id;
        if (!profileId) {
          // Un paiement SaaS encaissé qui n'active aucun plan : grave, et
          // invisible tant que ce bras se contentait d'un break muet.
          return await echoue('checkout.session.completed SANS profile_id', { session: session.id });
        }
        if (session.customer) {
          const r = await majProfil(supabase, { id: profileId }, { stripe_customer_id: session.customer }, 'checkout');
          if (!r.ok) return await echoue('checkout : stripe_customer_id non écrit', { ...r, profileId });
        }
        break;
      }

      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const sub = event.data.object;
        const profileId = sub.metadata?.profile_id;
        // Le plan vient du PRICE, pas de la metadata figée à la création : sans
        // ça, une prof qui monte en Complet depuis le portail paierait 29 €
        // en restant bridée en Essentiel (la metadata ne bouge pas).
        const plan = planDepuisSubscription(sub);

        if (!profileId) {
          // Abonnement créé à la main dans le Dashboard (dépannage courant) :
          // on rattrape par le customer plutôt que d'ignorer en silence.
          if (!sub.customer) return await echoue('subscription sans profile_id ni customer', { sub: sub.id });
          const r = await majProfil(supabase, { stripe_customer_id: sub.customer }, {
            ...(plan ? { plan } : {}),
            stripe_subscription_id: sub.id,
            stripe_subscription_status: sub.status,
            stripe_current_period_end: finPeriodeISO(sub),
          }, 'subscription par customer');
          if (!r.ok) return await echoue('subscription : rattachement par customer impossible', { ...r, sub: sub.id, customer: sub.customer });
          break;
        }

        if (!plan) return await echoue('plan indéterminable depuis le price', { sub: sub.id, price: sub.items?.data?.[0]?.price?.id });

        const r = await majProfil(supabase, { id: profileId }, {
          plan,
          // Écrit ici AUSSI : l'ordre des events n'est pas garanti, et si
          // checkout.session.completed se perd, la prof se retrouve abonnée
          // sans customer, donc sans accès au portail.
          ...(sub.customer ? { stripe_customer_id: sub.customer } : {}),
          stripe_subscription_id: sub.id,
          stripe_subscription_status: sub.status,
          stripe_current_period_end: finPeriodeISO(sub),
        }, 'subscription');
        if (!r.ok) return await echoue('subscription : profil non mis à jour', { ...r, profileId, sub: sub.id });
        break;
      }

      case 'customer.subscription.deleted': {
        const sub = event.data.object;
        const profileId = sub.metadata?.profile_id;
        if (!profileId) {
          if (!sub.customer) return await echoue('deleted sans profile_id ni customer', { sub: sub.id });
          break;
        }

        // `plan` reste sur le dernier plan payé : c'est `stripe_subscription_status`
        // qui fait foi pour l'accès (lib/trial.js), et garder le plan permet de
        // proposer la bonne re-souscription. On ne descend PAS vers 'free', qui
        // est le plan interne exempté (Colin, Maude, démos).
        //
        // Le filtre sur stripe_subscription_id est essentiel : un `deleted`
        // livré après un `created` (ordre non garanti, ou rejeu) gèlerait une
        // prof qui vient de re-souscrire.
        const r = await majProfil(supabase, { id: profileId, stripe_subscription_id: sub.id }, {
          stripe_subscription_status: 'canceled',
          stripe_subscription_id: null,
        }, 'deleted');
        if (!r.ok) {
          // Pas une erreur : c'est le cas normal quand l'abonnement supprimé
          // n'est plus celui en cours. On le note sans faire rejouer Stripe.
          await reportError('[webhook-saas] deleted ignoré (abonnement plus en cours)', { profileId, sub: sub.id, raison: r.raison });
        }
        break;
      }

      case 'invoice.payment_failed': {
        // On n'écrit RIEN ici, volontairement. L'ancien code basculait en
        // 'past_due' sur le seul customer : n'importe quelle facture ponctuelle
        // affichait le bandeau rouge à une prof qui paie très bien, et l'event
        // pouvait écraser un 'active' plus récent. Le statut faisant foi arrive
        // par customer.subscription.updated, que Stripe envoie de toute façon.
        break;
      }
    }

    // Marqueur d'idempotence : posé SEULEMENT maintenant, c'est-à-dire
    // seulement si le traitement a abouti (tous les échecs ont rendu 500).
    const { error: eMarque } = await supabase
      .from('stripe_events_processed')
      .insert({ event_id: event.id, event_type: event.type });
    if (eMarque && eMarque.code !== '23505') {
      // 23505 = déjà marqué par une livraison concurrente : c'est très bien.
      await reportError('[webhook-saas] marqueur d\'idempotence non posé', { event: event.id, error: eMarque.message });
    }

    return Response.json({ received: true });
  } catch (err) {
    return await echoue('handler error', err);
  }
});
