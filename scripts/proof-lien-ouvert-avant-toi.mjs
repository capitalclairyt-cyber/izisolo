/**
 * PREUVE — « Le lien ouvert avant toi » (2026-09-08).
 *
 * Retour Manon (Soleya) : Juliette, sur Hotmail, trouvait CHAQUE lien de
 * connexion « expiré ou déjà utilisé », même redemandé. En base : connexion
 * enregistrée 14 s après l'envoi, fiche jamais rattachée à un compte (le
 * lien que l'espace pose à la première visite). Le robot de sa messagerie
 * ouvrait le lien avant elle et consommait le jeton à usage unique.
 *
 * Vrai navigateur (dev :3333) + un « robot » (fetch nu, sans JS) :
 *   A. Le robot charge le lien ÉLÈVE : 200, une page à bouton, AUCUN cookie
 *      de session posé, et le compte n'a PAS enregistré de connexion.
 *   B. L'élève ouvre ce MÊME lien après le robot, appuie sur « Ouvrir mon
 *      espace » → son espace ; EN BASE : connexion enregistrée et fiche
 *      rattachée au compte (la signature qui manquait chez Juliette).
 *   C. Usage unique conservé : le même lien re-cliqué → « expiré ou déjà
 *      utilisé » avec le renvoi en un clic. Un GET sur /ouvrir ne consomme
 *      rien et ne plante pas.
 *   D. Même parade côté PROF : /auth/callback?token_hash → robot 307 vers
 *      /auth/ouvrir (page à bouton, zéro cookie, zéro connexion) ; la prof
 *      appuie → /dashboard ; un lien « recovery » mène à /nouveau-mot-de-passe.
 *
 * Re-runnable, témoin purgé même en cas d'échec, aucun email envoyé.
 */
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const BASE = process.env.PROOF_BASE || 'http://localhost:3333';
const EMAIL_ELEVE = 'temoin-lien-scanner@example.com';
const EMAIL_PROF = 'camille@atelier-soleil.fr';

const env = Object.fromEntries(
  readFileSync(join(process.cwd(), '.env.local'), 'utf8')
    .split('\n').filter(l => l.includes('=') && !l.startsWith('#'))
    .map(l => [l.slice(0, l.indexOf('=')).trim(), l.slice(l.indexOf('=') + 1).trim()])
);
const svc = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

let ok = 0, ko = 0;
const c = (l, cond, d = '') => { if (cond) { ok++; console.log('  OK  ' + l + (d ? ' - ' + d : '')); } else { ko++; console.log('  KO  ' + l + (d ? ' - ' + d : '')); } };

const { data: demo } = await svc.from('profiles').select('id, studio_slug').eq('studio_slug', 'atelier-soleil').single();
if (!demo) { console.error('Démo introuvable'); process.exit(1); }
const SLUG = demo.studio_slug;

let fiche = null, eleveUserId = null;
async function purger() {
  const { data: fiches } = await svc.from('clients').select('id').eq('profile_id', demo.id).ilike('email', EMAIL_ELEVE);
  for (const f of fiches || []) await svc.from('clients').delete().eq('id', f.id);
  if (!eleveUserId) {
    const { data: lst } = await svc.auth.admin.listUsers({ page: 1, perPage: 200 }).catch(() => ({ data: null }));
    eleveUserId = lst?.users?.find(x => x.email === EMAIL_ELEVE)?.id || null;
  }
  if (eleveUserId) { await svc.auth.admin.deleteUser(eleveUserId).catch(() => {}); eleveUserId = null; }
}
await purger();

{
  const { data: f, error } = await svc.from('clients').insert({ profile_id: demo.id, prenom: 'Témoin', nom: 'Scanner', email: EMAIL_ELEVE, statut: 'actif' }).select('id').single();
  if (error) { console.error('fiche témoin KO:', error.message); process.exit(1); }
  fiche = f;
  const { data: cree, error: eU } = await svc.auth.admin.createUser({ email: EMAIL_ELEVE, email_confirm: true, user_metadata: { role: 'eleve' } });
  if (eU) { console.error('compte élève KO:', eU.message); await purger(); process.exit(1); }
  eleveUserId = cree.user.id;
}

const { data: lstProf } = await svc.auth.admin.listUsers({ page: 1, perPage: 200 });
const profUser = lstProf?.users?.find(x => x.email === EMAIL_PROF);
if (!profUser) { console.error('Compte prof démo introuvable'); await purger(); process.exit(1); }

const lastSignIn = async (id) => (await svc.auth.admin.getUserById(id)).data?.user?.last_sign_in_at || null;
const lienEleve = async () => {
  const { data, error } = await svc.auth.admin.generateLink({ type: 'magiclink', email: EMAIL_ELEVE });
  if (error) throw new Error('generateLink élève: ' + error.message);
  return `${BASE}/p/${SLUG}/connecte?token_hash=${encodeURIComponent(data.properties.hashed_token)}&type=magiclink`;
};
const lienProf = async (type, next) => {
  const { data, error } = await svc.auth.admin.generateLink({ type, email: EMAIL_PROF });
  if (error) throw new Error('generateLink prof: ' + error.message);
  const q = new URLSearchParams({ token_hash: data.properties.hashed_token, type });
  if (next) q.set('next', next);
  return `${BASE}/auth/callback?${q.toString()}`;
};
const cookiesSession = (res) => (res.headers.getSetCookie?.() || []).filter(s => s.startsWith('sb-'));

// Pré-chauffe : en dev, la PREMIÈRE compilation d'une route déclenche un
// rechargement de la page en cours (Fast Refresh) et peut avaler le clic qui
// venait de partir — constaté au premier run : trois « navigated to » sur la
// même URL et un POST jamais parti. On compile tout AVANT de cliquer.
for (const u of [`/p/${SLUG}/connecte?token_hash=x&type=magiclink`, `/p/${SLUG}/connexion?erreur=expire`, `/p/${SLUG}/espace`, '/auth/ouvrir?token_hash=x&type=magiclink', '/dashboard', '/nouveau-mot-de-passe', '/login']) {
  await fetch(BASE + u, { redirect: 'manual' }).then(r => r.text()).catch(() => {});
}
// Appuie sur le bouton jusqu'à ce que l'URL change (jamais de clic perdu
// dans un rechargement HMR) ; le jeton n'est consommé qu'au POST, donc un
// clic avalé n'a rien usé.
const appuyer = async (page, libelle, cibleUrl) => {
  for (let i = 0; i < 6; i++) {
    const b = page.locator('button', { hasText: libelle });
    await b.waitFor({ timeout: 60000 });
    await b.click().catch(() => {});
    try { await page.waitForURL(u => String(u).includes(cibleUrl), { timeout: 20000 }); return true; } catch { /* on réessaie */ }
  }
  return false;
};

let chromium; try { ({ chromium } = await import('playwright')); } catch { ({ chromium } = await import('@playwright/test')); }
let browser; try { browser = await chromium.launch({ channel: 'msedge' }); } catch { browser = await chromium.launch(); }

try {
  const erreurs = [];

  // ── A. Le robot de la messagerie ────────────────────────────────────────
  console.log('\n— A. Le robot charge le lien élève avant elle —');
  const avantA = await lastSignIn(eleveUserId);
  const lien = await lienEleve();
  const rA = await fetch(lien, { redirect: 'manual' });
  const htmlA = await rA.text();
  c('le lien répond 200 (une page, pas une redirection)', rA.status === 200, `status ${rA.status}`);
  c('la page porte le bouton « Ouvrir mon espace »', htmlA.includes('Ouvrir mon espace'));
  c('aucun cookie de session posé au chargement', cookiesSession(rA).length === 0, `${cookiesSession(rA).length} cookie(s) sb-*`);
  const rHead = await fetch(lien, { method: 'HEAD', redirect: 'manual' });
  c('un HEAD (scanner) ne pose pas de cookie non plus', cookiesSession(rHead).length === 0, `status ${rHead.status}`);
  await new Promise(r => setTimeout(r, 800));
  const apresA = await lastSignIn(eleveUserId);
  c('EN BASE : aucune connexion enregistrée par le passage du robot', apresA === avantA, `last_sign_in_at ${avantA} → ${apresA}`);

  // ── B. L'élève, après le robot, appuie sur le bouton ────────────────────
  console.log('\n— B. L\'élève ouvre le MÊME lien et appuie sur le bouton —');
  const ctx = await browser.newContext({ viewport: { width: 420, height: 900 } });
  const page = await ctx.newPage();
  page.on('pageerror', e => erreurs.push(String(e).slice(0, 160)));
  await page.goto(lien, { waitUntil: 'domcontentloaded', timeout: 120000 });
  const bouton = page.locator('button', { hasText: 'Ouvrir mon espace' });
  await bouton.waitFor({ timeout: 60000 });
  c('le bouton est rendu dans le vrai navigateur', await bouton.isVisible());
  await appuyer(page, 'Ouvrir mon espace', `/p/${SLUG}/espace`);
  c('après l\'appui : l\'espace élève', page.url().includes(`/p/${SLUG}/espace`), page.url());
  await page.waitForSelector('text=Témoin', { timeout: 90000 }).catch(() => {});
  const corpsB = await page.innerText('body');
  c('l\'espace est bien celui du témoin', corpsB.includes('Témoin'));
  const apresB = await lastSignIn(eleveUserId);
  c('EN BASE : la connexion est enregistrée par le clic', apresB && apresB !== avantA, `${apresB}`);
  const { data: ficheB } = await svc.from('clients').select('auth_user_id').eq('id', fiche.id).single();
  c('EN BASE : la fiche est rattachée au compte (ce qui manquait chez Juliette)', ficheB?.auth_user_id === eleveUserId);

  // ── C. Usage unique ─────────────────────────────────────────────────────
  console.log('\n— C. Le même lien ne sert qu\'une fois —');
  const ctx2 = await browser.newContext({ viewport: { width: 420, height: 900 } });
  const p2 = await ctx2.newPage();
  p2.on('pageerror', e => erreurs.push('C: ' + String(e).slice(0, 160)));
  await p2.goto(lien, { waitUntil: 'domcontentloaded', timeout: 120000 });
  const b2 = p2.locator('button', { hasText: 'Ouvrir mon espace' });
  await b2.waitFor({ timeout: 60000 });
  await appuyer(p2, 'Ouvrir mon espace', '/connexion');
  c('le lien déjà utilisé renvoie à la connexion', p2.url().includes(`/p/${SLUG}/connexion`) && p2.url().includes('erreur=expire'), p2.url());
  await p2.waitForSelector('text=a expiré ou a déjà été utilisé', { timeout: 120000 }).catch(e => console.log('  (bandeau non vu : ' + String(e).slice(0, 80) + ')'));
  c('avec le message « expiré ou déjà utilisé »', (await p2.innerText('body')).includes('a expiré ou a déjà été utilisé'));
  const rOuvrirGet = await fetch(`${BASE}/p/${SLUG}/connecte/ouvrir`, { redirect: 'manual' });
  c('un GET sur /ouvrir ne consomme rien et renvoie à la connexion', [302, 307, 308].includes(rOuvrirGet.status) && (rOuvrirGet.headers.get('location') || '').includes('/connexion'), `status ${rOuvrirGet.status}`);
  const rSansJeton = await fetch(`${BASE}/p/${SLUG}/connecte`, { redirect: 'manual' });
  c('le lien sans jeton renvoie à la connexion', [302, 307, 308].includes(rSansJeton.status) && (rSansJeton.headers.get('location') || '').includes('/connexion'), `status ${rSansJeton.status}`);
  await ctx.close(); await ctx2.close();

  // ── D. Même parade côté prof ────────────────────────────────────────────
  console.log('\n— D. Les liens prof (/auth/callback) —');
  const avantD = await lastSignIn(profUser.id);
  const lp = await lienProf('magiclink', '/dashboard');
  const rD = await fetch(lp, { redirect: 'manual' });
  const locD = rD.headers.get('location') || '';
  c('le robot est redirigé vers /auth/ouvrir sans rien consommer', [302, 307].includes(rD.status) && locD.includes('/auth/ouvrir?') && cookiesSession(rD).length === 0, `${rD.status} → ${locD.slice(0, 60)}`);
  const rD2 = await fetch(locD, { redirect: 'manual' });
  const htmlD = await rD2.text();
  c('/auth/ouvrir : une page à bouton, zéro cookie', rD2.status === 200 && htmlD.includes('Me connecter') && cookiesSession(rD2).length === 0, `status ${rD2.status}`);
  await new Promise(r => setTimeout(r, 800));
  c('EN BASE : aucune connexion prof enregistrée par le robot', (await lastSignIn(profUser.id)) === avantD);
  const ctx3 = await browser.newContext({ viewport: { width: 1200, height: 900 } });
  const p3 = await ctx3.newPage();
  p3.on('pageerror', e => erreurs.push('D: ' + String(e).slice(0, 160)));
  await p3.goto(lp, { waitUntil: 'domcontentloaded', timeout: 120000 });
  const b3 = p3.locator('button', { hasText: 'Me connecter' });
  await b3.waitFor({ timeout: 60000 });
  await appuyer(p3, 'Me connecter', '/dashboard');
  c('après l\'appui : la prof est sur son dashboard', p3.url().includes('/dashboard'), p3.url());
  c('EN BASE : la connexion prof est enregistrée par le clic', (await lastSignIn(profUser.id)) !== avantD);
  await ctx3.close();

  const ctx4 = await browser.newContext({ viewport: { width: 1200, height: 900 } });
  const p4 = await ctx4.newPage();
  p4.on('pageerror', e => erreurs.push('D2: ' + String(e).slice(0, 160)));
  await p4.goto(await lienProf('recovery'), { waitUntil: 'domcontentloaded', timeout: 120000 });
  const b4 = p4.locator('button', { hasText: 'Continuer' });
  await b4.waitFor({ timeout: 60000 });
  c('un lien « nouveau mot de passe » affiche son propre libellé', (await p4.innerText('body')).includes('Choisir mon nouveau mot de passe'));
  await appuyer(p4, 'Continuer', '/nouveau-mot-de-passe');
  c('après l\'appui : la page de nouveau mot de passe', p4.url().includes('/nouveau-mot-de-passe'), p4.url());
  await ctx4.close();

  c('aucune erreur de page dans le navigateur', erreurs.length === 0, erreurs.join(' | '));
} catch (e) {
  ko++;
  console.log('  KO  exception : ' + (e?.message || e));
} finally {
  await browser.close().catch(() => {});
  await purger();
}

console.log(`\n${ok} OK / ${ko} KO`);
process.exit(ko ? 1 : 0);
