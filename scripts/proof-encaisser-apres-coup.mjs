/**
 * Preuve — encaisser APRÈS la vente, en plusieurs moyens (2026-09-14).
 *
 * Le cas de Maude : l'abonnement annuel de Marie-Pierre vendu le 25/08 « à
 * régler plus tard » (une ligne de 480 € en attente), puis DEUX chèques le
 * mois suivant. Rejoué ici sur le démo Atelier Soleil, en vrai navigateur,
 * contre la base réelle, avec des témoins jetables purgés même en échec.
 *
 *   A. Fiche → Paiements → « Encaisser » sur la ligne de 480 € :
 *      aucun mode présélectionné (bouton inactif), « Plusieurs moyens ou
 *      plusieurs chèques » → 200 + 200 refusé à l'écran (total faux, bouton
 *      inactif) → 240 + 240 par chèque, deux numéros, une date antérieure →
 *      EN BASE : deux lignes RÉGLÉES, même échéancier, numéros et dates
 *      conservés, plus rien en attente sur l'abo, la carte dit « réglé ✓ ».
 *   B. La route refuse par elle-même (fetch avec la session de la prof) :
 *      200 + 200 → 400 DECOUPAGE_REFUSE sans rien écrire ; un moyen non
 *      déclaré → 400 ; un paiement déjà réglé → 409.
 *   C. « Encaisser un versement » sur un abo SANS ligne en attente : « Déjà
 *      reçu » par défaut, mode à déclarer, → une ligne RÉGLÉE en base.
 *   D. « Encaisser un versement » sur un abo AVEC 480 € en attente : l'encart
 *      « attendent déjà » propose « Encaisser 480 € » et ouvre la bonne ligne.
 *   E. Depuis Revenus → « À percevoir » : 80 € espèces + 400 € CB → EN BASE.
 *   F. Le guide et la FAQ disent le geste.
 *
 * Usage : node scripts/proof-encaisser-apres-coup.mjs   (dev server sur :3333)
 */
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const BASE = process.env.PROOF_BASE || 'http://localhost:3333';
const EMAIL_TEMOIN = 'preuve-encaisser-apres-coup@example.com';

const env = Object.fromEntries(
  readFileSync(join(process.cwd(), '.env.local'), 'utf8')
    .split('\n').filter(l => l.includes('=') && !l.startsWith('#'))
    .map(l => [l.slice(0, l.indexOf('=')).trim(), l.slice(l.indexOf('=') + 1).trim()])
);
const PROJECT_REF = new URL(env.NEXT_PUBLIC_SUPABASE_URL).hostname.split('.')[0];
const svc = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

let ok = 0, ko = 0;
const c = (l, cond, d = '') => { if (cond) { ok++; console.log('  OK  ' + l + (d ? ' - ' + d : '')); } else { ko++; console.log('  KO  ' + l + (d ? ' - ' + d : '')); } };
const dormir = ms => new Promise(r => setTimeout(r, ms));
const attendre = async (fn, ms = 20000, pas = 500) => {
  const fin = Date.now() + ms;
  for (;;) { const r = await fn(); if (r) return r; if (Date.now() > fin) return null; await dormir(pas); }
};
const aller = async (page, url) => {
  try { await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 120000 }); }
  catch (e) { if (!/ERR_ABORTED|interrupted by another navigation/.test(String(e))) throw e; await dormir(1500); await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 120000 }); }
};
const texte = async (page) => page.evaluate(() => document.body.innerText);
const clicJusquA = async (page, sel, temoin, essais = 10) => {
  for (let i = 0; i < essais; i++) {
    await page.click(sel, { timeout: 3000 }).catch(() => {});
    if (await page.waitForSelector(temoin, { timeout: 2500 }).then(() => true).catch(() => false)) return true;
  }
  return false;
};
const isoParis = (d = new Date()) => d.toLocaleDateString('sv-SE', { timeZone: 'Europe/Paris' });
const plusJours = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };

const { data: demo } = await svc.from('profiles').select('id, studio_slug').eq('studio_slug', 'atelier-soleil').single();
if (!demo) { console.error('Démo introuvable'); process.exit(1); }

let fiche = null;
async function purger() {
  const { data: fiches } = await svc.from('clients').select('id').eq('profile_id', demo.id).ilike('email', EMAIL_TEMOIN);
  for (const f of fiches || []) {
    const { data: pays } = await svc.from('paiements').select('id').eq('client_id', f.id);
    const ids = (pays || []).map(p => p.id);
    if (ids.length) {
      const { data: fp } = await svc.from('factures_paiements').select('facture_id').in('paiement_id', ids);
      const fids = [...new Set((fp || []).map(x => x.facture_id))];
      if (fids.length) await svc.from('factures').delete().in('id', fids);
    }
    await svc.from('paiements').delete().eq('client_id', f.id);
    await svc.from('abonnements').delete().eq('client_id', f.id);
    await svc.from('presences').delete().eq('client_id', f.id);
    await svc.from('clients').delete().eq('id', f.id);
  }
}
await purger();

// ── Mise en place : le cas Marie-Pierre ─────────────────────────────────────
const auj = new Date();
const dateVente = isoParis(plusJours(auj, -20));
{
  const { data: f, error } = await svc.from('clients').insert({
    profile_id: demo.id, prenom: 'Marie-Pierre', nom: 'Témoin', email: EMAIL_TEMOIN, statut: 'actif',
  }).select('id').single();
  if (error) { console.error('fiche témoin KO:', error.message); process.exit(1); }
  fiche = f;
}
const creerAbo = async (nom) => {
  const { data, error } = await svc.from('abonnements').insert({
    profile_id: demo.id, client_id: fiche.id, offre_nom: nom, type: 'abonnement',
    statut: 'actif', date_debut: dateVente, date_fin: isoParis(plusJours(auj, 280)), seances_total: null,
  }).select('id').single();
  if (error) { console.error('abo KO:', error.message); await purger(); process.exit(1); }
  return data;
};
const creerPending = async (abo, nom, montant) => {
  const { data, error } = await svc.from('paiements').insert({
    profile_id: demo.id, client_id: fiche.id, abonnement_id: abo.id, intitule: nom, type: 'abonnement',
    montant, statut: 'pending', mode: null, date: dateVente,
  }).select('id').single();
  if (error) { console.error('paiement KO:', error.message); await purger(); process.exit(1); }
  return data;
};
const aboA = await creerAbo('Abonnement annuel (deux chèques)');
const payA = await creerPending(aboA, 'Abonnement annuel (deux chèques)', 480);
const aboB = await creerAbo('Abonnement annuel (refus par la route)');
const payB = await creerPending(aboB, 'Abonnement annuel (refus par la route)', 480);
const aboC = await creerAbo('Abo au mois (versement reçu)');
const aboD = await creerAbo('Abonnement annuel (encart)');
const payD = await creerPending(aboD, 'Abonnement annuel (encart)', 480);
const aboE = await creerAbo('Abonnement annuel (depuis Revenus)');
const payE = await creerPending(aboE, 'Abonnement annuel (depuis Revenus)', 480);

const sessionCookies = async (email) => {
  const { data: linkData } = await svc.auth.admin.generateLink({ type: 'magiclink', email });
  const anon = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: otp } = await anon.auth.verifyOtp({ type: 'magiclink', token_hash: linkData.properties.hashed_token });
  const value = 'base64-' + Buffer.from(JSON.stringify(otp.session)).toString('base64url');
  const nm = `sb-${PROJECT_REF}-auth-token`;
  const cookies = [];
  if (value.length <= 3180) cookies.push({ name: nm, value });
  else for (let i = 0; i * 3180 < value.length; i++) cookies.push({ name: `${nm}.${i}`, value: value.slice(i * 3180, (i + 1) * 3180) });
  return cookies;
};

let chromium; try { ({ chromium } = await import('playwright')); } catch { ({ chromium } = await import('@playwright/test')); }
let browser; try { browser = await chromium.launch({ channel: 'msedge' }); } catch { browser = await chromium.launch(); }

const lignesAbo = async (aboId) => (await svc.from('paiements').select('id, statut, mode, montant, numero_cheque, date_encaissement, echeancier_id, intitule, presence_id').eq('abonnement_id', aboId).order('intitule')).data || [];

try {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 1000 } });
  await ctx.addCookies((await sessionCookies('camille@atelier-soleil.fr')).map(cc => ({ ...cc, url: BASE, sameSite: 'Lax' })));
  const page = await ctx.newPage();
  const erreursPage = [];
  page.on('pageerror', e => erreursPage.push(String(e).slice(0, 160)));

  // Préchauffe les routes (Fast Refresh à la première compilation, §12).
  await aller(page, `${BASE}/clients/${fiche.id}`);
  await page.waitForSelector('button.tab-btn:has-text("Paiements")', { timeout: 90000 });
  await page.evaluate(() => fetch('/api/paiements/00000000-0000-0000-0000-000000000000/encaisser', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{"mode":"especes"}' }).catch(() => {}));
  await dormir(1500);

  // ── A. Deux chèques sur la ligne de 480 € ─────────────────────────────────
  console.log('\n— A. Fiche : la ligne de 480 € encaissée en deux chèques —');
  await aller(page, `${BASE}/clients/${fiche.id}`);
  await page.waitForSelector('button.tab-btn:has-text("Paiements")', { timeout: 90000 });
  await page.locator('button.tab-btn:has-text("Paiements")').click();
  const ligneA = page.locator('.paiement-fiche-item').filter({ hasText: 'deux chèques' });
  await ligneA.waitFor({ timeout: 30000 });
  c('la ligne de 480 € est « à encaisser » sur la fiche', /480/.test(await ligneA.innerText()));
  const ouvertA = await clicJusquA(page, '.paiement-fiche-item:has-text("deux chèques") button.encaisser-btn-fiche', '.modal-sheet .ef-switch-btn');
  c('la modale Encaisser s\'ouvre avec le choix « Un seul moyen / Plusieurs moyens »', ouvertA);
  c('aucun mode n\'est présélectionné : le bouton Encaisser est inactif', (await page.locator('.modal-sheet .ef-mode.active').count()) === 0 && await page.locator('.modal-sheet button.ef-confirm').isDisabled());
  await page.locator('.modal-sheet .ef-switch-btn', { hasText: 'Plusieurs moyens' }).click();
  await page.waitForSelector('.modal-sheet .ef-part', { timeout: 10000 });
  c('deux lignes proposées, découpées à 240 + 240', (await page.locator('.modal-sheet .ef-part').count()) === 2 && (await page.locator('.modal-sheet .ef-part-montant').first().inputValue()) === '240');
  // Un découpage faux : 200 + 200 → total en alerte, bouton inactif
  await page.locator('.modal-sheet .ef-part-montant').nth(0).fill('200');
  await page.locator('.modal-sheet .ef-part-montant').nth(1).fill('200');
  await page.locator('.modal-sheet .ef-part-mode').nth(0).selectOption('cheque');
  await page.locator('.modal-sheet .ef-part-mode').nth(1).selectOption('cheque');
  await dormir(300);
  c('200 + 200 : le total est signalé faux et le bouton reste inactif', (await page.locator('.modal-sheet .ef-total.warn').count()) === 1 && await page.locator('.modal-sheet button.ef-confirm').isDisabled());
  // Le bon découpage : 240 + 240, deux numéros, le premier déposé il y a 3 jours
  const dateDepot = isoParis(plusJours(auj, -3));
  await page.locator('.modal-sheet .ef-part-montant').nth(0).fill('240');
  await page.locator('.modal-sheet .ef-part-montant').nth(1).fill('240');
  await page.locator('.modal-sheet .ef-part-cheque').nth(0).fill('0012345');
  await page.locator('.modal-sheet .ef-part-cheque').nth(1).fill('0012346');
  await page.locator('.modal-sheet .ef-part-date').nth(0).fill(dateDepot);
  await dormir(300);
  c('240 + 240 : le total tombe juste, le bouton dit « Encaisser en 2 moyens »', (await page.locator('.modal-sheet .ef-total.ok').count()) === 1 && /Encaisser en 2 moyens/.test(await page.locator('.modal-sheet button.ef-confirm').innerText()));
  const [repA] = await Promise.all([
    page.waitForResponse(r => r.request().method() === 'POST' && /\/api\/paiements\/[^/]+\/encaisser/.test(r.url()), { timeout: 45000 }),
    page.locator('.modal-sheet button.ef-confirm').click(),
  ]);
  c('la route répond 200', repA.status() === 200, `status ${repA.status()}`);
  const corpsA = await repA.json().catch(() => ({}));
  c('la route rend les deux lignes réglées', Array.isArray(corpsA.paiements) && corpsA.paiements.length === 2);
  const lA = await attendre(async () => { const l = await lignesAbo(aboA.id); return l.length === 2 && l.every(p => p.statut === 'paid') ? l : null; });
  c('EN BASE : deux lignes RÉGLÉES sur l\'abo, plus rien en attente', !!lA, JSON.stringify(lA?.map(p => [p.intitule, p.statut, p.montant])));
  if (lA) {
    c('la ligne d\'origine garde son id et devient la part 1/2 à 240 €', lA.some(p => p.id === payA.id && /\(1\/2\)$/.test(p.intitule) && Number(p.montant) === 240));
    c('les deux parts sont par chèque avec leurs numéros', lA.every(p => p.mode === 'cheque') && lA.map(p => p.numero_cheque).sort().join(',') === '0012345,0012346');
    c('la date du premier chèque est celle saisie, la seconde aujourd\'hui', lA.find(p => p.numero_cheque === '0012345')?.date_encaissement === dateDepot && lA.find(p => p.numero_cheque === '0012346')?.date_encaissement === isoParis(auj));
    c('les deux parts partagent un échéancier', !!lA[0].echeancier_id && lA[0].echeancier_id === lA[1].echeancier_id);
    c('la somme fait 480 €', lA.reduce((s, p) => s + Number(p.montant), 0) === 480);
  }
  const fermee = await page.waitForSelector('.modal-backdrop', { state: 'detached', timeout: 10000 }).then(() => true).catch(() => false);
  if (!fermee) console.log('    modale encore ouverte : ' + (await page.locator('.modal-sheet').innerText().catch(() => '?')).slice(0, 300).replace(/\n/g, ' | '));
  c('la modale se ferme toute seule après l\'encaissement', fermee);
  c('deux versements 1/2 et 2/2 visibles sur la fiche', /\(1\/2\)/.test(await texte(page)) && /\(2\/2\)/.test(await texte(page)));
  await page.locator('button.tab-btn').first().click();
  const txtCarte = await attendre(async () => { const t = await texte(page); return /deux chèques/.test(t) ? t : null; }, 15000);
  const carteA = page.locator('.abo-card').filter({ hasText: 'deux chèques' });
  const txtCarteA = await carteA.innerText().catch(() => '');
  c('la carte de l\'abo dit « Réglé · 480 € » (plus de « restant »)', !!txtCarte && /Réglé · 480/.test(txtCarteA) && !/restant/.test(txtCarteA), txtCarteA.replace(/\n/g, ' | ').slice(0, 160));

  // ── B. La route refuse par elle-même ──────────────────────────────────────
  console.log('\n— B. La route refuse un découpage faux, un moyen non déclaré, un paiement déjà réglé —');
  const poster = (id, body) => page.evaluate(async ({ id, body }) => {
    const r = await fetch(`/api/paiements/${id}/encaisser`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    return { status: r.status, json: await r.json().catch(() => ({})) };
  }, { id, body });
  const rB1 = await poster(payB.id, { parts: [{ montant: 200, mode: 'cheque' }, { montant: 200, mode: 'cheque' }] });
  c('200 + 200 → 400 DECOUPAGE_REFUSE qui nomme les montants', rB1.status === 400 && rB1.json.code === 'DECOUPAGE_REFUSE' && /400,00 €/.test(rB1.json.error || ''), `${rB1.status} ${JSON.stringify(rB1.json).slice(0, 160)}`);
  const rB2 = await poster(payB.id, { parts: [{ montant: 240, mode: '' }, { montant: 240, mode: 'cheque' }] });
  c('un moyen non déclaré → 400', rB2.status === 400, `${rB2.status}`);
  const rB3 = await poster(payB.id, {});
  c('ni mode ni parts → 400', rB3.status === 400, `${rB3.status}`);
  const lB = await lignesAbo(aboB.id);
  c('EN BASE : rien n\'a été écrit, la ligne de 480 € est toujours en attente, seule', lB.length === 1 && lB[0].statut === 'pending' && Number(lB[0].montant) === 480);
  const rB4 = await poster(payA.id, { mode: 'especes' });
  c('un paiement déjà réglé → 409', rB4.status === 409, `${rB4.status}`);

  // ── C. « Encaisser un versement » écrit une ligne RÉGLÉE ──────────────────
  console.log('\n— C. « Encaisser un versement » sur un abo sans ligne en attente —');
  await aller(page, `${BASE}/clients/${fiche.id}`);
  await page.waitForSelector('button.tab-btn:has-text("Paiements")', { timeout: 90000 });
  const btnC = page.locator('.abo-card').filter({ hasText: 'versement reçu' }).locator('.abo-add-versement');
  const ouvertC = await attendre(async () => {
    await btnC.click({ timeout: 3000 }).catch(() => {});
    return page.waitForSelector('.modal-sheet .versement-switch-btn', { timeout: 2500 }).then(() => true).catch(() => null);
  }, 45000, 300);
  c('la modale s\'ouvre avec « Déjà reçu » actif par défaut', ouvertC && /active/.test(await page.locator('.modal-sheet .versement-switch-btn', { hasText: 'Déjà reçu' }).getAttribute('class')));
  c('titre « Encaisser un versement », mode à déclarer, bouton inactif', /Encaisser un versement/.test(await page.locator('.modal-sheet .modal-title').innerText()) && (await page.locator('.modal-sheet .mode-btn.active').count()) === 0);
  c('aucun encart « attendent déjà » : cet abo n\'a rien en attente', (await page.locator('.modal-sheet .versement-du').count()) === 0);
  await page.locator('.modal-sheet .montant-input').fill('55');
  c('sans mode, le bouton reste inactif même avec un montant', await page.locator('.modal-sheet button.confirm-btn').isDisabled());
  await page.locator('.modal-sheet .mode-btn', { hasText: 'Chèque' }).click();
  await page.locator('.modal-sheet input[placeholder="Ex : 0012345"]').fill('0099001');
  c('le libellé de date dit « Date d\'encaissement »', /Date d'encaissement/.test(await page.locator('.modal-sheet').innerText()));
  await page.locator('.modal-sheet button.confirm-btn').click();
  const lC = await attendre(async () => { const l = await lignesAbo(aboC.id); return l.length === 1 ? l : null; });
  c('EN BASE : une ligne RÉGLÉE de 55 € par chèque, datée d\'aujourd\'hui, avec son numéro', !!lC && lC[0].statut === 'paid' && lC[0].mode === 'cheque' && Number(lC[0].montant) === 55 && lC[0].numero_cheque === '0099001' && lC[0].date_encaissement === isoParis(auj), JSON.stringify(lC));

  // ── D. L'encart quand une ligne attend déjà ───────────────────────────────
  console.log('\n— D. « Encaisser un versement » quand 480 € attendent déjà —');
  await aller(page, `${BASE}/clients/${fiche.id}`);
  await page.waitForSelector('button.tab-btn:has-text("Paiements")', { timeout: 90000 });
  const btnD = page.locator('.abo-card').filter({ hasText: '(encart)' }).locator('.abo-add-versement');
  c('l\'abo « encart » propose « Encaisser un versement » sur sa carte', (await btnD.count()) === 1);
  const ouvertD = await attendre(async () => {
    await btnD.click({ timeout: 3000 }).catch(() => {});
    return page.waitForSelector('.modal-sheet .versement-switch-btn', { timeout: 2500 }).then(() => true).catch(() => null);
  }, 45000, 300);
  await dormir(600);
  console.log('    modale : ' + (await page.locator('.modal-sheet').innerText().catch(() => 'AUCUNE')).slice(0, 260).replace(/\n/g, ' | '));
  const encartD = ouvertD && (await page.locator('.modal-sheet .versement-du').count()) === 1;
  c('l\'encart « 480 € attendent déjà sur cet abonnement » est rendu', encartD && /480\D{0,3}€ attendent déjà/.test(await page.locator('.modal-sheet .versement-du').innerText()));
  const ouvertD2 = await clicJusquA(page, '.modal-sheet .versement-du button', '.modal-sheet .ef-switch-btn');
  c('« Encaisser 480 € » ferme la modale de versement et ouvre Encaisser sur CETTE ligne', ouvertD2 && /480/.test(await page.locator('.modal-sheet .ef-recap').innerText()) && /\(encart\)/.test(await page.locator('.modal-sheet .ef-recap').innerText()));
  await page.locator('.modal-sheet .modal-close').click();
  const lD = await lignesAbo(aboD.id);
  c('rien n\'a été écrit sur l\'abo « encart »', lD.length === 1 && lD[0].statut === 'pending');

  // ── E. Depuis Revenus → « À percevoir » ───────────────────────────────────
  console.log('\n— E. Revenus → « À percevoir » : 80 € espèces + 400 € CB —');
  // Les lignes B et D ont servi : on les retire pour que la témoin n'ait plus
  // qu'UNE ligne de 480 € en attente, celle « depuis Revenus ».
  await svc.from('paiements').delete().in('id', [payB.id, payD.id]);
  await aller(page, `${BASE}/revenus`);
  const rowE = page.locator('.a-percevoir-row').filter({ hasText: 'Marie-Pierre' }).filter({ hasText: '480' });
  await rowE.first().waitFor({ timeout: 90000 });
  const nbRows = await rowE.count();
  c('la ligne de 480 € en attente de la témoin est dans « À percevoir », et c\'est la seule', nbRows === 1, `${nbRows} ligne(s)`);
  const ouvertE = await attendre(async () => {
    await rowE.first().locator('button.a-percevoir-action').click({ timeout: 3000 }).catch(() => {});
    return page.waitForSelector('.enc-modal .ef-switch-btn', { timeout: 2500 }).then(() => true).catch(() => null);
  }, 45000, 300);
  c('la modale Encaisser de Revenus porte le même formulaire (choix des moyens)', ouvertE && /depuis Revenus/.test(await page.locator('.enc-modal .ef-recap').innerText()));
  await page.locator('.enc-modal .ef-switch-btn', { hasText: 'Plusieurs moyens' }).click();
  await page.waitForSelector('.enc-modal .ef-part', { timeout: 10000 });
  await page.locator('.enc-modal .ef-part-montant').nth(0).fill('80');
  await page.locator('.enc-modal .ef-part-mode').nth(0).selectOption('especes');
  await page.locator('.enc-modal .ef-part-montant').nth(1).fill('400');
  await page.locator('.enc-modal .ef-part-mode').nth(1).selectOption('CB');
  await dormir(300);
  const [repE] = await Promise.all([
    page.waitForResponse(r => r.request().method() === 'POST' && /\/api\/paiements\/[^/]+\/encaisser/.test(r.url()), { timeout: 45000 }),
    page.locator('.enc-modal button.ef-confirm').click(),
  ]);
  c('la route répond 200 depuis Revenus', repE.status() === 200, `status ${repE.status()}`);
  const lE = await attendre(async () => { const l = await lignesAbo(aboE.id); return l.length === 2 && l.every(p => p.statut === 'paid') ? l : null; });
  c('EN BASE : 80 € en espèces + 400 € par CB, même échéancier, plus rien en attente', !!lE && lE.some(p => p.mode === 'especes' && Number(p.montant) === 80) && lE.some(p => p.mode === 'CB' && Number(p.montant) === 400) && lE[0].echeancier_id === lE[1].echeancier_id, JSON.stringify(lE?.map(p => [p.mode, p.montant])));
  c('la ligne a quitté « À percevoir » à l\'écran', await attendre(async () => (await page.locator('.a-percevoir-row').filter({ hasText: 'Marie-Pierre' }).filter({ hasText: '480' }).count()) === nbRows - 1, 10000));

  // ── F. Le guide et la FAQ ─────────────────────────────────────────────────
  console.log('\n— F. Guide et FAQ —');
  await aller(page, `${BASE}/aide`);
  const txtAide = await attendre(async () => { const t = await texte(page); return /Plusieurs moyens ou plusieurs chèques/.test(t) ? t : null; }, 60000);
  c('le tuto « Vends tes carnets et abos » décrit « Plusieurs moyens ou plusieurs chèques » sur une ligne à encaisser', !!txtAide);
  c('le tuto « Les carnets au quotidien » explique « Encaisser un versement » et l\'encart', !!txtAide && /attend déjà/.test(txtAide));
  await aller(page, `${BASE}/support`);
  const txtFaq = await attendre(async () => { const t = await texte(page); return /me règle en deux chèques/.test(t) ? t : null; }, 60000);
  c('la FAQ répond à « l\'élève me règle en deux chèques »', !!txtFaq);

  c('aucune erreur de page pendant la preuve', erreursPage.length === 0, erreursPage.join(' | '));
} catch (e) {
  ko++;
  console.log('  KO  exception : ' + (e?.stack || e));
} finally {
  await browser.close().catch(() => {});
  await purger();
  console.log(`\n${ok} OK · ${ko} KO`);
  process.exit(ko ? 1 : 0);
}
