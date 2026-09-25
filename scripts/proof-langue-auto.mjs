/**
 * PREUVE — la langue du navigateur en repli, réglage « Automatique » (v123)
 * (2026-09-23, suite Romain : ses élèves anglophones lisaient le français
 * pendant quatre jours faute d'avoir trouvé la pastille EN).
 *
 * Vrai navigateur contre le dev server (:3333 par défaut, PROOF_BASE sinon),
 * démo Atelier Soleil, visiteuses anonymes à navigateur en-GB / fr-FR / de-DE,
 * trois fiches témoins (compte + session), session prof démo pour le réglage.
 * Auto-adaptatif v123 (sondé par un UPDATE « auto » relu, puis restauré).
 *
 *   A. Le studio a CHOISI « fr » : un navigateur anglais lit le français
 *      (dans les deux phases : sans v123 tout le monde est « fr », rien ne change).
 *   B. Paramètres → Ce que ta page montre : trois boutons, « Automatique »
 *      cliqué → 503 MIGRATION_V123_REQUISE sans v123 / 200 et « auto » EN BASE avec.
 *   C. (v123) Studio « auto » : navigateur en-GB → anglais, fr-FR → français,
 *      de-DE → français (repli), en-GB + cookie FR → français (le cookie prime).
 *   D. (v123) Une élève connue visite avec un navigateur anglais : sa fiche
 *      sans langue prend « en » ; une fiche déjà « fr » ne bouge pas ; et
 *      quand le studio a CHOISI « fr », une fiche vide reste vide.
 *   E. La route de réservation : un refus (cours passé) sort dans la langue
 *      du navigateur quand le studio est en « auto », en français s'il a choisi.
 *
 * Re-runnable, témoins purgés, réglage démo restauré, quota de l'IP locale
 * libéré, aucun email réel (adresses @example.com).
 */
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { traduire, langueEleve } from '../lib/i18n-portail.js';

const BASE = process.env.PROOF_BASE || 'http://localhost:3333';
const EN = (fr, vars) => traduire('en', fr, vars);
const EMAILS = { vide: 'temoin-langue-auto-a@example.com', fr: 'temoin-langue-auto-b@example.com', choisi: 'temoin-langue-auto-c@example.com', anon: 'temoin-langue-auto-d@example.com', devinee: 'temoin-langue-auto-e@example.com' };

const env = Object.fromEntries(
  readFileSync(join(process.cwd(), '.env.local'), 'utf8')
    .split('\n').filter(l => l.includes('=') && !l.startsWith('#'))
    .map(l => [l.slice(0, l.indexOf('=')).trim(), l.slice(l.indexOf('=') + 1).trim()])
);
const PROJECT_REF = new URL(env.NEXT_PUBLIC_SUPABASE_URL).hostname.split('.')[0];
const svc = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

let ok = 0, ko = 0;
const c = (l, cond, d = '') => { if (cond) { ok++; console.log('  OK  ' + l + (d ? ' - ' + d : '')); } else { ko++; console.log('  KO  ' + l + (d ? ' - ' + d : '')); } };
const attendre = async (fn, ms = 30000) => { const fin = Date.now() + ms; let v; while (Date.now() < fin) { v = await fn().catch(() => null); if (v) return v; await new Promise(r => setTimeout(r, 300)); } return null; };

const { data: demo } = await svc.from('profiles').select('id, studio_slug, studio_nom, langue_portail').eq('studio_slug', 'atelier-soleil').single();
if (!demo) { console.error('Démo introuvable'); process.exit(1); }
const SLUG = demo.studio_slug;
const langueAvant = demo.langue_portail || 'fr'; // valeur BRUTE, restaurée à la fin
const poserStudio = async (v) => { const { error } = await svc.from('profiles').update({ langue_portail: v }).eq('id', demo.id); return error; };
// Sonde v123 : « auto » accepté par le CHECK ?
const erreurAuto = await poserStudio('auto');
const V123 = !erreurAuto;
console.log(`migration v123 : ${V123 ? 'APPLIQUEE (phase complète)' : 'ABSENTE (phase dégradée, relance après application)'}` + (erreurAuto ? ` [${erreurAuto.code}]` : ''));
// v124 : la provenance d'une langue mémorisée (choisie par le bouton, ou devinée du navigateur).
const V124 = !(await svc.from('clients').select('langue_deduite').limit(1)).error;
console.log(`migration v124 : ${V124 ? 'APPLIQUEE (la provenance est prouvée)' : 'ABSENTE (une langue devinée compte comme choisie, comme avant ; relance après application)'}`);
await poserStudio('fr');

const today = new Date().toLocaleDateString('sv-SE', { timeZone: 'Europe/Paris' });
const { data: coursPasse } = await svc.from('cours').select('id').eq('profile_id', demo.id).eq('est_annule', false).lt('date', today).order('date', { ascending: false }).limit(1).maybeSingle();

// Quota de la route de réservation (scope default) pour l'IP locale seulement.
for (const ip of ['null', '::1', '127.0.0.1', '::ffff:127.0.0.1']) {
  const empreinte = createHash('sha256').update(ip + (env.IP_HASH_SALT || 'izisolo')).digest('hex').slice(0, 32);
  await svc.from('rate_limits').delete().eq('cle', `default:${empreinte}`).then(() => {}, () => {});
}

const comptes = [];
async function purger() {
  for (const email of Object.values(EMAILS)) {
    const { data: fiches } = await svc.from('clients').select('id').eq('profile_id', demo.id).ilike('email', email);
    for (const f of fiches || []) await svc.from('clients').delete().eq('id', f.id);
  }
  const { data: lst } = await svc.auth.admin.listUsers({ page: 1, perPage: 1000 }).catch(() => ({ data: null }));
  for (const u of lst?.users || []) if (Object.values(EMAILS).includes(u.email)) await svc.auth.admin.deleteUser(u.id).catch(() => {});
  await poserStudio(langueAvant);
}
await purger();
await poserStudio('fr');

async function creerFiche(email, langue) {
  const { data: f, error } = await svc.from('clients').insert({ profile_id: demo.id, prenom: 'Témoin', nom: 'Auto', email, statut: 'actif', ...(langue ? { langue } : {}) }).select('id').single();
  if (error) { console.error('fiche KO:', error.message); await purger(); process.exit(1); }
  const { data: cree, error: eU } = await svc.auth.admin.createUser({ email, email_confirm: true, user_metadata: { role: 'eleve' } });
  if (eU) { console.error('compte KO:', eU.message); await purger(); process.exit(1); }
  comptes.push(cree.user.id);
  return f.id;
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
  return cookies.map(cc => ({ ...cc, url: BASE, sameSite: 'Lax' }));
};
const langueFiche = async (id) => (await svc.from('clients').select('langue').eq('id', id).single()).data?.langue ?? null;
const ficheEntiere = async (id) => (await svc.from('clients').select(V124 ? 'langue, langue_deduite' : 'langue').eq('id', id).single()).data || null;

await fetch(`${BASE}/p/${SLUG}`).catch(() => {});
await fetch(`${BASE}/api/profile/langue-portail`).catch(() => {});

let chromium; try { ({ chromium } = await import('playwright')); } catch { ({ chromium } = await import('@playwright/test')); }
let browser; try { browser = await chromium.launch({ channel: 'msedge' }); } catch { browser = await chromium.launch(); }
const erreurs = [];
const ctxNav = (acceptLanguage, extra = {}) => browser.newContext({ viewport: { width: 1100, height: 900 }, extraHTTPHeaders: { 'Accept-Language': acceptLanguage }, ...extra });
const piedDe = async (ctx) => {
  const p = await ctx.newPage();
  p.on('pageerror', e => erreurs.push(String(e).slice(0, 160)));
  await p.goto(`${BASE}/p/${SLUG}`, { waitUntil: 'domcontentloaded', timeout: 120000 });
  await p.waitForSelector('.portail-footer', { timeout: 90000 });
  const pied = await p.innerText('.portail-footer');
  await p.close();
  return pied.includes('Powered by') ? 'en' : pied.includes('Propulsé par') ? 'fr' : '?';
};

try {
  // ── A. Le studio a choisi « fr » ────────────────────────────────────────
  console.log('\n— A. Le studio a CHOISI le français : un navigateur anglais lit le français —');
  const ctxA = await ctxNav('en-GB,en;q=0.9');
  c('studio « fr » + navigateur en-GB → français', (await piedDe(ctxA)) === 'fr');
  await ctxA.close();

  // ── B. Paramètres : trois boutons, « Automatique » ──────────────────────
  console.log('\n— B. Paramètres → Ce que ta page montre : « Automatique » —');
  const ctxP = await browser.newContext({ viewport: { width: 1280, height: 1000 } });
  await ctxP.addCookies(await sessionCookies('camille@atelier-soleil.fr'));
  // Préchauffe : sur un serveur de dev FROID, la première compilation de
  // /parametres/page recharge l'écran en plein clic (Fast Refresh, §12) et
  // referme la carte : la réponse du PATCH devenait illisible et le bouton
  // « Automatique » introuvable (2 KO fantômes le 2026-09-25). On ouvre donc
  // l'écran une fois pour rien avant de mesurer.
  { const p0 = await ctxP.newPage(); await p0.goto(`${BASE}/parametres/page`, { waitUntil: 'domcontentloaded', timeout: 120000 }); await p0.waitForSelector('[data-carte-reglage="page_affichage"] .carte-reglage-entete', { timeout: 90000 }).catch(() => {}); await p0.close(); }
  const pp = await ctxP.newPage();
  pp.on('pageerror', e => erreurs.push('P: ' + String(e).slice(0, 160)));
  await pp.goto(`${BASE}/parametres/page`, { waitUntil: 'domcontentloaded', timeout: 120000 });
  await pp.waitForSelector('[data-carte-reglage="page_affichage"] .carte-reglage-entete', { timeout: 90000 });
  await pp.click('[data-carte-reglage="page_affichage"] .carte-reglage-entete');
  await pp.waitForSelector('[data-testid="langue-portail-auto"]', { timeout: 90000 });
  c('trois boutons Automatique / Français / English', (await pp.locator('[data-testid^="langue-portail-"]').count()) === 3);
  c('« Français » est le choix courant (posé pour la preuve)', (await pp.getAttribute('[data-testid="langue-portail-fr"]', 'aria-pressed')) === 'true');
  const [rep] = await Promise.all([
    pp.waitForResponse(r => r.url().includes('/api/profile/langue-portail') && r.request().method() === 'PATCH', { timeout: 45000 }),
    pp.click('[data-testid="langue-portail-auto"]'),
  ]);
  const repJson = await rep.json().catch(() => ({}));
  if (!V123) {
    c('sans v123 : 503 MIGRATION_V123_REQUISE, honnête', rep.status() === 503 && repJson.code === 'MIGRATION_V123_REQUISE', `${rep.status()} ${repJson.code}`);
    c('rien n\'a bougé en base (toujours fr)', (await svc.from('profiles').select('langue_portail').eq('id', demo.id).single()).data?.langue_portail === 'fr');
    c('« Français » reste le choix courant', (await pp.getAttribute('[data-testid="langue-portail-fr"]', 'aria-pressed')) === 'true');
  } else {
    c('PATCH 200', rep.status() === 200 && repJson.langue === 'auto', `${rep.status()} ${repJson.langue}`);
    const enBase = await attendre(() => svc.from('profiles').select('langue_portail').eq('id', demo.id).single().then(r => (r.data?.langue_portail === 'auto' ? 'auto' : null)), 20000);
    c('langue_portail = auto EN BASE', enBase === 'auto');
    c('« Automatique » devient le choix courant', (await attendre(() => pp.getAttribute('[data-testid="langue-portail-auto"]', 'aria-pressed').then(v => (v === 'true' ? v : null)), 20000)) === 'true');
  }
  await ctxP.close();

  if (V123) {
    // ── C. Studio auto : le navigateur décide, le cookie prime ────────────
    console.log('\n— C. Studio « auto » : navigateur en-GB → anglais, fr-FR → français, de-DE → français, cookie FR prime —');
    await poserStudio('auto');
    const cEn = await ctxNav('en-GB,en;q=0.9'); c('navigateur en-GB → anglais', (await piedDe(cEn)) === 'en'); await cEn.close();
    const cFr = await ctxNav('fr-FR,fr;q=0.9,en;q=0.8'); c('navigateur fr-FR → français', (await piedDe(cFr)) === 'fr'); await cFr.close();
    const cDe = await ctxNav('de-DE,de;q=0.9'); c('navigateur de-DE → français (repli)', (await piedDe(cDe)) === 'fr'); await cDe.close();
    const cEs = await ctxNav('es-ES,es;q=0.9,en;q=0.7'); c('navigateur es puis en → anglais (la première langue du portail)', (await piedDe(cEs)) === 'en'); await cEs.close();
    const cCk = await ctxNav('en-GB,en;q=0.9'); await cCk.addCookies([{ name: 'izi_lang', value: 'fr', url: BASE, sameSite: 'Lax' }]);
    c('navigateur en-GB + cookie FR → français (le cookie prime)', (await piedDe(cCk)) === 'fr'); await cCk.close();
    // L'attribut lang suit aussi.
    const cL = await ctxNav('en-GB,en;q=0.9'); const pl = await cL.newPage();
    await pl.goto(`${BASE}/p/${SLUG}`, { waitUntil: 'domcontentloaded', timeout: 120000 });
    await pl.waitForSelector('.portail-footer', { timeout: 90000 });
    c('lang du document = en', (await attendre(() => pl.evaluate(() => document.documentElement.lang === 'en' ? 'en' : null), 15000)) === 'en');
    await cL.close();

    // ── D. La fiche d'une élève connue apprend la langue du navigateur ────
    console.log('\n— D. La fiche d\'une élève connue : vide → « en » par le navigateur ; « fr » ne bouge pas ; studio qui a choisi → rien —');
    const idVide = await creerFiche(EMAILS.vide, null);
    const idFr = await creerFiche(EMAILS.fr, 'fr');
    const idChoisi = await creerFiche(EMAILS.choisi, null);
    const visite = async (email, acceptLanguage) => {
      const ctx = await ctxNav(acceptLanguage);
      await ctx.addCookies(await sessionCookies(email));
      const p = await ctx.newPage();
      p.on('pageerror', e => erreurs.push('D: ' + String(e).slice(0, 160)));
      await p.goto(`${BASE}/p/${SLUG}`, { waitUntil: 'domcontentloaded', timeout: 120000 });
      await p.waitForSelector('.portail-footer', { timeout: 90000 });
      const pied = await p.innerText('.portail-footer');
      await ctx.close();
      return pied.includes('Powered by') ? 'en' : 'fr';
    };
    c('élève sans langue, navigateur en-GB : l\'écran est en anglais', (await visite(EMAILS.vide, 'en-GB,en;q=0.9')) === 'en');
    c('et sa fiche prend « en » EN BASE', (await attendre(() => langueFiche(idVide).then(v => (v === 'en' ? v : null)), 20000)) === 'en');
    if (V124) {
      // ── D bis. La provenance (v124) : devinée ≠ choisie ─────────────────
      console.log('\n— D bis. v124 : une langue devinée porte son drapeau, suit le navigateur, et s\'efface derrière le choix du studio ; une langue choisie reste —');
      c('« en » est marquée DEVINÉE (langue_deduite = true)', (await ficheEntiere(idVide))?.langue_deduite === true);
      c('pour un email, studio auto → anglais (la langue devinée sert)', langueEleve({ client: await ficheEntiere(idVide), studio: { langue_portail: 'auto' } }) === 'en');
      c('pour un email, studio qui a CHOISI « fr » → français (le choix du studio efface la langue devinée)', langueEleve({ client: await ficheEntiere(idVide), studio: { langue_portail: 'fr' } }) === 'fr');
      c('son téléphone repasse en français : la fiche devinée suit (« fr », toujours devinée)', await (async () => { await visite(EMAILS.vide, 'fr-FR,fr;q=0.9'); const f = await attendre(() => ficheEntiere(idVide).then(v => (v?.langue === 'fr' ? v : null)), 20000); return f?.langue === 'fr' && f?.langue_deduite === true; })());
      // Le bouton EN (cookie) : un CHOIX, qui remplace la langue devinée et retire le drapeau.
      const ctxC = await ctxNav('fr-FR,fr;q=0.9');
      await ctxC.addCookies([...(await sessionCookies(EMAILS.vide)), { name: 'izi_lang', value: 'en', url: BASE, sameSite: 'Lax' }]);
      const pc = await ctxC.newPage();
      await pc.goto(`${BASE}/p/${SLUG}`, { waitUntil: 'domcontentloaded', timeout: 120000 });
      await pc.waitForSelector('.portail-footer', { timeout: 90000 });
      await ctxC.close();
      const choisie = await attendre(() => ficheEntiere(idVide).then(v => (v?.langue === 'en' && v?.langue_deduite === false ? v : null)), 20000);
      c('le bouton EN (cookie) pose « en » CHOISIE (langue_deduite = false)', !!choisie);
      c('pour un email, studio qui a choisi « fr » → anglais quand même (le choix de l\'élève prime)', langueEleve({ client: choisie, studio: { langue_portail: 'fr' } }) === 'en');
      c('et un navigateur français ne la fait plus bouger (une langue choisie ne se devine plus)', await (async () => { await visite(EMAILS.vide, 'fr-FR,fr;q=0.9'); await new Promise(r => setTimeout(r, 1500)); const f = await ficheEntiere(idVide); return f?.langue === 'en' && f?.langue_deduite === false; })());
    }
    c('élève dont la fiche dit « fr », navigateur en-GB : l\'écran suit le navigateur (anglais)', (await visite(EMAILS.fr, 'en-GB,en;q=0.9')) === 'en');
    await new Promise(r => setTimeout(r, 1500));
    c('mais sa fiche reste « fr » (le navigateur ne remplace jamais un choix)', (await langueFiche(idFr)) === 'fr');
    await poserStudio('fr');
    c('studio qui a CHOISI « fr », navigateur en-GB : l\'écran est en français', (await visite(EMAILS.choisi, 'en-GB,en;q=0.9')) === 'fr');
    await new Promise(r => setTimeout(r, 1500));
    c('et la fiche vide reste vide (rien n\'est déduit du navigateur)', (await langueFiche(idChoisi)) === null);
    await poserStudio('auto');
  }

  // ── E. La route de réservation parle la langue du navigateur ───────────
  // ⚠️ Le quota anti-abus de la route (5/h) vit AUSSI en mémoire du serveur :
  // deux runs dans l'heure sans redémarrer le dev server répondent 429 ici,
  // et ce n'est pas le produit (la clé en base est libérée au démarrage).
  console.log('\n— E. La route de réservation : refus dans la langue du navigateur si « auto », en français si le studio a choisi —');
  if (coursPasse) {
    const post = (acceptLanguage, cookie) => fetch(`${BASE}/api/portail/${SLUG}/reserver`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept-Language': acceptLanguage, ...(cookie ? { cookie: `izi_lang=${cookie}` } : {}) },
      body: JSON.stringify({ coursId: coursPasse.id, prenom: 'Témoin', nom: 'Auto', email: EMAILS.anon, website: '' }),
    }).then(async r => ({ status: r.status, json: await r.json().catch(() => ({})) }));
    if (V123) {
      await poserStudio('auto');
      const en = await post('en-GB,en;q=0.9');
      c('studio auto + navigateur anglais → refus en anglais', en.status === 400 && /already started/i.test(en.json.error || ''), `${en.status} ${en.json.error}`);
      const fr = await post('fr-FR,fr;q=0.9');
      c('studio auto + navigateur français → refus en français', fr.status === 400 && /commencé/.test(fr.json.error || ''), `${fr.status} ${fr.json.error}`);
      const ck = await post('en-GB,en;q=0.9', 'fr');
      c('navigateur anglais + cookie FR → français', ck.status === 400 && /commencé/.test(ck.json.error || ''), `${ck.status} ${ck.json.error}`);
    }
    await poserStudio('fr');
    const frChoisi = await post('en-GB,en;q=0.9');
    c('studio qui a choisi « fr » + navigateur anglais → français', frChoisi.status === 400 && /commencé/.test(frChoisi.json.error || ''), `${frChoisi.status} ${frChoisi.json.error}`);
  } else {
    console.log('  (pas de séance passée sur le démo : E ignorée)');
  }
  c('aucune erreur de page', erreurs.length === 0, erreurs.join(' | '));
} catch (e) {
  ko++;
  console.log('  KO  exception : ' + (e?.stack || e));
} finally {
  await browser.close().catch(() => {});
  await purger();
  console.log(`\nRÉSULTAT : ${ok} OK / ${ko} KO` + (ko === 0 ? ' — preuve verte, témoins purgés, réglage démo restauré.' : ''));
  process.exit(ko === 0 ? 0 : 1);
}
