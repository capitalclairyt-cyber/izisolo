/**
 * Preuve — pointage anticipé d'une séance à venir (retour Colin 2026-08-22 :
 * « on ne peut pas effectuer les pointages demandés en démo, ça fausse les
 * exercices de Maude »).
 *
 * Le verrou temporel du pointage (« s'ouvre 15 min avant le début ») reste le
 * DÉFAUT, mais gagne une porte explicite : « Pointer quand même », confirmée,
 * avec un avertissement qui reste à l'écran. Ce script prouve le chemin réel.
 *
 * Déroulé (vrai navigateur sur dev local :3333 + DB réelle, compte démo) :
 *   1. Séance dans 6 jours, une élève inscrite avec un carnet 10 séances neuf.
 *   2. Verrou fermé par défaut : bandeau « Pointage pas encore disponible »,
 *      et un clic sur « Présent » ne change RIEN en base.
 *   3. Le bouton « Pointer quand même » est visible ET réellement cliquable
 *      (elementFromPoint — le piège du FAB qui recouvre a déjà frappé 3 fois).
 *   4. Le confirm dit la vérité : il annonce le décompte immédiat des carnets.
 *      Refuser ne change rien.
 *   5. Après acceptation : verrou levé, bandeau d'avertissement « Séance à
 *      venir · pointage anticipé » affiché.
 *   6. Pointer « Présent » écrit en base ET décompte le carnet (0 → 1).
 *   7. Re-cliquer rend le crédit (1 → 0) : la promesse du message est vraie.
 *   8. Rechargement : le verrou est REVENU (rien n'est persisté, l'exception
 *      ne devient jamais un réglage).
 *   9. Séance ANNULÉE : bandeau d'annulation, AUCUNE porte (ce verrou-là n'en
 *      a pas, et ne doit pas en avoir).
 *  10. Ménage : témoins purgés, même en cas d'échec.
 *
 * Usage : node scripts/proof-pointage-anticipe.mjs [dossier-captures]
 * Prérequis : dev server sur :3333 (npm run dev).
 */
import { createClient } from '@supabase/supabase-js';
import { readFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = process.cwd();
const OUT = process.argv[2] || join(process.env.TEMP || '.', 'proof-pointage-anticipe');
mkdirSync(OUT, { recursive: true });
const BASE = 'http://localhost:3333';
const PROF_EMAIL = 'bonjour@melutek.com';
const MARQUEUR = '[preuve anticipe]';

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

  // ── Témoins ───────────────────────────────────────────────────────────────
  const { data: cliente, error: eCl } = await admin.from('clients').insert({
    profile_id: profileId, prenom: 'Julie', nom: `${MARQUEUR} Temoin`,
    email: `preuve-anticipe-${Date.now()}@example.com`, statut: 'actif', type_client: 'particulier',
  }).select('id, prenom').single();
  if (eCl) throw new Error(`client temoin: ${eCl.message}`);

  const { data: offre, error: eOf } = await admin.from('offres').insert({
    profile_id: profileId, nom: `${MARQUEUR} Carnet 10`, type: 'carnet',
    seances: 10, duree_jours: 150, prix: 140, actif: true,
  }).select('id, nom').single();
  if (eOf) throw new Error(`offre temoin: ${eOf.message}`);

  const { data: carnet, error: eAb } = await admin.from('abonnements').insert({
    profile_id: profileId, client_id: cliente.id, offre_id: offre.id, offre_nom: offre.nom,
    type: 'carnet', date_debut: jour(-10), date_fin: jour(140),
    seances_total: 10, seances_utilisees: 0, statut: 'actif',
  }).select('id').single();
  if (eAb) throw new Error(`carnet temoin: ${eAb.message}`);

  const mkCours = async (suffixe, annule) => {
    const { data, error } = await admin.from('cours').insert({
      profile_id: profileId, nom: `${MARQUEUR} ${suffixe}`, date: jour(6), heure: '18:30',
      duree_minutes: 55, capacite_max: 12, est_annule: annule, format: 'presentiel', visibilite: 'public',
    }).select('id').single();
    if (error) throw new Error(`cours ${suffixe}: ${error.message}`);
    return data.id;
  };
  const coursFutur = await mkCours('Seance a venir', false);
  const coursAnnule = await mkCours('Seance annulee', true);

  const { data: presence, error: ePr } = await admin.from('presences').insert({
    profile_id: profileId, cours_id: coursFutur, client_id: cliente.id,
    abonnement_id: carnet.id, type_presence: 'normal', statut_pointage: 'inscrit', pointee: false,
  }).select('id').single();
  if (ePr) throw new Error(`presence temoin: ${ePr.message}`);
  await admin.from('presences').insert({
    profile_id: profileId, cours_id: coursAnnule, client_id: cliente.id,
    type_presence: 'normal', statut_pointage: 'inscrit', pointee: false,
  });
  console.log(`temoins crees — seance du ${jour(6)} 18:30, carnet 10 seances a 0 utilisee`);

  const lireDB = async () => {
    const { data: p } = await admin.from('presences').select('statut_pointage, pointee').eq('id', presence.id).single();
    const { data: a } = await admin.from('abonnements').select('seances_utilisees').eq('id', carnet.id).single();
    return { statut: p?.statut_pointage, pointee: p?.pointee, used: a?.seances_utilisees };
  };

  // ── Navigateur ────────────────────────────────────────────────────────────
  let chromium;
  try { ({ chromium } = await import('playwright')); }
  catch { ({ chromium } = await import('@playwright/test')); }
  try { browser = await chromium.launch(); }
  catch { browser = await chromium.launch({ channel: 'msedge' }); }

  const ctx = await browser.newContext({ viewport: { width: 430, height: 900 } });
  await ctx.addCookies(cookies.map(c => ({ ...c, domain: 'localhost', path: '/' })));
  const page = await ctx.newPage();

  // Une page qui « marche » en crachant des erreurs console n'est pas prouvée :
  // on les collecte et on les fait échouer la preuve.
  // Bruit connu, PRÉEXISTANT et hors de notre code : Next 16 en dev émet ce
  // warning depuis OuterLayoutRouter sur toutes les pages du dashboard
  // (vérifié à l'identique sur /clients, /revenus et /agenda le 2026-08-22).
  // On le nomme au lieu de désarmer le filet.
  const BRUIT_CONNU = [/unique "key" prop.*OuterLayoutRouter/s];
  const erreursConsole = [];
  const noter = t => { if (!BRUIT_CONNU.some(r => r.test(t))) erreursConsole.push(t); };
  page.on('console', m => { if (m.type() === 'error') noter(m.text()); });
  page.on('pageerror', e => noter(`pageerror: ${e.message}`));

  let dernierDialog = null;
  let accepterDialog = false;
  page.on('dialog', async d => {
    dernierDialog = d.message();
    if (accepterDialog) await d.accept(); else await d.dismiss();
  });

  // ── 1. Verrou fermé par défaut ────────────────────────────────────────────
  console.log('\n1. Le verrou est ferme par defaut');
  await page.goto(`${BASE}/pointage/${coursFutur}`, { waitUntil: 'networkidle' });
  await page.waitForSelector('.lock-banner', { timeout: 30000 });
  const texteVerrou = await page.locator('.lock-banner').first().innerText();
  assert(/Pointage pas encore disponible/.test(texteVerrou), 'bandeau « Pointage pas encore disponible »');
  assert(/15 min avant le début/.test(texteVerrou), 'la regle des 15 min est toujours annoncee');
  assert(await page.locator('.lock-banner-warn').count() === 0, 'aucun bandeau de pointage anticipe au depart');

  // Le clic sur « Présent » ne doit RIEN écrire.
  await page.locator('.zone-ok').first().click({ force: true });
  await attendre(1500);
  const avant = await lireDB();
  assert(avant.statut === 'inscrit' && avant.used === 0, 'clic sur Present verrouille : base intacte (inscrit, carnet a 0)');

  // ── 2. Le bouton existe et est REELLEMENT cliquable ───────────────────────
  console.log('\n2. La porte est visible et cliquable');
  const bouton = page.locator('.lock-force');
  assert(await bouton.count() === 1, 'bouton « Pointer quand même » present');
  assert((await bouton.innerText()).trim() === 'Pointer quand même', 'libelle exact');
  const cliquable = await page.evaluate(() => {
    const b = document.querySelector('.lock-force');
    if (!b) return false;
    const r = b.getBoundingClientRect();
    const el = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
    return !!el && (el === b || b.contains(el));
  });
  assert(cliquable, 'elementFromPoint tombe sur le bouton (rien ne le recouvre)');
  await attendre(900); await page.screenshot({ path: join(OUT, '1-verrou-ferme.png') });

  // ── 3. Le confirm dit la verite, et refuser ne change rien ────────────────
  console.log('\n3. La confirmation annonce le decompte, et refuser ne fait rien');
  accepterDialog = false;
  await bouton.click();
  await attendre(1000);
  assert(/pas encore eu lieu/.test(dernierDialog || ''), "le message dit que la seance n'a pas eu lieu");
  assert(/décompte les carnets tout de suite/.test(dernierDialog || ''), 'le message annonce le decompte immediat');
  assert(/crédit sera rendu/.test(dernierDialog || ''), 'le message dit que la correction rend le credit');
  assert(await page.locator('.lock-force').count() === 1, 'refuser laisse le verrou ferme');

  // ── 4. Accepter ouvre la porte ────────────────────────────────────────────
  console.log('\n4. Accepter ouvre le pointage, avec avertissement');
  accepterDialog = true;
  await page.locator('.lock-force').click();
  await page.waitForSelector('.lock-banner-warn', { timeout: 15000 });
  const texteWarn = await page.locator('.lock-banner-warn').innerText();
  assert(/Séance à venir/.test(texteWarn) && /pointage anticipé/.test(texteWarn), 'bandeau « Séance à venir · pointage anticipé »');
  assert(/décompte les carnets tout de suite/.test(texteWarn), "l'avertissement reste a l'ecran");
  assert(await page.locator('.lock-force').count() === 0, 'le bandeau de verrou a disparu');
  await attendre(900); await page.screenshot({ path: join(OUT, '2-porte-ouverte.png') });

  // ── 5. Le pointage écrit vraiment, et décompte le carnet ──────────────────
  console.log('\n5. Le pointage ecrit en base et decompte le carnet');
  await page.locator('.zone-ok').first().click();
  await attendre(3000);
  const apres = await lireDB();
  assert(apres.statut === 'present' && apres.pointee === true, 'presence pointee « present » en base');
  assert(apres.used === 1, `carnet decompte : 0 -> ${apres.used}`);

  // ── 6. La correction rend le crédit (la promesse du message) ──────────────
  console.log('\n6. Corriger rend le credit');
  await page.locator('.zone-ok').first().click();
  await attendre(3000);
  const corrige = await lireDB();
  assert(corrige.statut === 'inscrit', 'presence repassee « inscrit »');
  assert(corrige.used === 0, `credit rendu : 1 -> ${corrige.used}`);

  // ── 7. Rien n'est persisté : le verrou revient ────────────────────────────
  console.log('\n7. Le verrou revient au rechargement (aucun reglage cree)');
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForSelector('.lock-banner', { timeout: 30000 });
  assert(await page.locator('.lock-force').count() === 1, 'la porte est refermee apres rechargement');
  assert(await page.locator('.lock-banner-warn').count() === 0, 'plus de bandeau anticipe');

  // ── 8. Une séance ANNULÉE n'a pas de porte ────────────────────────────────
  console.log("\n8. Une seance annulee n'a pas de porte");
  await page.goto(`${BASE}/pointage/${coursAnnule}`, { waitUntil: 'networkidle' });
  await page.waitForSelector('.lock-banner', { timeout: 30000 });
  const texteAnnule = await page.locator('.lock-banner').first().innerText();
  assert(/Séance annulée/.test(texteAnnule), 'bandeau « Séance annulée »');
  assert(await page.locator('.lock-force').count() === 0, 'aucun « Pointer quand même » sur une seance annulee');
  await attendre(900); await page.screenshot({ path: join(OUT, '3-seance-annulee.png') });

  // ── 9. Aucune erreur console sur tout le parcours ─────────────────────────
  console.log('\n9. Console propre sur tout le parcours');
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
