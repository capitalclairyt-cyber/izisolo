/**
 * Preuve — « On crée ton studio » (v96, 2026-08-23, feedback Colin) :
 *
 *   « On fait un formulaire sur notre site "on crée ton studio" sous 48 h avec
 *   nom, mail, infos, csv, offres etc puis on envoie, Maude ou moi, par mail
 *   directement depuis l'admin le studio une fois créé. Il faut que ce soit
 *   bien visible sur la landing. »
 *   Puis : « il faut envoyer un mail automatique dans lequel on demande le csv
 *   ou la liste manuscrite des élèves (sans obligations). »
 *
 * Le moteur (création concierge + lien d'appropriation) existait depuis le
 * 21/08 côté équipe. Ce qui manquait : la porte d'entrée publique, un endroit
 * où les demandes atterrissent, et l'email qui réclame de quoi tout paramétrer.
 *
 * Déroulé (vrai navigateur sur :3333, visiteuse ANONYME, chemin réel) :
 *   A. La landing : la mention sous le CTA du hero et la section dédiée, qui
 *      mènent bien à /creer-mon-studio.
 *   B. La page publique s'ouvre SANS session (piège maison : le proxy est
 *      default-deny, une nouvelle surface publique oubliée redirige vers
 *      /login en silence).
 *   C. Le formulaire ne demande AUCUNE liste d'élèves, et le dit.
 *   D. Le honeypot refuse un robot ; un email difforme est refusé avec sa
 *      raison ; une vraie demande passe et l'écran de confirmation explique
 *      la suite.
 *   E. Selon que v96 est appliquée : la demande est EN BASE avec ses champs
 *      (et /admin/demandes l'affiche), ou l'écran le dit honnêtement.
 *
 * ⚠️ CE SCRIPT ENVOIE UN EMAIL RÉEL à bonjour@izisolo.fr (l'alerte interne).
 *    L'email de la prospecte, lui, part sur une adresse @example.com : le
 *    garde-fou RFC 2606 de lib/email l'ignore, aucun tiers n'est dérangé.
 *
 * Usage : node scripts/proof-demande-studio.mjs [dossier-captures]
 * Prérequis : dev server sur :3333 (npm run dev). Témoins purgés à la fin.
 */
import { createClient } from '@supabase/supabase-js';
import { readFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = process.cwd();
const OUT = process.argv[2] || join(process.env.TEMP || '.', 'proof-demande-studio');
mkdirSync(OUT, { recursive: true });
const BASE = 'http://localhost:3333';
const ADMIN_EMAIL = 'admin@melutek.fr';       // allowlist lib/admin.js
const MARQUEUR = 'Preuve Guichet';

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
  const nom = `sb-${PROJECT_REF}-auth-token`;
  const cookies = [];
  if (value.length <= 3180) cookies.push({ name: nom, value });
  else for (let i = 0; i * 3180 < value.length; i++) cookies.push({ name: `${nom}.${i}`, value: value.slice(i * 3180, (i + 1) * 3180) });
  return cookies;
}

for (let i = 0; i < 90; i++) {
  try { const r = await fetch(`${BASE}/login`); if (r.ok) break; } catch { /* pas prêt */ }
  await attendre(2000);
  if (i === 89) { console.error('dev server injoignable sur :3333'); process.exit(1); }
}
console.log('dev server pret');

const { error: sonde } = await admin.from('demandes_studio').select('id').limit(1);
const V96 = !sonde;
console.log(`migration v96 : ${V96 ? 'APPLIQUEE (phase E complete)' : 'absente (phase E degradee)'}`);

const purger = async () => {
  if (!V96) return;
  await admin.from('demandes_studio').delete().ilike('prenom', `${MARQUEUR}%`);
};

let browser, adminCree = false;
try {
  await purger();

  let chromium;
  try { ({ chromium } = await import('playwright')); }
  catch { ({ chromium } = await import('@playwright/test')); }
  try { browser = await chromium.launch(); }
  catch { browser = await chromium.launch({ channel: 'msedge' }); }

  // Visiteuse ANONYME : aucun cookie. C'est la seule façon de prouver que la
  // page passe le proxy default-deny.
  //
  // IP de documentation (RFC 5737) DIFFÉRENTE à chaque run : le rate limit
  // anti-bot du guichet est de 5 requêtes par heure et par IP, et il n'est pas
  // le sujet ici. Sans ça, deux répétitions du script dans la même heure
  // finissent en 429 sur la vraie soumission (constaté).
  const ipRun = `203.0.113.${(Math.floor(Date.now() / 1000) % 250) + 1}`;
  const ctx = await browser.newContext({
    viewport: { width: 1100, height: 1200 },
    extraHTTPHeaders: { 'x-forwarded-for': ipRun },
  });
  const page = await ctx.newPage();
  const BRUIT_CONNU = [/unique "key" prop.*OuterLayoutRouter/s, /status of 40[03]/];
  const erreursConsole = [];
  const noter = t => { if (!BRUIT_CONNU.some(r => r.test(t))) erreursConsole.push(t); };
  page.on('console', m => { if (m.type() === 'error') noter(m.text()); });
  page.on('pageerror', e => noter(`pageerror: ${e.message}`));

  // ══ A. La landing en parle, à deux endroits ═══════════════════════════════
  console.log('\nA. La landing');
  await page.goto(`${BASE}/`, { waitUntil: 'networkidle' });
  await attendre(800);
  const mention = page.locator('.hero-concierge a');
  assert(await mention.count() === 1, 'une mention sous le CTA du hero, pas un second bouton de meme poids');
  assert((await mention.getAttribute('href')) === '/creer-mon-studio', 'elle mene au guichet');
  const section = page.locator('#concierge');
  await section.scrollIntoViewIfNeeded();
  await attendre(500);
  const texteSection = await section.innerText();
  assert(/48 h/.test(texteSection), 'la section annonce le delai');
  assert(/gratuit/i.test(texteSection), 'elle dit que c\'est gratuit');
  assert(/Maude/.test(texteSection), 'elle donne un visage (Maude, pas « notre equipe »)');
  await page.screenshot({ path: join(OUT, 'A-landing-section.png'), fullPage: false });

  // ══ B. La page publique s'ouvre sans session ══════════════════════════════
  console.log('\nB. La page publique, sans session');
  await page.goto(`${BASE}/creer-mon-studio`, { waitUntil: 'networkidle' });
  assert(page.url().includes('/creer-mon-studio'), `pas de redirection vers /login (url : ${page.url()})`);
  assert(await page.locator('.cms-form').count() === 1, 'le formulaire est la');

  // ══ C. Ce qu'on ne demande pas ════════════════════════════════════════════
  console.log('\nC. Ce que le formulaire NE demande PAS');
  const texteForm = await page.locator('.cms-form').innerText();
  assert(await page.locator('input[type="file"]').count() === 0,
    'aucun depot de fichier : pas de CSV d\'eleves sur une page publique');
  assert(/liste de personnes n'a pas sa place sur un formulaire public/i.test(texteForm),
    'la page EXPLIQUE pourquoi, l\'absence ne passe pas pour un oubli');
  assert(/en repondant a l'email|répondant à l’email|répondant à l'email/i.test(texteForm),
    'et elle dit par ou la liste arrivera');

  // ══ D. Les refus, puis la vraie demande ═══════════════════════════════════
  console.log('\nD. Refus et envoi');
  const poster = (corps) => page.evaluate(async (c) => {
    const r = await fetch('/api/demande-studio', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(c),
    });
    return { status: r.status, json: await r.json().catch(() => ({})) };
  }, corps);

  const robot = await poster({ prenom: 'Bot', email: 'bot@example.com', verif_hp: 'rempli' });
  assert(robot.status === 400, `honeypot rempli = refuse (${robot.status})`);

  const mauvaisEmail = await poster({ prenom: `${MARQUEUR} X`, email: 'pas-un-email' });
  assert(mauvaisEmail.status === 400 && /email/i.test(mauvaisEmail.json.error || ''),
    `email difforme refuse avec sa raison (« ${mauvaisEmail.json.error || ''} »)`);

  const emailTemoin = `preuve-guichet-${Date.now()}@example.com`;
  await page.locator('.cms-champ input').first().fill(`${MARQUEUR} Lea`);
  await page.locator('input[type="email"]').fill(emailTemoin);
  // Par placeholder, jamais par position : compter les inputs a rempli le
  // champ Téléphone au premier run (le select Activité décale les index).
  await page.getByPlaceholder("Ex : L'Atelier Soleil").fill(`${MARQUEUR} Studio`);
  await page.locator('.cms-champ textarea').first().fill('Hatha lundi 18h30 salle des fetes');
  await page.screenshot({ path: join(OUT, 'B-formulaire.png'), fullPage: true });
  await page.getByRole('button', { name: /On me monte mon studio/ }).click();
  await page.waitForSelector('.cms-merci', { timeout: 30000 });
  const merci = await page.locator('.cms-merci').innerText();
  assert(/48 heures ouvr/i.test(merci), 'l\'ecran de confirmation redit le delai');
  assert(/liste d'|liste d’/.test(merci) || /planning/.test(merci),
    'il annonce ce qu\'on attend d\'elle ensuite');
  await page.screenshot({ path: join(OUT, 'C-confirmation.png'), fullPage: true });

  // ══ E. Où atterrit la demande ═════════════════════════════════════════════
  console.log(`\nE. L'atterrissage (${V96 ? 'v96 appliquee' : 'degrade'})`);
  if (V96) {
    const { data: enBase } = await admin.from('demandes_studio')
      .select('*').eq('email', emailTemoin).maybeSingle();
    assert(!!enBase, 'la demande est EN BASE');
    assert(enBase?.prenom === `${MARQUEUR} Lea` && enBase?.studio_nom === `${MARQUEUR} Studio`,
      'ses champs sont ceux du formulaire');
    assert(enBase?.planning?.includes('Hatha lundi'), 'le planning est enregistre');
    assert(enBase?.statut === 'nouvelle', 'elle nait « nouvelle » (la promesse de 48 h court)');
    assert(!('eleves' in (enBase || {})), 'aucune colonne de liste d\'eleves n\'existe, meme vide');

    // L'écran d'arrivée, avec une vraie session admin.
    const { data: users } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
    if (!(users?.users || []).some(u => (u.email || '').toLowerCase() === ADMIN_EMAIL)) {
      const { error } = await admin.auth.admin.createUser({
        email: ADMIN_EMAIL, password: `preuve-${Date.now()}-Aa!`, email_confirm: true,
        user_metadata: { role: 'eleve' },   // jamais de profil prof fantome (v57)
      });
      if (error) throw new Error(`admin jetable : ${error.message}`);
      adminCree = true;
    }
    const ctxAdmin = await browser.newContext({ viewport: { width: 1280, height: 1000 } });
    await ctxAdmin.addCookies((await sessionCookies(ADMIN_EMAIL)).map(c => ({ ...c, url: BASE, sameSite: 'Lax' })));
    const pageAdmin = await ctxAdmin.newPage();
    await pageAdmin.goto(`${BASE}/admin/demandes`, { waitUntil: 'networkidle' });
    await attendre(1200);
    const texteAdmin = await pageAdmin.evaluate(() => document.body.innerText);
    assert(texteAdmin.includes(`${MARQUEUR} Lea`), 'la demande est visible dans /admin/demandes');
    assert(texteAdmin.includes('Hatha lundi'), 'avec son planning, sans avoir a ouvrir un email');
    assert(/Demandes/.test(texteAdmin), 'l\'entree de nav existe');
    const lienCreer = pageAdmin.locator('a', { hasText: 'Créer son studio' }).first();
    const href = await lienCreer.getAttribute('href');
    assert(href?.includes(encodeURIComponent(emailTemoin)),
      'le bouton « Créer son studio » pre-remplit le formulaire concierge avec SON email');
    await pageAdmin.screenshot({ path: join(OUT, 'D-admin-demandes.png'), fullPage: true });
    await ctxAdmin.close();
  } else {
    assert(/bonjour@izisolo\.fr|email/i.test(merci),
      'sans la table, l\'ecran renvoie vers un canal humain plutot que de promettre un suivi');
    console.log('     (applique v96 puis relance ce script pour la phase E complete)');
  }

  assert(erreursConsole.length === 0, `console propre (${erreursConsole.length} erreur(s))`);
  if (erreursConsole.length) erreursConsole.slice(0, 5).forEach(e => console.log('     ', e.slice(0, 200)));

} catch (err) {
  ko++;
  console.error('\nEXCEPTION :', err.message);
} finally {
  if (browser) await browser.close();
  await purger();
  if (adminCree) {
    const { data: p } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
    const u = (p?.users || []).find(x => (x.email || '').toLowerCase() === ADMIN_EMAIL);
    if (u) await admin.auth.admin.deleteUser(u.id);
    console.log('admin jetable supprime');
  }
  console.log(`Captures : ${OUT}`);
  console.log(`\n${ok} OK / ${ko} KO`);
  process.exit(ko === 0 ? 0 : 1);
}
