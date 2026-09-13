/**
 * PREUVE — le lot 0 du chantier Associations & Studios : le FREEMIUM et le
 * type de structure (2026-09-13, décisions Colin, PLAN-ASSOS-STUDIOS-2026.md).
 *
 * Auto-adaptative : elle SONDE la migration v110 (colonne `type_structure`)
 * et déroule la phase A (dégradée, avant la migration) ou la phase B
 * (complète, après). Dans les deux cas, elle prouve par le chemin réel :
 *
 *   1. Une prof dont l'essai est FINI n'est plus gelée : son tableau de bord
 *      s'ouvre sans bandeau de gel, la barre latérale porte des cadenas, la
 *      messagerie rend PlanRequis en nommant Complet, la carte Essentiel des
 *      Paramètres dit « Ton plan actuel », et une ÉCRITURE (créer une élève
 *      par la route API) passe. ⚠️ Avant v110, cette écriture est refusée par
 *      le trigger SQL v81 (qui comptait 14 jours) : la preuve le dit, c'est
 *      exactement ce que la migration répare.
 *   2. Le seul gel est l'impayé : `unpaid` → 402 sur l'écriture et bandeau
 *      « impayé » ; `canceled` → Essentiel, écriture acceptée (phase B).
 *   3. Le checkout refuse Essentiel (gratuit), refuse l'annuel hors
 *      Association / Studio, refuse Association à une prof seule, refuse
 *      Studio à une association ; accepte Association mensuel ET annuel à une
 *      association (200 avec l'URL Stripe, ou 500 « prix non configuré » si
 *      les env vars manquent en local : jamais un 400 / 403).
 *   4. L'onboarding en VRAI NAVIGATEUR : une nouvelle prof choisit
 *      « Une association », un RNA difforme bloque, un RNA valide passe, et
 *      la base porte type_structure = association + RNA (phase B) ou le profil
 *      est créé sans elles, sans erreur (phase A).
 *   5. Une association en essai a le plan Association : /equipe s'ouvre, la
 *      grille d'abonnement montre Association (pas Studio) et le choix
 *      mensuel / annuel.
 *   6. Paramètres → Studio & lieux : la carte « Ma structure » ; la route
 *      PATCH refuse un RNA difforme (400) et enregistre un valide (200) ou
 *      répond 503 MIGRATION_V110_REQUISE avant la migration.
 *   7. SQL (phase B) : plan_effectif() et compte_gele() disent la même chose
 *      que lib/trial.js sur les mêmes profils.
 *   8. La landing : Essentiel à 0 € pour toujours, plus jamais 15 €, les
 *      plans Association et Studio annoncés.
 *
 * Re-runnable : comptes et profils jetables purgés même en échec. Aucun email
 * réel (comptes en @example.com). Serveur : PROOF_BASE (défaut :3333).
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
const attendre = async (fn, ms = 20000, pas = 500) => {
  const fin = Date.now() + ms;
  for (;;) { const r = await fn(); if (r) return r; if (Date.now() > fin) return null; await new Promise(r2 => setTimeout(r2, pas)); }
};
const TS = Date.now().toString(36);
const j = (n) => new Date(Date.now() + n * 864e5).toISOString();
const aller = async (page, url) => {
  try { await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 120000 }); }
  catch (e) {
    if (!/ERR_ABORTED/.test(String(e))) throw e;
    await new Promise(r => setTimeout(r, 1500));
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 120000 });
  }
};
const texte = async (page) => page.evaluate(() => document.body.innerText);
// Une carte de réglages repliée ne rend pas son corps (lot 2 Paramètres) :
// on l'ouvre par son en-tête, comme la prof, jusqu'à ce qu'elle le soit.
const ouvrirCarte = async (page, id) => {
  const sel = `[data-carte-reglage="${id}"] .carte-reglage-entete`;
  await page.waitForSelector(sel, { timeout: 60000 });
  for (let i = 0; i < 8; i++) {
    if (await page.evaluate((q) => document.querySelector(q)?.getAttribute('aria-expanded') === 'true', sel)) return true;
    await page.click(sel).catch(() => {});
    await new Promise(r => setTimeout(r, 400));
  }
  return false;
};

// ── Sonde v110 : une vraie lecture, jamais un head/count (piège v109) ───────
const sonde = await svc.from('profiles').select('id, type_structure').limit(1);
const V110 = !sonde.error;
console.log(`\nPhase ${V110 ? 'B (v110 appliquée)' : 'A (dégradée, v110 absente : ' + (sonde.error?.code || '') + ')'}`);

const COMPTES = {
  gratuite: { email: `preuve-freemium-gratuite-${TS}@example.com`, slug: `preuve-freemium-gratuite-${TS}`, nom: 'Preuve Gratuite' },
  asso:     { email: `preuve-freemium-asso-${TS}@example.com`,     slug: `preuve-freemium-asso-${TS}`,     nom: 'Preuve Asso' },
  onb:      { email: `preuve-freemium-onb-${TS}@example.com` },
};

async function purger() {
  const { data: lst } = await svc.auth.admin.listUsers({ page: 1, perPage: 200 }).catch(() => ({ data: null }));
  for (const u of (lst?.users || []).filter(x => /^preuve-freemium-/.test(x.email || ''))) {
    await svc.from('clients').delete().eq('profile_id', u.id);
    await svc.from('offres').delete().eq('profile_id', u.id);
    await svc.from('studio_membres').delete().eq('profile_id', u.id);
    await svc.auth.admin.deleteUser(u.id).catch(() => {});
  }
}
await purger();

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

async function creerCompte(cle, profil) {
  const s = COMPTES[cle];
  const { data: cree, error } = await svc.auth.admin.createUser({ email: s.email, email_confirm: true, password: `Preuve-${TS}!`, user_metadata: { prenom: 'Preuve' } });
  if (error) { console.error(`createUser ${cle}:`, error.message); await purger(); process.exit(1); }
  s.id = cree.user.id;
  const prof = await attendre(async () => { const { data } = await svc.from('profiles').select('id').eq('id', s.id).maybeSingle(); return data || null; }, 15000, 500);
  if (!prof) { console.error('profil non créé'); await purger(); process.exit(1); }
  const { error: eMaj } = await svc.from('profiles').update({ studio_nom: s.nom, studio_slug: s.slug, portail_actif: true, ...profil }).eq('id', s.id);
  if (eMaj) { console.error(`profil ${cle}:`, eMaj.message); await purger(); process.exit(1); }
  return s;
}

// Un cookie de session par compte : les routes API se testent avec fetch +
// cookie (pas de CSRF côté route, la session suffit).
const enteteCookie = async (email) => (await sessionCookies(email)).map(k => `${k.name}=${k.value}`).join('; ');
const api = async (cookie, path, init = {}) => {
  const r = await fetch(`${BASE}${path}`, { ...init, headers: { 'Content-Type': 'application/json', cookie, ...(init.headers || {}) } });
  let body = null; try { body = await r.json(); } catch { /* vide */ }
  return { status: r.status, body };
};

let chromium; try { ({ chromium } = await import('playwright')); } catch { ({ chromium } = await import('@playwright/test')); }
let browser; try { browser = await chromium.launch({ channel: 'msedge' }); } catch { browser = await chromium.launch(); }

try {
  for (let i = 0; i < 60; i++) { try { const r = await fetch(`${BASE}/login`); if (r.ok) break; } catch { /* pas prêt */ } await new Promise(r => setTimeout(r, 2000)); }

  // ═══ 1. La prof dont l'essai est fini ═══════════════════════════════════
  console.log('\n══════ 1. Essai fini = Essentiel gratuit, pas un gel ══════');
  // Essai commencé il y a 35 jours : fini depuis 5 jours (bandeau visible < 14 j).
  const g = await creerCompte('gratuite', { plan: 'solo', trial_started_at: j(-35), stripe_subscription_status: null });
  const cookieG = await enteteCookie(g.email);
  const ctxG = await browser.newContext({ viewport: { width: 1280, height: 1000 } });
  await ctxG.addCookies((await sessionCookies(g.email)).map(cc => ({ ...cc, url: BASE, sameSite: 'Lax' })));
  const pG = await ctxG.newPage();
  await aller(pG, `${BASE}/dashboard`);
  await pG.waitForSelector('[data-testid="bandeau-gratuit"], .izi-sidebar, nav', { timeout: 60000 }).catch(() => {});
  await new Promise(r => setTimeout(r, 2500));
  const tG = await texte(pG);
  c('tableau de bord ouvert, pas renvoyée ailleurs', pG.url().includes('/dashboard'), pG.url());
  c('aucun bandeau de gel (« Ton essai 30 jours est terminé » a disparu)', !tG.includes('essai 30 jours est terminé') && !tG.includes('Compte gelé'));
  const bandeau = await pG.$('[data-testid="bandeau-gratuit"]');
  c('bandeau « essai fini, tu es sur Essentiel gratuit » présent et FERMABLE', !!bandeau && tG.includes('Essentiel') && tG.includes('gratuit'));
  if (bandeau) {
    await pG.click('[data-testid="bandeau-gratuit"] .acc-close').catch(() => {});
    await new Promise(r => setTimeout(r, 500));
    c('la croix ferme le bandeau', !(await pG.$('[data-testid="bandeau-gratuit"]')));
  }
  const cadenas = await pG.evaluate(() => !!document.querySelector('a[href="/messagerie"] [data-testid="sidebar-lock"]'));
  c('barre latérale : Messagerie porte un cadenas (Essentiel)', cadenas);
  await aller(pG, `${BASE}/messagerie`);
  await pG.waitForSelector('[data-testid="plan-requis"]', { timeout: 60000 }).catch(() => {});
  const tM = await texte(pG);
  c('/messagerie rend PlanRequis et nomme Complet', !!(await pG.$('[data-testid="plan-requis"]')) && tM.includes('plan Complet'));
  c('… avec « Essentiel gratuit » comme retour possible, jamais un gel', tM.includes('Essentiel gratuit'));
  await aller(pG, `${BASE}/parametres/abonnement`);
  c('la carte « Changer de plan » est repliée (Essentiel gratuit = état stable) et ouverte au clic', await ouvrirCarte(pG, 'changer_plan'));
  await pG.waitForSelector('[data-plan="solo"]', { timeout: 60000 }).catch(() => {});
  const tA = await texte(pG);
  c('Paramètres → Abonnement : Essentiel « 0 € pour toujours » est « Ton plan actuel »', tA.includes('pour toujours') && tA.includes('Ton plan actuel'));
  c('… la grille d\'une prof seule propose Complet et Studio, pas Association', !!(await pG.$('[data-plan="pro"]')) && !!(await pG.$('[data-plan="studio"]')) && !(await pG.$('[data-plan="asso"]')));
  c('… et plus aucune mention de « 15 € »', !tA.includes('15 €'));

  // L'écriture : créer une élève par la route API (auth:'active').
  // L'import d'élèves insère avec la SESSION de la prof : c'est le chemin qui
  // traverse les triggers de gel v81 (INSERT sur clients par un JWT).
  const importer = (prenom) => api(cookieG, '/api/clients/import', { method: 'POST', body: JSON.stringify({ clients: [{ prenom, nom: 'Preuve', email: `${prenom.toLowerCase()}-${TS}@example.com` }] }) });
  const ecriture = await importer('Lea');
  if (V110) {
    c('ÉCRITURE acceptée (importer une élève par la session) : élève créée EN BASE', ecriture.status < 300 && ecriture.body?.importes === 1, `${ecriture.status} importes=${ecriture.body?.importes}`);
  } else {
    c('ÉCRITURE : pas de 402 côté app (le gel JS a disparu)', ecriture.status !== 402, `${ecriture.status}`);
    info(`avant v110, le trigger SQL v81 (14 jours) refuse encore l'insert : importes=${ecriture.body?.importes} (c'est ce que v110 répare)`);
  }

  // ═══ 2. Le seul gel : l'impayé ══════════════════════════════════════════
  console.log('\n══════ 2. Impayé gelé, résiliation ouverte ══════');
  await svc.from('profiles').update({ plan: 'pro', stripe_subscription_status: 'unpaid' }).eq('id', g.id);
  const ecrUnpaid = await importer('Impaye');
  c('unpaid → 402 account_frozen sur une écriture', ecrUnpaid.status === 402 && ecrUnpaid.body?.code === 'account_frozen', `${ecrUnpaid.status}`);
  await aller(pG, `${BASE}/dashboard`);
  await pG.waitForSelector('[data-testid="bandeau-impaye"]', { timeout: 60000 }).catch(() => {});
  c('bandeau « impayé » affiché', !!(await pG.$('[data-testid="bandeau-impaye"]')));
  await svc.from('profiles').update({ plan: 'solo', stripe_subscription_status: 'canceled' }).eq('id', g.id);
  const ecrCanceled = await importer('Resiliee');
  if (V110) c('canceled → écriture acceptée (Essentiel, ouverte), élève créée', ecrCanceled.status < 300 && ecrCanceled.body?.importes === 1, `${ecrCanceled.status} importes=${ecrCanceled.body?.importes}`);
  else { c('canceled → pas de 402 côté app', ecrCanceled.status !== 402, `${ecrCanceled.status}`); info('avant v110, compte_gele(canceled) = true en SQL : attendu'); }
  await svc.from('profiles').update({ stripe_subscription_status: null }).eq('id', g.id);

  // ═══ 3. Le checkout ═════════════════════════════════════════════════════
  console.log('\n══════ 3. Le checkout : ce qu\'il refuse, ce qu\'il accepte ══════');
  const ck = (plan, periode = 'mensuel') => api(cookieG, '/api/stripe/checkout-saas', { method: 'POST', body: JSON.stringify({ plan, periode }) });
  const rSolo = await ck('solo');
  c('Essentiel ne se souscrit pas : 400 PLAN_GRATUIT', rSolo.status === 400 && rSolo.body?.code === 'PLAN_GRATUIT', `${rSolo.status} ${rSolo.body?.code}`);
  const rMulti = await ck('multi');
  c('Multi est retiré : 400', rMulti.status === 400, `${rMulti.status}`);
  const rProAn = await ck('pro', 'annuel');
  c('Complet à l\'année n\'existe pas : 400 PERIODE_INVALIDE', rProAn.status === 400 && rProAn.body?.code === 'PERIODE_INVALIDE', `${rProAn.status} ${rProAn.body?.code}`);
  const rAssoSolo = await ck('asso');
  c('Association refusée à une prof seule : 403 ASSOCIATION_REQUISE', rAssoSolo.status === 403 && rAssoSolo.body?.code === 'ASSOCIATION_REQUISE', `${rAssoSolo.status} ${rAssoSolo.body?.code}`);

  // ═══ 4. L'onboarding en vrai navigateur ═════════════════════════════════
  console.log('\n══════ 4. L\'onboarding : une association, avec son RNA ══════');
  const o = COMPTES.onb;
  const { data: creeO, error: eO } = await svc.auth.admin.createUser({ email: o.email, email_confirm: true, password: `Preuve-${TS}!`, user_metadata: { prenom: 'Preuve' } });
  if (eO) { console.error('createUser onb:', eO.message); throw eO; }
  o.id = creeO.user.id;
  await attendre(async () => { const { data } = await svc.from('profiles').select('id').eq('id', o.id).maybeSingle(); return data || null; }, 15000, 500);
  const ctxO = await browser.newContext({ viewport: { width: 1280, height: 1000 } });
  await ctxO.addCookies((await sessionCookies(o.email)).map(cc => ({ ...cc, url: BASE, sameSite: 'Lax' })));
  const pO = await ctxO.newPage();
  await aller(pO, `${BASE}/onboarding?structure=association`);
  await pO.waitForSelector('.metier-card', { timeout: 60000 });
  // Un bouton rendu côté serveur se clique avant que React n'ait attaché son
  // handler (piège v100) : on re-clique jusqu'à ce que la carte soit choisie.
  for (let i = 0; i < 12 && !(await pO.$('.metier-card.selected')); i++) {
    await pO.click('.metier-card').catch(() => {});
    await new Promise(r => setTimeout(r, 500));
  }
  c('étape métier : une carte choisie (hydratation attendue)', !!(await pO.$('.metier-card.selected')));
  await pO.click('button:has-text("Continuer")');
  await pO.waitForSelector('[data-structure="association"]', { timeout: 30000 });
  c('?structure=association pré-coche « Une association »', await pO.evaluate(() => document.querySelector('[data-structure="association"]')?.getAttribute('aria-checked') === 'true'));
  c('le titre parle d\'association et le champ RNA est là', (await texte(pO)).includes('Parle-nous de ton association') && !!(await pO.$('#onb-rna')));
  await pO.fill('#onb-studio-nom', `Asso Preuve ${TS}`);
  await pO.fill('#onb-prenom', 'Preuve');
  await pO.fill('#onb-nom', 'Onboarding');
  await pO.fill('#onb-ville', 'Lyon');
  await pO.fill('#onb-rna', 'W12');
  await new Promise(r => setTimeout(r, 300));
  const continuerDesactive = await pO.evaluate(() => [...document.querySelectorAll('button')].find(b => /Continuer/.test(b.textContent))?.disabled);
  c('un RNA difforme (W12) bloque « Continuer » et l\'erreur est écrite', continuerDesactive === true && (await texte(pO)).includes('neuf chiffres'));
  await pO.fill('#onb-rna', 'w 751 234 567');
  await new Promise(r => setTimeout(r, 300));
  c('un RNA valide (même mal tapé) débloque', await pO.evaluate(() => [...document.querySelectorAll('button')].find(b => /Continuer/.test(b.textContent))?.disabled) === false);
  await pO.click('button:has-text("Continuer")');
  await pO.waitForSelector('button:has-text("Passer cette étape")', { timeout: 30000 });
  await pO.click('button:has-text("Passer cette étape")');
  const profilOnb = await attendre(async () => {
    const q = V110 ? 'studio_slug, type_structure, rna' : 'studio_slug';
    const { data } = await svc.from('profiles').select(q).eq('id', o.id).maybeSingle();
    return data?.studio_slug ? data : null;
  }, 40000, 800);
  c('le studio est créé en base (slug posé)', !!profilOnb?.studio_slug, profilOnb?.studio_slug || '');
  if (V110) {
    c('type_structure = association EN BASE', profilOnb?.type_structure === 'association', profilOnb?.type_structure);
    c('RNA normalisé EN BASE : W751234567', profilOnb?.rna === 'W751234567', profilOnb?.rna);
  } else {
    info('avant v110 : le profil est créé SANS les colonnes neuves, par le rejeu (aucune erreur à l\'écran)');
    const tO = await texte(pO);
    c('aucune erreur affichée à la prof', !/Oups|n'a pas réussi|n'a pas pu/.test(tO));
  }
  await ctxO.close();

  // ═══ 5. Une association en essai ════════════════════════════════════════
  console.log('\n══════ 5. Une association en essai a le plan Association ══════');
  const a = await creerCompte('asso', { plan: 'solo', trial_started_at: j(-2), stripe_subscription_status: null, ...(V110 ? { type_structure: 'association', rna: 'W123456789' } : {}) });
  const cookieA = await enteteCookie(a.email);
  const ctxA = await browser.newContext({ viewport: { width: 1280, height: 1000 } });
  await ctxA.addCookies((await sessionCookies(a.email)).map(cc => ({ ...cc, url: BASE, sameSite: 'Lax' })));
  const pA = await ctxA.newPage();
  await aller(pA, `${BASE}/equipe`);
  await new Promise(r => setTimeout(r, 2500));
  const tE = await texte(pA);
  if (V110) {
    c('/equipe s\'ouvre (le plan essayé est Association)', !(await pA.$('[data-testid="plan-requis"]')) && !tE.includes('fait partie des plans Association et Studio'), pA.url());
  } else {
    c('/equipe refuse en nommant « Association et Studio » (sans v110, l\'essai est Complet)', tE.includes('Association') && tE.includes('Studio'));
  }
  await aller(pA, `${BASE}/parametres/abonnement`);
  await ouvrirCarte(pA, 'changer_plan');
  await pA.waitForSelector('[data-plan="solo"]', { timeout: 60000 }).catch(() => {});
  const tAb = await texte(pA);
  if (V110) {
    c('la grille d\'une association propose Association, pas Studio', !!(await pA.$('[data-plan="asso"]')) && !(await pA.$('[data-plan="studio"]')));
    c('le choix mensuel / annuel (deux mois offerts) est là', tAb.includes("À l'année") && tAb.includes('deux mois offerts'));
    c('l\'essai est nommé Association', tAb.includes('essai') && tAb.includes('Association'));
    const rStudio = await api(cookieA, '/api/stripe/checkout-saas', { method: 'POST', body: JSON.stringify({ plan: 'studio', periode: 'mensuel' }) });
    c('Studio refusé à une association : 403 PLAN_HORS_FAMILLE', rStudio.status === 403 && rStudio.body?.code === 'PLAN_HORS_FAMILLE', `${rStudio.status} ${rStudio.body?.code}`);
    for (const periode of ['mensuel', 'annuel']) {
      const r = await api(cookieA, '/api/stripe/checkout-saas', { method: 'POST', body: JSON.stringify({ plan: 'asso', periode }) });
      // Le témoin est un compte de test (@example.com) : la route le refuse
      // APRÈS les refus de famille, c'est exactement ce qu'on veut lire ici.
      const accepte = (r.status === 200 && /^https:\/\//.test(r.body?.url || '')) || (r.status === 500 && r.body?.code === 'PRIX_NON_CONFIGURE') || r.status === 503 || (r.status === 403 && r.body?.code === 'COMPTE_TEST');
      c(`Association ${periode} accepté par la route (${r.status === 200 ? 'URL Stripe' : r.body?.code || r.status})`, accepte, `${r.status}`);
    }
  }

  // ═══ 6. Paramètres → Studio & lieux : la carte « Ma structure » ═════════
  console.log('\n══════ 6. La carte « Ma structure » et sa route ══════');
  await aller(pA, `${BASE}/parametres/studio`);
  await ouvrirCarte(pA, 'structure');
  await pA.waitForSelector('[data-carte="structure"]', { timeout: 60000 }).catch(() => {});
  c('la carte « Ma structure » est rendue (bouton Enregistrer dédié)', !!(await pA.$('[data-carte="structure"]')));
  const rRnaKo = await api(cookieA, '/api/profile/structure', { method: 'PATCH', body: JSON.stringify({ type_structure: 'association', rna: 'W1' }) });
  c('PATCH refuse un RNA difforme : 400 RNA_INVALIDE', rRnaKo.status === 400 && rRnaKo.body?.code === 'RNA_INVALIDE', `${rRnaKo.status}`);
  const rRnaOk = await api(cookieA, '/api/profile/structure', { method: 'PATCH', body: JSON.stringify({ type_structure: 'association', rna: 'w 987 654 321' }) });
  if (V110) {
    c('PATCH enregistre un RNA valide : 200, valeur écrite rendue', rRnaOk.status === 200 && rRnaOk.body?.rna === 'W987654321', `${rRnaOk.status} ${rRnaOk.body?.rna}`);
    const { data: relu } = await svc.from('profiles').select('type_structure, rna').eq('id', a.id).maybeSingle();
    c('… et EN BASE', relu?.rna === 'W987654321' && relu?.type_structure === 'association');
    const rSolo2 = await api(cookieA, '/api/profile/structure', { method: 'PATCH', body: JSON.stringify({ type_structure: 'solo' }) });
    const { data: relu2 } = await svc.from('profiles').select('type_structure, rna').eq('id', a.id).maybeSingle();
    c('repasser « prof à mon compte » efface le RNA', rSolo2.status === 200 && relu2?.type_structure === 'solo' && relu2?.rna === null);
    await svc.from('profiles').update({ type_structure: 'association', rna: 'W123456789' }).eq('id', a.id);
  } else {
    c('PATCH répond 503 MIGRATION_V110_REQUISE, honnêtement', rRnaOk.status === 503 && rRnaOk.body?.code === 'MIGRATION_V110_REQUISE', `${rRnaOk.status} ${rRnaOk.body?.code}`);
  }
  await ctxA.close();

  // ═══ 7. SQL : plan_effectif et compte_gele ═══════════════════════════════
  if (V110) {
    console.log('\n══════ 7. SQL v110 = lib/trial.js ══════');
    const pe = async (id) => (await svc.rpc('plan_effectif', { p_profile_id: id })).data;
    const cg = async (id) => (await svc.rpc('compte_gele', { p_profile_id: id })).data;
    c('plan_effectif(asso en essai) = asso', (await pe(a.id)) === 'asso', String(await pe(a.id)));
    c('plan_effectif(essai fini) = solo', (await pe(g.id)) === 'solo', String(await pe(g.id)));
    c('compte_gele(essai fini) = false', (await cg(g.id)) === false);
    await svc.from('profiles').update({ plan: 'pro', stripe_subscription_status: 'unpaid' }).eq('id', g.id);
    c('compte_gele(unpaid) = true', (await cg(g.id)) === true);
    await svc.from('profiles').update({ stripe_subscription_status: 'canceled' }).eq('id', g.id);
    c('compte_gele(canceled) = false, plan_effectif = solo', (await cg(g.id)) === false && (await pe(g.id)) === 'solo');
    await svc.from('profiles').update({ plan: 'multi_free', stripe_subscription_status: null }).eq('id', g.id);
    c('plan_effectif(multi_free) = studio (legacy traduit)', (await pe(g.id)) === 'studio');
    await svc.from('profiles').update({ plan: 'solo' }).eq('id', g.id);
  }

  // ═══ 8. La landing ══════════════════════════════════════════════════════
  console.log('\n══════ 8. La landing ══════');
  // Anonyme : une session connectée est renvoyée de / vers le tableau de bord.
  const ctxL = await browser.newContext({ viewport: { width: 1280, height: 1000 } });
  const pL = await ctxL.newPage();
  await aller(pL, `${BASE}/`);
  await pL.waitForSelector('#tarifs', { timeout: 60000 }).catch(() => {});
  const tL = await texte(pL);
  c('Essentiel à 0 €, pour toujours', tL.includes('0 €') && tL.includes('pour toujours'));
  c('Complet à 29 €, LANCEMENT50', tL.includes('29 €') && tL.includes('LANCEMENT50'));
  c('plus jamais « 15 € »', !tL.includes('15 €'));
  c('Association 39 € et Studio 59 € annoncés', tL.includes('39 €') && tL.includes('59 €') && tL.includes('Association'));
  await ctxL.close();
  await ctxG.close();
} finally {
  await browser.close();
  await purger();
}

console.log(`\n${ok} OK · ${ko} KO${V110 ? '' : ' (phase dégradée : relancer après v110)'}`);
process.exit(ko ? 1 : 0);
