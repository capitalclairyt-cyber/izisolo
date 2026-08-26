/**
 * Preuve — le pointage se voit, et le décompte manuel s'annonce comme un
 * rattrapage (retour Manon / Soleya, 2026-08-26).
 *
 * Diagnostic à l'origine du lot : 29 carnets vendus, 36 inscriptions, ZÉRO
 * pointage en 7 semaines. Elle corrigeait les compteurs à la main sur les
 * fiches, le soir même de ses cours, en croyant que le décompte dépendait du
 * type de cours. Le décompte lui-même n'a jamais été en cause
 * (scripts/proof-pointage-cours-mixte.mjs, 16/16) : ce qui manquait, c'est que
 * l'app dise OÙ il se déclenche.
 *
 * Ce que ce script prouve, dans le vrai navigateur :
 *   A. Une séance du jour déjà passée et non pointée : le bloc « Aujourd'hui »
 *      propose « Pointer la séance » (et non plus « Voir la journée »), dit
 *      combien d'élèves attendent, et explique que les carnets se décomptent
 *      au pointage. Le lien mène à CETTE séance.
 *   B. Les comptages du jour suivent la formule v74 : une inscription annulée
 *      n'est ni « attendue » ni « à pointer ».
 *   C. Une fois la séance pointée, le bloc repasse à « Voir la journée » et la
 *      carte du cours dit « Modifier le pointage ».
 *   D. Fiche élève, carnet entamé mais élève jamais pointée : le message
 *      « pointe ta séance » s'affiche sous le bouton de rattrapage, et son
 *      lien est réellement stylé (piège §12 : un <Link> dans un bloc scopé
 *      ressort en bleu navigateur — on lit le style CALCULÉ, pas la classe).
 *   E. Après un pointage, ce message disparaît de lui-même.
 *
 * Usage : node scripts/proof-pointage-visible.mjs [dossier-captures]
 * Prérequis : dev server sur :3333 (npm run dev). Témoins purgés même en cas
 * d'échec.
 */
import { createClient } from '@supabase/supabase-js';
import { readFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = process.cwd();
const OUT = process.argv[2] || join(process.env.TEMP || '.', 'proof-pointage-visible');
mkdirSync(OUT, { recursive: true });
const BASE = 'http://localhost:3333';
const PROF_EMAIL = 'bonjour@melutek.com';
const MARQUEUR = '[preuve visible]';

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

// La page dashboard requête `.eq('date', today)` avec la date UTC : on cale la
// seance temoin sur la MEME definition, sinon la preuve echouerait sur un
// desalignement d'horloge et non sur le produit.
const AUJOURDHUI = new Date().toISOString().split('T')[0];
const nowHM = new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', hour12: false });
const [hh, mm] = nowHM.split(':').map(Number);
const minutesDepuisMinuit = hh * 60 + mm;
if (minutesDepuisMinuit < 40) {
  console.error(`Il est ${nowHM} : impossible de placer une seance "deja passee" aujourd'hui. Relancer apres 00h40.`);
  process.exit(1);
}
const hPassee = String(Math.floor((minutesDepuisMinuit - 25) / 60)).padStart(2, '0')
  + ':' + String((minutesDepuisMinuit - 25) % 60).padStart(2, '0');

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
  try { const r = await fetch(`${BASE}/login`); if (r.ok) break; } catch { /* pas pret */ }
  await attendre(2000);
  if (i === 59) { console.error('dev server injoignable sur :3333'); process.exit(1); }
}
console.log('dev server pret');

const { cookies, userId: profileId } = await sessionCookies(PROF_EMAIL);

// Les autres seances du jour du compte demo fausseraient le bloc « Aujourd'hui »
// (il agrege TOUT le jour). On les ecarte le temps de la preuve, puis on les
// remet — y compris en cas d'echec.
let coursDuJourMasques = [];
const masquerAutresSeances = async () => {
  const { data } = await admin.from('cours').select('id, date')
    .eq('profile_id', profileId).eq('date', AUJOURDHUI).not('nom', 'ilike', `${MARQUEUR}%`);
  coursDuJourMasques = data || [];
  for (const c of coursDuJourMasques) {
    await admin.from('cours').update({ date: '2020-01-01' }).eq('id', c.id);
  }
  if (coursDuJourMasques.length) console.log(`${coursDuJourMasques.length} seance(s) du jour du demo ecartee(s) le temps de la preuve`);
};
const restaurerAutresSeances = async () => {
  for (const c of coursDuJourMasques) await admin.from('cours').update({ date: c.date }).eq('id', c.id);
  if (coursDuJourMasques.length) console.log(`${coursDuJourMasques.length} seance(s) du demo restauree(s)`);
  coursDuJourMasques = [];
};

const purger = async () => {
  const { data: coursTemoins } = await admin.from('cours').select('id').eq('profile_id', profileId).ilike('nom', `${MARQUEUR}%`);
  const ids = (coursTemoins || []).map(c => c.id);
  if (ids.length) await admin.from('presences').delete().in('cours_id', ids);
  await admin.from('cours').delete().eq('profile_id', profileId).ilike('nom', `${MARQUEUR}%`);
  const { data: cl } = await admin.from('clients').select('id').eq('profile_id', profileId).ilike('nom', `${MARQUEUR}%`);
  const clIds = (cl || []).map(c => c.id);
  if (clIds.length) {
    await admin.from('presences').delete().in('client_id', clIds);
    await admin.from('abonnements').delete().in('client_id', clIds);
    await admin.from('clients').delete().in('id', clIds);
  }
  await admin.from('offres').delete().eq('profile_id', profileId).ilike('nom', `${MARQUEUR}%`);
};

let browser;
try {
  await purger();
  await masquerAutresSeances();

  // ── Témoins ───────────────────────────────────────────────────────────────
  const mkCliente = async (prenom) => {
    const { data, error } = await admin.from('clients').insert({
      profile_id: profileId, prenom, nom: `${MARQUEUR} Temoin`,
      email: `preuve-visible-${prenom.toLowerCase()}-${Date.now()}@example.com`,
      statut: 'actif', type_client: 'particulier',
    }).select('id, prenom').single();
    if (error) throw new Error(`client ${prenom}: ${error.message}`);
    return data;
  };
  const cliA = await mkCliente('Livia');
  const cliB = await mkCliente('Audrey');
  const cliAnnulee = await mkCliente('Gaelle');

  const { data: offre, error: eOf } = await admin.from('offres').insert({
    profile_id: profileId, nom: `${MARQUEUR} Carnet 10`, type: 'carnet',
    seances: 10, duree_jours: 180, prix: 150, actif: true,
  }).select('id, nom').single();
  if (eOf) throw new Error(`offre: ${eOf.message}`);

  const mkCarnet = async (clientId, utilisees) => {
    const { data, error } = await admin.from('abonnements').insert({
      profile_id: profileId, client_id: clientId, offre_id: offre.id, offre_nom: offre.nom,
      type: 'carnet', date_debut: AUJOURDHUI, date_fin: null,
      seances_total: 10, seances_utilisees: utilisees, statut: 'actif',
    }).select('id').single();
    if (error) throw new Error(`carnet: ${error.message}`);
    return data;
  };
  // Le carnet de Livia porte 3 seances « deja faites » et elle n'a jamais ete
  // pointee : c'est exactement l'etat des fiches de Soleya.
  const carnetA = await mkCarnet(cliA.id, 3);
  await mkCarnet(cliB.id, 0);

  const { data: cours, error: eC } = await admin.from('cours').insert({
    profile_id: profileId, nom: `${MARQUEUR} Vinyasa du soir`, date: AUJOURDHUI, heure: hPassee,
    duree_minutes: 60, capacite_max: 12, type_cours: 'Vinyasa',
    tarif_unitaire: 18, carnets_acceptes: true,
    est_annule: false, format: 'presentiel', visibilite: 'public',
  }).select('id').single();
  if (eC) throw new Error(`cours: ${eC.message}`);

  const mkPresence = async (clientId, statut) => {
    const { data, error } = await admin.from('presences').insert({
      profile_id: profileId, cours_id: cours.id, client_id: clientId,
      type_presence: 'normal', statut_pointage: statut, pointee: false,
    }).select('id').single();
    if (error) throw new Error(`presence: ${error.message}`);
    return data.id;
  };
  await mkPresence(cliA.id, 'inscrit');
  await mkPresence(cliB.id, 'inscrit');
  await mkPresence(cliAnnulee.id, 'annule');   // temoin formule v74
  console.log(`temoins crees — seance du ${AUJOURDHUI} a ${hPassee} (passee), 2 inscrites + 1 annulee\n`);

  let chromium;
  try { ({ chromium } = await import('playwright')); }
  catch { ({ chromium } = await import('@playwright/test')); }
  try { browser = await chromium.launch(); }
  catch { browser = await chromium.launch({ channel: 'msedge' }); }
  const ctx = await browser.newContext({ viewport: { width: 420, height: 900 } });
  await ctx.addCookies(cookies.map(c => ({ ...c, domain: 'localhost', path: '/' })));
  const page = await ctx.newPage();
  const erreursConsole = [];
  page.on('console', m => { if (m.type() === 'error') erreursConsole.push(m.text()); });
  page.on('pageerror', e => erreursConsole.push(`pageerror: ${e.message}`));

  // ── A. Le dashboard met le pointage en avant ──────────────────────────────
  console.log("A. Dashboard, seance du jour deja passee et non pointee");
  await page.goto(`${BASE}/dashboard`, { waitUntil: 'networkidle' });
  await page.waitForSelector('.dash-today', { timeout: 30000 });
  await attendre(900);
  await page.screenshot({ path: join(OUT, 'A-dashboard-a-pointer.png'), fullPage: true });
  const bloc = await page.locator('.dash-today').first().innerText();
  console.log(`     [ecran] bloc « Aujourd'hui » : « ${bloc.replace(/\n/g, ' | ')} »`);
  assert(/Pointer la séance/.test(bloc), 'A · le bouton « Pointer la séance » est propose');
  assert(!/Voir la journée/.test(bloc), 'A · « Voir la journée » ne prend plus la place du pointage');
  assert(/2 élèves à pointer/.test(bloc), 'A · il annonce 2 eleves a pointer (l\'annulee ne compte pas)');
  assert(/carnets se décomptent au pointage/.test(bloc), 'A · il explique que le decompte se fait au pointage');

  // ── B. Formule v74 sur les comptages du jour ──────────────────────────────
  console.log('\nB. Les comptages ignorent l\'inscription annulee (formule v74)');
  assert(/2\s*élèves? attendus?/.test(bloc), 'B · « 2 élèves attendus » et non 3');
  const carte = await page.locator('.cours-card').first().innerText();
  console.log(`     [ecran] carte du cours : « ${carte.replace(/\n/g, ' | ')} »`);
  assert(/2 inscrits/.test(carte), 'B · la carte du cours affiche 2 inscrits');
  assert(/Pointer/.test(carte) && !/Modifier le pointage/.test(carte), 'B · la carte propose « Pointer »');

  // ── C. Le lien mene a CETTE seance, et l'etat suit apres pointage ─────────
  console.log('\nC. Le lien mene a la bonne seance, puis l\'etat suit');
  await page.locator('.dash-today-cta').first().click();
  await page.waitForURL(/\/pointage\//, { timeout: 30000 });
  const url = page.url();
  console.log(`     [ecran] arrivee sur ${url.replace(BASE, '')}`);
  assert(url.includes(cours.id), 'C · le bouton mene au pointage de la seance temoin');

  await page.waitForSelector('.pres-zone.zone-ok', { timeout: 30000 });
  // Le pointage REORDONNE les lignes (en attente → présents → absents) : viser
  // un index fixe pointe la mauvaise eleve des le 2e clic. On cible donc
  // toujours une ligne qui n'a pas encore d'heure de pointage, et on s'arrete
  // quand les 2 inscrites en portent une.
  const A_POINTER = 2;
  for (let i = 0; i < 30; i++) {
    if (await page.locator('.pres-heure').count() >= A_POINTER) break;
    const cible = page.locator('.pres-row:not(:has(.pres-heure)) .pres-zone.zone-ok').first();
    if (await cible.count() === 0) break;
    await cible.click({ timeout: 5000 }).catch(() => {});
    await attendre(700);
  }
  await attendre(1200);
  const nbPointeesEcran = await page.locator('.pres-heure').count();
  console.log(`     [ecran] ${nbPointeesEcran}/${A_POINTER} ligne(s) portent une heure de pointage`);
  assert(nbPointeesEcran === A_POINTER, 'C · les 2 inscrites sont pointees a l\'ecran');
  const { data: apres } = await admin.from('abonnements').select('seances_utilisees').eq('id', carnetA.id);
  console.log(`     [base] carnet de Livia : ${apres?.[0]?.seances_utilisees}/10 utilisees (3 avant le pointage)`);
  assert(apres?.[0]?.seances_utilisees === 4, 'C · le pointage a decompte le carnet EN BASE (3 → 4)');

  await page.goto(`${BASE}/dashboard`, { waitUntil: 'networkidle' });
  await page.waitForSelector('.dash-today', { timeout: 30000 });
  await attendre(900);
  const bloc2 = await page.locator('.dash-today').first().innerText();
  console.log(`     [ecran] bloc apres pointage : « ${bloc2.replace(/\n/g, ' | ')} »`);
  assert(!/Pointer la séance/.test(bloc2), 'C · plus rien a pointer : le bouton disparait');
  assert(/Voir la journée/.test(bloc2), 'C · « Voir la journée » reprend sa place');
  const carte2 = await page.locator('.cours-card').first().innerText();
  assert(/Modifier le pointage/.test(carte2), 'C · la carte du cours dit « Modifier le pointage »');
  await page.screenshot({ path: join(OUT, 'C-dashboard-pointe.png'), fullPage: true });

  // ── D+E. Fiche eleve : le rattrapage s'annonce comme tel ──────────────────
  // Audrey n'a PAS ete pointee sur une autre seance : on lui donne un carnet
  // entame pour reproduire l'etat des fiches de Soleya.
  console.log('\nD. Fiche eleve : carnet entame + jamais pointee');
  await admin.from('abonnements').update({ seances_utilisees: 5 }).eq('client_id', cliB.id);
  // Audrey vient d'etre pointee en C : on la remet « inscrite » pour tester le
  // cas « jamais pointee », puis on verifiera la disparition du message.
  await admin.from('presences').update({ statut_pointage: 'inscrit', pointee: false, abonnement_id: null })
    .eq('cours_id', cours.id).eq('client_id', cliB.id);

  await page.goto(`${BASE}/clients/${cliB.id}?tab=presences`, { waitUntil: 'networkidle' });
  await attendre(1500);
  const ongletPresences = page.locator('button', { hasText: 'Présences' }).first();
  if (await ongletPresences.count()) { await ongletPresences.click().catch(() => {}); await attendre(1000); }
  await page.waitForSelector('.presences-carnet-card', { timeout: 30000 });
  await page.screenshot({ path: join(OUT, 'D-fiche-eleve.png'), fullPage: true });
  const bloc3 = await page.locator('.presences-carnet-card').first().innerText();
  console.log(`     [ecran] carte carnet : « ${bloc3.replace(/\n/g, ' | ')} »`);
  assert(/Modifier les séances déjà faites/.test(bloc3), 'D · le bouton de rattrapage est toujours la');
  assert(/pointe ta séance/.test(bloc3), 'D · le message renvoie au pointage');
  assert(await page.locator('.presences-carnet-auto').count() === 1, 'D · le bloc d\'explication est rendu');

  // Le style CALCULE, pas la classe : un <Link> dans un bloc scope ressort en
  // bleu navigateur (piege §12, rencontre 6 fois).
  const couleurLien = await page.locator('.presences-carnet-auto a').first()
    .evaluate(el => getComputedStyle(el).color);
  console.log(`     [style calcule] couleur du lien : ${couleurLien}`);
  assert(couleurLien !== 'rgb(0, 0, 238)' && couleurLien !== 'rgb(0, 0, 255)',
    'D · le lien est reellement style (pas le bleu navigateur)');

  console.log('\nE. Une fois l\'eleve pointee, le message disparait');
  await admin.from('presences').update({ statut_pointage: 'present', pointee: true })
    .eq('cours_id', cours.id).eq('client_id', cliB.id);
  await page.goto(`${BASE}/clients/${cliB.id}`, { waitUntil: 'networkidle' });
  await attendre(1500);
  const onglet2 = page.locator('button', { hasText: 'Présences' }).first();
  if (await onglet2.count()) { await onglet2.click().catch(() => {}); await attendre(1000); }
  await page.waitForSelector('.presences-carnet-card', { timeout: 30000 });
  assert(await page.locator('.presences-carnet-auto').count() === 0, 'E · le message ne s\'affiche plus');
  assert(await page.locator('.presences-carnet-edit').count() >= 1, 'E · le bouton de rattrapage, lui, reste disponible');

  // ── F. Console propre ─────────────────────────────────────────────────────
  console.log('\nF. Console');
  if (erreursConsole.length) erreursConsole.forEach(e => console.log(`     > ${e.slice(0, 200)}`));
  assert(erreursConsole.length === 0, `aucune erreur console (${erreursConsole.length} relevee(s))`);

} catch (e) {
  ko++;
  console.error(`\nECHEC : ${e.message}`);
  console.error(e.stack);
} finally {
  if (browser) await browser.close().catch(() => {});
  await purger();
  await restaurerAutresSeances();
  console.log('\ntemoins purges');
}

console.log(`\n${ok}/${ok + ko} verifications passees`);
console.log(`captures : ${OUT}`);
process.exit(ko === 0 ? 0 : 1);
