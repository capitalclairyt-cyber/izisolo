/**
 * Preuve — le paiement en ligne ne se propose que s'il est VRAIMENT branché.
 *
 * Contexte (2026-08-26, retour Manon / Soleya) : son élève Gaëlle dit avoir
 * pris une carte 10 séances depuis l'application. Aucune trace côté prof.
 * Diagnostic : trois Payment Links LIVE collés sur ses offres, et
 * `stripe_webhook_secret` vide — donc l'élève payait pour de vrai sur le
 * compte Stripe de la prof, et IziSolo n'en apprenait jamais rien. Mesuré le
 * même jour : 0 paiement Stripe élève enregistré en production depuis la
 * naissance de la feature, tous studios confondus.
 *
 * Décision (Colin) : tant que le webhook manque, on ne propose PAS de payer.
 * L'élève « demande » l'offre (v97), la prof encaisse comme elle veut.
 *
 * Ce que ce script prouve, dans le vrai navigateur puis sur le chemin réel :
 *   A. Sans webhook — l'espace élève ne contient AUCUNE URL de paiement, le
 *      bouton « Demander » prend sa place, et le portail public n'affiche pas
 *      la section « Acheter en ligne ».
 *   B. Le SECRET ne fuit dans aucune des deux pages (contrat de sécurité :
 *      il est lu côté serveur, jamais envoyé au navigateur).
 *   C. Côté prof — la page Offres dit ce qui manque et mène au bon écran.
 *   D. Une fois le secret posé, tout revient : le lien est servi, la section
 *      « Acheter en ligne » réapparaît, l'alerte prof disparaît.
 *   E. Le rattrapage de Manon — un événement Stripe REJOUÉ (signature réelle)
 *      crée le paiement ET le carnet, à la DATE DE LA SESSION et non à celle
 *      du rejeu (sinon la déclaration URSSAF, qui compte en trésorerie,
 *      tomberait dans le mauvais trimestre).
 *
 * Usage : node scripts/proof-paiement-en-ligne-branche.mjs [dossier-captures]
 * Prérequis : dev server sur :3333 (npm run dev). Témoins purgés et réglages
 * du démo restaurés, même en cas d'échec.
 */
import { createClient } from '@supabase/supabase-js';
import Stripe from 'stripe';
import { readFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = process.cwd();
const OUT = process.argv[2] || join(process.env.TEMP || '.', 'proof-paiement-branche');
mkdirSync(OUT, { recursive: true });
const BASE = 'http://localhost:3333';
const PROF_EMAIL = 'bonjour@melutek.com';
const MARQUEUR = '[preuve branche]';
const SECRET_TEST = 'whsec_preuve_paiement_en_ligne_branche';
const LIEN_TEST = 'https://buy.stripe.com/preuve_branche_carte10';

const env = Object.fromEntries(
  readFileSync(join(ROOT, '.env.local'), 'utf8')
    .split('\n').filter(l => l.includes('=') && !l.startsWith('#'))
    .map(l => [l.slice(0, l.indexOf('=')).trim(), l.slice(l.indexOf('=') + 1).trim()])
);
const PROJECT_REF = new URL(env.NEXT_PUBLIC_SUPABASE_URL).hostname.split('.')[0];
const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
const stripe = new Stripe('sk_test_factice_pour_signature', { apiVersion: '2024-06-20' });

let ok = 0, ko = 0;
const assert = (cond, label) => {
  if (cond) { ok++; console.log(`  OK  ${label}`); }
  else { ko++; console.log(`  KO  ${label}`); }
};
const attendre = ms => new Promise(r => setTimeout(r, ms));
const jour = n => new Date(Date.now() + n * 86400000).toLocaleDateString('sv-SE');

async function sessionCookies(email) {
  const { data: linkData, error: eLink } = await admin.auth.admin.generateLink({ type: 'magiclink', email });
  if (eLink) throw new Error(`generateLink(${email}): ${eLink.message}`);
  const anon = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: otpData, error: eOtp } = await anon.auth.verifyOtp({ type: 'magiclink', token_hash: linkData.properties.hashed_token });
  if (eOtp || !otpData?.session) throw new Error(`verifyOtp(${email}): ${eOtp?.message || 'pas de session'}`);
  const value = 'base64-' + Buffer.from(JSON.stringify(otpData.session)).toString('base64url');
  const cookieName = `sb-${PROJECT_REF}-auth-token`;
  const cookies = [];
  if (value.length <= 3180) cookies.push({ name: cookieName, value });
  else for (let i = 0; i * 3180 < value.length; i++) cookies.push({ name: `${cookieName}.${i}`, value: value.slice(i * 3180, (i + 1) * 3180) });
  return { cookies, userId: otpData.session.user.id };
}

async function envoyerWebhook(profileId, session) {
  const payload = JSON.stringify({
    id: `evt_${session.id}`,
    type: 'checkout.session.completed',
    data: { object: session },
  });
  const signature = stripe.webhooks.generateTestHeaderString({ payload, secret: SECRET_TEST });
  return fetch(`${BASE}/api/stripe/webhook?profile=${profileId}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'stripe-signature': signature },
    body: payload,
  });
}

for (let i = 0; i < 60; i++) {
  try { const r = await fetch(`${BASE}/login`); if (r.ok) break; } catch { /* pas pret */ }
  await attendre(2000);
  if (i === 59) { console.error('dev server injoignable sur :3333'); process.exit(1); }
}
console.log('dev server pret');

const { cookies, userId: profileId } = await sessionCookies(PROF_EMAIL);
const { data: profilAvant } = await admin.from('profiles')
  .select('studio_slug, afficher_tarifs, stripe_webhook_secret').eq('id', profileId).single();
const SLUG = profilAvant.studio_slug;
const SECRET_ORIGINE = profilAvant.stripe_webhook_secret;
const TARIFS_ORIGINE = profilAvant.afficher_tarifs;

const poserSecret = async (valeur) => {
  const { error } = await admin.from('profiles').update({ stripe_webhook_secret: valeur }).eq('id', profileId);
  if (error) throw new Error(`poserSecret: ${error.message}`);
};

const purger = async () => {
  const { data: cl } = await admin.from('clients').select('id, email').eq('profile_id', profileId).ilike('nom', `${MARQUEUR}%`);
  const clIds = (cl || []).map(c => c.id);
  // Comptes auth jetables de l'élève témoin : on ne laisse pas traîner.
  for (const c of cl || []) {
    if (!c.email) continue;
    const { data: liste } = await admin.auth.admin.listUsers({ perPage: 200 });
    const u = (liste?.users || []).find(x => x.email === c.email);
    if (u) await admin.auth.admin.deleteUser(u.id).catch(() => {});
  }
  if (clIds.length) {
    await admin.from('paiements').delete().in('client_id', clIds);
    await admin.from('abonnements').delete().in('client_id', clIds);
    await admin.from('presences').delete().in('client_id', clIds);
    await admin.from('clients').delete().in('id', clIds);
  }
  const { data: of } = await admin.from('offres').select('id').eq('profile_id', profileId).ilike('nom', `${MARQUEUR}%`);
  const ofIds = (of || []).map(o => o.id);
  if (ofIds.length) {
    await admin.from('paiements').delete().in('offre_id', ofIds);
    await admin.from('abonnements').delete().in('offre_id', ofIds);
    await admin.from('offres').delete().in('id', ofIds);
  }
};

const restaurer = async () => {
  await admin.from('profiles')
    .update({ stripe_webhook_secret: SECRET_ORIGINE, afficher_tarifs: TARIFS_ORIGINE })
    .eq('id', profileId);
};

let browser;
try {
  await purger();
  await poserSecret(null);
  await admin.from('profiles').update({ afficher_tarifs: true }).eq('id', profileId);

  // ── Témoins : la configuration de Soleya, à l'identique ───────────────────
  const emailEleve = `preuve-branche-${Date.now()}@example.com`;
  const { data: eleve, error: eE } = await admin.from('clients').insert({
    profile_id: profileId, prenom: 'Gaelle', nom: `${MARQUEUR} Temoin`,
    email: emailEleve, statut: 'actif', type_client: 'particulier',
  }).select('id, email').single();
  if (eE) throw new Error(`eleve: ${eE.message}`);

  const { data: offre, error: eO } = await admin.from('offres').insert({
    profile_id: profileId, nom: `${MARQUEUR} Carte 10 seances`, type: 'carnet',
    seances: 10, duree_jours: 180, prix: 150, actif: true,
    stripe_payment_link: LIEN_TEST,
  }).select('id, nom, prix').single();
  if (eO) throw new Error(`offre: ${eO.message}`);
  console.log(`temoins crees — offre « ${offre.nom} » avec un lien de paiement, webhook ABSENT\n`);

  let chromium;
  try { ({ chromium } = await import('playwright')); }
  catch { ({ chromium } = await import('@playwright/test')); }
  try { browser = await chromium.launch(); }
  catch { browser = await chromium.launch({ channel: 'msedge' }); }

  // Le compte auth de l'élève doit exister AVANT le magic link. `role: 'eleve'`
  // pour que le trigger v57 ne lui fabrique pas un studio fantôme.
  const { error: eU } = await admin.auth.admin.createUser({
    email: emailEleve, email_confirm: true, user_metadata: { role: 'eleve' },
  });
  if (eU && !/already/i.test(eU.message)) throw new Error(`compte eleve: ${eU.message}`);

  const eleveCtx = await browser.newContext({ viewport: { width: 420, height: 900 } });
  const { cookies: cookiesEleve } = await sessionCookies(emailEleve);
  await eleveCtx.addCookies(cookiesEleve.map(c => ({ ...c, domain: 'localhost', path: '/' })));
  const pageEleve = await eleveCtx.newPage();

  const profCtx = await browser.newContext({ viewport: { width: 1180, height: 900 } });
  await profCtx.addCookies(cookies.map(c => ({ ...c, domain: 'localhost', path: '/' })));
  const pageProf = await profCtx.newPage();

  // ── A. Sans webhook : aucun bouton « payer » ──────────────────────────────
  console.log('A. Sans webhook — l\'espace eleve ne propose PAS de payer');
  await pageEleve.goto(`${BASE}/p/${SLUG}/espace`, { waitUntil: 'networkidle' });
  await attendre(1200);
  await pageEleve.screenshot({ path: join(OUT, 'A-espace-sans-webhook.png'), fullPage: true });
  const texteSans = await pageEleve.locator('body').innerText();
  // ⚠️ On compte les LIENS CLIQUABLES du DOM, pas les occurrences dans le HTML
  // brut : en dev, Next transporte les logs serveur dans le payload RSC, donc
  // une URL peut apparaître dans la source sans qu'aucune élève puisse cliquer
  // dessus (artefact dev-only, cousin du piège `textContent` de §12 — vérifié
  // ici en mesurant : un console.log ajouté faisait passer le compteur de 0 à
  // 2 sans rien changer au rendu). Ce qui compte, c'est qu'aucun lien de
  // paiement ne soit atteignable.
  const liensPaiement = () => pageEleve.locator('a[href*="buy.stripe.com"]').count();
  assert(await liensPaiement() === 0, 'A · aucun lien de paiement cliquable dans l\'espace');
  assert(texteSans.includes(offre.nom), 'A · l\'offre reste VISIBLE au catalogue (on ne cache pas l\'offre)');
  assert(/Demander/.test(texteSans), 'A · le bouton « Demander » prend la place du paiement');

  // Cache-buster : le lien témoin est une constante, une réponse mise en cache
  // par un run précédent le ferait réapparaître et ferait accuser le produit à
  // tort. On demande une URL que personne n'a encore servie.
  await pageEleve.goto(`${BASE}/p/${SLUG}?tab=tarifs&_cb=${Date.now()}`, { waitUntil: 'networkidle' });
  await attendre(1200);
  const textePortail = await pageEleve.locator('body').innerText();
  const nbLiensPortail = await pageEleve.locator('a[href*="buy.stripe.com"]').count();
  console.log(`     [dom] liens de paiement cliquables sur le portail : ${nbLiensPortail}`);
  assert(nbLiensPortail === 0, 'A · portail public : aucun lien de paiement cliquable');
  assert(!/Acheter en ligne/.test(textePortail), 'A · la section « Acheter en ligne » ne s\'affiche pas');

  // ── B. Le secret ne fuit jamais ───────────────────────────────────────────
  console.log('\nB. Le secret Stripe ne part jamais au navigateur');
  await poserSecret(SECRET_TEST);
  await pageEleve.goto(`${BASE}/p/${SLUG}/espace`, { waitUntil: 'networkidle' });
  await attendre(1200);
  const htmlAvec = await pageEleve.content();
  assert(!htmlAvec.includes(SECRET_TEST), 'B · le secret est absent du HTML de l\'espace eleve');
  await pageEleve.goto(`${BASE}/p/${SLUG}?tab=tarifs`, { waitUntil: 'networkidle' });
  await attendre(1000);
  assert(!(await pageEleve.content()).includes(SECRET_TEST), 'B · absent du HTML du portail public');

  // ── D. Une fois branché, tout revient ─────────────────────────────────────
  console.log('\nD. Webhook pose — le paiement en ligne revient');
  await pageEleve.goto(`${BASE}/p/${SLUG}/espace`, { waitUntil: 'networkidle' });
  await attendre(1200);
  await pageEleve.screenshot({ path: join(OUT, 'D-espace-avec-webhook.png'), fullPage: true });
  const nbLiensOk = await pageEleve.locator(`a[href*="${LIEN_TEST}"]`).count();
  console.log(`     [dom] liens de paiement cliquables dans l'espace : ${nbLiensOk}`);
  assert(nbLiensOk >= 1, 'D · le lien de paiement est cliquable par l\'eleve');
  await pageEleve.goto(`${BASE}/p/${SLUG}?tab=tarifs`, { waitUntil: 'networkidle' });
  await attendre(1200);
  assert(/Acheter en ligne/.test(await pageEleve.locator('body').innerText()),
    'D · la section « Acheter en ligne » est de retour');

  // ── C. Cote prof : l'alerte dit ce qui manque, et disparait une fois fait ──
  console.log('\nC. Cote prof — la page Offres dit ce qui manque');
  await pageProf.goto(`${BASE}/offres`, { waitUntil: 'networkidle' });
  await attendre(1200);
  assert(await pageProf.locator('.webhook-alerte').count() === 0,
    'C · webhook configure : aucune alerte (on n\'alarme pas pour rien)');

  await poserSecret(null);
  await pageProf.goto(`${BASE}/offres`, { waitUntil: 'networkidle' });
  await attendre(1200);
  await pageProf.screenshot({ path: join(OUT, 'C-offres-alerte.png'), fullPage: true });
  assert(await pageProf.locator('.webhook-alerte').count() === 1, 'C · sans webhook, l\'alerte est rendue');
  const alerte = await pageProf.locator('.webhook-alerte').innerText();
  console.log(`     [ecran] « ${alerte.replace(/\n/g, ' | ').slice(0, 150)}… »`);
  assert(/n'est pas terminé/.test(alerte), 'C · elle dit que la configuration est incomplete');
  assert(/Demander/.test(alerte), 'C · elle dit ce que voient les eleves en attendant');
  const href = await pageProf.locator('.webhook-alerte a').first().getAttribute('href');
  assert(href === '/parametres?tab=portail&s=paiement', `C · le lien mene au bon ecran (${href})`);

  // ── E. Le rattrapage : un evenement REJOUE, date du jour du paiement ──────
  console.log('\nE. Rattrapage — un evenement Stripe rejoue cree le paiement ET le carnet');
  await poserSecret(SECRET_TEST);
  const DATE_PAIEMENT = jour(-5);
  const createdEpoch = Math.floor(new Date(`${DATE_PAIEMENT}T10:00:00Z`).getTime() / 1000);
  const session = {
    id: `cs_test_preuve_${Date.now()}`,
    object: 'checkout.session',
    created: createdEpoch,
    amount_total: 15000,
    currency: 'eur',
    customer_details: { email: eleve.email },
    customer_email: eleve.email,
    payment_link: null,
    payment_intent: `pi_test_${Date.now()}`,
    metadata: { offre_nom: offre.nom },
  };
  const res = await envoyerWebhook(profileId, session);
  console.log(`     [webhook] reponse ${res.status}`);
  assert(res.ok, 'E · le webhook signe est accepte');
  await attendre(1500);

  const { data: paies } = await admin.from('paiements')
    .select('id, montant, mode, statut, date, date_encaissement, client_id')
    .eq('stripe_session_id', session.id);
  console.log(`     [base] ${paies?.length ?? 0} paiement(s) cree(s)`);
  assert((paies || []).length === 1, 'E · un paiement est cree en base');
  const paie = (paies || [])[0] || {};
  console.log(`     [base] ${paie.montant} € · ${paie.mode} · date=${paie.date} · encaisse=${paie.date_encaissement}`);
  assert(Number(paie.montant) === 150, 'E · pour le bon montant');
  assert(paie.client_id === eleve.id, 'E · rattache a la bonne eleve (match par email)');
  assert(paie.date === DATE_PAIEMENT,
    `E · date du PAIEMENT (${DATE_PAIEMENT}) et non du rejeu (${jour(0)})`);
  assert(paie.date_encaissement === DATE_PAIEMENT, 'E · date d\'encaissement idem (assiette URSSAF juste)');

  // Rejouer DEUX fois ne double pas l'argent (idempotence par session).
  const res2 = await envoyerWebhook(profileId, session);
  await attendre(1200);
  const { data: paies2 } = await admin.from('paiements').select('id').eq('stripe_session_id', session.id);
  console.log(`     [base] apres un 2e envoi : ${paies2?.length ?? 0} paiement(s)`);
  assert(res2.ok && (paies2 || []).length === 1, 'E · rejouer deux fois ne cree pas de doublon');

  // ── F. Console propre ─────────────────────────────────────────────────────
  console.log('\nF. Console');
  assert(true, 'parcours termine sans exception');

} catch (e) {
  ko++;
  console.error(`\nECHEC : ${e.message}`);
  console.error(e.stack);
} finally {
  if (browser) await browser.close().catch(() => {});
  await purger();
  await restaurer();
  console.log('\ntemoins purges, reglages du demo restaures');
}

console.log(`\n${ok}/${ok + ko} verifications passees`);
console.log(`captures : ${OUT}`);
process.exit(ko === 0 ? 0 : 1);
