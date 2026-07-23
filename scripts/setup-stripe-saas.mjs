/**
 * IziSolo — Installation Stripe SaaS en 1 commande (idempotent)
 * ─────────────────────────────────────────────────────────────────────────────
 * Crée/retrouve tout ce que la chaîne d'abonnement attend :
 *   1. Products  : IziSolo Solo / Pro / Studio
 *   2. Prices    : 17 € / 22 € / 79 € par mois (EUR)
 *   3. Coupons + promotion codes :
 *        FOUNDING100SOLO   −5 €  à vie        (17 → 12 €)
 *        FOUNDING100PRO    −3 €  à vie        (22 → 19 €)
 *        FOUNDING100STUDIO −30 € à vie        (79 → 49 €)
 *        EARLYBIRDSOLO     −5 €  pendant 6 mois
 *        EARLYBIRDPRO      −3 €  pendant 6 mois
 *   4. Webhook endpoint : https://www.izisolo.fr/api/stripe/webhook-saas
 *      (⚠️ TOUJOURS www. — sans www, redirect 307 et signature invalide)
 *      events : checkout.session.completed, customer.subscription.created,
 *               customer.subscription.updated, customer.subscription.deleted,
 *               invoice.payment_failed
 *   5. Customer Portal : une configuration par défaut (annulation, moyen de
 *      paiement, historique de factures) — sinon /api/stripe/customer-portal
 *      échoue avec « No configuration provided ».
 *
 * Usage :
 *   node scripts/setup-stripe-saas.mjs --key=sk_test_...     # répétition en test
 *   node scripts/setup-stripe-saas.mjs --key=sk_live_...     # le vrai
 *   node scripts/setup-stripe-saas.mjs --key=sk_... --verify # lecture seule
 *
 * En sortie : le bloc d'env vars à coller sur Vercel (Production) —
 * puis REDÉPLOYER (une env var ne s'applique qu'aux nouveaux déploiements).
 *
 * Grille canonique (bible + lib/constantes.js) :
 *   public 17/22/79 · Founding 100 (à vie) 12/19/49 · Early Bird (6 mois) 12/19.
 */

import Stripe from 'stripe';

const args = Object.fromEntries(
  process.argv.slice(2).map(a => {
    const [k, ...v] = a.replace(/^--/, '').split('=');
    return [k, v.join('=') || true];
  })
);

const key = args.key || process.env.STRIPE_SECRET_KEY;
if (!key || !key.startsWith('sk_')) {
  console.error('❌ Clé requise : node scripts/setup-stripe-saas.mjs --key=sk_test_... (ou sk_live_...)');
  process.exit(1);
}
const VERIFY_ONLY = !!args.verify;
const MODE = key.startsWith('sk_live') ? 'LIVE 🔴' : 'TEST 🧪';
const stripe = new Stripe(key, { apiVersion: '2025-09-30.clover' });

const WEBHOOK_URL = 'https://www.izisolo.fr/api/stripe/webhook-saas';
const WEBHOOK_EVENTS = [
  'checkout.session.completed',
  'customer.subscription.created',
  'customer.subscription.updated',
  'customer.subscription.deleted',
  'invoice.payment_failed',
];

// planKey = clé interne (premium = Studio, jamais migré — cf. constantes.js)
const PLANS = [
  { planKey: 'solo',    nom: 'IziSolo Solo',   prix: 1700, envVar: 'STRIPE_PRICE_ID_SOLO_MENSUEL' },
  { planKey: 'pro',     nom: 'IziSolo Pro',    prix: 2200, envVar: 'STRIPE_PRICE_ID_PRO_MENSUEL' },
  { planKey: 'premium', nom: 'IziSolo Studio', prix: 7900, envVar: 'STRIPE_PRICE_ID_PREMIUM_MENSUEL' },
];

const COUPONS = [
  { code: 'FOUNDING100SOLO',   nom: 'Founding 100 — Solo (à vie)',    amountOff: 500,  duration: 'forever' },
  { code: 'FOUNDING100PRO',    nom: 'Founding 100 — Pro (à vie)',     amountOff: 300,  duration: 'forever' },
  { code: 'FOUNDING100STUDIO', nom: 'Founding 100 — Studio (à vie)',  amountOff: 3000, duration: 'forever' },
  { code: 'EARLYBIRDSOLO',     nom: 'Early Bird — Solo (6 mois)',     amountOff: 500,  duration: 'repeating', months: 6 },
  { code: 'EARLYBIRDPRO',      nom: 'Early Bird — Pro (6 mois)',      amountOff: 300,  duration: 'repeating', months: 6 },
];

const out = { prices: {}, webhookSecret: null };
const log = (s) => console.log(s);

async function ensureProductAndPrice({ planKey, nom, prix, envVar }) {
  // Product : retrouvé par metadata izisolo_plan, sinon créé.
  const products = await stripe.products.search({ query: `metadata['izisolo_plan']:'${planKey}' AND active:'true'` });
  let product = products.data[0];
  if (!product) {
    if (VERIFY_ONLY) { log(`  ✗ Product ${nom} : ABSENT`); return; }
    product = await stripe.products.create({ name: nom, metadata: { izisolo_plan: planKey } });
    log(`  ＋ Product créé : ${nom} (${product.id})`);
  } else {
    log(`  ✓ Product : ${nom} (${product.id})`);
  }

  // Price mensuel EUR au bon montant : réutilisé s'il existe, sinon créé.
  const prices = await stripe.prices.list({ product: product.id, active: true, limit: 100 });
  let price = prices.data.find(p =>
    p.currency === 'eur' && p.recurring?.interval === 'month' && p.unit_amount === prix
  );
  if (!price) {
    if (VERIFY_ONLY) { log(`  ✗ Price ${prix / 100} €/mois : ABSENT`); return; }
    price = await stripe.prices.create({
      product: product.id,
      currency: 'eur',
      unit_amount: prix,
      recurring: { interval: 'month' },
      metadata: { izisolo_plan: planKey },
    });
    log(`  ＋ Price créé : ${prix / 100} €/mois (${price.id})`);
  } else {
    log(`  ✓ Price : ${prix / 100} €/mois (${price.id})`);
  }
  out.prices[envVar] = price.id;
}

async function ensureCoupon({ code, nom, amountOff, duration, months }) {
  // Promotion code (la chaîne que la prof tape au checkout) → coupon derrière.
  const existing = await stripe.promotionCodes.list({ code, limit: 1 });
  if (existing.data[0]) {
    log(`  ✓ Code promo : ${code} (${existing.data[0].id})`);
    return;
  }
  if (VERIFY_ONLY) { log(`  ✗ Code promo ${code} : ABSENT`); return; }
  const coupon = await stripe.coupons.create({
    name: nom,
    amount_off: amountOff,
    currency: 'eur',
    duration,
    ...(duration === 'repeating' ? { duration_in_months: months } : {}),
  });
  await stripe.promotionCodes.create({ coupon: coupon.id, code });
  log(`  ＋ Code promo créé : ${code} (−${amountOff / 100} € ${duration === 'forever' ? 'à vie' : `pendant ${months} mois`})`);
}

async function ensureWebhook() {
  const hooks = await stripe.webhookEndpoints.list({ limit: 100 });
  const existing = hooks.data.find(h => h.url === WEBHOOK_URL);
  if (existing) {
    const missing = WEBHOOK_EVENTS.filter(e => !existing.enabled_events.includes(e) && !existing.enabled_events.includes('*'));
    if (missing.length > 0 && !VERIFY_ONLY) {
      await stripe.webhookEndpoints.update(existing.id, {
        enabled_events: [...new Set([...existing.enabled_events, ...WEBHOOK_EVENTS])],
      });
      log(`  ✓ Webhook existant, events complétés (+${missing.length})`);
    } else {
      log(`  ✓ Webhook : ${WEBHOOK_URL} (${existing.id})`);
    }
    log('  ℹ️ Le signing secret n\'est affiché par Stripe qu\'à la CRÉATION.');
    log('     S\'il n\'est pas déjà sur Vercel : dashboard Stripe → Webhooks →');
    log('     cet endpoint → « Révéler le secret », ou supprime-le et relance ce script.');
    return;
  }
  if (VERIFY_ONLY) { log(`  ✗ Webhook ${WEBHOOK_URL} : ABSENT`); return; }
  const hook = await stripe.webhookEndpoints.create({
    url: WEBHOOK_URL,
    enabled_events: WEBHOOK_EVENTS,
    description: 'IziSolo SaaS — lifecycle abonnements profs',
  });
  out.webhookSecret = hook.secret;
  log(`  ＋ Webhook créé : ${WEBHOOK_URL} (${hook.id})`);
}

async function ensurePortalConfig() {
  const configs = await stripe.billingPortal.configurations.list({ active: true, limit: 1 });
  if (configs.data.length > 0) {
    log(`  ✓ Customer Portal : configuration active (${configs.data[0].id})`);
    return;
  }
  if (VERIFY_ONLY) { log('  ✗ Customer Portal : AUCUNE configuration'); return; }
  const cfg = await stripe.billingPortal.configurations.create({
    business_profile: {
      headline: 'IziSolo — ton abonnement',
      privacy_policy_url: 'https://www.izisolo.fr/rgpd',
      terms_of_service_url: 'https://www.izisolo.fr/cgv',
    },
    features: {
      invoice_history: { enabled: true },
      payment_method_update: { enabled: true },
      customer_update: { enabled: true, allowed_updates: ['email', 'address'] },
      subscription_cancel: { enabled: true, mode: 'at_period_end' },
    },
  });
  log(`  ＋ Customer Portal configuré (${cfg.id})`);
}

(async () => {
  log(`\n🔧 IziSolo × Stripe — mode ${MODE}${VERIFY_ONLY ? ' (vérification seule)' : ''}\n`);

  log('— Products & Prices');
  for (const plan of PLANS) await ensureProductAndPrice(plan);

  log('\n— Coupons Founding 100 / Early Bird');
  for (const coupon of COUPONS) await ensureCoupon(coupon);

  log('\n— Webhook SaaS');
  await ensureWebhook();

  log('\n— Customer Portal');
  await ensurePortalConfig();

  if (!VERIFY_ONLY) {
    log('\n════════════════════════════════════════════════════════════');
    log('📋 ENV VARS À POSER SUR VERCEL (scope Production) :\n');
    for (const [envVar, id] of Object.entries(out.prices)) log(`${envVar}=${id}`);
    if (out.webhookSecret) log(`STRIPE_WEBHOOK_SECRET_SAAS=${out.webhookSecret}`);
    else log('STRIPE_WEBHOOK_SECRET_SAAS=<déjà posé, ou à récupérer dans le dashboard (cf. note webhook)>');
    log(`STRIPE_SECRET_KEY=<ta clé ${MODE.startsWith('LIVE') ? 'sk_live' : 'sk_test'} — la même que celle passée à ce script>`);
    log('\n⚠️ Puis REDÉPLOYER : une env var ne s\'applique qu\'aux nouveaux déploiements.');
    log('════════════════════════════════════════════════════════════\n');
  } else {
    log('\nVérification terminée (rien n\'a été créé ni modifié).\n');
  }
})().catch(err => {
  console.error('\n❌ Erreur Stripe :', err.message);
  if (err.raw?.message) console.error('   ', err.raw.message);
  process.exit(1);
});
