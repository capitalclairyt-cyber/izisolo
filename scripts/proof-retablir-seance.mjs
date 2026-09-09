/**
 * Preuve — rétablir une séance annulée (retour Maude, 2026-09-09 : deux
 * séances de séries annulées, Yin Yoga du 14/09 et Yoga du 15/09, qu'elle
 * voulait remettre sans y parvenir).
 *
 * Ce qui la bloquait : l'annulation était « définitive » par construction (la
 * fiche ne proposait que la corbeille), le calendrier de la série comptait la
 * date comme occupée (croix, jamais de « + »), « Ajuster » dédoublonne sur
 * toutes les dates annulées comprises, et recréer à la main fabriquait une
 * séance orpheline hors série (constaté chez elle : Yoga enfants du 15/09 en
 * double).
 *
 * Déroulé (vrai navigateur sur dev local :3333 + DB réelle, compte démo) :
 *   1. Série témoin : une séance PASSÉE annulée, une annulée AVEC 2 inscrites,
 *      une annulée SANS inscrite, une normale.
 *   2. Fiche de l'annulée sans inscrite : bouton « Rétablir cette séance », le
 *      confirm dit « aucun email ne part » → EN BASE est_annule = false, même
 *      id, la bannière disparaît.
 *   3. Fiche de l'annulée avec 2 inscrites : le confirm dit « 2 inscrit·es
 *      reçoivent un email » → EN BASE rétablie, les 2 présences toujours là,
 *      2 traces d'email « cours_retabli » (adresses @example.com : l'envoi
 *      réel est ignoré par le garde-fou RFC 2606, la chaîne est exercée).
 *   4. Rejouer la route sur une séance déjà rétablie → 409, rien n'écrit.
 *   5. La séance PASSÉE annulée : pas de bouton, la raison est écrite.
 *   6. Cours récurrents : la case de l'annulée est rouge barrée avec un ↺,
 *      le compteur « à venir » ne la compte pas, l'aperçu d'« Ajuster » la
 *      nomme au lieu de la recréer, le ↺ la rétablit EN BASE, et il n'existe
 *      toujours qu'UNE séance à cette date (zéro doublon).
 *   7. Ménage : témoins purgés, même en cas d'échec.
 *
 * Usage : node scripts/proof-retablir-seance.mjs [dossier-captures]
 * Prérequis : dev server sur :3333 (npm run dev).
 */
import { createClient } from '@supabase/supabase-js';
import { readFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { decalerJours } from '../lib/serie-jour.js';

const ROOT = process.cwd();
const OUT = process.argv[2] || join(process.env.TEMP || '.', 'proof-retablir-seance');
mkdirSync(OUT, { recursive: true });
const BASE = process.env.PROOF_BASE || 'http://localhost:3333';
const PROF_EMAIL = 'bonjour@melutek.com';
const MARQUEUR = '[preuve retablir]';

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
const S0 = decalerJours(aujourdhui, -7);  // passée, annulée : pas rétablissable
const S1 = decalerJours(aujourdhui, 7);   // annulée AVEC 2 inscrites
const S2 = decalerJours(aujourdhui, 14);  // annulée SANS inscrite
const S3 = decalerJours(aujourdhui, 21);  // normale
const fr = iso => iso.split('-').reverse().join('/');

const purger = async () => {
  const { data: rec } = await admin.from('recurrences').select('id').eq('profile_id', profileId).ilike('nom', `${MARQUEUR}%`);
  const recIds = (rec || []).map(r => r.id);
  const { data: co } = await admin.from('cours').select('id').eq('profile_id', profileId).ilike('nom', `${MARQUEUR}%`);
  const coIds = (co || []).map(c => c.id);
  if (coIds.length) {
    await admin.from('notifications_eleves').delete().in('related_id', coIds);
    await admin.from('cas_a_traiter').delete().in('cours_id', coIds);
    await admin.from('presences').delete().in('cours_id', coIds);
    await admin.from('notifications').delete().in('cours_id', coIds);
    await admin.from('cours').delete().in('id', coIds);
  }
  if (recIds.length) await admin.from('recurrences').delete().in('id', recIds);
  const { data: cl } = await admin.from('clients').select('id').eq('profile_id', profileId).ilike('nom', `${MARQUEUR}%`);
  const clIds = (cl || []).map(c => c.id);
  if (clIds.length) {
    await admin.from('notifications_eleves').delete().in('client_id', clIds);
    await admin.from('presences').delete().in('client_id', clIds);
    await admin.from('clients').delete().in('id', clIds);
  }
};

const lireCours = async (id) => {
  const { data, error } = await admin.from('cours').select('id, date, est_annule, recurrence_parent_id').eq('id', id).maybeSingle();
  if (error) throw new Error(`lecture cours ${id}: ${error.message}`);
  return data;
};

let browser;
try {
  await purger();

  const NOM = `${MARQUEUR} Yin Yoga`;
  const { data: serie, error: eRec } = await admin.from('recurrences').insert({
    profile_id: profileId, nom: NOM, type_cours: 'Yin',
    heure: '18:00', duree_minutes: 60, capacite_max: 10,
    frequence: 'hebdomadaire', jours_semaine: [1], intervalle: 1,
    date_debut: S0, date_fin: S3, actif: true,
  }).select('id').single();
  if (eRec) throw new Error(`recurrence temoin: ${eRec.message}`);

  const { data: seances, error: eCo } = await admin.from('cours').insert(
    // La séance d'AUJOURD'HUI existe (normale) : elle tombe sur le cycle de la
    // série, sans elle « Ajuster » proposerait de la créer et l'assertion « rien
    // à recréer » accuserait le produit d'un artefact de témoin.
    [[S0, true], [aujourdhui, false], [S1, true], [S2, true], [S3, false]].map(([d, annulee]) => ({
      profile_id: profileId, recurrence_parent_id: serie.id,
      nom: NOM, date: d, heure: '18:00', duree_minutes: 60, type_cours: 'Yin',
      capacite_max: 10, visibilite: 'public', est_annule: annulee, lieu: 'Salle témoin',
    }))
  ).select('id, date').order('date');
  if (eCo) throw new Error(`cours temoins: ${eCo.message}`);
  const parDate = Object.fromEntries(seances.map(c => [c.date, c.id]));

  const { data: clientes, error: eCl } = await admin.from('clients').insert(
    [0, 1].map(i => ({
      profile_id: profileId, prenom: `Inscrite${i + 1}`, nom: `${MARQUEUR} Temoin`,
      email: `preuve-retablir-${Date.now()}-${i}@example.com`, statut: 'actif', type_client: 'particulier',
    }))
  ).select('id');
  if (eCl) throw new Error(`clients temoins: ${eCl.message}`);
  const { error: ePr } = await admin.from('presences').insert(
    clientes.map(c => ({ profile_id: profileId, cours_id: parDate[S1], client_id: c.id, statut_pointage: 'inscrit' }))
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
  // Les 409 sont PROVOQUÉS par la preuve (rejeu, séance passée) : Chrome les
  // journalise en erreur réseau, ce n'est pas un défaut du produit.
  const BRUIT_CONNU = [/unique "key" prop.*OuterLayoutRouter/s, /status of 409/];
  const erreursConsole = [];
  const noter = t => { if (!BRUIT_CONNU.some(r => r.test(t))) erreursConsole.push(t); };
  page.on('console', m => { if (m.type() === 'error') noter(m.text()); });
  page.on('pageerror', e => noter(`pageerror: ${e.message}`));
  const dialogues = [];
  page.on('dialog', d => { dialogues.push(d.message()); d.accept(); });

  // Un bouton rendu côté serveur peut recevoir le clic avant son handler :
  // on re-clique jusqu'à l'effet attendu (piège v100).
  const clicJusquA = async (locator, effet, essais = 8) => {
    for (let i = 0; i < essais; i++) {
      await locator.click().catch(() => {});
      await attendre(800);
      if (await effet()) return true;
    }
    return false;
  };

  // ── 1. Annulée sans inscrite : un clic ─────────────────────────────────────
  console.log('\n1. Fiche d\'une annulee sans inscrite : « Retablir cette seance »');
  await page.goto(`${BASE}/cours/${parDate[S2]}`, { waitUntil: 'networkidle' });
  const btnRetablir = page.getByRole('button', { name: /Rétablir cette séance/ });
  assert(await btnRetablir.count() === 1, 'le bouton « Retablir cette seance » est dans la banniere');
  const banniere = await page.locator('.annule-banner').innerText();
  assert(/Rétablis-la/.test(banniere) && /sans doublon/.test(banniere), 'la banniere dit quoi faire et promet « sans doublon »');
  await page.screenshot({ path: join(OUT, '1-banniere-retablir.png'), fullPage: false });
  const nbDialoguesAvant = dialogues.length;
  const fait = await clicJusquA(btnRetablir, async () => (await lireCours(parDate[S2])).est_annule === false);
  assert(fait, 'EN BASE : est_annule = false apres le clic');
  const confirmTexte = dialogues[nbDialoguesAvant] || '';
  assert(/aucun email ne part/.test(confirmTexte), `le confirm disait « aucun email ne part » (lu : « ${confirmTexte.slice(0, 120)}… »)`);
  const apres2 = await lireCours(parDate[S2]);
  assert(apres2 && apres2.recurrence_parent_id === serie.id, 'meme id, toujours dans sa serie (rien recree)');
  await attendre(2000);
  await page.reload({ waitUntil: 'networkidle' });
  assert(await page.locator('.annule-banner').count() === 0, 'la banniere d\'annulation a disparu au rechargement');

  // ── 2. Annulée avec 2 inscrites : prévenues, rien décompté ────────────────
  console.log('\n2. Fiche d\'une annulee avec 2 inscrites');
  await page.goto(`${BASE}/cours/${parDate[S1]}`, { waitUntil: 'networkidle' });
  const nb2 = dialogues.length;
  const fait1 = await clicJusquA(page.getByRole('button', { name: /Rétablir cette séance/ }), async () => (await lireCours(parDate[S1])).est_annule === false);
  assert(fait1, 'EN BASE : la seance avec inscrites est retablie');
  const confirm2 = dialogues[nb2] || '';
  assert(/2 inscrit·es reçoivent un email/.test(confirm2), `le confirm annoncait les 2 emails (lu : « ${confirm2.slice(0, 160)}… »)`);
  assert(/carnets ne bougent pas/.test(confirm2), 'et promettait que les carnets ne bougent pas');
  await attendre(2500);
  const { count: nbPres } = await admin.from('presences').select('id', { count: 'exact', head: true }).eq('cours_id', parDate[S1]);
  assert(nbPres === 2, `les 2 presences sont toujours la (lu : ${nbPres})`);
  const { data: traces } = await admin.from('notifications_eleves').select('client_id, type, statut').eq('related_id', parDate[S1]).eq('type', 'cours_retabli');
  assert((traces || []).length === 2, `2 traces d'email « cours_retabli », une par inscrite (lu : ${(traces || []).length}, statuts ${JSON.stringify((traces || []).map(t => t.statut))})`);

  // ── 3. Rejeu → 409 ────────────────────────────────────────────────────────
  console.log('\n3. Rejouer la route sur une seance deja retablie');
  const rejeu = await page.evaluate(async (id) => {
    const r = await fetch(`/api/cours/${id}/retablir`, { method: 'POST' });
    return { status: r.status, json: await r.json().catch(() => ({})) };
  }, parDate[S1]);
  assert(rejeu.status === 409, `409 au rejeu (lu : ${rejeu.status} ${JSON.stringify(rejeu.json)})`);

  // ── 4. Passée annulée : pas de bouton, la raison ──────────────────────────
  console.log('\n4. Une seance PASSEE annulee ne se retablit pas');
  await page.goto(`${BASE}/cours/${parDate[S0]}`, { waitUntil: 'networkidle' });
  assert(await page.getByRole('button', { name: /Rétablir cette séance/ }).count() === 0, 'aucun bouton sur la seance passee');
  const ban0 = await page.locator('.annule-banner').innerText().catch(() => '');
  assert(/passée/.test(ban0) && /recrée/.test(ban0), `la banniere dit pourquoi et quoi faire (lu : « ${ban0.slice(0, 160)}… »)`);
  const r0 = await page.evaluate(async (id) => (await fetch(`/api/cours/${id}/retablir`, { method: 'POST' })).status, parDate[S0]);
  assert(r0 === 409, `la route refuse aussi (lu : ${r0})`);
  assert((await lireCours(parDate[S0])).est_annule === true, 'EN BASE : la passee reste annulee');

  // ── 5. Cours récurrents : la case annulée, le compteur, Ajuster, le ↺ ─────
  console.log('\n5. Ecran Cours recurrents');
  await admin.from('cours').update({ est_annule: true }).eq('id', parDate[S2]); // on la ré-annule pour le calendrier
  await page.goto(`${BASE}/cours/recurrences?rec=${serie.id}&ajuster=1`, { waitUntil: 'networkidle' });
  await page.waitForSelector('.rec-cal-grid', { timeout: 60000 });
  const compteur = await page.locator('.rec-counter').innerText();
  assert(/\b3\b/.test(compteur) && /cours à venir/.test(compteur), `le compteur ne compte pas l'annulee : 3 a venir sur 4 (lu : « ${compteur.trim()} »)`);
  await page.waitForSelector('.rec-prolonger-panel', { timeout: 30000 });
  await page.waitForFunction(() => document.querySelector('.rec-prolonger-annulees') || /Rien à créer|créée/.test(document.querySelector('.rec-prolonger-preview')?.innerText || ''), null, { timeout: 30000 }).catch(() => {});
  const apercu = await page.locator('.rec-prolonger-preview').innerText().catch(() => '');
  assert(/1 séance annulée/.test(apercu) && apercu.includes(fr(S2).slice(0, 5)), `l'apercu d'Ajuster nomme l'annulee et renvoie au calendrier (lu : « ${apercu.trim().slice(0, 200)} »)`);
  assert(!/1 séance sera créée/.test(apercu), 'et ne propose PAS de la recreer (zero doublon)');

  // Amener le calendrier sur le mois de S2 (au plus 2 mois plus loin).
  const celluleAnnulee = page.locator('.rec-cal-cell.annulee');
  for (let i = 0; i < 3 && (await celluleAnnulee.count()) === 0; i++) {
    await page.locator('.rec-cal-header .rec-icon-btn').nth(1).click();
    await attendre(400);
  }
  assert(await celluleAnnulee.count() === 1, 'la case de l\'annulee est marquee « annulee » dans le calendrier');
  const titre = await celluleAnnulee.getAttribute('title');
  assert(/ANNULÉE/.test(titre || '') && /rétablir/.test(titre || ''), `son titre le dit et propose de retablir (lu : « ${titre} »)`);
  const styleCase = await celluleAnnulee.evaluate(el => ({ deco: getComputedStyle(el.querySelector('.rec-cal-day')).textDecorationLine, bg: getComputedStyle(el).backgroundColor }));
  assert(styleCase.deco.includes('line-through'), `le numero du jour est barre (lu : ${styleCase.deco})`);
  assert(await page.locator('.rec-cal-legend').innerText().then(t => /annulée/.test(t)), 'la legende explique la case rouge');
  await page.screenshot({ path: join(OUT, '2-calendrier-annulee.png'), fullPage: true });
  const btnCal = celluleAnnulee.getByRole('button', { name: /Rétablir cette séance annulée/ });
  assert(await btnCal.count() === 1, 'la case porte le bouton ↺ et pas la croix');
  assert(await celluleAnnulee.getByRole('button', { name: /Supprimer ce cours/ }).count() === 0, 'aucune croix « supprimer » sur une annulee');
  await celluleAnnulee.hover();
  const faitCal = await clicJusquA(btnCal, async () => (await lireCours(parDate[S2])).est_annule === false);
  assert(faitCal, 'EN BASE : le ↺ du calendrier a retabli la seance');
  await attendre(800);
  assert(await page.locator('.rec-cal-cell.annulee').count() === 0, 'la case n\'est plus marquee annulee a l\'ecran');
  const { count: nbADate } = await admin.from('cours').select('id', { count: 'exact', head: true }).eq('recurrence_parent_id', serie.id).eq('date', S2);
  assert(nbADate === 1, `UNE seule seance a cette date, jamais un doublon (lu : ${nbADate})`);
  const compteurApres = await page.locator('.rec-counter').innerText();
  assert(/\b4\b/.test(compteurApres), `le compteur passe a 4 a venir (lu : « ${compteurApres.trim()} »)`);
  const puce = await page.locator('.rec-chip.selected .rec-chip-meta').innerText();
  assert(/4 à venir/.test(puce), `la puce de la serie dit aussi 4 a venir (lu : « ${puce.trim()} »)`);

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
