/**
 * PREUVE — prélèvement automatique par carte (v107, 2026-09-07).
 *
 * Décision Colin : le Payment Link RÉCURRENT de la prof, collé sur son
 * offre, et IziSolo qui suit chaque prélèvement. Sans clé API, tout vient
 * des événements SIGNÉS : on les fabrique ici, signés avec le secret de
 * test posé sur le démo (même vérification de signature qu'en prod,
 * `stripe.webhooks.generateTestHeaderString`), dans l'ordre que Stripe NE
 * garantit pas (le premier prélèvement arrive AVANT le checkout).
 *
 *   1. invoice.paid (subscription_create) AVANT le checkout → paiement
 *      orphelin, rattaché à l'élève par son email, idempotent par id de
 *      facture Stripe (stripe_session_id).
 *   2. checkout.session.completed (mode subscription) → l'abo naît, porte le
 *      sub_… (v107), et le paiement orphelin lui est rattaché.
 *   3. invoice.paid (subscription_cycle) → 2e paiement rattaché, abo
 *      PROLONGÉ à la fin de période, facture v106 émise et envoyée.
 *   4. Rejeu du même événement → rien (idempotence).
 *   5. invoice.payment_failed (1re tentative) → cloche prof, email élève,
 *      abo toujours actif.
 *   6. invoice.payment_failed (3e tentative) → abo EN PAUSE.
 *   7. invoice.paid → abo réactivé, prolongé.
 *   8. customer.subscription.deleted → abo actif jusqu'à la fin de période
 *      payée, note de résiliation, cloche prof.
 *   9. Vrai navigateur : badge « Prélèvement auto » sur la fiche (session
 *      prof), « Prélèvement automatique par carte » dans l'espace élève, et
 *      la pause absente des deux côtés.
 *
 * Auto-adaptative (sonde v107) : sans la migration, on prouve que l'argent
 * est enregistré et idempotent, que la prof est prévenue, et que rien ne
 * casse. Re-runnable, témoins purgés et démo restauré même en échec.
 * ⚠️ Envoie 2 à 3 emails RÉELS à bonjour@izisolo.fr (facture + échec).
 */
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import Stripe from 'stripe';
import { STRIPE_API_VERSION } from '../lib/stripe-api-version.js';

const BASE = process.env.PROOF_BASE || 'http://localhost:3333';
const EMAIL_TEMOIN = 'bonjour@izisolo.fr';
const SECRET_TEST = 'whsec_preuve_prelevement_v107';
const SUB = 'sub_preuve_prelev_001';
const CUS = 'cus_preuve_prelev_001';
const PLINK = 'plink_preuve_prelev_001';

const env = Object.fromEntries(
  readFileSync(join(process.cwd(), '.env.local'), 'utf8')
    .split('\n').filter(l => l.includes('=') && !l.startsWith('#'))
    .map(l => [l.slice(0, l.indexOf('=')).trim(), l.slice(l.indexOf('=') + 1).trim()])
);
const PROJECT_REF = new URL(env.NEXT_PUBLIC_SUPABASE_URL).hostname.split('.')[0];
const svc = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
const stripe = new Stripe('sk_dummy_for_signature_only', { apiVersion: STRIPE_API_VERSION });

let ok = 0, ko = 0;
const c = (l, cond, d = '') => { if (cond) { ok++; console.log('  OK  ' + l + (d ? ' - ' + d : '')); } else { ko++; console.log('  KO  ' + l + (d ? ' - ' + d : '')); } };
const attendre = async (fn, ms = 20000, pas = 500) => {
  const fin = Date.now() + ms;
  for (;;) { const r = await fn(); if (r) return r; if (Date.now() > fin) return null; await new Promise(r2 => setTimeout(r2, pas)); }
};
const iso = d => d.toISOString().slice(0, 10);
const epoch = d => Math.floor(d.getTime() / 1000);
const auj = new Date();
const plusJours = n => new Date(auj.getTime() + n * 86400000);

const { data: demo } = await svc.from('profiles')
  .select('id, studio_slug, studio_nom, stripe_webhook_secret, facturation_siret, facturation_raison_sociale, facturation_mention_tva, facturation_auto')
  .eq('studio_slug', 'atelier-soleil').single();
if (!demo) { console.error('Démo introuvable'); process.exit(1); }

let V107 = true;
{
  const { error } = await svc.from('abonnements').select('stripe_subscription_id').eq('profile_id', demo.id).limit(1);
  if (error && (['42703', 'PGRST204', 'PGRST205'].includes(error.code) || /stripe_subscription_id/.test(error.message || ''))) V107 = false;
}
console.log(`migration v107 : ${V107 ? 'APPLIQUEE (phase complète)' : 'ABSENTE (phase dégradée — relance après application)'}`);

const profilAvant = {
  stripe_webhook_secret: demo.stripe_webhook_secret,
  facturation_siret: demo.facturation_siret,
  facturation_raison_sociale: demo.facturation_raison_sociale,
  facturation_mention_tva: demo.facturation_mention_tva,
  facturation_auto: demo.facturation_auto === true,
};

let fiche = null, offreTemoin = null, eleveUserId = null;
async function purger() {
  const { data: fiches } = await svc.from('clients').select('id').eq('profile_id', demo.id).ilike('email', EMAIL_TEMOIN);
  for (const f of fiches || []) {
    const { data: pays } = await svc.from('paiements').select('id').eq('client_id', f.id);
    const ids = (pays || []).map(p => p.id);
    if (ids.length) {
      const { data: fp } = await svc.from('factures_paiements').select('facture_id').in('paiement_id', ids);
      const fids = [...new Set((fp || []).map(x => x.facture_id))];
      if (fids.length) await svc.from('factures').delete().in('id', fids);
    }
    await svc.from('factures').delete().eq('client_id', f.id);
    await svc.from('paiements').delete().eq('client_id', f.id);
    await svc.from('abonnements').delete().eq('client_id', f.id);
    await svc.from('presences').delete().eq('client_id', f.id);
    await svc.from('clients').delete().eq('id', f.id);
  }
  // Paiements orphelins (sans fiche) d'un run précédent : par id de facture témoin.
  await svc.from('paiements').delete().eq('profile_id', demo.id).ilike('stripe_session_id', 'in_preuve_prelev_%');
  await svc.from('notifications').delete().eq('profile_id', demo.id).ilike('ref_key', 'prelevement_%');
  await svc.from('emails_envoyes').delete().eq('destinataire', EMAIL_TEMOIN).in('type', ['facture_auto', 'prelevement_echec']);
  await svc.from('offres').delete().eq('profile_id', demo.id).ilike('stripe_payment_link', `%${PLINK}%`);
  await svc.from('profiles').update(profilAvant).eq('id', demo.id);
  if (eleveUserId) { await svc.auth.admin.deleteUser(eleveUserId).catch(() => {}); eleveUserId = null; }
  else {
    const { data: lst } = await svc.auth.admin.listUsers({ page: 1, perPage: 200 }).catch(() => ({ data: null }));
    const u = lst?.users?.find(x => x.email === EMAIL_TEMOIN);
    if (u) await svc.auth.admin.deleteUser(u.id).catch(() => {});
  }
}
await purger();

// ── Mise en place ──────────────────────────────────────────────────────────
await svc.from('profiles').update({
  stripe_webhook_secret: SECRET_TEST,
  facturation_siret: '73282932000074',
  facturation_raison_sociale: 'Studio Démo — preuve prélèvement',
  facturation_mention_tva: null,
  facturation_auto: true,
}).eq('id', demo.id);
{
  const { data: f, error } = await svc.from('clients').insert({
    profile_id: demo.id, prenom: 'Jessica', nom: 'Prélevée', email: EMAIL_TEMOIN, statut: 'actif',
  }).select('id').single();
  if (error) { console.error('fiche témoin KO:', error.message); process.exit(1); }
  fiche = f;
}
{
  const { data: o, error } = await svc.from('offres').insert({
    profile_id: demo.id, nom: 'Abo au mois prélevé (témoin)', type: 'abonnement', prix: 55, duree_jours: 30,
    stripe_payment_link: `https://buy.stripe.com/${PLINK}`, actif: true,
  }).select('id, nom').single();
  if (error) { console.error('offre témoin KO:', error.message); await purger(); process.exit(1); }
  offreTemoin = o;
}

// ── Fabrique d'événements signés ───────────────────────────────────────────
async function envoyer(type, objet, idEvt) {
  const payload = JSON.stringify({ id: idEvt || `evt_${type.replace(/\./g, '_')}_${Date.now()}`, type, data: { object: objet } });
  const signature = stripe.webhooks.generateTestHeaderString({ payload, secret: SECRET_TEST });
  const res = await fetch(`${BASE}/api/stripe/webhook?profile=${demo.id}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', 'stripe-signature': signature }, body: payload,
  });
  return res;
}
const invoice = ({ id, debut, fin, montant = 5500, paye = true, raison = 'subscription_cycle', tentatives = 1, prochaine = null }) => ({
  id, object: 'invoice', customer: CUS, customer_email: EMAIL_TEMOIN, subscription: SUB,
  amount_paid: paye ? montant : 0, amount_due: montant, billing_reason: raison, attempt_count: tentatives,
  next_payment_attempt: prochaine ? epoch(prochaine) : null,
  status_transitions: paye ? { paid_at: epoch(debut) } : {}, created: epoch(debut),
  lines: { data: [{ description: 'Abonnement mensuel', period: { start: epoch(debut), end: epoch(fin) } }] },
});
const P1 = { debut: plusJours(-30), fin: auj };          // 1re période (créée il y a 30 j)
const P2 = { debut: auj, fin: plusJours(30) };           // cycle courant
const P3 = { debut: plusJours(30), fin: plusJours(60) }; // cycle suivant
const aboRow = async () => {
  const { data } = await svc.from('abonnements').select('id, statut, date_fin, notes, notes_pause, offre_id, client_id').eq('client_id', fiche.id).order('created_at', { ascending: false }).limit(1).maybeSingle();
  return data;
};
const paiementsRows = async () => {
  const { data } = await svc.from('paiements').select('id, montant, statut, mode, date, date_encaissement, abonnement_id, client_id, stripe_session_id, intitule, commission_montant').eq('profile_id', demo.id).ilike('stripe_session_id', 'in_preuve_prelev_%').order('date');
  return data || [];
};

let chromium; try { ({ chromium } = await import('playwright')); } catch { ({ chromium } = await import('@playwright/test')); }
let browser; try { browser = await chromium.launch({ channel: 'msedge' }); } catch { browser = await chromium.launch(); }

try {
  // Dev server prêt
  for (let i = 0; i < 60; i++) { try { const r = await fetch(`${BASE}/login`); if (r.ok) break; } catch { /* pas prêt */ } await new Promise(r => setTimeout(r, 2000)); }

  // ── 0. Signature : un événement mal signé est refusé ─────────────────────
  console.log('\n— 0. Signature —');
  {
    const payload = JSON.stringify({ id: 'evt_faux', type: 'invoice.paid', data: { object: invoice({ id: 'in_preuve_prelev_faux', ...P1 }) } });
    const res = await fetch(`${BASE}/api/stripe/webhook?profile=${demo.id}`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'stripe-signature': 't=1,v1=deadbeef' }, body: payload });
    c('un événement mal signé est refusé (400)', res.status === 400, String(res.status));
    c('et n\'écrit RIEN', (await paiementsRows()).length === 0);
  }

  // ── 1. Le premier prélèvement arrive AVANT le checkout ──────────────────
  console.log('\n— 1. invoice.paid AVANT le checkout : paiement orphelin, rattaché par email —');
  const r1 = await envoyer('invoice.paid', invoice({ id: 'in_preuve_prelev_1', ...P1, raison: 'subscription_create' }));
  c('le webhook répond 200', r1.status === 200, String(r1.status));
  let pays = await paiementsRows();
  c('1 paiement réglé de 55 €, CB, daté du paiement, rattaché à la fiche par email', pays.length === 1 && pays[0].statut === 'paid' && parseFloat(pays[0].montant) === 55 && pays[0].mode === 'CB' && pays[0].client_id === fiche.id && pays[0].date === iso(P1.debut), JSON.stringify(pays[0]));
  c('commission 1 % posée (0,55 €)', parseFloat(pays[0]?.commission_montant) === 0.55);
  c('sans abo encore : abonnement_id NULL (le checkout le rattachera)', pays[0]?.abonnement_id === null);
  c('l\'intitulé porte le mois de la période', /Abonnement mensuel · /.test(pays[0]?.intitule || ''), pays[0]?.intitule);

  // ── 2. Le checkout : l'abo naît et rattache l'orphelin ──────────────────
  console.log('\n— 2. checkout.session.completed (mode subscription) —');
  const r2 = await envoyer('checkout.session.completed', {
    id: 'cs_preuve_prelev_1', object: 'checkout.session', mode: 'subscription', subscription: SUB, customer: CUS,
    payment_link: PLINK, customer_details: { email: EMAIL_TEMOIN }, amount_total: 5500, created: epoch(P1.debut),
  });
  c('le webhook répond 200', r2.status === 200, String(r2.status));
  let abo = await aboRow();
  c('EN BASE : un abonnement actif est né pour la fiche, sur l\'offre du Payment Link', !!abo && abo.statut === 'actif' && abo.offre_id === offreTemoin.id, JSON.stringify(abo));
  pays = await paiementsRows();
  c('AUCUN paiement doublon créé par le checkout (toujours 1)', pays.length === 1);
  if (V107) {
    c('le paiement orphelin est RATTACHÉ à l\'abo', pays[0]?.abonnement_id === abo?.id);
    const { data: sub } = await svc.from('abonnements').select('stripe_subscription_id, stripe_customer_id').eq('id', abo.id).maybeSingle();
    c('l\'abo porte le sub_ et le cus_ Stripe', sub?.stripe_subscription_id === SUB && sub?.stripe_customer_id === CUS);
  } else {
    c('sans v107 : l\'abo existe mais ne peut pas porter le sub_ (dégradé assumé)', !!abo);
  }
  const r2b = await envoyer('checkout.session.completed', {
    id: 'cs_preuve_prelev_1', object: 'checkout.session', mode: 'subscription', subscription: SUB, customer: CUS,
    payment_link: PLINK, customer_details: { email: EMAIL_TEMOIN }, amount_total: 5500, created: epoch(P1.debut),
  });
  const { count: nbAbos } = await svc.from('abonnements').select('id', { count: 'exact', head: true }).eq('client_id', fiche.id);
  c('rejouer le checkout ne crée pas un 2e abo', r2b.status === 200 && nbAbos === (V107 ? 1 : 2), `abos: ${nbAbos}`);

  // ── 3. Le cycle suivant : paiement rattaché, abo prolongé, facture ───────
  console.log('\n— 3. invoice.paid (cycle) : paiement, prolongation, facture automatique —');
  const r3 = await envoyer('invoice.paid', invoice({ id: 'in_preuve_prelev_2', ...P2 }));
  c('le webhook répond 200', r3.status === 200, String(r3.status));
  pays = await paiementsRows();
  const p2 = pays.find(p => p.stripe_session_id === 'in_preuve_prelev_2');
  c('2e paiement réglé, 55 €, daté d\'aujourd\'hui', !!p2 && p2.statut === 'paid' && parseFloat(p2.montant) === 55 && p2.date === iso(auj), JSON.stringify(p2));
  abo = await aboRow();
  if (V107) {
    c('le paiement est rattaché à l\'abo', p2?.abonnement_id === abo?.id);
    c(`l'abo est PROLONGÉ jusqu'à la fin de période (${iso(P2.fin)})`, abo?.date_fin === iso(P2.fin), abo?.date_fin);
  }
  const facture = await attendre(async () => {
    const { data } = await svc.from('factures_paiements').select('facture:facture_id (numero_affiche, statut)').eq('paiement_id', p2?.id || '00000000-0000-0000-0000-000000000000').maybeSingle();
    return data?.facture?.statut === 'emise' ? data.facture : null;
  }, 40000);
  c('la facture v106 est ÉMISE toute seule sur le prélèvement', !!facture, facture?.numero_affiche);
  const claim = await attendre(async () => {
    const { data } = await svc.from('emails_envoyes').select('id').eq('type', 'facture_auto').eq('destinataire', EMAIL_TEMOIN).eq('ref', `${demo.id}:${p2?.id}`).maybeSingle();
    return data || null;
  }, 20000);
  c('et l\'email facture est PARTI (claim persistant)', !!claim);

  // ── 4. Rejeu : idempotence ───────────────────────────────────────────────
  console.log('\n— 4. Rejeu du même invoice.paid —');
  const r4 = await envoyer('invoice.paid', invoice({ id: 'in_preuve_prelev_2', ...P2 }));
  pays = await paiementsRows();
  c('rejouer l\'événement ne crée pas de paiement (toujours 2)', r4.status === 200 && pays.length === 2, `paiements: ${pays.length}`);
  const { count: nbFact } = await svc.from('factures_paiements').select('paiement_id', { count: 'exact', head: true }).eq('paiement_id', p2?.id || '00000000-0000-0000-0000-000000000000');
  c('toujours 1 facture sur ce prélèvement', nbFact === 1);

  // ── 5. Échec, 1re tentative ───────────────────────────────────────────────
  console.log('\n— 5. invoice.payment_failed (1re tentative, Stripe réessaie) —');
  const r5 = await envoyer('invoice.payment_failed', invoice({ id: 'in_preuve_prelev_3', ...P3, paye: false, tentatives: 1, prochaine: plusJours(3) }));
  c('le webhook répond 200', r5.status === 200, String(r5.status));
  const notif1 = await attendre(async () => {
    const { data } = await svc.from('notifications').select('id, titre, type').eq('profile_id', demo.id).eq('ref_key', 'prelevement_echec_in_preuve_prelev_3_1').maybeSingle();
    return data || null;
  });
  c('cloche prof : « Prélèvement en échec » (type prelevement)', !!notif1 && notif1.type === 'prelevement' && /en échec/.test(notif1.titre), notif1?.titre);
  const claimEchec = await attendre(async () => {
    const { data } = await svc.from('emails_envoyes').select('id').eq('type', 'prelevement_echec').eq('destinataire', EMAIL_TEMOIN).eq('ref', `${demo.id}:in_preuve_prelev_3:1`).maybeSingle();
    return data || null;
  });
  c('l\'élève a reçu l\'email d\'échec (claim)', !!claimEchec);
  abo = await aboRow();
  c('l\'abo reste ACTIF (Stripe réessaie)', abo?.statut === 'actif', abo?.statut);

  // ── 6. Échec final : pause ───────────────────────────────────────────────
  console.log('\n— 6. invoice.payment_failed (3e tentative) : abo en pause —');
  const r6 = await envoyer('invoice.payment_failed', invoice({ id: 'in_preuve_prelev_3', ...P3, paye: false, tentatives: 3, prochaine: null }));
  c('le webhook répond 200', r6.status === 200, String(r6.status));
  abo = await aboRow();
  if (V107) {
    c('l\'abo est EN PAUSE (gele) avec la raison', abo?.statut === 'gele' && /Prélèvement Stripe refusé/.test(abo?.notes_pause || ''), `${abo?.statut} · ${abo?.notes_pause}`);
  } else {
    c('sans v107 : l\'abo ne peut pas être retrouvé par sub_, il reste actif (dégradé assumé)', abo?.statut === 'actif');
  }
  const notif3 = await attendre(async () => {
    const { data } = await svc.from('notifications').select('id, titre').eq('profile_id', demo.id).eq('ref_key', 'prelevement_echec_in_preuve_prelev_3_3').maybeSingle();
    return data || null;
  });
  c('cloche prof : « Prélèvement refusé »', !!notif3 && /refusé/.test(notif3.titre), notif3?.titre);

  // ── 7. Un prélèvement qui finit par passer réactive ─────────────────────
  console.log('\n— 7. invoice.paid après échec : réactivation —');
  const r7 = await envoyer('invoice.paid', invoice({ id: 'in_preuve_prelev_4', ...P3 }));
  c('le webhook répond 200', r7.status === 200, String(r7.status));
  abo = await aboRow();
  if (V107) {
    c('l\'abo est de nouveau ACTIF et prolongé jusqu\'à la fin de la 3e période', abo?.statut === 'actif' && abo?.date_fin === iso(P3.fin), `${abo?.statut} · ${abo?.date_fin}`);
  }
  pays = await paiementsRows();
  c('3 paiements réglés au total (in_1, in_2, in_4), aucun pour la facture échouée', pays.length === 3 && !pays.some(p => p.stripe_session_id === 'in_preuve_prelev_3'));

  // ── 8. Résiliation ───────────────────────────────────────────────────────
  console.log('\n— 8. customer.subscription.deleted —');
  const r8 = await envoyer('customer.subscription.deleted', { id: SUB, object: 'subscription', customer: CUS, status: 'canceled', current_period_end: epoch(P3.fin), canceled_at: epoch(auj) });
  c('le webhook répond 200', r8.status === 200, String(r8.status));
  abo = await aboRow();
  if (V107) {
    c('l\'abo reste ACTIF jusqu\'à la fin de la période payée (rien n\'est retiré à l\'élève)', abo?.statut === 'actif' && abo?.date_fin === iso(P3.fin), `${abo?.statut} · ${abo?.date_fin}`);
    c('la note dit la résiliation et la date acquise', /résilié/.test(abo?.notes || '') && (abo?.notes || '').includes(iso(P3.fin)), abo?.notes);
    const notif8 = await attendre(async () => {
      const { data } = await svc.from('notifications').select('id, titre').eq('profile_id', demo.id).eq('ref_key', `prelevement_resilie_${SUB}`).maybeSingle();
      return data || null;
    });
    c('cloche prof : « Abonnement résilié »', !!notif8 && /résilié/.test(notif8.titre), notif8?.titre);
  } else {
    c('sans v107 : la résiliation ne trouve pas l\'abo et ne casse rien', !!abo);
  }

  // ── 9. Les écrans ────────────────────────────────────────────────────────
  console.log('\n— 9. Fiche élève et espace élève —');
  // Remettre l'abo actif prélevé pour lire les écrans (l'état après 7).
  if (V107) await svc.from('abonnements').update({ statut: 'actif' }).eq('id', abo.id);
  const sessionCookies = async (email) => {
    const { data: linkData } = await svc.auth.admin.generateLink({ type: 'magiclink', email });
    const anon = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data: otp } = await anon.auth.verifyOtp({ type: 'magiclink', token_hash: linkData.properties.hashed_token });
    const value = 'base64-' + Buffer.from(JSON.stringify(otp.session)).toString('base64url');
    const nm = `sb-${PROJECT_REF}-auth-token`;
    const cookies = [];
    if (value.length <= 3180) cookies.push({ name: nm, value });
    else for (let i = 0; i * 3180 < value.length; i++) cookies.push({ name: `${nm}.${i}`, value: value.slice(i * 3180, (i + 1) * 3180) });
    return cookies;
  };
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 1000 } });
  await ctx.addCookies((await sessionCookies('camille@atelier-soleil.fr')).map(cc => ({ ...cc, url: BASE, sameSite: 'Lax' })));
  const page = await ctx.newPage();
  const erreurs = [];
  page.on('pageerror', e => erreurs.push(String(e).slice(0, 160)));
  await page.goto(`${BASE}/clients/${fiche.id}`, { waitUntil: 'domcontentloaded', timeout: 120000 });
  await page.waitForSelector('text=Abo au mois prélevé (témoin)', { timeout: 90000 });
  // Témoin PRÉCIS : l'élément badge, pas un texte (les notes de l'abo disent
  // « Prélèvement automatique Stripe » et matcheraient un includes).
  const nbBadges = await page.locator('.abo-card .izi-badge', { hasText: 'Prélèvement auto' }).count();
  if (V107) {
    c('la fiche affiche le badge « 💳 Prélèvement auto »', nbBadges === 1, String(nbBadges));
    c('la fiche ne propose PAS « Mettre en pause » sur cet abo (bouton d\'en-tête)', (await page.locator('.abo-card button[title="Mettre en pause"]').count()) === 0);
    await page.locator('button.abo-nom-btn', { hasText: 'Abo au mois prélevé (témoin)' }).first().click();
    await page.waitForSelector('.abo-detail-sheet', { timeout: 15000 });
    const txtDetail = await page.innerText('.abo-detail-sheet');
    c('le détail dit que la pause et la résiliation se gèrent dans Stripe', /se gèrent dans ton Stripe/.test(txtDetail));
    c('ni « Encaisser un versement » ni « Programmer chaque mois » sur un abo prélevé', !/Encaisser un versement|Programmer chaque mois|Mettre en pause/.test(txtDetail));
  } else {
    c('sans v107 : la fiche se rend sans badge ni erreur', nbBadges === 0, String(nbBadges));
  }
  await page.locator('button.tab-btn:has-text("Paiements")').click();
  await page.waitForSelector('.paiement-fiche-item', { timeout: 30000 });
  const nbLignes = ((await page.innerText('body')).match(/Abonnement mensuel · /g) || []).length;
  c('les 3 prélèvements sont dans l\'onglet Paiements', nbLignes >= 3, String(nbLignes));

  const { data: cree, error: eU } = await svc.auth.admin.createUser({ email: EMAIL_TEMOIN, email_confirm: true, user_metadata: { role: 'eleve' } });
  if (!eU) eleveUserId = cree.user.id;
  const ctxE = await browser.newContext({ viewport: { width: 420, height: 1000 } });
  await ctxE.addCookies((await sessionCookies(EMAIL_TEMOIN)).map(cc => ({ ...cc, url: BASE, sameSite: 'Lax' })));
  const pe = await ctxE.newPage();
  await pe.goto(`${BASE}/p/${demo.studio_slug}/espace`, { waitUntil: 'domcontentloaded', timeout: 120000 });
  await pe.waitForSelector('text=Abo au mois prélevé (témoin)', { timeout: 90000 });
  const txtEspace = await pe.innerText('body');
  if (V107) c('l\'espace élève dit « Prélèvement automatique par carte · prochain autour du … »', /Prélèvement automatique par carte · prochain autour du/.test(txtEspace));
  else c('sans v107 : l\'espace élève se rend sans mention de prélèvement', !txtEspace.includes('Prélèvement automatique'));
  c('l\'espace liste les prélèvements dans « Mes paiements »', (txtEspace.match(/Abonnement mensuel · /g) || []).length >= 1);
  c('aucune erreur de page', erreurs.length === 0, erreurs.join(' | '));
} finally {
  await browser.close().catch(() => {});
  await purger();
  console.log('\nTémoins purgés (fiche, abos, paiements, factures, notifs, offre) et profil démo restauré.');
}

console.log(`\nRésultat : ${ok} OK / ${ko} KO`);
process.exit(ko === 0 ? 0 : 1);
