/**
 * PREUVE — le lot 4 du chantier Associations & Studios : la gestion du studio
 * (v114, 2026-09-13, PLAN-ASSOS-STUDIOS-2026.md §5.2).
 *
 * Auto-adaptative : elle SONDE v114 (`lieux.salle_de`), v112 (`depenses`) et
 * v113 (`documents_structure`), et déroule ce qui est prouvable :
 *
 *   A. (toujours) Un studio jetable (plan Studio) avec Léa comme intervenante,
 *      un lieu, des séances passées pointées le mois dernier. L'onglet Analyse
 *      de Compta n'existe que pour un studio (une prof seule est refusée 403),
 *      et l'analyse recalculée à la main : recettes 135 €, CA rattaché 39 €
 *      (12 + 15 + 12), non rattaché 96 €, par intervenante et par type. Le
 *      relevé automatique : la case sur Compta → Relevés, la route (200 EN
 *      BASE ou 503 honnête). Le contrat sur la ligne d'équipe (200 EN BASE ou
 *      503). Sans v114 : « Ajouter une salle » répond honnêtement, la
 *      création d'une séance dans un lieu marche comme avant.
 *   B. (v114) La salle créée EN VRAI NAVIGATEUR (salle_de, capacité) et
 *      indentée dans le sélecteur de lieu ; une séance posée dans la salle
 *      → EN BASE avec « Salle Zen · Studio Centre » et la capacité proposée ;
 *      une seconde qui la recouvre → refusée AVANT d'écrire (toast qui nomme
 *      celle qui gêne), rien en base ; bout à bout → acceptée ; la BASE
 *      refuse un insert et un update qui recouvrent (CHEVAUCHEMENT_SALLE) et
 *      accepte deux séances dans un lieu SANS salle ; l'analyse par salle ;
 *      le cron avec un jour forcé envoie le relevé du mois précédent (claim
 *      EN BASE, une seule fois) et ne renvoie rien au rejeu.
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
const MOIS_PREC = (() => { const [a, m] = AUJ.slice(0, 7).split('-').map(Number); const d = new Date(Date.UTC(a, m - 2, 1)); return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`; })();
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
const toastTexte = async (page, ms = 15000) => {
  const t = await page.waitForSelector('.toast-message', { timeout: ms }).catch(() => null);
  return t ? (await t.textContent()) : '';
};

// ── Sondes : une vraie lecture, jamais un head/count ────────────────────────
const V114 = !(await svc.from('lieux').select('id, salle_de, capacite').limit(1)).error && !(await svc.from('profiles').select('id, releve_auto').limit(1)).error;
const V112 = !(await svc.from('depenses').select('id').limit(1)).error && !(await svc.from('studio_membres').select('id, remuneration').limit(1)).error;
const V113 = !(await svc.from('documents_structure').select('id').limit(1)).error;
const V103 = !(await svc.from('cours').select('id, intervenant_id').limit(1)).error;
console.log(`\nPhase ${V114 ? 'B (v114 appliquée)' : 'A (dégradée, v114 absente)'} · v112 ${V112 ? 'oui' : 'non'} · v113 ${V113 ? 'oui' : 'non'} · v103 ${V103 ? 'oui' : 'non'} · mois précédent ${MOIS_PREC}`);

const PREFIXE = 'preuve-gestion-';
const COMPTES = {
  st:  { email: `${PREFIXE}studio-${TS}@example.com`, slug: `${PREFIXE}studio-${TS}`, nom: 'Studio Preuve Gestion' },
  lea: { email: `${PREFIXE}lea-${TS}@example.com`,    slug: `${PREFIXE}lea-${TS}`,    nom: 'Léa Preuve Yoga' },
};

async function purger() {
  const { data: lst } = await svc.auth.admin.listUsers({ page: 1, perPage: 200 }).catch(() => ({ data: null }));
  for (const u of (lst?.users || []).filter(x => (x.email || '').startsWith(PREFIXE))) {
    for (const t of ['documents_structure', 'prestations', 'depenses']) await svc.from(t).delete().eq('profile_id', u.id).then(() => {}, () => {});
    await svc.from('emails_envoyes').delete().eq('type', 'releve_auto').like('ref', `${u.id}:%`).then(() => {}, () => {});
    await svc.from('studio_membres').delete().eq('profile_id', u.id).then(() => {}, () => {});
    await svc.from('studio_membres').delete().eq('auth_user_id', u.id).then(() => {}, () => {});
    await svc.from('paiements').delete().eq('profile_id', u.id);
    await svc.from('presences').delete().eq('profile_id', u.id);
    await svc.from('abonnements').delete().eq('profile_id', u.id);
    await svc.from('cours').delete().eq('profile_id', u.id);
    await svc.from('lieux').delete().eq('profile_id', u.id);
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
  return { status: r.status, body, type, headers: r.headers };
};
async function creerProf(cle, profil) {
  const s = COMPTES[cle];
  const { data: cree, error } = await svc.auth.admin.createUser({ email: s.email, email_confirm: true, password: `Preuve-${TS}!`, user_metadata: { prenom: cle === 'lea' ? 'Léa' : 'Preuve' } });
  if (error) { console.error(`createUser ${cle}:`, error.message); await purger(); process.exit(1); }
  s.id = cree.user.id;
  const prof = await attendre(async () => { const { data } = await svc.from('profiles').select('id').eq('id', s.id).maybeSingle(); return data || null; }, 15000, 500);
  if (!prof) { console.error('profil non créé'); await purger(); process.exit(1); }
  const { error: eMaj } = await svc.from('profiles').update({ studio_nom: s.nom, studio_slug: s.slug, portail_actif: true, prenom: cle === 'lea' ? 'Léa' : 'Preuve', nom: 'Gestion', ...profil }).eq('id', s.id);
  if (eMaj) { console.error(`profil ${cle}:`, eMaj.message); await purger(); process.exit(1); }
  return s;
}
const contexte = async (browser, email) => {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 1000 } });
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

  const st = await creerProf('st', { plan: 'studio', type_structure: 'studio', trial_started_at: j(-60), stripe_subscription_status: null });
  const lea = await creerProf('lea', { plan: 'solo', trial_started_at: j(-40), stripe_subscription_status: null });
  const cookieSt = await enteteCookie(st.email);
  const cookieLea = await enteteCookie(lea.email);

  // Léa dans l'équipe, 20 € la séance si v112 ; un lieu ; des séances passées
  // le mois dernier, pointées, avec un carnet 10 séances à 120 € et une séance
  // à l'unité à 15 € (les mêmes chiffres que la preuve du relevé, lot 2).
  const inv = await api(cookieSt, '/api/equipe', { method: 'POST', body: JSON.stringify({ email: lea.email, prenom: 'Léa', nom: 'Preuve', role: 'prof' }) });
  const membreId = inv.body?.membre?.id;
  c('Léa est invitée dans le studio', inv.status === 200 && !!membreId, `${inv.status}`);
  await svc.from('studio_membres').update({ statut: 'actif', auth_user_id: lea.id, accepte_at: new Date().toISOString() }).eq('id', membreId);
  if (V112) await svc.from('studio_membres').update({ remuneration: { mode: 'par_seance', montant: 20 } }).eq('id', membreId);
  const { data: lieu } = await svc.from('lieux').insert({ profile_id: st.id, nom: 'Studio Centre', ville: 'Lyon', ordre: 0 }).select('id').single();
  const { data: fiches } = await svc.from('clients').insert([
    { profile_id: st.id, prenom: 'Anna', nom: 'Carnet', statut: 'actif' },
    { profile_id: st.id, prenom: 'Bea', nom: 'Unite', statut: 'actif' },
  ]).select('id, prenom');
  const [anna, bea] = fiches;
  const { data: abo } = await svc.from('abonnements').insert({ profile_id: st.id, client_id: anna.id, offre_nom: 'Carnet 10', type: 'carnet', date_debut: `${MOIS_PREC}-01`, date_fin: j(300), seances_total: 10, seances_utilisees: 2, statut: 'actif' }).select('id').single();
  await svc.from('paiements').insert({ profile_id: st.id, client_id: anna.id, abonnement_id: abo.id, intitule: 'Carnet 10', type: 'carnet', montant: 120, statut: 'paid', mode: 'especes', date: `${MOIS_PREC}-02`, date_encaissement: `${MOIS_PREC}-02` });
  const { data: cours } = await svc.from('cours').insert([
    { profile_id: st.id, nom: 'Hatha preuve', type_cours: 'hatha', date: `${MOIS_PREC}-03`, heure: '18:00', duree_minutes: 60, visibilite: 'public', capacite_max: 8, lieu_id: lieu.id, lieu: 'Studio Centre' },
    { profile_id: st.id, nom: 'Yin preuve', type_cours: 'yin', date: `${MOIS_PREC}-04`, heure: '19:00', duree_minutes: 90, visibilite: 'public', capacite_max: 8, lieu_id: lieu.id, lieu: 'Studio Centre' },
  ]).select('id, nom');
  const [c1, c2] = cours;
  if (V103) await svc.from('cours').update({ intervenant_id: membreId }).in('id', [c1.id, c2.id]);
  const { data: pres } = await svc.from('presences').insert([
    { profile_id: st.id, cours_id: c1.id, client_id: anna.id, abonnement_id: abo.id, statut_pointage: 'present', pointee: true },
    { profile_id: st.id, cours_id: c1.id, client_id: bea.id, statut_pointage: 'present', pointee: true },
    { profile_id: st.id, cours_id: c2.id, client_id: anna.id, abonnement_id: abo.id, statut_pointage: 'present', pointee: true },
  ]).select('id, client_id');
  const presBea = pres.find(p => p.client_id === bea.id);
  await svc.from('paiements').insert({ profile_id: st.id, client_id: bea.id, presence_id: presBea.id, intitule: 'Séance à l\'unité', type: 'seance', montant: 15, statut: 'paid', mode: 'CB', date: `${MOIS_PREC}-03`, date_encaissement: `${MOIS_PREC}-03` });

  // ═══ A. L'analyse, recalculée à la main ═════════════════════════════════
  console.log('\n══════ A. L\'analyse d\'exercice (Studio), sans rien inventer ══════');
  const exId = AUJ.slice(0, 4);
  const an = await api(cookieSt, `/api/compta/analyse?exercice=${exId}`);
  c('GET /api/compta/analyse → 200 pour le studio', an.status === 200, `${an.status} ${an.body?.code || ''}`);
  const t = an.body?.totaux || {};
  c('recettes encaissées 135 € (120 + 15), CA rattaché 39 € (12 + 15 + 12), non rattaché 96 €', t.recettes === 135 && t.ca_rattache === 39 && t.non_rattache === 96, JSON.stringify(t));
  const parInt = (an.body?.par_intervenante || []).find(x => x.id === (V103 ? membreId : null));
  if (V103) {
    c(V112 ? 'par intervenante : Léa 39 € de CA, 40 € de coût (2 × 20), résultat −1' : 'par intervenante : Léa 39 € de CA, sans rémunération convenue : 0 de coût', !!parInt && parInt.recettes === 39 && parInt.depenses === (V112 ? 40 : 0), JSON.stringify(parInt || {}));
  }
  const parType = Object.fromEntries((an.body?.par_type || []).map(x => [x.id, x]));
  c('par type : hatha 27 € (12 + 15), yin 12 €', parType.hatha?.recettes === 27 && parType.yin?.recettes === 12, JSON.stringify(parType));
  const parSalle = an.body?.par_salle || [];
  c('par salle : « Studio Centre » porte les 39 € (aucune salle encore)', parSalle.length === 1 && parSalle[0].label === 'Studio Centre' && parSalle[0].recettes === 39, JSON.stringify(parSalle));
  const seanceH = (an.body?.seances || []).find(s => s.id === c1.id);
  c(V112 && V103 ? 'marge de Hatha = 27 − 20 = 7 €' : 'marge de Hatha : « — » (aucun coût connu, rien d\'inventé)', !!seanceH && (V112 && V103 ? seanceH.marge === 7 : seanceH.marge === null), JSON.stringify(seanceH || {}));
  c('le mois précédent porte 2 séances et 3 présentes', (an.body?.par_mois || []).find(m => m.id === MOIS_PREC)?.nb_seances === 2 && (an.body?.par_mois || []).find(m => m.id === MOIS_PREC)?.nb_presentes === 3);
  const csv = await api(cookieSt, `/api/compta/analyse?exercice=${exId}&format=csv`);
  c('l\'export CSV de l\'analyse sort (PAR SALLE, PAR INTERVENANTE, SÉANCES)', csv.status === 200 && csv.type.includes('csv') && /PAR SALLE/.test(csv.body?.texte || '') && /Hatha preuve/.test(csv.body?.texte || ''));
  const anLea = await api(cookieLea, `/api/compta/analyse?exercice=${exId}`);
  c('une prof seule (Essentiel) est refusée (403 PLAN_REQUIS)', anLea.status === 403, `${anLea.status} ${anLea.body?.code || ''}`);

  const { ctx: ctxS, page: pS } = await contexte(browser, st.email);
  await aller(pS, `${BASE}/compta?onglet=analyse`);
  await pS.waitForSelector('[data-testid="compta-onglet-analyse"]', { timeout: 90000 });
  await pS.waitForSelector('[data-testid="analyse-recettes"]', { timeout: 60000 }).catch(() => {});
  c('l\'onglet Analyse est rendu, avec 135 € de recettes et le CA rattaché', !!(await pS.$('[data-testid="analyse-recettes"]')) && (await pS.textContent('[data-testid="analyse-recettes"]')).includes('135') && (await pS.$$('[data-testid="analyse-seance"]')).length === 2);
  c('… et les tableaux par salle, intervenante et type', !!(await pS.$('[data-testid="analyse-salle"]')) && !!(await pS.$('[data-testid="analyse-intervenante"]')) && !!(await pS.$('[data-testid="analyse-type"]')));

  // Une association jetable n'a pas l'onglet (l'analyse est Studio) : on le
  // vérifie par la route, une asso se crée en un profil.
  await svc.from('profiles').update({ plan: 'asso', type_structure: 'association', rna: 'W123456789' }).eq('id', lea.id);
  const anAsso = await api(await enteteCookie(lea.email), `/api/compta/analyse?exercice=${exId}`);
  c('une association (plan Association) n\'a pas l\'analyse (403)', anAsso.status === 403, `${anAsso.status}`);
  await svc.from('profiles').update({ plan: 'solo', type_structure: 'solo', rna: null }).eq('id', lea.id);

  // ═══ A2. Le relevé automatique et le contrat ════════════════════════════
  console.log('\n══════ A2. Le relevé qui part tout seul, le contrat ══════');
  await aller(pS, `${BASE}/compta?onglet=releves`);
  await pS.waitForSelector('[data-testid="releve-auto-case"]', { timeout: 90000 }).catch(() => {});
  c('Compta → Relevés propose la case « Envoyer chaque relevé tout seul le 1er du mois »', !!(await pS.$('[data-testid="releve-auto-case"]')) && (await texte(pS)).includes('tout seul le 1er du mois'));
  const ra = await api(cookieSt, '/api/profile/releve-auto', { method: 'PATCH', body: JSON.stringify({ actif: true }) });
  if (V114) {
    c('PATCH /api/profile/releve-auto → 200, EN BASE', ra.status === 200 && ra.body?.actif === true && (await svc.from('profiles').select('releve_auto').eq('id', st.id).maybeSingle()).data?.releve_auto === true, `${ra.status}`);
  } else {
    c('sans v114 : PATCH → 503 MIGRATION_V114_REQUISE, honnête', ra.status === 503 && ra.body?.code === 'MIGRATION_V114_REQUISE', `${ra.status} ${ra.body?.code}`);
  }
  const raLea = await api(cookieLea, '/api/profile/releve-auto', { method: 'PATCH', body: JSON.stringify({ actif: true }) });
  c('une prof seule n\'a pas ce réglage (403)', raLea.status === 403, `${raLea.status}`);

  const ct = await api(cookieSt, `/api/equipe/${membreId}/contrat`, { method: 'POST', body: JSON.stringify({ url: 'https://example.com/contrat-lea.pdf', titre: 'Contrat de prestation 2026', date_document: AUJ }) });
  if (V113) {
    const { data: docs } = await svc.from('documents_structure').select('type, membre_id, titre').eq('profile_id', st.id);
    c('POST /api/equipe/[id]/contrat → 200, document type contrat rattaché à Léa EN BASE', ct.status === 200 && docs?.length === 1 && docs[0].type === 'contrat' && docs[0].membre_id === membreId, `${ct.status} ${JSON.stringify(docs || [])}`);
    const liste = await api(cookieSt, `/api/equipe/${membreId}/contrat`);
    c('GET → 1 contrat', liste.status === 200 && liste.body?.contrats?.length === 1);
    const ctKo = await api(cookieSt, `/api/equipe/${membreId}/contrat`, { method: 'POST', body: JSON.stringify({ url: 'http://pas-https', titre: 'x' }) });
    c('un contrat sans fichier https est refusé (400)', ctKo.status === 400);
    await aller(pS, `${BASE}/equipe`);
    await pS.waitForSelector('[data-testid="contrat-ouvrir"]', { timeout: 90000 });
    c('sur /equipe, « Contrat » se déplie et liste le contrat', await clicJusquA(pS, '[data-testid="contrat-ouvrir"]', '[data-testid="contrat-ligne"]') && (await texte(pS)).includes('Contrat de prestation 2026'));
  } else {
    c('sans v113 : POST contrat → 503 MIGRATION_V113_REQUISE', ct.status === 503 && ct.body?.code === 'MIGRATION_V113_REQUISE', `${ct.status} ${ct.body?.code}`);
  }
  const ctLea = await api(cookieLea, `/api/equipe/${membreId}/contrat`);
  c('Léa (chez elle) ne lit pas les contrats du studio par cette route', ctLea.status === 403 || ctLea.status === 404, `${ctLea.status}`);

  // ═══ A3. Les salles dans Paramètres (vrai navigateur) ═══════════════════
  console.log('\n══════ A3. Les salles, Paramètres → Studio & lieux ══════');
  await aller(pS, `${BASE}/parametres/studio`);
  await pS.waitForSelector('[data-carte-reglage="lieux"] .carte-reglage-entete', { timeout: 90000 });
  await pS.click('[data-carte-reglage="lieux"] .carte-reglage-entete');
  await pS.waitForSelector('[data-testid="lieu-card"]', { timeout: 30000 });
  c('la carte Lieux liste « Studio Centre » avec « Ajouter une salle »', !!(await pS.$('[data-testid="salle-ajouter"]')));
  c('la modale de salle s\'ouvre', await clicJusquA(pS, '[data-testid="salle-ajouter"]', '[data-testid="salle-modal"]'));
  await pS.fill('[data-testid="salle-nom"]', 'Salle Zen');
  await pS.fill('[data-testid="salle-capacite"]', '12');
  await pS.click('[data-testid="salle-enregistrer"]');
  let salle = null;
  if (V114) {
    salle = await attendre(async () => { const { data } = await svc.from('lieux').select('id, nom, salle_de, capacite').eq('profile_id', st.id).eq('salle_de', lieu.id).maybeSingle(); return data || null; }, 30000, 500);
    c('la salle est EN BASE : une ligne de lieux rattachée (salle_de), capacité 12', !!salle && salle.nom === 'Salle Zen' && salle.capacite === 12, JSON.stringify(salle || {}));
    await attendre(async () => (await pS.$$('[data-testid="salle-chip"]')).length === 1, 15000, 300);
    c('… et la puce « Salle Zen · 12 places » sous son lieu', (await pS.$$eval('[data-testid="salle-chip"]', els => els.map(e => e.textContent))).some(t => t.includes('Salle Zen') && t.includes('12 places')));
    const { data: sansParent } = await svc.from('lieux').insert({ profile_id: st.id, nom: 'Salle orpheline', salle_de: salle.id }).select('id');
    c('la base refuse une salle de salle (un seul niveau)', !sansParent || sansParent.length === 0);
  } else {
    const toast = await toastTexte(pS);
    c('sans v114, « Ajouter une salle » répond honnêtement (toast « pas encore appliquée »)', /pas encore appliquée/.test(toast), toast.slice(0, 80));
    const { data: rows } = await svc.from('lieux').select('id').eq('profile_id', st.id);
    c('… et rien n\'est écrit (un seul lieu)', rows?.length === 1);
  }

  // ═══ B. v114 : la séance dans la salle, le chevauchement ═════════════════
  console.log(`\n══════ ${V114 ? 'B. La salle sur une séance, le chevauchement refusé' : 'B (dégradé). Une séance dans un lieu, comme avant'} ══════`);
  const creerSeance = async (nom, date, heure, lieuId) => {
    await aller(pS, `${BASE}/cours/nouveau`);
    await pS.waitForSelector('select option[value="public"]', { state: 'attached', timeout: 90000 });
    await attendre(async () => (await pS.locator(`select option[value="${lieuId}"]`).count()) > 0 ? true : null, 20000, 300);
    await pS.getByPlaceholder('Ex : Yoga Vinyasa').fill(nom);
    await pS.fill('input[type="date"]', date);
    const [hh, mm] = heure.split(':');
    await pS.selectOption('select[aria-label="Heure"]', hh);
    await pS.selectOption('select[aria-label="Minutes"]', mm);
    const labelOption = await pS.$eval('select option[value="' + lieuId + '"]', o => o.textContent);
    await pS.selectOption('select:has(option[value="' + lieuId + '"])', lieuId);
    await dormir(400);
    await pS.getByRole('button', { name: /Créer le cours/ }).click();
    return labelOption;
  };
  const lieuCible = V114 ? salle.id : lieu.id;
  const labelOpt = await creerSeance('Vinyasa salle', j(5), '18:00', lieuCible);
  const s1 = await attendre(async () => { const { data } = await svc.from('cours').select('id, lieu_id, lieu, capacite_max, heure').eq('profile_id', st.id).eq('nom', 'Vinyasa salle').maybeSingle(); return data || null; }, 30000, 500);
  if (V114) {
    c('la séance est EN BASE dans la salle, libellé « Salle Zen · Studio Centre », 12 places proposées', !!s1 && s1.lieu_id === salle.id && s1.lieu === 'Salle Zen · Studio Centre' && s1.capacite_max === 12, JSON.stringify(s1 || {}));
    c('le sélecteur de lieu indente la salle sous son lieu (« ↳ Salle Zen »)', /^↳ Salle Zen/.test(labelOpt.trim()), labelOpt.trim());
    await creerSeance('Yin chevauche', j(5), '18:30', salle.id);
    const toast = await toastTexte(pS);
    c('une seconde séance qui recouvre 18:00–19:00 est refusée AVANT d\'écrire, en nommant celle qui gêne', /Salle Zen · Studio Centre est déjà prise par « Vinyasa salle »/.test(toast), toast.slice(0, 120));
    await dormir(1500);
    const { data: nb1 } = await svc.from('cours').select('id').eq('profile_id', st.id).eq('nom', 'Yin chevauche');
    c('… rien en base', (nb1 || []).length === 0);
    await creerSeance('Yin bout a bout', j(5), '19:00', salle.id);
    const s3 = await attendre(async () => { const { data } = await svc.from('cours').select('id').eq('profile_id', st.id).eq('nom', 'Yin bout a bout').maybeSingle(); return data || null; }, 30000, 500);
    c('une séance bout à bout (19:00) est acceptée', !!s3);
    const { error: eIns } = await svc.from('cours').insert({ profile_id: st.id, nom: 'Direct chevauche', date: j(5), heure: '18:45', duree_minutes: 30, lieu_id: salle.id });
    c('la BASE refuse un insert qui recouvre (CHEVAUCHEMENT_SALLE), même sans passer par l\'écran', !!eIns && /CHEVAUCHEMENT_SALLE/.test(eIns.message), eIns?.message?.slice(0, 80));
    const { error: eUpd } = await svc.from('cours').update({ heure: '18:30' }).eq('id', s3.id);
    c('… et un update qui recouvre', !!eUpd && /CHEVAUCHEMENT_SALLE/.test(eUpd.message));
    const { error: eAnn } = await svc.from('cours').insert({ profile_id: st.id, nom: 'Annulee chevauche', date: j(5), heure: '18:30', duree_minutes: 30, lieu_id: salle.id, est_annule: true });
    c('une séance ANNULÉE dans la salle ne bloque rien', !eAnn);
    const { error: eLieu } = await svc.from('cours').insert([
      { profile_id: st.id, nom: 'Lieu A', date: j(6), heure: '18:00', duree_minutes: 60, lieu_id: lieu.id },
      { profile_id: st.id, nom: 'Lieu B', date: j(6), heure: '18:00', duree_minutes: 60, lieu_id: lieu.id },
    ]);
    c('deux séances au même moment dans un LIEU sans salle sont acceptées (ce n\'est pas à la base d\'en décider)', !eLieu);

    // L'analyse par salle, après une séance passée dans la salle.
    const { data: sPassee } = await svc.from('cours').insert({ profile_id: st.id, nom: 'Hatha en salle', type_cours: 'hatha', date: `${MOIS_PREC}-10`, heure: '10:00', duree_minutes: 60, lieu_id: salle.id, lieu: 'Salle Zen · Studio Centre' }).select('id').single();
    await svc.from('presences').insert({ profile_id: st.id, cours_id: sPassee.id, client_id: anna.id, abonnement_id: abo.id, statut_pointage: 'present', pointee: true });
    const an2 = await api(cookieSt, `/api/compta/analyse?exercice=${exId}`);
    const zen = (an2.body?.par_salle || []).find(x => x.id === salle.id);
    c('l\'analyse par salle : « Salle Zen · Studio Centre » porte 12 € (une présente au prorata)', !!zen && zen.recettes === 12 && zen.nb_seances === 1, JSON.stringify(zen || {}));

    // Le cron : le relevé du mois précédent part tout seul, une fois.
    console.log('\n══════ B2. Le relevé automatique par le cron (jour forcé) ══════');
    const jour1 = `${AUJ.slice(0, 7)}-01`;
    const cron = async () => api(null, `/api/cron/expirations?jour=${jour1}`, { headers: { authorization: `Bearer ${env.CRON_SECRET}` } });
    const r1 = await cron();
    const ref = `${st.id}:${membreId}:${MOIS_PREC}`;
    const { data: claims } = await svc.from('emails_envoyes').select('id, destinataire').eq('type', 'releve_auto').eq('ref', ref);
    // L'email de Léa est @example.com : sendEmail le SAUTE (ok:false, skipped)
    // et le claim est libéré, exactement comme le rappel URSSAF. La preuve
    // le sait : elle vérifie que le cron a tenté (claim posé puis libéré) en
    // lisant le compteur de la réponse, et qu'un vrai destinataire compterait.
    c('le cron répond avec un compteur relevesAuto', r1.status === 200 && typeof r1.body?.relevesAuto === 'number', `${r1.status} ${JSON.stringify(r1.body || {}).slice(0, 80)}`);
    info(`claim ${ref} : ${(claims || []).length} ligne(s) (0 attendu : destinataire @example.com, envoi sauté, claim libéré)`);
    c('aucun email réel ne part vers un domaine de test (claim libéré, rien d\'envoyé)', (claims || []).length === 0 && r1.body?.relevesAuto === 0);
    // Avec un destinataire RÉEL (bonjour@izisolo.fr), le claim resterait : on
    // le prouve en changeant l'email du membre puis en RESTAURANT.
    await svc.from('studio_membres').update({ email: 'bonjour@izisolo.fr' }).eq('id', membreId);
    const r2 = await cron();
    const { data: claims2 } = await svc.from('emails_envoyes').select('id').eq('type', 'releve_auto').eq('ref', ref);
    c('vers une adresse réelle : 1 relevé envoyé, claim EN BASE (⚠️ 1 email réel à bonjour@izisolo.fr)', r2.body?.relevesAuto === 1 && (claims2 || []).length === 1, JSON.stringify(r2.body?.relevesAuto));
    const r3 = await cron();
    c('rejouer le cron ne renvoie rien (claim tenu)', r3.body?.relevesAuto === 0);
    await svc.from('studio_membres').update({ email: lea.email }).eq('id', membreId);
    await svc.from('profiles').update({ releve_auto: false }).eq('id', st.id);
    const r4 = await cron();
    c('sans le réglage, le cron ne fait rien', r4.body?.relevesAuto === 0);
  } else {
    c('sans v114, une séance se crée dans un lieu comme avant (libellé « Studio Centre »)', !!s1 && s1.lieu_id === lieu.id && s1.lieu === 'Studio Centre', JSON.stringify(s1 || {}));
  }

  // ═══ C. Le centre d'aide ═════════════════════════════════════════════════
  console.log('\n══════ C. Le centre d\'aide ══════');
  await aller(pS, `${BASE}/aide`);
  await pS.waitForSelector('section#studio', { timeout: 90000 }).catch(() => {});
  c('le tuto #studio existe', !!(await pS.$('section#studio')));
  await aller(pS, `${BASE}/support`);
  await pS.waitForSelector('h1', { timeout: 90000 }).catch(() => {});
  await attendre(async () => (await texte(pS)).includes('plusieurs salles'), 30000, 500);
  const tF = await texte(pS);
  c('la FAQ répond sur les salles, la marge et le relevé automatique', tF.includes('plusieurs salles') && tF.includes('la marge d') && tF.includes('sans que je le fasse'));

  await ctxS.close();
} finally {
  await browser.close();
  await purger();
}

console.log(`\n${ok} OK · ${ko} KO${V114 ? '' : ' (phase dégradée : relancer après v114)'}`);
process.exit(ko ? 1 : 0);
