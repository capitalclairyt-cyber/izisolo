/**
 * Captures d'illustration du CENTRE D'AIDE (2026-08-24, demande Colin) —
 * une image par tuto de /aide, prises sur le compte démo « L'Atelier Soleil »
 * fraîchement refreshé, contre la PROD (le rendu réel que voient les profs).
 *
 * Sortie : public/icons/aide/<id-du-tuto>.png (+ manifest.json avec les
 * dimensions, pour renseigner width/height de next/image dans le guide).
 * ⚠️ /public/icons/ est le SEUL dossier public servi (proxy default-deny, §12).
 *
 * ZÉRO ÉCRITURE : aucune conversation non lue ouverte (la liste suffit, les
 * badges non-lus sont l'illustration), aucun formulaire validé (le tunnel de
 * vente est ouvert pour la photo puis abandonné), aucune séance pointée.
 *
 * Session : magic link admin → verifyOtp → cookie @supabase/ssr (le pattern
 * prouvé de shoot-demo-atelier-soleil.mjs). Re-runnable à volonté.
 */
import { createClient } from '@supabase/supabase-js';
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

// Dimensions d'un PNG sans dépendance : le chunk IHDR porte largeur/hauteur
// en big-endian aux octets 16-23 (après la signature 8 o + longueur/type 8 o).
const sizeOfLib = (buf) => ({ width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) });

const ROOT = process.cwd();
const env = Object.fromEntries(
  readFileSync(join(ROOT, '.env.local'), 'utf8')
    .split('\n').filter(l => l.includes('=') && !l.startsWith('#'))
    .map(l => [l.slice(0, l.indexOf('=')).trim(), l.slice(l.indexOf('=') + 1).trim()])
);
const OUT = join(ROOT, 'public', 'icons', 'aide');
mkdirSync(OUT, { recursive: true });
const BASE = process.env.SHOOT_BASE || 'https://www.izisolo.fr';
const EMAIL = 'camille@atelier-soleil.fr';
const PROJECT_REF = new URL(env.NEXT_PUBLIC_SUPABASE_URL).hostname.split('.')[0];

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
console.log('🔑 session démo prête —', BASE);

let chromium;
try { ({ chromium } = await import('playwright')); }
catch { ({ chromium } = await import('@playwright/test')); }
let browser;
try { browser = await chromium.launch({ channel: 'msedge' }); }
catch { browser = await chromium.launch(); }

const manifest = {};
let ok = 0, ko = 0;

/** Capture une page (ou un élément) : id = nom de fichier ET clé du manifest. */
async function shoot(ctx, id, url, { attendre = null, avant = null, element = null, scrollA = null, jpeg = false } = {}) {
  const page = await ctx.newPage();
  try {
    // Captures PROPRES : le FAB feedback (bulle « Un truc à dire ? ») n'a rien
    // à faire sur une illustration de tuto. Masqué à la capture seulement.
    await page.addInitScript(() => {
      const style = document.createElement('style');
      style.textContent = '.feedback-fab-wrapper { display: none !important; }';
      document.addEventListener('DOMContentLoaded', () => document.head.appendChild(style));
    });
    await page.goto(`${BASE}${url}`, { waitUntil: 'domcontentloaded', timeout: 60000 });
    if (attendre) await page.waitForSelector(attendre, { timeout: 45000 });
    await page.waitForTimeout(2500);
    if (avant) await avant(page);
    if (scrollA) {
      await page.locator(scrollA).first().scrollIntoViewIfNeeded({ timeout: 8000 });
      await page.waitForTimeout(600);
    }
    // JPEG pour les pages à photos (le portail : sa couverture ferait un PNG
    // de 2 Mo) ; PNG ailleurs (texte d'UI net). Dimensions JPEG : déduites du
    // viewport ×2 (toujours une capture pleine vue, jamais un élément).
    const ext = jpeg ? 'jpg' : 'png';
    const fichier = join(OUT, `${id}.${ext}`);
    if (element) await page.locator(element).first().screenshot({ path: fichier });
    else await page.screenshot({ path: fichier, fullPage: false, ...(jpeg ? { type: 'jpeg', quality: 85 } : {}) });
    const vp = page.viewportSize();
    const dim = jpeg ? { width: vp.width * 2, height: vp.height * 2 } : sizeOfLib(readFileSync(fichier));
    manifest[id] = { w: dim.width, h: dim.height, ext };
    ok++;
    console.log(`📸 ${id}.${ext} (${dim.width}×${dim.height})`);
  } catch (e) {
    ko++;
    console.log(`❌ ${id} : ${e.message.slice(0, 120)}`);
  } finally {
    await page.close().catch(() => {});
  }
}

// ── Repères DB pour les captures ciblées (lecture seule) ────────────────────
const { data: demoProfil } = await admin.from('profiles').select('id').eq('studio_slug', 'atelier-soleil').single();
const { data: premOffre } = await admin.from('offres').select('id, nom').eq('profile_id', demoProfil.id).eq('actif', true).order('ordre').limit(1);
const offreNom = premOffre?.[0]?.nom || '';
// Une séance À VENIR avec des inscrites : l'écran de pointage montrera le
// bandeau verrou + « Pointer quand même », exactement ce que le tuto raconte.
const aujourdhui = new Date().toISOString().slice(0, 10);
const { data: coursAVenir } = await admin.from('cours')
  .select('id, nom, date')
  .eq('profile_id', demoProfil.id)
  .gte('date', aujourdhui)
  .eq('est_annule', false)
  .order('date')
  .limit(12);
let coursPointage = null;
for (const co of coursAVenir || []) {
  const { count } = await admin.from('presences').select('id', { count: 'exact', head: true }).eq('cours_id', co.id);
  if ((count || 0) >= 3) { coursPointage = co; break; }
}
console.log(`repères : offre « ${offreNom} » · pointage ${coursPointage ? coursPointage.nom + ' (' + coursPointage.date + ')' : 'AUCUN'}`);

// ── Contexte prof (desktop, dSF 2 pour la netteté — next/image recompresse) ──
const ctx = await browser.newContext({ viewport: { width: 1160, height: 760 }, deviceScaleFactor: 2 });
await ctx.addCookies(cookies.map(c => ({ ...c, url: BASE, sameSite: 'Lax' })));

// premier-cours — le formulaire de création, piloté en hebdomadaire par l'URL
// (astuce preFreq de la bible : déterministe, « Quel jour ? » rendu).
await shoot(ctx, 'premier-cours', '/cours/nouveau?frequence=hebdomadaire', { attendre: 'text=Quel jour ?' });
// agenda — la semaine du studio.
await shoot(ctx, 'agenda', '/agenda', { attendre: 'text=Agenda' });
// eleves — la liste (32 fiches du seed).
await shoot(ctx, 'eleves', '/clients', { attendre: 'text=Élèves' });
// offres — le catalogue.
await shoot(ctx, 'offres', '/offres', { attendre: 'text=Offres' });
// encaisser — LE tunnel de vente ouvert sur le règlement (aucune validation :
// on ouvre, on choisit « À régler plus tard », on photographie, on referme).
// Fiche ouverte par URL directe (id lu en DB) : la liste n'a pas de liens <a>.
const { data: ficheDemo } = await admin.from('clients')
  .select('id, prenom').eq('profile_id', demoProfil.id).eq('statut', 'actif').not('email', 'is', null).order('prenom').limit(1);
await shoot(ctx, 'encaisser', `/clients/${ficheDemo?.[0]?.id}`, {
  attendre: 'text=Ajouter une offre',
  avant: async (page) => {
    await page.waitForTimeout(1500);
    const btn = page.getByRole('button', { name: 'Ajouter une offre' }).first();
    for (let i = 0; i < 8 && !(await page.locator('.modal-sheet').count()); i++) {
      await btn.click({ timeout: 3000 }).catch(() => {});
      await page.waitForTimeout(900);
    }
    await page.waitForSelector('.modal-sheet', { timeout: 15000 });
    // 1re offre du catalogue (par son NOM lu en DB — la recette du proof v98)
    // → étape Paiement → « À régler plus tard »
    await page.locator('.modal-sheet').getByText(offreNom, { exact: false }).first().click();
    await page.waitForSelector('.modal-sheet >> text=Règlement', { timeout: 15000 });
    await page.getByRole('button', { name: 'À régler plus tard' }).click();
    await page.waitForTimeout(800);
  },
  element: '.modal-sheet',
});
// carnets-abos — la vue d'ensemble.
await shoot(ctx, 'carnets-abos', '/abonnements', { attendre: 'text=Carnets' });
// pointage — l'écran d'une séance À VENIR avec inscrites (verrou + porte
// « Pointer quand même »). Lecture seule, personne n'est pointé.
if (coursPointage) {
  await shoot(ctx, 'pointage', `/pointage/${coursPointage.id}`, { attendre: `text=${coursPointage.nom}` });
} else {
  console.log('❌ pointage : aucune séance à venir avec inscrites trouvée');
}
// cas-a-traiter — l'inbox (3 cas ouverts du seed).
await shoot(ctx, 'cas-a-traiter', '/cas-a-traiter', { attendre: 'text=À traiter' });
// regles-annulation — l'onglet Règles (deep-link B2e).
await shoot(ctx, 'regles-annulation', '/parametres?tab=regles', { attendre: 'text=Annulation' });
// messagerie — la LISTE (les non-lus sont l'illustration ; on n'ouvre RIEN :
// ouvrir marquerait lu, leçon du script de captures d'origine).
await shoot(ctx, 'messagerie', '/messagerie', { attendre: 'text=Messagerie' });
// factures — la carte « Facturation » des Paramètres (élément seul).
await shoot(ctx, 'factures', '/parametres?tab=profil&s=activite', {
  attendre: 'text=Facturation',
  element: 'div.section:has-text("Facturation")',
});
// urssaf — la page Revenus scrollée sur le bloc déclaration (« Ma déclaration
// URSSAF » configurée, « Prépare ta déclaration URSSAF » sinon : le substring
// couvre les deux états).
await shoot(ctx, 'urssaf', '/revenus', { attendre: 'text=Revenus', scrollA: 'text=déclaration URSSAF' });
// page-publique + cours-essai + liste-attente
await shoot(ctx, 'cours-essai', '/essais', { attendre: 'text=essai' });
await shoot(ctx, 'liste-attente', '/liste-attente', { attendre: 'text=Liste d\'attente' });

// Portail public (anonyme).
const pub = await browser.newContext({ viewport: { width: 1160, height: 760 }, deviceScaleFactor: 2 });
await shoot(pub, 'page-publique', '/p/atelier-soleil', { attendre: 'text=Atelier Soleil', jpeg: true });

// installer — mobile, contexte frais : la bannière « Installe IziSolo » du
// dashboard est exactement ce que le tuto décrit.
const mob = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
await mob.addCookies(cookies.map(c => ({ ...c, url: BASE, sameSite: 'Lax' })));
await shoot(mob, 'installer', '/dashboard', { attendre: 'text=Installe' });

await browser.close();
writeFileSync(join(OUT, 'manifest.json'), JSON.stringify(manifest, null, 2));
console.log(`\n${ok} capture(s), ${ko} échec(s) — manifest écrit.`);
console.log(Object.entries(manifest).map(([k, v]) => `  ${k}: ${v.w}×${v.h}`).join('\n'));
process.exit(ko === 0 ? 0 : 1);
