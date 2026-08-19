/* Vérification vrai navigateur de la landing v2 (build prod local :3333).
   Lancer depuis la racine du repo : node <scratchpad>/verify-landing-v2.mjs <dossier-captures> */
import { chromium } from 'playwright';

const OUT = process.argv[2] || '.';
const BASE = 'http://localhost:3333';
let failures = 0;
const ok = (cond, label) => {
  console.log(`${cond ? '✅' : '❌'} ${label}`);
  if (!cond) failures++;
};

const browser = await chromium.launch({ channel: 'msedge' });

// ── Desktop ────────────────────────────────────────────────────────
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const consoleErrors = [];
page.on('console', m => { if (m.type() === 'error') consoleErrors.push(m.text()); });
page.on('pageerror', e => consoleErrors.push(String(e)));

await page.goto(BASE + '/', { waitUntil: 'networkidle' });
const body = await page.evaluate(() => document.body.innerText);

ok(body.includes('Moins de soucis.') && body.includes('Plus de tapis.'), 'Hero : nouvelle headline');
ok(body.includes('Créée par Maude'), 'Hero : ligne de confiance Maude');
ok(body.includes('ton-studio.izisolo.fr'), 'Hero : cadre produit (barre URL)');
ok(!body.includes('Lotus Yoga') && !body.includes('Atelier Souffle'), 'Marquee de faux studios supprimé');
ok(!body.includes('Camille R.') && !body.includes('4,9'), 'Faux témoignages + fausse note supprimés');
ok(/qui est derrière izisolo/i.test(body), 'Section fondatrice présente');
ok(body.includes('Je voulais un outil calme, qui me ressemble.'), 'Citation de Maude');
ok(body.includes('Et tout un tas de petites choses'), 'Grille « petites choses »');
ok(body.includes('15 €') && body.includes('29 €') && body.includes('LANCEMENT50'), 'Tarifs : 15/29 + code promo');
ok(body.includes('Cours en visio : ton lien Zoom ou Meet servi aux élèves à jour'), 'Tarifs : ligne cours en visio');
ok(body.includes('Vraies factures numérotées'), 'Tarifs : factures en Essentiel');
ok(body.includes('Et les cours en ligne ?'), 'FAQ : question cours en ligne');
ok(!body.includes('chiant'), 'Vocabulaire : « chiant » banni');
ok(!body.includes('—'), 'Zéro tiret quadratin dans le texte rendu');

const title = await page.title();
ok(title.includes('Moins de soucis'), `<title> mis à jour (${title})`);

const fonts = await page.evaluate(() => ({
  h1: getComputedStyle(document.querySelector('h1')).fontFamily,
  h1Size: getComputedStyle(document.querySelector('h1')).fontSize,
}));
ok(/Fraunces/i.test(fonts.h1), `H1 en Fraunces (${fonts.h1.slice(0, 60)})`);

// 3 captures du hero product chargées ?
const shots = await page.evaluate(() =>
  [...document.querySelectorAll('.hero-product .shots img')].map(i => ({ ok: i.complete && i.naturalWidth > 0, src: i.currentSrc.slice(-40) }))
);
ok(shots.length === 3 && shots.every(s => s.ok), `Hero : 3 captures chargées (${shots.length})`);

// CTA hero réellement cliquable (piège elementFromPoint) — AVANT de scroller
const ctaHit = await page.evaluate(() => {
  const a = document.querySelector('.hero-v2-ctas a');
  const r = a.getBoundingClientRect();
  const el = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
  return el === a || a.contains(el);
});
ok(ctaHit, 'CTA hero cliquable (elementFromPoint)');

// FAQ : cliquer la question visio et vérifier l'ouverture
const faqBtn = page.locator('.faq-item', { hasText: 'Et les cours en ligne ?' });
await faqBtn.scrollIntoViewIfNeeded();
await faqBtn.click();
await page.waitForTimeout(500);
const opened = await faqBtn.evaluate(el => el.classList.contains('open') && el.querySelector('.faq-a').clientHeight > 10);
ok(opened, 'FAQ : la question s\'ouvre au clic');

await page.screenshot({ path: OUT + '/landing-v2-desktop.png', fullPage: true });

// ── Mobile 375 ─────────────────────────────────────────────────────
const mob = await browser.newPage({ viewport: { width: 375, height: 812 } });
await mob.goto(BASE + '/', { waitUntil: 'networkidle' });
const overflow = await mob.evaluate(() => ({
  sw: document.documentElement.scrollWidth,
  iw: window.innerWidth,
}));
ok(overflow.sw <= overflow.iw + 1, `Mobile : pas de débordement horizontal (${overflow.sw} vs ${overflow.iw})`);
await mob.screenshot({ path: OUT + '/landing-v2-mobile.png', fullPage: true });

// ── Pages partagées (régression Pricing/FAQ/FinalCta) ─────────────
const persona = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const personaErrors = [];
persona.on('pageerror', e => personaErrors.push(String(e)));
await persona.goto(BASE + '/profs-de-yoga', { waitUntil: 'networkidle' });
const pbody = await persona.evaluate(() => document.body.innerText);
ok(pbody.includes('15 €') && pbody.includes('29 €'), 'Persona /profs-de-yoga : pricing v2 rendu');
ok(personaErrors.length === 0, `Persona : zéro erreur JS (${personaErrors.join(' | ').slice(0, 120)})`);
await persona.screenshot({ path: OUT + '/persona-yoga.png', fullPage: false });

const calc = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await calc.goto(BASE + '/calculateur', { waitUntil: 'networkidle' });
const cbody = await calc.evaluate(() => document.body.innerText);
ok(cbody.length > 500, 'Calculateur : page rendue');

// Le script Vercel Analytics (/_vercel/insights) n'existe pas en local :
// 404 + redirect proxy = artefact local connu, pas une régression.
const realErrors = consoleErrors.filter(e => !e.includes('_vercel') && !e.includes('404'));
console.log(realErrors.length === 0
  ? '✅ Console home : zéro erreur (hors artefact Vercel Analytics local)'
  : `⚠️ Console home : ${realErrors.length} erreurs → ${realErrors.slice(0, 3).join(' | ').slice(0, 300)}`);
if (realErrors.length > 0) failures++;

await browser.close();
console.log(failures === 0 ? '\n🎉 TOUT VERT' : `\n💥 ${failures} échec(s)`);
process.exit(failures === 0 ? 0 : 1);
