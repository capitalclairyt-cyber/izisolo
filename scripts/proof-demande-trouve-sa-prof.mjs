/**
 * PREUVE — « la demande d'offre trouve sa prof » (2026-08-23, retour terrain
 * Maude/Cécile le jour même du lancement v97).
 *
 * Ce que la première demande réelle a montré : la cloche ne connaissait pas le
 * type offre_demande (clic → /dashboard), la fiche de l'élève ne montrait
 * rien, et une vente faite depuis la fiche laissait la demande « À traiter »
 * dans la file de /offres (menace de doublon par « Attribuer l'offre »).
 *
 * On prouve en vrai navigateur (dev :3333, session prof démo Camille) :
 *   A. La fiche de l'élève porte le bandeau « 🛒 Demande d'offre à traiter »
 *      avec « Attribuer l'offre » et « Écarter ».
 *   B. « Attribuer l'offre » ouvre le tunnel DIRECTEMENT sur le règlement
 *      (l'offre est déjà choisie) ; la vente « À régler plus tard » aboutit,
 *      l'abonnement naît EN BASE et la demande passe « acceptee » (le solde
 *      auto par le chemin FICHE = le cas exact de Maude) ; le bandeau
 *      disparaît de la fiche.
 *   C. La cloche : la notif « Demande d'offre » a son bouton « Voir la
 *      demande » et le clic mène à /offres.
 *   D. « Écarter » depuis la fiche : statut « refusee » en base.
 *
 * Re-runnable : témoins purgés en finally, même en cas d'échec.
 */
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const BASE = 'http://localhost:3333';
const EMAIL_TEMOIN = 'temoin-demande-prof@example.com';

const env = Object.fromEntries(
  readFileSync(join(process.cwd(), '.env.local'), 'utf8')
    .split('\n').filter(l => l.includes('=') && !l.startsWith('#'))
    .map(l => [l.slice(0, l.indexOf('=')).trim(), l.slice(l.indexOf('=') + 1).trim()])
);
const PROJECT_REF = new URL(env.NEXT_PUBLIC_SUPABASE_URL).hostname.split('.')[0];
const svc = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

let ok = 0, ko = 0;
const c = (l, cond, d = '') => { if (cond) { ok++; console.log('  OK  ' + l + (d ? ' - ' + d : '')); } else { ko++; console.log('  KO  ' + l + (d ? ' - ' + d : '')); } };
const attendre = async (fn, ms = 12000, pas = 500) => {
  const fin = Date.now() + ms;
  for (;;) {
    const r = await fn();
    if (r) return r;
    if (Date.now() > fin) return null;
    await new Promise(r2 => setTimeout(r2, pas));
  }
};
// Le dev server hydrate lentement une grosse page : un clic parti avant
// l'hydratation est perdu (le SSR montre le bouton, le handler n'existe pas
// encore). On re-clique jusqu'à l'effet attendu, comme une vraie utilisatrice.
let derniereErreurClic = null;
const clicJusquA = async (bouton, effet, ms = 45000) => attendre(async () => {
  if (await effet()) return true;
  await bouton.click({ timeout: 3000 }).catch(e => { derniereErreurClic = String(e).slice(0, 400); });
  await new Promise(r => setTimeout(r, 900));
  return (await effet()) ? true : null;
}, ms, 300);

// ── Profil démo + offre du catalogue ───────────────────────────────────────
const { data: demo } = await svc.from('profiles').select('id, studio_slug').eq('studio_slug', 'atelier-soleil').single();
if (!demo) { console.error('Profil démo atelier-soleil introuvable.'); process.exit(1); }
const { data: offres } = await svc.from('offres').select('id, nom, prix').eq('profile_id', demo.id).eq('actif', true).order('ordre').limit(1);
const offre = offres?.[0];
if (!offre) { console.error('Aucune offre active sur le démo.'); process.exit(1); }
console.log(`Démo : ${demo.id.slice(0, 8)} · offre témoin : « ${offre.nom} »`);

// ── Purge d'un run précédent + setup ───────────────────────────────────────
async function purger() {
  const { data: fiches } = await svc.from('clients').select('id').eq('profile_id', demo.id).eq('email', EMAIL_TEMOIN);
  for (const f of fiches || []) {
    // ⚠️ ordre gravé v97 : les demandes AVANT la fiche (FK on delete set null).
    await svc.from('demandes_offre').delete().eq('client_id', f.id);
    await svc.from('paiements').delete().eq('client_id', f.id);
    await svc.from('abonnements').delete().eq('client_id', f.id);
    await svc.from('presences').delete().eq('client_id', f.id);
    await svc.from('clients').delete().eq('id', f.id);
  }
  await svc.from('notifications').delete().eq('profile_id', demo.id).like('ref_key', 'proof_offre_demande_%');
}
await purger();

const { data: fiche, error: eF } = await svc.from('clients').insert({
  profile_id: demo.id, prenom: 'Témoin', nom: 'ProofDemande', email: EMAIL_TEMOIN, statut: 'actif',
}).select('id').single();
if (eF) { console.error('Création fiche témoin KO:', eF.message); process.exit(1); }

const creerDemande = async () => {
  const { data, error } = await svc.from('demandes_offre').insert({
    profile_id: demo.id, offre_id: offre.id, client_id: fiche.id,
    message: 'Preuve automatique, à purger', statut: 'nouvelle',
  }).select('id').single();
  if (error) throw new Error('Insert demande témoin: ' + error.message);
  return data.id;
};
const demande1 = await creerDemande();
// La notif cloche, comme la route demander-offre l'écrit (ref_key préfixé
// proof_ pour une purge chirurgicale).
const { error: eNotif } = await svc.from('notifications').upsert({
  profile_id: demo.id, type: 'offre_demande',
  titre: '🛒 Demande d\'offre — Témoin ProofDemande',
  corps: `${offre.nom}`,
  data: { demande_id: demande1, offre_id: offre.id },
  ref_key: `proof_offre_demande_${demande1}`, expires_at: null,
}, { onConflict: 'profile_id,ref_key', ignoreDuplicates: true });
if (eNotif) console.log('  [setup] upsert notification KO:', eNotif.code, eNotif.message);
const { count: nNotif } = await svc.from('notifications').select('id', { count: 'exact', head: true })
  .eq('profile_id', demo.id).eq('ref_key', `proof_offre_demande_${demande1}`);
console.log(`  [setup] notification témoin en base : ${nNotif}`);

// ── Session Camille → navigateur ───────────────────────────────────────────
const { data: linkData } = await svc.auth.admin.generateLink({ type: 'magiclink', email: 'camille@atelier-soleil.fr' });
const anon = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
const { data: otp } = await anon.auth.verifyOtp({ type: 'magiclink', token_hash: linkData.properties.hashed_token });
const value = 'base64-' + Buffer.from(JSON.stringify(otp.session)).toString('base64url');
const nm = `sb-${PROJECT_REF}-auth-token`;
const cookies = [];
if (value.length <= 3180) cookies.push({ name: nm, value });
else for (let i = 0; i * 3180 < value.length; i++) cookies.push({ name: `${nm}.${i}`, value: value.slice(i * 3180, (i + 1) * 3180) });

let chromium; try { ({ chromium } = await import('playwright')); } catch { ({ chromium } = await import('@playwright/test')); }
let browser; try { browser = await chromium.launch({ channel: 'msedge' }); } catch { browser = await chromium.launch(); }

try {
  const ctx = await browser.newContext();
  await ctx.addCookies(cookies.map(cc => ({ ...cc, url: BASE, sameSite: 'Lax' })));
  const page = await ctx.newPage();
  page.on('console', m => { if (m.type() === 'error') console.log('  [console.error]', m.text().slice(0, 200)); });
  page.on('pageerror', e => console.log('  [pageerror]', String(e).slice(0, 300)));

  // ── A. Le bandeau sur la fiche ───────────────────────────────────────────
  console.log('\n— A. La fiche de l\'élève montre la demande —');
  await page.goto(`${BASE}/clients/${fiche.id}`, { waitUntil: 'domcontentloaded', timeout: 120000 });
  await page.waitForSelector('text=Demande d\'offre à traiter', { timeout: 90000 });
  c('bandeau « 🛒 Demande d\'offre à traiter » rendu', true);
  const txtBandeau = await page.locator('.dem-fiche').innerText();
  c('il nomme l\'offre demandée', txtBandeau.includes(offre.nom));
  c('il dit que rien n\'est encaissé ni réservé', /Rien n'est encaissé ni réservé/.test(txtBandeau));
  const btnAttribuer = page.locator('.dem-fiche').getByRole('button', { name: 'Attribuer l\'offre', exact: true });
  const btnEcarter = page.locator('.dem-fiche').getByRole('button', { name: 'Écarter' });
  c('boutons « Attribuer l\'offre » et « Écarter » présents', await btnAttribuer.count() === 1 && await btnEcarter.count() === 1);

  // ── B. Attribuer → tunnel direct au règlement → vente → solde auto ──────
  console.log('\n— B. « Attribuer l\'offre » : tunnel préchargé, vente, solde —');
  const modalOuvert = await clicJusquA(btnAttribuer, async () => (await page.locator('.modal-sheet').count()) > 0);
  if (!modalOuvert) {
    await page.screenshot({ path: process.env.TEMP + '/proof-demande-echec.png', fullPage: true }).catch(() => {});
    throw new Error('Le tunnel ne s\'ouvre pas après « Attribuer l\'offre »');
  }
  await page.waitForSelector(`.modal-sheet >> text=${offre.nom}`, { timeout: 30000 });
  const titreModal = (await page.locator('.modal-title').innerText()).trim();
  c('le tunnel s\'ouvre DIRECTEMENT sur le règlement (offre déjà choisie)', titreModal === 'Paiement', `titre : « ${titreModal} »`);
  await page.getByRole('button', { name: 'À régler plus tard' }).click();
  await page.getByRole('button', { name: /Attribuer l'offre \(à régler\)/ }).click();

  const soldee = await attendre(async () => {
    const { data } = await svc.from('demandes_offre').select('statut').eq('id', demande1).single();
    return data?.statut === 'acceptee' ? data : null;
  });
  c('la demande passe « acceptee » EN BASE après la vente PAR LA FICHE (le cas Maude)', !!soldee);
  const { data: abos } = await svc.from('abonnements').select('id, statut').eq('client_id', fiche.id).eq('offre_id', offre.id);
  c('l\'abonnement est né en base', (abos || []).length === 1 && abos[0].statut === 'actif');
  const { data: pays } = await svc.from('paiements').select('statut, mode').eq('client_id', fiche.id);
  c('le paiement « à régler » est pending, sans mode inventé', (pays || []).length === 1 && pays[0].statut === 'pending' && !pays[0].mode);
  const bandeauParti = await attendre(async () =>
    (await page.locator('.dem-fiche').count()) === 0 ? true : null, 35000);
  c('le bandeau disparaît de la fiche (refresh serveur)', !!bandeauParti);

  // ── C. La cloche mène à la file ──────────────────────────────────────────
  console.log('\n— C. La cloche : « Voir la demande » → /offres —');
  await page.goto(`${BASE}/dashboard`, { waitUntil: 'domcontentloaded', timeout: 120000 });
  await page.waitForSelector('.nb-bell-btn', { timeout: 90000 });
  // Deux instances de NotificationBell vivent dans le DOM (header desktop +
  // mobile) : on clique celle qui est VISIBLE.
  const panneauOuvert = await clicJusquA(
    page.locator('.nb-bell-btn:visible').first(),
    async () => (await page.locator('[aria-label="Fermer les notifications"]').count()) > 0
  );
  if (!panneauOuvert) {
    console.log('  [debug] dernière erreur de clic :', derniereErreurClic || '(aucune — le clic part mais rien ne s\'ouvre)');
    const centre = await page.evaluate(() => {
      const el = document.querySelector('.nb-bell-btn');
      if (!el) return 'bouton absent du DOM';
      const r = el.getBoundingClientRect();
      const dessus = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2);
      return `au centre du bouton : <${dessus?.tagName?.toLowerCase()} class="${dessus?.className}">`;
    });
    console.log('  [debug] elementFromPoint :', centre);
    throw new Error('Le panneau de la cloche ne s\'ouvre pas');
  }
  try {
    await page.waitForSelector('text=Demande d\'offre — Témoin ProofDemande', { timeout: 30000 });
  } catch (e) {
    const cartes = await page.locator('.nb-card').count();
    const txtPanel = (await page.innerText('body')).split('\n').filter(l => /Demande|notification/i.test(l)).slice(0, 12);
    console.log(`  [debug] ${cartes} cartes dans le panneau · lignes « demande » :`, JSON.stringify(txtPanel));
    throw e;
  }
  c('la notif « Demande d\'offre » est dans la cloche', true);
  const carte = page.locator('.nb-card', { hasText: 'Témoin ProofDemande' });
  const btnVoir = carte.getByRole('button', { name: 'Voir la demande' });
  c('elle porte le bouton « Voir la demande »', await btnVoir.count() === 1);
  await btnVoir.click();
  await page.waitForURL('**/offres', { timeout: 30000 });
  c('le clic mène à /offres (la file)', page.url().endsWith('/offres'));

  // ── D. Écarter depuis la fiche ───────────────────────────────────────────
  console.log('\n— D. « Écarter » depuis la fiche —');
  const demande2 = await creerDemande();
  await page.goto(`${BASE}/clients/${fiche.id}`, { waitUntil: 'domcontentloaded', timeout: 120000 });
  await page.waitForSelector('text=Demande d\'offre à traiter', { timeout: 90000 });
  const refusee = await clicJusquA(
    page.locator('.dem-fiche').getByRole('button', { name: 'Écarter' }),
    async () => {
      const { data } = await svc.from('demandes_offre').select('statut').eq('id', demande2).single();
      return data?.statut === 'refusee' ? data : null;
    }
  );
  c('« Écarter » pose « refusee » en base', !!refusee);
  const bandeauParti2 = await attendre(async () =>
    (await page.locator('.dem-fiche').count()) === 0 ? true : null, 15000);
  c('et le bandeau disparaît', !!bandeauParti2);
} finally {
  await browser.close().catch(() => {});
  await purger();
  console.log('\nTémoins purgés (fiche, demandes, abo, paiements, notif).');
}

console.log(`\nRésultat : ${ok} OK / ${ko} KO`);
process.exit(ko === 0 ? 0 : 1);
