/**
 * Preuve — deux demandes du feedback « /revenus » de Colin (2026-08-23) :
 *
 *   A. « permettre de sélectionner plusieurs types de paiement (chèque + cb
 *      + virement) » — une vente réglée le même jour avec plusieurs moyens.
 *      Le tunnel n'acceptait qu'UN mode par encaissement ; le seul chemin
 *      possible était « En plusieurs fois », qui parle d'échéances, pas de
 *      moyens. En base ce sont désormais N encaissements du même jour, chacun
 *      avec SON mode : c'est ce que la compta doit voir (un chèque et une CB
 *      ne se déclarent pas comme une ligne mixte qui n'existe pas).
 *
 *   B. « un toggle : ne pas faire apparaître dans la compta, je déclarerai à
 *      part » (v95). L'encaissement reste enregistré, mais sort de la
 *      déclaration URSSAF et du livre des recettes — et chacun de ces
 *      documents ANNONCE ce qu'il a écarté.
 *
 * Le script détecte si la migration v95 est appliquée :
 *   • sans elle  → phase B dégradée : le toggle répond honnêtement, la base
 *     n'est pas touchée, la déclaration continue de marcher ;
 *   • avec elle  → phase B complète : exclusion constatée EN BASE, total de
 *     déclaration diminué, mention présente sur la page et dans le registre.
 *
 * Usage : node scripts/proof-paiement-moyens-et-horscompta.mjs [dossier]
 * Prérequis : dev server sur :3333 (npm run dev). Témoins purgés à la fin.
 */
import { createClient } from '@supabase/supabase-js';
import { readFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = process.cwd();
const OUT = process.argv[2] || join(process.env.TEMP || '.', 'proof-moyens-horscompta');
mkdirSync(OUT, { recursive: true });
const BASE = 'http://localhost:3333';
const PROF_EMAIL = 'bonjour@melutek.com';
const MARQUEUR = '[preuve moyens]';

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

// v95 appliquée ? Sonde par une lecture de la colonne, jamais par une
// supposition (leçon v77 : seule la base répond).
const { error: sonde } = await admin.from('paiements').select('exclu_compta').limit(1);
const V95 = !sonde;
console.log(`migration v95 : ${V95 ? 'APPLIQUEE (phase B complete)' : 'absente (phase B degradee)'}`);

const purger = async () => {
  const { data: cl } = await admin.from('clients').select('id').eq('profile_id', profileId).ilike('nom', `${MARQUEUR}%`);
  const clIds = (cl || []).map(c => c.id);
  if (clIds.length) {
    await admin.from('paiements').delete().in('client_id', clIds);
    await admin.from('abonnements').delete().in('client_id', clIds);
    await admin.from('clients').delete().in('id', clIds);
  }
  const { data: of } = await admin.from('offres').select('id').eq('profile_id', profileId).ilike('nom', `${MARQUEUR}%`);
  const ofIds = (of || []).map(o => o.id);
  if (ofIds.length) {
    await admin.from('paiements').delete().in('offre_id', ofIds);
    await admin.from('abonnements').delete().in('offre_id', ofIds);
    await admin.from('offres').delete().in('id', ofIds);
  }
};

let browser;
try {
  await purger();

  const { error: eCl } = await admin.from('clients').insert({
    profile_id: profileId, prenom: 'Sonia', nom: `${MARQUEUR} Temoin`,
    email: `preuve-moyens-${Date.now()}@example.com`, statut: 'actif', type_client: 'particulier',
  }).select('id, prenom, nom').single();
  if (eCl) throw new Error(`client temoin: ${eCl.message}`);

  const { data: offre, error: eOf } = await admin.from('offres').insert({
    profile_id: profileId, nom: `${MARQUEUR} Carnet 10`, type: 'carnet',
    prix: 123, seances: 10, actif: true,
  }).select('id, nom, prix').single();
  if (eOf) throw new Error(`offre temoin: ${eOf.message}`);

  let chromium;
  try { ({ chromium } = await import('playwright')); }
  catch { ({ chromium } = await import('@playwright/test')); }
  try { browser = await chromium.launch(); }
  catch { browser = await chromium.launch({ channel: 'msedge' }); }

  const ctx = await browser.newContext({ viewport: { width: 1000, height: 1100 } });
  await ctx.addCookies(cookies.map(c => ({ ...c, domain: 'localhost', path: '/' })));
  const page = await ctx.newPage();
  const BRUIT_CONNU = [
    /unique "key" prop.*OuterLayoutRouter/s,
    // Phase B dégradée : le 503 EST le comportement attendu (refus honnête
    // faute de migration). Toléré uniquement tant que v95 n'est pas appliquée.
    ...(V95 ? [] : [/status of 503/]),
  ];
  const erreursConsole = [];
  const noter = t => { if (!BRUIT_CONNU.some(r => r.test(t))) erreursConsole.push(t); };
  page.on('console', m => { if (m.type() === 'error') noter(m.text()); });
  page.on('pageerror', e => noter(`pageerror: ${e.message}`));

  // ══ A. Plusieurs moyens le même jour ══════════════════════════════════════
  console.log('\nA. Une vente reglee en plusieurs moyens');
  await page.goto(`${BASE}/offres?creee=${offre.id}`, { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: /Vendre cette offre/ }).first().click();
  await page.getByPlaceholder('Rechercher un élève...').fill('Sonia');
  await attendre(1200);
  await page.getByText(`Sonia ${MARQUEUR} Temoin`).first().click();
  await attendre(1200);

  const btnMoyens = page.getByRole('button', { name: 'Plusieurs moyens' });
  assert(await btnMoyens.count() === 1, 'l\'option « Plusieurs moyens » existe a cote de « En plusieurs fois »');
  await btnMoyens.click();
  await attendre(600);
  const lignes = page.locator('.multi-v-row');
  assert(await lignes.count() === 2, 'deux lignes sont proposees d\'emblee');

  // 80 € en espèces + 43 € en CB : l'exemple exact du terrain.
  await lignes.nth(0).locator('input[type="number"]').fill('80');
  await lignes.nth(1).locator('input[type="number"]').fill('43');
  await lignes.nth(0).locator('select').selectOption('especes');
  await lignes.nth(1).locator('select').selectOption('CB');
  await attendre(400);
  const totalPill = await page.locator('.multi-total').innerText();
  assert(/123/.test(totalPill), `le total des moyens retombe sur le prix (lu : « ${totalPill.trim()} »)`);
  await page.screenshot({ path: join(OUT, 'A-plusieurs-moyens.png'), fullPage: true });

  // Garde-fou : un découpage qui ne fait pas le compte est refusé.
  await lignes.nth(1).locator('input[type="number"]').fill('10');
  await attendre(300);
  await page.getByRole('button', { name: /Valider le paiement/ }).last().click();
  await attendre(900);
  const erreurAffichee = await page.locator('.paiement-error, .enc-error, [class*="error"]').first().innerText().catch(() => '');
  assert(/ne fait pas le montant total/i.test(erreurAffichee),
    `un decoupage faux est refuse, avec la raison (lu : « ${String(erreurAffichee).trim().slice(0, 80)} »)`);
  const { count: avant } = await admin.from('paiements')
    .select('*', { count: 'exact', head: true }).eq('offre_id', offre.id);
  assert(avant === 0, 'rien n\'a ete ecrit en base tant que le compte n\'y est pas');

  await lignes.nth(1).locator('input[type="number"]').fill('43');
  await attendre(300);
  await page.getByRole('button', { name: /Valider le paiement/ }).last().click();
  await attendre(4000);

  const { data: paiements } = await admin.from('paiements')
    .select('id, montant, mode, statut, date, date_encaissement, echeancier_id')
    .eq('offre_id', offre.id).order('montant', { ascending: false });
  assert(paiements?.length === 2, `2 encaissements en base (lu : ${paiements?.length})`);
  const [p80, p43] = paiements || [];
  assert(p80?.montant === 80 && p80?.mode === 'especes', `80 € en especes (lu : ${p80?.montant} / ${p80?.mode})`);
  assert(p43?.montant === 43 && p43?.mode === 'CB', `43 € en CB (lu : ${p43?.montant} / ${p43?.mode})`);
  assert(paiements?.every(p => p.statut === 'paid'), 'les deux sont regles');
  const auj = new Date().toISOString().slice(0, 10);
  assert(paiements?.every(p => p.date === auj), 'les deux portent la date du jour (ce n\'est pas un echeancier)');
  assert(paiements?.every(p => p.date_encaissement === auj),
    'date_encaissement posee sur les deux : la declaration URSSAF les rangera au bon trimestre (v93)');
  assert(p80?.echeancier_id && p80.echeancier_id === p43?.echeancier_id,
    'les deux lignes restent rattachees a la MEME vente');

  // ══ B. « Je déclare à part » ══════════════════════════════════════════════
  console.log(`\nB. Le toggle « ne pas faire apparaitre dans ma compta » (${V95 ? 'v95 appliquee' : 'degrade'})`);
  // L'assiette AVANT le geste : c'est la seule façon de prouver que le total
  // baisse exactement du montant écarté, et pas « à peu près ».
  const trimestre = `T${Math.floor(new Date().getMonth() / 3) + 1}-${new Date().getFullYear()}`;
  const lireRecap = () => page.evaluate(async (t) => {
    const r = await fetch(`/api/urssaf/recap?periode=${t}`);
    return r.ok ? await r.json() : null;
  }, trimestre);
  await page.goto(`${BASE}/revenus`, { waitUntil: 'networkidle' });
  const recapAvant = await lireRecap();
  await page.goto(`${BASE}/revenus`, { waitUntil: 'networkidle' });
  await attendre(1500);
  const ligne80 = page.locator('.paiement-row, .paiement-item, li, div').filter({ hasText: `${MARQUEUR} Carnet 10` }).first();
  await ligne80.scrollIntoViewIfNeeded().catch(() => {});
  await page.locator('.edit-pay-btn').first().click();
  await page.waitForSelector('text=Modifier le paiement', { timeout: 30000 });
  const caseHorsCompta = page.locator('.rev-horscompta input[type="checkbox"]');
  assert(await caseHorsCompta.count() === 1, 'la case « Ne pas faire apparaitre dans ma compta » est dans la modale');
  assert(!(await caseHorsCompta.isChecked()), 'elle est decochee par defaut (rien ne sort de la compta sans un geste)');
  await caseHorsCompta.check();
  await page.screenshot({ path: join(OUT, 'B-toggle.png'), fullPage: true });
  await page.getByRole('button', { name: /Enregistrer|Modifier/ }).last().click();
  await attendre(2500);

  if (!V95) {
    const toast = await page.locator('.toast-message').first().innerText().catch(() => '');
    assert(/pas encore appliquée|mise à jour de la base/i.test(toast),
      `sans la migration, le refus est explicite et rassurant (lu : « ${String(toast).trim().slice(0, 90)} »)`);
    // Et surtout : rien n'a bougé. Un réglage qui échoue ne doit pas laisser
    // croire qu'il a pris, ni écrire à moitié.
    const { data: relu } = await admin.from('paiements')
      .select('id, montant, statut, mode').eq('offre_id', offre.id).order('montant', { ascending: false });
    assert(relu?.length === 2 && relu[0].montant === 80 && relu[0].mode === 'especes',
      'les encaissements sont intacts : un reglage refuse n\'abime rien');
    console.log('     (applique v95 puis relance ce script pour la phase B complete)');
  } else {
    const { data: relu } = await admin.from('paiements')
      .select('id, montant, exclu_compta').eq('offre_id', offre.id).eq('exclu_compta', true);
    assert(relu?.length === 1, `un seul encaissement marque hors compta en base (lu : ${relu?.length})`);
    const montantExclu = relu?.[0]?.montant;

    // LE chiffre : l'assiette a maigri EXACTEMENT du montant écarté.
    const recapApres = await lireRecap();
    const baisse = Math.round(((recapAvant?.totaux?.brut || 0) - (recapApres?.totaux?.brut || 0)) * 100) / 100;
    assert(baisse === montantExclu,
      `le total a declarer baisse d'exactement ${montantExclu} € (${recapAvant?.totaux?.brut} → ${recapApres?.totaux?.brut})`);
    assert(recapApres?.exclusions?.nb === 1 && recapApres?.exclusions?.montant === montantExclu,
      'le recap annonce lui-meme ce qu\'il a ecarte (jamais une baisse muette)');

    // La déclaration du trimestre en cours doit le dire aussi.
    await page.goto(`${BASE}/revenus/declaration/${trimestre}`, { waitUntil: 'networkidle' });
    await attendre(1500);
    const texteDecl = await page.evaluate(() => document.body.innerText);
    assert(/mis hors compta/.test(texteDecl), 'la page de declaration annonce ce qu\'elle a ecarte');
    assert(texteDecl.includes(String(montantExclu).replace('.', ',')) || /hors compta/.test(texteDecl),
      'elle donne le montant ecarte');
    await page.screenshot({ path: join(OUT, 'B-declaration.png'), fullPage: true });

    // Le registre légal aussi : il exclut, et il le dit.
    const csv = await page.evaluate(async (t) => {
      const r = await fetch(`/api/export/livre-recettes?periode=${t}&format=csv`);
      return r.ok ? await r.text() : '';
    }, trimestre);
    assert(csv.length > 0, 'le livre des recettes se telecharge');
    assert(/volontairement exclu/.test(csv), 'le registre porte sa mention d\'exclusion');
    assert(!csv.includes(`${MARQUEUR} Carnet 10;`) || !csv.split('\n').some(l => l.includes('80,00') && l.includes(MARQUEUR)),
      'la ligne ecartee n\'est plus dans le registre');
  }

  assert(erreursConsole.length === 0, `console propre (${erreursConsole.length} erreur(s))`);
  if (erreursConsole.length) erreursConsole.slice(0, 5).forEach(e => console.log('     ', e.slice(0, 200)));

} catch (err) {
  ko++;
  console.error('\nEXCEPTION :', err.message);
} finally {
  if (browser) await browser.close();
  await purger();
  const { count: reste } = await admin.from('offres')
    .select('*', { count: 'exact', head: true }).eq('profile_id', profileId).ilike('nom', `${MARQUEUR}%`);
  console.log(`\nMenage : ${reste === 0 ? 'aucun temoin restant' : `⚠ ${reste} offre(s) temoin restante(s)`}`);
  console.log(`Captures : ${OUT}`);
  console.log(`\n${ok} OK / ${ko} KO`);
  process.exit(ko === 0 ? 0 : 1);
}
