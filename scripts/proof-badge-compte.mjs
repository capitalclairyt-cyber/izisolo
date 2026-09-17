/**
 * PREUVE — l'état de compte d'une élève parle de CE studio (v120, 2026-09-17).
 *
 * Le 17/09, jour de l'import d'Atout Gym : quatre adhérentes sur quarante-trois
 * s'affichaient « Compte actif · dernière connexion le 26 juil. » alors
 * qu'AUCUNE des 43 fiches n'avait jamais ouvert l'espace de l'association.
 * Elles sont aussi élèves chez Maude Yoga : la pastille racontait à un studio
 * ce que ces personnes font chez un autre, et la présidente en concluait
 * qu'elle n'avait personne à inviter.
 *
 * Ce script reproduit exactement cette situation avec deux studios jetables et
 * une même élève des deux côtés, puis vérifie EN BASE et À L'ÉCRAN que :
 *   - une visite chez B ne pose RIEN sur la fiche de A ;
 *   - chez A, elle s'affiche « Jamais connecté·e ici » et non « Connecté·e » ;
 *   - aucune date venue de l'autre studio n'apparaît nulle part ;
 *   - dès qu'elle ouvre l'espace de A, A l'affiche « Connecté·e », avec SA date ;
 *   - une seconde visite dans l'heure ne réécrit pas la date (throttle base).
 *
 * Auto-adaptatif : sans v120, tout tient debout, il manque seulement la date.
 * Re-runnable : les témoins sont purgés à l'entrée ET à la sortie, même en cas
 * d'échec. Aucun email n'est envoyé (adresses @example.com, RFC 2606).
 *
 * Usage : node scripts/proof-badge-compte.mjs
 * Prérequis : un serveur sur PROOF_BASE (défaut :3333).
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
const attendre = async (fn, ms = 20000, pas = 400) => {
  const fin = Date.now() + ms;
  for (;;) { const r = await fn(); if (r) return r; if (Date.now() > fin) return null; await new Promise(r2 => setTimeout(r2, pas)); }
};
const TS = Date.now().toString(36);
// La première compilation d'une route recharge la page en cours (Fast Refresh)
// et fait avorter la navigation : on rejoue une fois (piège consigné §12).
const aller = async (page, url) => {
  try { await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 120000 }); }
  catch (e) {
    if (!/ERR_ABORTED/.test(String(e))) throw e;
    await new Promise(r => setTimeout(r, 1500));
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 120000 });
  }
};

const PREFIXE = 'preuve-badge-';
const A = { email: `${PREFIXE}studio-a-${TS}@example.com`, slug: `${PREFIXE}a-${TS}`, nom: 'Preuve Studio A' };
const B = { email: `${PREFIXE}studio-b-${TS}@example.com`, slug: `${PREFIXE}b-${TS}`, nom: 'Preuve Studio B' };
// L'élève du cas réel : une seule personne, une fiche dans chaque studio.
const DEUX = { email: `${PREFIXE}eleve-deux-${TS}@example.com`, prenom: 'Deuxstudios', nom: 'Preuve' };
// Les deux témoins de contrôle, chez A seulement.
const INVITEE = { email: `${PREFIXE}eleve-invitee-${TS}@example.com`, prenom: 'Invitee', nom: 'Preuve' };
const INCONNUE = { email: `${PREFIXE}eleve-inconnue-${TS}@example.com`, prenom: 'Inconnue', nom: 'Preuve' };

async function purger() {
  const { data: lst } = await svc.auth.admin.listUsers({ page: 1, perPage: 500 }).catch(() => ({ data: null }));
  for (const u of (lst?.users || []).filter(x => (x.email || '').startsWith(PREFIXE))) {
    const { data: fiches } = await svc.from('clients').select('id').ilike('email', u.email);
    for (const f of fiches || []) await svc.from('clients').delete().eq('id', f.id);
    await svc.auth.admin.deleteUser(u.id).catch(() => {});
  }
  const { data: profs } = await svc.from('profiles').select('id').ilike('studio_slug', `${PREFIXE}%`);
  for (const p of profs || []) {
    await svc.from('presences').delete().eq('profile_id', p.id);
    await svc.from('cours').delete().eq('profile_id', p.id);
    await svc.from('clients').delete().eq('profile_id', p.id);
  }
}
await purger();

// ── Sonde v120 ──────────────────────────────────────────────────────────────
// On lit une VRAIE ligne : un select(head) sur une colonne inconnue peut
// répondre sans erreur (leçon v109).
const { error: eCol } = await svc.from('clients').select('derniere_visite_at').limit(1);
const V120 = !eCol;
console.log(`\n════ Preuve badge de compte — v120 ${V120 ? 'APPLIQUÉE (phase complète)' : 'ABSENTE (phase dégradée)'} ════`);

const sessionCookies = async (email) => {
  const { data: linkData } = await svc.auth.admin.generateLink({ type: 'magiclink', email });
  const anon = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: otp } = await anon.auth.verifyOtp({ type: 'magiclink', token_hash: linkData.properties.hashed_token });
  const value = 'base64-' + Buffer.from(JSON.stringify(otp.session)).toString('base64url');
  const nm = `sb-${PROJECT_REF}-auth-token`;
  const cookies = [];
  if (value.length <= 3180) cookies.push({ name: nm, value });
  else for (let i = 0; i * 3180 < value.length; i++) cookies.push({ name: `${nm}.${i}`, value: value.slice(i * 3180, (i + 1) * 3180) });
  return cookies.map(x => ({ ...x, url: BASE, sameSite: 'Lax' }));
};

// ── Les deux studios jetables ───────────────────────────────────────────────
for (const s of [A, B]) {
  const { data: cree, error } = await svc.auth.admin.createUser({ email: s.email, email_confirm: true, password: `Preuve-${TS}!`, user_metadata: { prenom: 'Preuve' } });
  if (error) { console.error('createUser:', error.message); await purger(); process.exit(1); }
  s.id = cree.user.id;
  const profil = await attendre(async () => { const { data } = await svc.from('profiles').select('id').eq('id', s.id).maybeSingle(); return data || null; }, 15000);
  if (!profil) { console.error('profil non créé'); await purger(); process.exit(1); }
  await svc.from('profiles').update({
    studio_nom: s.nom, studio_slug: s.slug, portail_actif: true,
    // Plan payant posé à la main = plan offert = compte ouvert, jamais gelé.
    plan: 'pro', stripe_subscription_status: 'active', trial_started_at: new Date(Date.now() - 90 * 86400000).toISOString(),
  }).eq('id', s.id);
}

// ── L'élève qui existe des DEUX côtés, avec un compte ───────────────────────
{
  const { data: u, error } = await svc.auth.admin.createUser({ email: DEUX.email, email_confirm: true, user_metadata: { role: 'eleve' } });
  if (error) { console.error('createUser élève:', error.message); await purger(); process.exit(1); }
  DEUX.userId = u.user.id;
  for (const s of [A, B]) {
    const { data: f } = await svc.from('clients')
      .insert({ profile_id: s.id, prenom: DEUX.prenom, nom: DEUX.nom, email: DEUX.email, statut: 'actif' })
      .select('id').single();
    s.ficheDeux = f?.id;
  }
}
// Invitée chez A (jamais venue, pas de compte) et parfaite inconnue chez A.
{
  const { data: f1 } = await svc.from('clients').insert({
    profile_id: A.id, prenom: INVITEE.prenom, nom: INVITEE.nom, email: INVITEE.email,
    statut: 'actif', invitation_envoyee_at: new Date(Date.now() - 2 * 86400000).toISOString(),
  }).select('id').single();
  INVITEE.ficheId = f1?.id;
  const { data: f2 } = await svc.from('clients').insert({
    profile_id: A.id, prenom: INCONNUE.prenom, nom: INCONNUE.nom, email: INCONNUE.email, statut: 'actif',
  }).select('id').single();
  INCONNUE.ficheId = f2?.id;
}

const lireFiche = async (id) => {
  const cols = V120 ? 'id, auth_user_id, derniere_visite_at' : 'id, auth_user_id';
  const { data } = await svc.from('clients').select(cols).eq('id', id).maybeSingle();
  return data || {};
};
// L'état affiché pour une fiche, lu sur la pastille de la liste des élèves.
const etatAffiche = async (page, ficheId) => {
  const el = await page.$(`[data-testid="compte-pastille"][data-fiche="${ficheId}"]`);
  return el ? await el.getAttribute('data-etat') : null;
};

let chromium; try { ({ chromium } = await import('playwright')); } catch { ({ chromium } = await import('@playwright/test')); }
let browser; try { browser = await chromium.launch(); } catch { browser = await chromium.launch({ channel: 'msedge' }); }

try {
  for (let i = 0; i < 60; i++) { try { const r = await fetch(`${BASE}/login`); if (r.ok) break; } catch { /* pas prêt */ } await new Promise(r => setTimeout(r, 2000)); }
  // Préchauffage : la première compilation d'une route avale la navigation.
  for (const u of [`/p/${A.slug}/espace`, `/p/${B.slug}/espace`, '/clients']) {
    await fetch(`${BASE}${u}`).catch(() => {});
  }

  // ══ A. Au départ, personne n'est venue nulle part ════════════════════════
  console.log('\nA. Le point de départ');
  {
    const fa = await lireFiche(A.ficheDeux), fb = await lireFiche(B.ficheDeux);
    c('la fiche chez A n\'est liée à aucun compte', !fa.auth_user_id);
    c('la fiche chez B non plus', !fb.auth_user_id);
    if (V120) c('aucune des deux ne porte de date de visite', !fa.derniere_visite_at && !fb.derniere_visite_at);
    const { data: u } = await svc.auth.admin.getUserById(DEUX.userId);
    c('et pourtant son compte IziSolo existe déjà', !!u?.user?.email, u?.user?.email);
  }

  // ══ B. Elle ouvre l'espace du studio B, et de lui SEUL ═══════════════════
  console.log('\nB. Sa visite chez B ne touche pas la fiche de A');
  const ctxEleve = await browser.newContext({ viewport: { width: 390, height: 844 } });
  await ctxEleve.addCookies(await sessionCookies(DEUX.email));
  const pEleve = await ctxEleve.newPage();
  {
    await aller(pEleve, `${BASE}/p/${B.slug}/espace`);
    // Repère TOUJOURS présent dans l'espace, contrairement à « Mes paiements »
    // qui n'apparaît qu'avec un paiement (piège de preuve consigné, v117).
    const vu = await attendre(async () => (await pEleve.content()).includes('Cours à venir') || (await pEleve.content()).includes('à venir'), 25000);
    c('son espace chez B se rend', !!vu);
    const fb = await attendre(async () => { const f = await lireFiche(B.ficheDeux); return f.auth_user_id ? f : null; }, 15000);
    c('EN BASE : sa fiche chez B est maintenant liée à son compte', !!fb?.auth_user_id);
    if (V120) c('EN BASE : sa fiche chez B porte sa date de visite', !!fb?.derniere_visite_at, fb?.derniere_visite_at);
    const fa = await lireFiche(A.ficheDeux);
    c('EN BASE : sa fiche chez A n\'a TOUJOURS aucun lien de compte', !fa.auth_user_id);
    if (V120) c('EN BASE : sa fiche chez A n\'a TOUJOURS aucune date de visite', !fa.derniere_visite_at);
  }

  // ══ C. Côté prof A : « jamais connectée ici », et aucune date d'ailleurs ══
  console.log('\nC. Ce que le studio A affiche');
  const ctxProfA = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  await ctxProfA.addCookies(await sessionCookies(A.email));
  const pA = await ctxProfA.newPage();
  {
    await aller(pA, `${BASE}/clients`);
    const rendu = await attendre(async () => (await pA.content()).includes(DEUX.prenom), 30000);
    c('la liste des élèves du studio A se rend', !!rendu);
    c('elle y est, avec l\'état « a un compte, jamais venue ici »', await etatAffiche(pA, A.ficheDeux) === 'compte');
    c('l\'invitée sans compte est distinguée', await etatAffiche(pA, INVITEE.ficheId) === 'invite');
    c('la parfaite inconnue aussi', await etatAffiche(pA, INCONNUE.ficheId) === 'aucun');

    const texte = await pA.evaluate((id) => {
      const el = document.querySelector(`[data-testid="compte-pastille"][data-fiche="${id}"]`);
      return el ? `${el.innerText} || ${el.getAttribute('title') || ''}` : '';
    }, A.ficheDeux);
    c('sa pastille dit « Jamais connecté·e ici »', /jamais connect/i.test(texte), texte.split(' || ')[0]);
    c('et invite la prof à l\'inviter quand même', /invite-la/i.test(texte));

    const page = await pA.content();
    c('nulle part la page ne dit « dernière connexion »', !/dernière connexion/i.test(page));
    c('le studio B n\'est nommé nulle part chez A', !page.includes(B.nom) && !page.includes(B.slug));

    // La fiche détaillée dit la même chose, avec la phrase entière.
    await aller(pA, `${BASE}/clients/${A.ficheDeux}`);
    const etatFiche = await attendre(async () => {
      const el = await pA.$('[data-testid="compte-etat"]');
      return el ? await el.getAttribute('data-etat') : null;
    }, 25000);
    c('sa fiche affiche le même état', etatFiche === 'compte', String(etatFiche));
    const tFiche = await pA.evaluate(() => document.querySelector('[data-testid="compte-etat"]')?.innerText || '');
    c('la fiche explique qu\'elle n\'a jamais ouvert CET espace', /jamais ouvert ton espace/i.test(tFiche), tFiche);
    c('la fiche ne montre aucune date de connexion', !/dernière connexion/i.test(await pA.content()));
  }

  // ══ D. Elle ouvre enfin l'espace de A ════════════════════════════════════
  console.log('\nD. Le jour où elle vient vraiment chez A');
  {
    await aller(pEleve, `${BASE}/p/${A.slug}/espace`);
    await attendre(async () => (await pEleve.content()).includes('à venir'), 25000);
    const fa = await attendre(async () => { const f = await lireFiche(A.ficheDeux); return f.auth_user_id ? f : null; }, 15000);
    c('EN BASE : sa fiche chez A est liée à son tour', !!fa?.auth_user_id);
    if (V120) c('EN BASE : et elle porte sa date de visite', !!fa?.derniere_visite_at, fa?.derniere_visite_at);
    A.visite1 = fa?.derniere_visite_at || null;

    await aller(pA, `${BASE}/clients`);
    await attendre(async () => (await pA.content()).includes(DEUX.prenom), 30000);
    c('le studio A l\'affiche maintenant « connectée »', await etatAffiche(pA, A.ficheDeux) === 'venue');
    const texte = await pA.evaluate((id) => document.querySelector(`[data-testid="compte-pastille"][data-fiche="${id}"]`)?.innerText || '', A.ficheDeux);
    c('la pastille dit « Connecté·e »', /connect/i.test(texte), texte);
    if (V120) c('avec la date de SA visite, aujourd\'hui', /aujourd/i.test(texte), texte);
    c('les deux autres témoins n\'ont pas bougé',
      await etatAffiche(pA, INVITEE.ficheId) === 'invite' && await etatAffiche(pA, INCONNUE.ficheId) === 'aucun');
  }

  // ══ E. Le throttle : une visite par heure suffit ═════════════════════════
  if (V120) {
    console.log('\nE. Une seconde visite dans l\'heure n\'écrit rien');
    await aller(pEleve, `${BASE}/p/${A.slug}/espace`);
    await attendre(async () => (await pEleve.content()).includes('à venir'), 25000);
    await new Promise(r => setTimeout(r, 1500));
    const fa = await lireFiche(A.ficheDeux);
    c('la date de visite est restée la même', fa.derniere_visite_at === A.visite1, `${A.visite1} → ${fa.derniere_visite_at}`);
  }

  // ══ F. Le sweep studioId n'a rien cassé pour une prof seule ══════════════
  console.log('\nF. Non-régression : la liste montre bien les élèves DU studio');
  {
    const html = await pA.content();
    c('les trois élèves de A sont là', html.includes(DEUX.prenom) && html.includes(INVITEE.prenom) && html.includes(INCONNUE.prenom));
    const ctxProfB = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    await ctxProfB.addCookies(await sessionCookies(B.email));
    const pB = await ctxProfB.newPage();
    await aller(pB, `${BASE}/clients`);
    await attendre(async () => (await pB.content()).includes(DEUX.prenom), 30000);
    const htmlB = await pB.content();
    c('le studio B voit SA fiche d\'elle et pas les témoins de A',
      htmlB.includes(DEUX.prenom) && !htmlB.includes(INVITEE.prenom) && !htmlB.includes(INCONNUE.prenom));
    c('et chez B, elle est bien « connectée » (c\'est là qu\'elle est allée en premier)',
      await etatAffiche(pB, B.ficheDeux) === 'venue');
    await ctxProfB.close();
  }
} catch (e) {
  ko++; console.log('  KO  exception : ' + (e?.message || e));
} finally {
  await browser.close().catch(() => {});
  await purger();
  console.log(`\n════ ${ok} OK / ${ko} KO ════`);
  console.log(V120 ? '(phase complète)' : '(phase dégradée : appliquer migrations-v120-visite-eleve.sql puis relancer)');
  process.exit(ko ? 1 : 0);
}
