/**
 * Preuve en vrai navigateur de la LANDING v4 « en mouvement » (2026-09-09),
 * contre un build prod local (`npm run build && npm run start -- -p 3334`,
 * `PROOF_BASE` pour changer de port). Étend proof-landing-v3.mjs : tout ce que
 * la v3 garantissait tient encore, et la v4 ajoute ce qui BOUGE.
 *
 * Ce qu'elle vérifie, et pourquoi chaque point existe :
 *   · le hero porte UN clip du réel dans un téléphone : le poster est peint
 *     (une vraie <Image>, chargée, ≥ 250 px), puis la vidéo JOUE d'elle-même
 *     (muette, currentTime qui avance) en Chromium ET en WebKit ;
 *   · cinq rangées qui ALTERNENT : deux hauts de mockup desktop fléchés en
 *     SVG (les flèches se tracent au scroll : dashoffset à 0, cartes opaques,
 *     4 flèches, 4 cartes) et trois clips dans un téléphone qui jouent quand
 *     ils entrent à l'écran ;
 *   · la paresse : au chargement, SEUL le clip du hero est demandé au réseau,
 *     les trois autres attendent d'être visibles (preload="none") ;
 *   · le poids : chaque clip < 1,5 Mo, le lot < 5 Mo, chaque poster < 150 Ko ;
 *   · la photo pleine largeur du CTA final est chargée, derrière un voile, et
 *     le titre est clair dessus ; les pages persona (qui partagent FinalCta)
 *     la reçoivent aussi sans erreur ;
 *   · prefers-reduced-motion : AUCUNE vidéo ne démarre seule, le bouton ▶
 *     est là, et les flèches sont dessinées d'emblée sans animation ;
 *   · les invariants v3 : hiérarchie des CTA, opacité sans scroll, zéro .zen,
 *     tarifs 15/29, FAQ 6/12, zéro « 14 jours », zéro tiret quadratin,
 *     mobile 390 sans débordement (cartes de callout comprises).
 * Usage : node scripts/proof-landing-v4.mjs [dossier-captures]
 */
import { chromium, webkit } from 'playwright';
import { mkdirSync, readdirSync, statSync } from 'node:fs';

const OUT = process.argv[2] || 'C:/Users/Colin/AppData/Local/Temp/claude/proof-landing-v4';
mkdirSync(OUT, { recursive: true });
const BASE = process.env.PROOF_BASE || 'http://localhost:3334';
let failures = 0;
const ok = (cond, label) => { console.log(`${cond ? '✅' : '❌'} ${label}`); if (!cond) failures++; };

let browser;
try { browser = await chromium.launch(); } catch { browser = await chromium.launch({ channel: 'msedge' }); }

// ── Le poids, lu sur le disque (ce que le script de rendu promet) ──────────
console.log('\n0. Le poids des clips');
const videos = readdirSync('public/videos');
const mp4 = videos.filter(f => f.endsWith('.mp4')).map(f => ({ f, o: statSync('public/videos/' + f).size }));
const posters = videos.filter(f => f.endsWith('-poster.jpg')).map(f => ({ f, o: statSync('public/videos/' + f).size }));
ok(mp4.length === 4 && mp4.every(v => v.o < 1.5 * 1048576), `4 clips, chacun sous 1,5 Mo (${mp4.map(v => `${v.f} ${(v.o / 1048576).toFixed(2)}`).join(', ')})`);
ok(mp4.reduce((t, v) => t + v.o, 0) < 5 * 1048576, `Le lot sous 5 Mo (${(mp4.reduce((t, v) => t + v.o, 0) / 1048576).toFixed(2)} Mo)`);
ok(posters.length === 4 && posters.every(p => p.o < 150 * 1024), `4 posters sous 150 Ko (${posters.map(p => Math.round(p.o / 1024)).join('/')})`);
ok(!videos.some(f => f.startsWith('reel-paiement')), 'L\'ancien MP4 d\'août n\'est plus là');

// ── Desktop 1440 ────────────────────────────────────────────────────────────
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const consoleErrors = [];
const requetesVideo = [];
page.on('console', m => { if (m.type() === 'error') consoleErrors.push(m.text()); });
page.on('pageerror', e => consoleErrors.push(String(e)));
page.on('request', r => { if (r.url().includes('/videos/') && r.url().endsWith('.mp4')) requetesVideo.push(r.url().split('/').pop()); });
await page.goto(BASE + '/', { waitUntil: 'networkidle' });
await page.waitForTimeout(2500);
const body = await page.evaluate(() => document.body.innerText);

console.log('\nA. Le texte');
ok(body.includes('Moins de soucis.') && body.includes('Plus de tapis.'), 'Hero : la headline');
ok(body.includes('Créée par Maude'), 'Bande de confiance : Maude');
ok(body.includes('Tout ce qu\'il te faut.'), 'Fonctionnalités : la tête de section');
ok(body.includes('Encaisse comme tes élèves te paient'), 'Rangée Encaisser : la nouvelle rangée');
ok(body.includes('On monte ton studio,'), 'Concierge : la section');
ok(body.includes('Je voulais un outil calme, qui me ressemble.'), 'Fondatrice : la citation');
ok(body.includes('15 €') && body.includes('29 €') && body.includes('LANCEMENT50'), 'Tarifs : 15/29 + code');
ok(!/\[Témoignage/.test(body) && !body.includes('Manon'), 'Aucun témoignage en attente affiché');
ok(!body.includes('14 jours') && body.includes('30 jours'), 'Essai : 30 jours, plus jamais 14');
ok(!body.includes('—'), 'Zéro tiret quadratin dans le texte rendu');
ok(!body.includes('chiant'), 'Vocabulaire : « chiant » banni');

console.log('\nB. Le hero : un clip qui joue');
const hero = await page.evaluate(() => {
  const phone = document.querySelector('.hero-v3 .phone-clip');
  const img = phone?.querySelector('img');
  const video = phone?.querySelector('video');
  const r = img?.getBoundingClientRect();
  const liens = [...document.querySelectorAll('.hero-v2-ctas a')];
  const fond = (a) => getComputedStyle(a).backgroundColor;
  const transparent = (c) => c === 'transparent' || /rgba\(0, 0, 0, 0\)/.test(c);
  const h1 = document.querySelector('.hero-v3 h1');
  return {
    imgs: document.querySelectorAll('.hero-v3 img').length,
    charge: !!img && img.complete && img.naturalWidth > 0,
    largeur: r ? Math.round(r.width) : 0,
    joue: !!video && !video.paused && video.currentTime > 0,
    tempsVideo: video ? Number(video.currentTime.toFixed(2)) : -1,
    opaciteVideo: video ? Number(getComputedStyle(video).opacity) : 0,
    nbCta: liens.length,
    premier: liens[0]?.getAttribute('href'),
    premierPlein: liens[0] ? !transparent(fond(liens[0])) : false,
    secondFantome: liens[1] ? transparent(fond(liens[1])) : false,
    opaciteTitre: h1 ? Number(getComputedStyle(h1).opacity) : 0,
    opacitePhone: phone ? Number(getComputedStyle(phone).opacity) : 0,
    ctaCliquable: (() => {
      const a = liens[0]; if (!a) return false;
      const b = a.getBoundingClientRect();
      const el = document.elementFromPoint(b.left + b.width / 2, b.top + b.height / 2);
      return el === a || a.contains(el);
    })(),
  };
});
ok(hero.imgs === 1, `Hero : UN seul visuel, le poster du clip (${hero.imgs})`);
ok(hero.charge && hero.largeur >= 250, `Hero : poster chargé et lisible (${hero.largeur} px)`);
ok(hero.joue && hero.opaciteVideo >= 0.99, `Hero : le clip JOUE tout seul, vidéo opaque (t=${hero.tempsVideo}s, opacité ${hero.opaciteVideo})`);
ok(hero.nbCta === 2 && hero.premier === '/creer-mon-studio', 'Hero : le guichet concierge en premier');
ok(hero.premierPlein && hero.secondFantome, 'Hero : guichet plein, essai fantôme (jamais deux CTA de même poids)');
ok(hero.opaciteTitre >= 0.99 && hero.opacitePhone >= 0.99, `Hero : visible sans scroller (titre ${hero.opaciteTitre}, téléphone ${hero.opacitePhone})`);
ok(hero.ctaCliquable, 'Hero : CTA cliquable (elementFromPoint)');
ok(requetesVideo.length === 1 && requetesVideo[0] === 'navigation.mp4', `Paresse : seul le clip du hero est demandé avant tout scroll (${requetesVideo.join(', ') || 'aucun'})`);

console.log('\nC. La structure : cinq rangées qui alternent');
const structure = await page.evaluate(() => ({
  zen: document.querySelectorAll('.zen, .zen-layer, .zen-blob').length,
  rangees: document.querySelectorAll('.feat').length,
  ordre: [...document.querySelectorAll('.feat .feat-media')].map(m => m.querySelector('.mock-desk') ? 'mockup' : m.querySelector('.phone-clip') ? 'clip' : '?'),
  mockups: [...document.querySelectorAll('.mock-desk img')].map(i => i.complete && i.naturalWidth > 0),
  clips: document.querySelectorAll('.phone-clip').length,
  callouts: document.querySelectorAll('.co').length,
  cartes: document.querySelectorAll('.co-carte').length,
  fleches: document.querySelectorAll('.co-path').length,
  bordsColles: [...document.querySelectorAll('main .container')].filter(c => c.getBoundingClientRect().left < 8).length,
  pucesTarifs: [...document.querySelectorAll('.price ul')].map(u => u.children.length),
  faqVisibles: [...document.querySelectorAll('.faq-item')].filter(b => !b.hidden).length,
  faqDom: document.querySelectorAll('.faq-item').length,
  personas: document.querySelectorAll('.pourqui-liste a').length,
  fonts: getComputedStyle(document.querySelector('h1')).fontFamily,
}));
ok(structure.zen === 0, 'Zéro fond « zen » (blobs, texture) sur la home');
ok(structure.rangees === 5, `Cinq rangées de fonctionnalités (${structure.rangees})`);
ok(structure.ordre.join(',') === 'mockup,clip,clip,mockup,clip', `Alternance mockup / clip / clip / mockup / clip (${structure.ordre.join(',')})`);
ok(structure.mockups.length === 2 && structure.mockups.every(Boolean), `Deux hauts de mockup desktop, captures chargées (${structure.mockups.filter(Boolean).length}/2)`);
ok(structure.clips === 4, `Quatre clips dans un téléphone, hero compris (${structure.clips})`);
ok(structure.callouts === 2 && structure.cartes === 4 && structure.fleches === 4, `Callouts : 2 blocs, 4 cartes, 4 flèches (${structure.callouts}/${structure.cartes}/${structure.fleches})`);
ok(structure.bordsColles === 0, `Aucune section collée au bord gauche (${structure.bordsColles})`);
ok(structure.pucesTarifs.length === 2 && structure.pucesTarifs.every(n => n === 5), `Cinq puces par tarif (${structure.pucesTarifs.join('/')})`);
ok(structure.faqVisibles === 6 && structure.faqDom === 12, `FAQ : 6 visibles, 12 dans le DOM (${structure.faqVisibles}/${structure.faqDom})`);
ok(structure.personas === 6, `Pour qui : six liens métier (${structure.personas})`);
ok(/Fraunces/i.test(structure.fonts), 'H1 en Fraunces');

// ── Ce qui bouge au scroll : flèches qui se tracent, clips qui démarrent ───
console.log('\nD. Au scroll : les flèches se tracent, les clips jouent');
// ⚠️ .feat:nth-of-type(N+1) : la tête de section est un <div> elle aussi, la
// rangée 1 est donc le 2e div de son conteneur (piège attrapé au 1er run).
const scrollVers = async (p, sel, attente = 2600) => {
  await p.evaluate(s => document.querySelector(s).scrollIntoView({ block: 'center' }), sel);
  await p.waitForTimeout(attente);
};
for (const [i, sel] of [['1', '.feat:nth-of-type(2) .co'], ['4', '.feat:nth-of-type(5) .co']]) {
  await scrollVers(page, sel);
  const co = await page.evaluate(s => {
    const el = document.querySelector(s);
    const paths = [...el.querySelectorAll('.co-path')];
    const cartes = [...el.querySelectorAll('.co-carte')];
    const vp = window.innerWidth;
    return {
      on: el.classList.contains('is-on'),
      dash: paths.map(p => parseFloat(getComputedStyle(p).strokeDashoffset)),
      cartesOpaques: cartes.map(c => Number(getComputedStyle(c).opacity)),
      cartesDansEcran: cartes.every(c => { const r = c.getBoundingClientRect(); return r.left >= 0 && r.right <= vp; }),
      tetes: [...el.querySelectorAll('.co-tete')].map(t => Number(getComputedStyle(t).opacity)),
    };
  }, sel);
  ok(co.on && co.dash.every(d => d === 0), `Rangée ${i} : flèches tracées jusqu'au bout (dashoffset ${co.dash.join('/')})`);
  ok(co.cartesOpaques.every(o => o >= 0.99) && co.tetes.every(o => o >= 0.99), `Rangée ${i} : cartes et pointes opaques (${co.cartesOpaques.join('/')}, ${co.tetes.join('/')})`);
  ok(co.cartesDansEcran, `Rangée ${i} : cartes dans l'écran`);
}
for (const [i, sel] of [['2', '.feat:nth-of-type(3) .phone-clip'], ['3', '.feat:nth-of-type(4) .phone-clip'], ['5', '.feat:nth-of-type(6) .phone-clip']]) {
  await scrollVers(page, sel, 3000);
  const v = await page.evaluate(s => {
    const video = document.querySelector(s + ' video');
    const ecran = document.querySelector(s + ' .phone-ecran').getBoundingClientRect();
    return { joue: !video.paused && video.currentTime > 0, t: Number(video.currentTime.toFixed(2)), opacite: Number(getComputedStyle(video).opacity), hauteurEcran: Math.round(ecran.height) };
  }, sel);
  ok(v.joue && v.opacite >= 0.99, `Rangée ${i} : le clip joue une fois à l'écran (t=${v.t}s, opacité ${v.opacite}, écran ${v.hauteurEcran} px)`);
}
ok(requetesVideo.length === 4, `Les quatre clips ont fini par être demandés, un par un (${requetesVideo.join(', ')})`);
// Le clip du hero, sorti de l'écran, est en pause (pas de décodage pour rien)
const heroPause = await page.evaluate(() => document.querySelector('.hero-v3 video').paused);
ok(heroPause, 'Le clip du hero se met en pause quand il sort de l\'écran');

console.log('\nE. La photo pleine largeur du CTA final');
await scrollVers(page, '.final-v4', 1200);
const fin = await page.evaluate(() => {
  const s = document.querySelector('.final-v4');
  const img = s.querySelector('.final-photo img');
  const h2 = s.querySelector('h2');
  const r = s.getBoundingClientRect();
  // ⚠️ getComputedStyle rend la couleur dans l'espace où elle est déclarée : nos
  // tokens sont en oklch, la clarté est alors le premier nombre (L, de 0 à 1).
  const clair = (c) => { const m = c.match(/\d+(\.\d+)?/g)?.map(Number) || [0, 0, 0]; return c.startsWith('oklch') ? m[0] > 0.75 : (m[0] + m[1] + m[2]) / 3 > 180; };
  return {
    charge: img && img.complete && img.naturalWidth > 0,
    pleineLargeur: Math.round(r.width) >= window.innerWidth - 1 && r.left <= 0,
    voile: !!s.querySelector('.final-voile'),
    titreClair: clair(getComputedStyle(h2).color),
    ctas: s.querySelectorAll('a.btn').length,
    hauteur: Math.round(r.height),
  };
});
ok(fin.charge, 'Photo de fond chargée (photo-mala.jpg)');
ok(fin.pleineLargeur && fin.hauteur > 300, `Bande pleine largeur (${fin.hauteur} px de haut)`);
ok(fin.voile && fin.titreClair, 'Voile sombre posé, titre clair par-dessus');
ok(fin.ctas === 2, `Deux CTA sur la photo (${fin.ctas})`);

// La FAQ se déplie toujours
await page.locator('.faq-more').click();
await page.waitForTimeout(300);
const faqApres = await page.evaluate(() => [...document.querySelectorAll('.faq-item')].filter(b => !b.hidden).length);
ok(faqApres === 12, `FAQ : « voir les autres » révèle les 12 (${faqApres})`);

await page.evaluate(() => window.scrollTo(0, 0));
await page.waitForTimeout(500);
await page.addStyleTag({ content: '.reveal, .reveal.r-stagger > * { animation: none !important; opacity: 1 !important; transform: none !important; }' });
await page.screenshot({ path: OUT + '/landing-v4-desktop.png', fullPage: true });
const realErrors = consoleErrors.filter(e => !e.includes('_vercel') && !e.includes('404'));
ok(realErrors.length === 0, `Console : zéro erreur (${realErrors.slice(0, 2).join(' | ').slice(0, 160)})`);

// ── Mobile 390 ──────────────────────────────────────────────────────────────
console.log('\nF. Mobile 390');
const mob = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
await mob.goto(BASE + '/', { waitUntil: 'networkidle' });
await mob.waitForTimeout(2500);
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
await scrollVers(mob, '.hero-v3 .phone-clip', 2500);
ok(await mob.evaluate(() => { const v = document.querySelector('.hero-v3 video'); return !v.paused && v.currentTime > 0; }), 'Mobile : le clip du hero joue');
for (const sel of ['.feat:nth-of-type(2) .co', '.feat:nth-of-type(5) .co']) {
  await scrollVers(mob, sel);
  const c = await mob.evaluate(s => {
    const el = document.querySelector(s);
    const vp = window.innerWidth;
    return { on: el.classList.contains('is-on'), dans: [...el.querySelectorAll('.co-carte')].every(k => { const r = k.getBoundingClientRect(); return r.left >= 0 && r.right <= vp + 1; }), sw: document.documentElement.scrollWidth };
  }, sel);
  ok(c.on && c.dans && c.sw <= 391, `Mobile ${sel.slice(0, 20)} : flèches tracées, cartes dans l'écran, pas de débordement (${c.sw})`);
}
await mob.evaluate(() => window.scrollTo(0, 0));
await mob.addStyleTag({ content: '.reveal, .reveal.r-stagger > * { animation: none !important; opacity: 1 !important; transform: none !important; }' });
await mob.screenshot({ path: OUT + '/landing-v4-mobile.png', fullPage: true });

// ── Reduced motion : rien ne démarre seul, tout est lisible d'emblée ───────
console.log('\nG. prefers-reduced-motion');
const ctxReduit = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' });
const pr = await ctxReduit.newPage();
await pr.goto(BASE + '/', { waitUntil: 'networkidle' });
await pr.waitForTimeout(2500);
const reduit = await pr.evaluate(() => {
  const v = document.querySelector('.hero-v3 video');
  return { pause: v.paused, bouton: !!document.querySelector('.hero-v3 .clip-play') };
});
ok(reduit.pause && reduit.bouton, 'Reduced motion : le clip du hero ne démarre pas seul, le bouton ▶ est là');
await pr.evaluate(() => document.querySelector('.feat:nth-of-type(2) .co').scrollIntoView({ block: 'center' }));
await pr.waitForTimeout(300);
const coReduit = await pr.evaluate(() => {
  const el = document.querySelector('.feat:nth-of-type(2) .co');
  return { dash: [...el.querySelectorAll('.co-path')].map(p => parseFloat(getComputedStyle(p).strokeDashoffset)), cartes: [...el.querySelectorAll('.co-carte')].map(c => Number(getComputedStyle(c).opacity)) };
});
ok(coReduit.dash.every(d => d === 0) && coReduit.cartes.every(o => o >= 0.99), `Reduced motion : flèches et cartes visibles d'emblée, sans animation (${coReduit.dash.join('/')})`);
// Le bouton ▶ lance la vidéo à la demande
await pr.evaluate(() => window.scrollTo(0, 0));
await pr.locator('.hero-v3 .clip-tap').click();
await pr.waitForTimeout(1500);
ok(await pr.evaluate(() => { const v = document.querySelector('.hero-v3 video'); return !v.paused && v.currentTime > 0; }), 'Reduced motion : un tap sur l\'écran lance la vidéo');
await ctxReduit.close();

// ── Pages partagées (Nav / Pricing / FAQ / FinalCta / Footer) ──────────────
console.log('\nH. Pages qui partagent les sections');
for (const [url, attendu] of [['/profs-de-yoga', '29 €'], ['/calculateur', 'IziSolo'], ['/creer-mon-studio', 'Maude']]) {
  const p = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const errs = [];
  p.on('pageerror', e => errs.push(String(e)));
  await p.goto(BASE + url, { waitUntil: 'networkidle' });
  const t = await p.evaluate(() => document.body.innerText);
  // Le CTA final est loin sous la ligne de flottaison : sa photo est paresseuse, on y va avant de la lire.
  await p.evaluate(() => document.querySelector('.final-v4')?.scrollIntoView({ block: 'center' }));
  await p.waitForTimeout(1500);
  const photo = await p.evaluate(() => { const i = document.querySelector('.final-v4 .final-photo img'); return !i || (i.complete && i.naturalWidth > 0); });
  ok(t.includes(attendu) && errs.length === 0, `${url} : rendu, zéro erreur JS (${errs.join(' | ').slice(0, 100)})`);
  ok(photo, `${url} : photo du CTA final chargée une fois à l'écran`);
  await p.close();
}
await browser.close();

// ── WebKit : le moteur de Safari, hero visible et clips qui jouent ─────────
console.log('\nI. WebKit (Safari)');
try {
  const wk = await webkit.launch();
  const wp = await wk.newPage({ viewport: { width: 390, height: 844 } });
  const wkErrors = [];
  wp.on('pageerror', e => wkErrors.push(String(e)));
  await wp.goto(BASE + '/', { waitUntil: 'networkidle' });
  await wp.waitForTimeout(1500);
  const w0 = await wp.evaluate(() => ({
    titre: Number(getComputedStyle(document.querySelector('.hero-v3 h1')).opacity),
    trust: Number(getComputedStyle(document.querySelector('.trust-grid')).opacity),
  }));
  // En 390 px, le téléphone du hero est SOUS le texte, donc sous le pli : on
  // descend jusqu'à lui avant de lire (piège attrapé au 1er run : aucun play()
  // n'était appelé, l'observateur ne l'avait simplement jamais vu).
  await scrollVers(wp, '.hero-v3 .phone-clip', 3000);
  const w = await wp.evaluate(() => {
    const v = document.querySelector('.hero-v3 video');
    return {
      titre: Number(getComputedStyle(document.querySelector('.hero-v3 h1')).opacity),
      phone: Number(getComputedStyle(document.querySelector('.hero-v3 .phone')).opacity),
      trust: Number(getComputedStyle(document.querySelector('.trust-grid')).opacity),
      joue: !v.paused && v.currentTime > 0, t: Number(v.currentTime.toFixed(2)),
    };
  });
  ok(w0.titre >= 0.99 && w0.trust >= 0.99 && w.phone >= 0.99, `WebKit : hero et bande de confiance opaques sans scroll (${w0.titre}/${w.phone}/${w0.trust})`);
  ok(w.joue, `WebKit : le clip du hero joue tout seul (t=${w.t}s)`);
  await scrollVers(wp, '.feat:nth-of-type(2) .co');
  const wco = await wp.evaluate(() => { const el = document.querySelector('.feat:nth-of-type(2) .co'); return { on: el.classList.contains('is-on'), dash: [...el.querySelectorAll('.co-path')].map(p => parseFloat(getComputedStyle(p).strokeDashoffset)) }; });
  ok(wco.on && wco.dash.every(d => d === 0), `WebKit : flèches tracées au scroll (${wco.dash.join('/')})`);
  await scrollVers(wp, '.feat:nth-of-type(3) .phone-clip', 3000);
  ok(await wp.evaluate(() => { const v = document.querySelector('.feat:nth-of-type(3) video'); return !v.paused && v.currentTime > 0; }), 'WebKit : le clip de la rangée Réservation joue');
  ok(wkErrors.length === 0, `WebKit : zéro erreur de page (${wkErrors.join(' | ').slice(0, 120)})`);
  await wk.close();
} catch (e) {
  ok(false, `WebKit indisponible : ${e.message.slice(0, 100)}`);
}

console.log(failures === 0 ? '\n🎉 TOUT VERT' : `\n💥 ${failures} échec(s)`);
process.exit(failures === 0 ? 0 : 1);
