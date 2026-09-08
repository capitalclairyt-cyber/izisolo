/**
 * Visuels du RÉEL (reel/, Remotion) — tout mobile, captures RÉELLES du démo
 * « L'Atelier Soleil » contre la prod, écrites dans reel/public/ avec un
 * manifest.json de dimensions. Même discipline que shoot-landing-visuels :
 * elles se REFONT quand l'UI d'un écran montré change, puis on re-rend le réel.
 *
 *   dashboard.jpg    l'accueil, burger visible (le menu se déplie dans le réel)
 *   menu.jpg         le même écran, menu ouvert
 *   agenda.jpg       l'agenda mobile (la page où le doigt arrive)
 *   pointage.jpg     le pointage d'une séance passée, déjà pointée par le seed
 *   portail.jpg      la page publique côté élève, du haut jusqu'au premier jour
 *                    de planning (le réel la fait défiler dans le téléphone)
 *   revenus.jpg      Revenus sur 3 derniers mois, mobile
 *   messagerie.jpg   le canal « Yoga Pleine Lune »
 *   vente-moyens.jpg      le tunnel de vente, « Plusieurs moyens » (espèces + CB)
 *   vente-echeancier.jpg  le même, « En plusieurs fois » (3 versements arrondis)
 *   offre.jpg        le formulaire Nouvelle offre rempli (jamais créée), pleine page
 *   cours.jpg        le formulaire Nouveau cours rempli en série (jamais créé), pleine page
 *
 * Prérequis : refresh du démo + node scripts/habiller-demo-portail.mjs.
 * Usage : node scripts/shoot-reel-visuels.mjs
 */
import { createClient } from '@supabase/supabase-js';
import sharp from 'sharp';
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = process.cwd();
const env = Object.fromEntries(
  readFileSync(join(ROOT, '.env.local'), 'utf8')
    .split('\n').filter(l => l.includes('=') && !l.startsWith('#'))
    .map(l => [l.slice(0, l.indexOf('=')).trim(), l.slice(l.indexOf('=') + 1).trim()])
);
const OUT = join(ROOT, 'reel', 'public');
mkdirSync(OUT, { recursive: true });
const BASE = process.env.SHOOT_BASE || 'https://www.izisolo.fr';
const EMAIL = 'camille@atelier-soleil.fr';
const PROFILE_ID = '17a6194a-87e6-47e2-ac31-c6224cd78f44';
const SLUG = 'atelier-soleil';
const PROJECT_REF = new URL(env.NEXT_PUBLIC_SUPABASE_URL).hostname.split('.')[0];
const LARGEUR = 720; // largeur de sortie : l'écran du téléphone du réel fait 470 px

// ── Session démo : magic link admin → verifyOtp → cookie @supabase/ssr ──────
const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
const { data: linkData, error: eLink } = await admin.auth.admin.generateLink({ type: 'magiclink', email: EMAIL });
if (eLink) { console.error('generateLink:', eLink.message); process.exit(1); }
const anon = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
const { data: otpData, error: eOtp } = await anon.auth.verifyOtp({ type: 'magiclink', token_hash: linkData.properties.hashed_token });
if (eOtp || !otpData?.session) { console.error('verifyOtp:', eOtp?.message || 'pas de session'); process.exit(1); }
const cookieName = `sb-${PROJECT_REF}-auth-token`;
const value = 'base64-' + Buffer.from(JSON.stringify(otpData.session)).toString('base64url');
const cookies = [];
if (value.length <= 3180) cookies.push({ name: cookieName, value });
else for (let i = 0; i * 3180 < value.length; i++) cookies.push({ name: `${cookieName}.${i}`, value: value.slice(i * 3180, (i + 1) * 3180) });
console.log('🔑 session démo obtenue');

const today = new Date().toLocaleDateString('sv-SE', { timeZone: 'Europe/Paris' });
const { data: reformer } = await admin.from('cours').select('id, nom, date')
  .eq('profile_id', PROFILE_ID).lt('date', today).ilike('nom', 'Reformer%').eq('est_annule', false)
  .order('date', { ascending: false }).limit(1).single();
if (!reformer) { console.error('Aucune séance Reformer passée : lancer le refresh du démo'); process.exit(1); }
const { data: conv } = await admin.from('conversations').select('id')
  .eq('profile_id', PROFILE_ID).ilike('titre', '%lune%').limit(1).single();
if (!conv) { console.error('Canal pleine lune absent : lancer le refresh du démo'); process.exit(1); }
console.log(`📅 pointage : ${reformer.nom} du ${reformer.date} · 💬 canal ${conv.id.slice(0, 8)}`);

let chromium;
try { ({ chromium } = await import('playwright')); } catch { ({ chromium } = await import('@playwright/test')); }
let browser;
try { browser = await chromium.launch(); } catch { browser = await chromium.launch({ channel: 'msedge' }); }

const HIDE = `[class*="fab" i], [class*="feedback" i] { display: none !important; }`;
const manifest = {};
let ok = 0, ko = 0;

async function ouvrir(ctx, url) {
  const page = await ctx.newPage();
  await page.goto(`${BASE}${url}`, { waitUntil: 'networkidle', timeout: 60000 }).catch(() => {});
  await page.waitForTimeout(2500);
  await page.addStyleTag({ content: HIDE });
  return page;
}
async function ecrire(id, buf, { extract, width = LARGEUR, quality = 82 } = {}) {
  try {
    let img = sharp(buf);
    if (extract) img = img.extract(extract);
    const info = await img.resize({ width }).jpeg({ quality, mozjpeg: true }).toFile(join(OUT, `${id}.jpg`));
    manifest[id] = { w: info.width, h: info.height };
    console.log(`📸 ${id}.jpg ${info.width}×${info.height} · ${Math.round(info.size / 1024)} Ko`);
    ok++;
  } catch (e) {
    console.log(`❌ ${id} : ${e.message.slice(0, 120)}`);
    ko++;
  }
}
const cacherBurger = (page) => page.evaluate(() => {
  for (const el of document.querySelectorAll('button, a')) {
    const r = el.getBoundingClientRect();
    const st = getComputedStyle(el);
    if (st.position === 'fixed' && r.top < 150 && r.left < 150 && r.width < 140) el.style.visibility = 'hidden';
  }
});
// L'accueil porte des bandeaux d'état (installe la PWA, notifications bloquées)
// qui parlent de CE navigateur, pas du produit : on les retire de la capture.
const cacherBandeaux = async (page) => {
  // Le bandeau PWA se ferme par SON bouton (« Plus tard »), comme une prof le ferait.
  const plusTard = page.getByRole('button', { name: 'Plus tard' });
  if (await plusTard.count()) { await plusTard.first().click(); await page.waitForTimeout(400); }
  // La ligne « Notifications bloquées » : le plus petit élément qui la porte, et lui seul.
  await page.evaluate(() => {
    const feuilles = [...document.querySelectorAll('body *')]
      .filter(el => /Notifications bloquées/.test(el.textContent) && el.textContent.trim().length < 140
        && ![...el.children].some(c => /Notifications bloquées/.test(c.textContent) && c.textContent.trim().length < 140));
    for (const el of feuilles) el.style.display = 'none';
  });
};
// Où est le burger, et où est l'entrée « Agenda » du menu ouvert : le réel y
// pose le doigt. Coordonnées en px CSS, converties en px de capture (×3).
const rect = (page, sel) => page.evaluate((s) => {
  const el = typeof s === 'string' ? document.querySelector(s)
    : s && s.sel ? [...document.querySelectorAll(s.sel)].find(e => e.textContent.replace(/\s+/g, ' ').trim().includes(s.texte))
    : [...document.querySelectorAll('.sidebar-mobile.open a')].find(a => a.textContent.trim().startsWith('Agenda'));
  if (!el) return null;
  const r = el.getBoundingClientRect();
  return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
}, sel);

const mob = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true, locale: 'fr-FR' });
await mob.addCookies(cookies.map(c => ({ ...c, url: BASE, sameSite: 'Lax' })));
const pub = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true, locale: 'fr-FR' });
const ECHELLE = LARGEUR / 1170; // px de capture → px de l'image écrite

// 1. ACCUEIL, puis le MENU ouvert (même page, deux états), avec les repères du doigt
{
  const page = await ouvrir(mob, '/dashboard');
  await cacherBandeaux(page);
  const burger = await rect(page, '.mobile-menu-btn');
  await ecrire('dashboard', await page.screenshot());
  await page.click('.mobile-menu-btn');
  await page.waitForTimeout(700);
  const agenda = await rect(page, null);
  await ecrire('menu', await page.screenshot());
  if (!burger || !agenda) { console.log('❌ repères burger/Agenda introuvables'); ko++; }
  else manifest.reperes = {
    burger: [Math.round(burger.x * 3 * ECHELLE), Math.round(burger.y * 3 * ECHELLE)],
    agenda: [Math.round(agenda.x * 3 * ECHELLE), Math.round(agenda.y * 3 * ECHELLE)],
  };
  await page.close();
}

// 2. AGENDA mobile (la page où le doigt arrive) : burger conservé, comme sur l'accueil
{
  const page = await ouvrir(mob, '/agenda');
  await ecrire('agenda', await page.screenshot());
  await page.close();
}

// 3. POINTAGE : de la ligne titre à la 3e élève
{
  const page = await ouvrir(mob, `/pointage/${reformer.id}`);
  await cacherBurger(page);
  await page.waitForTimeout(300);
  await ecrire('pointage', await page.screenshot(), { extract: { left: 0, top: 200, width: 1170, height: 2332 } });
  await page.close();
}

// 4. PORTAIL public, côté élève : du haut de page au premier jour de planning
{
  const page = await ouvrir(pub, `/p/${SLUG}`);
  const total = await page.evaluate(() => document.body.scrollHeight);
  for (let y = 0; y < total; y += 600) { await page.evaluate(v => window.scrollTo(0, v), y); await page.waitForTimeout(120); }
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(600);
  const fin = await page.evaluate(() => {
    const el = [...document.querySelectorAll('*')].find(e => e.children.length === 0 && /^LUNDI\s*\d+$/i.test(e.textContent.replace(/\s+/g, ' ').trim()));
    return el ? el.getBoundingClientRect().top + window.scrollY : null;
  });
  const hauteur = Math.min(total, (fin ?? 2400) + 900);
  await ecrire('portail', await page.screenshot({ fullPage: true }), { extract: { left: 0, top: 0, width: 1170, height: Math.round(hauteur * 3) } });
  await page.close();
}

// 5. REVENUS mobile, « 3 derniers mois »
{
  const page = await ouvrir(mob, '/revenus');
  await page.getByRole('button', { name: '3 derniers mois' }).click();
  await page.waitForTimeout(2000);
  await cacherBurger(page);
  await ecrire('revenus', await page.screenshot(), { extract: { left: 0, top: 230, width: 1170, height: 2302 } });
  await page.close();
}

// 6. MESSAGERIE : le canal pleine lune déroulé jusqu'aux dernières réponses
{
  const page = await ouvrir(mob, `/messagerie?conv=${conv.id}`);
  await page.waitForTimeout(1500);
  await page.evaluate(() => {
    for (const el of document.querySelectorAll('*')) {
      const st = getComputedStyle(el);
      if ((st.overflowY === 'auto' || st.overflowY === 'scroll') && el.scrollHeight > el.clientHeight + 20) el.scrollTop = el.scrollHeight;
    }
    window.scrollTo(0, document.body.scrollHeight);
  });
  await page.waitForTimeout(800);
  await cacherBurger(page);
  await ecrire('messagerie', await page.screenshot(), { extract: { left: 0, top: 100, width: 1170, height: 2110 } });
  await page.close();
}

// 7. VENTE : le tunnel « Ajouter une offre » sur la fiche d'Élise, deux règlements.
//    Rien n'est validé : on remplit le formulaire et on photographie, c'est tout.
{
  const { data: eleve } = await admin.from('clients').select('id').eq('profile_id', PROFILE_ID).ilike('prenom', 'Élise').limit(1).single();
  if (!eleve) { console.log('❌ Élise introuvable : lancer le refresh du démo'); ko++; }
  else {
    const page = await ouvrir(mob, `/clients/${eleve.id}`);
    const btn = page.getByRole('button', { name: /Ajouter une offre/ }).first();
    await btn.scrollIntoViewIfNeeded();
    await btn.click();
    await page.waitForTimeout(1000);
    await page.locator('.offre-choice-nom', { hasText: 'Carnet 10' }).first().click();
    await page.waitForTimeout(1000);
    // a) « Plusieurs moyens » : 70 € en espèces + 70 € par carte, le même jour.
    await page.getByRole('button', { name: 'Plusieurs moyens' }).first().click();
    await page.waitForTimeout(500);
    const moyens = page.locator('.mm-mode');
    await moyens.nth(0).selectOption({ label: 'Espèces' });
    await moyens.nth(1).selectOption({ label: 'Carte bancaire' }).catch(() => moyens.nth(1).selectOption({ label: 'CB' }));
    await page.waitForTimeout(400);
    const plusieursFois = await rect(page, { sel: '.reglement-btn', texte: 'En plusieurs fois' });
    await ecrire('vente-moyens', await page.screenshot());
    // b) « En plusieurs fois » : 3 versements mensuels, arrondis aux euros, le premier réglé en espèces.
    await page.getByRole('button', { name: 'En plusieurs fois' }).first().click();
    await page.waitForTimeout(500);
    await page.locator('.multi-nb-chip', { hasText: /^3x$/ }).first().click();
    await page.waitForTimeout(300);
    const arrondir = page.locator('.multi-arrondir-btn');
    if (await arrondir.count()) { await arrondir.first().click(); await page.waitForTimeout(300); }
    const premierMode = page.locator('.multi-v-row select').first();
    if (await premierMode.count()) await premierMode.selectOption({ label: 'Espèces' }).catch(() => {});
    await page.waitForTimeout(300);
    // Faire descendre le corps de la modale pour voir les trois versements.
    await page.evaluate(() => {
      for (const el of document.querySelectorAll('.modal-backdrop *')) {
        const st = getComputedStyle(el);
        if ((st.overflowY === 'auto' || st.overflowY === 'scroll') && el.scrollHeight > el.clientHeight + 20) { el.scrollTop = 260; return; }
      }
      window.scrollTo(0, 260);
    });
    await page.waitForTimeout(400);
    await ecrire('vente-echeancier', await page.screenshot());
    if (!plusieursFois) { console.log('❌ repère « En plusieurs fois » introuvable'); ko++; }
    else manifest.reperes.plusieursFois = [Math.round(plusieursFois.x * 3 * ECHELLE), Math.round(plusieursFois.y * 3 * ECHELLE)];
    await page.close();
  }
}

// 8. NOUVELLE OFFRE, remplie mais jamais créée : carnet de 10, 6 mois, Mat + Reformer, 140 €.
{
  const page = await ouvrir(mob, '/offres/nouveau');
  await cacherBurger(page);
  await page.getByRole('button', { name: '10 séances' }).first().click();
  await page.getByRole('button', { name: '6 mois' }).first().click();
  await page.getByRole('button', { name: 'Mat', exact: true }).first().click();
  await page.getByRole('button', { name: 'Reformer', exact: true }).first().click();
  await page.getByPlaceholder('Ex : Carnet 10 séances').fill('Carnet 10 séances');
  await page.getByPlaceholder('0.00').first().fill('140');
  await page.evaluate(() => document.activeElement?.blur());
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(600);
  await ecrire('offre', await page.screenshot({ fullPage: true }));
  await page.close();
}

// 9. NOUVEAU COURS, une série hebdomadaire remplie mais jamais créée : Yoga Flow, mardi 12h15, 12 cours.
{
  const page = await ouvrir(mob, '/cours/nouveau?frequence=hebdomadaire');
  await cacherBurger(page);
  await page.getByRole('button', { name: 'Yoga', exact: true }).first().click();
  await page.getByPlaceholder('Ex : Yoga Vinyasa').fill('Yoga Flow · pause déj');
  const heures = page.locator('select');
  const nbSelects = await heures.count();
  for (let i = 0; i < nbSelects; i++) {
    const options = await heures.nth(i).locator('option').allTextContents();
    if (options.some(o => o.trim() === '12h')) await heures.nth(i).selectOption({ label: '12h' });
    else if (options.some(o => o.trim() === '15') && options.some(o => o.trim() === '45')) await heures.nth(i).selectOption({ label: '15' });
  }
  const duree = page.locator('input[type=number]').first();
  await duree.fill('45');
  await page.getByPlaceholder('ex : 12, vide = illimité').fill('12');
  const lieu = page.locator('select').filter({ hasText: 'Choisir un lieu' }).first();
  if (await lieu.count()) {
    const opts = await lieu.locator('option').allTextContents();
    if (opts.length > 1) await lieu.selectOption({ index: 1 });
  }
  await page.getByRole('button', { name: 'Mar', exact: true }).first().click();
  await page.getByText('Sauter les vacances scolaires').click();
  await page.getByText('Sauter les jours fériés français').click();
  await page.evaluate(() => document.activeElement?.blur());
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(800);
  await ecrire('cours', await page.screenshot({ fullPage: true }));
  await page.close();
}

await browser.close();
writeFileSync(join(OUT, 'manifest.json'), JSON.stringify(manifest, null, 2));
console.log(`\n${ok} visuel(s), ${ko} échec(s) — manifest écrit dans reel/public/.`);
process.exit(ko ? 1 : 0);
