/**
 * PREUVE — le lot 3 du chantier Associations & Studios : la vie de
 * l'association (v113, 2026-09-13, PLAN-ASSOS-STUDIOS-2026.md §5.1).
 *
 * Auto-adaptative : elle SONDE v113 (`adhesions`, `studio_membres.fonction`)
 * et déroule ce qui est prouvable :
 *
 *   A. (toujours) Une association jetable (plan asso, RNA) et un studio
 *      jetable. L'entrée « Association » n'existe QUE pour l'association,
 *      la page se rend (4 onglets) et dit si v113 manque ; /association
 *      renvoie le studio vers son tableau de bord ; l'URSSAF s'éteint pour
 *      l'association (bloc absent de /revenus, page de déclaration qui
 *      refuse) et reste allumée pour le studio ; le cas « Réservation sans
 *      adhésion à jour » n'est proposé qu'à l'association ; le type d'offre
 *      « Adhésion » n'est proposé qu'à l'association ; la fonction du bureau
 *      à l'invitation propose ses droits (trésorière → argent). Sans v113 :
 *      chaque écriture répond 503 MIGRATION_V113_REQUISE, la base refuse une
 *      offre de type adhesion, rien n'est écrit.
 *   B. (v113) L'adhésion vendue depuis la FICHE en vrai navigateur → paiement
 *      + adhésion EN BASE, le reçu de cotisation (simple, puis numéroté avec
 *      le SIRET, intitulé « REÇU DE COTISATION »), une seconde adhésion de la
 *      même saison refusée (409), le filtre « Adhérentes à jour » de /clients,
 *      « Mon adhésion » dans l'espace élève ; la règle « bloquer » → 403
 *      ADHESION_REQUISE pour une inconnue et 200 pour l'adhérente ; la règle
 *      « accepter » → réservation acceptée et repère « sans adhésion » au
 *      pointage sur la bonne ligne seulement ; documents (version courante
 *      par type) ; AG créée, convoquée en vrai navigateur → messages EN BASE
 *      pour les adhérentes à jour au jour de l'AG, feuille d'émargement
 *      imprimable, tenue + quorum ; le bureau affiche la fonction.
 *
 * Re-runnable : comptes, profils, données purgés même en échec. Aucun email
 * réel (@example.com). Serveur : PROOF_BASE (défaut :3333).
 */
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const BASE = process.env.PROOF_BASE || 'http://localhost:3333';
const env = Object.fromEntries(
  readFileSync(join(process.cwd(), '.env.local'), 'utf8')
    .split('\n').filter(l => l.includes('=') && !l.startsWith('#'))
    .map(l => [l.slice(0, l.indexOf('=')).trim(), l.slice(l.indexOf('=') + 1).trim()])
);
const PROJECT_REF = new URL(env.NEXT_PUBLIC_SUPABASE_URL).hostname.split('.')[0];
const svc = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

let ok = 0, ko = 0;
const c = (l, cond, d = '') => { if (cond) { ok++; console.log('  OK  ' + l + (d ? ' - ' + d : '')); } else { ko++; console.log('  KO  ' + l + (d ? ' - ' + d : '')); } };
const info = (l) => console.log('  ..  ' + l);
const dormir = (ms) => new Promise(r => setTimeout(r, ms));
const attendre = async (fn, ms = 20000, pas = 500) => { const fin = Date.now() + ms; for (;;) { const r = await fn(); if (r) return r; if (Date.now() > fin) return null; await dormir(pas); } };
const TS = Date.now().toString(36);
const j = (n) => new Date(Date.now() + n * 864e5).toISOString().slice(0, 10);
const AUJ = new Date().toLocaleDateString('sv-SE', { timeZone: 'Europe/Paris' });
const SAISON = (() => { const [a, m] = AUJ.split('-').map(Number); const d = m >= 9 ? a : a - 1; return `${d}-${d + 1}`; })();
const aller = async (page, url) => {
  try { await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 120000 }); }
  catch (e) { if (!/ERR_ABORTED|interrupted by another navigation/.test(String(e))) throw e; await dormir(1500); await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 120000 }); }
};
const texte = async (page) => page.evaluate(() => document.body.innerText);
const clicJusquA = async (page, sel, temoin, essais = 8) => {
  for (let i = 0; i < essais; i++) {
    await page.click(sel).catch(() => {});
    if (await page.waitForSelector(temoin, { timeout: 2500 }).then(() => true).catch(() => false)) return true;
  }
  return false;
};

// ── Sondes : une vraie lecture, jamais un head/count ────────────────────────
const V113 = !(await svc.from('adhesions').select('id').limit(1)).error && !(await svc.from('studio_membres').select('id, fonction').limit(1)).error;
console.log(`\nPhase ${V113 ? 'B (v113 appliquée)' : 'A (dégradée, v113 absente)'} · saison ${SAISON}`);

const PREFIXE = 'preuve-vieasso-';
const COMPTES = {
  as: { email: `${PREFIXE}asso-${TS}@example.com`, slug: `${PREFIXE}asso-${TS}`, nom: 'Yoga Pour Tous Preuve' },
  st: { email: `${PREFIXE}studio-${TS}@example.com`, slug: `${PREFIXE}studio-${TS}`, nom: 'Studio Preuve Vie' },
  tr: { email: `${PREFIXE}tresoriere-${TS}@example.com` },
  el: { email: `${PREFIXE}eleve-${TS}@example.com` },
};

async function purger() {
  const { data: lst } = await svc.auth.admin.listUsers({ page: 1, perPage: 200 }).catch(() => ({ data: null }));
  for (const u of (lst?.users || []).filter(x => (x.email || '').startsWith(PREFIXE))) {
    for (const t of ['assemblees', 'documents_structure', 'adhesions', 'factures']) await svc.from(t).delete().eq('profile_id', u.id).then(() => {}, () => {});
    await svc.from('studio_membres').delete().eq('profile_id', u.id).then(() => {}, () => {});
    await svc.from('studio_membres').delete().eq('auth_user_id', u.id).then(() => {}, () => {});
    await svc.from('paiements').delete().eq('profile_id', u.id);
    await svc.from('presences').delete().eq('profile_id', u.id);
    await svc.from('messages').delete().eq('profile_id', u.id).then(() => {}, () => {});
    await svc.from('conversations').delete().eq('profile_id', u.id).then(() => {}, () => {});
    await svc.from('abonnements').delete().eq('profile_id', u.id);
    await svc.from('cours').delete().eq('profile_id', u.id);
    await svc.from('offres').delete().eq('profile_id', u.id);
    await svc.from('clients').delete().eq('profile_id', u.id);
    await svc.auth.admin.deleteUser(u.id).catch(() => {});
  }
}

const sessionCookies = async (email) => {
  const { data: linkData } = await svc.auth.admin.generateLink({ type: 'magiclink', email });
  const anon = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: otp } = await anon.auth.verifyOtp({ type: 'magiclink', token_hash: linkData.properties.hashed_token });
  const value = 'base64-' + Buffer.from(JSON.stringify(otp.session)).toString('base64url');
  const nm = `sb-${PROJECT_REF}-auth-token`;
  const cookies = [];
  if (value.length <= 3180) cookies.push({ name: nm, value });
  else for (let i = 0; i * 3180 < value.length; i++) cookies.push({ name: `${nm}.${i}`, value: value.slice(i * 3180, (i + 1) * 3180) });
  return { cookies, session: otp.session };
};
const enteteCookie = async (email) => (await sessionCookies(email)).cookies.map(k => `${k.name}=${k.value}`).join('; ');
const api = async (cookie, path, init = {}) => {
  const r = await fetch(`${BASE}${path}`, { ...init, redirect: 'manual', headers: { 'Content-Type': 'application/json', ...(cookie ? { cookie } : {}), ...(init.headers || {}) } });
  const type = r.headers.get('content-type') || '';
  let body = null;
  if (type.includes('json')) { try { body = await r.json(); } catch { /* vide */ } }
  else if (type.includes('pdf')) { body = { pdf: (await r.arrayBuffer()).byteLength }; }
  else { body = { texte: await r.text().catch(() => '') }; }
  return { status: r.status, body, type, headers: r.headers };
};
let visiteur = 0;
const reserver = (slug, coursId, nom, email) => api(null, `/api/portail/${slug}/reserver`, { method: 'POST', headers: { 'x-forwarded-for': `203.0.113.${++visiteur}` }, body: JSON.stringify({ coursId, nom, email, tel: '' }) });

async function creerProf(cle, profil) {
  const s = COMPTES[cle];
  const { data: cree, error } = await svc.auth.admin.createUser({ email: s.email, email_confirm: true, password: `Preuve-${TS}!`, user_metadata: { prenom: 'Preuve' } });
  if (error) { console.error(`createUser ${cle}:`, error.message); await purger(); process.exit(1); }
  s.id = cree.user.id;
  const prof = await attendre(async () => { const { data } = await svc.from('profiles').select('id').eq('id', s.id).maybeSingle(); return data || null; }, 15000, 500);
  if (!prof) { console.error('profil non créé'); await purger(); process.exit(1); }
  const { error: eMaj } = await svc.from('profiles').update({ studio_nom: s.nom, studio_slug: s.slug, portail_actif: true, prenom: 'Preuve', nom: 'Vie', ...profil }).eq('id', s.id);
  if (eMaj) { console.error(`profil ${cle}:`, eMaj.message); await purger(); process.exit(1); }
  return s;
}
const contexte = async (browser, email, vp = { width: 1280, height: 1000 }) => {
  const ctx = await browser.newContext({ viewport: vp });
  await ctx.addCookies((await sessionCookies(email)).cookies.map(cc => ({ ...cc, url: BASE, sameSite: 'Lax' })));
  const page = await ctx.newPage();
  page.on('dialog', d => d.accept());
  return { ctx, page };
};

let chromium; try { ({ chromium } = await import('playwright')); } catch { ({ chromium } = await import('@playwright/test')); }
let browser; try { browser = await chromium.launch({ channel: 'msedge' }); } catch { browser = await chromium.launch(); }

try {
  await purger();
  for (let i = 0; i < 60; i++) { try { const r = await fetch(`${BASE}/login`); if (r.ok) break; } catch { /* pas prêt */ } await dormir(2000); }

  const as = await creerProf('as', { plan: 'asso', type_structure: 'association', rna: 'W123456789', trial_started_at: j(-60), stripe_subscription_status: null, pays: 'FR', urssaf_config: { regime: 'micro_bnc', periodicite: 'trimestrielle' } });
  const st = await creerProf('st', { plan: 'studio', type_structure: 'studio', trial_started_at: j(-60), stripe_subscription_status: null, pays: 'FR', urssaf_config: { regime: 'micro_bnc', periodicite: 'trimestrielle' } });
  const cookieAs = await enteteCookie(as.email);
  const cookieSt = await enteteCookie(st.email);

  // Deux fiches : Maya (adhérente), Nora (jamais adhérente). L'élève Maya a un compte.
  const { data: fiches } = await svc.from('clients').insert([
    { profile_id: as.id, prenom: 'Maya', nom: 'Adherente', email: COMPTES.el.email, statut: 'actif' },
    { profile_id: as.id, prenom: 'Nora', nom: 'Sansadhesion', email: `${PREFIXE}nora-${TS}@example.com`, statut: 'actif' },
  ]).select('id, prenom, email');
  const maya = fiches.find(f => f.prenom === 'Maya'), nora = fiches.find(f => f.prenom === 'Nora');
  const { data: creeEl } = await svc.auth.admin.createUser({ email: COMPTES.el.email, email_confirm: true, user_metadata: { role: 'eleve' } });
  COMPTES.el.id = creeEl?.user?.id;

  // ═══ A. Ce qui se prouve avec ou sans v113 ══════════════════════════════
  console.log('\n══════ A. L\'association et le studio : ce que chacun voit ══════');
  const { ctx: ctxA, page: pA } = await contexte(browser, as.email);
  await aller(pA, `${BASE}/association`);
  await pA.waitForSelector('[data-testid="association-onglet-bureau"]', { timeout: 90000 }).catch(() => {});
  c('/association se rend pour l\'association (4 onglets)', !!(await pA.$('[data-testid="association-onglet-assemblees"]')), pA.url());
  c('l\'entrée « Association » est dans sa nav', await pA.evaluate(() => !!document.querySelector('nav a[href="/association"]')));
  if (!V113) c('… et dit que la mise à jour n\'est pas appliquée', !!(await pA.$('[data-testid="association-indisponible"]')));
  else c('… sans bandeau d\'indisponibilité', !(await pA.$('[data-testid="association-indisponible"]')));

  const { ctx: ctxS, page: pS } = await contexte(browser, st.email);
  await aller(pS, `${BASE}/association`);
  await attendre(async () => !pS.url().includes('/association'), 60000, 500);
  c('un studio est renvoyé vers son tableau de bord', !pS.url().includes('/association'), pS.url());
  c('… et n\'a pas d\'entrée « Association »', await pS.evaluate(() => !document.querySelector('nav a[href="/association"]')));

  // URSSAF : éteinte pour l'association, allumée pour le studio.
  await aller(pA, `${BASE}/revenus`);
  await pA.waitForSelector('h1', { timeout: 90000 }).catch(() => {});
  await attendre(async () => (await texte(pA)).includes('Encaissé') || (await texte(pA)).includes('Revenus'), 30000, 500);
  await dormir(2500);
  c('/revenus de l\'association n\'a pas le bloc « Ma déclaration URSSAF »', !(await texte(pA)).includes('Ma déclaration URSSAF'));
  await aller(pS, `${BASE}/revenus`);
  await pS.waitForSelector('h1', { timeout: 90000 }).catch(() => {});
  await attendre(async () => (await texte(pS)).includes('Ma déclaration URSSAF'), 30000, 500);
  c('… le studio, lui, l\'a toujours', (await texte(pS)).includes('Ma déclaration URSSAF'));
  await aller(pA, `${BASE}/revenus/declaration/T3-${AUJ.slice(0, 4)}`);
  await pA.waitForSelector('h1', { timeout: 90000 }).catch(() => {});
  c('la page de déclaration refuse pour une association, et renvoie vers la compta', (await texte(pA)).includes('Pas de déclaration URSSAF pour une association') && await pA.evaluate(() => !!document.querySelector('a[href^="/compta"]')));

  // Cas particuliers : la règle « sans adhésion » n'existe que pour l'association.
  await aller(pA, `${BASE}/parametres/cas-particuliers`);
  await pA.waitForSelector('.rm-card', { timeout: 90000 }).catch(() => {});
  c('Cas particuliers de l\'association propose « Réservation sans adhésion à jour »', (await texte(pA)).includes('Réservation sans adhésion à jour'));
  await aller(pS, `${BASE}/parametres/cas-particuliers`);
  await pS.waitForSelector('.rm-card', { timeout: 90000 }).catch(() => {});
  c('… pas celui du studio', !(await texte(pS)).includes('Réservation sans adhésion à jour'));

  // Offres : le type « Adhésion » n'est proposé qu'à l'association.
  await aller(pA, `${BASE}/offres/nouveau`);
  await pA.waitForSelector('form.no-form', { timeout: 90000 }).catch(() => {});
  await attendre(async () => (await texte(pA)).includes('Cotisation de saison'), 15000, 500);
  c('Créer une offre propose « Adhésion » à l\'association', (await texte(pA)).includes('Cotisation de saison, sans séance'));
  await aller(pS, `${BASE}/offres/nouveau`);
  await pS.waitForSelector('form.no-form', { timeout: 90000 }).catch(() => {});
  await dormir(1500);
  c('… pas au studio', !(await texte(pS)).includes('Cotisation de saison'));

  // Le bureau : la fonction à l'invitation propose ses droits.
  const inv = await api(cookieAs, '/api/equipe', { method: 'POST', body: JSON.stringify({ email: COMPTES.tr.email, prenom: 'Théa', nom: 'Preuve', role: 'prof', fonction: 'tresoriere', permissions: { argent_voir: true, argent_gerer: true, eleves_voir: true } }) });
  const membreId = inv.body?.membre?.id;
  c('inviter une trésorière → 200 (droits argent posés)', inv.status === 200 && !!membreId && inv.body.membre.permissions?.argent_gerer === true, `${inv.status} ${inv.body?.code || ''}`);
  const { data: mDb } = await svc.from('studio_membres').select('*').eq('id', membreId || '00000000-0000-0000-0000-000000000000').maybeSingle();
  if (V113) c('… sa fonction « tresoriere » est EN BASE', mDb?.fonction === 'tresoriere', mDb?.fonction);
  else c('… sans v113 la fonction n\'est pas enregistrée (colonne absente), l\'invitation passe quand même', !!mDb && !('fonction' in (mDb || {})) || mDb?.fonction == null);
  const { data: offreAdh, error: eOffre } = await svc.from('offres').insert({ profile_id: as.id, nom: 'Adhésion plein tarif', type: 'adhesion', prix: 20, actif: true }).select('id, nom, prix').single();
  if (!V113) {
    console.log('\n══════ A bis. Sans v113, chaque écriture le dit ══════');
    c('la base refuse une offre de type adhesion (CHECK v113 absent)', !!eOffre, eOffre?.code);
    const vente = await api(cookieAs, '/api/adhesions', { method: 'POST', body: JSON.stringify({ client_id: maya.id, saison: SAISON, montant: 20, paye: true, mode: 'especes' }) });
    c('POST /api/adhesions → 503 MIGRATION_V113_REQUISE', vente.status === 503 && vente.body?.code === 'MIGRATION_V113_REQUISE', `${vente.status} ${vente.body?.code}`);
    const { count } = await svc.from('paiements').select('id', { count: 'exact', head: true }).eq('profile_id', as.id);
    c('… et aucun paiement orphelin n\'est resté', count === 0, String(count));
    const liste = await api(cookieAs, '/api/adhesions');
    c('GET /api/adhesions → 503, jamais une liste vide qui ment', liste.status === 503 && liste.body?.indisponible === true);
    const doc = await api(cookieAs, '/api/association/documents', { method: 'POST', body: JSON.stringify({ type: 'statuts', titre: 'Statuts 2026', url: 'https://example.com/statuts.pdf' }) });
    c('POST /api/association/documents → 503', doc.status === 503 && doc.body?.code === 'MIGRATION_V113_REQUISE', `${doc.status}`);
    const ag = await api(cookieAs, '/api/association/assemblees', { method: 'POST', body: JSON.stringify({ type: 'ordinaire', date: j(20) }) });
    c('POST /api/association/assemblees → 503', ag.status === 503 && ag.body?.code === 'MIGRATION_V113_REQUISE', `${ag.status}`);
    const agSt = await api(cookieSt, '/api/association/assemblees');
    c('le studio (plan Studio) n\'a pas la capacité vie_asso (403)', agSt.status === 403, `${agSt.status} ${agSt.body?.code || ''}`);
    await aller(pA, `${BASE}/clients/${maya.id}`);
    await pA.waitForSelector('h1', { timeout: 90000 }).catch(() => {});
    await dormir(1500);
    c('la fiche d\'une adhérente ne montre pas de bloc Adhésion tant que v113 manque (rien qui mente)', !(await pA.$('[data-testid="adhesion-fiche"]')));
  }

  // ═══ B. v113 : la boucle complète ═══════════════════════════════════════
  if (V113) {
    console.log('\n══════ B. L\'adhésion, vendue depuis la fiche ══════');
    c('l\'offre « Adhésion plein tarif » (type adhesion) est acceptée par la base', !!offreAdh && !eOffre, eOffre?.message);
    await aller(pA, `${BASE}/clients/${maya.id}`);
    await pA.waitForSelector('[data-testid="adhesion-fiche"]', { timeout: 90000 });
    c('la fiche de Maya porte le bloc Adhésion, « pas d\'adhésion à jour »', (await pA.getAttribute('[data-testid="adhesion-fiche"]', 'data-etat')) === 'sans');
    c('la modale s\'ouvre', await clicJusquA(pA, '[data-testid="adhesion-ouvrir"]', '[data-testid="adhesion-modal"]'));
    await pA.waitForSelector('[data-testid="adhesion-offre"]', { timeout: 30000 });
    await pA.selectOption('[data-testid="adhesion-offre"]', offreAdh.id);
    c('l\'offre choisie préremplit le montant (20)', (await pA.inputValue('[data-testid="adhesion-montant"]')) === '20');
    await pA.click('[data-testid="adhesion-enregistrer"]');
    await dormir(800);
    c('« payée » sans mode de règlement : rien n\'est écrit (leçon Kim)', (await svc.from('adhesions').select('id').eq('profile_id', as.id)).data.length === 0);
    await pA.selectOption('[data-testid="adhesion-mode"]', 'especes');
    await pA.click('[data-testid="adhesion-enregistrer"]');
    const adhDb = await attendre(async () => { const { data } = await svc.from('adhesions').select('*').eq('profile_id', as.id).eq('client_id', maya.id).maybeSingle(); return data || null; }, 30000, 500);
    c('l\'adhésion est EN BASE : saison, dates septembre → août, 20 €, offre', !!adhDb && adhDb.saison === SAISON && adhDb.date_debut === `${SAISON.split('-')[0]}-09-01` && adhDb.date_fin === `${SAISON.split('-')[1]}-08-31` && Number(adhDb.montant) === 20 && adhDb.offre_id === offreAdh.id, JSON.stringify(adhDb ? { saison: adhDb.saison, du: adhDb.date_debut, au: adhDb.date_fin } : {}));
    const { data: paieDb } = await svc.from('paiements').select('*').eq('id', adhDb?.paiement_id || '00000000-0000-0000-0000-000000000000').maybeSingle();
    c('… avec son paiement RÉGLÉ (20 €, espèces, type adhesion, encaissé aujourd\'hui)', !!paieDb && paieDb.statut === 'paid' && paieDb.mode === 'especes' && paieDb.type === 'adhesion' && Number(paieDb.montant) === 20 && paieDb.date_encaissement === AUJ && paieDb.client_id === maya.id, JSON.stringify(paieDb ? { statut: paieDb.statut, mode: paieDb.mode, type: paieDb.type } : {}));
    const { count: nbAbos } = await svc.from('abonnements').select('id', { count: 'exact', head: true }).eq('profile_id', as.id);
    c('… et AUCUN abonnement (une adhésion n\'est jamais un carnet)', nbAbos === 0);
    await attendre(async () => (await pA.getAttribute('[data-testid="adhesion-fiche"]', 'data-etat')) === 'a_jour', 15000, 300);
    c('la fiche dit « À jour · saison » sans recharger', (await pA.getAttribute('[data-testid="adhesion-fiche"]', 'data-etat')) === 'a_jour' && !!(await pA.$('[data-testid="adhesion-recu"]')));
    const rejeu = await api(cookieAs, '/api/adhesions', { method: 'POST', body: JSON.stringify({ client_id: maya.id, offre_id: offreAdh.id, saison: SAISON, paye: false }) });
    c('une seconde adhésion pour la même saison → 409 DEJA_ADHERENTE, sans paiement fantôme', rejeu.status === 409 && rejeu.body?.code === 'DEJA_ADHERENTE' && (await svc.from('paiements').select('id', { count: 'exact', head: true }).eq('profile_id', as.id)).count === 1, `${rejeu.status} ${rejeu.body?.code}`);
    const recu1 = await api(cookieAs, `/api/adhesions/${adhDb.id}/recu`);
    c('le reçu de cotisation (sans SIRET : reçu simple) est un PDF', recu1.status === 200 && recu1.type.includes('pdf') && recu1.body?.pdf > 1500, `${recu1.status} ${recu1.type}`);
    await svc.from('profiles').update({ facturation_siret: '73282932000074', facturation_raison_sociale: as.nom, adresse: '1 rue de la Preuve', ville: 'Lyon' }).eq('id', as.id);
    const recu2 = await api(cookieAs, `/api/adhesions/${adhDb.id}/recu`);
    const { data: fact } = await svc.from('factures').select('numero_affiche, snapshot').eq('profile_id', as.id).maybeSingle();
    c('avec le SIRET, le reçu est la facture v84 (FAC-…-0001 EN BASE, snapshot figé), servie en PDF', recu2.status === 200 && recu2.type.includes('pdf') && /^FAC-\d{4}-0001$/.test(fact?.numero_affiche || '') && fact?.snapshot?.total === 20, fact?.numero_affiche);
    const nomFichier = recu2.headers.get('content-disposition') || '';
    c('… nommée « recu-cotisation-<saison>-maya.pdf »', nomFichier.includes(`recu-cotisation-${SAISON}-maya`), nomFichier);
    const etranger = await api(cookieSt, `/api/adhesions/${adhDb.id}/recu`);
    c('le studio (autre structure, sans vie_asso) ne lit pas ce reçu', etranger.status === 403 || etranger.status === 404, `${etranger.status}`);

    console.log('\n══════ B2. La liste des adhérentes, l\'espace élève ══════');
    const liste = await api(cookieAs, `/api/adhesions?date=${AUJ}`);
    c('GET /api/adhesions → 1 adhésion, Maya à jour', liste.status === 200 && liste.body?.adhesions?.length === 1 && liste.body?.a_jour?.includes(maya.id));
    await aller(pA, `${BASE}/clients?filtre=adherentes`);
    await pA.waitForSelector('.filter-btn', { timeout: 90000 });
    await attendre(async () => (await pA.$$eval('.filter-btn.active', els => els.map(e => e.textContent))).some(t => t.includes('Adhérentes')), 15000, 300);
    const tC = await texte(pA);
    c('/clients?filtre=adherentes : le filtre « Adhérentes à jour » est actif, Maya listée, pas Nora', tC.includes('Maya') && !tC.includes('Nora') && (await pA.$$eval('.filter-btn.active', els => els.map(e => e.textContent))).some(t => t.includes('Adhérentes')));
    await pA.click('.filter-btn:has-text("Sans adhésion")');
    await attendre(async () => (await texte(pA)).includes('Nora'), 10000, 300);
    const tC2 = await texte(pA);
    c('« Sans adhésion » liste Nora, pas Maya', tC2.includes('Nora') && !tC2.includes('Maya'));
    await aller(pS, `${BASE}/clients`);
    await pS.waitForSelector('.filter-btn', { timeout: 90000 });
    c('le studio n\'a pas ces deux filtres', !(await texte(pS)).includes('Adhérentes à jour'));

    const { ctx: ctxE, page: pE } = await contexte(browser, COMPTES.el.email, { width: 420, height: 900 });
    await aller(pE, `${BASE}/p/${as.slug}/espace`);
    await pE.waitForSelector('[data-testid="espace-adhesion"], .aide-eleve', { timeout: 90000 }).catch(() => {});
    const tE = await texte(pE);
    c('l\'espace de Maya montre « Mon adhésion · À jour »', !!(await pE.$('[data-testid="espace-adhesion"]')) && tE.includes('Mon adhésion') && tE.includes('À jour') && tE.includes(SAISON));
    c('… et la mini-aide répond « C\'est quoi, Mon adhésion ? »', tE.includes('Mon adhésion » ?') || tE.includes('C\'est quoi, « Mon adhésion'));
    await ctxE.close();

    console.log('\n══════ B3. La règle « adhésion requise pour réserver » ══════');
    const { data: cours } = await svc.from('cours').insert({ profile_id: as.id, nom: 'Hatha asso', date: j(3), heure: '18:00', duree_minutes: 60, visibilite: 'public', capacite_max: 8 }).select('id').single();
    await svc.from('profiles').update({ regles_metier: { sans_adhesion: { mode: 'auto', choix: 'bloquer' } } }).eq('id', as.id);
    const rNora = await reserver(as.slug, cours.id, 'Nora Sansadhesion', nora.email);
    c('règle « bloquer » : Nora (sans adhésion) est refusée 403 ADHESION_REQUISE, message qui nomme l\'association', rNora.status === 403 && rNora.body?.code === 'ADHESION_REQUISE' && (rNora.body?.error || '').includes(as.nom), `${rNora.status} ${rNora.body?.code}`);
    const rMaya = await reserver(as.slug, cours.id, 'Maya Adherente', maya.email);
    c('… Maya (à jour) réserve', rMaya.status === 200 || rMaya.status === 201, `${rMaya.status} ${rMaya.body?.code || rMaya.body?.error || ''}`);
    await svc.from('profiles').update({ regles_metier: { sans_adhesion: { mode: 'auto', choix: 'accepter' } } }).eq('id', as.id);
    const rNora2 = await reserver(as.slug, cours.id, 'Nora Sansadhesion', nora.email);
    c('règle « accepter » (défaut) : Nora réserve', rNora2.status === 200 || rNora2.status === 201, `${rNora2.status} ${rNora2.body?.code || ''}`);
    const { data: presences } = await svc.from('presences').select('client_id').eq('cours_id', cours.id);
    c('2 inscriptions EN BASE', (presences || []).length === 2);
    await aller(pA, `${BASE}/pointage/${cours.id}`);
    await pA.waitForSelector('.pres-name', { timeout: 90000 });
    const badges = await pA.$$eval('[data-testid="pointage-sans-adhesion"]', els => els.map(e => e.closest('.pres-name-row')?.textContent || ''));
    c('au pointage, UN repère « sans adhésion », sur la ligne de Nora seulement', badges.length === 1 && badges[0].includes('Nora'), JSON.stringify(badges));
    await aller(pS, `${BASE}/pointage/${cours.id}`);
    await dormir(1000);
    c('le studio ne voit pas ce cours (autre structure)', !(await pS.$('[data-testid="pointage-sans-adhesion"]')));

    console.log('\n══════ B4. Les documents ══════');
    const d1 = await api(cookieAs, '/api/association/documents', { method: 'POST', body: JSON.stringify({ type: 'statuts', titre: 'Statuts 2019', url: 'https://example.com/statuts-2019.pdf', date_document: '2019-03-01' }) });
    const d2 = await api(cookieAs, '/api/association/documents', { method: 'POST', body: JSON.stringify({ type: 'statuts', titre: 'Statuts 2026', url: 'https://example.com/statuts-2026.pdf', date_document: '2026-06-15' }) });
    const dKo = await api(cookieAs, '/api/association/documents', { method: 'POST', body: JSON.stringify({ type: 'statuts', titre: 'Sans fichier', url: 'http://pas-https' }) });
    c('deux versions des statuts enregistrées, une sans https refusée (400)', d1.status === 200 && d2.status === 200 && dKo.status === 400, `${d1.status} ${d2.status} ${dKo.status}`);
    const docs = await api(cookieAs, '/api/association/documents');
    c('GET : la version courante des statuts est la plus récente (2026), l\'autre dans l\'historique', docs.body?.courants?.statuts?.titre === 'Statuts 2026' && docs.body?.historique?.some(d => d.titre === 'Statuts 2019'));
    const dSt = await api(cookieSt, '/api/association/documents');
    c('le studio n\'a pas la capacité (403)', dSt.status === 403, `${dSt.status}`);
    await aller(pA, `${BASE}/association?onglet=documents`);
    await pA.waitForSelector('[data-testid="documents-ligne"]', { timeout: 90000 });
    const tD = await texte(pA);
    c('l\'onglet Documents affiche « Version courante » sur 2026 et 2019 dessous', (await pA.$$('[data-testid="documents-ligne"]')).length === 2 && tD.includes('Version courante') && tD.indexOf('Statuts 2026') < tD.indexOf('Statuts 2019'));

    console.log('\n══════ B5. L\'assemblée générale ══════');
    const agKo = await api(cookieAs, '/api/association/assemblees', { method: 'POST', body: JSON.stringify({ type: 'ordinaire' }) });
    c('une AG sans date est refusée (400)', agKo.status === 400);
    const agR = await api(cookieAs, '/api/association/assemblees', { method: 'POST', body: JSON.stringify({ type: 'ordinaire', date: j(20), heure: '19:00', lieu: 'Salle des fêtes', ordre_du_jour: '1. Rapport moral\n2. Rapport financier' }) });
    const ag = agR.body?.assemblee;
    c('AG créée (titre par défaut, statut a_venir)', agR.status === 200 && ag?.titre === 'Assemblée générale ordinaire' && ag?.statut === 'a_venir', `${agR.status}`);
    await aller(pA, `${BASE}/association?onglet=assemblees`);
    await pA.waitForSelector('[data-testid="ag-ligne"]', { timeout: 90000 });
    c('l\'onglet Assemblées dit « 1 adhérente à jour au jour de l\'AG » et « À convoquer »', (await texte(pA)).includes('1 adhérente(s) à jour') && (await texte(pA)).includes('À convoquer'));
    c('« Convoquer » en vrai navigateur', await clicJusquA(pA, '[data-testid="ag-convoquer"]', '[data-testid="ag-convoquee"]'));
    const agDb = await attendre(async () => { const { data } = await svc.from('assemblees').select('*').eq('id', ag.id).maybeSingle(); return data?.convocation_envoyee_at ? data : null; }, 30000, 500);
    c('la convocation est EN BASE : envoyée, 1 convoquée (Maya, pas Nora)', !!agDb && agDb.convoques === 1);
    // `messages` n'a pas de profile_id (v24) : on part des conversations de l'asso.
    const { data: convsAsso, error: eConvs } = await svc.from('conversations').select('id, client_id').eq('profile_id', as.id);
    const { data: msgs, error: eMsgs } = await svc.from('messages').select('content, conversation_id').in('conversation_id', (convsAsso || []).map(cv => cv.id)).ilike('content', '%Convocation%');
    const convDeMaya = (convsAsso || []).find(cv => cv.id === msgs?.[0]?.conversation_id);
    c('… un message de convocation dans la messagerie de Maya (date, lieu, ordre du jour, pouvoir), aucun pour Nora', !eConvs && !eMsgs && (msgs || []).length === 1 && convDeMaya?.client_id === maya.id && msgs[0].content.includes('Salle des fêtes') && msgs[0].content.includes('Rapport moral') && msgs[0].content.includes('pouvoir'), `${(msgs || []).length} message(s) ${eConvs?.message || eMsgs?.message || ''}`);
    const rejeuAg = await api(cookieAs, `/api/association/assemblees/${ag.id}`, { method: 'DELETE' });
    c('une AG convoquée ne se supprime pas (409)', rejeuAg.status === 409 && rejeuAg.body?.code === 'CONVOQUEE');
    await aller(pA, `${BASE}/association/ag/${ag.id}/emargement`);
    await pA.waitForSelector('[data-testid="emargement"]', { timeout: 90000 });
    const lignes = await pA.$$eval('[data-testid="emargement-ligne"]', els => els.map(e => e.textContent));
    c('la feuille d\'émargement liste 1 adhérente (ADHERENTE Maya), avec le bouton Imprimer', lignes.length === 1 && lignes[0].includes('ADHERENTE Maya') && !!(await pA.$('[data-testid="emargement-imprimer"]')) && (await texte(pA)).includes(as.nom), JSON.stringify(lignes));
    const emSt = await api(cookieSt, `/api/association/assemblees/${ag.id}/convoquer`, { method: 'POST' });
    c('le studio ne convoque pas l\'AG d\'une autre structure', emSt.status === 403 || emSt.status === 404, `${emSt.status}`);
    await aller(pA, `${BASE}/association?onglet=assemblees`);
    await pA.waitForSelector('[data-testid="ag-presentes"]', { timeout: 90000 });
    await pA.fill('[data-testid="ag-presentes"]', '1');
    await pA.fill('[data-testid="ag-pouvoirs"]', '0');
    c('« AG tenue » en vrai navigateur → quorum affiché', await clicJusquA(pA, '[data-testid="ag-tenir"]', '[data-testid="ag-quorum-pct"]'));
    // On attend l'écriture (le clic part, la route répond ensuite), jamais une lecture dans la foulée.
    const agT = await attendre(async () => { const { data } = await svc.from('assemblees').select('statut, presentes, pouvoirs').eq('id', ag.id).maybeSingle(); return data?.statut === 'tenue' ? data : null; }, 30000, 500);
    c('… EN BASE : tenue, 1 présente, 0 pouvoir ; quorum 100 %', agT?.statut === 'tenue' && agT?.presentes === 1 && agT?.pouvoirs === 0 && (await pA.textContent('[data-testid="ag-quorum-pct"]')).includes('100'));
    const pv = await api(cookieAs, '/api/association/documents', { method: 'POST', body: JSON.stringify({ type: 'pv_ag', titre: 'PV AG', url: 'https://example.com/pv.pdf', assemblee_id: ag.id }) });
    const { data: agPv } = await svc.from('assemblees').select('pv_document_id').eq('id', ag.id).maybeSingle();
    c('le PV déposé est rattaché à l\'AG', pv.status === 200 && agPv?.pv_document_id === pv.body?.document?.id);

    console.log('\n══════ B6. Le bureau et l\'équipe ══════');
    await aller(pA, `${BASE}/association?onglet=bureau`);
    await pA.waitForSelector('[data-testid="bureau-membre"]', { timeout: 90000 });
    c('l\'onglet Bureau affiche Théa « Trésorière »', (await pA.$$eval('[data-testid="bureau-fonction"]', els => els.map(e => e.textContent))).includes('Trésorière'));
    await aller(pA, `${BASE}/equipe`);
    await pA.waitForSelector('[data-testid="eq-badge-fonction"]', { timeout: 90000 }).catch(() => {});
    // Le formulaire d'invitation est replié : on l'ouvre comme la prof.
    const formOuvert = await clicJusquA(pA, '[data-testid="eq-inviter"]', '[data-testid="eq-fonction"]');
    c('/equipe : le sélecteur de fonction est proposé à l\'invitation, le badge sur la ligne', formOuvert && !!(await pA.$('[data-testid="eq-badge-fonction"]')), `formulaire ouvert : ${formOuvert}`);
    await aller(pS, `${BASE}/equipe`);
    await pS.waitForSelector('h1', { timeout: 90000 }).catch(() => {});
    await dormir(1000);
    c('… jamais au studio', !(await pS.$('[data-testid="eq-fonction"]')));
    const patchF = await api(cookieAs, `/api/equipe/${membreId}`, { method: 'PATCH', body: JSON.stringify({ fonction: 'secretaire' }) });
    const { data: mDb2 } = await svc.from('studio_membres').select('fonction, permissions').eq('id', membreId).maybeSingle();
    c('changer la fonction (secrétaire) ne touche PAS aux droits cochés (étiquette, jamais un troisième système)', patchF.status === 200 && mDb2?.fonction === 'secretaire' && mDb2?.permissions?.argent_gerer === true, JSON.stringify(mDb2?.permissions || {}));

    // L'annulation d'une adhésion.
    const annul = await api(cookieAs, `/api/adhesions/${adhDb.id}`, { method: 'DELETE' });
    const { data: paieApres } = await svc.from('paiements').select('id').eq('id', adhDb.paiement_id).maybeSingle();
    const adhRestantes = (await svc.from('adhesions').select('id').eq('id', adhDb.id)).data?.length;
    if (annul.status === 503 && annul.body?.code === 'MIGRATION_V116_REQUISE') {
      c('sans v116 (policy DELETE), annuler répond 503 honnête et l\'adhésion RESTE en place (rien ne ment)', adhRestantes === 1 && !!paieApres, `${annul.status} ${annul.body?.code}, ${adhRestantes} ligne(s)`);
    } else {
      c('annuler l\'adhésion retire la ligne, garde le paiement ENCAISSÉ (l\'argent reçu est reçu)', annul.status === 200 && !!paieApres && adhRestantes === 0, `${annul.status} ${annul.body?.code || ''}, ${adhRestantes} ligne(s) restante(s)`);
    }
  }

  // Centre d'aide, dans le même lot.
  console.log('\n══════ C. Le centre d\'aide ══════');
  await aller(pA, `${BASE}/aide`);
  await pA.waitForSelector('section#association', { timeout: 90000 }).catch(() => {});
  c('le tuto #association existe', !!(await pA.$('section#association')));
  await aller(pA, `${BASE}/support`);
  await pA.waitForSelector('h1', { timeout: 90000 }).catch(() => {});
  await attendre(async () => (await texte(pA)).includes('exiger l'), 30000, 500);
  const tF = await texte(pA);
  c('la FAQ répond sur les adhésions, l\'AG et les documents', tF.includes('exiger l') && tF.includes('feuille d') && tF.includes('statuts, le r'));

  await ctxA.close(); await ctxS.close();
} finally {
  await browser.close();
  await purger();
}

console.log(`\n${ok} OK · ${ko} KO${V113 ? '' : ' (phase dégradée : relancer après v113)'}`);
process.exit(ko ? 1 : 0);
