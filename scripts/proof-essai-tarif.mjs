/**
 * Preuve — tarif du cours d'essai PAR TYPE DE COURS (v92, retour Kim
 * 2026-08-20). AUTO-ADAPTATIVE : détecte si la migration v92 est appliquée.
 *
 *  - PRÉ-migration (mode dégradé) : le formulaire d'essai s'affiche au prix
 *    unique (la lecture défensive renvoie null, rien ne casse), et on prouve
 *    au niveau DB pourquoi le serializer doit rendre `undefined` (un update
 *    qui nomme la colonne absente → 42703, un update qui l'omet → OK).
 *  - POST-migration (mode complet) : surcharge posée ({type: 10} avec défaut
 *    15) → « dès 10€ » avant sélection, prix EXACT par séance sélectionnée
 *    (10€ sur la typée, 15€ sur la sans-type), CTA de la page cours « · 10€ »,
 *    CTA de la home « dès 10€ ».
 *
 * Vrai navigateur sur :3333 + DB réelle. Réglages essai SAUVEGARDÉS puis
 * RESTAURÉS ; séances témoins purgées. Aucun POST → aucun email, aucune
 * demande d'essai créée. Usage : node scripts/proof-essai-tarif.mjs [dossier]
 */
import { createClient } from '@supabase/supabase-js';
import { readFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { getAllTypesFromCategories } from '../lib/utils.js';

const ROOT = process.cwd();
const OUT = process.argv[2] || join(process.env.TEMP || '.', 'proof-essai-tarif');
mkdirSync(OUT, { recursive: true });
const BASE = 'http://localhost:3333';
const MARQUEUR = '[preuve essai-tarif]';
// Studio d'essai : le démo VISUELS (plan pro → capacité cours_essai sûre).
const STUDIO_SLUG = 'atelier-soleil';

const env = Object.fromEntries(
  readFileSync(join(ROOT, '.env.local'), 'utf8')
    .split('\n').filter(l => l.includes('=') && !l.startsWith('#'))
    .map(l => [l.slice(0, l.indexOf('=')).trim(), l.slice(l.indexOf('=') + 1).trim()])
);
const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

let ok = 0, ko = 0;
const assert = (cond, label) => {
  if (cond) { ok++; console.log(`  ✅ ${label}`); }
  else { ko++; console.log(`  ❌ ${label}`); }
};
const attendre = ms => new Promise(r => setTimeout(r, ms));

for (let i = 0; i < 60; i++) {
  try { const r = await fetch(`${BASE}/login`); if (r.ok) break; } catch { /* pas prêt */ }
  await attendre(2000);
  if (i === 59) { console.error('dev server injoignable'); process.exit(1); }
}
console.log('🌐 dev server prêt');

// ── v92 appliquée ? (select ciblé : 42703 = colonne absente) ────────────────
const { error: probeErr } = await admin.from('profiles').select('essai_prix_par_type').limit(1);
const migree = !probeErr;
console.log(migree ? '🧭 v92 APPLIQUÉE → preuve complète' : '🧭 v92 absente → preuve du chemin DÉGRADÉ');

const { data: studio } = await admin
  .from('profiles')
  .select('id, studio_nom, studio_slug, types_cours, essai_actif, essai_mode, essai_paiement, essai_prix')
  .eq('studio_slug', STUDIO_SLUG)
  .single();
if (!studio) { console.error(`studio ${STUDIO_SLUG} introuvable`); process.exit(1); }
const types = getAllTypesFromCategories(studio.types_cours);
if (types.length === 0) { console.error('le studio n\'a aucun type de cours'); process.exit(1); }
const T1 = types[0];
console.log(`👤 studio : ${studio.studio_nom} — type témoin « ${T1} »`);

// Sauvegarde des réglages (restaurés en finally)
const originaux = {
  essai_actif: studio.essai_actif,
  essai_mode: studio.essai_mode,
  essai_paiement: studio.essai_paiement,
  essai_prix: studio.essai_prix,
};
let surchargesOriginales;
if (migree) {
  const { data } = await admin.from('profiles').select('essai_prix_par_type').eq('id', studio.id).single();
  surchargesOriginales = data?.essai_prix_par_type ?? null;
}

const purger = () => admin.from('cours').delete().eq('profile_id', studio.id).ilike('nom', `${MARQUEUR}%`);

let browser, ctx;
try {
  await purger();
  // Config témoin : essai actif, payant sur place, 15 € par défaut
  const config = { essai_actif: true, essai_paiement: 'sur_place', essai_prix: 15 };
  if (migree) config.essai_prix_par_type = { [T1]: 10 };
  const { error: eCfg } = await admin.from('profiles').update(config).eq('id', studio.id);
  if (eCfg) throw new Error(`config essai : ${eCfg.message}`);

  const demain = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
  const apresDemain = new Date(Date.now() + 2 * 86400000).toISOString().slice(0, 10);
  const insCours = (extra) => admin.from('cours')
    .insert({ profile_id: studio.id, heure: '18:00', duree_minutes: 60, capacite_max: 8, visibilite: 'public', ...extra })
    .select('id').single();
  const { data: cT, error: e1 } = await insCours({ nom: `${MARQUEUR} Séance typée`, type_cours: T1, date: demain });
  if (e1) throw new Error(`cours typé : ${e1.message}`);
  const { data: cSans, error: e2 } = await insCours({ nom: `${MARQUEUR} Séance sans type`, type_cours: null, date: apresDemain });
  if (e2) throw new Error(`cours sans type : ${e2.message}`);
  console.log(`🌱 config posée + 2 séances témoins (${demain} typée « ${T1} », ${apresDemain} sans type)`);

  let chromium;
  try { ({ chromium } = await import('playwright')); }
  catch { ({ chromium } = await import('@playwright/test')); }
  try { browser = await chromium.launch(); }
  catch { browser = await chromium.launch({ channel: 'msedge' }); }
  ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();

  const gotoHydrate = async (url) => {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 90000 });
    await page.waitForLoadState('networkidle', { timeout: 60000 }).catch(() => {});
    await attendre(1000);
  };

  if (!migree) {
    // ═══ DÉGRADÉ 1. Le formulaire d'essai vit au prix unique ═══
    console.log('\n— dégradé 1. /essai : prix unique, zéro casse —');
    await gotoHydrate(`${BASE}/p/${STUDIO_SLUG}/essai`);
    assert(await page.getByText('15€ à régler sur place').count() > 0, 'bannière « 15€ à régler sur place » (prix unique)');
    assert(await page.getByText(/dès \d+€/).count() === 0, 'pas de « dès X€ » (aucune surcharge lisible pré-migration)');
    await page.screenshot({ path: join(OUT, 'degrade-1-essai.png') });

    // ═══ DÉGRADÉ 2. Le mécanisme du serializer, prouvé au niveau DB ═══
    console.log('\n— dégradé 2. undefined omis = la carte Paramètres se sauve —');
    const { error: eOmis } = await admin.from('profiles')
      .update({ essai_prix: 15, essai_prix_par_type: undefined })
      .eq('id', studio.id);
    assert(!eOmis, 'update SANS la colonne (undefined omis du payload) → OK pré-migration');
    const { error: eNomme } = await admin.from('profiles')
      .update({ essai_prix_par_type: { [T1]: 10 } })
      .eq('id', studio.id);
    assert(!!eNomme, `update qui NOMME la colonne absente → refusé (${eNomme?.code || 'erreur'}) : d'où le serializer défensif`);
  } else {
    // ═══ COMPLET 1. Formulaire d'essai : « dès 10€ » puis prix par séance ═══
    console.log('\n— complet 1. /essai : « dès 10€ », puis le prix suit la séance —');
    await gotoHydrate(`${BASE}/p/${STUDIO_SLUG}/essai`);
    assert(await page.getByText('dès 10€ à régler sur place').count() > 0, 'avant sélection : « dès 10€ à régler sur place (selon le cours) »');
    await page.screenshot({ path: join(OUT, 'complet-1-des.png') });
    await page.getByText(`${MARQUEUR} Séance typée`).first().click();
    await attendre(400);
    assert(await page.getByText(/(^|\s)10€ à régler sur place/).count() > 0, `séance « ${T1} » sélectionnée → 10€`);
    await page.getByText(`${MARQUEUR} Séance sans type`).first().click();
    await attendre(400);
    assert(await page.getByText(/(^|\s)15€ à régler sur place/).count() > 0, 'séance sans type sélectionnée → 15€ (défaut)');
    await page.screenshot({ path: join(OUT, 'complet-2-selection.png') });

    // ═══ COMPLET 2. Page publique du cours typé : CTA « · 10€ » ═══
    console.log('\n— complet 2. page cours : CTA essai au prix de LA séance —');
    await gotoHydrate(`${BASE}/p/${STUDIO_SLUG}/cours/${cT.id}`);
    assert(await page.getByText('Premier cours d\'essai · 10€').count() > 0, 'CTA « Premier cours d\'essai · 10€ » (surcharge du type)');
    await page.screenshot({ path: join(OUT, 'complet-3-cta-cours.png') });
    await gotoHydrate(`${BASE}/p/${STUDIO_SLUG}/cours/${cSans.id}`);
    assert(await page.getByText('Premier cours d\'essai · 15€').count() > 0, 'cours sans type → CTA au prix par défaut 15€');

    // ═══ COMPLET 3. Home portail : « dès 10€ » ═══
    console.log('\n— complet 3. home portail : CTA « dès 10€ » —');
    await gotoHydrate(`${BASE}/p/${STUDIO_SLUG}`);
    assert(await page.getByText('Réserve ton cours d\'essai · dès 10€').count() > 0, 'CTA home « Réserve ton cours d\'essai · dès 10€ »');
    await page.screenshot({ path: join(OUT, 'complet-4-home.png') });

    // ═══ COMPLET 4. Sanitization à l'écriture (niveau DB, mêmes règles que le spec) ═══
    console.log('\n— complet 4. la carte écrite est nettoyée par le serializer côté app —');
    // (le serializer est verrouillé par essai-tarif.spec.js ; ici on vérifie
    // simplement que la colonne accepte et rend le jsonb tel quel)
    const { data: relu } = await admin.from('profiles').select('essai_prix_par_type').eq('id', studio.id).single();
    assert(relu?.essai_prix_par_type?.[T1] === 10, 'DB : la surcharge {type: 10} est bien posée et relue');
  }
} finally {
  const restore = { ...originaux };
  if (migree) restore.essai_prix_par_type = surchargesOriginales;
  await admin.from('profiles').update(restore).eq('id', studio.id);
  await purger();
  console.log('\n🧹 réglages essai restaurés + séances témoins purgées');
  try { await ctx?.close(); await browser?.close(); } catch { /* rien */ }
}

console.log(`\n═══ RÉSULTAT (${migree ? 'COMPLET post-v92' : 'DÉGRADÉ pré-v92'}) : ${ok} ✅ · ${ko} ❌ — captures dans ${OUT} ═══`);
process.exit(ko === 0 ? 0 : 1);
