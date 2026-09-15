/**
 * Preuve — les deux retours de Maude du 2026-09-15.
 *
 *  1. « Encaisser un versement » s'IMPUTE sur ce qui attend déjà.
 *     Le cas exact : abonnement de 480 € vendu « à régler plus tard », premier
 *     chèque de 245 € saisi par « Déjà reçu ». Avant : 245 € réglés PAR-DESSUS
 *     480 € en attente → « reçu 245 € · 480 € restant ». Maintenant : la ligne
 *     en attente est scindée, 245 € réglés par chèque + 235 € toujours
 *     attendus, et la modale l'annonce pendant la saisie.
 *       A. vrai navigateur, fiche témoin sur le démo : modale, phrase « il
 *          restera 235 € », écriture EN BASE (part réglée avec numéro et date,
 *          reste sur le MÊME id, échéancier partagé), carte « 245 € reçu ·
 *          235 € restant », puis le second chèque solde tout : « Réglé ».
 *       B. la route seule (fetch avec la session de la prof) : deux lignes de
 *          100 € et 150 € reçus → la première réglée, la seconde scindée
 *          50/50 ; 500 € sur 480 attendus → 400 VERSEMENT_DEPASSE sans rien
 *          écrire ; reçu sans mode → 400 ; « à régler plus tard » → une ligne
 *          en attente de plus ; sans ligne en attente → une ligne réglée neuve.
 *  2. Le tableau de bord ne compte plus les séances ANNULÉES du jour : une
 *     séance témoin annulée aujourd'hui → la tuile et le bloc « Aujourd'hui »
 *     comptent sans elle, elle n'a pas de bouton « Pointer », une note la
 *     nomme « pas comptée ».
 *  3. Le guide et la FAQ disent le geste.
 *
 * Témoins purgés même en cas d'échec. Usage :
 *   node scripts/proof-versement-impute.mjs   (dev server sur :3333)
 */
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const BASE = process.env.PROOF_BASE || 'http://localhost:3333';
const EMAIL_TEMOIN = 'preuve-versement-impute@example.com';
const NOM_COURS_TEMOIN = 'Séance témoin annulée (preuve versement)';

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
  await svc.from('cours').delete().eq('profile_id', demo.id).eq('nom', NOM_COURS_TEMOIN);
}
await purger();

// ── Mise en place ────────────────────────────────────────────────────────────
const auj = new Date();
const today = isoParis(auj);
const dateVente = isoParis(plusJours(auj, -20));
{
  const { data: f, error } = await svc.from('clients').insert({
    profile_id: demo.id, prenom: 'Marie-Pierre', nom: 'Témoin bis', email: EMAIL_TEMOIN, statut: 'actif',
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
const creerPending = async (abo, nom, montant, date = dateVente) => {
  const { data, error } = await svc.from('paiements').insert({
    profile_id: demo.id, client_id: fiche.id, abonnement_id: abo.id, intitule: nom, type: 'abonnement',
    montant, statut: 'pending', mode: null, date,
  }).select('id').single();
  if (error) { console.error('paiement KO:', error.message); await purger(); process.exit(1); }
  return data;
};
const aboA = await creerAbo('Abonnement annuel (deux chèques séparés)');
const payA = await creerPending(aboA, 'Abonnement annuel (deux chèques séparés)', 480);
const aboB = await creerAbo('Abonnement (échéancier 100 + 100)');
const payB1 = await creerPending(aboB, 'Abonnement (échéancier 100 + 100) (1/2)', 100, isoParis(plusJours(auj, -10)));
const payB2 = await creerPending(aboB, 'Abonnement (échéancier 100 + 100) (2/2)', 100, isoParis(plusJours(auj, 20)));
const aboC = await creerAbo('Abonnement (dépasse)');
const payC = await creerPending(aboC, 'Abonnement (dépasse)', 480);
const aboD = await creerAbo('Abo au mois (sans attente)');

// La séance témoin ANNULÉE d'aujourd'hui, pour le tableau de bord.
const { data: coursTemoin, error: coursErr } = await svc.from('cours').insert({
  profile_id: demo.id, nom: NOM_COURS_TEMOIN, date: today, heure: '23:30', duree_minutes: 30, est_annule: true, type_cours: 'Yoga',
}).select('id').single();
if (coursErr) { console.error('cours témoin KO:', coursErr.message); await purger(); process.exit(1); }
const { data: coursJourDb } = await svc.from('cours').select('id, est_annule').eq('profile_id', demo.id).eq('date', today);
const nbMaintenus = (coursJourDb || []).filter(x => !x.est_annule).length;
const nbAnnules = (coursJourDb || []).filter(x => x.est_annule).length;

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

const lignesAbo = async (aboId) => (await svc.from('paiements').select('id, statut, mode, montant, numero_cheque, date_encaissement, echeancier_id, intitule, date').eq('abonnement_id', aboId).order('created_at')).data || [];

try {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 1000 } });
  await ctx.addCookies((await sessionCookies('camille@atelier-soleil.fr')).map(cc => ({ ...cc, url: BASE, sameSite: 'Lax' })));
  const page = await ctx.newPage();
  const erreursPage = [];
  page.on('pageerror', e => erreursPage.push(String(e).slice(0, 160)));

  // Préchauffe (Fast Refresh à la première compilation, §12).
  await aller(page, `${BASE}/clients/${fiche.id}`);
  await page.waitForSelector('button.tab-btn:has-text("Paiements")', { timeout: 90000 });
  await page.evaluate(() => fetch('/api/abonnements/00000000-0000-0000-0000-000000000000/versement', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{"recu":true,"montant":1,"mode":"especes"}' }).catch(() => {}));
  await dormir(1500);

  const ouvrirVersement = async (aboTexte) => {
    await aller(page, `${BASE}/clients/${fiche.id}`);
    await page.waitForSelector('button.tab-btn:has-text("Paiements")', { timeout: 90000 });
    const btn = page.locator('.abo-card').filter({ hasText: aboTexte }).locator('.abo-add-versement');
    return attendre(async () => {
      await btn.click({ timeout: 3000 }).catch(() => {});
      return page.waitForSelector('.modal-sheet .versement-switch-btn', { timeout: 2500 }).then(() => true).catch(() => null);
    }, 45000, 300);
  };
  const posterVersement = (aboId, body) => page.evaluate(async ({ aboId, body }) => {
    const r = await fetch(`/api/abonnements/${aboId}/versement`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    return { status: r.status, json: await r.json().catch(() => ({})) };
  }, { aboId, body });

  // ── A. Le premier chèque de Marie-Pierre, en vrai navigateur ──────────────
  console.log('\n— A. « Déjà reçu » 245 € pendant que 480 € attendent —');
  const ouvertA = await ouvrirVersement('deux chèques séparés');
  c('la modale « Encaisser un versement » s\'ouvre, « Déjà reçu » actif', ouvertA && /active/.test(await page.locator('.modal-sheet .versement-switch-btn', { hasText: 'Déjà reçu' }).getAttribute('class')));
  const encart = page.locator('.modal-sheet [data-testid="versement-imputation"]');
  c('l\'encart dit que 480 € attendent et que le versement s\'en déduira', (await encart.count()) === 1 && /480\D{0,3}€ attendent/.test(await encart.innerText()) && /s'en déduira/.test(await encart.innerText()), (await encart.innerText().catch(() => '')).slice(0, 160).replace(/\n/g, ' | '));
  await page.locator('.modal-sheet .montant-input').fill('245');
  await dormir(200);
  c('en tapant 245, la phrase devient « il restera 235 € à encaisser »', /245\D{0,3}€ se déduisent des 480/.test(await encart.innerText()) && /restera 235\D{0,3}€/.test(await encart.innerText()), (await encart.innerText()).slice(0, 200).replace(/\n/g, ' | '));
  c('« Tout arrive d\'un coup ? » garde le chemin « Encaisser 480 € »', /Encaisser 480/.test(await encart.innerText()));
  await page.locator('.modal-sheet .montant-input').fill('500');
  await dormir(200);
  c('500 € sur 480 attendus : la phrase refuse et nomme les montants', /dépasse/.test(await encart.innerText()) && /480/.test(await encart.innerText()));
  await page.locator('.modal-sheet .montant-input').fill('245');
  await page.locator('.modal-sheet .mode-btn', { hasText: 'Chèque' }).click();
  await page.locator('.modal-sheet input[placeholder="Ex : 0012345"]').fill('5452087');
  const dateCheque = isoParis(plusJours(auj, -7));
  await page.locator('.modal-sheet input[type="date"]').fill(dateCheque);
  const [repA] = await Promise.all([
    page.waitForResponse(r => r.request().method() === 'POST' && /\/api\/abonnements\/[^/]+\/versement/.test(r.url()), { timeout: 45000 }),
    page.locator('.modal-sheet button.confirm-btn').click(),
  ]);
  c('la route répond 200', repA.status() === 200, `status ${repA.status()}`);
  const corpsA = await repA.json().catch(() => ({}));
  c('la réponse dit qu\'une ligne a été scindée (245 réglés, 235 restants)', Array.isArray(corpsA.imputation) && corpsA.imputation.length === 1 && corpsA.imputation[0].action === 'scinder' && corpsA.imputation[0].paye === 245 && corpsA.imputation[0].reste === 235, JSON.stringify(corpsA.imputation));
  const lA = await attendre(async () => { const l = await lignesAbo(aboA.id); return l.length === 2 ? l : null; });
  c('EN BASE : deux lignes sur l\'abo, une réglée et une en attente', !!lA && lA.filter(p => p.statut === 'paid').length === 1 && lA.filter(p => p.statut === 'pending').length === 1, JSON.stringify(lA?.map(p => [p.statut, p.montant, p.mode, p.numero_cheque])));
  if (lA) {
    const reglee = lA.find(p => p.statut === 'paid');
    const attente = lA.find(p => p.statut === 'pending');
    c('la part réglée : 245 € par chèque, son numéro, la date saisie', Number(reglee.montant) === 245 && reglee.mode === 'cheque' && reglee.numero_cheque === '5452087' && reglee.date_encaissement === dateCheque);
    c('la ligne en attente garde son id et passe à 235 €', attente.id === payA.id && Number(attente.montant) === 235);
    c('les deux partagent un échéancier', !!reglee.echeancier_id && reglee.echeancier_id === attente.echeancier_id);
    c('la somme fait toujours 480 €', lA.reduce((s, p) => s + Number(p.montant), 0) === 480);
  }
  const fermee = await page.waitForSelector('.modal-backdrop', { state: 'detached', timeout: 10000 }).then(() => true).catch(() => false);
  c('la modale se ferme toute seule', fermee);
  const carteA = page.locator('.abo-card').filter({ hasText: 'deux chèques séparés' });
  const txtCarteA = await attendre(async () => { const t = await carteA.innerText().catch(() => ''); return /245/.test(t) && /235/.test(t) ? t : null; }, 15000);
  c('la carte dit « 245 € reçu · 235 € restant » (plus jamais « 480 € restant »)', !!txtCarteA && /245\D{0,3}€ reçu/.test(txtCarteA) && /235\D{0,3}€ restant/.test(txtCarteA) && !/480\D{0,3}€ restant/.test(txtCarteA), (txtCarteA || '').replace(/\n/g, ' | ').slice(0, 200));

  // Le second chèque solde tout.
  console.log('\n— A2. Le second chèque de 235 € —');
  const ouvertA2 = await ouvrirVersement('deux chèques séparés');
  c('la modale se rouvre, l\'encart dit maintenant que 235 € attendent', ouvertA2 && /235\D{0,3}€ attendent/.test(await encart.innerText()));
  await page.locator('.modal-sheet .montant-input').fill('235');
  await dormir(200);
  c('235 € : la phrase dit que tout est soldé', /soldent/.test(await encart.innerText()) && /plus rien à encaisser/.test(await encart.innerText()));
  await page.locator('.modal-sheet .mode-btn', { hasText: 'Chèque' }).click();
  await page.locator('.modal-sheet input[placeholder="Ex : 0012345"]').fill('5452088');
  const [repA2] = await Promise.all([
    page.waitForResponse(r => r.request().method() === 'POST' && /\/api\/abonnements\/[^/]+\/versement/.test(r.url()), { timeout: 45000 }),
    page.locator('.modal-sheet button.confirm-btn').click(),
  ]);
  c('la route répond 200 et a RÉGLÉ la ligne restante (pas scindé)', repA2.status() === 200 && (await repA2.json().catch(() => ({}))).imputation?.[0]?.action === 'regler');
  const lA2 = await attendre(async () => { const l = await lignesAbo(aboA.id); return l.length === 2 && l.every(p => p.statut === 'paid') ? l : null; });
  c('EN BASE : 245 + 235 réglés par chèque, deux numéros, plus rien en attente, toujours deux lignes', !!lA2 && lA2.map(p => p.numero_cheque).sort().join(',') === '5452087,5452088' && lA2.every(p => p.mode === 'cheque'), JSON.stringify(lA2?.map(p => [p.statut, p.montant, p.numero_cheque])));
  const txtCarteA2 = await attendre(async () => { const t = await carteA.innerText().catch(() => ''); return /Réglé/.test(t) ? t : null; }, 15000);
  c('la carte dit « Réglé · 480 € »', !!txtCarteA2 && /Réglé · 480/.test(txtCarteA2) && !/restant/.test(txtCarteA2), (txtCarteA2 || '').replace(/\n/g, ' | ').slice(0, 160));

  // ── B. La route seule ─────────────────────────────────────────────────────
  console.log('\n— B. La route, cas par cas —');
  const rB = await posterVersement(aboB.id, { recu: true, montant: 150, mode: 'virement' });
  c('150 € sur 100 + 100 : la première réglée, la seconde scindée 50/50', rB.status === 200 && rB.json.imputation?.length === 2 && rB.json.imputation[0].action === 'regler' && rB.json.imputation[1].action === 'scinder' && rB.json.imputation[1].reste === 50, `${rB.status} ${JSON.stringify(rB.json.imputation)}`);
  const lB = await attendre(async () => { const l = await lignesAbo(aboB.id); return l.length === 3 ? l : null; });
  c('EN BASE : la plus ANCIENNE échéance est réglée entière, la suivante à 50 € en attente, 50 € réglés à côté', !!lB && lB.find(p => p.id === payB1.id)?.statut === 'paid' && Number(lB.find(p => p.id === payB1.id)?.montant) === 100 && lB.find(p => p.id === payB2.id)?.statut === 'pending' && Number(lB.find(p => p.id === payB2.id)?.montant) === 50 && lB.some(p => p.statut === 'paid' && Number(p.montant) === 50 && p.mode === 'virement'), JSON.stringify(lB?.map(p => [p.statut, p.montant])));
  c('la somme des trois fait toujours 200 €', !!lB && lB.reduce((s, p) => s + Number(p.montant), 0) === 200);

  const rC = await posterVersement(aboC.id, { recu: true, montant: 500, mode: 'especes' });
  c('500 € sur 480 attendus → 400 VERSEMENT_DEPASSE', rC.status === 400 && rC.json.code === 'VERSEMENT_DEPASSE' && /480/.test(rC.json.error || ''), `${rC.status} ${JSON.stringify(rC.json).slice(0, 160)}`);
  const rC2 = await posterVersement(aboC.id, { recu: true, montant: 100 });
  c('reçu sans mode → 400', rC2.status === 400, `${rC2.status}`);
  const lC = await lignesAbo(aboC.id);
  c('EN BASE : rien n\'a bougé sur cet abo, 480 € toujours en attente, seuls', lC.length === 1 && lC[0].id === payC.id && lC[0].statut === 'pending' && Number(lC[0].montant) === 480);
  const rC3 = await posterVersement(aboC.id, { recu: false, montant: 100, date: isoParis(plusJours(auj, 30)) });
  c('« à régler plus tard » 100 € → une ligne en attente de plus, rien d\'imputé', rC3.status === 200 && rC3.json.imputation?.length === 0 && rC3.json.paiements?.[0]?.statut === 'pending');
  const lC3 = await lignesAbo(aboC.id);
  c('EN BASE : 480 € et 100 € en attente', lC3.length === 2 && lC3.every(p => p.statut === 'pending'));

  const rD = await posterVersement(aboD.id, { recu: true, montant: 55, mode: 'CB' });
  c('sans ligne en attente : une ligne RÉGLÉE neuve, rien d\'imputé', rD.status === 200 && rD.json.imputation?.length === 0 && rD.json.paiements?.[0]?.statut === 'paid' && Number(rD.json.paiements[0].montant) === 55);
  const rX = await posterVersement('00000000-0000-0000-0000-000000000000', { recu: true, montant: 10, mode: 'CB' });
  c('un abo inconnu → 404', rX.status === 404, `${rX.status}`);

  // ── 2. Le tableau de bord et la séance annulée ───────────────────────────
  console.log('\n— 2. Tableau de bord : la séance annulée n\'est pas comptée —');
  await aller(page, `${BASE}/dashboard`);
  await page.waitForSelector('[data-testid="dash-seances-jour"]', { timeout: 90000 });
  const tuile = (await page.locator('[data-testid="dash-seances-jour"]').innerText()).trim();
  c(`la tuile « Séances aujourd'hui » compte ${nbMaintenus} (les ${nbAnnules} annulée(s) exclue(s))`, tuile === String(nbMaintenus), `tuile = ${tuile}`);
  const txtDash = await texte(page);
  const note = page.locator('[data-testid="dash-seances-annulees"]');
  c('une note nomme la séance annulée, « pas comptée »', (await note.count()) === 1 && /pas compt/.test(await note.innerText()));
  c('la séance annulée n\'a PAS de carte « Pointer » dans la liste du jour', (await page.locator('.cours-card').filter({ hasText: NOM_COURS_TEMOIN }).count()) === 0);
  if (nbMaintenus > 0) {
    c(`le bloc « Aujourd'hui » dit « ${nbMaintenus} cours », pas ${nbMaintenus + nbAnnules}`, new RegExp(`\\b${nbMaintenus} cours`).test(txtDash) && !new RegExp(`\\b${nbMaintenus + nbAnnules} cours`).test(txtDash));
  }

  // ── 3. Guide et FAQ ───────────────────────────────────────────────────────
  console.log('\n— 3. Guide et FAQ —');
  await aller(page, `${BASE}/aide`);
  const txtAide = await attendre(async () => { const t = await texte(page); return /Encaisser un versement/.test(t) ? t : null; }, 60000);
  c('le guide dit que le versement « s\'en déduit » et cite « il restera 235 € »', !!txtAide && /s'en déduit/.test(txtAide) && /restera 235/.test(txtAide));
  await aller(page, `${BASE}/support`);
  // Les réponses sont repliées : on ouvre la question comme la prof.
  const questionFaq = page.locator('.faq-item .faq-q').filter({ hasText: 'me règle en deux chèques' });
  await questionFaq.first().waitFor({ timeout: 60000 });
  // Le clic peut partir avant l'hydratation (piège v100) : on re-clique
  // jusqu'à ce que la réponse soit visible, et on dit ce qu'on a lu.
  const txtFaq = await attendre(async () => {
    await questionFaq.first().click({ timeout: 3000 }).catch(() => {});
    await dormir(400);
    const t = await texte(page);
    return /premier chèque arrive seul/.test(t) ? t : null;
  }, 20000, 600);
  if (!txtFaq) console.log('    réponse lue : ' + (await page.locator('.faq-item.open').innerText().catch(() => 'AUCUNE OUVERTE')).slice(0, 240).replace(/\n/g, ' | '));
  c('la FAQ dit que le premier chèque seul se déduit de ce qui est attendu', !!txtFaq && /restera 235/.test(txtFaq));

  c('aucune erreur de page pendant la preuve', erreursPage.length === 0, erreursPage.join(' | '));
} catch (e) {
  ko++;
  console.log('  KO  exception : ' + (e?.stack || e));
} finally {
  await browser.close().catch(() => {});
  await purger();
}

console.log(`\n${ok} OK / ${ko} KO`);
process.exit(ko ? 1 : 0);
