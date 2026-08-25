/**
 * Audit Safari — parcourir l'app dans le VRAI moteur de Safari (2026-08-25).
 *
 * Né de l'incident Melyflow : ses onglets « À propos », « Tarifs » et « Infos »
 * étaient VIDES sur son MacBook, alors que le texte était bien dans le DOM.
 * Cause : une animation pilotée par le scroll sur un contenu qui apparaît au
 * clic. Chrome rattrapait, Safari non. Aucune de nos vérifications ne pouvait
 * le voir, parce qu'elles lisaient `innerText`, qui est AVEUGLE à l'opacité.
 *
 * Cet audit répond à la question « est-ce qu'il y en a d'autres ? » en
 * mesurant, pas en supposant. Sur chaque page il relève :
 *
 *   1. les ERREURS de page (un littéral d'expression régulière non supporté,
 *      par exemple, tue le script entier au chargement — donc toute la page) ;
 *   2. les erreurs de console ;
 *   3. tout élément qui porte du TEXTE et reste sous 50 % d'opacité, ou qui a
 *      une taille nulle alors qu'il a du contenu — le symptôme exact de
 *      l'incident ;
 *   4. les animations encore pilotées par une timeline de scroll sur un
 *      élément textuel (le piège d'origine).
 *
 * Il ne juge pas : il rapporte. À relire à chaque fois qu'on touche aux
 * animations, aux onglets, ou avant d'ouvrir une nouvelle surface publique.
 *
 * ⚠️ LE VERDICT SE LIT CONTRE LA PROD. En local, la navigation séquentielle
 * de l'audit fait avorter les préchargements RSC de Next, et WebKit rapporte
 * ces abandons en « Fetch API cannot load … due to access control checks ».
 * C'est un artefact du dev (l'endpoint `__nextjs_original-stack-frames` qui
 * les accompagne n'existe qu'en développement), pas un défaut de l'app :
 * les mêmes pages sortent propres contre www.izisolo.fr.
 *
 * Ce que l'audit NE couvre PAS, et qu'il faut vérifier autrement :
 *   - les contenus qui n'apparaissent qu'au CLIC (onglets, modales,
 *     accordéons) : c'est le rôle de `scripts/proof-portail-safari.mjs` ;
 *   - les vieux Safari (< 16.4) : le WebKit de Playwright est récent, il ne
 *     reproduit pas leurs manques. Pour ceux-là, la lecture du code reste le
 *     seul filet (ex. les lookbehind d'expressions régulières, qui tuent le
 *     script ENTIER au chargement) ;
 *   - ce qui n'existe que sur iPhone : Web Push (PWA installée seulement),
 *     navigator.share, les sélecteurs de date natifs.
 *
 * Usage : node scripts/audit-safari.mjs
 *   PROOF_BASE=https://www.izisolo.fr node scripts/audit-safari.mjs  (le vrai)
 * Prérequis : dev server sur :3333 pour le mode local.
 */
import { webkit } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const BASE = process.env.PROOF_BASE || 'http://localhost:3333';
const PROF_EMAIL = 'bonjour@melutek.com';

const env = Object.fromEntries(
  readFileSync(join(process.cwd(), '.env.local'), 'utf8')
    .split('\n').filter(l => l.includes('=') && !l.startsWith('#'))
    .map(l => [l.slice(0, l.indexOf('=')).trim(), l.slice(l.indexOf('=') + 1).trim()])
);
const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
const PROJECT_REF = new URL(env.NEXT_PUBLIC_SUPABASE_URL).hostname.split('.')[0];

const attendre = ms => new Promise(r => setTimeout(r, ms));

async function sessionCookies(email) {
  const { data: link } = await admin.auth.admin.generateLink({ type: 'magiclink', email });
  const anon = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: otp } = await anon.auth.verifyOtp({ type: 'magiclink', token_hash: link.properties.hashed_token });
  const value = 'base64-' + Buffer.from(JSON.stringify(otp.session)).toString('base64url');
  const nom = `sb-${PROJECT_REF}-auth-token`;
  const cookies = [];
  if (value.length <= 3180) cookies.push({ name: nom, value });
  else for (let i = 0; i * 3180 < value.length; i++) cookies.push({ name: `${nom}.${i}`, value: value.slice(i * 3180, (i + 1) * 3180) });
  const hote = new URL(BASE).hostname;
  return cookies.map(c => ({ ...c, domain: hote, path: '/' }));
}

/**
 * Ce qu'un HUMAIN verrait, ou ne verrait pas.
 * ⚠️ Cette fonction est sérialisée puis exécutée DANS le navigateur
 * (page.evaluate) : `document`, `innerHeight` et `getComputedStyle` y sont
 * ceux de la page, pas ceux de Node. ESLint analyse le fichier en contexte
 * Node et ne peut pas le deviner, d'où la déclaration ci-dessous.
 */
/* global document, getComputedStyle, innerHeight */
const RELEVE = () => {
  const invisibles = [];
  const scrollDrivenTexte = [];
  for (const e of document.querySelectorAll('body *')) {
    const texte = (e.innerText || '').trim();
    if (texte.length < 20) continue;
    // Ne garder que les éléments qui PORTENT le texte, pas leurs ancêtres.
    const propre = [...e.children].every(c => (c.innerText || '').trim().length < texte.length);
    const cs = getComputedStyle(e);
    if (cs.display === 'none' || cs.visibility === 'hidden') continue;
    const op = Number(cs.opacity);
    const r = e.getBoundingClientRect();
    const dansLEcran = r.top < innerHeight && r.bottom > 0 && r.width > 0;
    if (op < 0.15 && propre && dansLEcran) {
      invisibles.push({
        cls: (e.className || '').toString().replace(/jsx-\S+\s*/g, '').trim().slice(0, 40),
        tag: e.tagName, op, texte: texte.slice(0, 45),
      });
    }
    const tl = cs.animationTimeline || 'auto';
    if (/view|scroll/.test(tl) && propre && op < 0.99 && dansLEcran) {
      scrollDrivenTexte.push({
        cls: (e.className || '').toString().replace(/jsx-\S+\s*/g, '').trim().slice(0, 40),
        tl, op, texte: texte.slice(0, 40),
      });
    }
  }
  return { invisibles, scrollDrivenTexte };
};

const PUBLIQUES = [
  ['/', 'landing'],
  ['/p/atelier-soleil', 'portail démo'],
  ['/p/melyflow', 'portail Melyflow'],
  ['/p/atelier-soleil/essai', 'formulaire essai'],
  ['/connexion', 'connexion élève'],
  ['/login', 'login prof'],
  ['/creer-mon-studio', 'guichet concierge'],
  ['/embed/atelier-soleil', 'planning intégrable'],
  ['/embed/atelier-soleil/offres', 'offres intégrables'],
  ['/p/atelier-soleil/espace', 'espace élève'],
  ['/aide', 'guide'],
];
const CONNECTEES = [
  ['/dashboard', 'tableau de bord'],
  ['/agenda', 'agenda'],
  ['/clients', 'élèves'],
  ['/cours', 'cours'],
  ['/offres', 'offres'],
  ['/revenus', 'revenus'],
  ['/messagerie', 'messagerie'],
  ['/parametres', 'paramètres'],
  ['/cas-a-traiter', 'à traiter'],
  ['/equipe', 'équipe'],
  ['/essais', 'essais'],
];

let pagesKo = 0, pagesVues = 0;
const browser = await webkit.launch();
console.log(`Audit Safari (WebKit) — ${BASE}\n`);

async function passer(page, chemins, etiquette) {
  console.log(`── ${etiquette} ──`);
  for (const [chemin, nom] of chemins) {
    const erreurs = [];
    const console_ = [];
    const onErr = e => erreurs.push(String(e).slice(0, 120));
    const onCons = m => { if (m.type() === 'error') console_.push(m.text().slice(0, 100)); };
    page.on('pageerror', onErr);
    page.on('console', onCons);
    try {
      let rep = null;
      for (let i = 0; i < 3; i++) {
        try { rep = await page.goto(BASE + chemin, { waitUntil: 'domcontentloaded', timeout: 30000 }); break; }
        catch (e) { if (i === 2 || !/interrupted|ERR_ABORTED/i.test(e.message)) throw e; await attendre(1200); }
      }
      // Laisser l'hydratation ET les animations d'apparition finir : une
      // lecture trop tôt accuse l'app d'un défaut d'horloge (leçon v100).
      await attendre(3500);
      const { invisibles, scrollDrivenTexte } = await page.evaluate(RELEVE);
      pagesVues++;
      const souci = erreurs.length || console_.length || invisibles.length || scrollDrivenTexte.length;
      if (!souci) {
        console.log(`  OK  ${nom} (${rep?.status()})`);
      } else {
        pagesKo++;
        console.log(`  ⚠️  ${nom} (${rep?.status()})`);
        for (const e of erreurs) console.log(`        ERREUR DE PAGE : ${e}`);
        for (const c of console_.slice(0, 3)) console.log(`        console : ${c}`);
        for (const i of invisibles.slice(0, 4)) {
          console.log(`        INVISIBLE (op ${i.op}) <${i.tag} class="${i.cls}"> « ${i.texte} »`);
        }
        for (const s of scrollDrivenTexte.slice(0, 3)) {
          console.log(`        piloté au scroll (${s.tl}) « ${s.texte} »`);
        }
      }
    } catch (e) {
      pagesKo++; pagesVues++;
      console.log(`  ⚠️  ${nom} : ${String(e.message).slice(0, 90)}`);
    } finally {
      page.off('pageerror', onErr);
      page.off('console', onCons);
    }
  }
  console.log('');
}

try {
  const ctxPublic = await browser.newContext({ viewport: { width: 390, height: 844 } });
  await passer(await ctxPublic.newPage(), PUBLIQUES, 'Pages publiques (mobile 390px, anonyme)');
  await ctxPublic.close();

  const ctxProf = await browser.newContext({ viewport: { width: 390, height: 844 } });
  await ctxProf.addCookies(await sessionCookies(PROF_EMAIL));
  await passer(await ctxProf.newPage(), CONNECTEES, 'Espace prof (mobile 390px, session démo)');
  await ctxProf.close();
} finally {
  await browser.close();
}

console.log(`${pagesVues - pagesKo}/${pagesVues} pages sans réserve.`);
process.exit(pagesKo === 0 ? 0 : 1);
