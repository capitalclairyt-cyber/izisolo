/**
 * Preuve CHEMIN RÉEL — paiement Stripe par séance (v2 de v86, 2026-08-19).
 *
 * Le scénario complet, en vrai navigateur + webhook SIGNÉ (le SDK Stripe du
 * repo génère la signature de test — même code de vérification qu'en prod,
 * aucun compte Stripe requis) :
 *
 *   1. Setup : cours témoin DEMAIN (tarif 20 €, Payment Link, EN LIGNE avec
 *      lien visio VERROUILLÉ — pour prouver le déverrouillage v86 au passage),
 *      webhook secret de test posé sur le prof démo.
 *   2. Élève anonyme réserve sur le portail → écran de confirmation avec
 *      « 💳 Régler ma place par CB » dont l'URL porte client_reference_id.
 *   3. AVANT paiement, son espace montre : séance « à régler » avec bouton CB,
 *      et PAS de lien visio (verrouillé, non réglé).
 *   4. Webhook checkout.session.completed signé → paiement paid rattaché
 *      (presence_id), commission 1 %, cas workshop résolu si créé.
 *   5. REJEU du même webhook → idempotent (aucun 2e paiement).
 *   6. Nouvelle session, même présence (double clic) → 2e paiement SANS
 *      presence_id, note « double paiement » (l'argent réel n'est pas caché).
 *   7. APRÈS paiement, l'espace montre : « à régler » vidé, « 🎥 Rejoindre la
 *      séance » visible → payer a déverrouillé le cours en ligne.
 *   8. Ménage complet + restauration du profil démo.
 *
 * Usage : node scripts/proof-paiement-seance.mjs [dossier-captures]
 */
import { createClient } from '@supabase/supabase-js';
import Stripe from 'stripe';
import { readFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = process.cwd();
const OUT = process.argv[2] || join(process.env.TEMP || '.', 'proof-paiement-seance');
mkdirSync(OUT, { recursive: true });
const BASE = 'http://localhost:3333';
const PROF_EMAIL = 'bonjour@melutek.com';
const ELEVE_EMAIL = 'preuve-paiement-seance@melutek.com';
const WEBHOOK_SECRET_TEST = 'whsec_preuve_paiement_seance_v86v2';

const env = Object.fromEntries(
  readFileSync(join(ROOT, '.env.local'), 'utf8')
    .split('\n').filter(l => l.includes('=') && !l.startsWith('#'))
    .map(l => [l.slice(0, l.indexOf('=')).trim(), l.slice(l.indexOf('=') + 1).trim()])
);
const PROJECT_REF = new URL(env.NEXT_PUBLIC_SUPABASE_URL).hostname.split('.')[0];
const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
const stripe = new Stripe('sk_dummy_for_signature_only', { apiVersion: '2025-09-30.clover' });

let ok = 0, ko = 0;
const assert = (cond, label) => {
  if (cond) { ok++; console.log(`  ✅ ${label}`); }
  else { ko++; console.log(`  ❌ ${label}`); }
};
const attendre = ms => new Promise(r => setTimeout(r, ms));

async function pollDb(label, fn, { tries = 12, delay = 1500 } = {}) {
  for (let i = 0; i < tries; i++) {
    const res = await fn();
    if (res) return res;
    await attendre(delay);
  }
  console.log(`  ⏱ poll épuisé : ${label}`);
  return null;
}

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

// Envoie un webhook checkout.session.completed SIGNÉ (chemin de vérification
// réel : verifyStripeSignature avec le secret posé sur le profil).
async function envoyerWebhook(profileId, session) {
  const payload = JSON.stringify({
    id: `evt_${session.id}`,
    type: 'checkout.session.completed',
    data: { object: session },
  });
  const signature = stripe.webhooks.generateTestHeaderString({ payload, secret: WEBHOOK_SECRET_TEST });
  const res = await fetch(`${BASE}/api/stripe/webhook?profile=${profileId}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'stripe-signature': signature },
    body: payload,
  });
  return res;
}

// ── Dev server prêt ──────────────────────────────────────────────────────────
for (let i = 0; i < 60; i++) {
  try { const r = await fetch(`${BASE}/login`); if (r.ok) break; } catch { /* pas prêt */ }
  await attendre(2000);
  if (i === 59) { console.error('dev server injoignable'); process.exit(1); }
}
console.log('🌐 dev server prêt');

// ── Setup ────────────────────────────────────────────────────────────────────
const { data: { users } } = await admin.auth.admin.listUsers({ perPage: 200 });
const profUser = users.find(u => u.email === PROF_EMAIL);
if (!profUser) { console.error('prof démo introuvable'); process.exit(1); }
const profileId = profUser.id;
const { data: profil } = await admin.from('profiles')
  .select('studio_slug, plan, stripe_subscription_status, stripe_webhook_secret')
  .eq('id', profileId).single();
const slug = profil.studio_slug;
console.log(`👤 prof démo : slug ${slug}, plan ${profil.plan}`);

// Ménage préalable (re-runnable) + sauvegarde de l'état à restaurer
const etatInitial = {
  plan: profil.plan,
  stripe_subscription_status: profil.stripe_subscription_status,
  stripe_webhook_secret: profil.stripe_webhook_secret,
};
const purge = async () => {
  const { data: anciens } = await admin.from('cours').select('id')
    .eq('profile_id', profileId).ilike('nom', '[preuve paiement]%');
  for (const c of (anciens || [])) {
    const { data: prs } = await admin.from('presences').select('id').eq('cours_id', c.id);
    const prIds = (prs || []).map(p => p.id);
    if (prIds.length) {
      await admin.from('paiements').delete().in('presence_id', prIds);
      await admin.from('cas_a_traiter').delete().in('presence_id', prIds);
      await admin.from('presences').delete().in('id', prIds);
    }
    await admin.from('cours').delete().eq('id', c.id);
  }
  await admin.from('paiements').delete().eq('profile_id', profileId).ilike('stripe_session_id', 'cs_preuve_%');
  await admin.from('clients').delete().eq('profile_id', profileId).eq('email', ELEVE_EMAIL);
};
await purge();
console.log('🧹 témoins d\'un éventuel run précédent purgés');

// Plan Complet + webhook secret de test (restaurés à la fin)
await admin.from('profiles').update({
  plan: 'pro',
  stripe_subscription_status: 'active',
  stripe_webhook_secret: WEBHOOK_SECRET_TEST,
}).eq('id', profileId);

// Cours témoin : DEMAIN, tarif 20 €, Payment Link, EN LIGNE verrouillé (v86)
const demain = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
const { data: cours, error: eCours } = await admin.from('cours').insert({
  profile_id: profileId,
  nom: '[preuve paiement] Atelier en ligne',
  date: demain,
  heure: '18:00',
  duree_minutes: 60,
  capacite_max: 5,
  visibilite: 'public',
  tarif_unitaire: 20,
  stripe_payment_link_unit: 'https://buy.stripe.com/test_preuve_v86v2',
  format: 'visio',
  lien_visio: 'https://zoom.us/j/preuve-visio-123',
  lien_visio_verrouille: true,
}).select('id').single();
if (eCours) { console.error('insert cours:', eCours.message); process.exit(1); }
console.log(`📅 cours témoin créé (${demain} 18h, 20 €, visio verrouillée)`);

let chromium;
try { ({ chromium } = await import('playwright')); }
catch { ({ chromium } = await import('@playwright/test')); }
let browser;
try { browser = await chromium.launch(); }
catch { browser = await chromium.launch({ channel: 'msedge' }); }

// ═══ 1. Résa anonyme sur le portail → CTA de paiement tagué ═══
console.log('\n— 1. Résa portail → « Régler ma place par CB » tagué de la présence —');
const ctxAnon = await browser.newContext({ viewport: { width: 480, height: 900 } });
const pa = await ctxAnon.newPage();
await pa.goto(`${BASE}/p/${slug}/cours/${cours.id}`, { waitUntil: 'domcontentloaded', timeout: 90000 });
await pa.waitForSelector('form', { timeout: 60000 });
await pa.waitForTimeout(1500); // hydratation
await pa.locator('input').first().click(); // clic-sonde
const inputs = pa.locator('form input:visible');
await inputs.nth(0).fill('Preuve Paiement');
await inputs.nth(1).fill(ELEVE_EMAIL);
await pa.locator('form button[type="submit"]').click();
await pa.waitForSelector('text=Régler ma place par CB', { timeout: 30000 });
const ctaHref = await pa.locator('a:has-text("Régler ma place par CB")').getAttribute('href');
assert(!!ctaHref && ctaHref.startsWith('https://buy.stripe.com/test_preuve_v86v2?client_reference_id='), 'CTA de paiement présent, URL du Payment Link taguée');
const presenceId = new URL(ctaHref).searchParams.get('client_reference_id');
assert(!!presenceId, `client_reference_id = présence ${presenceId?.slice(0, 8)}…`);
assert(ctaHref.includes('prefilled_email='), 'email pré-rempli dans l\'URL');
await pa.screenshot({ path: join(OUT, '1-confirmation-cta-cb.png') });
const { data: presRow } = await admin.from('presences').select('id, client_id').eq('id', presenceId).maybeSingle();
assert(!!presRow, 'la présence existe en DB (place réservée AVANT tout paiement — P0)');
await ctxAnon.close();

// ═══ 2. Espace élève AVANT paiement : à régler + CB, visio cachée ═══
console.log('\n— 2. Espace élève AVANT : à régler + bouton CB, visio verrouillée —');
const eleveSession = await sessionCookies(ELEVE_EMAIL);
const ctxEleve = await browser.newContext({ viewport: { width: 480, height: 950 } });
await ctxEleve.addCookies(eleveSession.cookies.map(c => ({ ...c, url: BASE, sameSite: 'Lax' })));
const pe = await ctxEleve.newPage();
await pe.goto(`${BASE}/p/${slug}/espace`, { waitUntil: 'domcontentloaded', timeout: 90000 });
await pe.waitForSelector('text=[preuve paiement]', { timeout: 60000 });
let body = (await pe.locator('body').textContent()) || '';
assert(await pe.locator('a:has-text("Payer par CB")').count() >= 1, 'bouton « 💳 Payer par CB » sur la séance à régler');
assert(!body.includes('Rejoindre la séance'), 'lien visio INVISIBLE avant paiement (verrouillé)');
await pe.screenshot({ path: join(OUT, '2-espace-avant-paiement.png'), fullPage: true });

// ═══ 3. Webhook signé → paiement rattaché ═══
console.log('\n— 3. Webhook checkout.session.completed signé —');
const sessionStripe = {
  id: 'cs_preuve_v86v2_001',
  client_reference_id: presenceId,
  amount_total: 2000,
  payment_intent: 'pi_preuve_v86v2_001',
  customer_details: { email: ELEVE_EMAIL },
  payment_link: 'plink_preuve',
};
const r1 = await envoyerWebhook(profileId, sessionStripe);
assert(r1.status === 200, `webhook accepté (signature vérifiée) — HTTP ${r1.status}`);
const paiement = await pollDb('paiement séance', async () => {
  const { data } = await admin.from('paiements').select('id, presence_id, montant, statut, mode, commission_montant, notes')
    .eq('stripe_session_id', sessionStripe.id).maybeSingle();
  return data;
});
assert(!!paiement, 'paiement créé par le webhook');
assert(paiement?.presence_id === presenceId, 'rattaché à LA présence (presence_id v65)');
assert(paiement?.statut === 'paid' && paiement?.mode === 'CB' && Number(paiement?.montant) === 20, 'paid · CB · 20 €');
assert(Number(paiement?.commission_montant) === 0.2, 'commission IziSolo 1 % (0,20 €)');
const { data: casApres } = await admin.from('cas_a_traiter').select('id, resolu_at, resolu_action')
  .eq('presence_id', presenceId).eq('case_type', 'workshop_vs_cours').maybeSingle();
if (casApres) assert(!!casApres.resolu_at && casApres.resolu_action === 'encaisse', 'cas « workshop à régler » auto-résolu (encaisse)');
else console.log('  ℹ️ pas de cas workshop créé (règle de la prof) — rien à résoudre');

// ═══ 4. Rejeu + double paiement ═══
console.log('\n— 4. Idempotence + double paiement honnête —');
const r2 = await envoyerWebhook(profileId, sessionStripe);
assert(r2.status === 200, 'rejeu du MÊME webhook accepté…');
const { count: nb1 } = await admin.from('paiements').select('id', { count: 'exact', head: true }).eq('stripe_session_id', sessionStripe.id);
assert(nb1 === 1, '…sans créer de 2e paiement (idempotence stripe_session_id)');

const session2 = { ...sessionStripe, id: 'cs_preuve_v86v2_002', payment_intent: 'pi_preuve_v86v2_002' };
const r3 = await envoyerWebhook(profileId, session2);
assert(r3.status === 200, 'double clic (2e session Stripe, même présence) accepté…');
const paiement2 = await pollDb('paiement double', async () => {
  const { data } = await admin.from('paiements').select('id, presence_id, notes').eq('stripe_session_id', session2.id).maybeSingle();
  return data;
});
assert(!!paiement2 && paiement2.presence_id === null, '…enregistré SANS presence_id (la séance reste couverte une seule fois)');
assert((paiement2?.notes || '').includes('DOUBLE'), 'note explicite « possible DOUBLE paiement » pour rembourser');

// ═══ 5. Espace élève APRÈS : réglée + visio déverrouillée ═══
console.log('\n— 5. Espace élève APRÈS : à régler vidé, visio déverrouillée (v86) —');
const pe2 = await ctxEleve.newPage();
await pe2.goto(`${BASE}/p/${slug}/espace`, { waitUntil: 'domcontentloaded', timeout: 90000 });
await pe2.waitForSelector('text=[preuve paiement]', { timeout: 60000 });
body = (await pe2.locator('body').textContent()) || '';
assert(await pe2.locator('a:has-text("Payer par CB")').count() === 0, 'plus de bouton « Payer par CB » (séance réglée)');
assert(body.includes('Rejoindre la séance'), '« 🎥 Rejoindre la séance » visible : payer a DÉVERROUILLÉ le cours en ligne');
await pe2.screenshot({ path: join(OUT, '3-espace-apres-paiement-visio.png'), fullPage: true });
await ctxEleve.close();
await browser.close();

// ═══ 6. Ménage + restauration ═══
console.log('\n— 6. Ménage + restauration du profil démo —');
await purge();
// L'auth user témoin (créé par la résa anonyme) : supprimé aussi.
const { data: { users: users2 } } = await admin.auth.admin.listUsers({ perPage: 200 });
const eleveUser = users2.find(u => u.email === ELEVE_EMAIL);
if (eleveUser) await admin.auth.admin.deleteUser(eleveUser.id);
const { error: eRestore } = await admin.from('profiles').update(etatInitial).eq('id', profileId);
assert(!eRestore, 'profil démo restauré (plan, statut abo, webhook secret)');

console.log(`\n${ko === 0 ? '✅' : '❌'} ${ok} assertions vertes, ${ko} rouges — captures dans ${OUT}`);
process.exit(ko === 0 ? 0 : 1);
