/**
 * Preuve — la déclaration À L'ÉCRAN + son archive (v94, 2026-08-22).
 *
 * Vrai navigateur sur :3333, compte démo, CHEMIN RÉEL.
 *
 *   1. /revenus/declaration/<periode> s'ouvre et affiche le détail LIGNE À
 *      LIGNE, sans qu'on ait rien téléchargé.
 *   2. Ses chiffres sont ceux de /api/urssaf/recap et du CSV : une seule
 *      vérité, trois surfaces.
 *   3. Le bloc Revenus et la modale d'export y mènent vraiment.
 *   4. Pré-v94 : la page marche, l'archive se tait, « J'ai déclaré » le dit
 *      honnêtement au lieu de faire semblant.
 *   5. Post-v94 : la consultation est tracée, « J'ai déclaré » FIGE le
 *      montant, et si la période change ensuite, l'ÉCART est signalé — c'est
 *      tout l'intérêt de l'archive.
 *
 * Paiement témoin purgé, archive restaurée. Re-runnable.
 * Usage : node scripts/proof-declaration-ecran.mjs [dossier-sortie]
 */
import { createClient } from '@supabase/supabase-js';
import { readFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { periodeTrimestre, aujourdhuiParis } from '../lib/urssaf.js';

const ROOT = process.cwd();
const OUT = process.argv[2] || join(process.env.TEMP || '.', 'proof-declaration');
mkdirSync(OUT, { recursive: true });
const BASE = 'http://localhost:3333';
const PROF_EMAIL = 'bonjour@melutek.com';
const TAG = '[preuve declaration]';

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

async function naviguer(page, url, essais = 3) {
  for (let i = 0; i < essais; i++) {
    try { await page.goto(url, { waitUntil: 'domcontentloaded' }); return; }
    catch (e) {
      if (!/ERR_ABORTED|interrupted/i.test(e.message) || i === essais - 1) throw e;
      await attendre(1500);
    }
  }
}

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

const prof = await sessionCookies(PROF_EMAIL);
const profileId = prof.userId;

const { error: colErr } = await admin.from('declarations_urssaf').select('id').limit(1);
const V94 = !colErr;
console.log(`🗄️  migration v94 : ${V94 ? 'APPLIQUÉE (phase B activée)' : 'ABSENTE (preuve du dégradé)'}`);

// Le dernier trimestre CLOS.
const AUJ = aujourdhuiParis();
const [an, mois] = AUJ.split('-').map(Number);
let t = Math.floor((mois - 1) / 3), a = an;
if (t === 0) { t = 4; a -= 1; }
const T = periodeTrimestre(a, t, AUJ);
console.log(`📅 période : ${T.id} (${T.from} → ${T.to})`);

const { data: planAvant } = await admin.from('profiles').select('plan').eq('id', profileId).single();
const { data: cfgRow, error: eCfg } = await admin.from('profiles').select('urssaf_config').eq('id', profileId).single();
const V93 = !eCfg;
const configAvant = V93 ? (cfgRow?.urssaf_config ?? null) : undefined;
// Affiché AVANT toute modification : si le script est tué de l'extérieur, le
// `finally` ne tourne pas et l'état d'origine ne vit plus que dans ce log.
// (C'est arrivé : un run interrompu a laissé le démo en plan « pro ».)
// À lancer en arrière-plan plutôt que sous un timeout d'outil.
console.log(`💾 état d'origine du démo à restaurer si besoin : plan=${planAvant.plan}, urssaf_config=${JSON.stringify(configAvant)}`);

let temoinId = null, ctx;

try {
  if (planAvant.plan !== 'pro') await admin.from('profiles').update({ plan: 'pro' }).eq('id', profileId);
  // Sans réglages URSSAF, le bloc affiche l'INVITATION et n'a aucun lien :
  // on configure le démo le temps du run, restauré dans le finally.
  if (V93) {
    await admin.from('profiles').update({ urssaf_config: {
      regime: 'micro_bnc', taux_cotisations: 21.2, taux_cfp: 0.2,
      periodicite: 'trimestrielle', versement_liberatoire: false,
      taux_liberatoire: 2.2, rappel_email: false,
    } }).eq('id', profileId);
  }
  if (V94) await admin.from('declarations_urssaf').delete().eq('profile_id', profileId).eq('periode_id', T.id);

  ctx = await browser.newContext({ viewport: { width: 1280, height: 1000 } });
  await ctx.addCookies(prof.cookies.map(c => ({ ...c, url: BASE, sameSite: 'Lax' })));
  const page = await ctx.newPage();
  const erreurs = [];
  page.on('console', m => { if (m.type() === 'error') erreurs.push(m.text()); });

  // ═══ 1. La page s'ouvre et montre le détail ═══
  console.log('\n— 1. Le détail à l\'écran, sans rien télécharger —');
  await naviguer(page, `${BASE}/revenus/declaration/${T.id}`);
  await page.waitForSelector('.decl-feuille', { timeout: 45000 });
  await attendre(1500);
  const txt = await lireTexte(page);
  assert(/Déclaration URSSAF/i.test(txt), 'la feuille titre « Déclaration URSSAF »');
  assert(txt.includes(T.label), `la période est nommée (${T.label})`);
  assert(/Montant à déclarer/i.test(txt), 'le montant à déclarer est mis en avant');
  assert(/Le détail des encaissements/i.test(txt), 'le détail ligne à ligne est présent');
  assert(/Par mois/i.test(txt) && /Par mode de règlement/i.test(txt), 'les ventilations sont là');
  const propres = erreurs.filter(e => !/favicon|manifest|unique "key" prop/i.test(e));
  assert(propres.length === 0, `zéro erreur console propre à ce lot${propres.length ? ' — ' + propres.join(' | ').slice(0, 200) : ''}`);
  // Les <Link> de la page sont stylés par un bloc GLOBAL : en scopé, la règle
  // ne les atteindrait pas et ils sortiraient en lien bleu souligné. On juge
  // sur le style CALCULÉ, jamais sur la présence d'une classe (piège maison).
  const styleRetour = await page.evaluate(() => {
    const el = document.querySelector('.decl-retour');
    if (!el) return null;
    const cs = getComputedStyle(el);
    return { deco: cs.textDecorationLine, display: cs.display };
  });
  // `inline-flex` est BLOCKIFIÉ en `flex` par la spec dès que l'élément est
  // enfant d'un conteneur flex : les deux valeurs sont correctes ici.
  assert(styleRetour && styleRetour.deco === 'none' && ['flex', 'inline-flex'].includes(styleRetour.display),
    `le lien de retour est réellement stylé (soulignement=${styleRetour?.deco}, display=${styleRetour?.display})`);
  await page.screenshot({ path: join(OUT, '1-declaration.png'), fullPage: true });

  // ═══ 2. Une seule vérité : page = récap = CSV ═══
  console.log('\n— 2. Les mêmes chiffres partout —');
  const recap = await (await page.request.get(`${BASE}/api/urssaf/recap?periode=${T.id}`)).json();
  const arrondi = Math.round(recap.totaux.brut);
  const nbLignes = await page.evaluate(() => document.querySelectorAll('.decl-table tbody tr').length);
  assert(new RegExp(`${arrondi}\\s*€`).test(txt), `la page affiche ${arrondi} €, comme le récap`);
  assert(nbLignes === recap.totaux.nombre,
    `${nbLignes} lignes affichées = ${recap.totaux.nombre} encaissements comptés`);
  const csv = (await (await page.request.get(
    `${BASE}/api/export/paiements-csv?periode=${T.id}&base=encaissement&statut=paid`)).body()).toString('utf8');
  const totalCsv = parseFloat((csv.split('\r\n').find(l => l.startsWith('TOTAL (')) || '').split(';')[7]?.replace(',', '.'));
  assert(Math.abs(totalCsv - recap.totaux.brut) < 0.01, `le CSV totalise ${totalCsv} €, identique`);

  // ═══ 3. Les chemins qui y mènent ═══
  console.log('\n— 3. On y arrive depuis Revenus —');
  await naviguer(page, `${BASE}/revenus`);
  await page.waitForSelector('h1', { timeout: 30000 });
  const lienBloc = await page.waitForSelector(`a[href="/revenus/declaration/${T.id}"]`, { timeout: 45000 })
    .then(() => true, () => false);
  assert(lienBloc, 'le bloc URSSAF propose « Voir le détail à l\'écran »');

  let modaleOuverte = false;
  for (let i = 0; i < 15 && !modaleOuverte; i++) {
    await page.getByRole('button', { name: /Export/ }).first().click().catch(() => {});
    modaleOuverte = await page.waitForSelector('.enc-modal select', { timeout: 2000 }).then(() => true, () => false);
  }
  assert(modaleOuverte, "la modale d'export s'ouvre");
  // Le lien n'apparaît que pour une période CIVILE : le défaut de la modale est
  // « Ce mois », une fenêtre glissante qui n'a pas de page dédiée. On choisit
  // donc le trimestre clos, comme le ferait une prof qui prépare l'URSSAF.
  await page.selectOption('.enc-modal select', T.id).catch(() => {});
  const lienModale = await page.waitForSelector('.export-lien-ecran', { timeout: 5000 })
    .then(() => true, () => false);
  assert(lienModale, 'la modale d\'export propose aussi l\'affichage à l\'écran');
  if (lienModale) {
    const style = await page.evaluate(() => {
      const cs = getComputedStyle(document.querySelector('.export-lien-ecran'));
      return { poids: cs.fontWeight, deco: cs.textDecorationLine };
    });
    assert(style.poids === '700', `le lien est réellement stylé (font-weight ${style.poids})`);
    await page.screenshot({ path: join(OUT, '2-modale-lien-ecran.png') });
  }
  await page.keyboard.press('Escape').catch(() => {});

  // ═══ 4/5. L'archive ═══
  if (!V94) {
    console.log('\n— 4. Dégradé pré-v94 —');
    const r = await page.request.post(`${BASE}/api/urssaf/declaration`, {
      data: { periodeId: T.id, action: 'declaree', montant: recap.totaux.brut, snapshot: null },
    });
    assert(r.status() === 503, `« J'ai déclaré » répond ${r.status()} au lieu de faire semblant`);
    const j = await r.json();
    assert(/mise à jour de la base/i.test(j.error || ''), 'le message dit honnêtement pourquoi');
    assert(/ton montant reste juste/i.test(j.error || ''), 'et rassure : le chiffre affiché, lui, est bon');
    const rc = await page.request.post(`${BASE}/api/urssaf/declaration`, {
      data: { periodeId: T.id, action: 'consultee', montant: recap.totaux.brut, snapshot: null },
    });
    assert(rc.status() === 200, 'la simple consultation ne casse jamais la page (200)');
  } else {
    console.log('\n— 4. La consultation est tracée —');
    const { data: apresVisite } = await admin.from('declarations_urssaf')
      .select('consultations, derniere_consultation_at, montant_dernier, declaree_at')
      .eq('profile_id', profileId).eq('periode_id', T.id).maybeSingle();
    assert(!!apresVisite, 'une ligne d\'archive existe après la visite');
    assert((apresVisite?.consultations || 0) >= 1, `${apresVisite?.consultations} consultation(s) comptée(s)`);
    assert(apresVisite?.declaree_at === null, 'consulter n\'est PAS déclarer');

    console.log('\n— 5. « J\'ai déclaré » fige le montant —');
    await naviguer(page, `${BASE}/revenus/declaration/${T.id}`);
    await page.waitForSelector('.decl-feuille', { timeout: 45000 });
    let clique = false;
    for (let i = 0; i < 15 && !clique; i++) {
      await page.getByRole('button', { name: /J.ai déclaré/ }).click().catch(() => {});
      clique = await page.waitForSelector('.decl-statut-declaree', { timeout: 2000 }).then(() => true, () => false);
    }
    assert(clique, 'le bouton passe la période en « Déclarée »');
    const { data: fige } = await admin.from('declarations_urssaf')
      .select('declaree_at, montant_declare, snapshot')
      .eq('profile_id', profileId).eq('periode_id', T.id).single();
    assert(!!fige.declaree_at, 'la date de déclaration est en base');
    assert(Math.round(fige.montant_declare) === arrondi, `le montant figé est ${fige.montant_declare} (attendu ${arrondi})`);
    assert(fige.snapshot?.totaux?.brut === recap.totaux.brut, 'le snapshot porte le total exact du moment');
    assert(!!fige.snapshot?.periode?.echeanceLabel, 'et l\'échéance telle qu\'elle était affichée');

    // Re-cliquer ne doit PAS réécrire la photo d'origine.
    const r2 = await page.request.post(`${BASE}/api/urssaf/declaration`, {
      data: { periodeId: T.id, action: 'declaree', montant: 999999, snapshot: null },
    });
    const j2 = await r2.json();
    assert(j2.deja === true, 'une 2e déclaration ne réécrit pas la première');
    const { data: toujours } = await admin.from('declarations_urssaf')
      .select('montant_declare').eq('profile_id', profileId).eq('periode_id', T.id).single();
    assert(Math.round(toujours.montant_declare) === arrondi, 'le montant figé n\'a pas bougé');

    // ═══ 6. LE point décisif : l'écart ═══
    console.log('\n— 6. La période change après coup : l\'écart est signalé —');
    const { data: temoin, error: eT } = await admin.from('paiements').insert({
      profile_id: profileId, intitule: `${TAG} chèque retrouvé`, montant: 77, statut: 'paid',
      mode: 'cheque', date: T.to, date_encaissement: T.to,
    }).select('id').single();
    if (eT) throw new Error(`paiement témoin : ${eT.message}`);
    temoinId = temoin.id;

    await naviguer(page, `${BASE}/revenus/declaration/${T.id}`);
    await page.waitForSelector('.decl-feuille', { timeout: 45000 });
    await attendre(1500);
    const txtEcart = await lireTexte(page);
    assert(/Tu avais déclaré/.test(txtEcart), 'la page signale que le montant déclaré n\'est plus le montant actuel');
    assert(txtEcart.includes(`${arrondi} €`) && txtEcart.includes(`${arrondi + 77} €`),
      `l'écart nomme les deux montants (${arrondi} → ${arrondi + 77})`);
    assert(/régularisation/i.test(txtEcart), 'et suggère la régularisation');
    await page.screenshot({ path: join(OUT, '3-ecart.png'), fullPage: true });

    // L'historique du bloc Revenus doit refléter la déclaration.
    await naviguer(page, `${BASE}/revenus`);
    await page.waitForSelector('h1', { timeout: 30000 });
    let histo = false;
    for (let i = 0; i < 20 && !histo; i++) {
      await page.getByRole('button', { name: /Voir le détail et les documents/ }).click().catch(() => {});
      histo = await page.waitForSelector('.urssaf-histo', { timeout: 1500 }).then(() => true, () => false);
    }
    assert(histo, 'le bloc Revenus affiche « Mes déclarations »');
    if (histo) {
      const txtHisto = await page.evaluate(() => document.querySelector('.urssaf-histo').innerText);
      assert(new RegExp(T.label.split(' (')[0]).test(txtHisto) && /Déclarée/i.test(txtHisto),
        `la période y figure comme déclarée (${txtHisto.split('\n').slice(0, 3).join(' / ')})`);
      await page.screenshot({ path: join(OUT, '4-historique.png') });
    }
  }

} finally {
  if (temoinId) await admin.from('paiements').delete().eq('id', temoinId);
  if (V94) await admin.from('declarations_urssaf').delete().eq('profile_id', profileId).eq('periode_id', T.id);
  const restore = { plan: planAvant.plan };
  if (V93) restore.urssaf_config = configAvant;
  await admin.from('profiles').update(restore).eq('id', profileId);
  const { count } = await admin.from('paiements')
    .select('id', { count: 'exact', head: true }).eq('profile_id', profileId).ilike('intitule', `${TAG}%`);
  assert((count || 0) === 0, `ménage : 0 paiement témoin restant (${count})`);
  console.log(`🧹 plan restauré à « ${planAvant.plan} »${V94 ? ', archive de la période purgée' : ''}`);
  if (ctx) await ctx.close();
  await browser.close();
}

console.log(`\n${ko === 0 ? '✅' : '❌'} ${ok}/${ok + ko} vérifications — captures dans ${OUT}`);
process.exit(ko === 0 ? 0 : 1);
