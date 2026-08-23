/**
 * Preuve — retirer un·e élève d'une séance, et inscrire sur toute la série
 * (retour Maude 2026-08-23, depuis l'écran de pointage) :
 *
 *   « On ne peut pas enlever un élève soi même ajouté à un cours, et on doit
 *   pouvoir inscrire l'élève soi même sur toute la récurrence des cours. »
 *
 * Deux trous symétriques : sur le pointage, AJOUTER était possible à tout
 * moment, RETIRER nulle part (il fallait passer par la fiche du cours) ; et
 * l'ajout ne valait que pour LA séance affichée, alors qu'une élève qui vient
 * tous les lundis devait être inscrite séance par séance sur toute la saison.
 *
 * Déroulé (vrai navigateur sur :3333, session prof démo, chemin réel) :
 *   A. Le menu ··· d'une inscription propose « Retirer de la séance ».
 *   B. Retirer une inscription simple : elle disparaît EN BASE.
 *   C. Retirer une séance DÉJÀ POINTÉE sur un carnet : la séance est RENDUE
 *      au carnet (le geste dangereux, celui qu'on ne veut pas approximatif).
 *   D. Une séance avec un encaissement lié REFUSE d'être retirée, et dit quoi
 *      faire d'abord (l'argent ne doit jamais devenir orphelin).
 *   E. « Toute la série » inscrit sur les séances À VENIR seulement : ni la
 *      passée, ni l'annulée.
 *   F. Recommencer ne fabrique aucun doublon, et le dit.
 *   G. Ménage : témoins purgés, même en cas d'échec.
 *
 * Usage : node scripts/proof-pointage-serie.mjs [dossier-captures]
 * Prérequis : dev server sur :3333 (npm run dev).
 */
import { createClient } from '@supabase/supabase-js';
import { readFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = process.cwd();
const OUT = process.argv[2] || join(process.env.TEMP || '.', 'proof-pointage-serie');
mkdirSync(OUT, { recursive: true });
const BASE = 'http://localhost:3333';
const PROF_EMAIL = 'bonjour@melutek.com';
const MARQUEUR = '[preuve serie]';

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
  const nom = `sb-${PROJECT_REF}-auth-token`;
  const cookies = [];
  if (value.length <= 3180) cookies.push({ name: nom, value });
  else for (let i = 0; i * 3180 < value.length; i++) cookies.push({ name: `${nom}.${i}`, value: value.slice(i * 3180, (i + 1) * 3180) });
  return { cookies, userId: otpData.session.user.id };
}

for (let i = 0; i < 90; i++) {
  try { const r = await fetch(`${BASE}/login`); if (r.ok) break; } catch { /* pas prêt */ }
  await attendre(2000);
  if (i === 89) { console.error('dev server injoignable sur :3333'); process.exit(1); }
}
console.log('dev server pret');

const { cookies, userId: profileId } = await sessionCookies(PROF_EMAIL);

const jour = (delta) => {
  const d = new Date();
  d.setDate(d.getDate() + delta);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
const S_PASSEE = jour(-7);
const S_ACT = jour(0);      // aujourd'hui, tôt : pointage ouvert
const S1 = jour(7);
const S2 = jour(14);        // annulée
const S3 = jour(21);

const purger = async () => {
  const { data: co } = await admin.from('cours').select('id').eq('profile_id', profileId).ilike('nom', `${MARQUEUR}%`);
  const coIds = (co || []).map(c => c.id);
  const { data: cl } = await admin.from('clients').select('id').eq('profile_id', profileId).ilike('nom', `${MARQUEUR}%`);
  const clIds = (cl || []).map(c => c.id);
  if (coIds.length) {
    const { data: presCo } = await admin.from('presences').select('id').in('cours_id', coIds);
    if (presCo?.length) await admin.from('paiements').delete().in('presence_id', presCo.map(p => p.id));
    await admin.from('presences').delete().in('cours_id', coIds);
    await admin.from('notifications').delete().in('cours_id', coIds);
  }
  if (clIds.length) {
    await admin.from('paiements').delete().in('client_id', clIds);
    await admin.from('presences').delete().in('client_id', clIds);
    await admin.from('abonnements').delete().in('client_id', clIds);
    await admin.from('cas_a_traiter').delete().in('client_id', clIds);
  }
  if (coIds.length) await admin.from('cours').delete().in('id', coIds);
  if (clIds.length) await admin.from('clients').delete().in('id', clIds);
  const { data: rec } = await admin.from('recurrences').select('id').eq('profile_id', profileId).ilike('nom', `${MARQUEUR}%`);
  if (rec?.length) await admin.from('recurrences').delete().in('id', rec.map(r => r.id));
};

let browser;
try {
  await purger();

  // ── Décor : une série, cinq séances, dont une passée et une annulée ───────
  const { data: serie, error: eRec } = await admin.from('recurrences').insert({
    profile_id: profileId, nom: `${MARQUEUR} Hebdo`, type_cours: 'Hatha',
    heure: '07:00', duree_minutes: 60, capacite_max: 20,
    frequence: 'hebdomadaire', jours_semaine: [1], intervalle: 1,
    date_debut: S_PASSEE, date_fin: S3, actif: true,
  }).select('id').single();
  if (eRec) throw new Error(`recurrence : ${eRec.message}`);

  const { data: seances, error: eCo } = await admin.from('cours').insert(
    [[S_PASSEE, false], [S_ACT, false], [S1, false], [S2, true], [S3, false]].map(([d, annule]) => ({
      profile_id: profileId, recurrence_parent_id: serie.id,
      nom: `${MARQUEUR} Hebdo`, date: d, heure: '07:00', duree_minutes: 60,
      type_cours: 'Hatha', capacite_max: 20, visibilite: 'public', est_annule: annule,
    }))
  ).select('id, date, est_annule');
  if (eCo) throw new Error(`cours : ${eCo.message}`);
  const parDate = Object.fromEntries(seances.map(c => [c.date, c.id]));

  const mk = async (prenom) => {
    const { data, error } = await admin.from('clients').insert({
      profile_id: profileId, prenom, nom: `${MARQUEUR} Temoin`,
      email: `preuve-serie-${prenom.toLowerCase()}-${Date.now()}@example.com`,
      statut: 'actif', type_client: 'particulier',
    }).select('id, prenom, nom').single();
    if (error) throw new Error(`client ${prenom} : ${error.message}`);
    return data;
  };
  const simple = await mk('Alba');     // inscription à retirer
  const surCarnet = await mk('Bea');   // pointée sur carnet
  const payante = await mk('Chloe');   // encaissement lié
  const serieuse = await mk('Dina');   // à inscrire sur la série

  // Carnet de Bea, une séance déjà consommée par sa présence pointée.
  const { data: abo, error: eAbo } = await admin.from('abonnements').insert({
    profile_id: profileId, client_id: surCarnet.id, offre_nom: `${MARQUEUR} Carnet`,
    type: 'carnet', statut: 'actif', date_debut: S_PASSEE, date_fin: S3,
    seances_total: 10, seances_utilisees: 1,
  }).select('id').single();
  if (eAbo) throw new Error(`abo : ${eAbo.message}`);

  const { data: presences, error: ePr } = await admin.from('presences').insert([
    { profile_id: profileId, cours_id: parDate[S_ACT], client_id: simple.id, statut_pointage: 'inscrit', pointee: false },
    { profile_id: profileId, cours_id: parDate[S_ACT], client_id: surCarnet.id, statut_pointage: 'present', pointee: true, abonnement_id: abo.id },
    { profile_id: profileId, cours_id: parDate[S_ACT], client_id: payante.id, statut_pointage: 'present', pointee: true },
  ]).select('id, client_id');
  if (ePr) throw new Error(`presences : ${ePr.message}`);
  const presParClient = Object.fromEntries(presences.map(p => [p.client_id, p.id]));

  const { error: ePay } = await admin.from('paiements').insert({
    profile_id: profileId, client_id: payante.id,
    presence_id: presParClient[payante.id], intitule: `${MARQUEUR} Seance`,
    montant: 15, statut: 'paid', mode: 'especes', date: S_ACT, date_encaissement: S_ACT,
  });
  if (ePay) throw new Error(`paiement : ${ePay.message}`);

  let chromium;
  try { ({ chromium } = await import('playwright')); }
  catch { ({ chromium } = await import('@playwright/test')); }
  try { browser = await chromium.launch(); }
  catch { browser = await chromium.launch({ channel: 'msedge' }); }

  const ctx = await browser.newContext({ viewport: { width: 900, height: 1200 } });
  await ctx.addCookies(cookies.map(c => ({ ...c, domain: 'localhost', path: '/' })));
  const page = await ctx.newPage();
  page.on('dialog', d => d.accept());   // les confirmations de retrait
  const BRUIT_CONNU = [/unique "key" prop.*OuterLayoutRouter/s, /status of 409/];
  const erreursConsole = [];
  const noter = t => { if (!BRUIT_CONNU.some(r => r.test(t))) erreursConsole.push(t); };
  page.on('console', m => { if (m.type() === 'error') noter(m.text()); });
  page.on('pageerror', e => noter(`pageerror: ${e.message}`));

  const carte = (prenom) => page.locator('.pres-row').filter({ hasText: prenom }).first();
  const ouvrirMenu = async (prenom) => {
    const c = carte(prenom);
    await c.scrollIntoViewIfNeeded();
    await c.locator('.tp-more-btn').click();
    await attendre(300);
  };

  // ══ A. Le menu propose enfin de retirer ═══════════════════════════════════
  console.log('\nA. Le menu ··· propose « Retirer de la seance »');
  await page.goto(`${BASE}/pointage/${parDate[S_ACT]}`, { waitUntil: 'networkidle' });
  await attendre(1200);
  await ouvrirMenu('Alba');
  const menu = page.locator('.tp-menu').first();
  assert((await menu.innerText()).includes('Retirer de la séance'), 'l\'action existe dans le menu d\'une inscription');
  await page.screenshot({ path: join(OUT, 'A-menu-retirer.png'), fullPage: false });

  // ══ B. Retirer une inscription simple ═════════════════════════════════════
  console.log('\nB. Retirer une inscription simple');
  await menu.locator('.tpm-danger').click();
  await attendre(2500);
  const { data: apresSimple } = await admin.from('presences').select('id').eq('id', presParClient[simple.id]).maybeSingle();
  assert(!apresSimple, 'l\'inscription a disparu EN BASE');
  // Sur la CARTE, pas sur le texte de la page : le toast de confirmation
  // contient le prénom, il ferait échouer une recherche naïve.
  assert(await carte('Alba').count() === 0, 'et de l\'ecran');

  // ══ C. Retirer une séance pointée sur carnet rend la séance ═══════════════
  console.log('\nC. Retirer une seance pointee sur carnet');
  const { data: avantAbo } = await admin.from('abonnements').select('seances_utilisees').eq('id', abo.id).single();
  assert(avantAbo.seances_utilisees === 1, 'le carnet part avec 1 seance consommee');
  await ouvrirMenu('Bea');
  await page.locator('.tp-menu').first().locator('.tpm-danger').click();
  await attendre(2500);
  const { data: apresAbo } = await admin.from('abonnements').select('seances_utilisees').eq('id', abo.id).single();
  assert(apresAbo.seances_utilisees === 0,
    `la seance est RENDUE au carnet (1 -> ${apresAbo.seances_utilisees})`);
  const { data: presBea } = await admin.from('presences').select('id').eq('id', presParClient[surCarnet.id]).maybeSingle();
  assert(!presBea, 'et l\'inscription est bien supprimee');

  // ══ D. L'argent n'est jamais orphelin ═════════════════════════════════════
  console.log('\nD. Une seance encaissee refuse d\'etre retiree');
  await ouvrirMenu('Chloe');
  await page.locator('.tp-menu').first().locator('.tpm-danger').click();
  await attendre(2500);
  const { data: presChloe } = await admin.from('presences').select('id').eq('id', presParClient[payante.id]).maybeSingle();
  assert(!!presChloe, 'l\'inscription est TOUJOURS la (l\'encaissement la protege)');
  const toast = await page.locator('.toast-message').first().innerText().catch(() => '');
  assert(/encaissement/i.test(toast), `le refus dit quoi faire d'abord (« ${String(toast).trim().slice(0, 80)} »)`);
  const { data: payToujours } = await admin.from('paiements').select('id').eq('presence_id', presParClient[payante.id]).maybeSingle();
  assert(!!payToujours, 'et l\'argent est intact');

  // ══ E. Inscrire sur toute la série ════════════════════════════════════════
  console.log('\nE. Inscrire sur toute la serie');
  await page.reload({ waitUntil: 'networkidle' });
  await attendre(1200);
  await page.getByRole('button', { name: /Ajouter des élèves|Dernière minute/ }).click();
  await page.waitForSelector('.add-portee', { timeout: 20000 });
  const portee = page.locator('.add-portee');
  const texteP = await portee.innerText();
  assert(/Toute la série \(2\)/.test(texteP),
    `le choix annonce 2 seances a venir : ni la passee, ni l'annulee (lu : « ${texteP.replace(/\n/g, ' | ').slice(0, 120)} »)`);
  await portee.getByRole('button', { name: /Toute la série/ }).click();
  await attendre(400);
  const apercu = await page.locator('.add-portee-apercu').first().innerText();
  assert(/2 séances à venir/.test(apercu), `l'apercu dit ce qui va se passer (« ${apercu.trim()} »)`);
  await page.screenshot({ path: join(OUT, 'B-portee-serie.png'), fullPage: true });

  await page.getByPlaceholder('Rechercher par nom…').fill('Dina');
  await attendre(800);
  await page.locator('.modal-list').getByText('Dina', { exact: false }).first().click();
  await attendre(400);
  await page.getByRole('button', { name: /Ajouter|Inscrire/ }).last().click();
  await attendre(3500);

  const { data: presDina } = await admin.from('presences')
    .select('cours_id').eq('client_id', serieuse.id);
  const coursDina = new Set((presDina || []).map(p => p.cours_id));
  assert(coursDina.has(parDate[S_ACT]), 'inscrite sur la seance affichee');
  assert(coursDina.has(parDate[S1]) && coursDina.has(parDate[S3]), 'inscrite sur les 2 seances a venir');
  assert(!coursDina.has(parDate[S_PASSEE]), 'JAMAIS sur la seance passee');
  assert(!coursDina.has(parDate[S2]), 'JAMAIS sur la seance annulee');
  assert(coursDina.size === 3, `3 inscriptions au total (lu : ${coursDina.size})`);

  // ══ F. Recommencer ne duplique rien ═══════════════════════════════════════
  console.log('\nF. Recommencer ne fabrique pas de doublon');
  await page.reload({ waitUntil: 'networkidle' });
  await attendre(1200);
  await page.getByRole('button', { name: /Ajouter des élèves|Dernière minute/ }).click();
  await page.waitForSelector('.add-portee', { timeout: 20000 });
  await page.locator('.add-portee').getByRole('button', { name: /Toute la série/ }).click();
  await attendre(400);
  const dejaLa = await page.locator('.modal-list').innerText();
  assert(!/Dina/.test(dejaLa), 'Dina n\'est plus proposee : elle est deja inscrite a cette seance');
  await page.keyboard.press('Escape').catch(() => {});
  const { data: presDina2 } = await admin.from('presences').select('cours_id').eq('client_id', serieuse.id);
  assert((presDina2 || []).length === 3, `toujours 3 inscriptions, aucun doublon (lu : ${(presDina2 || []).length})`);

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
