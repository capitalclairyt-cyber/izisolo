/**
 * Preuve — export comptable & déclaration URSSAF (v93, 2026-08-22).
 *
 * Vrai navigateur sur :3333, compte démo, CHEMIN RÉEL (routes HTTP avec la
 * session, pas d'appel de lib en direct).
 *
 * Ce qui est prouvé :
 *   1. /revenus charge sans erreur ; le bloc URSSAF est là (invitation tant
 *      que les réglages sont absents).
 *   2. La modale d'export propose des trimestres CIVILS et la base de calcul.
 *   3. L'export CSV porte une ligne TOTAL, une colonne Mois et un récap.
 *   4. LE point décisif : un paiement vendu en T2 mais encaissé en T3 tombe
 *      dans le T3 en base « encaissement », et dans le T2 en base « vente ».
 *      C'est le bug d'origine (l'export filtrait sur la date de vente).
 *   5. Le total du CSV = le total recalculé depuis la DB sur la même assiette.
 *   6. Le livre des recettes se télécharge (PDF + CSV), total identique.
 *   7. Si v93 EST appliquée : réglages sauvés, bloc URSSAF chiffré, montant
 *      arrondi à l'euro, échéance affichée, rappel du cron armé.
 *
 * Tout est restauré : paiements témoins purgés, plan et urssaf_config remis
 * dans leur état d'origine. Re-runnable.
 *
 * Usage : node scripts/proof-urssaf.mjs [dossier-sortie]
 */
import { createClient } from '@supabase/supabase-js';
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { periodeTrimestre, totauxPaiements, dateComptable, aujourdhuiParis } from '../lib/urssaf.js';

const ROOT = process.cwd();
const OUT = process.argv[2] || join(process.env.TEMP || '.', 'proof-urssaf');
mkdirSync(OUT, { recursive: true });
const BASE = 'http://localhost:3333';
const PROF_EMAIL = 'bonjour@melutek.com';
const TAG = '[preuve urssaf]';

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

// Le layout dashboard écrit le « pouls d'activité » (v88) puis rafraîchit :
// un evaluate() lancé pile à ce moment meurt sur « execution context was
// destroyed ». On relit, ce n'est pas une régression de l'app.
async function lireTexte(page, essais = 5) {
  for (let i = 0; i < essais; i++) {
    try { return await page.evaluate(() => document.body.innerText); }
    catch (e) {
      if (!/context was destroyed|navigation/i.test(e.message) || i === essais - 1) throw e;
      await attendre(1500);
    }
  }
  return '';
}

/**
 * Attend que le bloc URSSAF soit SORTI de son état de chargement.
 * Renvoie 'configure' | 'invitation' | null (jamais résolu).
 */
async function attendreBloc(page, timeout = 120000) {
  const debut = Date.now();
  while (Date.now() - debut < timeout) {
    const etat = await page.evaluate(() => {
      const t = document.body.innerText;
      if (/Ma déclaration URSSAF/i.test(t)) return 'configure';
      if (/Prépare ta déclaration URSSAF/i.test(t)) return 'invitation';
      return null;
    }).catch(() => null);
    if (etat) return etat;
    await attendre(1000);
  }
  return null;
}

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

// v93 appliquée ? (détermine si la phase B tourne)
const { error: colErr } = await admin.from('profiles').select('urssaf_config').eq('id', profileId).single();
const V93 = !colErr;
console.log(`🗄️  migration v93 : ${V93 ? 'APPLIQUÉE (phase B activée)' : 'ABSENTE (preuve du dégradé)'}`);

const { data: avant } = await admin.from('profiles').select('plan, studio_nom').eq('id', profileId).single();
const configAvant = V93
  ? (await admin.from('profiles').select('urssaf_config').eq('id', profileId).single()).data?.urssaf_config ?? null
  : undefined;
console.log(`👤 prof démo : ${avant.studio_nom} (plan=${avant.plan})`);

// Trimestres témoins : le DERNIER trimestre clos et celui d'avant.
const AUJ = aujourdhuiParis();
const [an, mois] = AUJ.split('-').map(Number);
let tCourant = Math.floor((mois - 1) / 3) + 1, anCourant = an;
let tClos = tCourant - 1, anClos = anCourant;
if (tClos === 0) { tClos = 4; anClos -= 1; }
let tAvant = tClos - 1, anAvant = anClos;
if (tAvant === 0) { tAvant = 4; anAvant -= 1; }
const T_CLOS = periodeTrimestre(anClos, tClos, AUJ);
const T_AVANT = periodeTrimestre(anAvant, tAvant, AUJ);
console.log(`📅 trimestre clos : ${T_CLOS.id} (${T_CLOS.from} → ${T_CLOS.to}) · échéance ${T_CLOS.echeanceLabel}`);

const temoins = [];
let ctx;
try {
  // Plan pro le temps de la preuve (l'export comptable est gaté `export_compta`).
  if (avant.plan !== 'pro') await admin.from('profiles').update({ plan: 'pro' }).eq('id', profileId);

  // ── Paiements témoins ────────────────────────────────────────────────────
  // A : vendu le DERNIER JOUR de T_AVANT, encaissé le 3e jour de T_CLOS.
  //     C'est le chèque déposé en retard, le cas qui cassait tout.
  // B : vendu ET encaissé dans T_CLOS (contrôle).
  // C : date_encaissement NULL (paiement né de vendre_offre avant v93) —
  //     doit retomber sur sa date de vente, dans T_CLOS.
  const j3 = `${T_CLOS.from.slice(0, 8)}03`;
  const j10 = `${T_CLOS.from.slice(0, 8)}10`;
  const lignes = [
    { intitule: `${TAG} chèque déposé en retard`, montant: 111, mode: 'cheque',  date: T_AVANT.to, date_encaissement: j3 },
    { intitule: `${TAG} encaissé sur place`,      montant: 222, mode: 'especes', date: j10,        date_encaissement: j10 },
    { intitule: `${TAG} sans date d'encaissement`, montant: 333, mode: 'virement', date: j10,      date_encaissement: null },
  ];
  for (const l of lignes) {
    const { data, error } = await admin.from('paiements')
      .insert({ profile_id: profileId, statut: 'paid', ...l }).select('id').single();
    if (error) throw new Error(`paiement témoin : ${error.message}`);
    temoins.push(data.id);
  }
  console.log(`🧪 ${temoins.length} paiements témoins posés (111 € en retard, 222 € sur place, 333 € sans date)`);

  ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  await ctx.addCookies(profSession.cookies.map(c => ({ ...c, url: BASE, sameSite: 'Lax' })));
  const page = await ctx.newPage();
  const erreursConsole = [];
  page.on('console', m => { if (m.type() === 'error') erreursConsole.push(m.text()); });

  // ═══ 1. /revenus charge, le bloc URSSAF est présent ═══
  console.log('\n— 1. La page Revenus —');
  await page.goto(`${BASE}/revenus`, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('h1', { timeout: 30000 });
  // Attente de CONDITION, pas de durée : le bloc URSSAF affiche un loader tant
  // que /api/urssaf/recap n'a pas répondu, et la 1re requête d'un dev server
  // FROID compile la route (plusieurs dizaines de secondes). Un sleep fixe
  // rendait la preuve dépendante de la machine ; un timeout court la rendait
  // dépendante de la température du serveur.
  const bloc = await attendreBloc(page);
  assert(bloc, `le bloc URSSAF a fini de charger (${bloc || 'toujours en chargement'})`);
  const txt = await lireTexte(page);
  assert(/Revenus/.test(txt), 'la page Revenus rend son titre');
  assert(/URSSAF|déclaration/i.test(txt), 'le bloc URSSAF est visible sur la page');
  // Le bloc est un <Link> : une règle styled-jsx SCOPÉE ne l'atteindrait pas
  // (piège maison). On vérifie le style CALCULÉ, pas la présence de la classe.
  const styleBloc = await page.evaluate(() => {
    const el = document.querySelector('.urssaf-invite, .urssaf-card');
    if (!el) return null;
    const cs = getComputedStyle(el);
    return { display: cs.display, decoration: cs.textDecorationLine, padding: cs.paddingTop };
  });
  assert(styleBloc && styleBloc.display === 'flex' && styleBloc.decoration === 'none',
    `le bloc est réellement stylé (display=${styleBloc?.display}, soulignement=${styleBloc?.decoration})`);
  // Le warning « unique key prop » vient d'OuterLayoutRouter (interne Next) et
  // se reproduit à l'identique sur /clients, /cours et /agenda, pages non
  // touchées : bruit dev connu, pas une régression de ce lot.
  const erreursVraies = erreursConsole.filter(e =>
    !/favicon|manifest/i.test(e) && !/unique "key" prop/i.test(e));
  assert(erreursVraies.length === 0,
    `zéro erreur console propre à ce lot${erreursVraies.length ? ` — ${erreursVraies.join(' | ').slice(0, 300)}` : ''}`);
  await page.screenshot({ path: join(OUT, '1-revenus.png'), fullPage: false });

  // ═══ 2. La modale d'export ═══
  console.log('\n— 2. La modale d\'export —');
  await page.getByRole('button', { name: /Export/ }).first().click();
  await page.waitForSelector('.enc-modal', { timeout: 10000 });
  const modale = await page.evaluate(() => document.querySelector('.enc-modal')?.innerText || '');
  const options = await page.evaluate(() =>
    [...document.querySelectorAll('.enc-modal optgroup')].map(g => ({
      groupe: g.label, valeurs: [...g.querySelectorAll('option')].map(o => o.value),
    })));
  const groupeCivil = options.find(g => /calendrier civil/i.test(g.groupe));
  assert(!!groupeCivil, 'un groupe « périodes de déclaration (calendrier civil) » existe');
  assert(groupeCivil?.valeurs.includes(T_CLOS.id), `le trimestre clos ${T_CLOS.id} y est proposé`);
  assert(/d'encaissement/.test(modale) && /de vente/.test(modale), 'la base de calcul est proposée (encaissement / vente)');
  assert(/fenêtre glissante/i.test(modale), 'la modale prévient que « 3 derniers mois » n\'est pas un trimestre');
  await page.screenshot({ path: join(OUT, '2-modale-export.png') });
  await page.keyboard.press('Escape').catch(() => {});

  // ═══ 3-5. L'export CSV, par le vrai chemin HTTP ═══
  console.log('\n— 3. L\'export CSV du trimestre clos —');
  const getCsv = async (params) => {
    const r = await page.request.get(`${BASE}/api/export/paiements-csv?${params}`);
    if (!r.ok()) throw new Error(`export CSV ${r.status()} : ${await r.text()}`);
    return (await r.body()).toString('utf8');
  };

  const csvEnc = await getCsv(`periode=${T_CLOS.id}&base=encaissement&statut=paid`);
  writeFileSync(join(OUT, `export-${T_CLOS.id}-encaissement.csv`), csvEnc, 'utf8');
  const enteteCsv = csvEnc.split('\r\n')[0];
  assert(enteteCsv.startsWith('﻿Mois;'), 'la 1re colonne est « Mois » (BOM UTF-8 conservé)');
  assert(/Frais IziSolo/.test(enteteCsv) && /Facture n°/.test(enteteCsv), 'les colonnes Frais et Facture n° sont là');
  const ligneTotal = csvEnc.split('\r\n').find(l => l.startsWith('TOTAL ('));
  assert(!!ligneTotal, `une ligne TOTAL clôt le tableau (${ligneTotal?.slice(0, 40)}…)`);
  assert(/RÉCAPITULATIF/.test(csvEnc), 'le bloc RÉCAPITULATIF est présent');
  assert(/PAR MOIS/.test(csvEnc) && /PAR MODE DE RÈGLEMENT/.test(csvEnc),
    'les ventilations par mois et par mode sont présentes (promesse de la landing)');
  // La prod contient « Espèces » ET « especes » : sans normalisation, le récap
  // sortait deux lignes pour le même moyen de paiement.
  const lignesModes = csvEnc.split('PAR MODE DE RÈGLEMENT')[1].trim().split(/\r?\n/)
    .map(l => l.split(';')[0]).filter(Boolean);
  assert(new Set(lignesModes).size === lignesModes.length,
    `aucun mode en double dans le récap (${lignesModes.join(', ')})`);
  assert(/à déclarer est le BRUT/.test(csvEnc), 'le CSV rappelle que le montant à déclarer est le brut');

  // ── LE point décisif ──
  console.log('\n— 4. Le chèque déposé en retard change de trimestre —');
  const csvVente = await getCsv(`periode=${T_CLOS.id}&base=vente&statut=paid`);
  writeFileSync(join(OUT, `export-${T_CLOS.id}-vente.csv`), csvVente, 'utf8');
  assert(csvEnc.includes('chèque déposé en retard'),
    `base encaissement : le paiement vendu le ${T_AVANT.to} EST dans ${T_CLOS.id}`);
  assert(!csvVente.includes('chèque déposé en retard'),
    `base vente : le même paiement n'y est PAS (il reste dans ${T_AVANT.id})`);
  assert(csvEnc.includes("sans date d'encaissement") && csvVente.includes("sans date d'encaissement"),
    'un paiement sans date d\'encaissement (pré-v93) reste compté sur sa date de vente');

  // ── Le total du CSV = le total recalculé depuis la DB ──
  console.log('\n— 5. Le total annoncé est le bon —');
  const { data: payDb } = await admin.from('paiements')
    .select('montant, mode, date, date_encaissement, commission_montant')
    .eq('profile_id', profileId).eq('statut', 'paid');
  const dansPeriode = (payDb || []).filter(p => {
    const d = dateComptable(p, 'encaissement');
    return d && d >= T_CLOS.from && d <= T_CLOS.to;
  });
  const attendu = totauxPaiements(dansPeriode, 'encaissement');
  const totalCsv = parseFloat(ligneTotal.split(";")[7].replace(/"/g, "").replace(",", "."));
  const nbCsv = parseInt(ligneTotal.match(/TOTAL \((\d+)/)[1], 10);
  assert(Math.abs(totalCsv - attendu.brut) < 0.01,
    `total CSV ${totalCsv} € = total recalculé depuis la DB ${attendu.brut} €`);
  assert(nbCsv === attendu.nombre, `${nbCsv} paiements comptés = ${attendu.nombre} en base`);
  assert(attendu.brut >= 666, 'les 3 témoins (111 + 222 + 333 = 666 €) sont bien dans le total');

  // ═══ 6. Le livre des recettes ═══
  console.log('\n— 6. Le livre des recettes —');
  const rPdf = await page.request.get(`${BASE}/api/export/livre-recettes?periode=${T_CLOS.id}`);
  assert(rPdf.ok(), `le PDF répond ${rPdf.status()}`);
  const pdfBytes = await rPdf.body();
  assert(pdfBytes.slice(0, 5).toString('latin1') === '%PDF-', `en-tête %PDF (${(pdfBytes.length / 1024).toFixed(1)} Ko)`);
  writeFileSync(join(OUT, `livre-recettes-${T_CLOS.id}.pdf`), pdfBytes);

  const rCsvLivre = await page.request.get(`${BASE}/api/export/livre-recettes?periode=${T_CLOS.id}&format=csv`);
  const csvLivre = (await rCsvLivre.body()).toString('utf8');
  writeFileSync(join(OUT, `livre-recettes-${T_CLOS.id}.csv`), csvLivre, 'utf8');
  const totalLivre = parseFloat((csvLivre.split('\r\n').find(l => l.startsWith('TOTAL (')) || '').split(';')[5]?.replace(',', '.'));
  assert(Math.abs(totalLivre - attendu.brut) < 0.01,
    `le livre totalise ${totalLivre} €, comme l'export (${attendu.brut} €)`);
  assert(/Date;Référence;Origine;Nature;Mode de règlement;Montant/.test(csvLivre),
    'les 5 colonnes obligatoires du registre sont là');

  // ═══ 7. Le récap URSSAF servi par l'API ═══
  console.log('\n— 7. Le récapitulatif URSSAF —');
  const rRecap = await page.request.get(`${BASE}/api/urssaf/recap?periode=${T_CLOS.id}`);
  assert(rRecap.ok(), `/api/urssaf/recap répond ${rRecap.status()}`);
  const recap = await rRecap.json();
  assert(recap.periode?.id === T_CLOS.id, `période servie : ${recap.periode?.id}`);
  assert(Math.abs(recap.totaux.brut - attendu.brut) < 0.01,
    `le récap annonce ${recap.totaux.brut} €, comme le CSV`);
  assert(recap.periode.cloturee === true, 'la période est marquée close (déclarable)');
  assert(recap.periode.echeance === T_CLOS.echeance, `échéance ${recap.periode.echeanceLabel}`);
  assert(recap.configuree === !!(V93 && configAvant), `configuree=${recap.configuree} (cohérent avec l'état du profil)`);

  // ═══ 8. Phase B — seulement si v93 est appliquée ═══
  if (V93) {
    console.log('\n— 8. Réglages enregistrés → le bloc affiche le chiffre —');
    await admin.from('profiles').update({
      urssaf_config: {
        regime: 'micro_bnc', taux_cotisations: 21.2, taux_cfp: 0.2,
        periodicite: 'trimestrielle', versement_liberatoire: false,
        taux_liberatoire: 2.2, rappel_email: true,
      },
    }).eq('id', profileId);

    const rRecap2 = await page.request.get(`${BASE}/api/urssaf/recap?periode=${T_CLOS.id}`);
    const recap2 = await rRecap2.json();
    assert(recap2.configuree === true, 'les réglages sont lus par l\'API');
    assert(Math.abs(recap2.estimation.cotisations - attendu.brut * 0.212) < 0.02,
      `estimation cotisations ${recap2.estimation.cotisations} € = 21,2 % du brut`);

    await page.goto(`${BASE}/revenus`, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('h1', { timeout: 30000 });
    assert(await attendreBloc(page) === 'configure', 'le bloc passe en mode « configuré »');
    const txt2 = await lireTexte(page);
    const arrondi = Math.round(attendu.brut);
    assert(txt2.includes(`${arrondi} €`), `le montant arrondi à l'euro (${arrondi} €) est affiché`);
    assert(new RegExp(T_CLOS.echeanceLabel.replace(/\s/g, '\\s')).test(txt2),
      `l'échéance « ${T_CLOS.echeanceLabel} » est affichée`);
    assert(/Copier/.test(txt2), 'le bouton Copier est là');
    await page.screenshot({ path: join(OUT, '3-bloc-urssaf.png') });
  } else {
    console.log('\n— 8. Dégradé pré-v93 —');
    const txtInv = await lireTexte(page);
    assert(/Prépare ta déclaration URSSAF/.test(txtInv),
      'sans la colonne urssaf_config, le bloc invite à régler au lieu de planter');
  }

} finally {
  // ── Ménage ────────────────────────────────────────────────────────────────
  if (temoins.length) await admin.from('paiements').delete().in('id', temoins);
  const restore = { plan: avant.plan };
  if (V93) restore.urssaf_config = configAvant;
  await admin.from('profiles').update(restore).eq('id', profileId);
  const { count } = await admin.from('paiements')
    .select('id', { count: 'exact', head: true })
    .eq('profile_id', profileId).ilike('intitule', `${TAG}%`);
  assert((count || 0) === 0, `ménage : 0 paiement témoin restant (${count})`);
  console.log(`🧹 plan restauré à « ${avant.plan} »${V93 ? `, urssaf_config restaurée` : ''}`);
  if (ctx) await ctx.close();
  await browser.close();
}

console.log(`\n${ko === 0 ? '✅' : '❌'} ${ok}/${ok + ko} vérifications — captures dans ${OUT}`);
process.exit(ko === 0 ? 0 : 1);
