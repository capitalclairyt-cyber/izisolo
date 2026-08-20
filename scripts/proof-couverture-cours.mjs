/**
 * Preuve — bloc « Payable avec » de la fiche du cours (feedback Camille
 * 2026-08-20) : affichage de la couverture carnets/abos + édition A (la
 * bascule écrit dans offres.types_cours_autorises, jamais par cours).
 *
 * Déroulé (vrai navigateur sur dev local :3333 + DB réelle, compte démo) :
 *   1. Cours typé + 2 offres témoins (A restreinte au type, B « tous ») →
 *      le bloc liste les deux cochées, avec leurs sous-libellés.
 *   2. Décocher A (restreinte à CE seul type) → REFUS explicite (toast),
 *      DB intacte (le piège « liste vidée = couvre tout » est fermé).
 *   3. Décocher B → confirmation (texte « TOUS tes cours » + effet global),
 *      DB : B restreinte au catalogue moins le type, case décochée.
 *   4. Recocher B → DB : le type revient dans la liste.
 *   5. Cours SANS type → alerte « couvert par tous » + cases figées.
 *   6. Atelier pur (tarif, mixte décoché) → « À l'unité (15 €) uniquement ».
 *   7. Cours MIXTE (tarif + carnets_acceptes) → liste + filet « 15 € ».
 *   8. Ménage : témoins purgés (re-runnable, aucun email envoyé).
 *
 * Usage : node scripts/proof-couverture-cours.mjs [dossier-captures]
 */
import { createClient } from '@supabase/supabase-js';
import { readFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { getAllTypesFromCategories } from '../lib/utils.js';

const ROOT = process.cwd();
const OUT = process.argv[2] || join(process.env.TEMP || '.', 'proof-couverture');
mkdirSync(OUT, { recursive: true });
const BASE = 'http://localhost:3333';
const PROF_EMAIL = 'bonjour@melutek.com';
const MARQUEUR = '[preuve couv]';

const env = Object.fromEntries(
  readFileSync(join(ROOT, '.env.local'), 'utf8')
    .split('\n').filter(l => l.includes('=') && !l.startsWith('#'))
    .map(l => [l.slice(0, l.indexOf('=')).trim(), l.slice(l.indexOf('=') + 1).trim()])
);
const PROJECT_REF = new URL(env.NEXT_PUBLIC_SUPABASE_URL).hostname.split('.')[0];
const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

let ok = 0, ko = 0;
const assert = (cond, label) => {
  if (cond) { ok++; console.log(`  ✅ ${label}`); }
  else { ko++; console.log(`  ❌ ${label}`); }
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
  if (i === 59) { console.error('dev server injoignable'); process.exit(1); }
}
console.log('🌐 dev server prêt');

let chromium;
try { ({ chromium } = await import('playwright')); }
catch { ({ chromium } = await import('@playwright/test')); }
let browser;
try { browser = await chromium.launch(); }
catch { browser = await chromium.launch({ channel: 'msedge' }); }

const profSession = await sessionCookies(PROF_EMAIL);
const profileId = profSession.userId;
const { data: profil } = await admin.from('profiles').select('studio_nom, types_cours').eq('id', profileId).maybeSingle();
const catalogue = getAllTypesFromCategories(profil?.types_cours);
console.log(`👤 prof démo : ${profil?.studio_nom} — catalogue de types : ${catalogue.join(', ') || '(vide)'}`);
if (catalogue.length < 2) {
  console.error('⚠️ Le démo a moins de 2 types de cours — la preuve « décocher une offre libre » a besoin d\'un reste. Abandon propre.');
  process.exit(1);
}
const T1 = catalogue[0];

const purger = async () => {
  await admin.from('cours').delete().eq('profile_id', profileId).ilike('nom', `${MARQUEUR}%`);
  await admin.from('offres').delete().eq('profile_id', profileId).ilike('nom', `${MARQUEUR}%`);
};

let page, ctx;
try {
  // ═══ 0. Ménage préalable + témoins ═══
  await purger();
  console.log('🧹 témoins d\'un éventuel run précédent purgés');

  const demain = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
  const { data: offreA, error: eA } = await admin.from('offres')
    .insert({ profile_id: profileId, nom: `${MARQUEUR} Carnet A`, type: 'carnet', prix: 50, seances: 10, actif: true, types_cours_autorises: [T1] })
    .select('id').single();
  if (eA) throw new Error(`insert offre A : ${eA.message}`);
  const { data: offreB, error: eB } = await admin.from('offres')
    .insert({ profile_id: profileId, nom: `${MARQUEUR} Carnet B`, type: 'carnet', prix: 90, seances: 20, actif: true, types_cours_autorises: null })
    .select('id').single();
  if (eB) throw new Error(`insert offre B : ${eB.message}`);
  const insCours = (extra) => admin.from('cours')
    .insert({ profile_id: profileId, date: demain, heure: '18:00', duree_minutes: 60, capacite_max: 8, ...extra })
    .select('id').single();
  const { data: c1, error: eC1 } = await insCours({ nom: `${MARQUEUR} Cours typé`, type_cours: T1 });
  if (eC1) throw new Error(`insert cours typé : ${eC1.message}`);
  const { data: c2 } = await insCours({ nom: `${MARQUEUR} Cours sans type`, type_cours: null });
  const { data: c3 } = await insCours({ nom: `${MARQUEUR} Atelier pur`, type_cours: T1, tarif_unitaire: 15, carnets_acceptes: false });
  const { data: c4 } = await insCours({ nom: `${MARQUEUR} Cours mixte`, type_cours: T1, tarif_unitaire: 15, carnets_acceptes: true });
  console.log(`🌱 témoins créés (type « ${T1} », séance du ${demain})`);

  ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  await ctx.addCookies(profSession.cookies.map(c => ({ ...c, url: BASE, sameSite: 'Lax' })));
  page = await ctx.newPage();

  // ═══ 1. Affichage : les 2 offres listées, cochées, sous-libellés justes ═══
  console.log('\n— 1. Le bloc « Payable avec » dit qui couvre —');
  await page.goto(`${BASE}/cours/${c1.id}`, { waitUntil: 'domcontentloaded', timeout: 90000 });
  await page.waitForSelector('.couv-card', { timeout: 30000 });
  // Le HTML serveur ne prouve PAS l'hydratation : sur le dev server, la 1re
  // compilation retarde le montage React — un clic trop tôt part dans le vide.
  await page.waitForLoadState('networkidle', { timeout: 60000 }).catch(() => {});
  await attendre(1500);
  const rowA = page.locator('.couv-row', { hasText: `${MARQUEUR} Carnet A` });
  const rowB = page.locator('.couv-row', { hasText: `${MARQUEUR} Carnet B` });
  assert(await rowA.count() === 1 && await rowB.count() === 1, 'les 2 offres témoins sont listées');
  assert(await rowA.locator('input').isChecked(), `Carnet A (limité à ${T1}) est coché`);
  assert(await rowB.locator('input').isChecked(), 'Carnet B (libre) est coché');
  assert((await rowA.innerText()).includes('limité à'), 'sous-libellé « limité à » sur A');
  assert((await rowB.innerText()).includes('couvre tous tes cours'), 'sous-libellé « couvre tous tes cours » sur B');
  await page.screenshot({ path: join(OUT, '1-bloc-payable-avec.png'), fullPage: false });

  // ═══ 2. Décocher A (dernier type) → refus, DB intacte ═══
  console.log('\n— 2. Décocher une offre restreinte à CE seul type = refus —');
  await rowA.locator('input').click();
  let toastTxt = '';
  for (let i = 0; i < 10 && !toastTxt; i++) {
    await attendre(500);
    toastTxt = (await page.locator('.toast-message').allInnerTexts()).join(' | ');
  }
  assert(toastTxt.includes('valable QUE pour les cours'), `toast de refus affiché (« ${toastTxt.slice(0, 80)}… »)`);
  const { data: aApres } = await admin.from('offres').select('types_cours_autorises').eq('id', offreA.id).single();
  assert(JSON.stringify(aApres.types_cours_autorises) === JSON.stringify([T1]), 'DB : la restriction de A n\'a pas bougé');
  await page.screenshot({ path: join(OUT, '2-refus-dernier-type.png') });

  // ═══ 3. Décocher B (libre) → confirmation honnête, restreinte au reste ═══
  console.log('\n— 3. Décocher l\'offre libre = confirmation + restriction au reste —');
  let dialogMsg = '';
  page.once('dialog', d => { dialogMsg = d.message(); d.accept(); });
  await rowB.locator('input').click();
  assert(dialogMsg || await (async () => { await attendre(1000); return dialogMsg; })(), 'la confirmation s\'est affichée');
  assert(dialogMsg.includes('TOUS tes cours'), 'la confirmation annonce l\'effet global (« TOUS tes cours »)');
  assert(dialogMsg.includes('gardent leur périmètre'), 'la confirmation rappelle le snapshot des carnets vendus');
  // L'update part du navigateur : on POLLE la DB au lieu de lire trop tôt.
  let bOff = null;
  for (let i = 0; i < 15; i++) {
    await attendre(700);
    const { data } = await admin.from('offres').select('types_cours_autorises').eq('id', offreB.id).single();
    if (Array.isArray(data?.types_cours_autorises) && data.types_cours_autorises.length > 0) { bOff = data; break; }
  }
  assert(bOff
    && !bOff.types_cours_autorises.includes(T1)
    && bOff.types_cours_autorises.length === catalogue.length - 1,
    `DB : B restreinte au reste du catalogue (${(bOff?.types_cours_autorises || []).join(', ') || 'jamais écrite'})`);
  assert(!(await rowB.locator('input').isChecked()), 'la case B est décochée dans l\'UI');
  await page.screenshot({ path: join(OUT, '3-b-decochee.png') });

  // ═══ 4. Recocher B → le type revient ═══
  console.log('\n— 4. Recocher = le type revient dans la liste de B —');
  page.once('dialog', d => d.accept());
  await rowB.locator('input').click();
  let bOn = null;
  for (let i = 0; i < 15; i++) {
    await attendre(700);
    const { data } = await admin.from('offres').select('types_cours_autorises').eq('id', offreB.id).single();
    if (data?.types_cours_autorises?.includes(T1)) { bOn = data; break; }
  }
  assert(bOn && bOn.types_cours_autorises.includes(T1), `DB : « ${T1} » est revenu dans B`);
  assert(await rowB.locator('input').isChecked(), 'la case B est recochée dans l\'UI');

  // ═══ 5. Cours sans type → alerte + cases figées ═══
  console.log('\n— 5. Cours sans type : couvert par tout, bascule impossible —');
  await page.goto(`${BASE}/cours/${c2.id}`, { waitUntil: 'domcontentloaded', timeout: 90000 });
  await page.waitForSelector('.couv-card', { timeout: 30000 });
  assert(await page.locator('.couv-alerte').count() === 1, 'alerte « ce cours n\'a pas de type » affichée');
  assert(await page.locator('.couv-row input').first().isDisabled(), 'les cases sont figées');
  await page.screenshot({ path: join(OUT, '5-sans-type.png') });

  // ═══ 6. Atelier pur → « À l'unité uniquement » ═══
  console.log('\n— 6. Atelier pur : à l\'unité, personne ne décompte —');
  await page.goto(`${BASE}/cours/${c3.id}`, { waitUntil: 'domcontentloaded', timeout: 90000 });
  await page.waitForSelector('.couv-card', { timeout: 30000 });
  assert(await page.getByText('À l\'unité (15 €) uniquement').count() > 0, 'message « À l\'unité (15 €) uniquement »');
  assert(await page.locator('.couv-row').count() === 0, 'aucune liste d\'offres (elles ne décomptent pas)');
  await page.screenshot({ path: join(OUT, '6-atelier-pur.png') });

  // ═══ 7. Cours mixte → liste + filet tarif ═══
  console.log('\n— 7. Cours mixte : carnets compatibles + filet 15 € —');
  await page.goto(`${BASE}/cours/${c4.id}`, { waitUntil: 'domcontentloaded', timeout: 90000 });
  await page.waitForSelector('.couv-card', { timeout: 30000 });
  assert(await page.locator('.couv-row').count() >= 2, 'la liste des offres est affichée (mixte)');
  assert(await page.getByText('règlent 15 € la séance').count() > 0, 'filet « les élèves sans carnet compatible règlent 15 € »');
  assert((await page.locator('.detail-value', { hasText: 'à la séance' }).innerText()).includes('les carnets compatibles décomptent'),
    'la ligne Tarif ne ment plus sur un mixte');
  await page.screenshot({ path: join(OUT, '7-mixte.png') });
} finally {
  await purger();
  console.log('\n🧹 témoins purgés');
  try { await ctx?.close(); await browser?.close(); } catch { /* rien */ }
}

console.log(`\n═══ RÉSULTAT : ${ok} ✅ · ${ko} ❌ — captures dans ${OUT} ═══`);
process.exit(ko === 0 ? 0 : 1);
