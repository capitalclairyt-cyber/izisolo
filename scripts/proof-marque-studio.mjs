/**
 * Preuve — l'identité visuelle d'un studio (v104, 2026-08-25).
 *
 * Déclencheur : une prof qui lance son activité, venue d'un vocal Instagram.
 * Elle partait chez un concurrent, en est revenue déçue pour des raisons
 * PUREMENT visuelles, et voulait savoir si ses élèves sortiraient de son site.
 * Deux réponses construites : ses couleurs jusque sur son portail, et son
 * portail sur son propre sous-domaine.
 *
 * Ce qu'on prouve :
 *   A. Le sous-domaine SERT le portail sans changer l'adresse (réécriture).
 *      Testé sur `<slug>.localhost:3333` — les navigateurs résolvent
 *      *.localhost seuls, donc la fonctionnalité se prouve sans DNS.
 *   B. `capsule.` (l'admin) n'est JAMAIS servi comme un studio.
 *   C. Sur l'hôte du studio, l'API et /auth/ restent intacts.
 *   D. Ses couleurs habillent RÉELLEMENT le portail : on lit la valeur
 *      CALCULÉE de --brand dans le navigateur, pas la présence d'un attribut.
 *   E. Le contraste tient : même une couleur pâle donne du texte lisible.
 *   F. Sans réglage, le portail garde exactement son apparence d'avant.
 *   G. Ménage : couleurs restaurées, MÊME en cas d'échec.
 *
 * Usage : node scripts/proof-marque-studio.mjs [dossier-captures]
 * Prérequis : dev server sur :3333.
 */
import { createClient } from '@supabase/supabase-js';
import { readFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = process.cwd();
const OUT = process.argv[2] || join(process.env.TEMP || '.', 'proof-marque-studio');
mkdirSync(OUT, { recursive: true });
const PORT = 3333;
const PROF_EMAIL = 'bonjour@melutek.com';
const C1 = '7a5fb0';   // violet de marque
const C2 = 'e8927c';   // corail secondaire
const PALE = 'f7e08a'; // jaune pâle : le piège du contraste

const env = Object.fromEntries(
  readFileSync(join(ROOT, '.env.local'), 'utf8')
    .split('\n').filter(l => l.includes('=') && !l.startsWith('#'))
    .map(l => [l.slice(0, l.indexOf('=')).trim(), l.slice(l.indexOf('=') + 1).trim()])
);
const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

let ok = 0, ko = 0;
const assert = (cond, label) => {
  if (cond) { ok++; console.log(`  OK  ${label}`); }
  else { ko++; console.log(`  KO  ${label}`); }
};
const attendre = ms => new Promise(r => setTimeout(r, ms));

for (let i = 0; i < 90; i++) {
  try { const r = await fetch(`http://localhost:${PORT}/login`); if (r.ok) break; } catch { /* pas prêt */ }
  await attendre(2000);
  if (i === 89) { console.error(`dev server injoignable sur :${PORT}`); process.exit(1); }
}
console.log('dev server pret\n');

const { data: { users } } = await admin.auth.admin.listUsers({ page: 1, perPage: 200 });
const prof = (users || []).find(u => u.email === PROF_EMAIL);
// ⚠️ Le select PRINCIPAL ne nomme JAMAIS la colonne neuve — un select qui
// cite une colonne absente rend `data` null, et le script entier tombe sur
// « Cannot read properties of null ». C'est la règle §12, et cette preuve y
// est tombée à son premier run : la leçon vaut aussi pour les scripts.
const { data: profil } = await admin.from('profiles').select('studio_slug, studio_nom').eq('id', prof.id).single();
const SLUG = profil.studio_slug;

// Sonde v104, en requête SÉPARÉE.
const { data: sonde, error: eSonde } = await admin
  .from('profiles').select('couleurs_marque').eq('id', prof.id).maybeSingle();
const V104 = !eSonde;
const COULEURS_INITIALES = V104 ? (sonde?.couleurs_marque ?? null) : null;
console.log(`studio « ${profil.studio_nom} » (slug ${SLUG})`);
console.log(V104 ? '── v104 appliquée : parcours COMPLET ──\n' : `── v104 absente (${eSonde.code}) : parcours DÉGRADÉ ──\n`);

const HOTE_STUDIO = `http://${SLUG}.localhost:${PORT}`;
const poser = async (c) => {
  const { error } = await admin.from('profiles').update({ couleurs_marque: c }).eq('id', prof.id);
  if (error) throw new Error(`couleurs : ${error.message}`);
};
const restaurer = () => admin.from('profiles').update({ couleurs_marque: COULEURS_INITIALES }).eq('id', prof.id);

/** La valeur CALCULÉE d'une variable CSS : le seul juge honnête (§12). */
const tokenCalcule = (page, nom) =>
  page.evaluate(n => getComputedStyle(document.querySelector('[data-marque]') || document.documentElement)
    .getPropertyValue(n).trim(), nom);

const contraste = (rgb) => {
  const [r, g, b] = (rgb.match(/\d+/g) || [255, 255, 255]).map(Number);
  const l = [r, g, b].map(v => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return 1.05 / (0.2126 * l[0] + 0.7152 * l[1] + 0.0722 * l[2] + 0.05);
};

let browser;
try {
  let chromium;
  try { ({ chromium } = await import('playwright')); }
  catch { ({ chromium } = await import('@playwright/test')); }
  try { browser = await chromium.launch(); }
  catch { browser = await chromium.launch({ channel: 'msedge' }); }

  const ctx = await browser.newContext({ viewport: { width: 420, height: 900 } });
  const p = await ctx.newPage();
  const erreurs = [];
  p.on('pageerror', e => erreurs.push(String(e)));

  // ══ A. Le sous-domaine sert le portail, sans changer l'adresse ═══════════
  console.log('A. Le portail sur son sous-domaine');
  await p.goto(`${HOTE_STUDIO}/`, { waitUntil: 'domcontentloaded' });
  await p.waitForTimeout(5000);
  const texte = await p.innerText('body');
  await p.screenshot({ path: join(OUT, 'A-sous-domaine.png'), fullPage: false });

  assert(p.url().startsWith(HOTE_STUDIO),
    `l'adresse reste celle de la prof (${p.url().replace(`:${PORT}`, '')}) — réécriture, pas redirection`);
  assert(!p.url().includes('/p/'), "et elle ne montre pas /p/<slug>");
  assert(texte.includes(profil.studio_nom), `son portail est bien servi (« ${profil.studio_nom} » à l'écran)`);
  assert(erreurs.length === 0, `console propre (${erreurs.length} erreur(s))`);

  // Une page interne suit le même chemin.
  await p.goto(`${HOTE_STUDIO}/connexion`, { waitUntil: 'domcontentloaded' });
  await p.waitForTimeout(3000);
  assert(!/Une erreur est survenue|404/i.test(await p.innerText('body')),
    "une page interne du portail suit (/connexion)");

  // ══ B. capsule n'est jamais un studio ════════════════════════════════════
  // ⚠️ Tout passe par le NAVIGATEUR : Node ne résout pas *.localhost, seuls
  // les navigateurs le font. Un request.get() depuis le script échoue en
  // ENOTFOUND et ne prouve RIEN du routage (le KO fantôme du premier run).
  console.log("\nB. L'hôte admin ne devient pas un studio");
  await p.goto(`http://capsule.localhost:${PORT}/`, { waitUntil: 'domcontentloaded' });
  await p.waitForTimeout(2500);
  const urlCapsule = p.url();
  assert(/[/]admin|[/]login/.test(urlCapsule),
    `capsule.* atterrit côté admin (${urlCapsule.replace(`:${PORT}`, '')}), jamais sur un portail`);
  assert(!urlCapsule.includes('/p/'), "et jamais sur le portail d'un studio");

  // ══ C. API et /auth/ intacts sur l'hôte studio ══════════════════════════
  // Requêtes émises DEPUIS la page du studio : même origine, donc c'est bien
  // le navigateur et le proxy qui répondent, pas Node.
  console.log('\nC. Ce qui ne doit PAS être réécrit');
  await p.goto(`${HOTE_STUDIO}/`, { waitUntil: 'domcontentloaded' });
  await p.waitForTimeout(2500);
  const statuts = await p.evaluate(async (slug) => {
    const lire = async (u) => {
      try {
        const r = await fetch(u, { redirect: 'manual' });
        return { status: r.status, type: r.headers.get('content-type') || '' };
      } catch (e) { return { status: -1, erreur: String(e) }; }
    };
    return [await lire('/api/portail/' + slug + '/profil'), await lire('/auth/callback')];
  }, SLUG);
  assert(statuts[0].status !== 404 && !/text[/]html/.test(statuts[0].type),
    `l'API répond sur l'hôte studio (${statuts[0].status}), elle n'est pas réécrite vers le portail`);
  // status 0 = redirection opaque (redirect:'manual') : la route existe et
  // redirige, ce qui est exactement le comportement attendu de /auth/callback.
  assert(statuts[1].status !== 404,
    `/auth/ reste servi (${statuts[1].status === 0 ? 'redirection' : statuts[1].status}) : c'est là qu'atterrit le lien magique d'une élève`);

  if (!V104) {
    console.log('\n(DÉGRADÉ : sans la colonne, le portail garde la palette du métier.)');
    assert(true, 'DÉGRADÉ : le sous-domaine marche déjà, les couleurs attendent la migration');
  } else {
    // ══ D. Ses couleurs habillent RÉELLEMENT le portail ═══════════════════
    console.log('\nD. Ses couleurs, mesurées dans le navigateur');
    const avant = await tokenCalcule(p, '--brand');

    await poser({ c1: C1, c2: C2 });
    await p.goto(`${HOTE_STUDIO}/?nocache=${Date.now()}`, { waitUntil: 'domcontentloaded' });
    await p.waitForTimeout(4000);
    const apres = await tokenCalcule(p, '--brand');
    const secondaire = await tokenCalcule(p, '--marque-2');
    await p.screenshot({ path: join(OUT, 'D-couleurs.png'), fullPage: false });

    assert(apres && apres !== avant,
      `--brand CALCULÉ a changé (${avant || 'défaut'} → ${apres})`);
    assert(/^rgb\(/.test(apres), 'et c\'est bien une couleur, pas une chaîne vide');
    assert(!!secondaire, `sa seconde couleur est posée aussi (${secondaire})`);

    const marque = await p.evaluate(() => !!document.querySelector('[data-marque="perso"]'));
    assert(marque, "le portail se déclare aux couleurs de la prof");

    // ══ E. Le contraste tient, même sur une couleur pâle ═════════════════
    console.log('\nE. Le piège de la couleur pâle');
    await poser({ c1: PALE });
    await p.goto(`${HOTE_STUDIO}/?nocache=${Date.now()}`, { waitUntil: 'domcontentloaded' });
    await p.waitForTimeout(4000);
    const pale = await tokenCalcule(p, '--brand');
    const ratio = contraste(pale);
    assert(ratio >= 4.5,
      `un jaune pâle (#${PALE}) donne quand même du texte lisible : ${ratio.toFixed(2)}:1 vs blanc (${pale})`);
    await p.screenshot({ path: join(OUT, 'E-pale.png'), fullPage: false });

    // ══ F. Sans réglage, rien ne change ══════════════════════════════════
    console.log('\nF. Sans réglage, le portail est celui d\'avant');
    await poser(null);
    await p.goto(`${HOTE_STUDIO}/?nocache=${Date.now()}`, { waitUntil: 'domcontentloaded' });
    await p.waitForTimeout(4000);
    const revenu = await tokenCalcule(p, '--brand');
    const marqueApres = await p.evaluate(() => !!document.querySelector('[data-marque="perso"]'));
    assert(!marqueApres, 'plus aucune surcharge de marque');
    assert(revenu === avant, `--brand est revenu à sa valeur d'origine (${revenu})`);
  }

  await ctx.close();
} catch (e) {
  ko++;
  console.error('\nEXCEPTION :', e.message);
} finally {
  try { await restaurer(); } catch (e) { console.error('restauration :', e.message); }
  const { data } = await admin.from('profiles').select('couleurs_marque').eq('id', prof.id).maybeSingle();
  const rendu = JSON.stringify(data?.couleurs_marque ?? null);
  assert(rendu === JSON.stringify(COULEURS_INITIALES ?? null),
    `ménage : les couleurs du studio démo sont restaurées (${rendu})`);
  if (browser) await browser.close();
}

console.log(`\n${'═'.repeat(62)}`);
console.log(`  ${ok} OK · ${ko} KO   ${V104 ? '(parcours complet)' : '(parcours dégradé, v104 non appliquée)'}`);
console.log(`  captures : ${OUT}`);
console.log('═'.repeat(62));
process.exit(ko === 0 ? 0 : 1);
