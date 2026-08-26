/**
 * Preuve — le décompte de carnet au pointage sur un cours MIXTE.
 *
 * Contexte (2026-08-26, retour Manon / Soleya : « je suis obligée de décompter
 * moi-même les séances sur les cartes de mes élèves, alors que j'ai bien
 * renseigné le type de cours »). Le diagnostic en base a montré qu'elle n'a
 * JAMAIS pointé (0 présence pointée sur 36) — mais aussi que le chemin
 * « cours mixte » (tarif_unitaire > 0 ET carnets_acceptes = true, la
 * configuration de 100 % de ses cours) n'a jamais été exercé par personne en
 * production : 664 cours mixtes chez 5 studios, 0 pointage dessus. Les seules
 * liaisons de carnet constatées en prod portent sur des cours SANS tarif.
 *
 * Ce script exerce donc le chemin réel, dans le vrai navigateur, pour trancher
 * entre « le produit est bon, c'est un problème d'usage » et « le mixte est
 * cassé et elle a raison de ne pas lui faire confiance ».
 *
 * Trois cas, tous en configuration Soleya :
 *   A. Cours mixte typé « Vinyasa », carnet NON restreint (le cas EXACT de sa
 *      séance d'hier soir) → l'écran doit annoncer le carnet, pas « À régler »,
 *      et le clic « Présent » doit décompter EN BASE.
 *   B. Cours mixte SANS type, carnet restreint à Vinyasa/Yin (ses cours du
 *      lundi et du mercredi, qui n'ont pas de type_cours) → un cours sans type
 *      est accepté par un carnet restreint (règle figée 2026-07-13).
 *   C. Contre-épreuve : tarif PUR (carnets_acceptes = false) → « À régler »,
 *      et le pointage ne touche à AUCUN carnet.
 *
 * Usage : node scripts/proof-pointage-cours-mixte.mjs [dossier-captures]
 * Prérequis : dev server sur :3333 (npm run dev). Témoins purgés même en cas
 * d'échec.
 */
import { createClient } from '@supabase/supabase-js';
import { readFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = process.cwd();
const OUT = process.argv[2] || join(process.env.TEMP || '.', 'proof-pointage-mixte');
mkdirSync(OUT, { recursive: true });
const BASE = 'http://localhost:3333';
const PROF_EMAIL = 'bonjour@melutek.com';
const MARQUEUR = '[preuve mixte]';

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
const jour = n => new Date(Date.now() + n * 86400000).toLocaleDateString('sv-SE');

// Une relecture de preuve doit DIRE ce qu'elle trouve (leçon v100) :
// compter les lignes, les afficher, puis assertionner.
const relireCarnet = async (id, label) => {
  const { data, error } = await admin.from('abonnements')
    .select('id, seances_utilisees, seances_total').eq('id', id);
  if (error) throw new Error(`relecture carnet: ${error.message}`);
  if ((data || []).length !== 1) throw new Error(`relecture carnet ${label}: ${data?.length ?? 0} ligne(s)`);
  console.log(`     [base] ${label} : ${data[0].seances_utilisees}/${data[0].seances_total} utilisees`);
  return data[0].seances_utilisees;
};
const relirePresence = async (id, label) => {
  const { data, error } = await admin.from('presences')
    .select('id, statut_pointage, pointee, abonnement_id').eq('id', id);
  if (error) throw new Error(`relecture presence: ${error.message}`);
  if ((data || []).length !== 1) throw new Error(`relecture presence ${label}: ${data?.length ?? 0} ligne(s)`);
  console.log(`     [base] ${label} : statut=${data[0].statut_pointage} pointee=${data[0].pointee} carnet=${data[0].abonnement_id ? 'LIE' : 'non lie'}`);
  return data[0];
};

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

  // ── Temoins : la configuration de Soleya, a l'identique ───────────────────
  const mkCliente = async (prenom) => {
    const { data, error } = await admin.from('clients').insert({
      profile_id: profileId, prenom, nom: `${MARQUEUR} Temoin`,
      email: `preuve-mixte-${prenom.toLowerCase()}-${Date.now()}@example.com`,
      statut: 'actif', type_client: 'particulier',
    }).select('id, prenom').single();
    if (error) throw new Error(`client ${prenom}: ${error.message}`);
    return data;
  };
  const mkCarnet = async (clientId, nom, types) => {
    const { data: offre, error: eOf } = await admin.from('offres').insert({
      profile_id: profileId, nom: `${MARQUEUR} ${nom}`, type: 'carnet',
      seances: 10, duree_jours: 180, prix: 150, actif: true,
      types_cours_autorises: types,
    }).select('id, nom').single();
    if (eOf) throw new Error(`offre ${nom}: ${eOf.message}`);
    const { data, error } = await admin.from('abonnements').insert({
      profile_id: profileId, client_id: clientId, offre_id: offre.id, offre_nom: offre.nom,
      type: 'carnet', date_debut: jour(-10), date_fin: jour(170),
      seances_total: 10, seances_utilisees: 0, statut: 'actif',
      types_cours_autorises: types,
    }).select('id, offre_nom').single();
    if (error) throw new Error(`carnet ${nom}: ${error.message}`);
    return data;
  };
  // Une seance d'hier soir : passee, donc pointable sans forcer le verrou —
  // exactement la situation de Manon quand elle rouvre l'app apres son cours.
  const mkCours = async (suffixe, { type, tarif, mixte }) => {
    const { data, error } = await admin.from('cours').insert({
      profile_id: profileId, nom: `${MARQUEUR} ${suffixe}`, date: jour(-1), heure: '19:00',
      duree_minutes: 60, capacite_max: 12, type_cours: type,
      tarif_unitaire: tarif, carnets_acceptes: mixte,
      est_annule: false, format: 'presentiel', visibilite: 'public',
    }).select('id').single();
    if (error) throw new Error(`cours ${suffixe}: ${error.message}`);
    return data.id;
  };
  const mkPresence = async (coursId, clientId) => {
    const { data, error } = await admin.from('presences').insert({
      profile_id: profileId, cours_id: coursId, client_id: clientId,
      type_presence: 'normal', statut_pointage: 'inscrit', pointee: false,
    }).select('id').single();
    if (error) throw new Error(`presence: ${error.message}`);
    return data.id;
  };

  const cliA = await mkCliente('Livia');
  const cliB = await mkCliente('Audrey');
  const cliC = await mkCliente('Gaelle');
  const carnetA = await mkCarnet(cliA.id, 'Carnet 10 libre', null);                       // comme ses carnets vendus
  const carnetB = await mkCarnet(cliB.id, 'Carnet 10 Vinyasa-Yin', ['Vinyasa', 'Yin']);   // comme ses offres
  const carnetC = await mkCarnet(cliC.id, 'Carnet 10 atelier', null);

  const coursA = await mkCours('A mixte type Vinyasa', { type: 'Vinyasa', tarif: 18, mixte: true });
  const coursB = await mkCours('B mixte sans type', { type: null, tarif: 18, mixte: true });
  const coursC = await mkCours('C tarif pur', { type: 'Vinyasa', tarif: 18, mixte: false });
  const presA = await mkPresence(coursA, cliA.id);
  const presB = await mkPresence(coursB, cliB.id);
  const presC = await mkPresence(coursC, cliC.id);
  console.log(`temoins crees — 3 seances du ${jour(-1)} 19:00, 3 carnets 10 seances a 0 utilisee\n`);

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

  // Un bouton rendu cote serveur n'a pas forcement son handler React attache :
  // re-cliquer jusqu'a ce que le temoin soit vrai (lecon v100).
  const pointerPresent = async (nomAttendu) => {
    await page.waitForSelector('.pres-zone.zone-ok', { timeout: 30000 });
    for (let i = 0; i < 12; i++) {
      await page.locator('.pres-zone.zone-ok').first().click({ timeout: 5000 }).catch(() => {});
      await attendre(700);
      if (await page.locator('.pres-heure').count() > 0) return true;
    }
    console.log(`     (le pointage de ${nomAttendu} n'a pas pris)`);
    return false;
  };

  // ── A. Le cas exact d'hier soir : mixte type Vinyasa, carnet non restreint ─
  console.log('A. Cours MIXTE type Vinyasa + carnet non restreint (le cas de sa seance d\'hier)');
  await page.goto(`${BASE}/pointage/${coursA}`, { waitUntil: 'networkidle' });
  await page.waitForSelector('.pres-zone', { timeout: 30000 });
  await attendre(800);
  await page.screenshot({ path: join(OUT, 'A1-avant-pointage.png'), fullPage: true });
  const metaA = await page.locator('.pres-meta').first().innerText();
  console.log(`     [ecran] sous le nom : « ${metaA.replace(/\n/g, ' | ')} »`);
  assert(/Carnet 10 libre/.test(metaA), 'A · l\'ecran annonce le carnet applicable');
  assert(!/À régler/.test(metaA), 'A · l\'ecran ne dit PAS « À régler »');
  assert(await relireCarnet(carnetA.id, 'carnet A avant') === 0, 'A · carnet a 0 utilisee avant le pointage');

  assert(await pointerPresent('Livia'), 'A · le clic « Présent » est pris en compte');
  await attendre(1200);
  await page.screenshot({ path: join(OUT, 'A2-apres-pointage.png'), fullPage: true });
  const presApresA = await relirePresence(presA, 'presence A apres');
  assert(presApresA.statut_pointage === 'present' && presApresA.pointee === true, 'A · presence pointee EN BASE');
  assert(!!presApresA.abonnement_id, 'A · la presence est LIEE au carnet EN BASE');
  assert(await relireCarnet(carnetA.id, 'carnet A apres') === 1, 'A · le carnet est decompte EN BASE (0 → 1)');

  // ── B. Ses cours sans type + carnet restreint ─────────────────────────────
  console.log('\nB. Cours MIXTE SANS type + carnet restreint Vinyasa/Yin (ses cours du lundi et du mercredi)');
  await page.goto(`${BASE}/pointage/${coursB}`, { waitUntil: 'networkidle' });
  await page.waitForSelector('.pres-zone', { timeout: 30000 });
  await attendre(800);
  const metaB = await page.locator('.pres-meta').first().innerText();
  console.log(`     [ecran] sous le nom : « ${metaB.replace(/\n/g, ' | ')} »`);
  assert(/Carnet 10 Vinyasa-Yin/.test(metaB), 'B · un cours sans type est couvert par un carnet restreint');
  assert(await pointerPresent('Audrey'), 'B · le clic « Présent » est pris en compte');
  await attendre(1200);
  await page.screenshot({ path: join(OUT, 'B-apres-pointage.png'), fullPage: true });
  const presApresB = await relirePresence(presB, 'presence B apres');
  assert(!!presApresB.abonnement_id, 'B · la presence est LIEE au carnet EN BASE');
  assert(await relireCarnet(carnetB.id, 'carnet B apres') === 1, 'B · le carnet restreint est decompte EN BASE (0 → 1)');

  // ── C. Contre-epreuve : le tarif PUR ne decompte rien ─────────────────────
  console.log('\nC. Contre-epreuve — tarif PUR (carnets non acceptes) : rien ne doit etre decompte');
  await page.goto(`${BASE}/pointage/${coursC}`, { waitUntil: 'networkidle' });
  await page.waitForSelector('.pres-zone', { timeout: 30000 });
  await attendre(800);
  const metaC = await page.locator('.pres-meta').first().innerText();
  console.log(`     [ecran] sous le nom : « ${metaC.replace(/\n/g, ' | ')} »`);
  assert(/À régler/.test(metaC), 'C · l\'ecran dit « À régler » (atelier pur)');
  assert(!/Carnet 10 atelier/.test(metaC), 'C · aucun carnet annonce sur un atelier pur');
  await pointerPresent('Gaelle');
  await attendre(1200);
  const presApresC = await relirePresence(presC, 'presence C apres');
  assert(!presApresC.abonnement_id, 'C · la presence n\'est PAS liee a un carnet');
  assert(await relireCarnet(carnetC.id, 'carnet C apres') === 0, 'C · le carnet reste intact (0 utilisee)');
  await page.screenshot({ path: join(OUT, 'C-tarif-pur.png'), fullPage: true });

  // ── D. Console propre ─────────────────────────────────────────────────────
  console.log('\nD. Console');
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
