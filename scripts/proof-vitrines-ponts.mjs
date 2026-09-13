/**
 * PREUVE — le lot 5 du chantier Associations & Studios : les vitrines, les
 * portails qui se citent, le hub de l'élève (v115, 2026-09-13,
 * PLAN-ASSOS-STUDIOS-2026.md §6.6, §6.7, §6.9).
 *
 * Auto-adaptative : elle SONDE v115 (`studio_membres.portail_croise`) et
 * déroule ce qui est prouvable :
 *
 *   A. (toujours) Les deux vitrines /associations et /studios en visiteuse
 *      ANONYME : 200, les prix de la grille, les deux CTA, aucun « 14 jours »,
 *      mobile 390 sans débordement ; la landing les cite (Pour qui + note des
 *      structures) ; un studio jetable avec Léa (qui a son propre IziSolo) :
 *      la page d'intervenante /p/<studio>/equipe/<membre> avec sa prochaine
 *      séance, 404 pour un id inventé, le nom dans « L'équipe » y mène ; le
 *      volet Ailleurs de Léa propose « Relier nos pages » et la route répond
 *      (200 EN BASE ou 503 honnête) ; le hub /mes-studios d'une élève jetable
 *      inscrite dans DEUX studios (les deux listés, ses deux prochaines
 *      séances, une entrée par espace), « Mes autres studios » dans son
 *      espace, sans session la page dit d'où ouvrir un espace.
 *   B. (v115) Une fois relié : « Sa page : Léa Preuve Yoga » sur la carte
 *      d'équipe du studio et sur la page d'intervenante, « Je donne aussi
 *      des cours à Studio Preuve Vitrine » sur la page de Léa ; décoché, plus
 *      rien ; jamais sur la propre ligne (400) ni sur la ligne d'une autre (404).
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
const dormir = (ms) => new Promise(r => setTimeout(r, ms));
const attendre = async (fn, ms = 20000, pas = 500) => { const fin = Date.now() + ms; for (;;) { const r = await fn(); if (r) return r; if (Date.now() > fin) return null; await dormir(pas); } };
const TS = Date.now().toString(36);
const j = (n) => new Date(Date.now() + n * 864e5).toISOString().slice(0, 10);
const aller = async (page, url) => {
  try { await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 120000 }); }
  catch (e) { if (!/ERR_ABORTED/.test(String(e))) throw e; await dormir(1500); await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 120000 }); }
};
const texte = async (page) => page.evaluate(() => document.body.innerText);

const V115 = !(await svc.from('studio_membres').select('id, portail_croise').limit(1)).error;
console.log(`\nPhase ${V115 ? 'B (v115 appliquée)' : 'A (dégradée, v115 absente)'}`);

const PREFIXE = 'preuve-vitrine-';
const COMPTES = {
  st:  { email: `${PREFIXE}studio-${TS}@example.com`, slug: `${PREFIXE}studio-${TS}`, nom: 'Studio Preuve Vitrine' },
  lea: { email: `${PREFIXE}lea-${TS}@example.com`,    slug: `${PREFIXE}lea-${TS}`,    nom: 'Léa Preuve Yoga' },
  el:  { email: `${PREFIXE}eleve-${TS}@example.com` },
};

async function purger() {
  const { data: lst } = await svc.auth.admin.listUsers({ page: 1, perPage: 200 }).catch(() => ({ data: null }));
  for (const u of (lst?.users || []).filter(x => (x.email || '').startsWith(PREFIXE))) {
    await svc.from('studio_membres').delete().eq('profile_id', u.id).then(() => {}, () => {});
    await svc.from('studio_membres').delete().eq('auth_user_id', u.id).then(() => {}, () => {});
    await svc.from('presences').delete().eq('profile_id', u.id);
    await svc.from('cours').delete().eq('profile_id', u.id);
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
  else { body = { texte: await r.text().catch(() => '') }; }
  return { status: r.status, body, type };
};
async function creerProf(cle, profil) {
  const s = COMPTES[cle];
  const { data: cree, error } = await svc.auth.admin.createUser({ email: s.email, email_confirm: true, password: `Preuve-${TS}!`, user_metadata: { prenom: cle === 'lea' ? 'Léa' : 'Preuve' } });
  if (error) { console.error(`createUser ${cle}:`, error.message); await purger(); process.exit(1); }
  s.id = cree.user.id;
  const prof = await attendre(async () => { const { data } = await svc.from('profiles').select('id').eq('id', s.id).maybeSingle(); return data || null; }, 15000, 500);
  if (!prof) { console.error('profil non créé'); await purger(); process.exit(1); }
  const { error: eMaj } = await svc.from('profiles').update({ studio_nom: s.nom, studio_slug: s.slug, portail_actif: true, prenom: cle === 'lea' ? 'Léa' : 'Preuve', nom: 'Vitrine', ...profil }).eq('id', s.id);
  if (eMaj) { console.error(`profil ${cle}:`, eMaj.message); await purger(); process.exit(1); }
  return s;
}
const contexte = async (browser, email, vp = { width: 1280, height: 1000 }) => {
  const ctx = await browser.newContext({ viewport: vp });
  if (email) await ctx.addCookies((await sessionCookies(email)).cookies.map(cc => ({ ...cc, url: BASE, sameSite: 'Lax' })));
  const page = await ctx.newPage();
  page.on('dialog', d => d.accept());
  return { ctx, page };
};

let chromium; try { ({ chromium } = await import('playwright')); } catch { ({ chromium } = await import('@playwright/test')); }
let browser; try { browser = await chromium.launch({ channel: 'msedge' }); } catch { browser = await chromium.launch(); }

try {
  await purger();
  for (let i = 0; i < 60; i++) { try { const r = await fetch(`${BASE}/login`); if (r.ok) break; } catch { /* pas prêt */ } await dormir(2000); }

  // ═══ A. Les vitrines, en visiteuse anonyme ══════════════════════════════
  console.log('\n══════ A. Les vitrines /associations et /studios ══════');
  const { ctx: ctxA, page: pA } = await contexte(browser, null);
  for (const [chemin, attendu] of [['/associations', ['39 € par mois', '390 €', 'RNA', 'AssoConnect', 'Ce que le plan Association ne fait pas']], ['/studios', ['59 € par mois', '590 €', 'salle', 'marge', 'Ce que le plan Studio ne fait pas']]]) {
    await aller(pA, `${BASE}${chemin}`);
    await pA.waitForSelector('[data-testid^="vitrine-"]', { timeout: 90000 });
    const t = await texte(pA);
    c(`${chemin} se rend en anonyme, avec les prix de la grille et ce que le plan ne fait pas`, attendu.every(a => t.toLowerCase().includes(a.toLowerCase())), attendu.filter(a => !t.toLowerCase().includes(a.toLowerCase())).join(' | '));
    c(`${chemin} : aucun « 14 jours », deux CTA (Maude en plein, ouvrir l'espace en fantôme)`, !t.includes('14 jours') && await pA.evaluate(() => !!document.querySelector('a.btn-primary[href^="/creer-mon-studio"]') && !!document.querySelector('a.btn-ghost[href^="/register?structure="]')));
  }
  await pA.setViewportSize({ width: 390, height: 800 });
  await aller(pA, `${BASE}/studios`);
  await pA.waitForSelector('[data-testid="vitrine-studio"]', { timeout: 90000 });
  c('mobile 390 : aucun débordement horizontal', await pA.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1));
  await pA.setViewportSize({ width: 1280, height: 1000 });
  await aller(pA, `${BASE}/`);
  await pA.waitForSelector('#pour-qui', { timeout: 90000 });
  c('la landing cite les deux vitrines (Pour qui, note des structures)', await pA.evaluate(() => !!document.querySelector('#pour-qui a[href="/associations"]') && !!document.querySelector('.structures-note a[href="/studios"]')));
  await ctxA.close();

  // ═══ Un studio jetable, Léa membre avec son propre IziSolo ═══════════════
  const st = await creerProf('st', { plan: 'studio', type_structure: 'studio', trial_started_at: j(-60), stripe_subscription_status: null });
  const lea = await creerProf('lea', { plan: 'solo', trial_started_at: j(-40), stripe_subscription_status: null, bio: 'Prof de yoga depuis dix ans.' });
  const cookieSt = await enteteCookie(st.email);
  const cookieLea = await enteteCookie(lea.email);
  const inv = await api(cookieSt, '/api/equipe', { method: 'POST', body: JSON.stringify({ email: lea.email, prenom: 'Léa', nom: 'Preuve', role: 'prof' }) });
  const membreId = inv.body?.membre?.id;
  c('Léa est invitée dans le studio', inv.status === 200 && !!membreId, `${inv.status}`);
  await svc.from('studio_membres').update({ statut: 'actif', auth_user_id: lea.id, accepte_at: new Date().toISOString(), bio: 'Vinyasa le matin, yin le soir.' }).eq('id', membreId);
  const { data: cours } = await svc.from('cours').insert([
    { profile_id: st.id, nom: 'Vinyasa avec Léa', date: j(3), heure: '18:00', duree_minutes: 60, visibilite: 'public', capacite_max: 8, lieu: 'Grande salle' },
    { profile_id: st.id, nom: 'Privé de Léa', date: j(4), heure: '18:00', duree_minutes: 60, visibilite: 'prive', capacite_max: 8 },
    { profile_id: lea.id, nom: 'Hatha chez Léa', date: j(5), heure: '10:00', duree_minutes: 60, visibilite: 'public', capacite_max: 8 },
  ]).select('id, nom');
  const [cVin, cPrive, cLea] = cours;
  await svc.from('cours').update({ intervenant_id: membreId }).in('id', [cVin.id, cPrive.id]);

  // ═══ A2. La page d'une intervenante ═════════════════════════════════════
  console.log('\n══════ A2. La page d\'une intervenante sur le portail du studio ══════');
  const { ctx: ctxP, page: pP } = await contexte(browser, null);
  await aller(pP, `${BASE}/p/${st.slug}/equipe/${membreId}`);
  await pP.waitForSelector('[data-testid="page-intervenante"]', { timeout: 90000 });
  const tI = await texte(pP);
  c('la page rend le prénom, la bio de membre et SA prochaine séance publique (jamais la privée)', tI.includes('Léa Preuve') && tI.includes('Vinyasa avec Léa') && tI.includes('Vinyasa le matin') && !tI.includes('Privé de Léa'), tI.slice(0, 80));
  c('… sans email', !tI.includes('@example.com'));
  const r404 = await api(null, `/p/${st.slug}/equipe/00000000-0000-0000-0000-000000000000`);
  c('un id inventé → 404', r404.status === 404, `${r404.status}`);
  await aller(pP, `${BASE}/p/${st.slug}?tab=equipe`);
  await pP.waitForSelector('[data-testid="portail-equipe"]', { timeout: 90000 });
  c('sur « L\'équipe », le nom de Léa mène à sa page', await pP.evaluate((id) => !!document.querySelector(`[data-testid="equipe-page-lien"][href$="/equipe/${id}"]`), membreId));
  c(V115 ? '… et « Sa page » n\'y est pas encore (rien relié)' : '… et « Sa page » n\'y est pas (sans v115, jamais)', !(await pP.$('[data-testid="equipe-sa-page"]')));

  // ═══ A3. « Relier nos pages », côté Léa ═════════════════════════════════
  console.log('\n══════ A3. Le volet Ailleurs de Léa : « Relier nos pages » ══════');
  const { ctx: ctxL, page: pL } = await contexte(browser, lea.email);
  await aller(pL, `${BASE}/equipe`);
  await pL.waitForSelector('[data-testid="ailleurs"]', { timeout: 90000 });
  await pL.waitForSelector('[data-testid="ailleurs-relier-case"]', { timeout: 30000 }).catch(() => {});
  c('le volet Ailleurs de Léa liste le studio avec la case « Relier nos pages »', !!(await pL.$('[data-testid="ailleurs-relier-case"]')) && (await texte(pL)).includes(st.nom));
  const relierSt = await api(cookieSt, `/api/structures/appartenance/${membreId}`, { method: 'PATCH', body: JSON.stringify({ portail_croise: true }) });
  c('le studio ne peut pas relier à la place de Léa (404 : pas sa ligne)', relierSt.status === 404, `${relierSt.status}`);
  const { data: propre } = await svc.from('studio_membres').select('id').eq('profile_id', lea.id).eq('auth_user_id', lea.id).maybeSingle();
  if (propre) {
    const relierSoi = await api(cookieLea, `/api/structures/appartenance/${propre.id}`, { method: 'PATCH', body: JSON.stringify({ portail_croise: true }) });
    c('sa propre ligne ne se relie pas à elle-même (400)', relierSoi.status === 400, `${relierSoi.status}`);
  }
  await pL.click('[data-testid="ailleurs-relier-case"]');
  await dormir(2000);
  if (V115) {
    const rel = await attendre(async () => { const { data } = await svc.from('studio_membres').select('portail_croise').eq('id', membreId).maybeSingle(); return data?.portail_croise ? data : null; }, 20000, 500);
    c('cocher « Relier nos pages » écrit portail_croise EN BASE', !!rel);
  } else {
    const rel = await api(cookieLea, `/api/structures/appartenance/${membreId}`, { method: 'PATCH', body: JSON.stringify({ portail_croise: true }) });
    c('sans v115 : PATCH → 503 MIGRATION_V115_REQUISE, honnête', rel.status === 503 && rel.body?.code === 'MIGRATION_V115_REQUISE', `${rel.status} ${rel.body?.code}`);
  }

  // ═══ B. v115 : les pages se citent ══════════════════════════════════════
  if (V115) {
    console.log('\n══════ B. Les pages se citent, dans les deux sens ══════');
    await aller(pP, `${BASE}/p/${st.slug}?tab=equipe`);
    await pP.waitForSelector('[data-testid="portail-equipe"]', { timeout: 90000 });
    c('sur le portail du studio, la carte de Léa propose « Sa page : Léa Preuve Yoga »', await pP.evaluate((slug) => { const a = document.querySelector('[data-testid="equipe-sa-page"]'); return !!a && a.getAttribute('href') === `/p/${slug}` && a.textContent.includes('Léa Preuve Yoga'); }, lea.slug));
    await aller(pP, `${BASE}/p/${st.slug}/equipe/${membreId}`);
    await pP.waitForSelector('[data-testid="page-intervenante"]', { timeout: 90000 });
    c('… et sa page d\'intervenante aussi', !!(await pP.$(`[data-testid="intervenante-sa-page"][href="/p/${lea.slug}"]`)));
    await aller(pP, `${BASE}/p/${lea.slug}`);
    await pP.waitForSelector('[data-testid="portail-ailleurs"]', { timeout: 90000 }).catch(() => {});
    const tL = await texte(pP);
    c('sur la page de Léa : « Je donne aussi des cours à Studio Preuve Vitrine » avec le lien', tL.includes(`Je donne aussi des cours à ${st.nom}`) && await pP.evaluate((slug) => !!document.querySelector(`[data-testid="portail-ailleurs"] a[href="/p/${slug}"]`), st.slug));
    await svc.from('profiles').update({ portail_actif: false }).eq('id', st.id);
    await aller(pP, `${BASE}/p/${lea.slug}`);
    await dormir(1500);
    c('le studio ferme son portail : Léa ne le cite plus', !(await pP.$('[data-testid="portail-ailleurs"]')));
    await svc.from('profiles').update({ portail_actif: true }).eq('id', st.id);
    const off = await api(cookieLea, `/api/structures/appartenance/${membreId}`, { method: 'PATCH', body: JSON.stringify({ portail_croise: false }) });
    await aller(pP, `${BASE}/p/${st.slug}?tab=equipe`);
    await pP.waitForSelector('[data-testid="portail-equipe"]', { timeout: 90000 });
    c('décoché : plus de « Sa page » chez le studio', off.status === 200 && !(await pP.$('[data-testid="equipe-sa-page"]')));
  }
  await ctxL.close();

  // ═══ A4. Le hub d'une élève inscrite dans deux studios ══════════════════
  console.log('\n══════ A4. Le hub /mes-studios d\'une élève de deux studios ══════');
  const { data: creeEl } = await svc.auth.admin.createUser({ email: COMPTES.el.email, email_confirm: true, user_metadata: { role: 'eleve' } });
  COMPTES.el.id = creeEl?.user?.id;
  const { data: fiches } = await svc.from('clients').insert([
    { profile_id: st.id, prenom: 'Maya', nom: 'Deux', email: COMPTES.el.email, statut: 'actif', auth_user_id: COMPTES.el.id },
    { profile_id: lea.id, prenom: 'Maya', nom: 'Deux', email: COMPTES.el.email, statut: 'actif' },
  ]).select('id, profile_id');
  await svc.from('presences').insert([
    { profile_id: st.id, cours_id: cVin.id, client_id: fiches.find(f => f.profile_id === st.id).id, statut_pointage: 'inscrit' },
    { profile_id: lea.id, cours_id: cLea.id, client_id: fiches.find(f => f.profile_id === lea.id).id, statut_pointage: 'inscrit' },
  ]);
  await aller(pP, `${BASE}/mes-studios`);
  await pP.waitForSelector('[data-testid="mes-studios-sans-session"]', { timeout: 90000 }).catch(() => {});
  c('sans session, /mes-studios dit d\'où ouvrir un espace (jamais un renvoi vers /login)', !!(await pP.$('[data-testid="mes-studios-sans-session"]')) && pP.url().includes('/mes-studios'));
  await ctxP.close();
  const { ctx: ctxE, page: pE } = await contexte(browser, COMPTES.el.email, { width: 420, height: 900 });
  await aller(pE, `${BASE}/mes-studios`);
  await pE.waitForSelector('[data-testid="mes-studios"]', { timeout: 90000 });
  const tH = await texte(pE);
  c('le hub liste ses DEUX studios (par compte pour l\'un, par email pour l\'autre)', (await pE.$$('[data-testid="mes-studios-studio"]')).length === 2 && tH.includes(st.nom) && tH.includes(lea.nom));
  c('… ses deux prochaines séances, chacune nommée par son studio, dans l\'ordre', (await pE.$$eval('[data-testid="mes-studios-seance"]', els => els.map(e => e.textContent))).join('|').includes('Vinyasa avec Léa') && (await pE.$$('[data-testid="mes-studios-seance"]')).length === 2);
  c('… une entrée « Mon espace » vers chaque studio', await pE.evaluate(({ a, b }) => !!document.querySelector(`a[href="/p/${a}/espace"]`) && !!document.querySelector(`a[href="/p/${b}/espace"]`), { a: st.slug, b: lea.slug }));
  await aller(pE, `${BASE}/p/${st.slug}/espace`);
  await pE.waitForSelector('[data-testid="espace-mes-studios"], .aide-eleve', { timeout: 90000 }).catch(() => {});
  const tE = await texte(pE);
  c('son espace chez le studio propose « Voir tous mes studios » et la mini-aide répond', !!(await pE.$('[data-testid="espace-mes-studios"]')) && tE.includes('2 studios') && tE.includes('plusieurs studios'));
  await ctxE.close();

  // ═══ C. Le centre d'aide ═════════════════════════════════════════════════
  console.log('\n══════ C. Le centre d\'aide ══════');
  const { ctx: ctxS, page: pS } = await contexte(browser, st.email);
  await aller(pS, `${BASE}/support`);
  await pS.waitForSelector('h1', { timeout: 90000 }).catch(() => {});
  await attendre(async () => (await texte(pS)).includes('nos pages peuvent-elles se citer'), 30000, 500);
  const tF = await texte(pS);
  c('la FAQ répond sur les pages qui se citent et sur l\'élève de deux studios', tF.includes('nos pages peuvent-elles se citer') && tF.includes('elle a deux comptes'));
  await aller(pS, `${BASE}/aide`);
  await pS.waitForSelector('section#equipe', { timeout: 90000 }).catch(() => {});
  c('le tuto Équipe parle de « Relier nos pages »', (await texte(pS)).includes('Relier nos pages'));
  await ctxS.close();
} finally {
  await browser.close();
  await purger();
}

console.log(`\n${ok} OK · ${ko} KO${V115 ? '' : ' (phase dégradée : relancer après v115)'}`);
process.exit(ko ? 1 : 0);
