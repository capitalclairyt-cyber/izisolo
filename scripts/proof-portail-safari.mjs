/**
 * Preuve — le portail est LISIBLE dans Safari (2026-08-25).
 *
 * Incident : Melyflow ouvre son portail sur son MacBook, tape « À propos »,
 * « Tarifs », « Infos » — les trois panneaux sont VIDES. Vidéo à l'appui.
 * Colin, sur Chrome, voit tout. Moi aussi, dans Chromium, y compris en lisant
 * le texte avec innerText : le contenu ÉTAIT dans le DOM.
 *
 * Cause : ces panneaux portaient la classe `.reveal`, une animation pilotée
 * par le SCROLL (animation-timeline: view()). Ils apparaissent au CLIC, sans
 * que rien ne défile : la timeline ne démarrait jamais et ils restaient à
 * opacity 0. Présents, lisibles par un script, invisibles pour un humain.
 *
 * ── Ce que cette preuve verrouille ────────────────────────────────────────
 *   1. Chaque onglet rend son contenu à une opacité PLEINE, SANS le moindre
 *      scroll. C'est l'assertion qui manquait : innerText ne voit pas
 *      l'opacité, donc il ne pouvait pas attraper ce bug.
 *   2. Le bloc « Prochain cours » est visible dès le chargement (il était à
 *      0,06 dans WebKit avant ce correctif).
 *   3. Aucune règle du portail ne dépend plus d'une timeline de scroll.
 *
 * Elle tourne dans WEBKIT, le moteur de Safari : c'est le seul endroit où le
 * bug se voit. Chromium le rattrapait, et c'est exactement pour ça qu'il est
 * passé entre les mailles.
 *
 * Usage : node scripts/proof-portail-safari.mjs [slug]
 * Prérequis : dev server sur :3333 (ou PROOF_BASE pour viser la prod).
 */
import { webkit } from '@playwright/test';

const BASE = process.env.PROOF_BASE || 'http://localhost:3333';
const SLUG = process.argv[2] || 'melyflow';

let ok = 0, ko = 0;
const check = (cond, label, detail = '') => {
  if (cond) { ok++; console.log(`  OK  ${label}${detail ? ` — ${detail}` : ''}`); }
  else { ko++; console.log(`  KO  ${label}${detail ? ` — ${detail}` : ''}`); }
};
const attendre = ms => new Promise(r => setTimeout(r, ms));

for (let i = 0; i < 60; i++) {
  try { const r = await fetch(`${BASE}/login`); if (r.ok) break; } catch { /* pas prêt */ }
  await attendre(2000);
  if (i === 59) { console.error(`serveur injoignable sur ${BASE}`); process.exit(1); }
}

console.log(`WebKit (moteur de Safari) — ${BASE}/p/${SLUG}\n`);

const browser = await webkit.launch();
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  const erreurs = [];
  page.on('pageerror', e => erreurs.push(String(e)));
  await page.goto(`${BASE}/p/${SLUG}`, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('.portail-cours-card, .portail-groupe, .portail-empty', { timeout: 25000 });
  await attendre(2500); // l'animation d'apparition dure 0,7 s

  // ══ 1. Ce qu'on voit au chargement, SANS toucher à rien ══════════════════
  console.log('1. Au chargement, sans le moindre scroll');
  const auChargement = await page.evaluate(() =>
    [...document.querySelectorAll('.reveal')].map(e => ({
      cls: e.className.replace(/jsx-\S+\s*/g, '').trim(),
      op: Number(getComputedStyle(e).opacity),
    })));
  for (const el of auChargement) {
    check(el.op > 0.99, `« ${el.cls} » est pleinement visible`, `opacité ${el.op}`);
  }
  check(auChargement.length > 0, 'des blocs animés existent bien (sinon la preuve ne prouve rien)',
    `${auChargement.length} bloc(s)`);

  // ══ 2. Aucune règle ne dépend plus du scroll ═════════════════════════════
  console.log('\n2. Plus aucune animation pilotée par le scroll');
  const timelines = await page.evaluate(() =>
    [...document.querySelectorAll('.reveal')].map(e => getComputedStyle(e).animationTimeline || 'auto'));
  check(timelines.every(t => !/view|scroll/.test(t)),
    'aucun .reveal n\'est piloté par une timeline de scroll', timelines.join(' · ') || 'aucun');

  // ══ 3. LE test de Melyflow : les trois onglets ═══════════════════════════
  console.log('\n3. Les onglets, tapés comme elle les a tapés');
  const onglets = await page.evaluate(() =>
    [...document.querySelectorAll('button')]
      .filter(b => /^(À propos|Tarifs|Infos)$/.test(b.innerText.trim()))
      .map(b => b.innerText.trim()));
  check(onglets.length > 0, 'des onglets à tester', onglets.join(' · ') || 'aucun');

  for (const onglet of onglets) {
    await page.evaluate((t) => {
      const b = [...document.querySelectorAll('button')].find(e => e.innerText.trim() === t);
      if (b) b.click();
    }, onglet);
    // ⚠️ On ne scrolle PAS. C'est tout l'objet de la preuve : elle n'a pas
    // scrollé non plus, et c'est ce qui laissait le panneau invisible.
    // On ATTEND le panneau au lieu de dormir un délai fixe : une preuve qui
    // mesure trop tôt accuse le produit d'un défaut d'horloge.
    let panneau = null;
    for (let i = 0; i < 25 && !panneau; i++) {
      await attendre(200);
      panneau = await page.evaluate(() => {
        const s = document.querySelector(
          '.portail-about, .portail-philo, .portail-prices, .portail-venue, .portail-faq');
        if (!s) return null;
        const op = Number(getComputedStyle(s).opacity);
        // Tant que l'animation d'apparition court, l'opacité monte : on laisse
        // le temps qu'elle finisse plutôt que de conclure sur un état de
        // transition (0,7 s de fondu).
        if (op < 0.99) return null;
        return {
          cls: s.className.replace(/jsx-\S+\s*/g, '').trim(),
          op,
          texte: (s.innerText || '').trim().slice(0, 40),
          h: Math.round(s.getBoundingClientRect().height),
        };
      });
    }
    check(panneau && panneau.op > 0.99 && panneau.h > 20,
      `« ${onglet} » : son contenu est VISIBLE, sans scroller`,
      panneau ? `opacité ${panneau.op} · ${panneau.h}px · « ${panneau.texte} »` : 'panneau absent');
  }

  check(erreurs.length === 0, 'console propre', erreurs.slice(0, 2).join(' | ') || 'aucune erreur');
} catch (e) {
  ko++;
  console.log(`\n  KO  exception : ${e.message}`);
} finally {
  await browser.close();
}

console.log(`\n${ok}/${ok + ko} — ${ko === 0 ? '✅ tout est vert' : `❌ ${ko} échec(s)`}`);
process.exit(ko === 0 ? 0 : 1);
