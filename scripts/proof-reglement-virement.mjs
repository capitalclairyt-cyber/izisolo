/**
 * PREUVE — règlement par virement (v98, 2026-08-23).
 *
 * Décisions Colin : la prof CHOISIT à la vente l'email « comment régler »
 * (virement RIB / espèces / chèque / rien), paramètre auto ou « je choisis »,
 * les deux plans, QR SEPA tout de suite, et l'email peut partir sans RIB
 * (espèces/chèque).
 *
 * Auto-adaptative : SANS la migration v98 (phase dégradée), on prouve que
 * tout vit quand même : carte Paramètres rendue + validation IBAN à la
 * saisie, bloc email du tunnel avec « Virement (RIB) » DÉSACTIVÉ, vente
 * « à régler plus tard » + email « Espèces au studio » accepté par la route,
 * bouton « Comment régler ? » de l'espace élève en version « sur place ».
 * AVEC v98 : RIB posé, « Virement (RIB) » actif, email virement accepté,
 * espace élève : IBAN formaté + référence IZI-XXXXXX + QR SEPA rendu.
 *
 * Vrai navigateur (dev :3333), session prof démo + session élève témoin.
 * Re-runnable : témoins purgés et réglages démo restaurés, même en échec.
 */
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const BASE = 'http://localhost:3333';
const EMAIL_ELEVE = 'temoin-reglement@example.com';

const env = Object.fromEntries(
  readFileSync(join(process.cwd(), '.env.local'), 'utf8')
    .split('\n').filter(l => l.includes('=') && !l.startsWith('#'))
    .map(l => [l.slice(0, l.indexOf('=')).trim(), l.slice(l.indexOf('=') + 1).trim()])
);
const PROJECT_REF = new URL(env.NEXT_PUBLIC_SUPABASE_URL).hostname.split('.')[0];
const svc = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

let ok = 0, ko = 0;
const c = (l, cond, d = '') => { if (cond) { ok++; console.log('  OK  ' + l + (d ? ' - ' + d : '')); } else { ko++; console.log('  KO  ' + l + (d ? ' - ' + d : '')); } };
const attendre = async (fn, ms = 20000, pas = 500) => {
  const fin = Date.now() + ms;
  for (;;) { const r = await fn(); if (r) return r; if (Date.now() > fin) return null; await new Promise(r2 => setTimeout(r2, pas)); }
};
let derniereErreurClic = null;
const clicJusquA = async (bouton, effet, ms = 45000) => attendre(async () => {
  if (await effet()) return true;
  await bouton.click({ timeout: 3000 }).catch(e => { derniereErreurClic = String(e).slice(0, 200); });
  await new Promise(r => setTimeout(r, 900));
  return (await effet()) ? true : null;
}, ms, 300);

const { data: demo } = await svc.from('profiles').select('id, studio_slug, studio_nom').eq('studio_slug', 'atelier-soleil').single();
if (!demo) { console.error('Démo introuvable'); process.exit(1); }

// ── Sonde v98 ──────────────────────────────────────────────────────────────
let V98 = true;
{
  const { error } = await svc.from('profiles').select('reglement_config').eq('id', demo.id).maybeSingle();
  if (error && (['42703', 'PGRST204', 'PGRST205'].includes(error.code) || /reglement_config/.test(error.message || ''))) V98 = false;
}
console.log(`migration v98 : ${V98 ? 'APPLIQUEE (phase complète)' : 'ABSENTE (phase dégradée — relance après application)'}`);

// Sauvegarde de la config démo pour restauration.
let cfgAvant = null;
if (V98) {
  const { data } = await svc.from('profiles').select('reglement_config').eq('id', demo.id).maybeSingle();
  cfgAvant = data?.reglement_config ?? null;
}

const { data: offres } = await svc.from('offres').select('id, nom, prix').eq('profile_id', demo.id).eq('actif', true).order('ordre').limit(1);
const offre = offres?.[0];
if (!offre) { console.error('Aucune offre active sur le démo.'); process.exit(1); }

let eleveUserId = null;
let fiche = null;
async function purger() {
  const { data: fiches } = await svc.from('clients').select('id').eq('profile_id', demo.id).eq('email', EMAIL_ELEVE);
  for (const f of fiches || []) {
    await svc.from('demandes_offre').delete().eq('client_id', f.id);
    await svc.from('paiements').delete().eq('client_id', f.id);
    await svc.from('abonnements').delete().eq('client_id', f.id);
    await svc.from('presences').delete().eq('client_id', f.id);
    await svc.from('clients').delete().eq('id', f.id);
  }
  if (eleveUserId) { await svc.auth.admin.deleteUser(eleveUserId).catch(() => {}); eleveUserId = null; }
  else {
    const { data: lst } = await svc.auth.admin.listUsers({ page: 1, perPage: 200 }).catch(() => ({ data: null }));
    const u = lst?.users?.find(x => x.email === EMAIL_ELEVE);
    if (u) await svc.auth.admin.deleteUser(u.id).catch(() => {});
  }
  if (V98) await svc.from('profiles').update({ reglement_config: cfgAvant }).eq('id', demo.id);
}
await purger();

const { data: f, error: eF } = await svc.from('clients').insert({
  profile_id: demo.id, prenom: 'Témoin', nom: 'Reglement', email: EMAIL_ELEVE, statut: 'actif',
}).select('id').single();
if (eF) { console.error('fiche témoin KO:', eF.message); process.exit(1); }
fiche = f;

const { data: cree, error: eU } = await svc.auth.admin.createUser({
  email: EMAIL_ELEVE, email_confirm: true, user_metadata: { role: 'eleve' },
});
if (eU) { console.error('compte élève KO:', eU.message); await purger(); process.exit(1); }
eleveUserId = cree.user.id;

// Si v98 : la prof a son RIB (posé en service_role, l'UI de saisie est
// prouvée à part en phase A — IBAN canonique valide).
const IBAN_TEST = 'FR1420041010050500013M02606';
if (V98) {
  await svc.from('profiles').update({
    reglement_config: { rib: { titulaire: 'Camille Leroux', iban: IBAN_TEST, bic: 'PSSTFRPPXXX' }, email_mode: 'choix', email_defaut: 'virement' },
  }).eq('id', demo.id);
}

const sessionCookies = async (email) => {
  const { data: linkData } = await svc.auth.admin.generateLink({ type: 'magiclink', email });
  const anon = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: otp } = await anon.auth.verifyOtp({ type: 'magiclink', token_hash: linkData.properties.hashed_token });
  const value = 'base64-' + Buffer.from(JSON.stringify(otp.session)).toString('base64url');
  const nm = `sb-${PROJECT_REF}-auth-token`;
  const cookies = [];
  if (value.length <= 3180) cookies.push({ name: nm, value });
  else for (let i = 0; i * 3180 < value.length; i++) cookies.push({ name: `${nm}.${i}`, value: value.slice(i * 3180, (i + 1) * 3180) });
  return cookies;
};

let chromium; try { ({ chromium } = await import('playwright')); } catch { ({ chromium } = await import('@playwright/test')); }
let browser; try { browser = await chromium.launch({ channel: 'msedge' }); } catch { browser = await chromium.launch(); }

try {
  const ctxProf = await browser.newContext();
  await ctxProf.addCookies((await sessionCookies('camille@atelier-soleil.fr')).map(cc => ({ ...cc, url: BASE, sameSite: 'Lax' })));
  const page = await ctxProf.newPage();

  // ── A. La carte Paramètres + validation IBAN à la saisie ────────────────
  console.log('\n— A. Paramètres : carte « Règlement par virement » —');
  await page.goto(`${BASE}/parametres?tab=profil&s=activite`, { waitUntil: 'domcontentloaded', timeout: 120000 });
  await page.waitForSelector('text=Règlement par virement', { timeout: 90000 });
  c('la carte « Règlement par virement » est rendue', true);
  const inputIban = page.locator('input[placeholder^="FR76"]');
  await inputIban.fill('FR1420041010050500013M02607'); // dernier chiffre altéré
  await page.waitForTimeout(400);
  c('un IBAN faux est signalé à la saisie', (await page.innerText('body')).includes('ne passe pas la vérification'));
  await inputIban.fill(IBAN_TEST);
  await page.waitForTimeout(400);
  c('un IBAN valide affiche « IBAN valide ✓ »', (await page.innerText('body')).includes('IBAN valide ✓'));
  c('le réglage auto / je choisis / jamais est là', (await page.innerText('body')).includes('Je choisis à chaque vente'));

  // ── B. Le tunnel : choix de l'email + vente + route ──────────────────────
  console.log('\n— B. Tunnel « à régler plus tard » : le choix de l\'email —');
  await page.goto(`${BASE}/clients/${fiche.id}`, { waitUntil: 'domcontentloaded', timeout: 120000 });
  await page.waitForSelector('text=Reglement', { timeout: 90000 });
  const btnAjouter = page.getByRole('button', { name: 'Ajouter une offre' }).first();
  const modalOuvert = await clicJusquA(btnAjouter, async () => (await page.locator('.modal-sheet').count()) > 0);
  if (!modalOuvert) throw new Error('tunnel fermé: ' + derniereErreurClic);
  // Choisir la 1re offre du catalogue.
  await page.locator('.modal-sheet').getByText(offre.nom, { exact: false }).first().click();
  await page.waitForSelector('.modal-sheet >> text=Règlement', { timeout: 30000 });
  await page.getByRole('button', { name: 'À régler plus tard' }).click();
  await page.waitForSelector('text=Prévenir', { timeout: 15000 });
  c('le bloc « ✉️ Prévenir … comment régler ? » apparaît', true);
  const btnVirement = page.getByRole('button', { name: /Virement \(RIB\)/ });
  const virementActif = await btnVirement.isEnabled();
  c(V98 ? '« Virement (RIB) » est ACTIF (RIB posé)' : '« Virement (RIB) » est DÉSACTIVÉ sans RIB (pré-v98)', V98 ? virementActif : !virementActif);
  const variante = V98 ? 'virement' : 'especes';
  await (V98 ? btnVirement : page.getByRole('button', { name: 'Espèces au studio' })).click();
  c('le hint annonce l\'envoi automatique', (await page.innerText('body')).includes('L\'email partira tout seul après la vente'));

  const [reponseEmail] = await Promise.all([
    page.waitForResponse(r => r.url().includes('/api/paiements/email-reglement'), { timeout: 45000 }),
    page.getByRole('button', { name: /Attribuer l'offre \(à régler\)/ }).click(),
  ]);
  const corps = await reponseEmail.json().catch(() => ({}));
  c(`la route email-reglement répond 200 (variante ${variante})`, reponseEmail.status() === 200, `status ${reponseEmail.status()} · ${JSON.stringify(corps)}`);
  c('l\'email témoin @example.com est ignoré par le garde-fou RFC 2606 (skipped)', corps.skipped === 'domaine_test');

  const abo = await attendre(async () => {
    const { data } = await svc.from('abonnements').select('id, statut').eq('client_id', fiche.id);
    return data?.length ? data[0] : null;
  });
  c('la vente est bien enregistrée (abonnement + paiement pending)', !!abo);
  const { data: pays } = await svc.from('paiements').select('statut').eq('client_id', fiche.id);
  c('le paiement est pending', (pays || []).length === 1 && pays[0].statut === 'pending');

  // ── C. L'espace élève : « Comment régler ? » ─────────────────────────────
  console.log('\n— C. Espace élève : RIB, référence, QR —');
  {
    const { data: dbg } = await svc.from('profiles').select('reglement_config').eq('id', demo.id).maybeSingle();
    console.log('  [debug] config en base au moment de C :', JSON.stringify(dbg?.reglement_config)?.slice(0, 160));
  }
  const ctxEleve = await browser.newContext({ viewport: { width: 420, height: 1000 } });
  await ctxEleve.addCookies((await sessionCookies(EMAIL_ELEVE)).map(cc => ({ ...cc, url: BASE, sameSite: 'Lax' })));
  const pageEleve = await ctxEleve.newPage();
  await pageEleve.goto(`${BASE}/p/${demo.studio_slug}/espace`, { waitUntil: 'domcontentloaded', timeout: 120000 });
  await pageEleve.waitForSelector('text=À régler', { timeout: 90000 });
  const btnRegler = pageEleve.getByRole('button', { name: /Comment régler \?/ });
  c('le bouton « 💡 Comment régler ? » est rendu', await btnRegler.count() === 1);
  // ⚠️ effet NON ambigu : « Sur place » matche déjà la phrase permanente de la
  // section (« sur place ou selon ses modalités habituelles ») — le bouton
  // « Fermer », lui, n'existe que dans la modale.
  const modaleOuverte = await clicJusquA(btnRegler, async () => (await pageEleve.getByRole('button', { name: 'Fermer' }).count()) > 0);
  c('la modale s\'ouvre (bloc « 💶 Sur place » toujours là)', !!modaleOuverte && (await pageEleve.innerText('body')).includes('💶 Sur place'));
  const txtModale = await pageEleve.innerText('body');
  if (V98 && !txtModale.includes('IBAN')) {
    const extrait = txtModale.split('\n').filter(l => /régler|Sur place|virement|IBAN|IZI-/i.test(l)).slice(0, 12);
    console.log('  [debug] modale sans RIB — lignes :', JSON.stringify(extrait));
  }
  if (V98) {
    c('le RIB est affiché, IBAN par blocs de 4', txtModale.includes('FR14 2004 1010 0505 0001 3M02 606'));
    c('la référence de virement est là (IZI-…)', new RegExp('IZI-' + fiche.id.replace(/-/g, '').slice(0, 6).toUpperCase()).test(txtModale));
    const qrOk = await attendre(async () => (await pageEleve.locator('img[alt="QR code de virement SEPA"]').count()) > 0 ? true : null, 15000);
    c('le QR SEPA est rendu', !!qrOk);
  } else {
    c('sans RIB (pré-v98) : pas de bloc virement, pas de fausse promesse', !txtModale.includes('IBAN'));
  }
} finally {
  await browser.close().catch(() => {});
  await purger();
  console.log('\nTémoins purgés (fiche, compte élève, vente) et réglages démo restaurés.');
}

console.log(`\nRésultat : ${ok} OK / ${ko} KO`);
process.exit(ko === 0 ? 0 : 1);
