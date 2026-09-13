/**
 * PREUVE — le lot 1 du chantier Associations & Studios : les intervenantes et
 * les ponts de l'écosystème (2026-09-13, PLAN-ASSOS-STUDIOS-2026.md §4, §6).
 *
 * Auto-adaptative : elle SONDE v111 (`studio_membres.lien_hash`) et v103
 * (`cours.intervenant_id`) et déroule ce qui est prouvable :
 *
 *   A. Inviter une prof avec prénom et nom ; fabriquer son LIEN PERMANENT
 *      (v111 : 200 + URL rendue UNE fois, sha256 seul en base ; sinon 503
 *      honnête).
 *   B. Le lien, SANS SESSION : l'écran s'ouvre et la salue par son prénom ;
 *      ses séances (la sienne si v103, sinon toutes comme « sans
 *      intervenante ») ; elle POINTE une présence et la base change ; une
 *      présence d'un AUTRE studio est refusée ; le lien révoqué ferme écran et
 *      API.
 *   C. Pont 2 : la même prof, qui a SON IziSolo, voit la séance de la
 *      structure dans SON tableau de bord (v103), avec le nom de la
 *      structure ; le sélecteur de studio la connaît.
 *   D. Pont 1 : depuis SON IziSolo elle invite une association (v111) ; le
 *      lien /parrainage pose le cookie et renvoie vers /register ; la
 *      structure fait son onboarding EN VRAI NAVIGATEUR avec l'invitation
 *      affichée et le nom pré-rempli ; à la fin, la prof est MEMBRE de la
 *      nouvelle structure EN BASE, l'invitation est acceptée, la structure
 *      porte `parrainee_par`.
 *   E. Le portail de la structure nomme la prof sur la carte (« avec Léa »,
 *      v103) et propose l'onglet « L'équipe ».
 *   F. Downgrade : la structure repasse en Complet → la prof entre en LECTURE
 *      SEULE (bandeau), une écriture qu'elle avait le droit de faire répond
 *      403, et tout revient quand le plan revient.
 *
 * Re-runnable : comptes, profils, invitations purgés même en échec. Aucun
 * email réel (@example.com). Serveur : PROOF_BASE (défaut :3333).
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
const dormir = (ms) => new Promise(r => setTimeout(r, ms));
const TS = Date.now().toString(36);
const j = (n) => new Date(Date.now() + n * 864e5).toISOString().slice(0, 10);
const aller = async (page, url) => {
  try { await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 120000 }); }
  catch (e) {
    if (!/ERR_ABORTED/.test(String(e))) throw e;
    await dormir(1500);
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 120000 });
  }
};
const texte = async (page) => page.evaluate(() => document.body.innerText);

// ── Sondes : une vraie lecture, jamais un head/count (piège v109) ───────────
const V111 = !(await svc.from('studio_membres').select('id, lien_hash').limit(1)).error;
const V103 = !(await svc.from('cours').select('id, intervenant_id').limit(1)).error;
const V110 = !(await svc.from('profiles').select('id, type_structure').limit(1)).error;
console.log(`\nPhase ${V111 ? 'B (v111 appliquée)' : 'A (dégradée, v111 absente)'} · v103 ${V103 ? 'appliquée' : 'absente'} · v110 ${V110 ? 'appliquée' : 'absente'}`);

const PREFIXE = 'preuve-ponts-';
const COMPTES = {
  structure: { email: `${PREFIXE}structure-${TS}@example.com`, slug: `${PREFIXE}structure-${TS}`, nom: 'Asso Preuve Ponts' },
  lea:       { email: `${PREFIXE}lea-${TS}@example.com`,       slug: `${PREFIXE}lea-${TS}`,       nom: 'Léa Preuve Yoga' },
  nouvelle:  { email: `${PREFIXE}nouvelle-${TS}@example.com` },
  eleve:     { email: `${PREFIXE}eleve-${TS}@example.com` },
};

async function purger() {
  const { data: lst } = await svc.auth.admin.listUsers({ page: 1, perPage: 200 }).catch(() => ({ data: null }));
  for (const u of (lst?.users || []).filter(x => (x.email || '').startsWith(PREFIXE))) {
    await svc.from('studio_membres').delete().eq('profile_id', u.id);
    await svc.from('studio_membres').delete().eq('auth_user_id', u.id);
    await svc.from('invitations_structure').delete().eq('parrain_profile_id', u.id).then(() => {}, () => {});
    await svc.from('presences').delete().eq('profile_id', u.id);
    await svc.from('cours').delete().eq('profile_id', u.id);
    await svc.from('clients').delete().eq('profile_id', u.id);
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
const enteteCookie = async (email) => (await sessionCookies(email)).map(k => `${k.name}=${k.value}`).join('; ');
const api = async (cookie, path, init = {}) => {
  const r = await fetch(`${BASE}${path}`, { ...init, redirect: 'manual', headers: { 'Content-Type': 'application/json', ...(cookie ? { cookie } : {}), ...(init.headers || {}) } });
  let body = null; try { body = await r.json(); } catch { /* vide */ }
  return { status: r.status, body, headers: r.headers };
};

async function creerProf(cle, profil) {
  const s = COMPTES[cle];
  const { data: cree, error } = await svc.auth.admin.createUser({ email: s.email, email_confirm: true, password: `Preuve-${TS}!`, user_metadata: { prenom: cle === 'lea' ? 'Léa' : 'Preuve' } });
  if (error) { console.error(`createUser ${cle}:`, error.message); await purger(); process.exit(1); }
  s.id = cree.user.id;
  const prof = await attendre(async () => { const { data } = await svc.from('profiles').select('id').eq('id', s.id).maybeSingle(); return data || null; }, 15000, 500);
  if (!prof) { console.error('profil non créé'); await purger(); process.exit(1); }
  const { error: eMaj } = await svc.from('profiles').update({ studio_nom: s.nom, studio_slug: s.slug, portail_actif: true, prenom: cle === 'lea' ? 'Léa' : 'Preuve', nom: 'Ponts', ...profil }).eq('id', s.id);
  if (eMaj) { console.error(`profil ${cle}:`, eMaj.message); await purger(); process.exit(1); }
  return s;
}

let chromium; try { ({ chromium } = await import('playwright')); } catch { ({ chromium } = await import('@playwright/test')); }
let browser; try { browser = await chromium.launch({ channel: 'msedge' }); } catch { browser = await chromium.launch(); }

try {
  for (let i = 0; i < 60; i++) { try { const r = await fetch(`${BASE}/login`); if (r.ok) break; } catch { /* pas prêt */ } await dormir(2000); }

  // La structure : plan d'équipe posé à la main (multi_free = Studio offert,
  // le seul plan d'équipe que le CHECK accepte avant v110).
  const st = await creerProf('structure', { plan: V110 ? 'studio' : 'multi_free', trial_started_at: j(-60), stripe_subscription_status: null });
  // Léa : une prof seule, gratuite, avec SON IziSolo.
  const lea = await creerProf('lea', { plan: 'solo', trial_started_at: j(-40), stripe_subscription_status: null });
  const cookieSt = await enteteCookie(st.email);

  // ═══ A. Inviter Léa, fabriquer son lien ═════════════════════════════════
  console.log('\n══════ A. Inviter avec prénom et nom, fabriquer le lien permanent ══════');
  const inv = await api(cookieSt, '/api/equipe', { method: 'POST', body: JSON.stringify({ email: lea.email, prenom: 'Léa', nom: 'Preuve', role: 'prof' }) });
  c('invitation acceptée par la route (200)', inv.status === 200 && inv.body?.membre?.id, `${inv.status} ${inv.body?.code || ''}`);
  const membreId = inv.body?.membre?.id;
  const { data: mDb } = await svc.from('studio_membres').select('*').eq('id', membreId).maybeSingle();
  c('ligne membre EN BASE, statut invite, compte existant reconnu', !!mDb && mDb.statut === 'invite' && inv.body?.compteExistant === true);
  if (V111) c('prénom et nom EN BASE (v111)', mDb?.prenom === 'Léa' && mDb?.nom === 'Preuve', `${mDb?.prenom} ${mDb?.nom}`);
  else info('avant v111 : prénom et nom non enregistrés, le membre s\'affiche par son email');

  const lien = await api(cookieSt, `/api/equipe/${membreId}/lien`, { method: 'POST' });
  let token = null;
  if (V111) {
    c('POST /lien → 200 avec l\'URL', lien.status === 200 && /\/intervenante\/[A-Za-z0-9_-]{20,}$/.test(lien.body?.url || ''), `${lien.status}`);
    token = (lien.body?.url || '').split('/intervenante/')[1] || null;
    const { data: mLien } = await svc.from('studio_membres').select('lien_hash, lien_expire_at').eq('id', membreId).maybeSingle();
    c('le HASH seul est en base, jamais le jeton ; expiration = fin de saison', !!mLien?.lien_hash && mLien.lien_hash !== token && /-08-31/.test(mLien.lien_expire_at || ''), `${(mLien?.lien_expire_at || '').slice(0, 10)}`);
    c('l\'état du membre dit « actif »', lien.body?.membre?.lien === 'actif');
  } else {
    c('POST /lien → 503 MIGRATION_V111_REQUISE, honnêtement', lien.status === 503 && lien.body?.code === 'MIGRATION_V111_REQUISE', `${lien.status} ${lien.body?.code}`);
  }

  // Une séance de la structure, une élève inscrite, et (v103) Léa désignée.
  const { data: fiche } = await svc.from('clients').insert({ profile_id: st.id, prenom: 'Élève', nom: 'Ponts', email: COMPTES.eleve.email, statut: 'actif' }).select('id').single();
  const { data: cours } = await svc.from('cours').insert({ profile_id: st.id, nom: 'Yin preuve', date: j(2), heure: '18:00', duree_minutes: 60, visibilite: 'public', capacite_max: 8 }).select('id').single();
  const { data: presence } = await svc.from('presences').insert({ profile_id: st.id, cours_id: cours.id, client_id: fiche.id }).select('id').single();
  if (V103) {
    const { error: eInt } = await svc.from('cours').update({ intervenant_id: membreId }).eq('id', cours.id);
    c('la séance porte Léa comme intervenante (v103)', !eInt, eInt?.message || '');
  }
  // Une séance d'un AUTRE studio (celui de Léa), pour le cloisonnement.
  const { data: coursLea } = await svc.from('cours').insert({ profile_id: lea.id, nom: 'Cours de Léa', date: j(2), heure: '10:00', duree_minutes: 60, visibilite: 'public' }).select('id').single();
  const { data: ficheLea } = await svc.from('clients').insert({ profile_id: lea.id, prenom: 'Autre', nom: 'Studio', statut: 'actif' }).select('id').single();
  const { data: presenceLea } = await svc.from('presences').insert({ profile_id: lea.id, cours_id: coursLea.id, client_id: ficheLea.id }).select('id').single();

  // ═══ B. Le lien, sans session ═══════════════════════════════════════════
  if (V111 && token) {
    console.log('\n══════ B. Le lien permanent, sans session ══════');
    const ctxAnon = await browser.newContext({ viewport: { width: 420, height: 900 } });
    const pA = await ctxAnon.newPage();
    await aller(pA, `${BASE}/intervenante/${token}`);
    await pA.waitForSelector('[data-testid="intervenante-liste"], .itv-refus-titre', { timeout: 60000 }).catch(() => {});
    const tA = await texte(pA);
    c('écran servi sans passer par /login, salue Léa', pA.url().includes('/intervenante/') && tA.includes('Bonjour Léa'), pA.url());
    c('aucune fuite : ni l\'email de l\'élève, ni un carnet, ni un identifiant auth dans la page', !tA.includes(COMPTES.eleve.email) && !tA.toLowerCase().includes('carnet') && !tA.includes(lea.id));
    const listeApi = await api(null, `/api/intervenante/${token}`);
    const dansMiennes = (listeApi.body?.miennes || []).some(s => s.id === cours.id);
    const dansOrphelines = (listeApi.body?.orphelines || []).some(s => s.id === cours.id);
    c(V103 ? 'la séance est dans « mes séances » (intervenante désignée)' : 'sans v103, la séance est servie comme « sans intervenante »', V103 ? dansMiennes : dansOrphelines);
    c('la séance de l\'AUTRE studio n\'y est pas', ![...(listeApi.body?.miennes || []), ...(listeApi.body?.orphelines || [])].some(s => s.id === coursLea.id));
    // Ouvrir la séance dans l'écran et pointer.
    await pA.click('[data-testid="intervenante-ouvrir"]');
    await pA.waitForSelector('[data-testid="intervenante-seance"]', { timeout: 30000 });
    const tS = await texte(pA);
    c('la séance ouvre sa liste d\'appel avec prénom et nom', tS.includes('Élève Ponts'));
    await pA.click(`button[aria-label="Présent·e : Élève Ponts"]`);
    const presDb = await attendre(async () => { const { data } = await svc.from('presences').select('statut_pointage, pointee').eq('id', presence.id).maybeSingle(); return data?.statut_pointage === 'present' ? data : null; }, 15000, 500);
    c('le tap « Présent » écrit EN BASE (statut present, pointee)', !!presDb && presDb.pointee === true);
    // Cloisonnement : une présence d'un autre studio, via l'API.
    const horsStudio = await api(null, `/api/intervenante/${token}/seances/${coursLea.id}`, { method: 'POST', body: JSON.stringify({ action: 'pointer', presenceId: presenceLea.id, statut: 'present' }) });
    c('pointer une séance d\'un AUTRE studio → 404', horsStudio.status === 404, `${horsStudio.status} ${horsStudio.body?.code}`);
    const horsSeance = await api(null, `/api/intervenante/${token}/seances/${cours.id}`, { method: 'POST', body: JSON.stringify({ action: 'pointer', presenceId: presenceLea.id, statut: 'present' }) });
    c('pointer une présence d\'un autre studio sur MA séance → 404 HORS_SEANCE', horsSeance.status === 404 && horsSeance.body?.code === 'HORS_SEANCE', `${horsSeance.status} ${horsSeance.body?.code}`);
    const { data: mUsage } = await svc.from('studio_membres').select('lien_usages, lien_derniere_utilisation_at').eq('id', membreId).maybeSingle();
    c('usage tracé (ouvert au moins 2 fois, dernière utilisation posée)', (mUsage?.lien_usages || 0) >= 2 && !!mUsage?.lien_derniere_utilisation_at);
    // Jeton inventé : rien.
    const faux = await api(null, `/api/intervenante/${'x'.repeat(43)}`);
    c('un jeton inventé → 404 sans rien dire du studio', faux.status === 404 && !JSON.stringify(faux.body || {}).includes(st.nom));
    // Révocation.
    const rev = await api(cookieSt, `/api/equipe/${membreId}/lien`, { method: 'DELETE' });
    c('DELETE /lien → révoqué', rev.status === 200 && rev.body?.membre?.lien === 'revoque');
    const apres = await api(null, `/api/intervenante/${token}`);
    c('… l\'API ferme (404) pendant que le pointage déjà fait reste', apres.status === 404 && (await svc.from('presences').select('statut_pointage').eq('id', presence.id).maybeSingle()).data?.statut_pointage === 'present');
    await aller(pA, `${BASE}/intervenante/${token}`);
    await pA.waitForSelector('.itv-refus-titre', { timeout: 30000 }).catch(() => {});
    c('… et l\'écran dit « désactivé »', (await texte(pA)).includes('désactivé'));
    await ctxAnon.close();
  } else {
    console.log('\n══════ B. (phase dégradée : pas de lien à ouvrir) ══════');
    const faux = await api(null, `/api/intervenante/${'x'.repeat(43)}`);
    c('l\'API publique répond 503 MIGRATION_V111_REQUISE avant la migration', faux.status === 503 && faux.body?.code === 'MIGRATION_V111_REQUISE', `${faux.status} ${faux.body?.code}`);
  }

  // ═══ C. Pont 2 : Léa voit la séance de la structure chez ELLE ═══════════
  console.log('\n══════ C. L\'agenda de la personne (pont 2) ══════');
  const cookieLea = await enteteCookie(lea.email);
  const ctxL = await browser.newContext({ viewport: { width: 1280, height: 1000 } });
  await ctxL.addCookies((await sessionCookies(lea.email)).map(cc => ({ ...cc, url: BASE, sameSite: 'Lax' })));
  const pL = await ctxL.newPage();
  await aller(pL, `${BASE}/dashboard`);
  await dormir(3000);
  const { data: mActif } = await svc.from('studio_membres').select('statut, auth_user_id').eq('id', membreId).maybeSingle();
  c('son invitation est devenue une appartenance au premier accès (statut actif, compte lié)', mActif?.statut === 'actif' && mActif?.auth_user_id === lea.id);
  await aller(pL, `${BASE}/dashboard`);
  await dormir(2500);
  const tL = await texte(pL);
  c('elle est chez ELLE (son studio), pas chez la structure', tL.includes('Léa') && pL.url().includes('/dashboard'));
  if (V103) {
    // innerText applique le CSS (text-transform: uppercase sur le nom du studio) : comparaison insensible à la casse.
    c('« Tes séances ailleurs » liste la séance de la structure, taguée de son nom', !!(await pL.$('[data-testid="seances-ailleurs"]')) && tL.toLowerCase().includes(st.nom.toLowerCase()) && tL.includes('Yin preuve'));
  } else {
    c('sans v103, aucun bloc « ailleurs » (rien à montrer, rien ne casse)', !(await pL.$('[data-testid="seances-ailleurs"]')));
  }
  const bascule = await api(cookieLea, '/api/studio-actif', { method: 'POST', body: JSON.stringify({ studioId: st.id }) });
  c('le sélecteur de studio la laisse basculer sur la structure', bascule.status === 200);

  // ═══ D. Pont 1 : Léa fait entrer une NOUVELLE association ═════════════════
  console.log('\n══════ D. Faire entrer sa structure (pont 1) ══════');
  const inviter = await api(cookieLea, '/api/structures/inviter', { method: 'POST', body: JSON.stringify({ nom: 'Yoga pour tous Preuve', email: COMPTES.nouvelle.email, type: 'association', message: 'Viens !' }) });
  if (!V111) {
    c('POST /api/structures/inviter → 503 MIGRATION_V111_REQUISE, honnêtement', inviter.status === 503 && inviter.body?.code === 'MIGRATION_V111_REQUISE', `${inviter.status} ${inviter.body?.code}`);
  } else {
    c('invitation enregistrée, lien rendu', inviter.status === 200 && /\/parrainage\/[A-Za-z0-9_-]{20,}$/.test(inviter.body?.lien || ''), `${inviter.status} ${inviter.body?.code || ''}`);
    const refusMoi = await api(cookieLea, '/api/structures/inviter', { method: 'POST', body: JSON.stringify({ nom: 'X', email: lea.email, type: 'association' }) });
    c('inviter SA PROPRE adresse est refusé (une structure a son propre compte)', refusMoi.status === 400);
    const tokenP = (inviter.body?.lien || '').split('/parrainage/')[1];
    const redir = await api(null, `/parrainage/${tokenP}`);
    const setCookie = redir.headers.get('set-cookie') || '';
    c('le lien /parrainage renvoie vers /register?structure=association et pose le cookie', redir.status === 303 && (redir.headers.get('location') || '').includes('structure=association') && setCookie.includes('izi_parrainage='), `${redir.status}`);
    const faussePage = await api(null, `/parrainage/${'y'.repeat(43)}`);
    c('un lien inventé renvoie vers /register avec une raison, sans cookie', faussePage.status === 303 && (faussePage.headers.get('location') || '').includes('invitation=') && !(faussePage.headers.get('set-cookie') || '').includes('izi_parrainage='));

    // La structure s'inscrit (compte prof, metadata structure) et fait son onboarding.
    const { data: creeN, error: eN } = await svc.auth.admin.createUser({ email: COMPTES.nouvelle.email, email_confirm: true, password: `Preuve-${TS}!`, user_metadata: { prenom: 'Asso', structure: 'association' } });
    if (eN) throw eN;
    COMPTES.nouvelle.id = creeN.user.id;
    await attendre(async () => { const { data } = await svc.from('profiles').select('id').eq('id', creeN.user.id).maybeSingle(); return data || null; }, 15000, 500);
    const ctxN = await browser.newContext({ viewport: { width: 1280, height: 1000 } });
    await ctxN.addCookies([
      ...(await sessionCookies(COMPTES.nouvelle.email)).map(cc => ({ ...cc, url: BASE, sameSite: 'Lax' })),
      { name: 'izi_parrainage', value: tokenP, url: BASE, sameSite: 'Lax', httpOnly: true },
    ]);
    const pN = await ctxN.newPage();
    await aller(pN, `${BASE}/onboarding`);
    await pN.waitForSelector('.metier-card', { timeout: 60000 });
    for (let i = 0; i < 12 && !(await pN.$('.metier-card.selected')); i++) { await pN.click('.metier-card').catch(() => {}); await dormir(500); }
    await pN.click('button:has-text("Continuer")');
    await pN.waitForSelector('[data-structure="association"]', { timeout: 30000 });
    await dormir(1500);
    const tN = await texte(pN);
    c('l\'onboarding dit qui invite (« Léa … t\'a invitée à ouvrir l\'espace de Yoga pour tous Preuve »)', !!(await pN.$('[data-testid="onb-parrainage"]')) && tN.includes('Léa') && tN.includes('Yoga pour tous Preuve'));
    c('« Une association » est pré-cochée et le nom pré-rempli', await pN.evaluate(() => document.querySelector('[data-structure="association"]')?.getAttribute('aria-checked') === 'true' && document.querySelector('#onb-studio-nom')?.value.includes('Yoga pour tous')));
    await pN.fill('#onb-prenom', 'Asso');
    await pN.fill('#onb-nom', 'Preuve');
    await pN.fill('#onb-ville', 'Lyon');
    await pN.fill('#onb-rna', 'W123456789');
    await dormir(300);
    await pN.click('button:has-text("Continuer")');
    await pN.waitForSelector('button:has-text("Passer cette étape")', { timeout: 30000 });
    await pN.click('button:has-text("Passer cette étape")');
    const membreLea = await attendre(async () => {
      const { data } = await svc.from('studio_membres').select('id, statut, role, prenom, auth_user_id').eq('profile_id', creeN.user.id).eq('auth_user_id', lea.id).maybeSingle();
      return data || null;
    }, 40000, 800);
    c('à la création de l\'espace, Léa est MEMBRE de la nouvelle structure EN BASE (actif, prof)', !!membreLea && membreLea.statut === 'actif' && membreLea.role === 'prof', JSON.stringify(membreLea || {}));
    c('… avec son prénom (v111)', membreLea?.prenom === 'Léa');
    const { data: invDb } = await svc.from('invitations_structure').select('statut, structure_profile_id').eq('parrain_profile_id', lea.id).maybeSingle();
    c('l\'invitation est acceptée et rattachée à la structure', invDb?.statut === 'acceptee' && invDb?.structure_profile_id === creeN.user.id);
    const { data: profN } = await svc.from('profiles').select('parrainee_par, studio_slug').eq('id', creeN.user.id).maybeSingle();
    c('la structure porte parrainee_par = le studio de Léa', profN?.parrainee_par === lea.id && !!profN?.studio_slug);
    const rejeu = await api(null, `/parrainage/${tokenP}`);
    c('le lien ne sert qu\'une fois (rejeu → « déjà acceptée »)', rejeu.status === 303 && (rejeu.headers.get('location') || '').includes('deja_acceptee'));
    await ctxN.close();
  }

  // ═══ E. Le portail de la structure nomme Léa ════════════════════════════
  console.log('\n══════ E. Le portail nomme la prof ══════');
  const ctxP = await browser.newContext({ viewport: { width: 1280, height: 1000 } });
  const pP = await ctxP.newPage();
  await aller(pP, `${BASE}/p/${st.slug}`);
  await pP.waitForSelector('.portail-tab', { timeout: 60000 }).catch(() => {});
  const tP = await texte(pP);
  if (V103 && V111) {
    c('la carte de la séance dit « avec Léa »', tP.includes('avec Léa'));
    c('l\'onglet « L\'équipe » est proposé (propriétaire + Léa)', !!(await pP.$('[data-testid="portail-tab-equipe"]')));
    await pP.click('[data-testid="portail-tab-equipe"]');
    await dormir(800);
    const tE = await texte(pP);
    c('… et présente Léa, sans son email', tE.includes('Léa') && !tE.includes(lea.email));
  } else {
    info(`portail : « avec Léa » et l'onglet Équipe demandent v103 + v111 (v103 ${V103 ? 'ok' : 'absente'}, v111 ${V111 ? 'ok' : 'absente'})`);
    c('le portail se rend sans erreur', tP.includes('Yin preuve') || tP.length > 200);
  }
  await ctxP.close();

  // ═══ F. Downgrade : lecture seule ═══════════════════════════════════════
  console.log('\n══════ F. Downgrade : lecture seule, jamais une révocation ══════');
  await svc.from('profiles').update({ plan: 'pro', stripe_subscription_status: 'active' }).eq('id', st.id);
  // Léa regarde la structure : le cookie de studio actif, posé dans le
  // NAVIGATEUR (la bascule de C était un appel API hors contexte).
  await ctxL.addCookies([{ name: 'izi_studio', value: st.id, url: BASE, sameSite: 'Lax' }]);
  await aller(pL, `${BASE}/dashboard`);
  await pL.waitForSelector('[data-testid="bandeau-lecture-seule"]', { timeout: 60000 }).catch(() => {});
  c('elle entre (pas de /acces-suspendu) et voit le bandeau « Lecture seule »', pL.url().includes('/dashboard') && !!(await pL.$('[data-testid="bandeau-lecture-seule"]')));
  const cookieLea2 = await enteteCookie(lea.email);
  const ecrit = await api(`${cookieLea2}; izi_studio=${st.id}`, `/api/cours/${cours.id}/intervenante`, { method: 'PATCH', body: JSON.stringify({ intervenantId: null }) });
  c('une écriture qu\'elle avait le droit de faire (désigner l\'intervenante) → 403 PERMISSION_REQUISE', ecrit.status === 403 && ecrit.body?.code === 'PERMISSION_REQUISE', `${ecrit.status} ${ecrit.body?.code}`);
  const { data: mEncore } = await svc.from('studio_membres').select('statut').eq('id', membreId).maybeSingle();
  c('sa ligne d\'équipe est intacte (statut actif, rien de révoqué)', mEncore?.statut === 'actif');
  await svc.from('profiles').update({ plan: V110 ? 'studio' : 'multi_free', stripe_subscription_status: null }).eq('id', st.id);
  const ecrit2 = await api(`${cookieLea2}; izi_studio=${st.id}`, `/api/cours/${cours.id}/intervenante`, { method: 'PATCH', body: JSON.stringify({ intervenantId: null }) });
  c('le plan revient → l\'écriture repasse', [200, 503].includes(ecrit2.status), `${ecrit2.status} ${ecrit2.body?.code || ''}`);
  await ctxL.close();
} finally {
  await browser.close();
  await purger();
}

console.log(`\n${ok} OK · ${ko} KO${V111 && V103 ? '' : ' (phase dégradée : relancer après v103 + v111)'}`);
process.exit(ko ? 1 : 0);
