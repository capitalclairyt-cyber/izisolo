/**
 * Preuve — échéancier MULTI-MODES (question Colin 2026-08-20 : « 80 € en
 * liquide et 43 € en carte bancaire ? »). Le scénario exact, en un seul
 * geste dans le tunnel de vente :
 *   offre 123 € vendue en 2 versements datés du même jour, le 1er encaissé
 *   en ESPÈCES (80 €), le 2e encaissé en CB (43 €).
 *
 * Vérifie AUSSI le garde-fou (héritage fix Kim) : un versement coché « Payé »
 * sans mode → refus explicite, rien n'est écrit.
 *
 * Vrai navigateur sur :3333 + DB réelle (compte démo). Client, offre,
 * abonnement et paiements témoins créés puis PURGÉS. Aucun email.
 * Usage : node scripts/proof-echeancier-multimodes.mjs [dossier-captures]
 */
import { createClient } from '@supabase/supabase-js';
import { readFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = process.cwd();
const OUT = process.argv[2] || join(process.env.TEMP || '.', 'proof-echeancier');
mkdirSync(OUT, { recursive: true });
const BASE = 'http://localhost:3333';
const PROF_EMAIL = 'bonjour@melutek.com';
const MARQUEUR = '[preuve multi-modes]';

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

const profSession = await sessionCookies(PROF_EMAIL);
const profileId = profSession.userId;

const purger = async () => {
  const { data: cls } = await admin.from('clients').select('id').eq('profile_id', profileId).ilike('nom', `${MARQUEUR}%`);
  const ids = (cls || []).map(c => c.id);
  if (ids.length) {
    await admin.from('paiements').delete().in('client_id', ids);
    await admin.from('abonnements').delete().in('client_id', ids);
    await admin.from('clients').delete().in('id', ids);
  }
  await admin.from('offres').delete().eq('profile_id', profileId).ilike('nom', `${MARQUEUR}%`);
};

let browser, ctx;
try {
  await purger();
  const { data: cli, error: eCli } = await admin.from('clients')
    .insert({ profile_id: profileId, prenom: 'Kimtest', nom: `${MARQUEUR}`, email: 'kimtest-multimodes@example.com', statut: 'actif' })
    .select('id').single();
  if (eCli) throw new Error(`client témoin : ${eCli.message}`);
  const { data: off, error: eOff } = await admin.from('offres')
    .insert({ profile_id: profileId, nom: `${MARQUEUR} Carnet 123`, type: 'carnet', prix: 123, seances: 10, actif: true })
    .select('id').single();
  if (eOff) throw new Error(`offre témoin : ${eOff.message}`);
  console.log('🌱 client + offre témoins créés');

  let chromium;
  try { ({ chromium } = await import('playwright')); }
  catch { ({ chromium } = await import('@playwright/test')); }
  try { browser = await chromium.launch(); }
  catch { browser = await chromium.launch({ channel: 'msedge' }); }
  ctx = await browser.newContext({ viewport: { width: 1280, height: 950 } });
  await ctx.addCookies(profSession.cookies.map(c => ({ ...c, url: BASE, sameSite: 'Lax' })));
  const page = await ctx.newPage();

  // ═══ 1. Tunnel : offre → élève → échéancier 2 versements 80/43 ═══
  console.log('\n— 1. Tunnel de vente : échéancier 2 versements, modes différents —');
  await page.goto(`${BASE}/offres`, { waitUntil: 'domcontentloaded', timeout: 90000 });
  await page.waitForLoadState('networkidle', { timeout: 60000 }).catch(() => {});
  await attendre(1500);
  await page.locator('.offre-card', { hasText: `${MARQUEUR} Carnet 123` }).getByRole('button', { name: 'Vendre' }).click();
  await attendre(600);
  // Choisir l'élève témoin via la recherche du picker
  await page.locator('.modal-sheet input[type="text"], .modal-sheet input[type="search"]').first().fill('Kimtest');
  await attendre(500);
  await page.locator('.modal-sheet').getByText('Kimtest').first().click();
  await attendre(600);
  // Étape paiement : « En plusieurs fois » puis 2 versements
  await page.getByRole('button', { name: 'En plusieurs fois' }).click();
  await attendre(400);
  await page.getByRole('button', { name: '2x', exact: true }).click();
  await attendre(400);
  const montants = page.locator('.multi-v-montant-input');
  await montants.nth(0).fill('80');
  await montants.nth(1).fill('43');
  // Versement 2 : daté d'aujourd'hui (le scénario « les deux le même jour »)
  const aujourdHui = new Date().toLocaleDateString('sv-SE');
  await page.locator('.multi-v-date-input').nth(1).fill(aujourdHui);
  assert(await page.locator('.multi-v-enc input').nth(0).isChecked(), 'versement 1 : « Payé » coché par défaut (geste comptoir)');
  assert(!(await page.locator('.multi-v-enc input').nth(1).isChecked()), 'versement 2 : « À venir » par défaut');

  // ═══ 2. Garde-fou : encaissé sans mode = refus ═══
  console.log('\n— 2. Valider avec un versement payé SANS mode = refus —');
  await page.getByRole('button', { name: /Enregistrer l'échéancier/ }).click();
  await attendre(600);
  assert(await page.getByText('Un versement encaissé doit dire comment').count() > 0, 'refus explicite « choisis son mode »');
  const { count: avant } = await admin.from('paiements').select('id', { count: 'exact', head: true }).eq('client_id', cli.id);
  assert((avant || 0) === 0, 'DB : rien n\'a été écrit');
  await page.screenshot({ path: join(OUT, '1-refus-sans-mode.png') });

  // ═══ 3. 80 € espèces + 43 € CB, un seul geste ═══
  console.log('\n— 3. Espèces sur le 1er, CB sur le 2e → enregistrer —');
  await page.locator('.multi-v-mode').nth(0).selectOption('especes');
  await page.locator('.multi-v-enc input').nth(1).check();
  await attendre(300);
  await page.locator('.multi-v-mode').nth(1).selectOption('CB');
  await page.screenshot({ path: join(OUT, '2-deux-modes.png') });
  await page.getByRole('button', { name: /Enregistrer l'échéancier/ }).click();

  let rows = null;
  for (let i = 0; i < 20; i++) {
    await attendre(700);
    const { data } = await admin.from('paiements')
      .select('montant, statut, mode, date, echeancier_id')
      .eq('client_id', cli.id).order('montant', { ascending: false });
    if (data && data.length === 2) { rows = data; break; }
  }
  assert(!!rows, 'DB : 2 paiements écrits');
  if (rows) {
    const [p80, p43] = rows;
    assert(Number(p80.montant) === 80 && p80.statut === 'paid' && p80.mode === 'especes', `80 € payé en ESPÈCES (lu : ${p80.montant} ${p80.statut} ${p80.mode})`);
    assert(Number(p43.montant) === 43 && p43.statut === 'paid' && p43.mode === 'CB', `43 € payé en CB (lu : ${p43.montant} ${p43.statut} ${p43.mode})`);
    assert(p80.echeancier_id && p80.echeancier_id === p43.echeancier_id, 'les 2 versements partagent le même échéancier');
    assert(p80.date === aujourdHui && p43.date === aujourdHui, 'les 2 versements sont datés du même jour');
  }
  const { data: abo } = await admin.from('abonnements').select('id, statut, seances_total').eq('client_id', cli.id).maybeSingle();
  assert(abo?.statut === 'actif' && abo?.seances_total === 10, 'le carnet est attribué (actif, 10 séances)');
} finally {
  await purger();
  console.log('\n🧹 témoins purgés (client, offre, abonnement, paiements)');
  try { await ctx?.close(); await browser?.close(); } catch { /* rien */ }
}

console.log(`\n═══ RÉSULTAT : ${ok} ✅ · ${ko} ❌ — captures dans ${OUT} ═══`);
process.exit(ko === 0 ? 0 : 1);
