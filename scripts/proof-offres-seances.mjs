/**
 * Preuve — ce qu'un abonnement donne droit à faire (retour Colin 2026-08-23 :
 * « incompréhension entre séances illimitées et nombre fixe, illimité c'est
 * sans limite mais on demande ensuite combien de séances par semaine »).
 *
 * Le formulaire posait DEUX questions indépendantes (« Séances incluses » et
 * « Séances / semaine ») dont la seconde partait à 1×/semaine PAR DÉFAUT, sans
 * jamais offrir « sans limite » et sans qu'aucun écran ne l'affiche ensuite.
 * Résultat en prod : 7 abonnements sur 13 nés « illimités » ET bloqués à une
 * séance par semaine, en silence — dont « Abonnement au mois » (Soleya) avec
 * 7 élèves actives dessus. Le cap est appliqué pour de vrai par la
 * réservation portail (403 WEEKLY_LIMIT).
 *
 * Déroulé (vrai navigateur sur dev local :3333 + DB réelle, compte démo) :
 *   A. Le formulaire : UNE question à trois branches, « Autant qu'elle veut »
 *      par défaut, aucune cadence réclamée, aperçu qui dit « sans limite ».
 *   B. Création → EN BASE : seances NULL **et seances_par_semaine NULL**
 *      (avant : 1, posé sans que personne ne le demande).
 *   C. La conséquence RÉELLE : deux réservations la même semaine acceptées,
 *      par la vraie route portail. Puis contrôle : cap remis à 1 → la 2e est
 *      refusée. Le cap n'est pas du code mort, c'est bien lui qui bloquait.
 *   D. Les deux autres modes écrivent ce qu'ils annoncent.
 *   E. L'édition d'une offre née capée dit la vérité (« 1 fois par semaine »),
 *      sauvegarder ne la change pas, et basculer en illimité la répare.
 *   F. La cadence est enfin VISIBLE sur la liste des offres et sur le portail.
 *   G. Ménage : témoins purgés, réglages du démo restaurés, même en cas d'échec.
 *
 * Usage : node scripts/proof-offres-seances.mjs [dossier-captures]
 * Prérequis : dev server sur :3333 (npm run dev).
 */
import { createClient } from '@supabase/supabase-js';
import { readFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = process.cwd();
const OUT = process.argv[2] || join(process.env.TEMP || '.', 'proof-offres-seances');
mkdirSync(OUT, { recursive: true });
const BASE = 'http://localhost:3333';
const PROF_EMAIL = 'bonjour@melutek.com';
const MARQUEUR = '[preuve seances]';

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

for (let i = 0; i < 90; i++) {
  try { const r = await fetch(`${BASE}/login`); if (r.ok) break; } catch { /* pas prêt */ }
  await attendre(2000);
  if (i === 89) { console.error('dev server injoignable sur :3333'); process.exit(1); }
}
console.log('dev server pret');

const { cookies, userId: profileId } = await sessionCookies(PROF_EMAIL);
const { data: profilAvant } = await admin.from('profiles')
  .select('studio_slug, afficher_tarifs').eq('id', profileId).single();
const SLUG = profilAvant.studio_slug;

// Deux séances de la MÊME semaine ISO, dans le futur : le lundi qui vient +2j
// et +4j. C'est la fenêtre que le cap hebdo surveille.
const lundiProchain = (() => {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + ((8 - (d.getUTCDay() || 7)) % 7 || 7) + 7);
  return d;
})();
const isoJour = (base, plus) => {
  const d = new Date(base); d.setUTCDate(d.getUTCDate() + plus);
  return d.toISOString().slice(0, 10);
};
const DATE_A = isoJour(lundiProchain, 1); // mardi
const DATE_B = isoJour(lundiProchain, 3); // jeudi

const purger = async () => {
  const { data: cl } = await admin.from('clients').select('id').eq('profile_id', profileId).ilike('nom', `${MARQUEUR}%`);
  const clIds = (cl || []).map(c => c.id);
  const { data: co } = await admin.from('cours').select('id').eq('profile_id', profileId).ilike('nom', `${MARQUEUR}%`);
  const coIds = (co || []).map(c => c.id);
  if (coIds.length) await admin.from('presences').delete().in('cours_id', coIds);
  if (clIds.length) {
    await admin.from('presences').delete().in('client_id', clIds);
    await admin.from('paiements').delete().in('client_id', clIds);
    await admin.from('abonnements').delete().in('client_id', clIds);
    await admin.from('cas_a_traiter').delete().in('client_id', clIds);
    await admin.from('clients').delete().in('id', clIds);
  }
  if (coIds.length) {
    await admin.from('notifications').delete().in('cours_id', coIds);
    await admin.from('cours').delete().in('id', coIds);
  }
  const { data: of } = await admin.from('offres').select('id').eq('profile_id', profileId).ilike('nom', `${MARQUEUR}%`);
  const ofIds = (of || []).map(o => o.id);
  if (ofIds.length) {
    await admin.from('abonnements').delete().in('offre_id', ofIds);
    await admin.from('offres').delete().in('id', ofIds);
  }
};

// Chaque réservation part d'une IP distincte (RFC 5737, plage de
// documentation) : le rate limit anti-bot est par IP et n'est pas le sujet ici
// — quatre réservations d'affilée depuis la même IP le déclencheraient, alors
// que dans la vraie vie ce sont des élèves différentes sur des réseaux
// différents. Le cap hebdo testé, lui, se compte par élève.
let visiteur = 0;
const reserver = (coursId, cliente) => fetch(`${BASE}/api/portail/${SLUG}/reserver`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', 'x-forwarded-for': `203.0.113.${++visiteur}` },
  body: JSON.stringify({ coursId, nom: `${cliente.prenom} ${cliente.nom}`, email: cliente.email, tel: '' }),
});

let browser;
try {
  await purger();

  const emailTemoin = `preuve-seances-${Date.now()}@example.com`;
  const { data: cliente, error: eCl } = await admin.from('clients').insert({
    profile_id: profileId, prenom: 'Nina', nom: `${MARQUEUR} Temoin`,
    email: emailTemoin, statut: 'actif', type_client: 'particulier',
  }).select('id, prenom, nom, email').single();
  if (eCl) throw new Error(`client temoin: ${eCl.message}`);

  const { data: seances, error: eCo } = await admin.from('cours').insert([
    { profile_id: profileId, nom: `${MARQUEUR} Seance A`, date: DATE_A, heure: '18:00', duree_minutes: 60, type_cours: 'Hatha', capacite_max: 20, visibilite: 'public', est_annule: false },
    { profile_id: profileId, nom: `${MARQUEUR} Seance B`, date: DATE_B, heure: '18:00', duree_minutes: 60, type_cours: 'Hatha', capacite_max: 20, visibilite: 'public', est_annule: false },
  ]).select('id, date');
  if (eCo) throw new Error(`cours temoins: ${eCo.message}`);
  const [seanceA, seanceB] = seances;

  let chromium;
  try { ({ chromium } = await import('playwright')); }
  catch { ({ chromium } = await import('@playwright/test')); }
  try { browser = await chromium.launch(); }
  catch { browser = await chromium.launch({ channel: 'msedge' }); }

  const ctx = await browser.newContext({ viewport: { width: 1000, height: 1100 } });
  await ctx.addCookies(cookies.map(c => ({ ...c, domain: 'localhost', path: '/' })));
  const page = await ctx.newPage();

  const BRUIT_CONNU = [/unique "key" prop.*OuterLayoutRouter/s];
  const erreursConsole = [];
  const noter = t => { if (!BRUIT_CONNU.some(r => r.test(t))) erreursConsole.push(t); };
  page.on('console', m => { if (m.type() === 'error') noter(m.text()); });
  page.on('pageerror', e => noter(`pageerror: ${e.message}`));

  const creerOffre = async (nom, prix, avant) => {
    await page.goto(`${BASE}/offres/nouveau`, { waitUntil: 'networkidle' });
    await page.getByRole('button', { name: /Abonnement/ }).first().click();
    await page.waitForSelector('text=Que peut faire l\'élève avec cet abonnement ?', { timeout: 90000 });
    // Durée glissante : une offre d'abonnement exige sinon des dates, hors
    // sujet ici (elles ont leur propre preuve, proof-abonnement-glissant).
    await page.getByRole('button', { name: 'À partir de la vente' }).click();
    await attendre(400);
    if (avant) await avant();
    await page.locator('input[type="text"]').first().fill(nom);
    await page.locator('input[type="number"][step="0.01"]').first().fill(String(prix));
    await page.getByRole('button', { name: /Créer l'offre|Créer/ }).last().click();
    await page.waitForURL(/\/offres/, { timeout: 20000 });
    await attendre(1200);
    const { data } = await admin.from('offres').select('*')
      .eq('profile_id', profileId).eq('nom', nom).maybeSingle();
    return data;
  };

  // ── A. Le formulaire pose UNE question ────────────────────────────────────
  console.log('\nA. Le formulaire : une question a trois branches');
  await page.goto(`${BASE}/offres/nouveau`, { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: /Abonnement/ }).first().click();
  await page.waitForSelector('text=Que peut faire l\'élève avec cet abonnement ?', { timeout: 90000 });
  assert(true, 'la question « Que peut faire l\'élève » remplace « Séances incluses » + « Séances / semaine »');
  const btnIllimite = page.getByRole('button', { name: /Autant qu'elle veut/ });
  const btnCadence  = page.getByRole('button', { name: /X fois par semaine/ });
  const btnTotal    = page.getByRole('button', { name: /Un nombre de séances/ });
  assert((await btnIllimite.getAttribute('class') || '').includes('active'), '« Autant qu\'elle veut » est le defaut (avant : cadence 1x/sem imposee)');
  assert(await page.locator('.no-semaine-chips').count() === 0, 'aucune cadence n\'est reclamee en illimite (la contradiction est partie)');
  const apercu = await page.locator('.no-info-pill').last().innerText();
  assert(/sans limite/i.test(apercu), `l'apercu annonce la liberte totale (lu : « ${apercu.trim()} »)`);
  await page.screenshot({ path: join(OUT, 'A-formulaire-illimite.png'), fullPage: true });

  await btnCadence.click();
  await attendre(400);
  assert(await page.locator('.no-semaine-chips').count() === 1, 'le mode « X fois par semaine » demande la cadence, et elle seule');
  assert(await page.getByPlaceholder('Ex : 32 séances sur toute la période').count() === 0, 'aucun total a calculer dans ce mode (la demande de Colin)');
  await btnTotal.click();
  await attendre(400);
  assert(await page.locator('text=Sans limite').count() === 1, 'le mode « nombre de séances » propose une cadence « Sans limite »');
  await btnIllimite.click();
  await attendre(300);

  // ── B. Ce qui part en base ────────────────────────────────────────────────
  console.log('\nB. La creation n\'invente plus de cadence');
  const offreIllimitee = await creerOffre(`${MARQUEUR} Illimite`, 70);
  assert(!!offreIllimitee, 'offre creee en base');
  assert(offreIllimitee?.seances === null, 'seances NULL');
  assert(offreIllimitee?.seances_par_semaine === null,
    `seances_par_semaine NULL (avant : 1 en silence — lu : ${offreIllimitee?.seances_par_semaine})`);

  // ── C. La conséquence réelle, par la vraie route de réservation ───────────
  console.log('\nC. Deux seances la meme semaine, par le chemin reel');
  const { error: eAbo } = await admin.from('abonnements').insert({
    profile_id: profileId, client_id: cliente.id, offre_id: offreIllimitee.id,
    offre_nom: offreIllimitee.nom, type: 'abonnement', statut: 'actif',
    date_debut: new Date().toISOString().slice(0, 10), date_fin: '2027-06-30',
    seances_total: null, seances_utilisees: 0,
  });
  if (eAbo) throw new Error(`abo temoin: ${eAbo.message}`);

  const r1 = await reserver(seanceA.id, cliente);
  assert(r1.ok, `1re seance de la semaine reservee (HTTP ${r1.status})`);
  const r2 = await reserver(seanceB.id, cliente);
  const corps2 = await r2.json().catch(() => ({}));
  assert(r2.ok, `2e seance de la MEME semaine acceptee (HTTP ${r2.status}${r2.ok ? '' : ' — ' + (corps2.error || '')})`);

  // Contrôle : le cap existe bel et bien, c'est lui qui bloquait.
  await admin.from('presences').delete().in('cours_id', [seanceA.id, seanceB.id]);
  await admin.from('offres').update({ seances_par_semaine: 1 }).eq('id', offreIllimitee.id);
  const c1 = await reserver(seanceA.id, cliente);
  const c2 = await reserver(seanceB.id, cliente);
  const corpsC2 = await c2.json().catch(() => ({}));
  assert(c1.ok, 'cap remis a 1 : la 1re passe toujours');
  assert(c2.status === 403 && corpsC2.code === 'WEEKLY_LIMIT',
    `cap remis a 1 : la 2e est REFUSEE (${c2.status} ${corpsC2.code || ''}) — c\'est ce que la prod fait vivre a 7 eleves de Soleya`);
  await admin.from('presences').delete().in('cours_id', [seanceA.id, seanceB.id]);
  await admin.from('offres').update({ seances_par_semaine: null }).eq('id', offreIllimitee.id);

  // ── D. Les deux autres modes écrivent ce qu'ils annoncent ─────────────────
  console.log('\nD. Les deux autres modes');
  const offreCadence = await creerOffre(`${MARQUEUR} Deux fois par semaine`, 90, async () => {
    await page.getByRole('button', { name: /X fois par semaine/ }).click();
    await attendre(300);
    await page.locator('.no-chip', { hasText: '2×/sem' }).click();
    await attendre(200);
  });
  assert(offreCadence?.seances === null && offreCadence?.seances_par_semaine === 2,
    `« 2 fois par semaine » = cadence 2, aucun total (lu : ${offreCadence?.seances} / ${offreCadence?.seances_par_semaine})`);

  const offreTotal = await creerOffre(`${MARQUEUR} Trente-deux seances`, 320, async () => {
    await page.getByRole('button', { name: /Un nombre de séances/ }).click();
    await attendre(300);
    await page.getByPlaceholder('Ex : 32 séances sur toute la période').fill('32');
    await attendre(200);
  });
  assert(offreTotal?.seances === 32 && offreTotal?.seances_par_semaine === null,
    `« 32 séances » = total 32, cadence libre (lu : ${offreTotal?.seances} / ${offreTotal?.seances_par_semaine})`);

  // ── E. L'édition dit la vérité sur une offre née capée ────────────────────
  console.log('\nE. L\'edition d\'une offre nee capee');
  const { data: offreLegacy, error: eLeg } = await admin.from('offres').insert({
    profile_id: profileId, nom: `${MARQUEUR} Abonnement au mois`, type: 'abonnement',
    prix: 55, seances: null, seances_par_semaine: 1, duree_jours: 30, actif: true,
  }).select('id').single();
  if (eLeg) throw new Error(`offre legacy: ${eLeg.message}`);

  await page.goto(`${BASE}/offres/${offreLegacy.id}/edit`, { waitUntil: 'networkidle' });
  await page.waitForSelector('text=Que peut faire l\'élève avec cet abonnement ?', { timeout: 90000 });
  const editCadence = page.getByRole('button', { name: /X fois par semaine/ });
  assert((await editCadence.getAttribute('class') || '').includes('active'),
    'l\'offre se rouvre sur « X fois par semaine » — son cap ne se cache plus derriere « Illimitees »');
  const chip1 = page.locator('.eo-chip', { hasText: '1x/sem' });
  assert((await chip1.getAttribute('class') || '').includes('active'), 'la cadence 1x/sem est celle qui est cochee');
  const apercuEdit = await page.locator('.eo-apercu').innerText();
  assert(/1 fois par semaine/.test(apercuEdit), `l'apercu le dit en toutes lettres (lu : « ${apercuEdit.trim()} »)`);
  await page.screenshot({ path: join(OUT, 'E-edition-capee.png'), fullPage: true });

  await page.getByRole('button', { name: /Enregistrer|Sauvegarder/ }).last().click();
  await attendre(2500);
  const { data: apresSave } = await admin.from('offres').select('seances, seances_par_semaine').eq('id', offreLegacy.id).single();
  assert(apresSave?.seances === null && apresSave?.seances_par_semaine === 1,
    'sauvegarder sans rien changer ne modifie rien (aucune regression silencieuse)');

  await page.goto(`${BASE}/offres/${offreLegacy.id}/edit`, { waitUntil: 'networkidle' });
  await page.waitForSelector('text=Que peut faire l\'élève avec cet abonnement ?', { timeout: 90000 });
  await page.getByRole('button', { name: /Autant qu'elle veut/ }).click();
  await attendre(400);
  await page.getByRole('button', { name: /Enregistrer|Sauvegarder/ }).last().click();
  await attendre(2500);
  const { data: apresRepar } = await admin.from('offres').select('seances, seances_par_semaine').eq('id', offreLegacy.id).single();
  assert(apresRepar?.seances_par_semaine === null,
    'basculer en « Autant qu\'elle veut » retire le cap (le geste de reparation d\'une prof)');

  // ── F. C'est enfin visible ────────────────────────────────────────────────
  console.log('\nF. La cadence est visible sans ouvrir un formulaire');
  await admin.from('offres').update({ seances_par_semaine: 1 }).eq('id', offreLegacy.id);
  await page.goto(`${BASE}/offres`, { waitUntil: 'networkidle' });
  await attendre(1200);
  const listeTexte = await page.evaluate(() => document.body.innerText);
  assert(listeTexte.includes('1 séance par semaine'), 'la liste des offres affiche « 1 séance par semaine »');
  assert(listeTexte.includes('Séances illimitées'), 'et « Séances illimitées » pour celle qui l\'est vraiment');
  await page.screenshot({ path: join(OUT, 'F-liste-offres.png'), fullPage: true });

  await admin.from('profiles').update({ afficher_tarifs: true }).eq('id', profileId);
  const anonCtx = await browser.newContext({ viewport: { width: 420, height: 900 } });
  const pagePortail = await anonCtx.newPage();
  await pagePortail.goto(`${BASE}/p/${SLUG}`, { waitUntil: 'networkidle' });
  await attendre(1000);
  const ongletTarifs = pagePortail.getByRole('tab', { name: /Tarifs/i }).first();
  if (await ongletTarifs.count()) { await ongletTarifs.click(); await attendre(800); }
  const textePortail = await pagePortail.evaluate(() => document.body.innerText);
  assert(textePortail.includes('1 séance par semaine'),
    'le portail annonce la cadence AVANT que l\'eleve paie (elle la decouvrait a la 2e resa)');
  await pagePortail.screenshot({ path: join(OUT, 'F-portail-tarifs.png'), fullPage: true });
  await anonCtx.close();

  assert(erreursConsole.length === 0, `console propre (${erreursConsole.length} erreur(s))`);
  if (erreursConsole.length) erreursConsole.slice(0, 5).forEach(e => console.log('     ', e.slice(0, 200)));

} catch (err) {
  ko++;
  console.error('\nEXCEPTION :', err.message);
} finally {
  if (browser) await browser.close();
  await purger();
  await admin.from('profiles').update({ afficher_tarifs: profilAvant.afficher_tarifs }).eq('id', profileId);
  const { count: reste } = await admin.from('offres')
    .select('*', { count: 'exact', head: true }).eq('profile_id', profileId).ilike('nom', `${MARQUEUR}%`);
  console.log(`\nMenage : ${reste === 0 ? 'aucun temoin restant' : `⚠ ${reste} offre(s) temoin restante(s)`}`);
  console.log(`Captures : ${OUT}`);
  console.log(`\n${ok} OK / ${ko} KO`);
  process.exit(ko === 0 ? 0 : 1);
}
