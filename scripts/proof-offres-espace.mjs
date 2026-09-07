/**
 * PREUVE — « Proposer mes offres dans l'espace de mes élèves » (v108, 2026-09-07).
 *
 * Retour Manon (Soleya) : « est-ce que je peux enlever les offres sur le
 * profil des clientes ? je gère ça via mon site internet ». Sa grille
 * publique était déjà masquée ; la section « Les offres du studio » de
 * l'ESPACE élève n'avait aucun réglage.
 *
 * Vrai navigateur (dev :3333), session prof démo + session élève témoin :
 *   A. Paramètres → Portail public → Ma page : l'interrupteur existe ; le
 *      désactiver écrit EN BASE (v108) ou répond 503 honnête (sans v108).
 *   B. Espace élève : masqué → ni section « Les offres du studio », ni
 *      question « Comment acheter » dans la mini-aide ; paiements et carnets
 *      toujours là. Sans v108 : la section reste (dégradé assumé).
 *   C. La route de demande d'offre REFUSE (403) quand ni l'espace ni la
 *      grille publique ne proposent les offres (un écran qui cache un bouton
 *      ne protège rien).
 *   D. Réactivé → la section revient.
 *
 * Re-runnable, témoins purgés, réglages démo restaurés, aucun email.
 */
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const BASE = process.env.PROOF_BASE || 'http://localhost:3333';
const EMAIL_ELEVE = 'temoin-offres-espace@example.com';

const env = Object.fromEntries(
  readFileSync(join(process.cwd(), '.env.local'), 'utf8')
    .split('\n').filter(l => l.includes('=') && !l.startsWith('#'))
    .map(l => [l.slice(0, l.indexOf('=')).trim(), l.slice(l.indexOf('=') + 1).trim()])
);
const PROJECT_REF = new URL(env.NEXT_PUBLIC_SUPABASE_URL).hostname.split('.')[0];
const svc = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

let ok = 0, ko = 0;
const c = (l, cond, d = '') => { if (cond) { ok++; console.log('  OK  ' + l + (d ? ' - ' + d : '')); } else { ko++; console.log('  KO  ' + l + (d ? ' - ' + d : '')); } };

const { data: demo } = await svc.from('profiles').select('id, studio_slug, afficher_tarifs').eq('studio_slug', 'atelier-soleil').single();
if (!demo) { console.error('Démo introuvable'); process.exit(1); }

let V108 = true, offresEspaceAvant = null;
{
  const { data, error } = await svc.from('profiles').select('offres_espace').eq('id', demo.id).maybeSingle();
  if (error && (['42703', 'PGRST204', 'PGRST205'].includes(error.code) || /offres_espace/.test(error.message || ''))) V108 = false;
  else offresEspaceAvant = data?.offres_espace !== false;
}
console.log(`migration v108 : ${V108 ? 'APPLIQUEE (phase complète)' : 'ABSENTE (phase dégradée — relance après application)'}`);
const tarifsAvant = demo.afficher_tarifs === true;

const { data: offreDemo } = await svc.from('offres').select('id, nom').eq('profile_id', demo.id).eq('actif', true).order('ordre').limit(1).maybeSingle();
if (!offreDemo) { console.error('Aucune offre active sur le démo'); process.exit(1); }

let fiche = null, eleveUserId = null;
async function purger() {
  const { data: fiches } = await svc.from('clients').select('id').eq('profile_id', demo.id).ilike('email', EMAIL_ELEVE);
  for (const f of fiches || []) {
    await svc.from('demandes_offre').delete().eq('client_id', f.id);
    await svc.from('paiements').delete().eq('client_id', f.id);
    await svc.from('abonnements').delete().eq('client_id', f.id);
    await svc.from('presences').delete().eq('client_id', f.id);
    await svc.from('clients').delete().eq('id', f.id);
  }
  await svc.from('demandes_offre').delete().eq('profile_id', demo.id).ilike('email', EMAIL_ELEVE);
  if (eleveUserId) { await svc.auth.admin.deleteUser(eleveUserId).catch(() => {}); eleveUserId = null; }
  else {
    const { data: lst } = await svc.auth.admin.listUsers({ page: 1, perPage: 200 }).catch(() => ({ data: null }));
    const u = lst?.users?.find(x => x.email === EMAIL_ELEVE);
    if (u) await svc.auth.admin.deleteUser(u.id).catch(() => {});
  }
  await svc.from('profiles').update({ afficher_tarifs: tarifsAvant }).eq('id', demo.id);
  if (V108) await svc.from('profiles').update({ offres_espace: offresEspaceAvant !== false }).eq('id', demo.id);
}
await purger();

{
  const { data: f, error } = await svc.from('clients').insert({ profile_id: demo.id, prenom: 'Témoin', nom: 'Offres', email: EMAIL_ELEVE, statut: 'actif' }).select('id').single();
  if (error) { console.error('fiche témoin KO:', error.message); process.exit(1); }
  fiche = f;
  const { data: cree, error: eU } = await svc.auth.admin.createUser({ email: EMAIL_ELEVE, email_confirm: true, user_metadata: { role: 'eleve' } });
  if (eU) { console.error('compte élève KO:', eU.message); await purger(); process.exit(1); }
  eleveUserId = cree.user.id;
}
// Un paiement réglé sur la fiche : ce qui doit RESTER visible quand le catalogue est masqué.
await svc.from('paiements').insert({ profile_id: demo.id, client_id: fiche.id, intitule: 'Carnet témoin (réglé)', montant: 42, statut: 'paid', mode: 'especes', date: '2026-09-01', date_encaissement: '2026-09-01' });
// État de départ : offres visibles, grille publique masquée (le cas Manon).
await svc.from('profiles').update({ afficher_tarifs: false }).eq('id', demo.id);
if (V108) await svc.from('profiles').update({ offres_espace: true }).eq('id', demo.id);

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
  const ctxProf = await browser.newContext({ viewport: { width: 1280, height: 1000 } });
  await ctxProf.addCookies((await sessionCookies('camille@atelier-soleil.fr')).map(cc => ({ ...cc, url: BASE, sameSite: 'Lax' })));
  const page = await ctxProf.newPage();
  const erreurs = [];
  page.on('pageerror', e => erreurs.push(String(e).slice(0, 160)));

  const ctxEleve = await browser.newContext({ viewport: { width: 420, height: 1000 } });
  await ctxEleve.addCookies((await sessionCookies(EMAIL_ELEVE)).map(cc => ({ ...cc, url: BASE, sameSite: 'Lax' })));
  const pe = await ctxEleve.newPage();
  pe.on('pageerror', e => erreurs.push('eleve: ' + String(e).slice(0, 160)));

  // ── 0. Avant : la section est là ────────────────────────────────────────
  console.log('\n— 0. Espace élève AVANT : le catalogue est proposé —');
  await pe.goto(`${BASE}/p/${demo.studio_slug}/espace`, { waitUntil: 'domcontentloaded', timeout: 120000 });
  await pe.waitForSelector('text=Carnet témoin (réglé)', { timeout: 90000 });
  const avant = await pe.innerText('body');
  c('la section « Les offres du studio » est affichée', avant.includes('Les offres du studio'));
  c('la mini-aide propose « Comment acheter un carnet ou un abonnement ? »', avant.includes('Comment acheter un carnet ou un abonnement'));

  // ── A. L'interrupteur ────────────────────────────────────────────────────
  console.log('\n— A. Paramètres → Portail public → Ma page —');
  await page.goto(`${BASE}/parametres?tab=portail&s=page`, { waitUntil: 'domcontentloaded', timeout: 120000 });
  await page.waitForSelector('text=Proposer mes offres dans l\'espace de mes élèves', { timeout: 90000 });
  c('l\'interrupteur « Proposer mes offres dans l\'espace de mes élèves » est rendu', true);
  const bouton = page.locator('button.toggle-btn', { hasText: 'Proposer mes offres dans l\'espace' });
  c('il est ACTIVÉ par défaut', (await bouton.getAttribute('aria-pressed')) === 'true');
  const [rep] = await Promise.all([
    page.waitForResponse(r => r.url().includes('/api/profile/offres-espace'), { timeout: 45000 }),
    bouton.click(),
  ]);
  const corps = await rep.json().catch(() => ({}));
  if (V108) {
    c('la route répond 200 avec visible=false', rep.status() === 200 && corps.visible === false, `status ${rep.status()} · ${JSON.stringify(corps)}`);
    const { data: p } = await svc.from('profiles').select('offres_espace').eq('id', demo.id).maybeSingle();
    c('profiles.offres_espace = false EN BASE', p?.offres_espace === false);
    await page.waitForTimeout(500);
    c('l\'interrupteur passe à désactivé à l\'écran', (await bouton.getAttribute('aria-pressed')) === 'false');
  } else {
    c('sans v108 : 503 MIGRATION_V108_REQUISE, jamais un faux « ok »', rep.status() === 503 && corps.code === 'MIGRATION_V108_REQUISE', `status ${rep.status()} · ${JSON.stringify(corps).slice(0, 120)}`);
    c('l\'interrupteur reste activé à l\'écran', (await bouton.getAttribute('aria-pressed')) === 'true');
  }

  // ── B. L'espace élève ────────────────────────────────────────────────────
  console.log('\n— B. Espace élève APRÈS —');
  await pe.reload({ waitUntil: 'domcontentloaded', timeout: 120000 });
  await pe.waitForSelector('text=Carnet témoin (réglé)', { timeout: 90000 });
  const apres = await pe.innerText('body');
  if (V108) {
    c('la section « Les offres du studio » a DISPARU', !apres.includes('Les offres du studio'));
    c('la question « Comment acheter » a disparu de la mini-aide', !apres.includes('Comment acheter un carnet ou un abonnement'));
    c('aucun bouton « Demander » ni « Payer en ligne » dans l\'espace', (await pe.locator('button:has-text("Demander"), a:has-text("Payer en ligne")').count()) === 0);
  } else {
    c('sans v108 : la section reste (dégradé assumé)', apres.includes('Les offres du studio'));
  }
  c('le paiement réglé de l\'élève est toujours affiché', apres.includes('Carnet témoin (réglé)'));
  c('« Mes paiements » est toujours là', apres.includes('Mes paiements'));

  // ── C. La route de demande d'offre ───────────────────────────────────────
  console.log('\n— C. POST demander-offre quand rien ne propose les offres —');
  const repDemande = await pe.request.post(`${BASE}/api/portail/${demo.studio_slug}/demander-offre`, {
    data: { offreId: offreDemo.id, prenom: 'Témoin', email: EMAIL_ELEVE, verif_hp: '' },
  });
  const corpsDemande = await repDemande.json().catch(() => ({}));
  if (V108) {
    c('la route REFUSE (403) : ni espace ni grille publique', repDemande.status() === 403, `status ${repDemande.status()} · ${JSON.stringify(corpsDemande).slice(0, 100)}`);
    const { count } = await svc.from('demandes_offre').select('id', { count: 'exact', head: true }).eq('profile_id', demo.id).eq('offre_id', offreDemo.id).eq('client_id', fiche.id);
    c('aucune demande écrite en base', count === 0);
  } else {
    c('sans v108 : la demande passe comme avant', repDemande.status() === 200, `status ${repDemande.status()}`);
  }

  // ── D. Réactivation ──────────────────────────────────────────────────────
  console.log('\n— D. Réactiver : la section revient —');
  if (V108) {
    const repOn = await page.request.patch(`${BASE}/api/profile/offres-espace`, { data: { visible: true } });
    c('la route réactive (200, visible=true)', repOn.status() === 200);
    await pe.reload({ waitUntil: 'domcontentloaded', timeout: 120000 });
    await pe.waitForSelector('text=Carnet témoin (réglé)', { timeout: 90000 });
    const retour = await pe.innerText('body');
    c('la section « Les offres du studio » est revenue', retour.includes('Les offres du studio'));
    c('la mini-aide repropose « Comment acheter »', retour.includes('Comment acheter un carnet ou un abonnement'));
  }
  c('aucune erreur de page (prof et élève)', erreurs.length === 0, erreurs.join(' | '));
} finally {
  await browser.close().catch(() => {});
  await purger();
  console.log('\nTémoins purgés et réglages démo restaurés.');
}

console.log(`\nRésultat : ${ok} OK / ${ko} KO`);
process.exit(ko === 0 ? 0 : 1);
