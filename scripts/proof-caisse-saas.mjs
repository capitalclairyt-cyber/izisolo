/**
 * PREUVE — la caisse Stripe SaaS (abonnements des profs et des structures),
 * compte « Maude Yoga » en LIVE.
 *
 * Née le 2026-09-07 (Essentiel 15 € + Multi 49 €), réécrite le 2026-09-23 pour
 * la grille freemium + structures (Colin, 2026-09-13) : Essentiel GRATUIT sans
 * Price, Complet 29 €/mois, Association 39 €/mois ou 390 €/an, Studio 59 €/mois
 * ou 590 €/an, Multi retiré. Le second passage du script de setup a créé les
 * quatre nouveaux prix et archivé les deux anciens le 2026-09-23.
 *
 * Deux phases.
 *   1. AUTOMATIQUE, sans argent : un studio jetable (prof seule, en essai)
 *      demande chaque checkout à la route → les REFUS répondent leur code
 *      (Essentiel gratuit, Multi et premium invalides, annuel hors Association
 *      et Studio, Association réservée aux associations déclarées), Complet et
 *      Studio répondent une URL Stripe ; chaque session est RELUE par l'API
 *      Stripe avec la clé live de .env.local : mode abonnement, bon Price, bon
 *      montant TTC, code promo autorisé, email de connexion, profile_id + plan
 *      + période en métadonnées. Puis le studio jetable devient une association
 *      (type + RNA) : Studio est refusé (hors famille), Association mensuel et
 *      annuel répondent leurs prix. Les sessions sont expirées aussitôt, sauf
 *      celle de Studio mensuel gardée pour la phase 2.
 *   2. MANUELLE, argent réel : le script imprime l'URL Studio ; Colin y paie
 *      avec LANCEMENT50 et une vraie carte (29,50 €). Le script attend le
 *      webhook : statut actif, plan = studio, la prof seule DEVENUE studio
 *      (type_structure posé par le webhook), customer, subscription et DATE DE
 *      FIN DE PÉRIODE en base, la remise sur l'abonnement, la facture à 29,50 €.
 *      Puis le portail client répond une URL, l'abonnement est résilié par
 *      l'API (→ webhook deleted → statut canceled + retour sur Essentiel), le
 *      paiement est REMBOURSÉ par l'API, le client Stripe supprimé, le studio
 *      jetable purgé.
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
const MONTANT_PROMO = 2950; // Studio 59 € avec LANCEMENT50 (−50 %)

const need = (k) => { if (!process.env[k]) { console.error(`❌ ${k} manquante (lance avec node --env-file=.env.local)`); process.exit(1); } return process.env[k]; };
const SUPA_URL = need('NEXT_PUBLIC_SUPABASE_URL');
const SVC_KEY = need('SUPABASE_SERVICE_ROLE_KEY');
const ANON_KEY = need('NEXT_PUBLIC_SUPABASE_ANON_KEY');
const SK = need('STRIPE_SECRET_KEY');
const PRICES = {
  'pro/mensuel': { id: need('STRIPE_PRICE_ID_PRO_MENSUEL'), montant: 2900, libelle: 'Complet 29 €/mois' },
  'asso/mensuel': { id: need('STRIPE_PRICE_ID_ASSO_MENSUEL'), montant: 3900, libelle: 'Association 39 €/mois' },
  'asso/annuel': { id: need('STRIPE_PRICE_ID_ASSO_ANNUEL'), montant: 39000, libelle: 'Association 390 €/an' },
  'studio/mensuel': { id: need('STRIPE_PRICE_ID_STUDIO_MENSUEL'), montant: 5900, libelle: 'Studio 59 €/mois' },
  'studio/annuel': { id: need('STRIPE_PRICE_ID_STUDIO_ANNUEL'), montant: 59000, libelle: 'Studio 590 €/an' },
};
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
const DEBUT_RUN = new Date().toISOString();
const colonneInconnue = (e) => e && (e.code === '42703' || e.code === 'PGRST204');

let userId = null, profileId = null, customerId = null, subscriptionId = null;
const sessions = []; // toutes les sessions ouvertes par la preuve, expirées à la purge

async function purger() {
  for (const s of sessions) {
    if (s?.id) await stripe.checkout.sessions.expire(s.id).catch(() => {});
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
    await svc.auth.admin.deleteUser(u.id).catch(() => {});
  }
}
await purger();

// ── Studio jetable : une prof seule en essai, comme une vraie inscription ────
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
  const checkout = async (plan, periode = 'mensuel') => {
    const r = await fetch(`${BASE}/api/stripe/checkout-saas`, { method: 'POST', headers: { 'Content-Type': 'application/json', cookie }, body: JSON.stringify({ plan, periode }) });
    return { status: r.status, corps: await r.json().catch(() => ({})) };
  };
  const resume = (r) => `status ${r.status} · ${JSON.stringify(r.corps).slice(0, 110)}`;
  const estUrlStripe = (r) => r.status === 200 && /checkout\.stripe\.com/.test(r.corps.url || '');

  // Relit une session ouverte par la route et vérifie son Price. `garder` =
  // ne pas l'expirer (celle du paiement réel).
  const verifierSession = async (r, cle, { garder = false } = {}) => {
    const id = idDepuisUrl(r.corps.url);
    if (!id) return null;
    const s = await stripe.checkout.sessions.retrieve(id, { expand: ['line_items'] });
    const attendu = PRICES[cle];
    const price = s.line_items?.data?.[0]?.price;
    c(`${attendu.libelle} : session en mode abonnement, ouverte`, s.mode === 'subscription' && s.status === 'open', s.status);
    c(`${attendu.libelle} : le Price est le bon, ${attendu.montant / 100} € TTC`, price?.id === attendu.id && price?.unit_amount === attendu.montant, `${price?.id} · ${price?.unit_amount}`);
    const [plan, periode] = cle.split('/');
    c(`${attendu.libelle} : profile_id, plan et période en métadonnées (le webhook s'en sert)`, s.metadata?.profile_id === profileId && s.metadata?.plan === plan && s.metadata?.periode === periode, JSON.stringify(s.metadata));
    if (garder) { sessions.push(s); return s; }
    await stripe.checkout.sessions.expire(id);
    const relue = await stripe.checkout.sessions.retrieve(id);
    c(`${attendu.libelle} : session expirée (aucune session orpheline)`, relue.status === 'expired');
    return relue;
  };

  // ── 1. Les refus, avant que Stripe ne voie quoi que ce soit ──────────────
  console.log(`\n— 1. Les refus (prof seule, en essai · ${BASE}) —`);
  const rSolo = await checkout('solo');
  c('Essentiel (solo) est GRATUIT : refusé 400 PLAN_GRATUIT, rien à souscrire', rSolo.status === 400 && rSolo.corps.code === 'PLAN_GRATUIT', resume(rSolo));
  const rMulti = await checkout('multi');
  c('Multi (retiré le 2026-09-13) est refusé 400 PLAN_INVALIDE', rMulti.status === 400 && rMulti.corps.code === 'PLAN_INVALIDE', resume(rMulti));
  const rPremium = await checkout('premium');
  c('premium (legacy) est refusé 400, jamais vendu', rPremium.status === 400, resume(rPremium));
  const rProAnnuel = await checkout('pro', 'annuel');
  c('Complet annuel n\'existe pas : 400 PERIODE_INVALIDE', rProAnnuel.status === 400 && rProAnnuel.corps.code === 'PERIODE_INVALIDE', resume(rProAnnuel));
  const rAssoSeule = await checkout('asso');
  c('Association pour une prof seule : 403 ASSOCIATION_REQUISE (RNA exigé), jamais « prix non configuré »', rAssoSeule.status === 403 && rAssoSeule.corps.code === 'ASSOCIATION_REQUISE', resume(rAssoSeule));

  // ── 2. Complet ───────────────────────────────────────────────────────────
  console.log('\n— 2. Complet (29 €) —');
  const rPro = await checkout('pro');
  c('la route répond 200 avec une URL Stripe', estUrlStripe(rPro), resume(rPro));
  if (estUrlStripe(rPro)) await verifierSession(rPro, 'pro/mensuel');

  // ── 3. Studio, mensuel et annuel, par une prof seule ─────────────────────
  console.log('\n— 3. Studio (59 €/mois, 590 €/an), demandé par une prof seule —');
  const rStudio = await checkout('studio');
  c('Studio mensuel : la route répond 200 avec une URL Stripe', estUrlStripe(rStudio), resume(rStudio));
  let sessionStudio = null;
  if (estUrlStripe(rStudio)) {
    sessionStudio = await verifierSession(rStudio, 'studio/mensuel', { garder: true });
    c('les codes promo sont autorisés (LANCEMENT50 saisissable)', sessionStudio.allow_promotion_codes === true);
    c('l\'email client = l\'email de connexion (reçus et relances d\'impayé)', (sessionStudio.customer_email || '').toLowerCase() === EMAIL);
    c('aucun essai Stripe (les 30 jours sont comptés par IziSolo)', !sessionStudio.subscription_data?.trial_end);
    c('retour vers Paramètres → Abonnement avec l\'id de session', /parametres\/abonnement\?abo=success&session_id=/.test(sessionStudio.success_url || ''));
    const rStudioBis = await checkout('studio');
    c('re-cliquer donne la MÊME session (clé d\'idempotence)', rStudioBis.status === 200 && idDepuisUrl(rStudioBis.corps.url) === sessionStudio.id);
  }
  const rStudioAn = await checkout('studio', 'annuel');
  c('Studio annuel : la route répond 200 avec une URL Stripe', estUrlStripe(rStudioAn), resume(rStudioAn));
  if (estUrlStripe(rStudioAn)) await verifierSession(rStudioAn, 'studio/annuel');

  // ── 4. Une association déclarée ──────────────────────────────────────────
  console.log('\n— 4. Association (39 €/mois, 390 €/an), par une association déclarée —');
  const { error: eAsso } = await svc.from('profiles').update({ type_structure: 'association', rna: 'W751234567' }).eq('id', profileId);
  if (colonneInconnue(eAsso)) {
    console.log('  ⏭ v110 absente (type_structure) : la famille Association ne peut pas être prouvée ici.');
  } else {
    c('le studio jetable est devenu une association (type + RNA en base)', !eAsso, eAsso?.message);
    const rStudioAsso = await checkout('studio');
    c('Studio pour une association : 403 PLAN_HORS_FAMILLE (son plan est Association)', rStudioAsso.status === 403 && rStudioAsso.corps.code === 'PLAN_HORS_FAMILLE', resume(rStudioAsso));
    const rAsso = await checkout('asso');
    c('Association mensuel : la route répond 200 avec une URL Stripe', estUrlStripe(rAsso), resume(rAsso));
    if (estUrlStripe(rAsso)) await verifierSession(rAsso, 'asso/mensuel');
    const rAssoAn = await checkout('asso', 'annuel');
    c('Association annuel : la route répond 200 avec une URL Stripe', estUrlStripe(rAssoAn), resume(rAssoAn));
    if (estUrlStripe(rAssoAn)) await verifierSession(rAssoAn, 'asso/annuel');
    // Retour prof seule pour la phase 2 : c'est le webhook qui doit la faire
    // devenir un studio quand elle paie Studio.
    const { error: eRetour } = await svc.from('profiles').update({ type_structure: 'solo', rna: null }).eq('id', profileId);
    c('le studio jetable redevient une prof seule', !eRetour, eRetour?.message);
  }

  // ── 5. Le vrai paiement : Studio mensuel avec LANCEMENT50 ────────────────
  if (SANS_PAIEMENT || !sessionStudio) {
    console.log('\n— 5. Paiement réel : non joué (--sans-paiement) —');
  } else {
    console.log('\n— 5. Paiement réel —');
    console.log(`\n   👉 Ouvre cette URL, saisis LANCEMENT50, paie avec une vraie carte (${MONTANT_PROMO / 100} €) :`);
    console.log(`   ${rStudio.corps.url}\n`);
    console.log(`   J'attends le webhook jusqu'à ${ATTENTE_PAIEMENT_MIN} min…`);
    const profil = await attendre(async () => {
      const { data } = await svc.from('profiles').select('plan, type_structure, stripe_customer_id, stripe_subscription_id, stripe_subscription_status, stripe_current_period_end').eq('id', profileId).maybeSingle();
      return data?.stripe_subscription_status ? data : null;
    }, ATTENTE_PAIEMENT_MIN * 60000, 3000);
    c('le webhook a écrit le statut de l\'abonnement en base', !!profil, JSON.stringify(profil));
    if (profil) {
      customerId = profil.stripe_customer_id; subscriptionId = profil.stripe_subscription_id;
      c('statut active', profil.stripe_subscription_status === 'active', profil.stripe_subscription_status);
      c('customer et subscription posés', /^cus_/.test(customerId || '') && /^sub_/.test(subscriptionId || ''));
      c('plan = studio (lu depuis le PRICE, pas la métadonnée)', profil.plan === 'studio', profil.plan);
      // Le type peut arriver une seconde après le plan (update séparé, §6.1).
      const typeApres = await attendre(async () => {
        const { data } = await svc.from('profiles').select('type_structure').eq('id', profileId).maybeSingle();
        return data?.type_structure === 'studio' ? data : null;
      }, 20000, 1000);
      c('la prof seule qui achète Studio DEVIENT un studio (type_structure posé par le webhook)', !!typeApres, String(typeApres?.type_structure || profil.type_structure));
      c('la DATE DE FIN DE PÉRIODE est écrite', !!profil.stripe_current_period_end, String(profil.stripe_current_period_end));
      const sub = await stripe.subscriptions.retrieve(subscriptionId);
      const remise = sub.discounts?.length || sub.discount ? 'oui' : 'non';
      c('LANCEMENT50 appliqué sur l\'abonnement Stripe', remise === 'oui', `discount: ${remise}`);
      c('l\'abonnement Stripe porte le Price Studio mensuel', sub.items?.data?.[0]?.price?.id === PRICES['studio/mensuel'].id, sub.items?.data?.[0]?.price?.id);
      const inv = await stripe.invoices.list({ subscription: subscriptionId, limit: 1 });
      const facture = inv.data[0];
      c(`première facture Stripe payée à ${MONTANT_PROMO / 100} €`, facture?.status === 'paid' && facture.amount_paid === MONTANT_PROMO, `${facture?.status} ${facture?.amount_paid}`);

      // Portail client : la route choisit la configuration des STRUCTURES
      // puisque le profil est devenu un studio.
      const rp = await fetch(`${BASE}/api/stripe/customer-portal`, { method: 'POST', headers: { cookie } });
      const cp = await rp.json().catch(() => ({}));
      c('le portail client répond une URL billing.stripe.com', rp.status === 200 && /billing\.stripe\.com/.test(cp.url || ''), `status ${rp.status} · ${JSON.stringify(cp).slice(0, 100)}`);

      // Résiliation par l'API → webhook deleted → base
      await stripe.subscriptions.cancel(subscriptionId);
      const apres = await attendre(async () => {
        const { data } = await svc.from('profiles').select('stripe_subscription_status, plan').eq('id', profileId).maybeSingle();
        return data?.stripe_subscription_status === 'canceled' ? data : null;
      }, 120000, 3000);
      c('résiliation → le webhook passe le statut à canceled en base', !!apres);
      c('résiliation → retour sur Essentiel gratuit (plan = solo), jamais free ni gelé', apres?.plan === 'solo', String(apres?.plan));
      subscriptionId = null;

      // Remboursement
      // API 2025-09 : l'invoice ne porte plus `charge` ni `payment_intent` — on
      // retrouve le paiement par le CLIENT, avant de le supprimer (purge).
      const charges = await stripe.charges.list({ customer: customerId, limit: 5 });
      const charge = charges.data.find(ch => ch.status === 'succeeded' && !ch.refunded);
      if (charge) {
        const refund = await stripe.refunds.create({ charge: charge.id });
        c(`le paiement (${charge.amount / 100} €) est remboursé`, refund.status === 'succeeded' || refund.status === 'pending', refund.status);
      } else {
        c('remboursement : charge introuvable, à faire depuis le dashboard', false);
      }

      // Le webhook ne doit ni mentir ni rejouer : aucune erreur journalisée
      // pendant le run, et les événements marqués traités (sinon 500 → Stripe
      // rejoue pendant 3 jours — le bug attrapé le 2026-09-07).
      await new Promise(r => setTimeout(r, 4000));
      const { data: erreurs } = await svc.from('erreurs_app').select('message').gte('created_at', DEBUT_RUN).ilike('message', '%webhook-saas%');
      c('aucune erreur [webhook-saas] journalisée pendant le run', (erreurs || []).length === 0, (erreurs || []).map(e => String(e.message).slice(0, 70)).join(' | '));
      const { data: traites } = await svc.from('stripe_events_processed').select('event_type').gte('processed_at', DEBUT_RUN);
      const types = new Set((traites || []).map(e => e.event_type));
      c('checkout.session.completed, subscription.created et subscription.deleted marqués traités', ['checkout.session.completed', 'customer.subscription.created', 'customer.subscription.deleted'].every(t => types.has(t)), [...types].join(', '));
    }
  }
} finally {
  await purger();
  console.log('\nStudio jetable, client Stripe et sessions purgés.');
}

console.log(`\nRésultat : ${ok} OK / ${ko} KO`);
process.exit(ko === 0 ? 0 : 1);
