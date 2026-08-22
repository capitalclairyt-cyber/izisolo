/**
 * Preuve — les 5 feedbacks du 2026-08-21 (Camille + compte de formation Léa).
 *
 * Vrai navigateur sur :3333, compte démo, CHEMIN RÉEL.
 *
 *   1. « Le bouton précédent sur la création de cours ouvre l'agenda »
 *      → retour vers /cours, sauf si on venait d'une case datée de l'agenda.
 *   2. « La création de cours renvoie sur l'agenda d'aujourd'hui »
 *      → cours témoin CRÉÉ par le formulaire, l'agenda s'ouvre sur SA date.
 *   3. « Lieux n'a pas de bouton enregistrer »
 *      → la carte dit que chaque lieu est enregistré à la validation.
 *   4. « Toujours pas possible de modifier le nombre de cours d'une série »
 *      → lien depuis la fiche du cours, qui ouvre le panneau « Ajuster ».
 *   5. « La cellule d'écriture est toute petite » (messagerie)
 *      → ~3 lignes sur desktop, 1 ligne sur mobile (style CALCULÉ, pas la
 *        présence d'une classe : styled-jsx × composants, piège maison).
 *
 * Le cours témoin est supprimé en fin de run. Re-runnable.
 * Usage : node scripts/proof-feedbacks-2026-08-21.mjs [dossier-sortie]
 */
import { createClient } from '@supabase/supabase-js';
import { readFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = process.cwd();
const OUT = process.argv[2] || join(process.env.TEMP || '.', 'proof-feedbacks');
mkdirSync(OUT, { recursive: true });
const BASE = 'http://localhost:3333';
const PROF_EMAIL = 'bonjour@melutek.com';
const TAG = '[preuve feedback]';

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

async function lireTexte(page, essais = 5) {
  for (let i = 0; i < essais; i++) {
    try { return await page.evaluate(() => document.body.innerText); }
    catch (e) {
      if (!/context was destroyed|navigation/i.test(e.message) || i === essais - 1) throw e;
      await attendre(1500);
    }
  }
  return '';
}

// Deux goto() qui s'enchaînent trop vite sur le dev server : le premier
// chargement RSC est encore en vol, Chromium annule (ERR_ABORTED). Artefact de
// navigation, pas un défaut de l'app : on retente.
async function naviguer(page, url, essais = 3) {
  for (let i = 0; i < essais; i++) {
    try { await page.goto(url, { waitUntil: 'domcontentloaded' }); return; }
    catch (e) {
      if (!/ERR_ABORTED|interrupted/i.test(e.message) || i === essais - 1) throw e;
      await attendre(1500);
    }
  }
}

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

// Une série récurrente du démo, pour le feedback n°4.
const { data: coursRec } = await admin
  .from('cours')
  .select('id, nom, recurrence_parent_id')
  .eq('profile_id', profileId)
  .not('recurrence_parent_id', 'is', null)
  .limit(1);
const coursSerie = coursRec?.[0] || null;
console.log(coursSerie
  ? `📚 cours de série témoin : « ${coursSerie.nom} »`
  : '⚠️ aucun cours récurrent sur le démo : le test n°4 sera sauté');

// Une conversation du démo, pour ouvrir le composeur (feedback n°5).
const { data: membres } = await admin
  .from('conversation_members')
  .select('conversation_id')
  .eq('profile_id', profileId)
  .limit(1);
const convId = membres?.[0]?.conversation_id || null;

// Date du cours témoin : dans 70 jours (hors du mois courant, pour que
// « l'agenda d'aujourd'hui » et « l'agenda de la date » soient distincts).
const dCible = new Date(Date.now() + 70 * 86400000);
const DATE_CIBLE = dCible.toISOString().slice(0, 10);

let ctx, coursTemoinId = null;
try {
  ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  await ctx.addCookies(profSession.cookies.map(c => ({ ...c, url: BASE, sameSite: 'Lax' })));
  const page = await ctx.newPage();

  // ═══ 1. Le bouton retour de la création de cours ═══
  console.log('\n— 1. Le bouton précédent de /cours/nouveau —');
  await naviguer(page, `${BASE}/cours/nouveau`);
  await page.waitForSelector('.back-btn', { timeout: 30000 });
  const retourNu = await page.getAttribute('.back-btn', 'href');
  assert(retourNu === '/cours', `sans paramètre, le retour va sur Cours & Évènements (${retourNu})`);

  await naviguer(page, `${BASE}/cours/nouveau?date=${DATE_CIBLE}`);
  await page.waitForSelector('.back-btn', { timeout: 30000 });
  const retourDate = await page.getAttribute('.back-btn', 'href');
  assert(retourDate === `/agenda?date=${DATE_CIBLE}`,
    `venu d'une case datée de l'agenda, le retour y ramène (${retourDate})`);

  // ═══ 2. Après création, l'agenda s'ouvre sur la date du cours ═══
  console.log('\n— 2. La redirection après création —');
  await naviguer(page, `${BASE}/cours/nouveau`);
  await page.waitForSelector('input[placeholder="Ex : Yoga Vinyasa"]', { timeout: 30000 });
  // Remplir AVANT l'hydratation ne pose que la valeur DOM : l'état React reste
  // vide et le bouton d'envoi ne s'active jamais. On re-remplit jusqu'à ce que
  // React ait réellement reçu la saisie (bouton actif).
  for (let i = 0; i < 15; i++) {
    await page.fill('input[placeholder="Ex : Yoga Vinyasa"]', `${TAG} cours témoin`);
    await page.fill('input[type="date"]', DATE_CIBLE);
    const actif = await page.isEnabled('button[type="submit"].submit-btn').catch(() => false);
    if (actif) break;
    await attendre(1000);
  }
  assert(await page.isEnabled('button[type="submit"].submit-btn'), 'le formulaire est prêt à être envoyé');
  await page.click('button[type="submit"].submit-btn');
  await page.waitForURL(/\/agenda/, { timeout: 45000 });
  const url = new URL(page.url());
  assert(url.pathname === '/agenda' && url.searchParams.get('date') === DATE_CIBLE,
    `l'agenda s'ouvre sur ${url.searchParams.get('date') || 'aujourd\'hui'} (attendu ${DATE_CIBLE})`);

  const { data: cree } = await admin.from('cours')
    .select('id, date').eq('profile_id', profileId).ilike('nom', `${TAG}%`).limit(1);
  coursTemoinId = cree?.[0]?.id || null;
  assert(cree?.[0]?.date === DATE_CIBLE, `le cours est bien créé au ${cree?.[0]?.date}`);
  await attendre(2500);
  const txtAgenda = await lireTexte(page);
  assert(txtAgenda.includes(`${TAG} cours témoin`),
    'le cours qu\'on vient de créer est VISIBLE à l\'arrivée (avant, agenda vide)');
  await page.screenshot({ path: join(OUT, '2-agenda-apres-creation.png') });

  // ═══ 3. La carte Lieux dit qu'elle enregistre toute seule ═══
  console.log('\n— 3. La carte Lieux —');
  await naviguer(page, `${BASE}/parametres?tab=profil&s=lieux`);
  await page.waitForSelector('.section-desc', { timeout: 30000 });
  await attendre(2000);
  const txtLieux = await lireTexte(page);
  assert(/enregistré dès que tu l'ajoutes ou le modifies/.test(txtLieux),
    'la carte dit explicitement qu\'il n\'y a rien à valider');

  // ═══ 4. Le chemin vers « Ajuster la série » depuis la fiche du cours ═══
  if (coursSerie) {
    console.log('\n— 4. Depuis la fiche du cours, changer le nombre de séances —');
    await naviguer(page, `${BASE}/cours/${coursSerie.id}`);
    await page.waitForSelector('.recurrence-toggle', { timeout: 30000 });
    // Même précaution qu'au formulaire : un clic avant hydratation n'ouvre
    // rien. On re-clique jusqu'à ce que le panneau apparaisse.
    let panneau = false;
    for (let i = 0; i < 15 && !panneau; i++) {
      await page.click('.recurrence-toggle').catch(() => {});
      panneau = await page.waitForSelector('.recurrence-ajuster-lien', { timeout: 2000 })
        .then(() => true, () => false);
    }
    assert(panneau, 'le panneau « Modifier la série récurrente » s\'ouvre');

    const lien = await page.evaluate(() => {
      const el = document.querySelector('.recurrence-ajuster-lien');
      const cs = getComputedStyle(el);
      return { href: el.getAttribute('href'), display: cs.display, decoration: cs.textDecorationLine };
    });
    assert(lien.href === `/cours/recurrences?rec=${coursSerie.recurrence_parent_id}&ajuster=1`,
      `le lien pointe sur la bonne série (${lien.href})`);
    // Le lien est un <Link> : règle SCOPÉE = jamais appliquée (piège maison).
    assert(lien.display === 'flex' && lien.decoration === 'none',
      `le lien est réellement stylé (display=${lien.display}, soulignement=${lien.decoration})`);
    await page.screenshot({ path: join(OUT, '4-lien-ajuster.png') });

    await page.click('.recurrence-ajuster-lien');
    await page.waitForURL(/\/cours\/recurrences/, { timeout: 30000 });
    await attendre(3000);
    const txtRec = await lireTexte(page);
    assert(/nouvelle date de fin|Ajuster la série|date de fin/i.test(txtRec),
      'le panneau « Ajuster la série » est OUVERT à l\'arrivée, sans un clic de plus');
    await page.screenshot({ path: join(OUT, '4-panneau-ajuster.png') });
  }

  // ═══ 5. Le composeur de messagerie ═══
  console.log('\n— 5. La cellule d\'écriture de la messagerie —');
  const mesureComposer = async () => page.evaluate(() => {
    const ta = document.querySelector('.ci-textarea');
    if (!ta) return null;
    const cs = getComputedStyle(ta);
    return { hauteur: Math.round(ta.getBoundingClientRect().height), resize: cs.resize };
  });

  // Ouverture par ?conv=<id> (déjà supporté par la page) plutôt que par un
  // clic : un clic avant hydratation n'ouvre rien, et le test se sauterait
  // tout seul en annonçant « composeur introuvable » — un test sauté ne
  // prouve rien.
  assert(!!convId, `une conversation du démo pour ouvrir le composeur (${convId || 'aucune'})`);
  await naviguer(page, `${BASE}/messagerie?conv=${convId}`);
  await page.waitForSelector('.ci-textarea', { timeout: 45000 });
  await attendre(1200);

  const desktop = await mesureComposer();
  {
    assert(desktop.hauteur >= 70,
      `desktop : la boîte fait ${desktop.hauteur} px (~3 lignes, contre 38 px avant)`);
    assert(desktop.resize === 'vertical', `desktop : redimensionnable à la main (resize=${desktop.resize})`);
    await page.screenshot({ path: join(OUT, '5-composer-desktop.png') });

    await page.setViewportSize({ width: 390, height: 844 });
    await attendre(1500);
    const mobile = await mesureComposer();
    assert(mobile && mobile.hauteur <= 50,
      `mobile : la boîte reste compacte (${mobile?.hauteur} px, le clavier prend déjà la moitié de l'écran)`);
    await page.screenshot({ path: join(OUT, '5-composer-mobile.png') });
    await page.setViewportSize({ width: 1280, height: 900 });
  }

} finally {
  if (coursTemoinId) {
    await admin.from('presences').delete().eq('cours_id', coursTemoinId);
    await admin.from('cours').delete().eq('id', coursTemoinId);
  }
  const { count } = await admin.from('cours')
    .select('id', { count: 'exact', head: true })
    .eq('profile_id', profileId).ilike('nom', `${TAG}%`);
  assert((count || 0) === 0, `ménage : 0 cours témoin restant (${count})`);
  if (ctx) await ctx.close();
  await browser.close();
}

console.log(`\n${ko === 0 ? '✅' : '❌'} ${ok}/${ok + ko} vérifications — captures dans ${OUT}`);
process.exit(ko === 0 ? 0 : 1);
