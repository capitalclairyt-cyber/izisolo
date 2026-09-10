/**
 * Preuve en vrai navigateur de la page « Changer d'outil » (2026-09-10),
 * contre un build prod local (`npm run build && npm run start -- -p 3334`,
 * `PROOF_BASE` pour changer de port).
 *
 * Ce qu'elle vérifie, et pourquoi chaque point existe :
 *   · la page est PUBLIQUE (le proxy est default-deny : une route oubliée de
 *     PUBLIC_ROUTES part en 307 vers /login, sans un mot) et dans le sitemap ;
 *   · le hero porte le clip « migration » dans un téléphone : poster peint,
 *     vidéo qui JOUE (currentTime qui avance) ; en reduced-motion rien ne
 *     démarre seul et le bouton ▶ est là ;
 *   · la hiérarchie des CTA : le bouton plein va au guichet avec `?src=changer`,
 *     le fantôme descend vers « ce qu'on reprend » (jamais deux CTA de même
 *     poids, invariant v96) ;
 *   · l'honnêteté : la page DIT ce qu'on ne reprend pas (paiements, présences),
 *     ne nomme aucun concurrent, ne promet ni « 14 jours » ni tiret quadratin ;
 *   · le guichet arrive PRÉREMPLI depuis le CTA (le message dit d'où elle
 *     vient), et vide sans le paramètre ;
 *   · la page est atteignable depuis la home (menu Ressources + pied) et la
 *     question vit dans la FAQ /support (le centre d'aide fait partie du lot) ;
 *   · le hero est opaque SANS scroll (pas de .reveal au-dessus du pli, §12) ;
 *   · mobile 390 sans débordement.
 * Usage : node scripts/proof-changer-outil.mjs [dossier-captures]
 */
import { chromium } from 'playwright';
import { mkdirSync, statSync } from 'node:fs';
import { FAQ_SUPPORT } from '../content/faq-support.js';

const OUT = process.argv[2] || 'C:/Users/Colin/AppData/Local/Temp/claude/proof-changer-outil';
mkdirSync(OUT, { recursive: true });
const BASE = process.env.PROOF_BASE || 'http://localhost:3334';
let failures = 0;
const ok = (cond, label) => { console.log(`${cond ? '✅' : '❌'} ${label}`); if (!cond) failures++; };

let browser;
try { browser = await chromium.launch(); } catch { browser = await chromium.launch({ channel: 'msedge' }); }

// ── 0. Le clip sur disque et la route publique ──────────────────────────────
console.log('\n0. Le clip et la route');
const poids = statSync('public/videos/migration.mp4').size;
ok(poids < 1.5 * 1048576, `migration.mp4 sous 1,5 Mo (${(poids / 1048576).toFixed(2)} Mo)`);
const brut = await fetch(BASE + '/changer-d-outil', { redirect: 'manual' });
ok(brut.status === 200, `GET anonyme /changer-d-outil → 200, pas de renvoi vers /login (${brut.status})`);
const html = await brut.text();
ok(/<link[^>]+rel="canonical"[^>]+changer-d-outil/.test(html), 'Canonical posée sur la page');
ok(/og:image/.test(html) && /changer-d-outil/.test(html), 'Open Graph présent');
const sitemap = await (await fetch(BASE + '/sitemap.xml')).text();
ok(sitemap.includes('/changer-d-outil'), 'La page est dans le sitemap');
const robots = await (await fetch(BASE + '/robots.txt')).text();
ok(!/Disallow:\s*\/changer-d-outil/.test(robots), 'robots.txt ne l\'interdit pas');

// ── A. Desktop 1440 ─────────────────────────────────────────────────────────
console.log('\nA. La page, desktop 1440');
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const consoleErrors = [];
page.on('console', m => { if (m.type() === 'error') consoleErrors.push(m.text()); });
page.on('pageerror', e => consoleErrors.push(String(e)));
await page.goto(BASE + '/changer-d-outil', { waitUntil: 'networkidle' });
await page.waitForTimeout(2000);
const body = await page.evaluate(() => document.body.innerText);
ok(body.includes('On reprend') && body.includes('ce qui se reprend.'), 'H1 « On reprend ce qui se reprend. »');
ok(body.includes('Ce qu’on ne reprend pas') || body.includes("Ce qu'on ne reprend pas"), 'La page DIT ce qu\'on ne reprend pas');
ok(/paiements et de tes présences/.test(body), 'Les paiements et les présences sont nommés comme non repris');
ok(/48 h/.test(body) && /gratuit/i.test(body), 'Le délai (48 h) et la gratuité sont écrits');
ok(!/momoyoga|bsport|b sport|zenamu|aurarios|studioplan|websport|web sport|punchpass/i.test(body), 'Aucun concurrent nommé');
ok(!/14 jours/.test(body), 'Zéro « 14 jours »');
ok(!body.includes('\u2014'), 'Zéro tiret quadratin');
// Vercel Insights n'existe pas sur un build local : le proxy renvoie son script vers /login (même filtre que proof-landing-v4).
const realErrors = consoleErrors.filter(e => !e.includes('_vercel') && !e.includes('404'));
ok(realErrors.length === 0, `Console propre (${realErrors.length} erreur(s))${realErrors.length ? ' : ' + realErrors[0] : ''}`);

const structure = await page.evaluate(() => {
  const btns = [...document.querySelectorAll('.hero-v3 .btn')];
  return {
    ctas: btns.map(b => ({ cls: b.className, href: b.getAttribute('href') })),
    cartes: document.querySelectorAll('.cdo-card').length,
    etapes: document.querySelectorAll('.cdo-etapes li').length,
    faq: document.querySelectorAll('.cdo-q').length,
    heroOpacite: Number(getComputedStyle(document.querySelector('.hero-v3-copy')).opacity),
    revealHero: document.querySelectorAll('.hero-v3 .reveal').length,
    posterOk: (() => { const i = document.querySelector('.hero-v3 .phone img'); return !!i && i.complete && i.naturalWidth > 250; })(),
    nav: [...document.querySelectorAll('.nav-menu-panel a')].map(a => a.getAttribute('href')),
  };
});
ok(structure.ctas.length === 2 && structure.ctas[0].cls.includes('btn-primary') && structure.ctas[0].href === '/creer-mon-studio?src=changer', `CTA plein → guichet avec ?src=changer (${structure.ctas[0]?.href})`);
ok(structure.ctas[1]?.cls.includes('btn-ghost') && structure.ctas[1].href === '#ce-quon-reprend', `CTA fantôme → « ce qu'on reprend » (${structure.ctas[1]?.href})`);
ok(structure.cartes === 3 && structure.etapes === 3 && structure.faq === 4, `3 cartes reprises, 3 étapes, 4 questions (${structure.cartes}/${structure.etapes}/${structure.faq})`);
ok(structure.heroOpacite >= 0.99 && structure.revealHero === 0, `Hero opaque sans scroll, zéro .reveal au-dessus du pli (${structure.heroOpacite})`);
ok(structure.posterOk, 'Le poster du clip est peint dans le téléphone');
ok(structure.nav.includes('/changer-d-outil'), 'Le menu Ressources de la nav mène à la page');
const aide = (await import('node:fs')).readFileSync('app/(dashboard)/aide/page.js', 'utf8');
ok(aide.includes('href="/changer-d-outil"'), 'Le tuto Élèves du guide renvoie vers la page');

// Le clip joue de lui-même
await page.waitForTimeout(1500);
const v = await page.evaluate(() => {
  const video = document.querySelector('.hero-v3 video');
  return { src: video?.currentSrc?.split('/').pop(), joue: !!video && !video.paused && video.currentTime > 0, t: Number(video?.currentTime.toFixed(2)) };
});
ok(v.src === 'migration.mp4', `Le clip du hero est migration.mp4 (${v.src})`);
ok(v.joue, `Le clip joue (t=${v.t}s)`);
await page.screenshot({ path: OUT + '/desktop-hero.png' });

// Chaque section rendue après scroll (les .reveal passent à 1)
await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
await page.waitForTimeout(1200);
const reveals = await page.evaluate(() => [...document.querySelectorAll('.reveal')].map(e => Number(getComputedStyle(e).opacity)));
ok(reveals.length > 0 && reveals.every(o => o >= 0.99), `Toutes les sections sont opaques après scroll (${reveals.length} blocs)`);
await page.screenshot({ path: OUT + '/desktop-page.png', fullPage: true });

// ── B. Le guichet prérempli ────────────────────────────────────────────────
console.log('\nB. Le guichet prérempli');
await page.goto(BASE + '/changer-d-outil', { waitUntil: 'networkidle' });
await page.click('.hero-v3 .btn-primary');
await page.waitForURL(/\/creer-mon-studio\?src=changer/, { timeout: 15000 });
let prerempli = '';
for (let i = 0; i < 30 && !prerempli; i++) {
  prerempli = await page.evaluate(() => ([...document.querySelectorAll('.cms-champ')].find(l => l.textContent.includes('Autre chose'))?.querySelector('textarea')?.value || ''));
  if (!prerempli) await page.waitForTimeout(300);
}
ok(/Je viens d’une autre appli|Je viens d'une autre appli/.test(prerempli) && /séances restantes/.test(prerempli), `Le champ libre arrive prérempli depuis le CTA (« ${prerempli.slice(0, 40)}… »)`);
await page.goto(BASE + '/creer-mon-studio', { waitUntil: 'networkidle' });
await page.waitForTimeout(1500);
const vide = await page.evaluate(() => ([...document.querySelectorAll('.cms-champ')].find(l => l.textContent.includes('Autre chose'))?.querySelector('textarea')?.value || ''));
ok(vide === '', 'Sans le paramètre, le champ libre reste vide');

// ── C. Home et support ─────────────────────────────────────────────────────
console.log('\nC. Depuis la home et le support');
await page.goto(BASE + '/', { waitUntil: 'networkidle' });
const home = await page.evaluate(() => ({
  nav: [...document.querySelectorAll('.nav-menu-panel a')].some(a => a.getAttribute('href') === '/changer-d-outil'),
  pied: [...document.querySelectorAll('footer a')].some(a => a.getAttribute('href') === '/changer-d-outil'),
  faqDom: [...document.querySelectorAll('.faq-item')].some(e => /déjà équipée/i.test(e.textContent)),
}));
ok(home.nav && home.pied, `La home mène à la page : menu Ressources (${home.nav}) et pied (${home.pied})`);
ok(home.faqDom, 'La question « déjà équipée » vit dans la FAQ de la home (DOM, Schema.org)');
// /support vit derrière une session : on lit la source de la FAQ, et on exige que
// la question soit la DERNIÈRE (les ancres /support#faq-N sont indexées par position).
const derniere = FAQ_SUPPORT[FAQ_SUPPORT.length - 1];
ok(/Je viens d'une autre appli : comment récupérer/.test(derniere.q) && derniere.lien?.href === '/aide#eleves', `La FAQ /support porte la question en FIN de liste, liée au tuto Élèves (n° ${FAQ_SUPPORT.length})`);

// ── D. Mobile 390 ──────────────────────────────────────────────────────────
console.log('\nD. Mobile 390');
const mobile = await browser.newPage({ viewport: { width: 390, height: 844 } });
await mobile.goto(BASE + '/changer-d-outil', { waitUntil: 'networkidle' });
await mobile.waitForTimeout(1500);
const m = await mobile.evaluate(() => ({ sw: document.documentElement.scrollWidth, iw: window.innerWidth }));
ok(m.sw <= m.iw + 1, `Aucun débordement horizontal (${m.sw}/${m.iw})`);
await mobile.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
await mobile.waitForTimeout(800);
const m2 = await mobile.evaluate(() => document.documentElement.scrollWidth);
ok(m2 <= m.iw + 1, `Toujours aucun débordement en bas de page (${m2})`);
await mobile.screenshot({ path: OUT + '/mobile.png', fullPage: true });
await mobile.close();

// ── E. prefers-reduced-motion ──────────────────────────────────────────────
console.log('\nE. prefers-reduced-motion');
const ctxReduit = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' });
const pr = await ctxReduit.newPage();
await pr.goto(BASE + '/changer-d-outil', { waitUntil: 'networkidle' });
await pr.waitForTimeout(2000);
const reduit = await pr.evaluate(() => {
  const video = document.querySelector('.hero-v3 video');
  return { pause: !!video && video.paused, bouton: !!document.querySelector('.hero-v3 .phone button[aria-label="Lire la vidéo"]') };
});
ok(reduit.pause && reduit.bouton, 'Reduced motion : le clip ne démarre pas seul, le bouton ▶ est là');
await ctxReduit.close();

await browser.close();
console.log(`\n${failures === 0 ? '🟢' : '🔴'} ${failures} KO — captures dans ${OUT}`);
process.exit(failures ? 1 : 0);
