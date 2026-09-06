/**
 * Preuve en vrai navigateur de la LANDING v3 « claire » (2026-09-06), contre
 * un build prod local sur :3333 (`npm run build && npm run start -- -p 3333`).
 * Remplace proof-landing-v2.mjs (le cadre navigateur à trois captures, les
 * blobs et les « petites choses » n'existent plus).
 *
 * Ce qu'elle vérifie, et pourquoi chaque point existe :
 *   · le hero porte UN visuel produit chargé, lisible (≥ 250 px de large), et
 *     ses deux CTA n'ont pas le même poids (guichet plein, essai fantôme) ;
 *   · le hero est VISIBLE sans scroller (opacité calculée ≥ 0,99 sur le titre
 *     et le téléphone), en Chromium ET en WebKit : la leçon Melyflow (§12) ;
 *   · une seule signature décorative : zéro .zen, zéro pastille flottante ;
 *   · quatre rangées, chacune avec un visuel réel chargé ;
 *   · aucune section collée au bord (chaque .container a une marge > 0) ;
 *   · tarifs 15/29 + LANCEMENT50, cinq puces par plan ;
 *   · FAQ : six questions visibles, les douze dans le DOM (Schema.org) ;
 *   · zéro « 14 jours », « 30 jours » présent, zéro tiret quadratin, zéro « chiant » ;
 *   · mobile 390 : pas de débordement horizontal, CTA du hero cliquable ;
 *   · pages persona et calculateur intactes (elles partagent Nav/Pricing/FAQ/CTA).
 * Usage : node scripts/proof-landing-v3.mjs [dossier-captures]
 */
import { chromium, webkit } from 'playwright';
import { mkdirSync } from 'node:fs';

const OUT = process.argv[2] || 'C:/Users/Colin/AppData/Local/Temp/claude/proof-landing-v3';
mkdirSync(OUT, { recursive: true });
const BASE = process.env.PROOF_BASE || 'http://localhost:3333';
let failures = 0;
const ok = (cond, label) => { console.log(`${cond ? '✅' : '❌'} ${label}`); if (!cond) failures++; };

let browser;
try { browser = await chromium.launch(); } catch { browser = await chromium.launch({ channel: 'msedge' }); }

// ── Desktop 1440 ────────────────────────────────────────────────────────────
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const consoleErrors = [];
page.on('console', m => { if (m.type() === 'error') consoleErrors.push(m.text()); });
page.on('pageerror', e => consoleErrors.push(String(e)));
await page.goto(BASE + '/', { waitUntil: 'networkidle' });
await page.waitForTimeout(800);
const body = await page.evaluate(() => document.body.innerText);

console.log('\nA. Le texte');
ok(body.includes('Moins de soucis.') && body.includes('Plus de tapis.'), 'Hero : la headline');
ok(body.includes('Créée par Maude'), 'Bande de confiance : Maude');
ok(body.includes('Tout ce qu\'il te faut.'), 'Fonctionnalités : la tête de section');
ok(body.includes('On monte ton studio,'), 'Concierge : la section');
ok(body.includes('Je voulais un outil calme, qui me ressemble.'), 'Fondatrice : la citation');
ok(body.includes('15 €') && body.includes('29 €') && body.includes('LANCEMENT50'), 'Tarifs : 15/29 + code');
ok(!body.includes('Et tout un tas de petites choses') && !body.includes('Pourquoi IziSolo'), 'Sections « Pourquoi » et « petites choses » retirées');
ok(!/\[Témoignage/.test(body) && !body.includes('Manon'), 'Aucun témoignage en attente affiché');
ok(!body.includes('14 jours') && body.includes('30 jours'), 'Essai : 30 jours, plus jamais 14');
ok(!body.includes('—'), 'Zéro tiret quadratin dans le texte rendu');
ok(!body.includes('chiant'), 'Vocabulaire : « chiant » banni');

console.log('\nB. Le hero');
const hero = await page.evaluate(() => {
  const img = document.querySelector('.hero-v3 .phone img');
  const r = img?.getBoundingClientRect();
  const liens = [...document.querySelectorAll('.hero-v2-ctas a')];
  const fond = (a) => getComputedStyle(a).backgroundColor;
  const transparent = (c) => c === 'transparent' || /rgba\(0, 0, 0, 0\)/.test(c);
  const h1 = document.querySelector('.hero-v3 h1');
  return {
    imgs: document.querySelectorAll('.hero-v3 img').length,
    charge: !!img && img.complete && img.naturalWidth > 0,
    largeur: r ? Math.round(r.width) : 0,
    nbCta: liens.length,
    premier: liens[0]?.getAttribute('href'),
    premierPlein: liens[0] ? !transparent(fond(liens[0])) : false,
    secondFantome: liens[1] ? transparent(fond(liens[1])) : false,
    opaciteTitre: h1 ? Number(getComputedStyle(h1).opacity) : 0,
    opaciteImg: img ? Number(getComputedStyle(img.closest('.phone')).opacity) : 0,
    ctaCliquable: (() => {
      const a = liens[0]; if (!a) return false;
      const b = a.getBoundingClientRect();
      const el = document.elementFromPoint(b.left + b.width / 2, b.top + b.height / 2);
      return el === a || a.contains(el);
    })(),
  };
});
ok(hero.imgs === 1, `Hero : UN seul visuel (${hero.imgs})`);
ok(hero.charge && hero.largeur >= 250, `Hero : visuel chargé et lisible (${hero.largeur} px)`);
ok(hero.nbCta === 2 && hero.premier === '/creer-mon-studio', 'Hero : le guichet concierge en premier');
ok(hero.premierPlein && hero.secondFantome, 'Hero : guichet plein, essai fantôme (jamais deux CTA de même poids)');
ok(hero.opaciteTitre >= 0.99 && hero.opaciteImg >= 0.99, `Hero : visible sans scroller (titre ${hero.opaciteTitre}, visuel ${hero.opaciteImg})`);
ok(hero.ctaCliquable, 'Hero : CTA cliquable (elementFromPoint)');

console.log('\nC. La structure');
const structure = await page.evaluate(() => ({
  zen: document.querySelectorAll('.zen, .zen-layer, .zen-blob').length,
  badges: document.querySelectorAll('.feat-media .badge').length,
  rangees: document.querySelectorAll('.feat').length,
  visuelsRangees: [...document.querySelectorAll('.feat-media img')].map(i => i.complete && i.naturalWidth > 0),
  bordsColles: [...document.querySelectorAll('main .container')].filter(c => c.getBoundingClientRect().left < 8).length,
  pucesTarifs: [...document.querySelectorAll('.price ul')].map(u => u.children.length),
  faqVisibles: [...document.querySelectorAll('.faq-item')].filter(b => !b.hidden).length,
  faqDom: document.querySelectorAll('.faq-item').length,
  personas: document.querySelectorAll('.pourqui-liste a').length,
  fonts: getComputedStyle(document.querySelector('h1')).fontFamily,
  eyebrowMono: /mono/i.test(getComputedStyle(document.querySelector('.hero-v3 .eyebrow')).fontFamily),
}));
ok(structure.zen === 0, 'Zéro fond « zen » (blobs, texture) sur la home');
ok(structure.badges === 0, 'Zéro pastille flottante sur les visuels');
ok(structure.rangees === 4, `Quatre rangées de fonctionnalités (${structure.rangees})`);
ok(structure.visuelsRangees.length === 4 && structure.visuelsRangees.every(Boolean), `Quatre visuels réels chargés (${structure.visuelsRangees.filter(Boolean).length}/4)`);
ok(structure.bordsColles === 0, `Aucune section collée au bord gauche (${structure.bordsColles})`);
ok(structure.pucesTarifs.length === 2 && structure.pucesTarifs.every(n => n === 5), `Cinq puces par tarif (${structure.pucesTarifs.join('/')})`);
ok(structure.faqVisibles === 6 && structure.faqDom === 12, `FAQ : 6 visibles, 12 dans le DOM (${structure.faqVisibles}/${structure.faqDom})`);
ok(structure.personas === 6, `Pour qui : six liens métier (${structure.personas})`);
ok(/Fraunces/i.test(structure.fonts), 'H1 en Fraunces');
ok(!structure.eyebrowMono, 'Étiquettes de section : plus de monospace');

// La FAQ se déplie et le « voir plus » révèle les autres
await page.locator('.faq-more').click();
await page.waitForTimeout(300);
const faqApres = await page.evaluate(() => [...document.querySelectorAll('.faq-item')].filter(b => !b.hidden).length);
ok(faqApres === 12, `FAQ : « voir les autres » révèle les 12 (${faqApres})`);
const q = page.locator('.faq-item', { hasText: 'Et les cours en ligne ?' });
await q.scrollIntoViewIfNeeded();
await q.click();
await page.waitForTimeout(500);
ok(await q.evaluate(el => el.classList.contains('open') && el.querySelector('.faq-a').clientHeight > 10), 'FAQ : une question s\'ouvre au clic');

console.log('\nC2. Le menu Ressources');
const menuFerme = await page.evaluate(() => {
  const p = document.querySelector('.nav-menu-panel');
  const st = getComputedStyle(p);
  return { visibility: st.visibility, opacity: Number(st.opacity), position: st.position, navH: Math.round(document.querySelector('.nav').getBoundingClientRect().height) };
});
ok(menuFerme.visibility === 'hidden' && menuFerme.opacity === 0 && menuFerme.position === 'absolute', `Menu fermé par défaut, hors flux (${menuFerme.visibility}, ${menuFerme.opacity}, ${menuFerme.position})`);
ok(menuFerme.navH < 90, `La nav tient sur une ligne (${menuFerme.navH} px)`);
await page.locator('.nav-menu-btn').hover();
await page.waitForTimeout(400);
const menuOuvert = await page.evaluate(() => {
  const p = document.querySelector('.nav-menu-panel');
  const st = getComputedStyle(p);
  const a = p.querySelector('a');
  const b = a.getBoundingClientRect();
  const el = document.elementFromPoint(b.left + b.width / 2, b.top + b.height / 2);
  return { visibility: st.visibility, opacity: Number(st.opacity), liens: p.querySelectorAll('a').length, cliquable: el === a || a.contains(el) };
});
ok(menuOuvert.visibility === 'visible' && menuOuvert.opacity === 1 && menuOuvert.liens === 4 && menuOuvert.cliquable, `Menu ouvert au survol, 4 liens cliquables (${menuOuvert.liens})`);
await page.mouse.move(700, 600);

// Les visuels des rangées sont lazy : on parcourt la page avant la capture
// pleine page, sinon les téléphones sortent vides (artefact de capture, pas de
// produit — constaté le 2026-09-06, vérifié en scrollant dans le vrai onglet).
const parcourir = async (p) => {
  const total = await p.evaluate(() => document.body.scrollHeight);
  for (let y = 0; y < total; y += 500) { await p.evaluate(v => window.scrollTo(0, v), y); await p.waitForTimeout(120); }
  await p.evaluate(() => window.scrollTo(0, 0));
  await p.waitForTimeout(600);
};
await parcourir(page);
const SECTIONS_REVELEES = ['.feat:nth-of-type(3)', '.pourqui-grid', '.founder', '.prices', '.faq-list'];
const opacites = {};
for (const sel of SECTIONS_REVELEES) {
  await page.evaluate(s => document.querySelector(s).scrollIntoView({ block: 'center' }), sel);
  await page.waitForTimeout(700);
  opacites[sel] = await page.evaluate(s => Number(getComputedStyle(document.querySelector(s)).opacity), sel);
}
ok(Object.values(opacites).every(o => o >= 0.99), `Sections révélées opaques après un vrai scroll (${Object.values(opacites).join('/')})`);
await page.evaluate(() => window.scrollTo(0, 0));
await page.waitForTimeout(400);
const PHOTO_SANS_REVEAL = '.reveal, .reveal.r-stagger > * { animation: none !important; opacity: 1 !important; transform: none !important; }';
await page.addStyleTag({ content: PHOTO_SANS_REVEAL });
const peints = await page.evaluate(() => [...document.querySelectorAll('.feat-media img')].map(i => i.complete && i.naturalWidth > 0 && i.getBoundingClientRect().height > 100));
ok(peints.length === 4 && peints.every(Boolean), `Quatre visuels de rangée chargés et hauts de plus de 100 px après parcours (${peints.filter(Boolean).length}/4)`);
await page.screenshot({ path: OUT + '/landing-v3-desktop.png', fullPage: true });
const realErrors = consoleErrors.filter(e => !e.includes('_vercel') && !e.includes('404'));
ok(realErrors.length === 0, `Console : zéro erreur (${realErrors.slice(0, 2).join(' | ').slice(0, 160)})`);

// ── Mobile 390 ──────────────────────────────────────────────────────────────
console.log('\nD. Mobile 390');
const mob = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
await mob.goto(BASE + '/', { waitUntil: 'networkidle' });
await mob.waitForTimeout(600);
const m = await mob.evaluate(() => {
  const a = document.querySelector('.hero-v2-ctas a');
  const b = a.getBoundingClientRect();
  const el = document.elementFromPoint(b.left + b.width / 2, b.top + b.height / 2);
  return {
    sw: document.documentElement.scrollWidth, iw: window.innerWidth,
    ctaCliquable: el === a || a.contains(el),
    ctaLargeur: Math.round(b.width),
    phone: Math.round(document.querySelector('.hero-v3 .phone')?.getBoundingClientRect().width || 0),
  };
});
ok(m.sw <= m.iw + 1, `Pas de débordement horizontal (${m.sw} vs ${m.iw})`);
ok(m.ctaCliquable && m.ctaLargeur > 300, `CTA du hero pleine largeur et cliquable (${m.ctaLargeur} px)`);
ok(m.phone > 0 && m.phone <= 390, `Téléphone du hero contenu dans l'écran (${m.phone} px)`);
await parcourir(mob);
await mob.addStyleTag({ content: PHOTO_SANS_REVEAL });
await mob.screenshot({ path: OUT + '/landing-v3-mobile.png', fullPage: true });

// ── Pages partagées (Nav / Pricing / FAQ / FinalCta / Footer) ──────────────
console.log('\nE. Pages qui partagent les sections');
for (const [url, attendu] of [['/profs-de-yoga', '29 €'], ['/calculateur', 'IziSolo'], ['/creer-mon-studio', 'Maude']]) {
  const p = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const errs = [];
  p.on('pageerror', e => errs.push(String(e)));
  await p.goto(BASE + url, { waitUntil: 'networkidle' });
  const t = await p.evaluate(() => document.body.innerText);
  ok(t.includes(attendu) && errs.length === 0, `${url} : rendu, zéro erreur JS`);
  await p.close();
}
await browser.close();

// ── WebKit : le hero visible sans scroller, le moteur de Safari ────────────
console.log('\nF. WebKit (Safari)');
try {
  const wk = await webkit.launch();
  const wp = await wk.newPage({ viewport: { width: 390, height: 844 } });
  const wkErrors = [];
  wp.on('pageerror', e => wkErrors.push(String(e)));
  await wp.goto(BASE + '/', { waitUntil: 'networkidle' });
  await wp.waitForTimeout(1200);
  const w = await wp.evaluate(() => ({
    titre: Number(getComputedStyle(document.querySelector('.hero-v3 h1')).opacity),
    phone: Number(getComputedStyle(document.querySelector('.hero-v3 .phone')).opacity),
    trust: Number(getComputedStyle(document.querySelector('.trust-grid')).opacity),
  }));
  ok(w.titre >= 0.99 && w.phone >= 0.99 && w.trust >= 0.99, `WebKit : hero et bande de confiance opaques sans scroll (${w.titre}/${w.phone}/${w.trust})`);
  const wkOpacites = {};
  for (const sel of SECTIONS_REVELEES) {
    await wp.evaluate(s => document.querySelector(s).scrollIntoView({ block: 'center' }), sel);
    await wp.waitForTimeout(700);
    wkOpacites[sel] = await wp.evaluate(s => Number(getComputedStyle(document.querySelector(s)).opacity), sel);
  }
  ok(Object.values(wkOpacites).every(o => o >= 0.99), `WebKit : sections révélées opaques après scroll (${Object.values(wkOpacites).join('/')})`);
  ok(wkErrors.length === 0, `WebKit : zéro erreur de page (${wkErrors.join(' | ').slice(0, 120)})`);
  await wk.close();
} catch (e) {
  ok(false, `WebKit indisponible : ${e.message.slice(0, 100)}`);
}

console.log(failures === 0 ? '\n🎉 TOUT VERT' : `\n💥 ${failures} échec(s)`);
process.exit(failures === 0 ? 0 : 1);
