/**
 * PREUVE — le portail élève en anglais, et l'accueil d'un compte sans fiche
 * (2026-09-22, Romain à Chessy : cinq élèves anglophones arrêtées à la
 * connexion sans jamais réserver).
 *
 * Vrai navigateur contre le dev server (:3333 par défaut, PROOF_BASE sinon),
 * démo Atelier Soleil, une élève témoin SANS fiche (compte seulement, comme
 * Hannah et Alfie), session prof démo pour le réglage. Auto-adaptatif v121.
 *
 *   A. Sans cookie : la page est en français, le sélecteur FR / EN est là,
 *      l'attribut lang du document dit « fr ».
 *   B. Cookie izi_lang=en : l'en-tête, le pied, la connexion parlent anglais,
 *      lang = « en », mobile 390 sans débordement.
 *   C. Le sélecteur : un clic sur EN pose le cookie et l'écran bascule ; un
 *      clic sur FR ramène le français.
 *   D. L'accueil d'un compte SANS fiche : les prochaines séances publiques du
 *      studio sont listées avec un bouton Réserver (dans les deux langues), et
 *      le premier bouton mène à la fiche d'une séance. Jamais une annulée.
 *   E. La route de réservation répond dans la langue de la visiteuse (un
 *      cours passé, refusé en anglais).
 *   F. Le réglage du studio : v121 appliquée → une visiteuse SANS cookie voit
 *      la page en anglais dès que le studio l'a réglé, puis le français revient
 *      quand on remet « fr » ; sans v121 → 503 honnête, rien d'écrit.
 *
 * Re-runnable, témoin purgé, réglage démo restauré, aucun email réel.
 */
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { traduire } from '../lib/i18n-portail.js';

const BASE = process.env.PROOF_BASE || 'http://localhost:3333';
const EMAIL_TEMOIN = 'temoin-portail-anglais@example.com';
const EN = (fr, vars) => traduire('en', fr, vars);

const env = Object.fromEntries(
  readFileSync(join(process.cwd(), '.env.local'), 'utf8')
    .split('\n').filter(l => l.includes('=') && !l.startsWith('#'))
    .map(l => [l.slice(0, l.indexOf('=')).trim(), l.slice(l.indexOf('=') + 1).trim()])
);
const PROJECT_REF = new URL(env.NEXT_PUBLIC_SUPABASE_URL).hostname.split('.')[0];
const svc = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

let ok = 0, ko = 0;
const c = (l, cond, d = '') => { if (cond) { ok++; console.log('  OK  ' + l + (d ? ' - ' + d : '')); } else { ko++; console.log('  KO  ' + l + (d ? ' - ' + d : '')); } };

const { data: demo } = await svc.from('profiles').select('id, studio_slug, studio_nom').eq('studio_slug', 'atelier-soleil').single();
if (!demo) { console.error('Démo introuvable'); process.exit(1); }
const SLUG = demo.studio_slug;

let V121 = true, langueAvant = 'fr';
{
  const { data, error } = await svc.from('profiles').select('langue_portail').eq('id', demo.id).maybeSingle();
  if (error && (['42703', 'PGRST204', 'PGRST205'].includes(error.code) || /langue_portail/.test(error.message || ''))) V121 = false;
  else langueAvant = data?.langue_portail === 'en' ? 'en' : 'fr';
}
console.log(`migration v121 : ${V121 ? 'APPLIQUEE (phase complète)' : 'ABSENTE (phase dégradée, relance après application)'}`);
const today = new Date().toLocaleDateString('sv-SE', { timeZone: 'Europe/Paris' });
const { data: coursPublics } = await svc.from('cours').select('id, nom, date, heure').eq('profile_id', demo.id).eq('est_annule', false).eq('visibilite', 'public').gte('date', today).order('date').order('heure').limit(8);
const { data: coursPasse } = await svc.from('cours').select('id, nom, date').eq('profile_id', demo.id).eq('est_annule', false).lt('date', today).order('date', { ascending: false }).limit(1).maybeSingle();
const { data: coursAnnules } = await svc.from('cours').select('id').eq('profile_id', demo.id).eq('est_annule', true).gte('date', today);
if (!coursPublics?.length) { console.error('Le démo n\'a aucune séance publique à venir : refresh-demo-atelier-soleil d\'abord.'); process.exit(1); }

let temoinId = null;
async function purger() {
  // Le témoin n'a JAMAIS de fiche : seulement un compte, comme les cinq de Romain.
  const { data: fiches } = await svc.from('clients').select('id').eq('profile_id', demo.id).ilike('email', EMAIL_TEMOIN);
  for (const f of fiches || []) await svc.from('clients').delete().eq('id', f.id);
  if (temoinId) { await svc.auth.admin.deleteUser(temoinId).catch(() => {}); temoinId = null; }
  else {
    const { data: lst } = await svc.auth.admin.listUsers({ page: 1, perPage: 200 }).catch(() => ({ data: null }));
    const u = lst?.users?.find(x => x.email === EMAIL_TEMOIN);
    if (u) await svc.auth.admin.deleteUser(u.id).catch(() => {});
  }
  if (V121) await svc.from('profiles').update({ langue_portail: langueAvant }).eq('id', demo.id);
}
await purger();
{
  const { data: cree, error } = await svc.auth.admin.createUser({ email: EMAIL_TEMOIN, email_confirm: true, user_metadata: { role: 'eleve' } });
  if (error) { console.error('compte témoin KO:', error.message); process.exit(1); }
  temoinId = cree.user.id;
}
if (V121) await svc.from('profiles').update({ langue_portail: 'fr' }).eq('id', demo.id);

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
const cookieLangue = (l) => ({ name: 'izi_lang', value: l, url: BASE, sameSite: 'Lax' });
const attendre = async (fn, ms = 60000) => { const fin = Date.now() + ms; let v; while (Date.now() < fin) { v = await fn().catch(() => null); if (v) return v; await new Promise(r => setTimeout(r, 400)); } return null; };

let chromium; try { ({ chromium } = await import('playwright')); } catch { ({ chromium } = await import('@playwright/test')); }
let browser; try { browser = await chromium.launch({ channel: 'msedge' }); } catch { browser = await chromium.launch(); }
const erreurs = [];

try {
  // ── A. Sans cookie ─────────────────────────────────────────────────────────
  console.log('\n— A. Anonyme, sans cookie : le français, et le sélecteur —');
  const ctxA = await browser.newContext({ viewport: { width: 1100, height: 900 } });
  const pa = await ctxA.newPage();
  pa.on('pageerror', e => erreurs.push('A: ' + String(e).slice(0, 160)));
  await pa.goto(`${BASE}/p/${SLUG}`, { waitUntil: 'domcontentloaded', timeout: 120000 });
  await pa.waitForSelector('.portail-header', { timeout: 90000 });
  const enteteA = await pa.innerText('.portail-header');
  c('l\'en-tête dit « Mon espace »', enteteA.includes('Mon espace'), enteteA.replace(/\s+/g, ' '));
  c('le sélecteur FR / EN est rendu', (await pa.locator('[data-testid="portail-langue"] button').count()) === 2);
  c('lang du document = fr', (await attendre(() => pa.evaluate(() => document.documentElement.lang === 'fr' ? 'fr' : null), 15000)) === 'fr');
  c('le pied dit « Propulsé par »', (await pa.innerText('.portail-footer')).includes('Propulsé par'));

  // ── B. Cookie en ────────────────────────────────────────────────────────────
  console.log('\n— B. Cookie izi_lang=en : l\'anglais partout où on passe —');
  const ctxB = await browser.newContext({ viewport: { width: 390, height: 844 } });
  await ctxB.addCookies([cookieLangue('en')]);
  const pb = await ctxB.newPage();
  pb.on('pageerror', e => erreurs.push('B: ' + String(e).slice(0, 160)));
  await pb.goto(`${BASE}/p/${SLUG}`, { waitUntil: 'domcontentloaded', timeout: 120000 });
  await pb.waitForSelector('.portail-header', { timeout: 90000 });
  const enteteB = await pb.innerText('.portail-header');
  c('l\'en-tête dit « ' + EN('Mon espace') + ' »', enteteB.includes(EN('Mon espace')) && !enteteB.includes('Mon espace'), enteteB.replace(/\s+/g, ' '));
  c('lang du document = en', (await attendre(() => pb.evaluate(() => document.documentElement.lang === 'en' ? 'en' : null), 15000)) === 'en');
  c('le pied dit « ' + EN('Propulsé par') + ' »', (await pb.innerText('.portail-footer')).includes(EN('Propulsé par')));
  c('mobile 390 : aucun débordement horizontal', (await pb.evaluate(() => document.documentElement.scrollWidth)) <= 390);
  const corpsHome = await pb.innerText('body');
  c('la home ne dit plus « Réserver ma place » ni « Cours à venir » en français', !/Réserver ma place|Cours à venir|Voir le planning/.test(corpsHome));
  await pb.goto(`${BASE}/p/${SLUG}/connexion`, { waitUntil: 'domcontentloaded', timeout: 120000 });
  await pb.waitForSelector('.portail-card', { timeout: 90000 });
  const corpsCx = await pb.innerText('body');
  c('la page de connexion est en anglais (« ' + EN('Recevoir mon lien de connexion') + ' »)', corpsCx.includes(EN('Recevoir mon lien de connexion')) && !corpsCx.includes('Recevoir mon lien de connexion'));
  c('son titre aussi (« ' + EN('Mon espace élève') + ' »)', corpsCx.includes(EN('Mon espace élève')));
  await pb.goto(`${BASE}/p/${SLUG}/cours/${coursPublics[0].id}`, { waitUntil: 'domcontentloaded', timeout: 120000 });
  await pb.waitForSelector('.portail-card', { timeout: 90000 });
  const corpsCours = await pb.innerText('body');
  c('la fiche d\'une séance ne parle plus français (ni « Réserver ma place » ni « Retour aux cours »)', !/Réserver ma place|Retour aux cours|places restantes/.test(corpsCours));
  c('elle dit « ' + EN('Retour aux cours') + ' »', corpsCours.includes(EN('Retour aux cours')));

  // ── C. Le sélecteur ────────────────────────────────────────────────────────
  console.log('\n— C. Le sélecteur FR / EN pose le cookie et bascule l\'écran —');
  await pa.click('[data-testid="portail-langue"] button[lang="en"]');
  const basculeEn = await attendre(() => pa.innerText('.portail-header').then(t => (t.includes(EN('Mon espace')) ? t : null)), 60000);
  c('clic EN → l\'en-tête passe en anglais', !!basculeEn);
  const cookiesA = await ctxA.cookies(BASE);
  c('le cookie izi_lang=en est posé', cookiesA.some(k => k.name === 'izi_lang' && k.value === 'en'));
  await pa.click('[data-testid="portail-langue"] button[lang="fr"]');
  const basculeFr = await attendre(() => pa.innerText('.portail-header').then(t => (t.includes('Mon espace') && !t.includes(EN('Mon espace')) ? t : null)), 60000);
  c('clic FR → le français revient', !!basculeFr);

  // ── D. L'accueil d'un compte SANS fiche ────────────────────────────────────
  console.log('\n— D. Un compte connecté SANS fiche : les séances à réserver, pas un lien —');
  const ctxD = await browser.newContext({ viewport: { width: 420, height: 1000 } });
  await ctxD.addCookies((await sessionCookies(EMAIL_TEMOIN)).map(cc => ({ ...cc, url: BASE, sameSite: 'Lax' })));
  const pd = await ctxD.newPage();
  pd.on('pageerror', e => erreurs.push('D: ' + String(e).slice(0, 160)));
  await pd.goto(`${BASE}/p/${SLUG}/espace`, { waitUntil: 'domcontentloaded', timeout: 120000 });
  await pd.waitForSelector('[data-testid="accueil-seances"]', { timeout: 90000 });
  const corpsD = await pd.innerText('body');
  c('l\'écran dit « Il te reste une étape »', corpsD.includes('Il te reste une étape'));
  const nbBoutons = await pd.locator('[data-testid="accueil-reserver"]').count();
  c(`autant de boutons Réserver que de séances publiques à venir (${coursPublics.length})`, nbBoutons === coursPublics.length, `rendus : ${nbBoutons}`);
  c('la première séance listée est la prochaine séance publique', corpsD.includes(coursPublics[0].nom));
  const hrefs = await pd.locator('[data-testid="accueil-reserver"]').evaluateAll(els => els.map(e => e.getAttribute('href')));
  c('aucun bouton ne mène à une séance annulée', !hrefs.some(h => (coursAnnules || []).some(a => h.includes(a.id))));
  await Promise.all([pd.waitForURL(u => u.pathname.includes(`/cours/${coursPublics[0].id}`), { timeout: 60000 }), pd.locator('[data-testid="accueil-reserver"]').first().click()]);
  c('le premier bouton ouvre la fiche de cette séance', pd.url().includes(`/cours/${coursPublics[0].id}`));
  await ctxD.addCookies([cookieLangue('en')]);
  await pd.goto(`${BASE}/p/${SLUG}/espace`, { waitUntil: 'domcontentloaded', timeout: 120000 });
  await pd.waitForSelector('[data-testid="accueil-seances"]', { timeout: 90000 });
  const corpsDen = await pd.innerText('body');
  c('le même écran en anglais (« ' + EN('Réserver') + ' », « ' + EN("Il te reste une étape : choisis une séance et réserve ta place.") + ' »)', corpsDen.includes(EN("Il te reste une étape : choisis une séance et réserve ta place.")) && !corpsDen.includes('Il te reste une étape'));
  c('jamais de fiche créée par cet écran', (await svc.from('clients').select('id').eq('profile_id', demo.id).ilike('email', EMAIL_TEMOIN)).data?.length === 0);

  // ── E. La route de réservation parle la langue de la visiteuse ─────────────
  console.log('\n— E. La route de réservation répond dans la langue du cookie —');
  if (coursPasse) {
    const post = (langue) => fetch(`${BASE}/api/portail/${SLUG}/reserver`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', cookie: `izi_lang=${langue}` },
      body: JSON.stringify({ coursId: coursPasse.id, prenom: 'Témoin', nom: 'Anglais', email: EMAIL_TEMOIN, website: '' }),
    }).then(async r => ({ status: r.status, json: await r.json().catch(() => ({})) }));
    const fr = await post('fr');
    const en = await post('en');
    c('cours passé refusé (400) en français', fr.status === 400 && /commencé/.test(fr.json.error || ''), `${fr.status} ${fr.json.error}`);
    c('le même refus en anglais, dans une autre langue que le français', en.status === 400 && en.json.error && en.json.error !== fr.json.error && !/commencé/.test(en.json.error), `${en.status} ${en.json.error}`);
  } else {
    console.log('  (pas de séance passée sur le démo : E ignorée)');
  }

  // ── F. Le réglage du studio ────────────────────────────────────────────────
  console.log('\n— F. Le réglage du studio (Paramètres → Ce que ta page montre) —');
  // Piège consigné (§12) : en dev, la PREMIÈRE compilation d'une route
  // recharge la page en cours (Fast Refresh) et avale le toast ET l'état de
  // la carte repliée. On préchauffe la route avant d'ouvrir l'écran.
  await fetch(`${BASE}/api/profile/langue-portail`).catch(() => {});
  const ctxP = await browser.newContext({ viewport: { width: 1280, height: 1000 } });
  await ctxP.addCookies((await sessionCookies('camille@atelier-soleil.fr')).map(cc => ({ ...cc, url: BASE, sameSite: 'Lax' })));
  const pp = await ctxP.newPage();
  pp.on('pageerror', e => erreurs.push('P: ' + String(e).slice(0, 160)));
  await pp.goto(`${BASE}/parametres/page`, { waitUntil: 'domcontentloaded', timeout: 120000 });
  await pp.waitForSelector('[data-carte-reglage="page_affichage"] .carte-reglage-entete', { timeout: 90000 });
  await pp.click('[data-carte-reglage="page_affichage"] .carte-reglage-entete');
  await pp.waitForSelector('[data-testid="langue-portail-en"]', { timeout: 90000 });
  c('les deux boutons Français / English sont rendus', (await pp.locator('[data-testid="langue-portail-fr"]').count()) === 1 && (await pp.locator('[data-testid="langue-portail-en"]').count()) === 1);
  c('« Français » est le choix courant', (await pp.getAttribute('[data-testid="langue-portail-fr"]', 'aria-pressed')) === 'true');
  const [rep] = await Promise.all([
    pp.waitForResponse(r => r.url().includes('/api/profile/langue-portail') && r.request().method() === 'PATCH', { timeout: 45000 }),
    pp.click('[data-testid="langue-portail-en"]'),
  ]);
  if (V121) {
    c('PATCH 200', rep.status() === 200, String(rep.status()));
    const enBase = await attendre(() => svc.from('profiles').select('langue_portail').eq('id', demo.id).single().then(r => (r.data?.langue_portail === 'en' ? 'en' : null)), 20000);
    c('langue_portail = en EN BASE', enBase === 'en');
    c('« English » devient le choix courant', (await attendre(() => pp.getAttribute('[data-testid="langue-portail-en"]', 'aria-pressed').then(v => (v === 'true' ? v : null)), 20000)) === 'true');
    // Une visiteuse SANS cookie voit l'anglais.
    const ctxF = await browser.newContext({ viewport: { width: 1100, height: 900 } });
    const pf = await ctxF.newPage();
    await pf.goto(`${BASE}/p/${SLUG}`, { waitUntil: 'domcontentloaded', timeout: 120000 });
    await pf.waitForSelector('.portail-header', { timeout: 90000 });
    c('une visiteuse SANS cookie voit la page en anglais', (await pf.innerText('.portail-header')).includes(EN('Mon espace')));
    // Son cookie FR prime sur le réglage.
    await ctxF.addCookies([cookieLangue('fr')]);
    await pf.reload({ waitUntil: 'domcontentloaded' });
    await pf.waitForSelector('.portail-header', { timeout: 90000 });
    c('son cookie FR prime sur le réglage du studio', (await pf.innerText('.portail-header')).includes('Mon espace'));
    await ctxF.close();
    await pp.click('[data-testid="langue-portail-fr"]');
    const retour = await attendre(() => svc.from('profiles').select('langue_portail').eq('id', demo.id).single().then(r => (r.data?.langue_portail === 'fr' ? 'fr' : null)), 20000);
    c('retour à fr EN BASE', retour === 'fr');
  } else {
    c('sans v121 : 503 honnête', rep.status() === 503, String(rep.status()));
    const corpsP = await attendre(() => pp.innerText('body').then(t => (/pas encore actif/.test(t) ? t : null)), 20000);
    c('le toast dit que la mise à jour n\'est pas encore appliquée', !!corpsP);
    c('« Français » reste le choix courant', (await pp.getAttribute('[data-testid="langue-portail-fr"]', 'aria-pressed')) === 'true');
  }
  await ctxP.close();
  await ctxA.close(); await ctxB.close(); await ctxD.close();
} catch (e) {
  ko++;
  console.log('  KO  la preuve a cassé : ' + String(e).split('\n')[0]);
} finally {
  await browser.close();
  await purger();
}

c('aucune erreur de page', erreurs.length === 0, erreurs.join(' | '));
console.log(`\n${ok} OK · ${ko} KO`);
process.exit(ko ? 1 : 0);
