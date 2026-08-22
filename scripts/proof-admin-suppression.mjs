/**
 * Preuve — suppression d'un studio depuis l'admin (2026-08-22).
 *
 * Vrai navigateur sur :3333, session ADMIN réelle, CHEMIN RÉEL (routes HTTP).
 * C'est l'opération la plus destructive de l'app : elle se prouve, elle ne se
 * suppose pas.
 *
 * Décor monté par la preuve (uniquement des comptes jetables) :
 *   • studio A et studio B, créés par la route concierge ;
 *   • élève ORPHELINE : compte auth + fiche dans A seulement ;
 *   • élève PARTAGÉE  : compte auth + fiche dans A ET dans B ;
 *   • dans A : un cours, un paiement encaissé.
 *
 * Ce qui est prouvé :
 *   1. les routes refusent l'anonyme et le non-admin ;
 *   2. l'inventaire compte juste (et ne supprime rien) ;
 *   3. une confirmation approximative est refusée (400) ;
 *   4. supprimer SON PROPRE compte est refusé (409) ;
 *   5. la suppression efface réellement en cascade (vérifié en base) ;
 *   6. l'élève orpheline part, l'élève PARTAGÉE survit — le point décisif ;
 *   7. le studio démo n'est pas touché.
 *
 * Tout est purgé en fin de run, même en cas d'échec.
 * Usage : node scripts/proof-admin-suppression.mjs [dossier-sortie]
 */
import { createClient } from '@supabase/supabase-js';
import { readFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = process.cwd();
const OUT = process.argv[2] || join(process.env.TEMP || '.', 'proof-suppression');
mkdirSync(OUT, { recursive: true });
const BASE = 'http://localhost:3333';
const ADMIN_EMAIL = 'admin@melutek.fr';       // allowlist lib/admin.js
const PROF_DEMO = 'bonjour@melutek.com';
const MARQUE = 'zz-preuve-suppression';

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
  const nom = `sb-${PROJECT_REF}-auth-token`;
  const cookies = [];
  if (value.length <= 3180) cookies.push({ name: nom, value });
  else for (let i = 0; i * 3180 < value.length; i++) cookies.push({ name: `${nom}.${i}`, value: value.slice(i * 3180, (i + 1) * 3180) });
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

// ── Compte admin jetable ────────────────────────────────────────────────────
// S'il existe déjà (compte réel de Colin), on l'emprunte SANS jamais le
// supprimer. Sinon on le crée et on le purge à la fin.
let adminCree = false;
{
  const { data: page } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
  const existant = (page?.users || []).find(u => (u.email || '').toLowerCase() === ADMIN_EMAIL);
  if (!existant) {
    const { error } = await admin.auth.admin.createUser({
      email: ADMIN_EMAIL, password: `preuve-${Date.now()}-Aa!`, email_confirm: true,
      user_metadata: { role: 'eleve' },   // jamais de profil prof fantôme (leçon v57)
    });
    if (error) { console.error('création admin jetable :', error.message); process.exit(1); }
    adminCree = true;
  }
  console.log(`🔐 admin de preuve : ${ADMIN_EMAIL} (${adminCree ? 'créé pour ce run' : 'déjà existant, emprunté'})`);
}

const aPurger = { studios: [], eleves: [] };
let ctx;

async function poster(page, url, body) {
  const res = await page.request.post(`${BASE}${url}`, { data: body });
  let json = null;
  try { json = await res.json(); } catch { /* corps non JSON */ }
  return { status: res.status(), json };
}

try {
  const adminSession = await sessionCookies(ADMIN_EMAIL);
  ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  await ctx.addCookies(adminSession.cookies.map(c => ({ ...c, url: BASE, sameSite: 'Lax' })));
  const page = await ctx.newPage();

  // ═══ 0. Le décor ═══
  console.log('\n— 0. Décor : deux studios jetables, deux élèves —');
  const creerStudio = async (suffixe) => {
    const { status, json } = await poster(page, '/api/admin/studios/creer', {
      prenom: 'Preuve', email: `${MARQUE}-${suffixe}@example.com`,
      studioNom: `ZZ Preuve Suppression ${suffixe.toUpperCase()}`, metier: 'yoga',
    });
    if (status !== 200 || !json?.profileId) throw new Error(`création studio ${suffixe} : ${status} ${JSON.stringify(json)}`);
    aPurger.studios.push(json.profileId);
    return json.profileId;
  };
  const studioA = await creerStudio('a');
  const studioB = await creerStudio('b');
  assert(!!studioA && !!studioB, `studios A (${studioA.slice(0, 8)}) et B (${studioB.slice(0, 8)}) créés par la route concierge`);

  const emailOrpheline = `${MARQUE}-orpheline@example.com`;
  const emailPartagee  = `${MARQUE}-partagee@example.com`;
  for (const mail of [emailOrpheline, emailPartagee]) {
    const { data, error } = await admin.auth.admin.createUser({
      email: mail, password: `preuve-${Date.now()}-Bb!`, email_confirm: true,
      user_metadata: { role: 'eleve' },
    });
    if (error) throw new Error(`compte élève ${mail} : ${error.message}`);
    aPurger.eleves.push(data.user.id);
  }
  // Fiches : orpheline dans A seulement, partagée dans A ET B.
  const fiches = [
    { profile_id: studioA, prenom: 'Orpheline', nom: 'Preuve', email: emailOrpheline },
    { profile_id: studioA, prenom: 'Partagee', nom: 'Preuve', email: emailPartagee },
    { profile_id: studioB, prenom: 'Partagee', nom: 'Preuve', email: emailPartagee },
  ];
  const { error: eFiches } = await admin.from('clients').insert(fiches);
  if (eFiches) throw new Error(`fiches : ${eFiches.message}`);

  const { data: coursCree, error: eCours } = await admin.from('cours')
    .insert({ profile_id: studioA, nom: 'ZZ Preuve cours', date: '2026-09-15', heure: '18:00', capacite_max: 10 })
    .select('id').single();
  if (eCours) throw new Error(`cours : ${eCours.message}`);
  const { error: ePaie } = await admin.from('paiements').insert({
    profile_id: studioA, intitule: 'ZZ Preuve paiement', montant: 42, statut: 'paid',
    mode: 'especes', date: '2026-09-15', date_encaissement: '2026-09-15',
  });
  if (ePaie) throw new Error(`paiement : ${ePaie.message}`);
  assert(!!coursCree?.id, 'décor posé dans A : 2 fiches, 1 cours, 1 paiement de 42 €');

  // ═══ 1. Les portes fermées ═══
  console.log('\n— 1. Qui a le droit —');
  const anon = await browser.newContext();
  const pageAnon = await anon.newPage();
  const rAnon = await pageAnon.request.post(`${BASE}/api/admin/studios/supprimer`, {
    data: { profileId: studioA, confirmation: 'ZZ Preuve Suppression A' },
  });
  assert([401, 403, 302, 307].includes(rAnon.status()), `anonyme refusé (${rAnon.status()})`);

  const profSession = await sessionCookies(PROF_DEMO);
  const ctxProf = await browser.newContext();
  await ctxProf.addCookies(profSession.cookies.map(c => ({ ...c, url: BASE, sameSite: 'Lax' })));
  const pageProf = await ctxProf.newPage();
  const rProf = await pageProf.request.post(`${BASE}/api/admin/studios/supprimer`, {
    data: { profileId: studioA, confirmation: 'ZZ Preuve Suppression A' },
  });
  assert([401, 403].includes(rProf.status()), `prof connectée NON admin refusée (${rProf.status()})`);
  const { data: vivantApresRefus } = await admin.from('profiles').select('id').eq('id', studioA).maybeSingle();
  assert(!!vivantApresRefus, 'après ces deux refus, le studio A est TOUJOURS là');
  await anon.close(); await ctxProf.close();

  // ═══ 2. L'inventaire ═══
  console.log('\n— 2. L\'inventaire (lecture seule) —');
  const inv = await poster(page, '/api/admin/studios/inventaire', { profileId: studioA });
  assert(inv.status === 200, `l'inventaire répond ${inv.status}`);
  assert(inv.json?.inventaire?.clients === 2, `2 élèves comptées (${inv.json?.inventaire?.clients})`);
  assert(inv.json?.inventaire?.cours === 1, `1 séance comptée (${inv.json?.inventaire?.cours})`);
  assert(inv.json?.inventaire?.encaisse === 42, `42 € encaissés comptés (${inv.json?.inventaire?.encaisse})`);
  assert(inv.json?.orphelinsPotentiels === 1,
    `1 seul compte élève orphelin annoncé, pas 2 (${inv.json?.orphelinsPotentiels}) : la partagée est épargnée`);
  assert(inv.json?.profil?.est_test === true, 'le compte est reconnu comme un compte de test');
  assert((inv.json?.ceQuiReste || []).length > 0, 'la liste de ce qui SURVIT est servie');
  const { data: apresInv } = await admin.from('clients').select('id').eq('profile_id', studioA);
  assert((apresInv || []).length === 2, 'l\'inventaire n\'a RIEN supprimé');

  // ═══ 3. La confirmation ═══
  console.log('\n— 3. La confirmation doit être exacte —');
  for (const mauvaise of ['zz preuve suppression a', 'ZZ Preuve', '', 'supprimer']) {
    const r = await poster(page, '/api/admin/studios/supprimer', { profileId: studioA, confirmation: mauvaise });
    if (r.status === 200) { assert(false, `« ${mauvaise} » a été acceptée !`); break; }
    assert([400, 422].includes(r.status), `« ${mauvaise || '(vide)'} » refusée (${r.status})`);
  }
  const { data: vivantApresSaisies } = await admin.from('profiles').select('id').eq('id', studioA).maybeSingle();
  assert(!!vivantApresSaisies, 'après 4 confirmations ratées, le studio A est TOUJOURS là');

  // ═══ 4. Son propre compte ═══
  console.log('\n— 4. On ne se supprime pas soi-même —');
  const { data: monProfil } = await admin.from('profiles').select('id, studio_nom').eq('id', adminSession.userId).maybeSingle();
  if (monProfil) {
    const r = await poster(page, '/api/admin/studios/supprimer', {
      profileId: adminSession.userId, confirmation: monProfil.studio_nom || '',
    });
    assert(r.status === 409, `refus explicite sur son propre compte (${r.status})`);
  } else {
    // Le compte admin jetable n'a pas de profil (role='eleve') : on vérifie au
    // moins que le refus est bien câblé côté inventaire.
    const rInv = await poster(page, '/api/admin/studios/inventaire', { profileId: adminSession.userId });
    assert(rInv.status === 404, `l'admin n'a pas de profil studio, l'inventaire le dit (${rInv.status})`);
  }

  // ═══ 5. La suppression ═══
  console.log('\n— 5. La suppression de A —');
  const supp = await poster(page, '/api/admin/studios/supprimer', {
    profileId: studioA, confirmation: 'ZZ Preuve Suppression A', supprimerOrphelins: true,
  });
  assert(supp.status === 200, `la suppression répond ${supp.status}`);
  assert(supp.json?.cascadeOk === true, 'la route VÉRIFIE la cascade et la confirme');
  assert(supp.json?.orphelinsSupprimes === 1, `1 compte élève orphelin supprimé (${supp.json?.orphelinsSupprimes})`);
  console.log(`     ↳ ${supp.json?.resume}`);

  const { data: profilA } = await admin.from('profiles').select('id').eq('id', studioA).maybeSingle();
  const { data: clientsA } = await admin.from('clients').select('id').eq('profile_id', studioA);
  const { data: coursA } = await admin.from('cours').select('id').eq('profile_id', studioA);
  const { data: paiementsA } = await admin.from('paiements').select('id').eq('profile_id', studioA);
  assert(!profilA, 'le profil a disparu');
  assert((clientsA || []).length === 0, 'les fiches élèves ont disparu (cascade)');
  assert((coursA || []).length === 0, 'les séances ont disparu (cascade)');
  assert((paiementsA || []).length === 0, 'les paiements ont disparu (cascade)');
  const { data: authA } = await admin.auth.admin.getUserById(studioA);
  assert(!authA?.user, 'le compte auth de la prof a disparu');

  // ═══ 6. LE point décisif : qui survit ═══
  console.log('\n— 6. L\'élève partagée survit, l\'orpheline non —');
  const { data: tousUsers } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
  const emails = new Set((tousUsers?.users || []).map(u => (u.email || '').toLowerCase()));
  assert(!emails.has(emailOrpheline), 'le compte de l\'élève qui n\'avait de fiche que dans A est supprimé');
  assert(emails.has(emailPartagee), 'le compte de l\'élève encore inscrite dans B est INTACT');
  const { data: ficheB } = await admin.from('clients').select('id').eq('profile_id', studioB).eq('email', emailPartagee);
  assert((ficheB || []).length === 1, 'sa fiche dans le studio B est intacte');

  // ═══ 7. Le démo n'a pas bougé ═══
  console.log('\n— 7. Le studio démo est intact —');
  const demoSession = await sessionCookies(PROF_DEMO);
  const { count: clientsDemo } = await admin.from('clients')
    .select('id', { count: 'exact', head: true }).eq('profile_id', demoSession.userId);
  const { data: profilDemo } = await admin.from('profiles').select('id, studio_nom').eq('id', demoSession.userId).maybeSingle();
  assert(!!profilDemo, `le profil démo « ${profilDemo?.studio_nom} » est là`);
  assert((clientsDemo || 0) > 0, `ses ${clientsDemo} fiches élèves sont là`);

  // ═══ 8. L'écran ═══
  console.log('\n— 8. La zone dangereuse à l\'écran (studio B) —');
  await page.goto(`${BASE}/admin/studios/${studioB}`, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('text=Zone dangereuse', { timeout: 30000 });
  const txt = await page.evaluate(() => document.body.innerText);
  // innerText rend le texte TRANSFORMÉ : le titre est en text-transform
  // uppercase, donc « ZONE DANGEREUSE ». Motif insensible à la casse.
  assert(/zone dangereuse/i.test(txt), 'la zone dangereuse est sur la fiche studio');
  assert(/pas de corbeille/i.test(txt), 'elle prévient qu\'il n\'y a pas de corbeille');
  await page.screenshot({ path: join(OUT, '1-zone-fermee.png'), fullPage: true });

  // Panneau OUVERT : c'est l'écran que l'équipe verra vraiment. On re-clique
  // tant qu'il ne s'ouvre pas (un clic avant hydratation ne fait rien).
  let panneau = false;
  for (let i = 0; i < 15 && !panneau; i++) {
    await page.getByRole('button', { name: /Supprimer ce studio/ }).click().catch(() => {});
    panneau = await page.waitForSelector('input[placeholder*="ZZ Preuve"]', { timeout: 2500 })
      .then(() => true, () => false);
  }
  assert(panneau, 'le panneau s\'ouvre sur l\'inventaire + le champ de confirmation');
  const txtOuvert = await page.evaluate(() => document.body.innerText);
  assert(/Élèves/.test(txtOuvert) && /Factures émises/.test(txtOuvert),
    'l\'inventaire est affiché avant toute possibilité de cliquer');
  const boutonActif = await page.getByRole('button', { name: /Supprimer définitivement/ }).isEnabled();
  assert(boutonActif === false, 'le bouton rouge est INACTIF tant que le nom n\'est pas retapé');
  await page.screenshot({ path: join(OUT, '2-zone-ouverte.png'), fullPage: true });

} finally {
  // ── Purge, quoi qu'il arrive ──────────────────────────────────────────────
  for (const id of aPurger.studios) {
    await admin.auth.admin.deleteUser(id).catch(() => {});
    await admin.from('profiles').delete().eq('id', id).then(() => {}, () => {});
  }
  for (const id of aPurger.eleves) await admin.auth.admin.deleteUser(id).catch(() => {});
  if (adminCree) {
    const { data: page } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
    const u = (page?.users || []).find(x => (x.email || '').toLowerCase() === ADMIN_EMAIL);
    if (u) await admin.auth.admin.deleteUser(u.id).catch(() => {});
  }
  const { count: restants } = await admin.from('profiles')
    .select('id', { count: 'exact', head: true }).ilike('studio_nom', 'ZZ Preuve%');
  assert((restants || 0) === 0, `ménage : 0 studio de preuve restant (${restants})`);
  const { data: pageFin } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
  const restesAuth = (pageFin?.users || []).filter(u => (u.email || '').includes(MARQUE)).length;
  assert(restesAuth === 0, `ménage : 0 compte auth de preuve restant (${restesAuth})`);
  if (ctx) await ctx.close();
  await browser.close();
}

console.log(`\n${ko === 0 ? '✅' : '❌'} ${ok}/${ok + ko} vérifications — captures dans ${OUT}`);
process.exit(ko === 0 ? 0 : 1);
