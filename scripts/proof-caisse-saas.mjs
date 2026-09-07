/**
 * PREUVE — la caisse Stripe SaaS (abonnements des profs), compte « Maude Yoga »
 * en LIVE (2026-09-07).
 *
 * Deux phases.
 *   1. AUTOMATIQUE, sans argent : un studio jetable (prof, en essai) demande un
 *      checkout Essentiel puis Multi → la route répond une URL Stripe ; la
 *      session est RELUE par l'API Stripe avec la clé live de .env.local :
 *      mode abonnement, bon Price, code promo autorisé, email de connexion
 *      comme email client, profile_id en métadonnées. La session Multi est
 *      expirée aussitôt (aucune session orpheline), la session Essentiel est
 *      gardée pour la phase 2.
 *   2. MANUELLE, argent réel : le script imprime l'URL Essentiel ; Colin y
 *      paie avec LANCEMENT50 et une vraie carte (7,50 €). Le script attend
 *      le webhook : statut actif, customer et subscription EN BASE, et la
 *      DATE DE FIN DE PÉRIODE (le point suspect : jamais écrite sur le profil
 *      de Colin malgré trois renouvellements). Puis le portail client répond
 *      une URL, l'abonnement est résilié par l'API (→ webhook deleted →
 *      statut canceled en base), le paiement est REMBOURSÉ par l'API, le
 *      client Stripe supprimé, le studio jetable purgé.
 *
 * Usage :
 *   node --env-file=.env.local scripts/proof-caisse-saas.mjs --sans-paiement   # phase 1 seule
 *   node --env-file=.env.local scripts/proof-caisse-saas.mjs                   # phases 1 + 2
 *   PROOF_BASE=http://localhost:3333 …  (défaut : https://www.izisolo.fr — le
 *   webhook Stripe pointe sur la prod, la phase 2 n'a de sens que là)
 *   PROOF_EMAIL=… : l'email du studio jetable (défaut preuve-caisse@izisolo.fr ;
 *   les reçus Stripe partent à cette adresse).
 *
 * Re-runnable : studio, client Stripe et sessions purgés même en échec.
 */
import { createClient } from '@supabase/supabase-js';
import Stripe from 'stripe';
import { STRIPE_API_VERSION } from '../lib/stripe-api-version.js';

const args = new Set(process.argv.slice(2));
const SANS_PAIEMENT = args.has('--sans-paiement');
const BASE = process.env.PROOF_BASE || 'https://www.izisolo.fr';
const EMAIL = process.env.PROOF_EMAIL || 'preuve-caisse@izisolo.fr';
const ATTENTE_PAIEMENT_MIN = 15;

const need = (k) => { if (!process.env[k]) { console.error(`❌ ${k} manquante (lance avec node --env-file=.env.local)`); process.exit(1); } return process.env[k]; };
const SUPA_URL = need('NEXT_PUBLIC_SUPABASE_URL');
const SVC_KEY = need('SUPABASE_SERVICE_ROLE_KEY');
const ANON_KEY = need('NEXT_PUBLIC_SUPABASE_ANON_KEY');
const SK = need('STRIPE_SECRET_KEY');
const PRICE_SOLO = need('STRIPE_PRICE_ID_SOLO_MENSUEL');
const PRICE_MULTI = need('STRIPE_PRICE_ID_MULTI_MENSUEL');
if (!SK.startsWith('sk_live')) console.log('ℹ️ clé Stripe en mode TEST : la phase 2 ne prouve pas le compte live.');

const svc = createClient(SUPA_URL, SVC_KEY);
const stripe = new Stripe(SK, { apiVersion: STRIPE_API_VERSION });
const PROJECT_REF = new URL(SUPA_URL).hostname.split('.')[0];

let ok = 0, ko = 0;
const c = (l, cond, d = '') => { if (cond) { ok++; console.log('  OK  ' + l + (d ? ' - ' + d : '')); } else { ko++; console.log('  KO  ' + l + (d ? ' - ' + d : '')); } };
const attendre = async (fn, ms = 20000, pas = 1000) => {
  const fin = Date.now() + ms;
  for (;;) { const r = await fn(); if (r) return r; if (Date.now() > fin) return null; await new Promise(r2 => setTimeout(r2, pas)); }
};
const slug = `preuve-caisse-${Date.now().toString(36)}`;

let userId = null, profileId = null, customerId = null, sessionSolo = null, sessionMulti = null, subscriptionId = null;

async function purger() {
  for (const s of [sessionSolo, sessionMulti]) {
    if (s?.id && s.status === 'open') await stripe.checkout.sessions.expire(s.id).catch(() => {});
  }
  if (subscriptionId) await stripe.subscriptions.cancel(subscriptionId).catch(() => {});
  if (customerId) await stripe.customers.del(customerId).catch(() => {});
  // Un client Stripe créé par le checkout et pas encore relu : on le retrouve par email.
  try {
    const { data } = await stripe.customers.list({ email: EMAIL, limit: 10 });
    for (const cu of data) await stripe.customers.del(cu.id).catch(() => {});
  } catch { /* rien */ }
  const { data: lst } = await svc.auth.admin.listUsers({ page: 1, perPage: 200 }).catch(() => ({ data: null }));
  for (const u of (lst?.users || []).filter(x => x.email === EMAIL)) {
    await svc.from('stripe_events_processed').delete().eq('event_id', '__jamais__').then(() => {}, () => {});
    await svc.auth.admin.deleteUser(u.id).catch(() => {});
  }
}
await purger();

// ── Studio jetable : une prof en essai, comme une vraie inscription ─────────
{
  const { data: cree, error } = await svc.auth.admin.createUser({
    email: EMAIL, email_confirm: true, password: `Preuve-${Date.now()}!`, user_metadata: { prenom: 'Preuve' },
  });
  if (error) { console.error('createUser KO:', error.message); process.exit(1); }
  userId = cree.user.id; profileId = userId;
  const profil = await attendre(async () => {
    const { data } = await svc.from('profiles').select('id').eq('id', userId).maybeSingle();
    return data || null;
  }, 15000, 500);
  if (!profil) { console.error('le trigger handle_new_user n\'a pas créé le profil'); await purger(); process.exit(1); }
  await svc.from('profiles').update({ studio_nom: 'Preuve Caisse', studio_slug: slug, plan: 'solo', portail_actif: false }).eq('id', userId);
}

const sessionCookieHeader = async () => {
  const { data: linkData } = await svc.auth.admin.generateLink({ type: 'magiclink', email: EMAIL });
  const anon = createClient(SUPA_URL, ANON_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: otp } = await anon.auth.verifyOtp({ type: 'magiclink', token_hash: linkData.properties.hashed_token });
  const value = 'base64-' + Buffer.from(JSON.stringify(otp.session)).toString('base64url');
  const nm = `sb-${PROJECT_REF}-auth-token`;
  const parts = [];
  if (value.length <= 3180) parts.push(`${nm}=${value}`);
  else for (let i = 0; i * 3180 < value.length; i++) parts.push(`${nm}.${i}=${value.slice(i * 3180, (i + 1) * 3180)}`);
  return parts.join('; ');
};
const idDepuisUrl = (url) => (String(url || '').match(/(cs_(?:live|test)_[A-Za-z0-9]+)/) || [])[1] || null;

try {
  const cookie = await sessionCookieHeader();
  const checkout = async (plan) => {
    const r = await fetch(`${BASE}/api/stripe/checkout-saas`, { method: 'POST', headers: { 'Content-Type': 'application/json', cookie }, body: JSON.stringify({ plan, periode: 'mensuel' }) });
    return { status: r.status, corps: await r.json().catch(() => ({})) };
  };

  // ── 1. Checkout Essentiel ────────────────────────────────────────────────
  console.log(`\n— 1. Checkout Essentiel (${BASE}) —`);
  const r1 = await checkout('solo');
  c('la route répond 200 avec une URL Stripe', r1.status === 200 && /checkout\.stripe\.com/.test(r1.corps.url || ''), `status ${r1.status} · ${JSON.stringify(r1.corps).slice(0, 120)}`);
  const idSolo = idDepuisUrl(r1.corps.url);
  if (idSolo) {
    sessionSolo = await stripe.checkout.sessions.retrieve(idSolo, { expand: ['line_items'] });
    c('session en mode abonnement, ouverte', sessionSolo.mode === 'subscription' && sessionSolo.status === 'open');
    c('le Price est celui d\'Essentiel (15 € TTC)', sessionSolo.line_items?.data?.[0]?.price?.id === PRICE_SOLO && sessionSolo.line_items.data[0].price.unit_amount === 1500, sessionSolo.line_items?.data?.[0]?.price?.id);
    c('les codes promo sont autorisés (LANCEMENT50 saisissable)', sessionSolo.allow_promotion_codes === true);
    c('l\'email client = l\'email de connexion (reçus et relances d\'impayé)', (sessionSolo.customer_email || '').toLowerCase() === EMAIL);
    c('profile_id et plan en métadonnées (le webhook s\'en sert)', sessionSolo.metadata?.profile_id === profileId && sessionSolo.metadata?.plan === 'solo');
    c('aucun essai Stripe (les 30 jours sont comptés par IziSolo)', !sessionSolo.subscription_data?.trial_end);
    c('retour vers Paramètres → Abonnement avec l\'id de session', /parametres\?tab=abonnement&abo=success&session_id=/.test(sessionSolo.success_url || ''));
  }
  const r1b = await checkout('solo');
  c('re-cliquer donne la MÊME session (clé d\'idempotence)', r1b.status === 200 && idDepuisUrl(r1b.corps.url) === idSolo);

  // ── 2. Checkout Multi ────────────────────────────────────────────────────
  console.log('\n— 2. Checkout Multi (49 €) —');
  const r2 = await checkout('multi');
  c('la route accepte plan=multi et répond une URL Stripe', r2.status === 200 && /checkout\.stripe\.com/.test(r2.corps.url || ''), `status ${r2.status} · ${JSON.stringify(r2.corps).slice(0, 120)}`);
  const idMulti = idDepuisUrl(r2.corps.url);
  if (idMulti) {
    sessionMulti = await stripe.checkout.sessions.retrieve(idMulti, { expand: ['line_items'] });
    c('le Price est celui de Multi (49 € TTC)', sessionMulti.line_items?.data?.[0]?.price?.id === PRICE_MULTI && sessionMulti.line_items.data[0].price.unit_amount === 4900);
    await stripe.checkout.sessions.expire(idMulti);
    const relue = await stripe.checkout.sessions.retrieve(idMulti);
    c('la session Multi est expirée (aucune session orpheline)', relue.status === 'expired');
    sessionMulti = relue;
  }
  const r3 = await checkout('premium');
  c('premium (legacy) est refusé (400), jamais vendu', r3.status === 400);

  // ── 3. Le vrai paiement ──────────────────────────────────────────────────
  if (SANS_PAIEMENT || !idSolo) {
    console.log('\n— 3. Paiement réel : non joué (--sans-paiement) —');
  } else {
    console.log('\n— 3. Paiement réel —');
    console.log('\n   👉 Ouvre cette URL, saisis LANCEMENT50, paie avec une vraie carte (7,50 €) :');
    console.log(`   ${r1.corps.url}\n`);
    console.log(`   J'attends le webhook jusqu'à ${ATTENTE_PAIEMENT_MIN} min…`);
    const profil = await attendre(async () => {
      const { data } = await svc.from('profiles').select('plan, stripe_customer_id, stripe_subscription_id, stripe_subscription_status, stripe_current_period_end').eq('id', profileId).maybeSingle();
      return data?.stripe_subscription_status ? data : null;
    }, ATTENTE_PAIEMENT_MIN * 60000, 3000);
    c('le webhook a écrit le statut de l\'abonnement en base', !!profil, JSON.stringify(profil));
    if (profil) {
      customerId = profil.stripe_customer_id; subscriptionId = profil.stripe_subscription_id;
      c('statut active', profil.stripe_subscription_status === 'active', profil.stripe_subscription_status);
      c('customer et subscription posés', /^cus_/.test(customerId || '') && /^sub_/.test(subscriptionId || ''));
      c('plan = solo (Essentiel)', profil.plan === 'solo', profil.plan);
      c('⚠️ la DATE DE FIN DE PÉRIODE est écrite (le point suspect du profil de Colin)', !!profil.stripe_current_period_end, String(profil.stripe_current_period_end));
      const sub = await stripe.subscriptions.retrieve(subscriptionId);
      const remise = sub.discounts?.length || sub.discount ? 'oui' : 'non';
      c('LANCEMENT50 appliqué sur l\'abonnement Stripe', remise === 'oui', `discount: ${remise}`);
      const inv = await stripe.invoices.list({ subscription: subscriptionId, limit: 1 });
      const facture = inv.data[0];
      c('première facture Stripe payée à 7,50 €', facture?.status === 'paid' && facture.amount_paid === 750, `${facture?.status} ${facture?.amount_paid}`);

      // Portail client
      const rp = await fetch(`${BASE}/api/stripe/customer-portal`, { method: 'POST', headers: { cookie } });
      const cp = await rp.json().catch(() => ({}));
      c('le portail client répond une URL billing.stripe.com', rp.status === 200 && /billing\.stripe\.com/.test(cp.url || ''), `status ${rp.status} · ${JSON.stringify(cp).slice(0, 100)}`);

      // Résiliation par l'API → webhook deleted → base
      await stripe.subscriptions.cancel(subscriptionId);
      const apres = await attendre(async () => {
        const { data } = await svc.from('profiles').select('stripe_subscription_status').eq('id', profileId).maybeSingle();
        return data?.stripe_subscription_status === 'canceled' ? data : null;
      }, 120000, 3000);
      c('résiliation → le webhook passe le statut à canceled en base', !!apres);
      subscriptionId = null;

      // Remboursement
      const charge = facture?.charge || (facture?.payment_intent ? (await stripe.paymentIntents.retrieve(typeof facture.payment_intent === 'string' ? facture.payment_intent : facture.payment_intent.id)).latest_charge : null);
      if (charge) {
        const refund = await stripe.refunds.create({ charge: typeof charge === 'string' ? charge : charge.id });
        c('les 7,50 € sont remboursés', refund.status === 'succeeded' || refund.status === 'pending', refund.status);
      } else {
        c('remboursement : charge introuvable, à faire depuis le dashboard', false);
      }
    }
  }
} finally {
  await purger();
  console.log('\nStudio jetable, client Stripe et sessions purgés.');
}

console.log(`\nRésultat : ${ok} OK / ${ko} KO`);
process.exit(ko === 0 ? 0 : 1);
