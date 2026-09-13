/**
 * IziSolo — Installation Stripe SaaS en 1 commande (idempotent)
 * ─────────────────────────────────────────────────────────────────────────────
 * Crée/retrouve tout ce que la chaîne d'abonnement attend :
 *   1. Products  : IziSolo Complet / IziSolo Association / IziSolo Studio
 *      (retrouvés par metadata izisolo_plan, renommés si besoin). Essentiel
 *      (gratuit depuis le 2026-09-13) et Multi (retiré) sont ARCHIVÉS.
 *   2. Prices    : Complet 29 €/mois ; Association 39 €/mois ou 390 €/an ;
 *      Studio 59 €/mois ou 590 €/an (EUR), tax_behavior INCLUSIVE
 *   3. Coupon + promotion code de lancement : LANCEMENT50, −50 % pendant 3 mois,
 *      borné dans le temps et réservé aux nouvelles clientes.
 *   4. Webhook endpoint : https://www.izisolo.fr/api/stripe/webhook-saas
 *      ⚠️ CRÉÉ EN MODE LIVE UNIQUEMENT. En test, on passe par `stripe listen`
 *      (deux endpoints sur la même URL = deux secrets pour une seule env var,
 *      donc un des deux mondes répond 400 sur chaque event).
 *   5. Customer Portal : DEUX configurations explicites (profs seules : Complet ;
 *      structures : Association et Studio, mensuel ou annuel), dont les ids
 *      partent en env vars STRIPE_PORTAL_CONFIG_ID et
 *      STRIPE_PORTAL_CONFIG_ID_STRUCTURES (une config créée par l'API naît
 *      is_default:false, donc la route DOIT la nommer).
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
 * Grille canonique (bible + lib/constantes.js, décisions Colin 2026-09-13) :
 *   Essentiel 0 € (freemium, aucun Price) / Complet 29 € / Association 39 €
 *   ou 390 €/an / Studio 59 € ou 590 €/an (forfaits plats, profs illimitées)
 *   · lancement −50 % pendant 3 mois sur le mensuel.
 *   Vendeur : Maude Yoga (EI), franchise de TVA art. 293 B, d'où
 *   tax_behavior INCLUSIVE : le montant affiché est le montant débité.
 *   premium (legacy 2026) : jamais recréé. multi : archivé par ce script.
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

// planKey = clé interne DB ; noms marketing Complet / Association / Studio.
// Grille du 2026-09-13 (FREEMIUM) : Essentiel est GRATUIT (aucun Price),
// Multi est RETIRÉ (archivé plus bas), Association et Studio ont chacun un
// mensuel et un annuel (deux mois offerts). Forfaits PLATS, jamais par siège.
// `famille` = quelle configuration de Customer Portal propose ce Price.
const PLANS = [
  { planKey: 'pro',    nom: 'IziSolo Complet',     prix: 2900,  interval: 'month', envVar: 'STRIPE_PRICE_ID_PRO_MENSUEL',    lookup: 'izisolo_complet_mensuel',     famille: 'profs' },
  { planKey: 'asso',   nom: 'IziSolo Association', prix: 3900,  interval: 'month', envVar: 'STRIPE_PRICE_ID_ASSO_MENSUEL',   lookup: 'izisolo_association_mensuel', famille: 'structures' },
  { planKey: 'asso',   nom: 'IziSolo Association', prix: 39000, interval: 'year',  envVar: 'STRIPE_PRICE_ID_ASSO_ANNUEL',    lookup: 'izisolo_association_annuel',  famille: 'structures' },
  { planKey: 'studio', nom: 'IziSolo Studio',      prix: 5900,  interval: 'month', envVar: 'STRIPE_PRICE_ID_STUDIO_MENSUEL', lookup: 'izisolo_studio_mensuel',      famille: 'structures' },
  { planKey: 'studio', nom: 'IziSolo Studio',      prix: 59000, interval: 'year',  envVar: 'STRIPE_PRICE_ID_STUDIO_ANNUEL',  lookup: 'izisolo_studio_annuel',       famille: 'structures' },
];

// Plans d'un run précédent qu'on n'encaisse PLUS : leurs Prices et Products
// sont ARCHIVÉS (jamais supprimés : un abonnement en cours garde son Price, et
// l'historique reste lisible). `solo` : Essentiel est devenu gratuit ; `multi` :
// retiré au profit d'Association / Studio.
const PLANS_A_ARCHIVER = ['solo', 'multi'];

const COUPON_ID = 'LANCEMENT50';   // id déterministe : le rejeu retrouve le coupon
const COUPON = {
  code: 'LANCEMENT50',
  nom: 'Offre de lancement — 50 % pendant 3 mois',
  percentOff: 50,
  duration: 'repeating',
  months: 3,
};

const out = { prices: {}, webhookSecret: null, portalConfigs: {}, produits: {} };
const log = (s) => console.log(s);
let alertes = 0;
const alerte = (s) => { alertes++; log(`  ⚠ ${s}`); };

async function ensureProductAndPrice({ planKey, nom, prix, interval, envVar, lookup }) {
  const parAn = interval === 'year';
  const unite = parAn ? 'an' : 'mois';
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
    // Run précédent avec un ancien nom marketing : on renomme, c'est CE nom
    // qui s'affiche au checkout et sur les factures.
    if (VERIFY_ONLY) { log(`  ✗ Product ${product.name} : à renommer en ${nom}`); }
    else {
      await stripe.products.update(product.id, { name: nom });
      log(`  ✎ Product renommé : ${product.name} → ${nom} (${product.id})`);
    }
  } else if (!out.produits[planKey]) {
    log(`  ✓ Product : ${nom} (${product.id})`);
  }
  out.produits[planKey] = product.id;

  // Price EUR au bon montant, au bon INTERVALLE et au bon tax_behavior.
  const prices = await stripe.prices.list({ product: product.id, active: true, limit: 100 });
  const memeMontant = prices.data.filter(p =>
    p.currency === 'eur' && p.recurring?.interval === interval && p.unit_amount === prix
  );
  let price = memeMontant.find(p => p.tax_behavior === 'inclusive');

  // Un Price au bon prix mais en tax_behavior non conforme est INUTILISABLE
  // pour l'upsell dans le portail, et ça ne se corrige pas : on le dit fort.
  const nonConforme = memeMontant.find(p => p.tax_behavior !== 'inclusive');
  if (!price && nonConforme) {
    alerte(`Price ${prix / 100} € existant en tax_behavior « ${nonConforme.tax_behavior} » (${nonConforme.id}) : NON modifiable. Un nouveau Price inclusive va être créé ; archive l'ancien à la main.`);
  }

  if (!price) {
    if (VERIFY_ONLY) { log(`  ✗ Price ${prix / 100} €/${unite} inclusive : ABSENT`); return; }
    price = await stripe.prices.create({
      product: product.id,
      currency: 'eur',
      unit_amount: prix,
      recurring: { interval },
      tax_behavior: 'inclusive',  // IRRÉVERSIBLE, franchise 293 B : le prix affiché est le prix débité
      lookup_key: lookup,
      metadata: { izisolo_plan: planKey, periode: parAn ? 'annuel' : 'mensuel' },
    });
    log(`  ＋ Price créé : ${prix / 100} €/${unite} inclusive (${price.id})`);
  } else {
    log(`  ✓ Price : ${prix / 100} €/${unite} inclusive (${price.id})`);
  }
  out.prices[envVar] = price.id;
}

/**
 * Archive les Products et Prices des plans qu'on n'encaisse plus (Essentiel
 * devenu gratuit, Multi retiré). Archiver ≠ supprimer : un abonnement en cours
 * garde son Price, et l'historique des factures reste lisible. Un Price
 * archivé ne peut plus être choisi au checkout ni dans le portail.
 */
async function archiverLegacy() {
  const tous = await stripe.products.list({ limit: 100, active: true });
  for (const planKey of PLANS_A_ARCHIVER) {
    const produits = tous.data.filter(p => p.metadata?.izisolo_plan === planKey);
    if (!produits.length) { log(`  ✓ ${planKey} : rien d'actif à archiver`); continue; }
    for (const product of produits) {
      const prices = await stripe.prices.list({ product: product.id, active: true, limit: 100 });
      if (VERIFY_ONLY) {
        log(`  ✗ ${planKey} : ${product.name} (${product.id}) encore actif avec ${prices.data.length} Price(s) : à archiver`);
        alertes++;
        continue;
      }
      for (const p of prices.data) {
        await stripe.prices.update(p.id, { active: false });
        log(`  ▪ Price archivé : ${p.unit_amount / 100} € (${p.id})`);
      }
      await stripe.products.update(product.id, { active: false });
      log(`  ▪ Product archivé : ${product.name} (${product.id})`);
    }
  }
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

/**
 * Deux configurations de Customer Portal depuis le 2026-09-13, parce qu'une
 * configuration est GLOBALE (pas par client) et qu'on ne veut pas qu'une
 * association « monte » en Studio par erreur, ni qu'une prof seule voie les
 * plans de structure :
 *   - famille `profs`      (metadata izisolo=saas)            : Complet seul
 *   - famille `structures` (metadata izisolo=saas-structures) : Association et
 *     Studio, mensuel ou annuel
 * Une configuration existante est MISE À JOUR (ses produits autorisés suivent
 * la grille) : le run précédent proposait Essentiel et Multi, qu'on n'encaisse
 * plus. La route customer-portal choisit la configuration selon le type de
 * structure.
 */
async function ensurePortalConfig() {
  const configs = await stripe.billingPortal.configurations.list({ active: true, limit: 100 });
  const parDefaut = configs.data.find(c => c.is_default);

  const FAMILLES = [
    { famille: 'profs',      meta: 'saas',            envVar: 'STRIPE_PORTAL_CONFIG_ID',            headline: 'IziSolo — ton abonnement' },
    { famille: 'structures', meta: 'saas-structures', envVar: 'STRIPE_PORTAL_CONFIG_ID_STRUCTURES', headline: 'IziSolo — l\'abonnement de ta structure' },
  ];

  for (const { famille, meta, envVar, headline } of FAMILLES) {
    const plansFamille = PLANS.filter(p => p.famille === famille);
    // Un Product, TOUS ses Prices résolus (mensuel + annuel) : c'est ainsi
    // que le portail propose « passer à l'année ».
    const parProduit = new Map();
    for (const p of plansFamille) {
      const product = out.produits[p.planKey];
      const price = out.prices[p.envVar];
      if (!product || !price) continue;
      if (!parProduit.has(product)) parProduit.set(product, []);
      parProduit.get(product).push(price);
    }
    const produits = [...parProduit].map(([product, prices]) => ({ product, prices }));

    // On cherche NOTRE config (metadata), pas « une config active » : le
    // contrôle d'avant s'affichait vert alors que la route répondait 503.
    const notre = configs.data.find(c => c.metadata?.izisolo === meta);

    if (notre) {
      out.portalConfigs[envVar] = notre.id;
      const f = notre.features || {};
      const manques = [];
      if (!f.invoice_history?.enabled) manques.push('invoice_history');
      if (!f.payment_method_update?.enabled) manques.push('payment_method_update');
      if (!f.subscription_cancel?.enabled) manques.push('subscription_cancel');
      if (!f.subscription_update?.enabled) manques.push('subscription_update');
      if (manques.length) alerte(`Customer Portal ${famille} : fonctionnalités désactivées — ${manques.join(', ')}`);

      // Les produits autorisés doivent être EXACTEMENT ceux de la grille.
      const actuels = (f.subscription_update?.products || [])
        .map(p => `${p.product}:${[...(p.prices || [])].sort().join('+')}`).sort().join('|');
      const voulus = produits.map(p => `${p.product}:${[...p.prices].sort().join('+')}`).sort().join('|');
      if (actuels !== voulus) {
        if (VERIFY_ONLY) { log(`  ✗ Customer Portal ${famille} (${notre.id}) : produits autorisés à mettre à jour`); alertes++; }
        else if (!produits.length) { alerte(`Customer Portal ${famille} : aucun Price résolu, produits non mis à jour`); }
        else {
          await stripe.billingPortal.configurations.update(notre.id, {
            features: { subscription_update: { enabled: true, default_allowed_updates: ['price'], products: produits, proration_behavior: 'create_prorations' } },
          });
          log(`  ✎ Customer Portal ${famille} : produits autorisés mis à jour (${notre.id})`);
        }
      } else if (!manques.length) {
        log(`  ✓ Customer Portal ${famille} : configuration IziSolo (${notre.id})`);
      }
      continue;
    }

    if (VERIFY_ONLY) { log(`  ✗ Customer Portal ${famille} : aucune configuration IziSolo`); alertes++; continue; }
    if (!produits.length) { alerte(`Customer Portal ${famille} non créé : aucun Price résolu`); continue; }

    const cfg = await stripe.billingPortal.configurations.create({
      business_profile: {
        headline,
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
      metadata: { izisolo: meta },
    });
    out.portalConfigs[envVar] = cfg.id;
    log(`  ＋ Customer Portal ${famille} configuré (${cfg.id})`);
  }

  if (!parDefaut) {
    log('  ℹ️ Aucune configuration par DÉFAUT sur ce compte : sans risque ici,');
    log('     la route nomme explicitement la configuration.');
  }
}

(async () => {
  log(`\n🔧 IziSolo × Stripe — mode ${MODE}${VERIFY_ONLY ? ' (vérification seule)' : ''}`);
  log(`   API ${STRIPE_API_VERSION} · vendeur Maude Yoga (EI, franchise 293 B)\n`);

  log('— Products & Prices');
  for (const plan of PLANS) await ensureProductAndPrice(plan);

  log('\n— Plans retirés (Essentiel devenu gratuit, Multi)');
  await archiverLegacy();

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
  for (const [envVar, id] of Object.entries(out.portalConfigs)) log(`${envVar}=${id}`);
  if (out.webhookSecret) log(`STRIPE_WEBHOOK_SECRET_SAAS=${out.webhookSecret}`);
  else log('# STRIPE_WEBHOOK_SECRET_SAAS : déjà posé, ou à révéler dans le dashboard (cf. note webhook)');
  log(`# STRIPE_SECRET_KEY : ta clé ${IS_LIVE ? 'sk_live' : 'sk_test'}, la même que celle passée à ce script`);
  log('# STRIPE_PRICE_ID_SOLO_MENSUEL et STRIPE_PRICE_ID_MULTI_MENSUEL : à RETIRER de Vercel (plans archivés)');
  log('\n⚠️ Puis REDÉPLOYER : une env var ne s\'applique qu\'aux nouveaux déploiements,');
  log('   et un commit de doc ne suffit pas (vercel.json ignore *.md).');
  if (alertes) log(`\n⚠ ${alertes} point(s) signalé(s) plus haut : relis avant de continuer.`);
  log('════════════════════════════════════════════════════════════\n');
})().catch(err => {
  console.error('\n❌ Erreur Stripe :', err.message);
  if (err.raw?.message) console.error('   ', err.raw.message);
  process.exit(1);
});
