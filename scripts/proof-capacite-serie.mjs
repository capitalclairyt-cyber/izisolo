/**
 * Preuve — changer les PLACES d'une série récurrente déjà créée (retour
 * Maude, 2026-09-09 : elle voulait passer « Yoga enfants » de 8 à 13 places
 * et n'y arrivait pas).
 *
 * Constaté en base avant de coder : une seule de ses séances à 13 (celle
 * qu'elle avait ouverte), trente à 8, et la récurrence elle-même à 8. Aucun
 * écran ne permettait de régler la capacité d'une série entière : le champ
 * n'existait qu'à la création et sur UNE séance. Et la récurrence porte sa
 * propre capacité, recopiée par « Ajuster la série » : corriger les séances
 * une à une n'aurait pas suffi, toute prolongation renaissait à l'ancienne.
 *
 * Déroulé (vrai navigateur sur dev local :3333 + DB réelle, compte démo) :
 *   1. Une série témoin à 8 places : une séance passée, trois à venir. La
 *      deuxième à venir porte 9 inscrites (plus que 8 : le seed l'a faite
 *      « sur-complète » pour tester la garde), la première 2.
 *   2. Fiche du cours → « Modifier la série récurrente » : le champ « Places
 *      max (toute la série) » existe, il affiche 8 (la valeur de la SÉRIE).
 *   3. Taper 13 : l'aperçu annonce « Les 3 séances à venir passent à 13
 *      places. », et la case de confirmation nomme le changement.
 *   4. Confirmation → EN BASE : les trois séances à venir sont à 13, la
 *      séance PASSÉE reste à 8, la récurrence est à 13, et les 11 inscrites
 *      sont toujours là (aucune retirée).
 *   5. Rouvrir, taper 5 : l'aperçu nomme la séance à 9 inscrites, promet que
 *      personne n'est retiré. Confirmer → EN BASE : 5 partout à venir, les 9
 *      inscrites intactes.
 *   6. Rouvrir, vider le champ : l'aperçu dit « illimitées ». Confirmer → NULL
 *      en base sur les séances à venir et la récurrence.
 *   7. Rouvrir, changer seulement le NOM sans toucher aux places, après avoir
 *      posé 20 sur une seule séance à la main (grande salle) : cette capacité
 *      individuelle est CONSERVÉE (on n'écrit les places que si changées).
 *   8. « 0 » est refusé avec une raison, rien n'est écrit.
 *   9. Ménage : témoins purgés, même en cas d'échec.
 *
 * Usage : node scripts/proof-capacite-serie.mjs [dossier-captures]
 * Prérequis : dev server sur :3333 (npm run dev).
 */
import { createClient } from '@supabase/supabase-js';
import { readFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { decalerJours } from '../lib/serie-jour.js';

const ROOT = process.cwd();
const OUT = process.argv[2] || join(process.env.TEMP || '.', 'proof-capacite-serie');
mkdirSync(OUT, { recursive: true });
const BASE = process.env.PROOF_BASE || 'http://localhost:3333';
const PROF_EMAIL = 'bonjour@melutek.com';
const MARQUEUR = '[preuve capacite serie]';

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

const isoLocal = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const aujourdhui = isoLocal(new Date());
const S1 = decalerJours(aujourdhui, 7);   // à venir
const S2 = decalerJours(aujourdhui, 14);  // à venir, sur-complète (9 inscrites)
const S3 = decalerJours(aujourdhui, 21);  // à venir
const S0 = decalerJours(aujourdhui, -7);  // passée : témoin d'immobilité

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

const lireSerie = async (serieId) => {
  const { data: cs, error } = await admin.from('cours').select('id, date, capacite_max').eq('recurrence_parent_id', serieId).order('date');
  if (error) throw new Error(`lecture cours: ${error.message}`);
  const { data: rec } = await admin.from('recurrences').select('capacite_max, nom').eq('id', serieId).single();
  const { count } = await admin.from('presences').select('id', { count: 'exact', head: true }).in('cours_id', cs.map(c => c.id));
  return { cours: cs, rec, nbPresences: count };
};

// Ouvre le panneau « Modifier la série » et attend la lecture des occurrences.
// Un bouton rendu côté serveur peut recevoir le clic avant son handler : on
// re-clique jusqu'à voir le panneau (piège v100).
const ouvrirPanneau = async (page, coursId) => {
  await page.goto(`${BASE}/cours/${coursId}`, { waitUntil: 'networkidle' });
  for (let i = 0; i < 8; i++) {
    await page.getByRole('button', { name: /Modifier la série récurrente/ }).click().catch(() => {});
    if (await page.locator('.recurrence-form').count()) break;
    await attendre(700);
  }
  await page.waitForSelector('.recurrence-form', { timeout: 60000 });
  await page.waitForFunction(
    () => !document.body.innerText.includes('Lecture des séances à venir'),
    null, { timeout: 30000 }
  );
};
const champPlaces = page => page.getByLabel('Places max de toute la série');
const confirmerEtEnregistrer = async (page) => {
  await page.locator('.recurrence-confirm-label input[type="checkbox"]').check();
  await page.getByRole('button', { name: /Modifier les \d+ séances/ }).click();
  await page.waitForSelector('.recurrence-form', { state: 'detached', timeout: 30000 });
  await attendre(1500);
};

let browser;
try {
  await purger();

  // ── Série témoin à 8 places ───────────────────────────────────────────────
  const NOM = `${MARQUEUR} Yoga enfants`;
  const { data: serie, error: eRec } = await admin.from('recurrences').insert({
    profile_id: profileId, nom: NOM, type_cours: 'Hatha',
    heure: '17:00', duree_minutes: 60, capacite_max: 8,
    frequence: 'hebdomadaire', jours_semaine: [2], intervalle: 1,
    date_debut: S0, date_fin: S3, actif: true,
  }).select('id').single();
  if (eRec) throw new Error(`recurrence temoin: ${eRec.message}`);

  const { data: seances, error: eCo } = await admin.from('cours').insert(
    [S0, S1, S2, S3].map(d => ({
      profile_id: profileId, recurrence_parent_id: serie.id,
      nom: NOM, date: d, heure: '17:00',
      duree_minutes: 60, type_cours: 'Hatha', capacite_max: 8,
      visibilite: 'public', est_annule: false,
    }))
  ).select('id, date').order('date');
  if (eCo) throw new Error(`cours temoins: ${eCo.message}`);
  const parDate = Object.fromEntries(seances.map(c => [c.date, c.id]));

  // 11 élèves témoins : 2 sur S1, 9 sur S2 (au-dessus de 8 : sur-complète).
  const { data: clientes, error: eCl } = await admin.from('clients').insert(
    Array.from({ length: 11 }, (_, i) => ({
      profile_id: profileId, prenom: `Eleve${i + 1}`, nom: `${MARQUEUR} Temoin`,
      email: `preuve-cap-${Date.now()}-${i}@example.com`, statut: 'actif', type_client: 'particulier',
    }))
  ).select('id');
  if (eCl) throw new Error(`clients temoins: ${eCl.message}`);
  const { error: ePr } = await admin.from('presences').insert(
    clientes.map((c, i) => ({
      profile_id: profileId, cours_id: i < 2 ? parDate[S1] : parDate[S2], client_id: c.id, statut_pointage: 'inscrit',
    }))
  );
  if (ePr) throw new Error(`presences temoins: ${ePr.message}`);

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

  const fr = iso => { const [y, m, d] = iso.split('-'); return `${d}/${m}/${y}`; };

  // ── 1. Le champ existe et dit la valeur de la SÉRIE ───────────────────────
  console.log('\n1. Le champ « Places max (toute la serie) » est sur la fiche du cours');
  await ouvrirPanneau(page, parDate[S1]);
  assert(await champPlaces(page).count() === 1, 'le champ existe dans le panneau de serie');
  assert(await champPlaces(page).inputValue() === '8', `il affiche la capacite de la serie (lu : « ${await champPlaces(page).inputValue()} »)`);
  const hint0 = await page.locator('.recurrence-form').innerText();
  assert(/8 places aujourd'hui/.test(hint0), 'la phrase d\'etat dit « 8 places aujourd\'hui »');
  assert(await page.locator('.capacite-serie-apercu').count() === 0, 'aucun apercu tant que rien n\'est change');
  await page.screenshot({ path: join(OUT, '1-champ-places.png'), fullPage: true });

  // ── 2. Taper 13 : l'aperçu et la confirmation ─────────────────────────────
  console.log('\n2. 8 → 13 : l\'apercu annonce, la confirmation nomme');
  await champPlaces(page).fill('13');
  await attendre(400);
  const apercu13 = await page.locator('.capacite-serie-apercu').innerText();
  assert(apercu13.trim() === 'Les 3 séances à venir passent à 13 places.', `apercu exact (lu : « ${apercu13.trim()} »)`);
  const label13 = await page.locator('.recurrence-confirm-label').innerText();
  assert(/passer à 13 places/.test(label13), 'la case de confirmation nomme les 13 places');
  await page.screenshot({ path: join(OUT, '2-apercu-13.png'), fullPage: true });

  // ── 3. En base : 13 à venir, 8 dans le passé, la récurrence suit ──────────
  console.log('\n3. En base apres confirmation');
  await confirmerEtEnregistrer(page);
  let etat = await lireSerie(serie.id);
  const futures = () => etat.cours.filter(c => c.date > S0);
  assert(etat.cours.length === 4, `toujours 4 seances (lu : ${etat.cours.length})`);
  assert(futures().every(c => c.capacite_max === 13), `les 3 seances a venir sont a 13 (lu : ${futures().map(c => c.capacite_max).join(',')})`);
  assert(etat.cours.find(c => c.id === parDate[S0]).capacite_max === 8, 'la seance PASSEE reste a 8');
  assert(etat.rec.capacite_max === 13, `la recurrence est a 13 (lu : ${etat.rec.capacite_max}) : les prochaines generations suivront`);
  assert(etat.nbPresences === 11, `les 11 inscrites sont toujours la (lu : ${etat.nbPresences})`);

  // ── 4. Réduire sous le remplissage : la garde ─────────────────────────────
  console.log('\n4. 13 → 5 : une seance a 9 inscrites, personne n\'est retire');
  await ouvrirPanneau(page, parDate[S1]);
  assert(await champPlaces(page).inputValue() === '13', 'a la reouverture, le champ relit 13 depuis la serie');
  await champPlaces(page).fill('5');
  await attendre(400);
  const apercu5 = await page.locator('.capacite-serie-apercu').innerText();
  assert(/passent à 5 places/.test(apercu5), 'l\'apercu annonce 5 places');
  assert(apercu5.includes(`1 séance a déjà plus d'inscrites que ça (${fr(S2)} : 9)`), `il nomme la seance sur-complete avec sa date et ses 9 inscrites (lu : « ${apercu5.trim()} »)`);
  assert(/personne n'est retiré/.test(apercu5), 'il promet que personne n\'est retire');
  await page.screenshot({ path: join(OUT, '3-apercu-garde.png'), fullPage: true });
  await confirmerEtEnregistrer(page);
  etat = await lireSerie(serie.id);
  assert(futures().every(c => c.capacite_max === 5), `les 3 seances a venir sont a 5 (lu : ${futures().map(c => c.capacite_max).join(',')})`);
  assert(etat.rec.capacite_max === 5, 'la recurrence est a 5');
  assert(etat.nbPresences === 11, `aucune inscrite retiree : toujours 11 (lu : ${etat.nbPresences})`);

  // ── 5. Vider = illimité ───────────────────────────────────────────────────
  console.log('\n5. Vide = illimite');
  await ouvrirPanneau(page, parDate[S1]);
  await champPlaces(page).fill('');
  await attendre(400);
  const apercuVide = await page.locator('.capacite-serie-apercu').innerText();
  assert(apercuVide.trim() === 'Les 3 séances à venir passent en places illimitées.', `apercu illimite (lu : « ${apercuVide.trim()} »)`);
  await confirmerEtEnregistrer(page);
  etat = await lireSerie(serie.id);
  assert(futures().every(c => c.capacite_max === null), 'les 3 seances a venir sont a NULL (illimite)');
  assert(etat.rec.capacite_max === null, 'la recurrence est a NULL');

  // ── 6. Ne rien toucher aux places = ne rien écraser ───────────────────────
  console.log('\n6. Changer le nom sans toucher aux places n\'ecrase pas une capacite posee a la main');
  await admin.from('cours').update({ capacite_max: 20 }).eq('id', parDate[S3]);
  await admin.from('recurrences').update({ capacite_max: 10 }).eq('id', serie.id);
  await admin.from('cours').update({ capacite_max: 10 }).in('id', [parDate[S1], parDate[S2]]);
  await ouvrirPanneau(page, parDate[S1]);
  assert(await champPlaces(page).inputValue() === '10', 'le champ relit 10 (la serie), pas 20 (la seance a part)');
  await page.locator('.recurrence-form input[placeholder="Ex : Yoga Vinyasa"]').fill(`${NOM} renomme`);
  await attendre(300);
  assert(await page.locator('.capacite-serie-apercu').count() === 0, 'aucun apercu de places : elles ne sont pas touchees');
  await confirmerEtEnregistrer(page);
  etat = await lireSerie(serie.id);
  assert(etat.rec.nom === `${NOM} renomme`, 'le nom a bien change');
  assert(etat.cours.find(c => c.id === parDate[S3]).capacite_max === 20, 'la capacite de 20 posee sur UNE seance est conservee');
  assert(etat.rec.capacite_max === 10, 'la recurrence garde 10');

  // ── 7. Zéro refusé ────────────────────────────────────────────────────────
  console.log('\n7. « 0 » est refuse, rien n\'est ecrit');
  await ouvrirPanneau(page, parDate[S1]);
  await champPlaces(page).fill('0');
  await attendre(400);
  const raison = await page.locator('.recurrence-form').innerText();
  assert(/Au moins 1 place/.test(raison), 'la raison du refus est ecrite sous le champ');
  await page.locator('.recurrence-confirm-label input[type="checkbox"]').check();
  await page.getByRole('button', { name: /Modifier les \d+ séances/ }).click();
  await attendre(1500);
  assert(await page.locator('.recurrence-form').count() === 1, 'le panneau reste ouvert : rien n\'a ete enregistre');
  etat = await lireSerie(serie.id);
  assert(etat.rec.capacite_max === 10 && etat.cours.find(c => c.id === parDate[S1]).capacite_max === 10, 'en base, rien n\'a bouge');
  await page.screenshot({ path: join(OUT, '4-refus-zero.png'), fullPage: true });

  assert(erreursConsole.length === 0, `console propre (${erreursConsole.length} erreur(s))`);
  if (erreursConsole.length) erreursConsole.slice(0, 5).forEach(e => console.log('     ', e.slice(0, 200)));

} catch (err) {
  ko++;
  console.error('\nEXCEPTION :', err.message);
} finally {
  if (browser) await browser.close();
  await purger();
  const { count: reste } = await admin.from('cours').select('id', { count: 'exact', head: true }).eq('profile_id', profileId).ilike('nom', `${MARQUEUR}%`);
  console.log(`\nMenage : ${reste ?? '?'} temoin(s) restant(s)`);
}

console.log(`\n${ok} OK / ${ko} KO — captures : ${OUT}`);
process.exit(ko ? 1 : 0);
