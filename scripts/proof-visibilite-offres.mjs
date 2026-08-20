/**
 * Preuve — lot « visibilité de l'existant » (retour Kim 2026-08-20) :
 *   1. /offres : bannière « tes élèves ne voient pas ta grille » quand
 *      afficher_tarifs = false + activation en 1 clic (DB vérifiée).
 *   2. PaiementStep : sous-texte sous « Payé maintenant » (argent déjà reçu).
 *   3. /cours/nouveau : la modale « Nouveau type » explique discipline OU format.
 *
 * Vrai navigateur sur :3333, compte démo. afficher_tarifs est SAUVEGARDÉ puis
 * RESTAURÉ ; offre témoin créée seulement si le démo n'en a aucune, puis purgée.
 * Usage : node scripts/proof-visibilite-offres.mjs [dossier-captures]
 */
import { createClient } from '@supabase/supabase-js';
import { readFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = process.cwd();
const OUT = process.argv[2] || join(process.env.TEMP || '.', 'proof-visibilite');
mkdirSync(OUT, { recursive: true });
const BASE = 'http://localhost:3333';
const PROF_EMAIL = 'bonjour@melutek.com';

const env = Object.fromEntries(
  readFileSync(join(ROOT, '.env.local'), 'utf8')
    .split('\n').filter(l => l.includes('=') && !l.startsWith('#'))
    .map(l => [l.slice(0, l.indexOf('=')).trim(), l.slice(l.indexOf('=') + 1).trim()])
);
const PROJECT_REF = new URL(env.NEXT_PUBLIC_SUPABASE_URL).hostname.split('.')[0];
const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

let ok = 0, ko = 0;
const assert = (cond, label) => {
  if (cond) { ok++; console.log(`  ✅ ${label}`); }
  else { ko++; console.log(`  ❌ ${label}`); }
};
const attendre = ms => new Promise(r => setTimeout(r, ms));

async function sessionCookies(email) {
  const { data: linkData, error: eLink } = await admin.auth.admin.generateLink({ type: 'magiclink', email });
  if (eLink) throw new Error(`generateLink(${email}): ${eLink.message}`);
  const anon = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: otpData, error: eOtp } = await anon.auth.verifyOtp({ type: 'magiclink', token_hash: linkData.properties.hashed_token });
  if (eOtp || !otpData?.session) throw new Error(`verifyOtp(${email}): ${eOtp?.message || 'pas de session'}`);
  const value = 'base64-' + Buffer.from(JSON.stringify(otpData.session)).toString('base64url');
  const cookieName = `sb-${PROJECT_REF}-auth-token`;
  const cookies = [];
  if (value.length <= 3180) cookies.push({ name: cookieName, value });
  else for (let i = 0; i * 3180 < value.length; i++) cookies.push({ name: `${cookieName}.${i}`, value: value.slice(i * 3180, (i + 1) * 3180) });
  return { cookies, userId: otpData.session.user.id };
}

for (let i = 0; i < 60; i++) {
  try { const r = await fetch(`${BASE}/login`); if (r.ok) break; } catch { /* pas prêt */ }
  await attendre(2000);
  if (i === 59) { console.error('dev server injoignable'); process.exit(1); }
}
console.log('🌐 dev server prêt');

let chromium;
try { ({ chromium } = await import('playwright')); }
catch { ({ chromium } = await import('@playwright/test')); }
let browser;
try { browser = await chromium.launch(); }
catch { browser = await chromium.launch({ channel: 'msedge' }); }

const profSession = await sessionCookies(PROF_EMAIL);
const profileId = profSession.userId;
const { data: avant } = await admin.from('profiles').select('afficher_tarifs, studio_nom').eq('id', profileId).single();
console.log(`👤 prof démo : ${avant.studio_nom} (afficher_tarifs=${avant.afficher_tarifs})`);

let offreTemoinId = null;
let ctx;
try {
  // afficher_tarifs à FALSE pour déclencher la bannière (restauré en fin de run)
  await admin.from('profiles').update({ afficher_tarifs: false }).eq('id', profileId);
  const { data: offresActives } = await admin.from('offres')
    .select('id').eq('profile_id', profileId).eq('actif', true).in('type', ['carnet', 'abonnement']).limit(1);
  if (!offresActives?.length) {
    const { data: o, error } = await admin.from('offres')
      .insert({ profile_id: profileId, nom: '[preuve visib] Carnet', type: 'carnet', prix: 50, seances: 10, actif: true })
      .select('id').single();
    if (error) throw new Error(`offre témoin : ${error.message}`);
    offreTemoinId = o.id;
  }

  ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  await ctx.addCookies(profSession.cookies.map(c => ({ ...c, url: BASE, sameSite: 'Lax' })));
  const page = await ctx.newPage();

  // ═══ 1. Bannière grille invisible + activation 1 clic ═══
  console.log('\n— 1. /offres : bannière « tes élèves ne voient pas ta grille » —');
  await page.goto(`${BASE}/offres`, { waitUntil: 'domcontentloaded', timeout: 90000 });
  await page.waitForSelector('.tarhint', { timeout: 30000 });
  assert(await page.getByText('ne voient pas encore ta grille tarifaire').count() > 0, 'la bannière s\'affiche quand afficher_tarifs = false');
  await page.screenshot({ path: join(OUT, '1-banniere-grille.png') });
  await page.waitForLoadState('networkidle', { timeout: 60000 }).catch(() => {});
  await attendre(1200);
  await page.locator('.tarhint-btn').click();
  let flip = null;
  for (let i = 0; i < 15; i++) {
    await attendre(700);
    const { data } = await admin.from('profiles').select('afficher_tarifs').eq('id', profileId).single();
    if (data?.afficher_tarifs === true) { flip = data; break; }
  }
  assert(flip?.afficher_tarifs === true, 'DB : afficher_tarifs passé à true après le clic');
  assert(await page.getByText('ta grille tarifaire est visible sur ton portail').count() > 0, 'confirmation + lien « Voir ma page » affichés');
  await page.screenshot({ path: join(OUT, '2-banniere-activee.png') });

  // ═══ 2. PaiementStep : sous-texte « Payé maintenant » ═══
  console.log('\n— 2. Tunnel de vente : « Payé maintenant » explicité —');
  await page.goto(`${BASE}/offres`, { waitUntil: 'domcontentloaded', timeout: 90000 });
  await page.waitForLoadState('networkidle', { timeout: 60000 }).catch(() => {});
  await attendre(1200);
  // Bannière absente maintenant que le réglage est bon
  assert(await page.locator('.tarhint').count() === 0, 'la bannière a disparu (réglage désormais correct)');
  // Ouvrir le tunnel : bouton « Attribuer » (UserPlus) de la 1re offre, puis 1er client
  await page.locator('.offre-card button:has(svg.lucide-user-plus), button[title*="ttribuer"]').first().click().catch(async () => {
    await page.getByRole('button', { name: /attribuer/i }).first().click();
  });
  await attendre(800);
  const client1 = page.locator('.modal-body button, .modal-box button').filter({ hasText: /\w/ }).first();
  // Le picker liste les élèves : cliquer la 1re entrée cliquable du modal
  const entries = page.locator('.client-pick, .client-row, [class*="client"]').filter({ hasText: /\w/ });
  if (await entries.count() > 0) await entries.first().click();
  else await client1.click();
  await attendre(800);
  const hintPaye = await page.getByText('rien n\'est demandé à l\'élève').count();
  assert(hintPaye > 0, 'sous-texte « argent déjà reçu, rien demandé à l\'élève » visible sous Payé maintenant');
  await page.screenshot({ path: join(OUT, '3-paiement-step-hint.png') });

  // ═══ 3. Modale « Nouveau type » : discipline OU format ═══
  console.log('\n— 3. /cours/nouveau : un type peut être un FORMAT —');
  await page.goto(`${BASE}/cours/nouveau`, { waitUntil: 'domcontentloaded', timeout: 90000 });
  await page.waitForLoadState('networkidle', { timeout: 60000 }).catch(() => {});
  await attendre(1200);
  const chipNew = page.locator('.chip-new');
  if (await chipNew.count() === 0) {
    // Aucun type → le champ est replié : déplier d'abord
    await page.locator('.types-avance-toggle').click();
    await attendre(400);
  }
  await page.locator('.chip-new').click();
  await attendre(500);
  assert(await page.getByText('ou un format').count() > 0, 'la modale explique « discipline OU format (Collectif, Semi-privé, Particulier) »');
  await page.screenshot({ path: join(OUT, '4-nouveau-type-hint.png') });
} finally {
  await admin.from('profiles').update({ afficher_tarifs: avant.afficher_tarifs }).eq('id', profileId);
  if (offreTemoinId) await admin.from('offres').delete().eq('id', offreTemoinId);
  console.log(`\n🧹 afficher_tarifs restauré (${avant.afficher_tarifs})${offreTemoinId ? ' + offre témoin purgée' : ''}`);
  try { await ctx?.close(); await browser?.close(); } catch { /* rien */ }
}

console.log(`\n═══ RÉSULTAT : ${ok} ✅ · ${ko} ❌ — captures dans ${OUT} ═══`);
process.exit(ko === 0 ? 0 : 1);
