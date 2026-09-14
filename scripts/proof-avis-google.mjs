/**
 * PREUVE — Demander un avis Google (v117, 2026-09-14, demande Maude).
 *
 * Vrai navigateur (dev :3333), session prof démo + session élève témoin,
 * AUTO-ADAPTATIVE : sonde v117 et déroule la phase complète si la colonne
 * existe, la phase dégradée sinon (503 honnête, rien d'affiché, rien envoyé).
 *
 *   A. Paramètres → Ma page publique → carte « Mes avis Google » : un lien
 *      qui n'est pas de Google est refusé À L'ÉCRAN (bouton désactivé, raison
 *      écrite) ET par la route (400 LIEN_INVALIDE, rien écrit) ; un lien Google
 *      s'enregistre EN BASE (v117) ou répond 503 MIGRATION_V117_REQUISE.
 *   B. Le QR code (Intégrer sur mon site) : 4e modèle « Avis Google » dont
 *      l'URL est le lien Google ; sans lien, l'indication qui dit où le poser.
 *   C. L'espace élève : bloc « Un mot sur … ? » avec le bouton vers le lien
 *      (href exact), et la question de mini-aide ; sans lien, rien.
 *   D. Messagerie → Annoncer : le gabarit remplit le message avec le lien.
 *   E. Le cron notifs-eleves (restreint au démo par ?profil=) : l'élève à 3
 *      présences « présente » sur des séances passées reçoit l'email (une
 *      ligne notifications_eleves type avis_google, arrêtée par le garde-fou
 *      de domaine de test : le témoin est en @example.com), celle à 2 non,
 *      celle dont la 3e séance est ANNULÉE non ; rejouer n'ajoute rien ;
 *      interrupteur éteint → rien.
 *
 * Re-runnable, témoins purgés même en cas d'échec, réglage démo restauré,
 * aucun email réel (témoins RFC 2606).
 */
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const BASE = process.env.PROOF_BASE || 'http://localhost:3333';
const MARQUEUR = 'Témoin avis Google';
const LIEN = 'https://g.page/r/CaBcDeFgTemoinAvis/review';
const LIEN_FAUX = 'https://facebook.com/monstudio/reviews';
const TEMOINS = {
  trois:   { email: 'temoin-avis-3@example.com',       prenom: 'Trois',   dates: 3, annule: false },
  deux:    { email: 'temoin-avis-2@example.com',       prenom: 'Deux',    dates: 2, annule: false },
  annulee: { email: 'temoin-avis-annulee@example.com', prenom: 'Annulée', dates: 3, annule: true },
};

const env = Object.fromEntries(
  readFileSync(join(process.cwd(), '.env.local'), 'utf8')
    .split('\n').filter(l => l.includes('=') && !l.startsWith('#'))
    .map(l => [l.slice(0, l.indexOf('=')).trim(), l.slice(l.indexOf('=') + 1).trim()])
);
const PROJECT_REF = new URL(env.NEXT_PUBLIC_SUPABASE_URL).hostname.split('.')[0];
const svc = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

let ok = 0, ko = 0;
const c = (l, cond, d = '') => { if (cond) { ok++; console.log('  OK  ' + l + (d ? ' - ' + d : '')); } else { ko++; console.log('  KO  ' + l + (d ? ' - ' + d : '')); } };
const attendre = async (fn, { essais = 20, pause = 300 } = {}) => { for (let i = 0; i < essais; i++) { const v = await fn(); if (v) return v; await new Promise(r => setTimeout(r, pause)); } return null; };
const clicJusquA = async (page, sel, temoin, essais = 8) => {
  for (let i = 0; i < essais; i++) {
    try { await page.click(sel, { timeout: 4000 }); } catch { /* pas encore hydraté */ }
    if (await page.locator(temoin).first().isVisible().catch(() => false)) return true;
    await page.waitForTimeout(500);
  }
  return false;
};
const jourMoins = (n) => new Date(Date.now() - n * 86400000).toISOString().slice(0, 10);

const { data: demo } = await svc.from('profiles').select('id, studio_slug, studio_nom').eq('studio_slug', 'atelier-soleil').single();
if (!demo) { console.error('Démo introuvable'); process.exit(1); }

let V117 = true, avisAvant = null;
{
  const { data, error } = await svc.from('profiles').select('avis_google').eq('id', demo.id).maybeSingle();
  if (error && (['42703', 'PGRST204', 'PGRST205'].includes(error.code) || /avis_google/.test(error.message || ''))) V117 = false;
  else avisAvant = data?.avis_google ?? null;
}
console.log(`migration v117 : ${V117 ? 'APPLIQUEE (phase complète)' : 'ABSENTE (phase dégradée — relance après application)'}`);

const fiches = {};
const userIds = {};
async function purger() {
  const emails = Object.values(TEMOINS).map(t => t.email);
  const { data: fs } = await svc.from('clients').select('id, email').eq('profile_id', demo.id).in('email', emails);
  for (const f of fs || []) {
    await svc.from('notifications_eleves').delete().eq('client_id', f.id);
    await svc.from('presences').delete().eq('client_id', f.id);
    await svc.from('clients').delete().eq('id', f.id);
  }
  const { data: cs } = await svc.from('cours').select('id').eq('profile_id', demo.id).like('nom', `${MARQUEUR}%`);
  for (const co of cs || []) {
    await svc.from('presences').delete().eq('cours_id', co.id);
    await svc.from('cours').delete().eq('id', co.id);
  }
  for (const email of emails) {
    const uid = userIds[email];
    if (uid) { await svc.auth.admin.deleteUser(uid).catch(() => {}); continue; }
    const { data: lst } = await svc.auth.admin.listUsers({ page: 1, perPage: 200 }).catch(() => ({ data: null }));
    const u = lst?.users?.find(x => x.email === email);
    if (u) await svc.auth.admin.deleteUser(u.id).catch(() => {});
  }
  if (V117) await svc.from('profiles').update({ avis_google: avisAvant }).eq('id', demo.id);
}
await purger();

// ── Témoins : trois fiches, des séances PASSÉES, des présences « présente » ──
{
  for (const [cle, t] of Object.entries(TEMOINS)) {
    const { data: f, error } = await svc.from('clients').insert({ profile_id: demo.id, prenom: t.prenom, nom: 'Avis', email: t.email, statut: 'actif' }).select('id').single();
    if (error) { console.error('fiche témoin KO:', error.message); await purger(); process.exit(1); }
    fiches[cle] = f;
    const seances = [];
    for (let i = 0; i < t.dates; i++) {
      // la DERNIÈRE séance est annulée pour le témoin « annulée » : elle ne compte pas
      const annule = t.annule && i === t.dates - 1;
      seances.push({ profile_id: demo.id, nom: `${MARQUEUR} ${t.prenom} ${i + 1}`, date: jourMoins(1 + i * 7), heure: '07:00', duree_minutes: 60, type_cours: 'Hatha', capacite_max: 20, visibilite: 'public', est_annule: annule });
    }
    const { data: cs, error: eC } = await svc.from('cours').insert(seances).select('id');
    if (eC) { console.error('cours témoin KO:', eC.message); await purger(); process.exit(1); }
    const { error: eP } = await svc.from('presences').insert((cs || []).map(co => ({ profile_id: demo.id, cours_id: co.id, client_id: f.id, statut_pointage: 'present' })));
    if (eP) { console.error('présences témoin KO:', eP.message); await purger(); process.exit(1); }
  }
  const { data: cree, error: eU } = await svc.auth.admin.createUser({ email: TEMOINS.trois.email, email_confirm: true, user_metadata: { role: 'eleve' } });
  if (eU) { console.error('compte élève KO:', eU.message); await purger(); process.exit(1); }
  userIds[TEMOINS.trois.email] = cree.user.id;
  if (V117) await svc.from('profiles').update({ avis_google: null }).eq('id', demo.id);
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
  return cookies;
};

let chromium; try { ({ chromium } = await import('playwright')); } catch { ({ chromium } = await import('@playwright/test')); }
let browser; try { browser = await chromium.launch({ channel: 'msedge' }); } catch { browser = await chromium.launch(); }

const lireAvisBase = async () => { const { data } = await svc.from('profiles').select('avis_google').eq('id', demo.id).maybeSingle(); return data?.avis_google ?? null; };
const nbNotifs = async (cle) => { const { count } = await svc.from('notifications_eleves').select('id', { count: 'exact', head: true }).eq('client_id', fiches[cle].id).eq('type', 'avis_google'); return count || 0; };

try {
  const ctxProf = await browser.newContext({ viewport: { width: 1280, height: 1000 } });
  await ctxProf.addCookies((await sessionCookies('camille@atelier-soleil.fr')).map(cc => ({ ...cc, url: BASE, sameSite: 'Lax' })));
  const page = await ctxProf.newPage();
  const erreurs = [];
  page.on('pageerror', e => erreurs.push(String(e).slice(0, 160)));

  const ctxEleve = await browser.newContext({ viewport: { width: 420, height: 1000 } });
  await ctxEleve.addCookies((await sessionCookies(TEMOINS.trois.email)).map(cc => ({ ...cc, url: BASE, sameSite: 'Lax' })));
  const pe = await ctxEleve.newPage();
  pe.on('pageerror', e => erreurs.push('eleve: ' + String(e).slice(0, 160)));

  // Préchauffe (Fast Refresh de la première compilation avale un clic, §12).
  await page.goto(`${BASE}/parametres/page`, { waitUntil: 'domcontentloaded', timeout: 180000 });
  await page.waitForSelector('[data-carte-reglage="avis"]', { timeout: 120000 });

  // ── A. La carte « Mes avis Google » ────────────────────────────────────
  console.log('\n— A. Paramètres → Ma page publique → « Mes avis Google » —');
  const texteCarte = await page.innerText('[data-carte-reglage="avis"]');
  c('la carte est rendue, repliée, avec son état', texteCarte.includes('Mes avis Google') && texteCarte.includes('Aucun lien pour l\'instant'), texteCarte.replace(/\s+/g, ' ').slice(0, 80));
  c('la carte s\'ouvre et montre le champ du lien', await clicJusquA(page, '[data-carte-reglage="avis"] .carte-reglage-entete', '[data-testid="avis-lien"]'));
  await page.fill('[data-testid="avis-lien"]', LIEN_FAUX);
  await page.waitForTimeout(200);
  const hintFaux = await page.innerText('[data-testid="avis-lien-hint"]');
  c('un lien qui n\'est pas de Google : raison écrite à l\'écran', /ne ressemble pas/.test(hintFaux), hintFaux.slice(0, 70));
  c('… et le bouton Enregistrer est désactivé', await page.locator('[data-testid="avis-enregistrer"]').isDisabled());
  const repFaux = await page.request.patch(`${BASE}/api/profile/avis-google`, { data: { lien: LIEN_FAUX } });
  const corpsFaux = await repFaux.json().catch(() => ({}));
  c('la route refuse aussi (400 LIEN_INVALIDE)', repFaux.status() === 400 && corpsFaux.code === 'LIEN_INVALIDE', `status ${repFaux.status()}`);
  if (V117) c('… et rien n\'est écrit en base', (await lireAvisBase()) === null);

  await page.fill('[data-testid="avis-lien"]', LIEN);
  await page.waitForTimeout(200);
  c('un lien Google : le bouton s\'active', await page.locator('[data-testid="avis-enregistrer"]').isEnabled());
  const [repSave] = await Promise.all([
    page.waitForResponse(r => r.url().includes('/api/profile/avis-google') && r.request().method() === 'PATCH', { timeout: 60000 }),
    page.click('[data-testid="avis-enregistrer"]'),
  ]);
  const corpsSave = await repSave.json().catch(() => ({}));
  if (V117) {
    c('Enregistrer → 200 avec le réglage relu', repSave.status() === 200 && corpsSave.avis_google?.lien === LIEN && corpsSave.avis_google?.auto === true, `status ${repSave.status()}`);
    const enBase = await attendre(async () => { const v = await lireAvisBase(); return v?.lien === LIEN ? v : null; });
    c('le lien est EN BASE (auto = true)', !!enBase && enBase.auto === true, JSON.stringify(enBase));
    await page.reload({ waitUntil: 'domcontentloaded', timeout: 120000 });
    await page.waitForSelector('[data-carte-reglage="avis"]', { timeout: 120000 });
    const resume = await page.innerText('[data-carte-reglage="avis"]');
    c('rechargé, la carte repliée dit « lien posé · email après la 3e séance »', resume.includes('lien posé') && resume.includes('email après la 3e séance'), resume.replace(/\s+/g, ' ').slice(0, 90));
  } else {
    c('sans v117 : Enregistrer → 503 MIGRATION_V117_REQUISE, honnête', repSave.status() === 503 && corpsSave.code === 'MIGRATION_V117_REQUISE', `status ${repSave.status()} · ${corpsSave.error || ''}`);
  }

  // ── B. Le QR code ──────────────────────────────────────────────────────
  console.log('\n— B. Le QR code : le 4e modèle « Avis Google » —');
  await page.goto(`${BASE}/parametres/integrer`, { waitUntil: 'domcontentloaded', timeout: 120000 });
  await page.waitForSelector('[data-carte-reglage="qr"]', { timeout: 120000 });
  await clicJusquA(page, '[data-carte-reglage="qr"] .carte-reglage-entete', 'text=Ouvrir mon QR code');
  c('la modale QR s\'ouvre', await clicJusquA(page, 'text=Ouvrir mon QR code', '.qrm-card'));
  const presets = await page.locator('.qrm-preset').allInnerTexts();
  if (V117) {
    c('4 modèles, dont « Avis Google »', presets.length === 4 && presets.some(t => t.includes('Avis Google')), presets.map(t => t.split('\n')[0]).join(' · '));
    await page.click('.qrm-preset:has-text("Avis Google")');
    const urlQr = await attendre(async () => { const u = await page.innerText('.qrm-url'); return u.includes('g.page') ? u : null; });
    c('l\'URL du QR est le lien Google, pas le portail', !!urlQr && urlQr.includes('g.page/r/CaBcDeFgTemoinAvis/review'), urlQr || '');
    c('l\'indication « à coller près de la sortie » est là', await page.locator('[data-testid="qrm-hint-avis"]').isVisible());
    const altImg = await page.getAttribute('.qrm-preview img', 'alt');
    c('l\'image QR rendue vise bien le lien Google', !!altImg && altImg.includes(LIEN), altImg || '');
  } else {
    c('sans lien : 3 modèles et l\'indication qui dit où poser le lien', presets.length === 3 && await page.locator('[data-testid="qrm-hint-sans-avis"]').isVisible());
  }
  await page.click('.qrm-close');

  // ── C. L'espace élève ──────────────────────────────────────────────────
  console.log('\n— C. L\'espace élève : « Un mot sur … ? » —');
  await pe.goto(`${BASE}/p/${demo.studio_slug}/espace`, { waitUntil: 'domcontentloaded', timeout: 120000 });
  // « Cours à venir » est toujours rendu ; « Mes paiements » ne l'est qu'avec
  // un paiement (le témoin n'en a pas : c'est ce qui a fait tomber le 1er run).
  await pe.waitForSelector('text=Cours à venir', { timeout: 120000 });
  await pe.waitForSelector('text=Une question ?', { timeout: 60000 });
  const corpsEspace = await pe.innerText('body');
  if (V117) {
    c('le bloc « Un mot sur L\'Atelier Soleil ? » est rendu', corpsEspace.includes('Un mot sur') && await pe.locator('[data-testid="espace-avis"]').isVisible());
    const href = await pe.getAttribute('[data-testid="espace-avis-lien"]', 'href');
    c('le bouton « Laisser un avis Google » pointe sur le lien exact', href === LIEN, href || '');
    c('… en nouvel onglet, sans referrer', (await pe.getAttribute('[data-testid="espace-avis-lien"]', 'target')) === '_blank' && /noopener/.test(await pe.getAttribute('[data-testid="espace-avis-lien"]', 'rel') || ''));
    c('la mini-aide propose « Comment laisser un avis sur le studio ? »', corpsEspace.includes('Comment laisser un avis sur le studio'));
    c('aucune contrepartie promise à l\'écran', !/offert|gratuit|cadeau|réduction/i.test(await pe.innerText('[data-testid="espace-avis"]')));
  } else {
    c('sans v117 : aucun bloc d\'avis, aucune question de mini-aide', !corpsEspace.includes('Un mot sur') && !corpsEspace.includes('Comment laisser un avis sur le studio'));
  }

  // ── D. Messagerie → Annoncer : le gabarit ──────────────────────────────
  console.log('\n— D. Messagerie → Annoncer : le gabarit « demander un avis » —');
  await page.goto(`${BASE}/messagerie?tab=annoncer`, { waitUntil: 'domcontentloaded', timeout: 120000 });
  await page.waitForSelector('.msg-announce textarea', { timeout: 120000 });
  if (V117) {
    c('le bouton du gabarit est rendu', await page.locator('[data-testid="ann-gabarit-avis"]').isVisible());
    await clicJusquA(page, '[data-testid="ann-gabarit-avis"]', `.msg-announce textarea:has-text("g.page")`, 6);
    const contenu = await page.inputValue('.msg-announce textarea');
    c('le gabarit remplit le message avec le lien et le nom du studio', contenu.includes(LIEN) && contenu.includes(demo.studio_nom), contenu.slice(0, 60).replace(/\n/g, ' '));
    c('le conseil « une vague par cours » est écrit', (await page.innerText('.msg-announce')).includes('Une vague par cours'));
  } else {
    c('sans lien : aucun gabarit', !(await page.locator('[data-testid="ann-gabarit-avis"]').isVisible().catch(() => false)));
  }

  // ── E. Le cron : l'email après la 3e présence ──────────────────────────
  console.log('\n— E. Cron notifs-eleves (restreint au démo) : l\'email d\'avis —');
  const cron = async () => page.request.get(`${BASE}/api/cron/notifs-eleves?profil=${demo.id}`, { headers: { authorization: `Bearer ${env.CRON_SECRET}` }, timeout: 180000 });
  const r1 = await cron();
  const j1 = await r1.json().catch(() => ({}));
  c('le cron répond 200', r1.status() === 200 && j1.ok === true, `status ${r1.status()} · avis_envoyes=${j1.avis_envoyes}`);
  if (V117) {
    const n3 = await attendre(async () => (await nbNotifs('trois')) === 1 ? 1 : null);
    c('l\'élève à 3 présences a UNE ligne notifications_eleves type avis_google', n3 === 1);
    const { data: ligne } = await svc.from('notifications_eleves').select('statut, error_message, sujet, related_id').eq('client_id', fiches.trois.id).eq('type', 'avis_google').maybeSingle();
    c('… le sujet est celui de l\'email, related_id = le studio (dédup à vie)', !!ligne && /Un mot sur tes séances/.test(ligne.sujet || '') && ligne.related_id === demo.id, JSON.stringify(ligne));
    c('… arrêtée par le garde-fou de domaine de test (aucun email réel ne part d\'une preuve)', ligne?.statut === 'failed' && ligne?.error_message === 'domaine_test', `${ligne?.statut} · ${ligne?.error_message}`);
    c('l\'élève à 2 présences n\'a rien reçu', (await nbNotifs('deux')) === 0);
    c('l\'élève dont la 3e séance est ANNULÉE n\'a rien reçu', (await nbNotifs('annulee')) === 0);
    const r2 = await cron();
    await r2.json().catch(() => ({}));
    c('rejouer n\'ajoute aucune ligne (toujours 1)', (await nbNotifs('trois')) === 1);

    // Interrupteur éteint : plus rien ne part.
    await svc.from('notifications_eleves').delete().eq('client_id', fiches.trois.id);
    const repOff = await page.request.patch(`${BASE}/api/profile/avis-google`, { data: { lien: LIEN, auto: false } });
    c('éteindre l\'email automatique (auto=false) → 200', repOff.status() === 200);
    const r3 = await cron();
    await r3.json().catch(() => ({}));
    c('interrupteur éteint : l\'élève à 3 présences ne reçoit rien', (await nbNotifs('trois')) === 0);
    const repRetire = await page.request.patch(`${BASE}/api/profile/avis-google`, { data: { lien: null } });
    c('retirer le lien → 200, réglage à null', repRetire.status() === 200 && (await lireAvisBase()) === null);
  } else {
    c('sans v117 : aucune ligne avis_google chez personne', (await nbNotifs('trois')) === 0 && (await nbNotifs('deux')) === 0);
  }
  c('aucune erreur de page (prof et élève)', erreurs.length === 0, erreurs.join(' | '));
} finally {
  await browser.close().catch(() => {});
  await purger();
  console.log('\nTémoins purgés et réglage démo restauré.');
}

console.log(`\nRésultat : ${ok} OK / ${ko} KO`);
process.exit(ko === 0 ? 0 : 1);
