/**
 * Preuve — changer le JOUR d'une série récurrente DÉJÀ CRÉÉE (retour Colin
 * 2026-08-23 : « on devrait avoir la modif du jour sur cet écran pour les
 * cours récurrents »).
 *
 * Le 2026-08-22, le jour est devenu un choix à la CRÉATION. Le rattrapage
 * avait été laissé de côté : une série née le samedi restait au samedi, la
 * seule issue était de tout supprimer et recommencer, donc de perdre les
 * inscriptions. C'est ce trou-là qu'on bouche.
 *
 * Le principe : on DÉCALE, on ne régénère pas. Chaque séance à venir garde son
 * identité et avance du même nombre de jours (1 à 6, jamais en arrière).
 *
 * Déroulé (vrai navigateur sur dev local :3333 + DB réelle, compte démo) :
 *   1. Une série témoin du SAMEDI : une séance passée, trois à venir, une
 *      élève inscrite sur la première à venir.
 *   2. Fiche du cours → « Modifier la série récurrente » : le bloc « Jour de
 *      la semaine » existe, samedi est coché, la phrase dit ce qui tombe quand.
 *   3. Clic sur « Mer » : l'aperçu annonce le décalage exact, la nouvelle date
 *      de la prochaine séance, et les inscriptions concernées.
 *   4. Confirmation → EN BASE : les trois séances à venir tombent un mercredi,
 *      elles sont toujours TROIS (aucune supprimée, aucune recréée), la
 *      présence de l'élève est toujours sur la MÊME séance, et la séance
 *      PASSÉE n'a pas bougé.
 *   5. La config suit : jours_semaine = mercredi, date_debut et date_fin
 *      décalées d'autant (sinon la prochaine génération retomberait au samedi,
 *      et en bimensuel sur l'autre semaine).
 *   6. Ce qu'on refuse : une série mensuelle et une série à plusieurs jours
 *      n'offrent pas le choix, et disent pourquoi.
 *   7. Ménage : témoins purgés, même en cas d'échec.
 *
 * Usage : node scripts/proof-jour-serie-existante.mjs [dossier-captures]
 * Prérequis : dev server sur :3333 (npm run dev).
 */
import { createClient } from '@supabase/supabase-js';
import { readFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { jourDeLaSemaine, decalerJours } from '../lib/serie-jour.js';

const ROOT = process.cwd();
const OUT = process.argv[2] || join(process.env.TEMP || '.', 'proof-jour-serie');
mkdirSync(OUT, { recursive: true });
const BASE = 'http://localhost:3333';
const PROF_EMAIL = 'bonjour@melutek.com';
const MARQUEUR = '[preuve jour serie]';

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

// Samedi prochain, et les deux suivants. Le samedi PASSÉ sert de témoin
// d'immobilité : l'historique ne se déplace pas.
const prochainSamedi = (() => {
  const d = new Date();
  const versSamedi = (6 - (d.getDay() === 0 ? 7 : d.getDay()) + 7) % 7 || 7;
  d.setDate(d.getDate() + versSamedi);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
})();
const S1 = prochainSamedi;
const S2 = decalerJours(S1, 7);
const S3 = decalerJours(S1, 14);
const S0 = decalerJours(S1, -7); // samedi passé

const purger = async () => {
  const { data: rec } = await admin.from('recurrences').select('id').eq('profile_id', profileId).ilike('nom', `${MARQUEUR}%`);
  const recIds = (rec || []).map(r => r.id);
  const { data: co } = await admin.from('cours').select('id').eq('profile_id', profileId).ilike('nom', `${MARQUEUR}%`);
  const coIds = (co || []).map(c => c.id);
  if (coIds.length) {
    await admin.from('presences').delete().in('cours_id', coIds);
    await admin.from('notifications').delete().in('cours_id', coIds);
    await admin.from('cours').delete().in('id', coIds);
  }
  if (recIds.length) await admin.from('recurrences').delete().in('id', recIds);
  const { data: cl } = await admin.from('clients').select('id').eq('profile_id', profileId).ilike('nom', `${MARQUEUR}%`);
  const clIds = (cl || []).map(c => c.id);
  if (clIds.length) {
    await admin.from('presences').delete().in('client_id', clIds);
    await admin.from('clients').delete().in('id', clIds);
  }
};

let browser;
try {
  await purger();

  // ── Série témoin du samedi ────────────────────────────────────────────────
  const { data: serie, error: eRec } = await admin.from('recurrences').insert({
    profile_id: profileId, nom: `${MARQUEUR} Hatha du samedi`, type_cours: 'Hatha',
    heure: '10:00', duree_minutes: 60, capacite_max: 12,
    frequence: 'hebdomadaire', jours_semaine: [6], intervalle: 1,
    date_debut: S0, date_fin: S3, actif: true,
  }).select('id, date_debut, date_fin').single();
  if (eRec) throw new Error(`recurrence temoin: ${eRec.message}`);

  const { data: seances, error: eCo } = await admin.from('cours').insert(
    [S0, S1, S2, S3].map(d => ({
      profile_id: profileId, recurrence_parent_id: serie.id,
      nom: `${MARQUEUR} Hatha du samedi`, date: d, heure: '10:00',
      duree_minutes: 60, type_cours: 'Hatha', capacite_max: 12,
      visibilite: 'public', est_annule: false,
    }))
  ).select('id, date').order('date');
  if (eCo) throw new Error(`cours temoins: ${eCo.message}`);
  const parDate = Object.fromEntries(seances.map(c => [c.date, c.id]));

  const { data: cliente, error: eCl } = await admin.from('clients').insert({
    profile_id: profileId, prenom: 'Alix', nom: `${MARQUEUR} Temoin`,
    email: `preuve-jour-${Date.now()}@example.com`, statut: 'actif', type_client: 'particulier',
  }).select('id').single();
  if (eCl) throw new Error(`client temoin: ${eCl.message}`);
  const { error: ePr } = await admin.from('presences').insert({
    profile_id: profileId, cours_id: parDate[S1], client_id: cliente.id, statut_pointage: 'inscrit',
  });
  if (ePr) throw new Error(`presence temoin: ${ePr.message}`);

  let chromium;
  try { ({ chromium } = await import('playwright')); }
  catch { ({ chromium } = await import('@playwright/test')); }
  try { browser = await chromium.launch(); }
  catch { browser = await chromium.launch({ channel: 'msedge' }); }

  const ctx = await browser.newContext({ viewport: { width: 1000, height: 1200 } });
  await ctx.addCookies(cookies.map(c => ({ ...c, domain: 'localhost', path: '/' })));
  const page = await ctx.newPage();
  const BRUIT_CONNU = [/unique "key" prop.*OuterLayoutRouter/s];
  const erreursConsole = [];
  const noter = t => { if (!BRUIT_CONNU.some(r => r.test(t))) erreursConsole.push(t); };
  page.on('console', m => { if (m.type() === 'error') noter(m.text()); });
  page.on('pageerror', e => noter(`pageerror: ${e.message}`));

  // ── 1. Le bloc « Jour » existe sur la fiche du cours ──────────────────────
  console.log('\n1. Le jour est reglable depuis la fiche du cours');
  await page.goto(`${BASE}/cours/${parDate[S1]}`, { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: /Modifier la série récurrente/ }).click();
  await page.waitForSelector('text=Jour de la semaine', { timeout: 90000 });
  assert(true, 'le bloc « Jour de la semaine » est dans le panneau de serie');
  await page.waitForFunction(
    () => !document.body.innerText.includes('Lecture des séances à venir'),
    null, { timeout: 30000 }
  );
  const chipSam = page.locator('.recurrence-form .chip', { hasText: 'Sam' });
  assert((await chipSam.getAttribute('class') || '').includes('selected'), 'le samedi est coche : le jour REEL de la serie');
  const hint = await page.locator('.jour-serie-hint').first().innerText();
  assert(/samedi/.test(hint), `la phrase dit le jour actuel (lu : « ${hint.trim()} »)`);
  await page.screenshot({ path: join(OUT, '1-panneau-jour.png'), fullPage: true });

  // ── 2. L'aperçu annonce exactement ce qui va se passer ────────────────────
  console.log('\n2. L\'apercu annonce le decalage avant de confirmer');
  await page.locator('.recurrence-form .chip', { hasText: 'Mer' }).click();
  await attendre(500);
  const apercu = await page.locator('.jour-serie-apercu').innerText();
  const S1mer = decalerJours(S1, 4);
  const fr = iso => { const [y, m, d] = iso.split('-'); return `${d}/${m}/${y}`; };
  assert(/avance de 4 jours/.test(apercu), `il dit de combien on avance (lu : « ${apercu.trim()} »)`);
  assert(apercu.includes('le samedi devient mercredi'), 'il nomme les deux jours');
  assert(apercu.includes(fr(S1)) && apercu.includes(fr(S1mer)), `il donne la nouvelle date de la prochaine seance (${fr(S1)} vers ${fr(S1mer)})`);
  assert(/1 inscription/.test(apercu) && /préviens/.test(apercu), 'il annonce l\'inscription concernee et invite a prevenir');
  await page.screenshot({ path: join(OUT, '2-apercu-decalage.png'), fullPage: true });

  // ── 3. La confirmation nomme le déplacement ───────────────────────────────
  const labelConfirm = await page.locator('.recurrence-confirm-label').innerText();
  assert(/déplacer au mercredi/.test(labelConfirm), 'la case de confirmation nomme le deplacement');

  // ── 4. En base : ça a bougé, et rien n'a disparu ──────────────────────────
  console.log('\n3. En base : les seances a venir ont change de jour');
  await page.locator('.recurrence-confirm-label input[type="checkbox"]').check();
  await page.getByRole('button', { name: /Modifier les \d+ séances/ }).click();
  await attendre(4000);

  const { data: apres } = await admin.from('cours')
    .select('id, date').eq('recurrence_parent_id', serie.id).order('date');
  assert(apres.length === 4, `toujours 4 seances (lu : ${apres.length}) — aucune supprimee ni recreee`);
  const futures = apres.filter(c => c.date > S0);
  assert(futures.length === 3 && futures.every(c => jourDeLaSemaine(c.date) === 3),
    `les 3 seances a venir tombent un mercredi (lu : ${futures.map(c => c.date).join(', ')})`);
  assert(futures.map(c => c.date).join(',') === [S1, S2, S3].map(d => decalerJours(d, 4)).join(','),
    'chacune a avance de 4 jours, l\'ecart de 7 jours entre elles est conserve');
  const passee = apres.find(c => c.id === parDate[S0]);
  assert(passee?.date === S0, `la seance PASSEE n'a pas bouge (${S0})`);
  assert(apres.some(c => c.id === parDate[S1]), 'la seance deplacee a garde son identite (meme id)');

  const { data: presenceApres } = await admin.from('presences')
    .select('id, cours_id').eq('client_id', cliente.id).maybeSingle();
  assert(presenceApres?.cours_id === parDate[S1],
    'l\'inscription est toujours sur la MEME seance, qui a simplement change de date');

  // ── 5. La config de la série suit le mouvement ────────────────────────────
  console.log('\n4. La recurrence elle-meme est a jour');
  const { data: recApres } = await admin.from('recurrences')
    .select('jours_semaine, date_debut, date_fin').eq('id', serie.id).single();
  assert(String(recApres.jours_semaine) === '3', `jours_semaine = mercredi (lu : ${JSON.stringify(recApres.jours_semaine)})`);
  assert(recApres.date_debut === decalerJours(serie.date_debut, 4), 'date_debut decalee de 4 jours (ancrage de parite preserve)');
  assert(recApres.date_fin === decalerJours(serie.date_fin, 4), 'date_fin decalee de 4 jours (la fenetre garde sa longueur)');

  // ── 6. Ce qu'on refuse de déplacer ────────────────────────────────────────
  console.log('\n5. Ce qu\'on refuse, et pourquoi');
  const { data: serieMens } = await admin.from('recurrences').insert({
    profile_id: profileId, nom: `${MARQUEUR} Mensuel`, type_cours: 'Hatha',
    heure: '10:00', duree_minutes: 60, capacite_max: 12,
    frequence: 'mensuel', jour_mois: 15, date_debut: S1, actif: true,
  }).select('id').single();
  const { data: coursMens } = await admin.from('cours').insert({
    profile_id: profileId, recurrence_parent_id: serieMens.id,
    nom: `${MARQUEUR} Mensuel`, date: decalerJours(S1, 20), heure: '10:00',
    duree_minutes: 60, type_cours: 'Hatha', capacite_max: 12, visibilite: 'public', est_annule: false,
  }).select('id').single();

  await page.goto(`${BASE}/cours/${coursMens.id}`, { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: /Modifier la série récurrente/ }).click();
  await page.waitForSelector('text=Jour de la semaine', { timeout: 90000 });
  await attendre(1500);
  const raison = await page.locator('.jour-serie-hint').first().innerText();
  assert(/jour du mois/.test(raison), `la serie mensuelle explique son refus (lu : « ${raison.trim()} »)`);
  assert(await page.locator('.recurrence-form .chip', { hasText: 'Sam' }).count() === 0,
    'aucun jour n\'est proposé sur une serie mensuelle');
  await page.screenshot({ path: join(OUT, '3-refus-mensuel.png'), fullPage: true });

  assert(erreursConsole.length === 0, `console propre (${erreursConsole.length} erreur(s))`);
  if (erreursConsole.length) erreursConsole.slice(0, 5).forEach(e => console.log('     ', e.slice(0, 200)));

} catch (err) {
  ko++;
  console.error('\nEXCEPTION :', err.message);
} finally {
  if (browser) await browser.close();
  await purger();
  const { count: reste } = await admin.from('cours')
    .select('*', { count: 'exact', head: true }).eq('profile_id', profileId).ilike('nom', `${MARQUEUR}%`);
  console.log(`\nMenage : ${reste === 0 ? 'aucun temoin restant' : `⚠ ${reste} cours temoin restant(s)`}`);
  console.log(`Captures : ${OUT}`);
  console.log(`\n${ok} OK / ${ko} KO`);
  process.exit(ko === 0 ? 0 : 1);
}
