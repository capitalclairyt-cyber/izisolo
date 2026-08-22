/**
 * Preuve — abonnement à DURÉE GLISSANTE (retour Colin 2026-08-22 : « nous
 * n'arrivons pas à enregistrer un abonnement mensuel, car si on met comme date
 * que le mois de septembre on ne va pas refaire ça douze fois »).
 *
 * Le type « Abonnement » exigeait des dates de début et de fin PORTÉES PAR
 * L'OFFRE : un abonnement mensuel obligeait à recréer l'offre douze fois par
 * an, et la vendre le mois suivant aurait créé un abo déjà expiré. Le reste de
 * l'app savait déjà gérer le glissant (vente, portail, fiche élève) : seul le
 * formulaire de création l'interdisait.
 *
 * Déroulé (vrai navigateur sur dev local :3333 + DB réelle, compte démo) :
 *   1. /offres/nouveau → « Abonnement » : le choix de période existe, « Dates
 *      fixes » est actif par défaut (aucun déplacement pour les saisons).
 *   2. « À partir de la vente » : les champs de dates disparaissent, la durée
 *      apparaît, la pastille annonce la vraie date de fin, et le pro-rata
 *      disparaît (il n'a aucun sens sans période commune).
 *   3. Création → EN BASE : date_debut NULL, date_fin NULL, duree_jours 30,
 *      pro_rata_actif false.
 *   4. Vente à une élève par le tunnel réel → EN BASE : l'abonnement démarre
 *      AUJOURD'HUI et finit à aujourd'hui + 30 jours. C'est le geste qui était
 *      impossible.
 *   5. Réouverture en édition : le mode glissant est retrouvé, et sauvegarder
 *      sans rien changer ne le retransforme PAS en saison (la régression
 *      silencieuse la plus probable).
 *   6. Non-régression : une offre à dates fixes reste à dates fixes, garde son
 *      pro-rata, et sa vente hérite bien des dates de l'offre.
 *   7. Ménage : témoins purgés, même en cas d'échec.
 *
 * Usage : node scripts/proof-abonnement-glissant.mjs [dossier-captures]
 * Prérequis : dev server sur :3333 (npm run dev).
 */
import { createClient } from '@supabase/supabase-js';
import { readFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { finGlissanteISO } from '../lib/offres-periode.js';
import { aujourdhuiISO } from '../lib/prorata.js';

const ROOT = process.cwd();
const OUT = process.argv[2] || join(process.env.TEMP || '.', 'proof-abo-glissant');
mkdirSync(OUT, { recursive: true });
const BASE = 'http://localhost:3333';
const PROF_EMAIL = 'bonjour@melutek.com';
const MARQUEUR = '[preuve glissant]';

const env = Object.fromEntries(
  readFileSync(join(ROOT, '.env.local'), 'utf8')
    .split('\n').filter(l => l.includes('=') && !l.startsWith('#'))
    .map(l => [l.slice(0, l.indexOf('=')).trim(), l.slice(l.indexOf('=') + 1).trim()])
);
const PROJECT_REF = new URL(env.NEXT_PUBLIC_SUPABASE_URL).hostname.split('.')[0];
const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

let ok = 0, ko = 0;
const assert = (cond, label) => {
  if (cond) { ok++; console.log(`  OK  ${label}`); }
  else { ko++; console.log(`  KO  ${label}`); }
};
const attendre = ms => new Promise(r => setTimeout(r, ms));

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

for (let i = 0; i < 60; i++) {
  try { const r = await fetch(`${BASE}/login`); if (r.ok) break; } catch { /* pas prêt */ }
  await attendre(2000);
  if (i === 59) { console.error('dev server injoignable sur :3333'); process.exit(1); }
}
console.log('dev server pret');

const { cookies, userId: profileId } = await sessionCookies(PROF_EMAIL);

const purger = async () => {
  const { data: cl } = await admin.from('clients').select('id').eq('profile_id', profileId).ilike('nom', `${MARQUEUR}%`);
  const clIds = (cl || []).map(c => c.id);
  if (clIds.length) {
    await admin.from('paiements').delete().in('client_id', clIds);
    await admin.from('abonnements').delete().in('client_id', clIds);
    await admin.from('clients').delete().in('id', clIds);
  }
  const { data: of } = await admin.from('offres').select('id').eq('profile_id', profileId).ilike('nom', `${MARQUEUR}%`);
  const ofIds = (of || []).map(o => o.id);
  if (ofIds.length) {
    await admin.from('abonnements').delete().in('offre_id', ofIds);
    await admin.from('offres').delete().in('id', ofIds);
  }
};

let browser;
try {
  await purger();

  const { data: cliente, error: eCl } = await admin.from('clients').insert({
    profile_id: profileId, prenom: 'Zoe', nom: `${MARQUEUR} Temoin`,
    email: `preuve-glissant-${Date.now()}@example.com`, statut: 'actif', type_client: 'particulier',
  }).select('id, prenom, nom').single();
  if (eCl) throw new Error(`client temoin: ${eCl.message}`);

  let chromium;
  try { ({ chromium } = await import('playwright')); }
  catch { ({ chromium } = await import('@playwright/test')); }
  try { browser = await chromium.launch(); }
  catch { browser = await chromium.launch({ channel: 'msedge' }); }

  const ctx = await browser.newContext({ viewport: { width: 900, height: 1000 } });
  await ctx.addCookies(cookies.map(c => ({ ...c, domain: 'localhost', path: '/' })));
  const page = await ctx.newPage();

  const BRUIT_CONNU = [/unique "key" prop.*OuterLayoutRouter/s];
  const erreursConsole = [];
  const noter = t => { if (!BRUIT_CONNU.some(r => r.test(t))) erreursConsole.push(t); };
  page.on('console', m => { if (m.type() === 'error') noter(m.text()); });
  page.on('pageerror', e => noter(`pageerror: ${e.message}`));

  // ── 1. Le choix de période existe, et ne déplace personne ─────────────────
  console.log('\n1. Le choix de periode existe, defaut inchange');
  await page.goto(`${BASE}/offres/nouveau`, { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: /Abonnement/ }).first().click();
  await page.waitForSelector('text=Quelle période couvre cet abonnement ?', { timeout: 90000 });
  assert(true, 'le selecteur de periode est present sur le formulaire abonnement');
  const btnFixe = page.getByRole('button', { name: 'Dates fixes' });
  const btnGliss = page.getByRole('button', { name: 'À partir de la vente' });
  assert((await btnFixe.getAttribute('class') || '').includes('active'), '« Dates fixes » actif par defaut (comportement historique preserve)');
  assert(await page.locator('input[type="date"]').count() >= 2, 'les deux champs de dates sont la en mode fixe');
  assert(await page.locator('text=Pro-rata à la souscription').count() === 1, 'le pro-rata est propose en periode fixe');

  // ── 2. Le mode glissant change l'écran ────────────────────────────────────
  console.log('\n2. Le mode glissant remplace les dates par une duree');
  await btnGliss.click();
  await attendre(600);
  assert((await btnGliss.getAttribute('class') || '').includes('active'), '« À partir de la vente » devient actif');
  assert(await page.locator('input[type="date"]').count() === 0, 'plus aucun champ de date a remplir');
  assert(await page.locator('text=Pro-rata à la souscription').count() === 0, 'le pro-rata disparait (pas de periode commune a proratiser)');
  const finAttendue = finGlissanteISO(30);
  const [yy, mm, dd] = finAttendue.split('-');
  const finFr = `${dd}/${mm}/${yy}`;
  const pastille = await page.locator('.no-info-pill').first().innerText();
  assert(pastille.includes(finFr), `la pastille annonce la vraie date de fin (${finFr})`);
  await attendre(600);
  await page.screenshot({ path: join(OUT, '1-creation-glissante.png'), fullPage: true });

  // ── 3. La création écrit une offre SANS dates ─────────────────────────────
  console.log('\n3. L\'offre creee n\'a aucune date, juste une duree');
  await page.getByPlaceholder('Ex : Carte 10 séances').or(page.locator('input[type="text"]').first()).fill(`${MARQUEUR} Abonnement mensuel`);
  await page.locator('input[type="number"][step="0.01"]').first().fill('60');
  await page.getByRole('button', { name: /Créer l'offre|Créer/ }).last().click();
  await page.waitForURL(/\/offres/, { timeout: 20000 });
  await attendre(1500);

  const { data: offreGliss } = await admin.from('offres').select('*')
    .eq('profile_id', profileId).eq('nom', `${MARQUEUR} Abonnement mensuel`).maybeSingle();
  assert(!!offreGliss, 'offre creee en base');
  assert(offreGliss?.date_debut === null && offreGliss?.date_fin === null, 'date_debut ET date_fin NULL (c\'est ce qui la rend glissante)');
  assert(offreGliss?.duree_jours === 30, `duree_jours = 30 (lu : ${offreGliss?.duree_jours})`);
  assert(offreGliss?.pro_rata_actif === false, 'pro_rata_actif false (jamais un reglage inerte)');

  // ── 4. La vente pose les bornes du jour ───────────────────────────────────
  console.log('\n4. La vente pose aujourd\'hui + 30 jours');
  const banniere = page.locator('.offre-creee-banner');
  if (await banniere.count() === 0) {
    await page.goto(`${BASE}/offres?creee=${offreGliss.id}`, { waitUntil: 'networkidle' });
  }
  await page.getByRole('button', { name: /Vendre cette offre/ }).first().click();
  await page.getByPlaceholder('Rechercher un élève...').fill('Zoe');
  await attendre(1200);
  await page.getByText(`Zoe ${MARQUEUR} Temoin`).first().click();
  await attendre(1200);
  await page.locator('.mode-btn').first().click();
  await attendre(400);
  await page.getByRole('button', { name: /Valider le paiement|Enregistrer/ }).last().click();
  await attendre(3500);

  const { data: abo } = await admin.from('abonnements').select('date_debut, date_fin, offre_nom')
    .eq('client_id', cliente.id).eq('offre_id', offreGliss.id).maybeSingle();
  const auj = aujourdhuiISO();
  assert(!!abo, 'abonnement cree pour l\'eleve');
  assert(abo?.date_debut === auj, `demarre aujourd'hui (${auj}, lu : ${abo?.date_debut})`);
  assert(abo?.date_fin === finGlissanteISO(30, auj), `finit dans 30 jours (${finGlissanteISO(30, auj)}, lu : ${abo?.date_fin})`);

  // ── 5. L'édition ne retransforme pas l'offre en saison ────────────────────
  console.log('\n5. Rouvrir et sauvegarder ne casse pas le mode glissant');
  await page.goto(`${BASE}/offres/${offreGliss.id}/edit`, { waitUntil: 'networkidle' });
  await page.waitForSelector('text=Quelle période couvre cet abonnement ?', { timeout: 90000 });
  const editGliss = page.getByRole('button', { name: 'À partir de la vente' });
  assert((await editGliss.getAttribute('class') || '').includes('active'), 'le mode glissant est retrouve a l\'ouverture');
  assert(await page.locator('input[type="date"]').count() === 0, 'aucun champ de date impose en edition');
  await attendre(600);
  await page.screenshot({ path: join(OUT, '2-edition-glissante.png'), fullPage: true });
  await page.getByRole('button', { name: /Enregistrer|Sauvegarder/ }).last().click();
  await attendre(2500);
  const { data: apresEdit } = await admin.from('offres').select('date_debut, date_fin, duree_jours').eq('id', offreGliss.id).single();
  assert(apresEdit?.date_debut === null && apresEdit?.date_fin === null, 'toujours sans dates apres sauvegarde (pas de regression silencieuse)');
  assert(apresEdit?.duree_jours === 30, 'duree conservee');

  // ── 6. Non-régression : la saison reste une saison ────────────────────────
  console.log('\n6. Non-regression : une offre a dates fixes est intacte');
  const { data: offreFixe, error: eFixe } = await admin.from('offres').insert({
    profile_id: profileId, nom: `${MARQUEUR} Saison`, type: 'abonnement',
    prix: 400, date_debut: '2026-09-01', date_fin: '2027-06-30', duree_jours: 302,
    pro_rata_actif: true, pro_rata_date_limite: '2026-10-31', actif: true,
  }).select('id').single();
  if (eFixe) throw new Error(`offre fixe: ${eFixe.message}`);

  await page.goto(`${BASE}/offres/${offreFixe.id}/edit`, { waitUntil: 'networkidle' });
  await page.waitForSelector('text=Quelle période couvre cet abonnement ?', { timeout: 90000 });
  assert((await page.getByRole('button', { name: 'Dates fixes' }).getAttribute('class') || '').includes('active'), 'le mode fixe est retrouve');
  assert(await page.locator('input[type="date"]').count() >= 2, 'les dates sont bien affichees');
  assert(await page.locator('text=Pro-rata en cours de période').count() === 1, 'le pro-rata reste propose');
  await page.getByRole('button', { name: /Enregistrer|Sauvegarder/ }).last().click();
  await attendre(2500);
  const { data: fixeApres } = await admin.from('offres').select('date_debut, date_fin, pro_rata_actif, pro_rata_date_limite').eq('id', offreFixe.id).single();
  assert(fixeApres?.date_debut === '2026-09-01' && fixeApres?.date_fin === '2027-06-30', 'dates de saison conservees');
  assert(fixeApres?.pro_rata_actif === true && fixeApres?.pro_rata_date_limite === '2026-10-31', 'pro-rata conserve');

  // ── 7. Console propre ─────────────────────────────────────────────────────
  console.log('\n7. Console propre sur tout le parcours');
  if (erreursConsole.length) erreursConsole.forEach(e => console.log(`     > ${e.slice(0, 200)}`));
  assert(erreursConsole.length === 0, `aucune erreur console (${erreursConsole.length} relevee(s))`);

} catch (e) {
  ko++;
  console.error(`\nECHEC : ${e.message}`);
  console.error(e.stack);
} finally {
  if (browser) await browser.close().catch(() => {});
  await purger();
  console.log('\ntemoins purges');
}

console.log(`\n${ok}/${ok + ko} verifications passees`);
console.log(`captures : ${OUT}`);
process.exit(ko === 0 ? 0 : 1);
