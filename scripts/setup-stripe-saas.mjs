/**
 * IziSolo — Installation Stripe SaaS en 1 commande (idempotent)
 * ─────────────────────────────────────────────────────────────────────────────
 * Crée/retrouve tout ce que la chaîne d'abonnement attend :
 *   1. Products  : IziSolo Essentiel / IziSolo Complet
 *      (les produits d'un éventuel run précédent sont RENOMMÉS s'ils portent
 *      encore les anciens noms Solo/Pro — retrouvés par metadata izisolo_plan)
 *   2. Prices    : 15 € / 29 € par mois (EUR), tax_behavior INCLUSIVE
 *   3. Coupon + promotion code de lancement : LANCEMENT50, −50 % pendant 3 mois,
 *      borné dans le temps et réservé aux nouvelles clientes.
 *   4. Webhook endpoint : https://www.izisolo.fr/api/stripe/webhook-saas
 *      ⚠️ CRÉÉ EN MODE LIVE UNIQUEMENT. En test, on passe par `stripe listen`
 *      (deux endpoints sur la même URL = deux secrets pour une seule env var,
 *      donc un des deux mondes répond 400 sur chaque event).
 *   5. Customer Portal : une configuration explicite, dont l'id part en env var
 *      STRIPE_PORTAL_CONFIG_ID (une config créée par l'API naît is_default:false,
 *      donc la route DOIT la nommer, sinon Stripe cherche une config par défaut
 *      qui n'existe que si on a cliqué « Save » dans le Dashboard).
 *
 * Usage :
 *   node scripts/setup-stripe-saas.mjs --key=sk_test_...     # répétition en test
 *   node scripts/setup-stripe-saas.mjs --key=sk_live_...     # le vrai
 *   node scripts/setup-stripe-saas.mjs --key=sk_... --verify # lecture seule
 *   ... --fin-promo=2026-12-31                               # fin de LANCEMENT50
 *
 * En sortie : le bloc d'env vars à coller sur Vercel (Production) —
 * puis REDÉPLOYER (une env var ne s'applique qu'aux nouveaux déploiements).
 *
 * ⚠️ IRRÉVERSIBLE en live : `tax_behavior` et `unit_amount` d'un Price ne se
 * modifient plus après création. Une erreur se corrige en archivant le Price et
 * en migrant les abonnements à la main.
 *
 * Grille canonique (bible + lib/constantes.js) :
 *   Essentiel 15 € / Complet 29 € · lancement −50 % pendant 3 mois.
 *   Vendeur : Maude Yoga (EI), franchise de TVA art. 293 B — d'où
 *   tax_behavior INCLUSIVE : le montant affiché est le montant débité.
 *   Studio/premium : legacy, plus jamais vendu — aucun Product/Price créé.
 */

import Stripe from 'stripe';
import { STRIPE_API_VERSION } from '../lib/stripe-api-version.js';

const args = Object.fromEntries(
  process.argv.slice(2).map(a => {
    const [k, ...v] = a.replace(/^--/, '').split('=');
    return [k, v.join('=') || true];
  })
);

const key = args.key || process.env.STRIPE_SECRET_KEY;
// `--key sk_live_x` (espace au lieu de =) donne { key: true } : sans ce test,
// on partait sur un TypeError illisible, au pire moment.
if (typeof key !== 'string' || !key.startsWith('sk_')) {
  console.error('❌ Clé requise : node scripts/setup-stripe-saas.mjs --key=sk_test_... (ou sk_live_...)');
  console.error('   Note : --key=... avec un ÉGAL, pas un espace.');
  process.exit(1);
}
const VERIFY_ONLY = !!args.verify;
const IS_LIVE = key.startsWith('sk_live');
const MODE = IS_LIVE ? 'LIVE 🔴' : 'TEST 🧪';
const stripe = new Stripe(key, { apiVersion: STRIPE_API_VERSION });

// Fin de l'offre de lancement. Le code est écrit en clair sur la landing et les
// pages villes : sans date de fin, la remise devient le prix.
const FIN_PROMO = typeof args['fin-promo'] === 'string' ? args['fin-promo'] : '2026-12-31';
const FIN_PROMO_TS = Math.floor(new Date(`${FIN_PROMO}T23:59:59Z`).getTime() / 1000);
if (!Number.isFinite(FIN_PROMO_TS)) {
  console.error(`❌ --fin-promo invalide : « ${FIN_PROMO} » (attendu AAAA-MM-JJ)`);
  process.exit(1);
}

const WEBHOOK_URL = 'https://www.izisolo.fr/api/stripe/webhook-saas';
const WEBHOOK_EVENTS = [
  'checkout.session.completed',
  'customer.subscription.created',
  'customer.subscription.updated',
  'customer.subscription.deleted',
  'invoice.payment_failed',
];

// planKey = clé interne DB (solo/pro) ; noms marketing Essentiel/Complet.
const PLANS = [
  { planKey: 'solo', nom: 'IziSolo Essentiel', prix: 1500, envVar: 'STRIPE_PRICE_ID_SOLO_MENSUEL', lookup: 'izisolo_essentiel_mensuel' },
  { planKey: 'pro',  nom: 'IziSolo Complet',   prix: 2900, envVar: 'STRIPE_PRICE_ID_PRO_MENSUEL',  lookup: 'izisolo_complet_mensuel' },
];

const COUPON_ID = 'LANCEMENT50';   // id déterministe : le rejeu retrouve le coupon
const COUPON = {
  code: 'LANCEMENT50',
  nom: 'Offre de lancement — 50 % pendant 3 mois',
  percentOff: 50,
  duration: 'repeating',
  months: 3,
};

const out = { prices: {}, webhookSecret: null, portalConfigId: null, produits: {} };
const log = (s) => console.log(s);
let alertes = 0;
const alerte = (s) => { alertes++; log(`  ⚠ ${s}`); };

async function ensureProductAndPrice({ planKey, nom, prix, envVar, lookup }) {
  // products.list plutôt que products.search : l'index de recherche est en
  // retard sur les écritures (la doc déconseille explicitement de lire juste
  // après avoir écrit), ce qui fabriquait des Products en double au rejeu.
  const tous = await stripe.products.list({ limit: 100, active: true });
  const candidats = tous.data.filter(p => p.metadata?.izisolo_plan === planKey);
  if (candidats.length > 1) {
    alerte(`${candidats.length} Products portent izisolo_plan=${planKey} : ${candidats.map(p => p.id).join(', ')}`);
  }
  let product = candidats[0];

  if (!product) {
    if (VERIFY_ONLY) { log(`  ✗ Product ${nom} : ABSENT`); return; }
    product = await stripe.products.create({ name: nom, metadata: { izisolo_plan: planKey } });
    log(`  ＋ Product créé : ${nom} (${product.id})`);
  } else if (product.name !== nom) {
    // Run précédent avec les anciens noms marketing (Solo/Pro) : on renomme —
    // c'est CE nom qui s'affiche au checkout et sur les factures.
    if (VERIFY_ONLY) { log(`  ✗ Product ${product.name} : à renommer en ${nom}`); }
    else {
      await stripe.products.update(product.id, { name: nom });
      log(`  ✎ Product renommé : ${product.name} → ${nom} (${product.id})`);
    }
  } else {
    log(`  ✓ Product : ${nom} (${product.id})`);
  }
  out.produits[planKey] = product.id;

  // Price mensuel EUR au bon montant ET au bon tax_behavior.
  const prices = await stripe.prices.list({ product: product.id, active: true, limit: 100 });
  const memeMontant = prices.data.filter(p =>
    p.currency === 'eur' && p.recurring?.interval === 'month' && p.unit_amount === prix
  );
  let price = memeMontant.find(p => p.tax_behavior === 'inclusive');

  // Un Price au bon prix mais en tax_behavior non conforme est INUTILISABLE
  // pour l'upsell dans le portail, et ça ne se corrige pas : on le dit fort.
  const nonConforme = memeMontant.find(p => p.tax_behavior !== 'inclusive');
  if (!price && nonConforme) {
    alerte(`Price ${prix / 100} € existant en tax_behavior « ${nonConforme.tax_behavior} » (${nonConforme.id}) : NON modifiable. Un nouveau Price inclusive va être créé ; archive l'ancien à la main.`);
  }

  if (!price) {
    if (VERIFY_ONLY) { log(`  ✗ Price ${prix / 100} €/mois inclusive : ABSENT`); return; }
    price = await stripe.prices.create({
      product: product.id,
      currency: 'eur',
      unit_amount: prix,
      recurring: { interval: 'month' },
      tax_behavior: 'inclusive',  // IRRÉVERSIBLE — franchise 293 B, le prix affiché est le prix débité
      lookup_key: lookup,
      metadata: { izisolo_plan: planKey },
    });
    log(`  ＋ Price créé : ${prix / 100} €/mois inclusive (${price.id})`);
  } else {
    log(`  ✓ Price : ${prix / 100} €/mois inclusive (${price.id})`);
  }
  out.prices[envVar] = price.id;
}

async function ensureCoupon() {
  const { code, nom, percentOff, duration, months } = COUPON;

  // 1. Le coupon (la remise elle-même), à id déterministe.
  let coupon = await stripe.coupons.retrieve(COUPON_ID).catch(() => null);
  if (!coupon) {
    if (VERIFY_ONLY) { log(`  ✗ Coupon ${COUPON_ID} : ABSENT`); }
    else {
      coupon = await stripe.coupons.create({
        id: COUPON_ID,
        name: nom,
        percent_off: percentOff,
        duration,
        duration_in_months: months,
        redeem_by: FIN_PROMO_TS,
      });
      log(`  ＋ Coupon créé : ${COUPON_ID} (−${percentOff} % pendant ${months} mois, jusqu'au ${FIN_PROMO})`);
    }
  } else {
    // On VÉRIFIE les termes, au lieu de se contenter de l'existence.
    const ecarts = [];
    if (coupon.percent_off !== percentOff) ecarts.push(`percent_off=${coupon.percent_off}`);
    if (coupon.duration !== duration) ecarts.push(`duration=${coupon.duration}`);
    if (coupon.duration_in_months !== months) ecarts.push(`duration_in_months=${coupon.duration_in_months}`);
    if (!coupon.valid) ecarts.push('coupon INVALIDE (expiré ou épuisé)');
    if (!coupon.redeem_by) ecarts.push('aucune date de fin');
    if (ecarts.length) alerte(`Coupon ${COUPON_ID} divergent : ${ecarts.join(', ')}`);
    else log(`  ✓ Coupon : ${COUPON_ID} (${coupon.id})`);
  }

  // 2. Le promotion code (la chaîne que la prof tape au checkout).
  const existing = await stripe.promotionCodes.list({ code, limit: 1 });
  if (existing.data[0]) {
    const pc = existing.data[0];
    if (!pc.active) alerte(`Code promo ${code} présent mais INACTIF (${pc.id})`);
    else if (!pc.expires_at) alerte(`Code promo ${code} sans date d'expiration (${pc.id})`);
    else log(`  ✓ Code promo : ${code} (${pc.id})`);
    return;
  }
  if (VERIFY_ONLY) { log(`  ✗ Code promo ${code} : ABSENT`); return; }
  if (!coupon) { alerte(`Code promo ${code} non créé : le coupon manque`); return; }

  // ⚠️ Depuis l'API 2025-09-30.clover, PromotionCode#create n'accepte plus
  // `coupon` à la racine : la remise passe par `promotion`.
  await stripe.promotionCodes.create({
    promotion: { type: 'coupon', coupon: coupon.id },
    code,
    expires_at: FIN_PROMO_TS,
    restrictions: { first_time_transaction: true },
  });
  log(`  ＋ Code promo créé : ${code} (−${percentOff} % pendant ${months} mois, nouvelles clientes, jusqu'au ${FIN_PROMO})`);
}

async function ensureWebhook() {
  // En test, l'endpoint se fait avec `stripe listen`, JAMAIS ici : deux
  // endpoints sur la même URL produisent deux secrets pour une seule env var,
  // et l'un des deux mondes répond 400 sur chaque event pendant 3 jours.
  if (!IS_LIVE) {
    log('  ⏭ Mode test : aucun endpoint créé (utilise `stripe listen --forward-to');
    log('     localhost:3333/api/stripe/webhook-saas` et colle son whsec_ en local).');
    return;
  }

  const hooks = await stripe.webhookEndpoints.list({ limit: 100 });
  const existing = hooks.data.find(h => h.url === WEBHOOK_URL);
  if (existing) {
    const missing = WEBHOOK_EVENTS.filter(e => !existing.enabled_events.includes(e) && !existing.enabled_events.includes('*'));
    if (missing.length > 0) {
      if (VERIFY_ONLY) alerte(`Webhook : ${missing.length} event(s) manquant(s) — ${missing.join(', ')}`);
      else {
        await stripe.webhookEndpoints.update(existing.id, {
          enabled_events: [...new Set([...existing.enabled_events, ...WEBHOOK_EVENTS])],
        });
        log(`  ✓ Webhook existant, events complétés (+${missing.length})`);
      }
    } else {
      log(`  ✓ Webhook : ${WEBHOOK_URL} (${existing.id})`);
    }
    if (existing.api_version && existing.api_version !== STRIPE_API_VERSION) {
      alerte(`Webhook en api_version ${existing.api_version}, le code attend ${STRIPE_API_VERSION}`);
    }
    log('  ℹ️ Le signing secret n\'est affiché par Stripe qu\'à la CRÉATION.');
    log('     S\'il n\'est pas déjà sur Vercel : dashboard Stripe → Webhooks →');
    log('     cet endpoint → « Révéler le secret ». NE SUPPRIME PAS l\'endpoint');
    log('     pour le recréer : Stripe ne rejoue pas vers un endpoint supprimé.');
    return;
  }
  if (VERIFY_ONLY) { log(`  ✗ Webhook ${WEBHOOK_URL} : ABSENT`); return; }
  const hook = await stripe.webhookEndpoints.create({
    url: WEBHOOK_URL,
    enabled_events: WEBHOOK_EVENTS,
    description: 'IziSolo SaaS — lifecycle abonnements profs',
    // Sans api_version, les events sont sérialisés dans la version par défaut
    // du COMPTE : la forme du payload ne serait plus décidée par le repo.
    api_version: STRIPE_API_VERSION,
  });
  out.webhookSecret = hook.secret;
  log(`  ＋ Webhook créé : ${WEBHOOK_URL} (${hook.id})`);
}

async function ensurePortalConfig() {
  const prixAutorises = PLANS.map(p => out.prices[p.envVar]).filter(Boolean);
  const produits = PLANS
    .map(p => ({ product: out.produits[p.planKey], prices: [out.prices[p.envVar]].filter(Boolean) }))
    .filter(p => p.product && p.prices.length);

  const configs = await stripe.billingPortal.configurations.list({ active: true, limit: 100 });
  // On cherche NOTRE config (metadata), pas « une config active » : le contrôle
  // d'avant s'affichait vert alors que la route répondait 503.
  const notre = configs.data.find(c => c.metadata?.izisolo === 'saas');
  const parDefaut = configs.data.find(c => c.is_default);

  if (notre) {
    out.portalConfigId = notre.id;
    const f = notre.features || {};
    const manques = [];
    if (!f.invoice_history?.enabled) manques.push('invoice_history');
    if (!f.payment_method_update?.enabled) manques.push('payment_method_update');
    if (!f.subscription_cancel?.enabled) manques.push('subscription_cancel');
    if (!f.subscription_update?.enabled) manques.push('subscription_update');
    if (manques.length) alerte(`Customer Portal : fonctionnalités désactivées — ${manques.join(', ')}`);
    else log(`  ✓ Customer Portal : configuration IziSolo (${notre.id})`);
    if (!parDefaut) {
      log('  ℹ️ Aucune configuration par DÉFAUT sur ce compte : sans risque ici,');
      log('     la route nomme explicitement STRIPE_PORTAL_CONFIG_ID.');
    }
    return;
  }

  if (VERIFY_ONLY) { log('  ✗ Customer Portal : aucune configuration IziSolo'); return; }
  if (!prixAutorises.length) { alerte('Customer Portal non créé : aucun Price résolu'); return; }

  const cfg = await stripe.billingPortal.configurations.create({
    business_profile: {
      headline: 'IziSolo — ton abonnement',
      privacy_policy_url: 'https://www.izisolo.fr/legal/rgpd',
      terms_of_service_url: 'https://www.izisolo.fr/legal/cgv',
    },
    features: {
      invoice_history: { enabled: true },
      payment_method_update: { enabled: true },
      customer_update: { enabled: true, allowed_updates: ['email', 'address'] },
      subscription_cancel: { enabled: true, mode: 'at_period_end' },
      // Changement de plan en self-service (décision Colin 2026-08-22) : exige
      // des Prices en tax_behavior explicite, d'où l'inclusive plus haut.
      subscription_update: {
        enabled: true,
        default_allowed_updates: ['price'],
        products: produits,
        proration_behavior: 'create_prorations',
      },
    },
    metadata: { izisolo: 'saas' },
  });
  out.portalConfigId = cfg.id;
  log(`  ＋ Customer Portal configuré (${cfg.id})`);
}

(async () => {
  log(`\n🔧 IziSolo × Stripe — mode ${MODE}${VERIFY_ONLY ? ' (vérification seule)' : ''}`);
  log(`   API ${STRIPE_API_VERSION} · vendeur Maude Yoga (EI, franchise 293 B)\n`);

  log('— Products & Prices');
  for (const plan of PLANS) await ensureProductAndPrice(plan);

  log('\n— Coupon de lancement');
  await ensureCoupon();

  log('\n— Webhook SaaS');
  await ensureWebhook();

  log('\n— Customer Portal');
  await ensurePortalConfig();

  if (VERIFY_ONLY) {
    log(`\nVérification terminée (rien n'a été créé ni modifié).`);
    log(alertes ? `⚠ ${alertes} point(s) à regarder ci-dessus.\n` : '✓ Rien à signaler.\n');
    process.exit(alertes ? 1 : 0);
  }

  // Bloc collable TEL QUEL : toute ligne qui n'est pas une vraie paire est
  // commentée, sinon un collage en bloc pose un secret bidon et le webhook
  // répond 400 sur chaque event, avec un symptôme indiscernable.
  log('\n════════════════════════════════════════════════════════════');
  log('📋 ENV VARS À POSER SUR VERCEL (scope Production) :\n');
  for (const [envVar, id] of Object.entries(out.prices)) log(`${envVar}=${id}`);
  if (out.portalConfigId) log(`STRIPE_PORTAL_CONFIG_ID=${out.portalConfigId}`);
  if (out.webhookSecret) log(`STRIPE_WEBHOOK_SECRET_SAAS=${out.webhookSecret}`);
  else log('# STRIPE_WEBHOOK_SECRET_SAAS : déjà posé, ou à révéler dans le dashboard (cf. note webhook)');
  log(`# STRIPE_SECRET_KEY : ta clé ${IS_LIVE ? 'sk_live' : 'sk_test'}, la même que celle passée à ce script`);
  log('\n⚠️ Puis REDÉPLOYER : une env var ne s\'applique qu\'aux nouveaux déploiements,');
  log('   et un commit de doc ne suffit pas (vercel.json ignore *.md).');
  if (alertes) log(`\n⚠ ${alertes} point(s) signalé(s) plus haut : relis avant de continuer.`);
  log('════════════════════════════════════════════════════════════\n');
})().catch(err => {
  console.error('\n❌ Erreur Stripe :', err.message);
  if (err.raw?.message) console.error('   ', err.raw.message);
  process.exit(1);
});
