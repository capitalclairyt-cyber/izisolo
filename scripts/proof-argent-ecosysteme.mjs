/**
 * PREUVE — le lot 2 du chantier Associations & Studios : l'argent de
 * l'écosystème (v112, 2026-09-13, PLAN-ASSOS-STUDIOS-2026.md §4.3, §5, §6.5).
 *
 * Auto-adaptative : elle SONDE v112 (`depenses`, `studio_membres.remuneration`)
 * et v103 (`cours.intervenant_id`), et déroule ce qui est prouvable :
 *
 *   A. Le RELEVÉ d'une intervenante, recalculé à la main : deux séances
 *      passées et pointées, trois présentes (un carnet 10 séances à 120 €
 *      décompté deux fois = 12 € × 2, une séance payée 15 € à l'unité), une
 *      absente qui ne compte pas ; PDF servi. Sans v112 : la rémunération et
 *      la validation répondent 503, honnêtement ; l'écran Compta le dit ; une
 *      prof seule voit Compta avec un cadenas et la page qui explique.
 *   B. (v112) La rémunération convenue (30 € / séance) → montant dû 60 € ;
 *      la structure VALIDE le relevé en vrai navigateur → prestation « emise »
 *      + dépense « à régler » EN BASE ; Léa la voit dans SES revenus, sans
 *      SIRET la facture est refusée (409), avec son SIRET elle est émise dans
 *      SA séquence (type a_regler), PDF pour elle et pour la structure, 403
 *      pour une étrangère ; la structure règle → dépense réglée, prestation
 *      réglée, paiement ENCAISSÉ chez Léa (virement, date), facture payée,
 *      dans son récap URSSAF ; rejeu 409 ; dépense simple CRUD ; export
 *      d'exercice avec recettes et dépenses ; cloisonnement par RLS avec les
 *      jetons des deux côtés ; relevé PDF sur le lien permanent.
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
const MOIS = new Date().toLocaleDateString('sv-SE', { timeZone: 'Europe/Paris' }).slice(0, 7);
const aller = async (page, url) => {
  try { await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 120000 }); }
  catch (e) { if (!/ERR_ABORTED/.test(String(e))) throw e; await dormir(1500); await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 120000 }); }
};
const texte = async (page) => page.evaluate(() => document.body.innerText);
// Un bouton rendu côté serveur n'a pas encore son handler au premier clic
// (piège v100) : on re-clique jusqu'à ce que le témoin d'ouverture soit là.
const clicJusquA = async (page, sel, temoin, essais = 8) => {
  for (let i = 0; i < essais; i++) {
    await page.click(sel).catch(() => {});
    if (await page.waitForSelector(temoin, { timeout: 2500 }).then(() => true).catch(() => false)) return true;
  }
  return false;
};

// ── Sondes : une vraie lecture, jamais un head/count ────────────────────────
const V112 = !(await svc.from('depenses').select('id').limit(1)).error && !(await svc.from('studio_membres').select('id, remuneration').limit(1)).error;
const V103 = !(await svc.from('cours').select('id, intervenant_id').limit(1)).error;
console.log(`\nPhase ${V112 ? 'B (v112 appliquée)' : 'A (dégradée, v112 absente)'} · v103 ${V103 ? 'appliquée' : 'absente'} · mois ${MOIS}`);

const PREFIXE = 'preuve-argent-';
const COMPTES = {
  st:  { email: `${PREFIXE}studio-${TS}@example.com`, slug: `${PREFIXE}studio-${TS}`, nom: 'Studio Preuve Argent' },
  lea: { email: `${PREFIXE}lea-${TS}@example.com`,    slug: `${PREFIXE}lea-${TS}`,    nom: 'Léa Preuve Yoga' },
  ext: { email: `${PREFIXE}ext-${TS}@example.com`,    slug: `${PREFIXE}ext-${TS}`,    nom: 'Studio Étranger' },
};

async function purger() {
  const { data: lst } = await svc.auth.admin.listUsers({ page: 1, perPage: 200 }).catch(() => ({ data: null }));
  for (const u of (lst?.users || []).filter(x => (x.email || '').startsWith(PREFIXE))) {
    for (const t of ['prestations', 'depenses']) await svc.from(t).delete().eq('profile_id', u.id).then(() => {}, () => {});
    await svc.from('factures').delete().eq('profile_id', u.id).then(() => {}, () => {});
    await svc.from('studio_membres').delete().eq('profile_id', u.id);
    await svc.from('studio_membres').delete().eq('auth_user_id', u.id);
    await svc.from('paiements').delete().eq('profile_id', u.id);
    await svc.from('presences').delete().eq('profile_id', u.id);
    await svc.from('abonnements').delete().eq('profile_id', u.id);
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
const clientJeton = (session) => createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
  auth: { persistSession: false, autoRefreshToken: false }, global: { headers: { Authorization: `Bearer ${session.access_token}` } },
});

async function creerProf(cle, profil) {
  const s = COMPTES[cle];
  const { data: cree, error } = await svc.auth.admin.createUser({ email: s.email, email_confirm: true, password: `Preuve-${TS}!`, user_metadata: { prenom: cle === 'lea' ? 'Léa' : 'Preuve' } });
  if (error) { console.error(`createUser ${cle}:`, error.message); await purger(); process.exit(1); }
  s.id = cree.user.id;
  const prof = await attendre(async () => { const { data } = await svc.from('profiles').select('id').eq('id', s.id).maybeSingle(); return data || null; }, 15000, 500);
  if (!prof) { console.error('profil non créé'); await purger(); process.exit(1); }
  const { error: eMaj } = await svc.from('profiles').update({ studio_nom: s.nom, studio_slug: s.slug, portail_actif: true, prenom: cle === 'lea' ? 'Léa' : 'Preuve', nom: 'Argent', ...profil }).eq('id', s.id);
  if (eMaj) { console.error(`profil ${cle}:`, eMaj.message); await purger(); process.exit(1); }
  return s;
}

let chromium; try { ({ chromium } = await import('playwright')); } catch { ({ chromium } = await import('@playwright/test')); }
let browser; try { browser = await chromium.launch({ channel: 'msedge' }); } catch { browser = await chromium.launch(); }

try {
  for (let i = 0; i < 60; i++) { try { const r = await fetch(`${BASE}/login`); if (r.ok) break; } catch { /* pas prêt */ } await dormir(2000); }

  const st = await creerProf('st', { plan: 'studio', type_structure: 'studio', trial_started_at: j(-60), stripe_subscription_status: null });
  const lea = await creerProf('lea', { plan: 'solo', trial_started_at: j(-40), stripe_subscription_status: null });
  const ext = await creerProf('ext', { plan: 'studio', type_structure: 'studio', trial_started_at: j(-60), stripe_subscription_status: null });
  const cookieSt = await enteteCookie(st.email);
  const cookieLea = await enteteCookie(lea.email);
  const cookieExt = await enteteCookie(ext.email);

  // Léa entre dans l'équipe du studio (le lot 1 a prouvé l'activation : ici on
  // la pose directement), et donne deux séances passées.
  const inv = await api(cookieSt, '/api/equipe', { method: 'POST', body: JSON.stringify({ email: lea.email, prenom: 'Léa', nom: 'Preuve', role: 'prof' }) });
  const membreId = inv.body?.membre?.id;
  c('Léa est invitée dans le studio', inv.status === 200 && !!membreId, `${inv.status}`);
  await svc.from('studio_membres').update({ statut: 'actif', auth_user_id: lea.id, accepte_at: new Date().toISOString() }).eq('id', membreId);

  const { data: fiches } = await svc.from('clients').insert([
    { profile_id: st.id, prenom: 'Anna', nom: 'Carnet', statut: 'actif' },
    { profile_id: st.id, prenom: 'Bea', nom: 'Unite', statut: 'actif' },
    { profile_id: st.id, prenom: 'Cléo', nom: 'Absente', statut: 'actif' },
  ]).select('id, prenom');
  const [anna, bea, cleo] = fiches;
  const { data: abo } = await svc.from('abonnements').insert({ profile_id: st.id, client_id: anna.id, offre_nom: 'Carnet 10', type: 'carnet', date_debut: j(-30), date_fin: j(300), seances_total: 10, seances_utilisees: 2, statut: 'actif' }).select('id').single();
  await svc.from('paiements').insert({ profile_id: st.id, client_id: anna.id, abonnement_id: abo.id, intitule: 'Carnet 10', type: 'carnet', montant: 120, statut: 'paid', mode: 'especes', date: j(-30), date_encaissement: j(-30) });
  const { data: cours } = await svc.from('cours').insert([
    { profile_id: st.id, nom: 'Hatha preuve', date: `${MOIS}-01`, heure: '18:00', duree_minutes: 60, visibilite: 'public', capacite_max: 8 },
    { profile_id: st.id, nom: 'Yin preuve', date: `${MOIS}-02`, heure: '19:00', duree_minutes: 90, visibilite: 'public', capacite_max: 8 },
    { profile_id: st.id, nom: 'Futur preuve', date: j(20), heure: '10:00', duree_minutes: 60, visibilite: 'public', capacite_max: 8 },
  ]).select('id, nom');
  const [c1, c2, c3] = cours;
  if (V103) await svc.from('cours').update({ intervenant_id: membreId }).in('id', [c1.id, c2.id, c3.id]);
  const { data: pres } = await svc.from('presences').insert([
    { profile_id: st.id, cours_id: c1.id, client_id: anna.id, abonnement_id: abo.id, statut_pointage: 'present', pointee: true },
    { profile_id: st.id, cours_id: c1.id, client_id: bea.id, statut_pointage: 'present', pointee: true },
    { profile_id: st.id, cours_id: c1.id, client_id: cleo.id, statut_pointage: 'absent', pointee: false },
    { profile_id: st.id, cours_id: c2.id, client_id: anna.id, abonnement_id: abo.id, statut_pointage: 'present', pointee: true },
  ]).select('id, client_id, cours_id');
  const presBea = pres.find(p => p.client_id === bea.id);
  await svc.from('paiements').insert({ profile_id: st.id, client_id: bea.id, presence_id: presBea.id, intitule: 'Séance à l\'unité', type: 'seance', montant: 15, statut: 'paid', mode: 'CB', date: `${MOIS}-01`, date_encaissement: `${MOIS}-01` });

  // ═══ A. Le relevé, recalculé à la main ══════════════════════════════════
  console.log('\n══════ A. Le relevé mensuel, sans rien inventer ══════');
  const rel = await api(cookieSt, `/api/equipe/${membreId}/releve?mois=${MOIS}`);
  if (V103) {
    c('GET /releve → 200', rel.status === 200, `${rel.status} ${rel.body?.code || ''}`);
    const r = rel.body?.releve || {};
    c('2 séances passées (la future ne compte pas), 2,5 h', r.nb_seances === 2 && r.heures === 2.5, `${r.nb_seances} séances, ${r.heures} h`);
    c('3 présentes (l\'absente ne compte pas)', r.nb_presentes === 3, `${r.nb_presentes}`);
    c('CA rattaché = 12 + 15 + 12 = 39 € (carnet au prorata, séance à l\'unité)', r.ca === 39, `${r.ca}`);
    c(V112 ? 'sans rémunération convenue : montant dû null' : 'sans v112 : aucune rémunération, montant dû null', r.montant_du === null || r.montant_du === undefined);
    const pdf = await api(cookieSt, `/api/equipe/${membreId}/releve?mois=${MOIS}&format=pdf`);
    c('le PDF du relevé est servi', pdf.status === 200 && pdf.type.includes('pdf') && pdf.body?.pdf > 1500, `${pdf.status} ${pdf.type}`);
    const sansDroit = await api(cookieLea, `/api/equipe/${membreId}/releve?mois=${MOIS}`);
    c('Léa (chez ELLE, plan gratuit) ne lit pas un relevé de la structure par cette route', sansDroit.status === 403 || sansDroit.status === 404, `${sansDroit.status} ${sansDroit.body?.code || ''}`);
  } else {
    c('sans v103, la route dit MIGRATION_V103_REQUISE (503)', rel.status === 503 && rel.body?.code === 'MIGRATION_V103_REQUISE', `${rel.status} ${rel.body?.code}`);
  }

  // L'écran Compta, plan Studio ; et la prof seule avec son cadenas.
  const ctxS = await browser.newContext({ viewport: { width: 1280, height: 1000 } });
  await ctxS.addCookies((await sessionCookies(st.email)).cookies.map(cc => ({ ...cc, url: BASE, sameSite: 'Lax' })));
  const pS = await ctxS.newPage();
  pS.on('dialog', d => d.accept());
  await aller(pS, `${BASE}/compta`);
  await pS.waitForSelector('[data-testid="compta-onglet-depenses"]', { timeout: 90000 }).catch(() => {});
  const tS = await texte(pS);
  c('la page Compta se rend pour le studio (4 onglets)', !!(await pS.$('[data-testid="compta-onglet-export"]')) && tS.includes('Compta'), pS.url());
  c('l\'entrée « Compta » est dans la nav', tS.includes('Compta'));
  if (!V112) c('… et dit que la mise à jour n\'est pas appliquée', !!(await pS.$('[data-testid="compta-indisponible"]')));
  else c('… sans bandeau d\'indisponibilité', !(await pS.$('[data-testid="compta-indisponible"]')));

  const ctxL = await browser.newContext({ viewport: { width: 1280, height: 1000 } });
  await ctxL.addCookies((await sessionCookies(lea.email)).cookies.map(cc => ({ ...cc, url: BASE, sameSite: 'Lax' })));
  const pL = await ctxL.newPage();
  pL.on('dialog', d => d.accept());
  await aller(pL, `${BASE}/compta`);
  await pL.waitForSelector('[data-testid="plan-requis"], [data-testid="compta-onglet-depenses"]', { timeout: 90000 }).catch(() => {});
  c('une prof seule (Essentiel) voit la page qui nomme les plans Association et Studio', !!(await pL.$('[data-testid="plan-requis"][data-capacite="depenses"]')) && (await texte(pL)).includes('Association'));
  c('… et l\'entrée Compta porte un cadenas dans sa nav', await pL.evaluate(() => !!document.querySelector('a[href="/compta"] [data-testid="sidebar-lock"]')));

  if (!V112) {
    console.log('\n══════ A bis. Sans v112, chaque écriture le dit ══════');
    const rem = await api(cookieSt, `/api/equipe/${membreId}/remuneration`, { method: 'PATCH', body: JSON.stringify({ mode: 'par_seance', montant: 30 }) });
    c('PATCH /remuneration → 503 MIGRATION_V112_REQUISE', rem.status === 503 && rem.body?.code === 'MIGRATION_V112_REQUISE', `${rem.status} ${rem.body?.code}`);
    const val = await api(cookieSt, `/api/equipe/${membreId}/releve`, { method: 'POST', body: JSON.stringify({ mois: MOIS }) });
    c('POST /releve (valider) → 503', val.status === 503, `${val.status} ${val.body?.code}`);
    const dep = await api(cookieSt, '/api/depenses', { method: 'POST', body: JSON.stringify({ libelle: 'Salle', date: j(-1), montant_ttc: 100 }) });
    c('POST /api/depenses → 503', dep.status === 503 && dep.body?.code === 'MIGRATION_V112_REQUISE', `${dep.status}`);
    const liste = await api(cookieSt, '/api/depenses');
    c('GET /api/depenses → 503, jamais une liste vide qui ment', liste.status === 503 && liste.body?.indisponible === true, `${liste.status}`);
    const csv = await api(cookieSt, `/api/export/compta-csv`);
    c('l\'export d\'exercice sort quand même, avec les recettes et la mention « dépenses indisponibles »', csv.status === 200 && (csv.body?.texte || '').includes('TOTAL RECETTES') && (csv.body?.texte || '').includes('indisponibles'), `${csv.status}`);
    const prest = await api(cookieLea, '/api/prestations');
    c('GET /api/prestations (Léa) → liste vide, indisponible dit', prest.status === 200 && Array.isArray(prest.body?.prestations) && prest.body.prestations.length === 0);
  }

  // ═══ B. v112 : la boucle complète ═══════════════════════════════════════
  if (V112 && V103) {
    console.log('\n══════ B. La rémunération, le relevé validé, la prestation ══════');
    const remKo = await api(cookieSt, `/api/equipe/${membreId}/remuneration`, { method: 'PATCH', body: JSON.stringify({ mode: 'pourcentage_ca', montant: 150 }) });
    c('un pourcentage de 150 % est refusé (400)', remKo.status === 400);
    const rem = await api(cookieSt, `/api/equipe/${membreId}/remuneration`, { method: 'PATCH', body: JSON.stringify({ mode: 'par_seance', montant: 30 }) });
    c('PATCH /remuneration 30 € / séance → 200', rem.status === 200 && rem.body?.remuneration?.montant === 30, `${rem.status}`);
    const { data: mRem } = await svc.from('studio_membres').select('remuneration').eq('id', membreId).maybeSingle();
    c('… EN BASE', mRem?.remuneration?.mode === 'par_seance' && mRem?.remuneration?.montant === 30);
    const rel2 = await api(cookieSt, `/api/equipe/${membreId}/releve?mois=${MOIS}`);
    c('le relevé dit désormais 60 € dus (2 séances × 30 €)', rel2.body?.releve?.montant_du === 60, `${rel2.body?.releve?.montant_du}`);

    // La structure valide le relevé EN VRAI NAVIGATEUR.
    await aller(pS, `${BASE}/compta?onglet=releves`);
    await pS.waitForSelector('[data-testid="releve-membre"]', { timeout: 90000 });
    await pS.selectOption('[data-testid="releve-membre"]', membreId);
    await pS.selectOption('[data-testid="releve-mois"]', MOIS);
    await pS.waitForSelector('[data-testid="releve-resultat"]', { timeout: 60000 });
    await attendre(async () => (await pS.$eval('[data-testid="releve-nb-seances"]', e => e.textContent)) === '2', 15000, 300);
    c('l\'écran Relevés affiche 2 séances et 60 € dus', (await pS.$eval('[data-testid="releve-nb-seances"]', e => e.textContent)) === '2' && (await pS.$eval('[data-testid="releve-montant-du"]', e => e.textContent)).includes('60'));
    await pS.click('[data-testid="releve-valider"]');
    const prestDb = await attendre(async () => { const { data } = await svc.from('prestations').select('*').eq('membre_id', membreId).eq('periode', MOIS).maybeSingle(); return data || null; }, 30000, 500);
    c('la prestation est EN BASE (emise, 60 €, relevé figé)', !!prestDb && prestDb.statut === 'emise' && Number(prestDb.montant) === 60 && prestDb.releve?.nb_seances === 2, JSON.stringify(prestDb ? { statut: prestDb.statut, montant: prestDb.montant } : {}));
    const { data: depDb } = await svc.from('depenses').select('*').eq('prestation_id', prestDb?.id || '00000000-0000-0000-0000-000000000000').maybeSingle();
    c('… avec sa dépense « à régler » de 60 €, catégorie intervenante, rattachée à Léa', !!depDb && depDb.statut === 'a_regler' && Number(depDb.montant_ttc) === 60 && depDb.categorie === 'intervenante' && depDb.membre_id === membreId);
    await pS.waitForSelector('[data-testid="prestation-ligne"]', { timeout: 30000 }).catch(() => {});
    c('l\'onglet Prestations liste la prestation « À facturer »', !!(await pS.$('[data-testid="prestation-ligne"][data-statut="emise"]')));
    const rejeu = await api(cookieSt, `/api/equipe/${membreId}/releve`, { method: 'POST', body: JSON.stringify({ mois: MOIS }) });
    c('valider deux fois le même mois → 409 DEJA_VALIDE', rejeu.status === 409 && rejeu.body?.code === 'DEJA_VALIDE', `${rejeu.status} ${rejeu.body?.code}`);
    const depPatch = await api(cookieSt, `/api/depenses/${depDb?.id}`, { method: 'PATCH', body: JSON.stringify({ montant_ttc: 999 }) });
    c('la dépense née d\'un relevé ne se modifie pas à la main (409)', depPatch.status === 409 && depPatch.body?.code === 'PRESTATION');

    console.log('\n══════ B2. Léa facture depuis SON IziSolo ══════');
    const mes = await api(cookieLea, '/api/prestations');
    c('GET /api/prestations (Léa) → sa prestation, nommée par la structure', mes.status === 200 && mes.body?.prestations?.length === 1 && mes.body.prestations[0].structure_nom === st.nom && mes.body.prestations[0].statut === 'emise', JSON.stringify(mes.body?.prestations?.[0] || {}).slice(0, 100));
    c('… sans la dépense de la structure', !JSON.stringify(mes.body || {}).includes('depense_id'));
    const sansSiret = await api(cookieLea, `/api/prestations/${prestDb.id}/facturer`, { method: 'POST' });
    c('sans SIRET, facturer est refusé (409 SANS_SIRET) avec le chemin', sansSiret.status === 409 && sansSiret.body?.code === 'SANS_SIRET' && (sansSiret.body?.error || '').includes('Facturation'), `${sansSiret.status} ${sansSiret.body?.code}`);
    await svc.from('profiles').update({ facturation_siret: '73282932000074', facturation_raison_sociale: 'Léa Preuve EI', pays: 'FR', adresse: '1 rue de la Preuve', ville: 'Lyon' }).eq('id', lea.id);
    await aller(pL, `${BASE}/revenus`);
    await pL.waitForSelector('[data-testid="mes-prestations"]', { timeout: 90000 }).catch(() => {});
    c('« Mes prestations » s\'affiche dans SES revenus', !!(await pL.$('[data-testid="mes-prestations-ligne"][data-statut="emise"]')));
    await pL.click('[data-testid="mes-prestations-facturer"]');
    const factDb = await attendre(async () => { const { data } = await svc.from('factures').select('*').eq('profile_id', lea.id).maybeSingle(); return data || null; }, 30000, 500);
    c('la facture v2 est EN BASE chez Léa : type a_regler, statut emise, numéro de SA séquence', !!factDb && factDb.type === 'a_regler' && factDb.statut === 'emise' && /^FAC-\d{4}-0001$/.test(factDb.numero_affiche || '') && factDb.prestation_id === prestDb.id, factDb?.numero_affiche);
    c('… snapshot : émetteur Léa Preuve EI, adressée au studio, 60 €', factDb?.snapshot?.emetteur?.nom === 'Léa Preuve EI' && factDb?.snapshot?.client?.nom === st.nom && factDb?.snapshot?.total === 60 && factDb?.snapshot?.a_regler === true);
    const { data: prestF } = await svc.from('prestations').select('statut, facture_id').eq('id', prestDb.id).maybeSingle();
    c('la prestation est « facturee » et porte la facture', prestF?.statut === 'facturee' && prestF?.facture_id === factDb?.id);
    const pdfLea = await api(cookieLea, `/api/prestations/${prestDb.id}/facture`);
    c('PDF de la facture pour Léa (200 application/pdf)', pdfLea.status === 200 && pdfLea.type.includes('pdf'));
    const pdfSt = await api(cookieSt, `/api/prestations/${prestDb.id}/facture`);
    c('… et pour la structure', pdfSt.status === 200 && pdfSt.type.includes('pdf'));
    const pdfExt = await api(cookieExt, `/api/prestations/${prestDb.id}/facture`);
    c('… jamais pour une étrangère (403)', pdfExt.status === 403, `${pdfExt.status}`);
    const refact = await api(cookieLea, `/api/prestations/${prestDb.id}/facturer`, { method: 'POST' });
    c('facturer deux fois → 409 DEJA_FACTUREE', refact.status === 409 && refact.body?.code === 'DEJA_FACTUREE');
    await aller(pS, `${BASE}/compta?onglet=prestations`);
    await pS.waitForSelector('[data-testid="prestation-ligne"]', { timeout: 60000 });
    c('la structure voit « Facturée » et le numéro', !!(await pS.$('[data-testid="prestation-ligne"][data-statut="facturee"]')) && (await texte(pS)).includes(factDb?.numero_affiche || '§'));

    console.log('\n══════ B3. La structure règle : l\'argent arrive chez Léa ══════');
    c('« Réglée » ouvre la confirmation en vrai navigateur', await clicJusquA(pS, '[data-testid="prestation-regler"]', '[data-testid="prestation-confirmer-reglement"]'));
    await pS.click('[data-testid="prestation-confirmer-reglement"]');
    const prestR = await attendre(async () => { const { data } = await svc.from('prestations').select('statut, paiement_id, reglee_at').eq('id', prestDb.id).maybeSingle(); return data?.statut === 'reglee' ? data : null; }, 30000, 500);
    c('la prestation est « reglee » EN BASE avec son paiement', !!prestR && !!prestR.paiement_id);
    const { data: depR } = await svc.from('depenses').select('statut, date_reglement, mode_reglement').eq('id', depDb.id).maybeSingle();
    c('la dépense de la structure est réglée (date, virement)', depR?.statut === 'reglee' && depR?.date_reglement === j(0) && depR?.mode_reglement === 'virement', JSON.stringify(depR || {}));
    const { data: paie } = await svc.from('paiements').select('*').eq('id', prestR?.paiement_id || '00000000-0000-0000-0000-000000000000').maybeSingle();
    c('un paiement ENCAISSÉ existe chez Léa : 60 €, virement, daté, sans fiche élève', !!paie && paie.profile_id === lea.id && Number(paie.montant) === 60 && paie.statut === 'paid' && paie.mode === 'virement' && paie.date_encaissement === j(0) && paie.client_id === null && (paie.intitule || '').includes(st.nom), JSON.stringify(paie ? { montant: paie.montant, mode: paie.mode, date: paie.date_encaissement } : {}));
    const { data: factR } = await svc.from('factures').select('statut, payee_at').eq('id', factDb.id).maybeSingle();
    const { data: lien } = await svc.from('factures_paiements').select('paiement_id').eq('facture_id', factDb.id).maybeSingle();
    c('sa facture est « payee » et porte le paiement', factR?.statut === 'payee' && !!factR?.payee_at && lien?.paiement_id === paie?.id);
    const recap = await api(cookieLea, `/api/urssaf/recap?periode=M-${MOIS}`);
    c('le récap URSSAF de Léa compte ces 60 € (assiette de trésorerie)', recap.status === 200 && Number(recap.body?.totaux?.brut ?? recap.body?.total ?? -1) >= 60, JSON.stringify(recap.body?.totaux || recap.body || {}).slice(0, 120));
    const rejeuR = await api(cookieSt, `/api/prestations/${prestDb.id}/regler`, { method: 'POST', body: JSON.stringify({}) });
    c('régler deux fois → 409 DEJA_REGLEE', rejeuR.status === 409 && rejeuR.body?.code === 'DEJA_REGLEE', `${rejeuR.status} ${rejeuR.body?.code}`);
    await aller(pL, `${BASE}/revenus`);
    await pL.waitForSelector('[data-testid="mes-prestations"]', { timeout: 90000 }).catch(() => {});
    const tLR = await texte(pL);
    c('les revenus de Léa montrent la prestation « Réglée » et la ligne de paiement', !!(await pL.$('[data-testid="mes-prestations-ligne"][data-statut="reglee"]')) && tLR.includes(st.nom));

    console.log('\n══════ B4. Dépenses simples, export, cloisonnement ══════');
    const dep = await api(cookieSt, '/api/depenses', { method: 'POST', body: JSON.stringify({ libelle: 'Location salle', date: `${MOIS}-03`, montant_ttc: '120,50', montant_ht: 100, categorie: 'salle', statut: 'reglee', mode_reglement: 'cb', fournisseur: 'Mairie' }) });
    c('POST /api/depenses → 200, 120,50 € EN BASE', dep.status === 200 && Number(dep.body?.depense?.montant_ttc) === 120.5, `${dep.status} ${dep.body?.code || ''}`);
    const depKo = await api(cookieSt, '/api/depenses', { method: 'POST', body: JSON.stringify({ libelle: 'Sans montant', date: `${MOIS}-03` }) });
    c('une dépense sans montant est refusée (400)', depKo.status === 400);
    const patch = await api(cookieSt, `/api/depenses/${dep.body?.depense?.id}`, { method: 'PATCH', body: JSON.stringify({ montant_ttc: 130 }) });
    c('PATCH → 130 €', patch.status === 200 && Number(patch.body?.depense?.montant_ttc) === 130);
    const liste = await api(cookieSt, '/api/depenses');
    c('GET /api/depenses liste les 2 dépenses (salle + prestation)', liste.status === 200 && (liste.body?.depenses || []).length === 2);
    await aller(pS, `${BASE}/compta`);
    await pS.waitForSelector('[data-testid="compta-liste-depenses"]', { timeout: 60000 });
    c('l\'écran Dépenses totalise 190 € (130 + 60) sur l\'exercice', (await pS.$eval('[data-testid="compta-total-depenses"]', e => e.textContent)).replace(/\s/g, '').includes('190'), await pS.$eval('[data-testid="compta-total-depenses"]', e => e.textContent));
    const csv = await api(cookieSt, `/api/export/compta-csv?exercice=${new Date().getFullYear()}`);
    const t = csv.body?.texte || '';
    c('l\'export d\'exercice porte recettes (135 €), dépenses (190 €) et résultat', csv.status === 200 && t.includes('TOTAL RECETTES;135,00') && t.includes('TOTAL DÉPENSES;190,00') && t.includes('RÉSULTAT;-55,00'), t.split('\n').filter(l => /TOTAL|RÉSULTAT/.test(l)).join(' | '));
    const suppr = await api(cookieSt, `/api/depenses/${dep.body?.depense?.id}`, { method: 'DELETE' });
    c('DELETE d\'une dépense simple → ok', suppr.status === 200);
    const supprP = await api(cookieSt, `/api/depenses/${depDb.id}`, { method: 'DELETE' });
    c('DELETE d\'une dépense de relevé → 409', supprP.status === 409);

    // Cloisonnement par la BASE, avec les jetons des deux côtés.
    const { session: sLea } = await sessionCookies(lea.email);
    const { session: sSt } = await sessionCookies(st.email);
    const jLea = clientJeton(sLea); const jSt = clientJeton(sSt);
    const { data: depLea } = await jLea.from('depenses').select('id').eq('profile_id', st.id);
    c('avec SON jeton, Léa lit 0 dépense de la structure (RLS)', (depLea || []).length === 0, `${(depLea || []).length}`);
    const { data: presLea } = await jLea.from('prestations').select('id, montant');
    c('… mais SA prestation (1 ligne)', (presLea || []).length === 1 && Number(presLea[0].montant) === 60);
    const { data: paieSt } = await jSt.from('paiements').select('id').eq('profile_id', lea.id);
    c('avec son jeton, la structure lit 0 paiement de Léa', (paieSt || []).length === 0);
    const { data: presExt } = await clientJeton((await sessionCookies(ext.email)).session).from('prestations').select('id');
    c('une étrangère lit 0 prestation', (presExt || []).length === 0);
    const ecritLea = await jLea.from('depenses').insert({ profile_id: st.id, libelle: 'Intrusion', date: j(0), montant_ttc: 1 });
    c('Léa ne peut pas écrire une dépense dans la structure (refus par la base)', !!ecritLea.error);

    console.log('\n══════ B5. Le relevé sur le lien permanent ══════');
    const lienR = await api(cookieSt, `/api/equipe/${membreId}/lien`, { method: 'POST' });
    const token = (lienR.body?.url || '').split('/intervenante/')[1];
    if (token) {
      const relLien = await api(null, `/api/intervenante/${token}/releve?mois=${MOIS}`);
      c('le lien sert le relevé VALIDÉ (60 €, figé)', relLien.status === 200 && relLien.body?.valide === true && relLien.body?.montant_valide === 60, `${relLien.status} ${JSON.stringify(relLien.body || {}).slice(0, 80)}`);
      c('… sans aucun nom d\'élève', !JSON.stringify(relLien.body || {}).includes('Anna'));
      const relPdf = await api(null, `/api/intervenante/${token}/releve?mois=${MOIS}&format=pdf`);
      c('… et son PDF', relPdf.status === 200 && relPdf.type.includes('pdf'));
      const ctxA = await browser.newContext({ viewport: { width: 420, height: 900 } });
      const pA = await ctxA.newPage();
      await aller(pA, `${BASE}/intervenante/${token}`);
      await pA.waitForSelector('[data-testid="intervenante-releve"]', { timeout: 60000 }).catch(() => {});
      c('l\'écran de l\'intervenante propose « Mon relevé de séances »', !!(await pA.$('[data-testid="intervenante-releve"] a[href*="/releve?mois="]')));
      await ctxA.close();
    } else {
      c('lien permanent créé', false, `${lienR.status} ${lienR.body?.code || ''}`);
    }
  } else if (V112 && !V103) {
    info('v112 présente mais v103 absente : la boucle a besoin des intervenantes par séance (appliquer v103).');
  }

  await ctxS.close(); await ctxL.close();
} finally {
  await browser.close();
  await purger();
}

console.log(`\n${ok} OK · ${ko} KO${V112 && V103 ? '' : ' (phase dégradée : relancer après v112)'}`);
process.exit(ko ? 1 : 0);
