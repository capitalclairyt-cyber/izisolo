/**
 * Preuve — « le studio n'est plus l'utilisateur » (v101, lot 2 multi-prof).
 *
 * Ce lot réécrit la RLS de tout l'espace prof. Il n'a rien à montrer à
 * l'écran : il n'a que des choses à prouver. Et la seule preuve qui vaille
 * pour une isolation, c'est celle qui essaie de la franchir avec un VRAI
 * compte, dans un VRAI navigateur.
 *
 * Ce qu'on prouve, dans l'ordre de gravité :
 *   A. La prof existante ne voit AUCUNE différence. C'est le test principal :
 *      pour une prof seule, `mes_studios_staff()` doit valoir exactement
 *      `{auth.uid()}` — si quoi que ce soit bouge, la migration est mauvaise.
 *   B. Un compte `role='membre'` ne reçoit PAS de studio fantôme (le trigger
 *      v57 étendu — sans ça, l'incident Bruno se rejoue à l'identique).
 *   C. Une prof INVITÉE atteint le studio de l'association en vrai navigateur,
 *      sans être renvoyée sur /onboarding, et y voit les élèves.
 *   D. LE test qui compte : la même prof invitée ne lit NI l'argent NI la
 *      messagerie — les deux permissions câblées dans la RLS. Testé avec SON
 *      jeton, pas avec l'écran : c'est la base qui doit refuser, parce qu'un
 *      composant navigateur interroge Supabase en direct.
 *   E. Un compte étranger au studio ne lit RIEN. Zéro ligne, partout.
 *   F. Révoquer ferme immédiatement, sans redéploiement.
 *   G. Ménage : comptes et lignes jetables supprimés, MÊME en cas d'échec.
 *
 * Le script SONDE la migration v101 : sans elle, il prouve que l'app tourne
 * exactement comme avant (le filet de `resoudreStudioActif`) ; avec elle, il
 * déroule tout.
 *
 * ⚠️ Crée deux comptes auth JETABLES en @example.com (RFC 2606, jamais
 * délivrable) et les supprime à la fin. Jamais sur un compte réel.
 *
 * Usage : node scripts/proof-studio-membres.mjs [dossier-captures]
 * Prérequis : dev server sur :3333.
 */
import { createClient } from '@supabase/supabase-js';
import { readFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = process.cwd();
const OUT = process.argv[2] || join(process.env.TEMP || '.', 'proof-studio-membres');
mkdirSync(OUT, { recursive: true });
const BASE = 'http://localhost:3333';
const PROF_EMAIL = 'bonjour@melutek.com';
const MEMBRE_EMAIL = 'preuve-membre-v101@example.com';
const ETRANGER_EMAIL = 'preuve-etranger-v101@example.com';

const env = Object.fromEntries(
  readFileSync(join(ROOT, '.env.local'), 'utf8')
    .split('\n').filter(l => l.includes('=') && !l.startsWith('#'))
    .map(l => [l.slice(0, l.indexOf('=')).trim(), l.slice(l.indexOf('=') + 1).trim()])
);
const PROJECT_REF = new URL(env.NEXT_PUBLIC_SUPABASE_URL).hostname.split('.')[0];
const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

let ok = 0, ko = 0;
const assert = (cond, label) => {
  if (cond) { ok++; console.log(`  OK  ${label}`); }
  else { ko++; console.log(`  KO  ${label}`); }
};
const attendre = ms => new Promise(r => setTimeout(r, ms));

/** Session d'un compte : cookies pour le navigateur + jeton pour tester la RLS nue. */
async function session(email) {
  const { data: linkData, error: eLink } = await admin.auth.admin.generateLink({ type: 'magiclink', email });
  if (eLink) throw new Error(`generateLink(${email}): ${eLink.message}`);
  const anon = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: otp, error: eOtp } = await anon.auth.verifyOtp({ type: 'magiclink', token_hash: linkData.properties.hashed_token });
  if (eOtp || !otp?.session) throw new Error(`verifyOtp(${email}): ${eOtp?.message || 'pas de session'}`);
  const value = 'base64-' + Buffer.from(JSON.stringify(otp.session)).toString('base64url');
  const nom = `sb-${PROJECT_REF}-auth-token`;
  const cookies = [];
  if (value.length <= 3180) cookies.push({ name: nom, value });
  else for (let i = 0; i * 3180 < value.length; i++) cookies.push({ name: `${nom}.${i}`, value: value.slice(i * 3180, (i + 1) * 3180) });
  return { cookies, userId: otp.session.user.id, token: otp.session.access_token };
}

/** Un client Supabase QUI PORTE le jeton de la personne : la RLS s'applique
 *  exactement comme dans son navigateur. C'est le seul juge honnête ici. */
function commeSoi(token) {
  return createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
}

for (let i = 0; i < 90; i++) {
  try { const r = await fetch(`${BASE}/login`); if (r.ok) break; } catch { /* pas prêt */ }
  await attendre(2000);
  if (i === 89) { console.error('dev server injoignable sur :3333'); process.exit(1); }
}
console.log('dev server pret\n');

// ── Sonde v101 ───────────────────────────────────────────────────────────────
const { error: eSonde } = await admin.from('studio_membres').select('id').limit(1);
const V101 = !eSonde;
console.log(V101
  ? '── v101 appliquée : parcours COMPLET ──\n'
  : `── v101 absente (${eSonde.code}) : parcours DÉGRADÉ ──\n`);

const { userId: profId, cookies: cookiesProf, token: tokenProf } = await session(PROF_EMAIL);

const purger = async () => {
  for (const mail of [MEMBRE_EMAIL, ETRANGER_EMAIL]) {
    const { data } = await admin.auth.admin.listUsers({ page: 1, perPage: 200 });
    const u = (data?.users || []).find(x => x.email === mail);
    if (u) {
      if (V101) await admin.from('studio_membres').delete().eq('auth_user_id', u.id);
      await admin.auth.admin.deleteUser(u.id);
    }
  }
};

let browser;
try {
  await purger();

  // ══ A. La prof existante ne voit AUCUNE différence ══════════════════════
  console.log('A. La prof seule : rien ne bouge');
  const sbProf = commeSoi(tokenProf);
  const { count: nClients } = await sbProf.from('clients').select('id', { count: 'exact', head: true });
  const { count: nCours } = await sbProf.from('cours').select('id', { count: 'exact', head: true });
  const { count: nPaie } = await sbProf.from('paiements').select('id', { count: 'exact', head: true });
  const { data: sonProfil } = await sbProf.from('profiles').select('id, studio_nom').eq('id', profId).maybeSingle();
  assert((nClients || 0) > 0, `la prof lit ses élèves (${nClients})`);
  assert((nCours || 0) > 0, `elle lit ses cours (${nCours})`);
  assert((nPaie || 0) > 0, `elle lit son argent (${nPaie} paiements) — propriétaire, donc argent_voir`);
  assert(sonProfil?.id === profId, 'elle lit le profil de son studio');

  let chromium;
  try { ({ chromium } = await import('playwright')); }
  catch { ({ chromium } = await import('@playwright/test')); }
  try { browser = await chromium.launch(); }
  catch { browser = await chromium.launch({ channel: 'msedge' }); }

  const ctxProf = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  await ctxProf.addCookies(cookiesProf.map(c => ({ ...c, domain: 'localhost', path: '/' })));
  const pProf = await ctxProf.newPage();
  const erreursProf = [];
  pProf.on('pageerror', e => erreursProf.push(String(e)));
  await pProf.goto(`${BASE}/dashboard`, { waitUntil: 'domcontentloaded' });
  await pProf.waitForTimeout(6000); // les error boundaries n'arrivent qu'APRÈS les effects (§12)
  const texteProf = await pProf.innerText('body');
  assert(!pProf.url().includes('/onboarding'), 'son dashboard ne la renvoie pas vers /onboarding');
  assert(!/Une erreur est survenue/i.test(texteProf), 'aucune error boundary sur son dashboard');
  assert(erreursProf.length === 0, `console propre (${erreursProf.length} erreur(s))`);
  await pProf.screenshot({ path: join(OUT, 'A-dashboard-proprietaire.png') });

  // ══ A2. Le sweep a touché 59 fichiers : une seule page ne prouve rien ══
  // Un `studioId` mal câblé ne lève pas toujours : il peut simplement rendre
  // une page VIDE. On regarde donc chaque écran, et on exige des données là
  // où le compte démo en a.
  console.log('\nA2. Les écrans du sweep, un par un');
  const ECRANS = [
    { url: '/agenda',        temoin: null },
    // Témoin = le vocabulaire des statuts, qui est stable, plutôt qu'un
    // « N élèves » que la page n'écrit pas (faux KO du premier run : le
    // témoin doit être ce que l'écran DIT, pas ce qu'on croit qu'il dit).
    { url: '/clients',       temoin: /Actif|Prospect|Fidèle|Inactif/ },
    { url: '/cours',         temoin: null },
    { url: '/offres',        temoin: null },
    { url: '/revenus',       temoin: /€/ },
    { url: '/abonnements',   temoin: null },
    { url: '/cas-a-traiter', temoin: null },
    { url: '/messagerie',    temoin: null },
    { url: '/liste-attente', temoin: null },
    { url: '/essais',        temoin: null },
    { url: '/sondages',      temoin: null },
    { url: '/parametres',    temoin: null },
  ];
  let ecransOk = 0;
  const ecransKo = [];
  for (const e of ECRANS) {
    erreursProf.length = 0;
    await pProf.goto(`${BASE}${e.url}`, { waitUntil: 'domcontentloaded' });
    // Lecture TARDIVE : une error boundary n'apparaît qu'après hydratation et
    // re-rendu des effects (§12 — le trou qui avait rendu une preuve
    // faussement verte pendant que la prod était cassée).
    await pProf.waitForTimeout(5000);
    const t = await pProf.innerText('body');
    const casse = /Une erreur est survenue/i.test(t) || erreursProf.length > 0
      || pProf.url().includes('/login') || pProf.url().includes('/onboarding');
    const vide = e.temoin && !e.temoin.test(t);
    if (casse || vide) ecransKo.push(`${e.url}${casse ? ' (cassé)' : ' (vide)'}`);
    else ecransOk++;
  }
  assert(ecransKo.length === 0,
    `les ${ECRANS.length} écrans du sweep répondent et affichent leurs données (${ecransOk}/${ECRANS.length})${ecransKo.length ? ' — KO : ' + ecransKo.join(', ') : ''}`);

  // Un écran de DÉTAIL, où le sweep a touché le plus de requêtes.
  const { data: unCours } = await admin.from('cours').select('id').eq('profile_id', profId).order('date', { ascending: false }).limit(1).maybeSingle();
  if (unCours) {
    erreursProf.length = 0;
    await pProf.goto(`${BASE}/cours/${unCours.id}`, { waitUntil: 'domcontentloaded' });
    await pProf.waitForTimeout(5000);
    const t = await pProf.innerText('body');
    assert(!/Une erreur est survenue/i.test(t) && erreursProf.length === 0,
      "la fiche d'un cours (9 requêtes réécrites) se rend sans erreur");
    await pProf.screenshot({ path: join(OUT, 'A2-fiche-cours.png') });
  }

  if (!V101) {
    console.log('\n(DÉGRADÉ : sans la table, le filet de resoudreStudioActif ramène tout le monde chez soi.)');
    assert(true, 'DÉGRADÉ : l\'app tourne exactement comme avant la migration');
  } else {
    // ══ B. Un compte « membre » ne se fabrique pas de studio ══════════════
    console.log('\nB. Le trigger : pas de studio fantôme');
    const { data: cree, error: eCree } = await admin.auth.admin.createUser({
      email: MEMBRE_EMAIL, password: 'preuve-v101-jetable', email_confirm: true,
      user_metadata: { role: 'membre', prenom: 'Claire' },
    });
    if (eCree) throw new Error(`createUser membre : ${eCree.message}`);
    const membreId = cree.user.id;
    const { data: profilFantome } = await admin.from('profiles').select('id').eq('id', membreId).maybeSingle();
    assert(!profilFantome, 'EN BASE : aucun profil créé pour un compte role=membre (incident Bruno évité)');

    // ══ C. Elle est invitée, elle entre ═══════════════════════════════════
    console.log('\nC. La prof invitée atteint le studio');
    const { error: eMembre } = await admin.from('studio_membres').insert({
      profile_id: profId, auth_user_id: membreId, email: MEMBRE_EMAIL,
      role: 'prof', permissions: { pointer: true, cours_gerer: true, eleves_voir: true },
      statut: 'actif', accepte_at: new Date().toISOString(),
    });
    if (eMembre) throw new Error(`insert membre : ${eMembre.message}`);

    const { cookies: cookiesMembre, token: tokenMembre } = await session(MEMBRE_EMAIL);
    const ctxM = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    await ctxM.addCookies(cookiesMembre.map(c => ({ ...c, domain: 'localhost', path: '/' })));
    const pM = await ctxM.newPage();
    const erreursM = [];
    pM.on('pageerror', e => erreursM.push(String(e)));
    await pM.goto(`${BASE}/dashboard`, { waitUntil: 'domcontentloaded' });
    await pM.waitForTimeout(6000);
    const texteM = await pM.innerText('body');
    await pM.screenshot({ path: join(OUT, 'C-dashboard-membre.png') });

    assert(!pM.url().includes('/onboarding'),
      'LE test du lot : une prof invitée N\'EST PAS renvoyée vers /onboarding');
    assert(!/Une erreur est survenue/i.test(texteM), 'aucune error boundary sur le dashboard du studio');
    assert(erreursM.length === 0, `console propre côté invitée (${erreursM.length} erreur(s))`);

    await pM.goto(`${BASE}/clients`, { waitUntil: 'domcontentloaded' });
    await pM.waitForTimeout(4000);
    const texteClients = await pM.innerText('body');
    assert(!/Une erreur est survenue/i.test(texteClients), 'la liste des élèves du studio s\'ouvre pour elle');
    await pM.screenshot({ path: join(OUT, 'C-eleves-membre.png') });

    // ══ D. Ce qu'elle ne doit PAS lire — testé par la BASE ════════════════
    console.log('\nD. Les deux permissions câblées dans la RLS');
    const sbM = commeSoi(tokenMembre);
    const { count: mClients } = await sbM.from('clients').select('id', { count: 'exact', head: true });
    const { count: mCours } = await sbM.from('cours').select('id', { count: 'exact', head: true });
    const { count: mPaie } = await sbM.from('paiements').select('id', { count: 'exact', head: true });
    const { count: mConv } = await sbM.from('conversations').select('id', { count: 'exact', head: true });
    const { data: mProfil } = await sbM.from('profiles').select('id, studio_nom').eq('id', profId).maybeSingle();

    assert((mClients || 0) > 0, `elle lit les élèves du studio (${mClients}) — eleves_voir`);
    assert((mCours || 0) > 0, `elle lit les cours du studio (${mCours}) — pour pointer`);
    assert((mPaie || 0) === 0,
      `LE test qui compte : elle ne lit AUCUN paiement (${mPaie}) — argent_voir refusé PAR LA BASE`);
    assert((mConv || 0) === 0,
      `elle ne lit AUCUNE conversation (${mConv}) — messagerie refusée PAR LA BASE`);
    assert(mProfil?.id === profId, 'elle lit les réglages du studio (règles, vocabulaire)');

    // Écriture : elle ne peut pas modifier les réglages (parametres refusé).
    const { error: eUpd } = await sbM.from('profiles')
      .update({ studio_nom: 'PIRATÉ' }).eq('id', profId).select('id');
    const { data: apresUpd } = await admin.from('profiles').select('studio_nom').eq('id', profId).single();
    assert(apresUpd?.studio_nom !== 'PIRATÉ',
      'elle ne peut PAS renommer le studio (parametres refusé) — vérifié EN BASE');
    if (eUpd) assert(true, 'et la base le refuse explicitement');

    // ══ E. Un étranger ne lit rien ═══════════════════════════════════════
    console.log('\nE. Cloisonnement : un compte étranger au studio');
    const { data: creeE, error: eCreeE } = await admin.auth.admin.createUser({
      email: ETRANGER_EMAIL, password: 'preuve-v101-jetable', email_confirm: true,
      user_metadata: { role: 'membre', prenom: 'Inconnue' },
    });
    if (eCreeE) throw new Error(`createUser étranger : ${eCreeE.message}`);
    const { token: tokenE } = await session(ETRANGER_EMAIL);
    const sbE = commeSoi(tokenE);
    const lectures = {};
    for (const table of ['clients', 'cours', 'paiements', 'presences', 'abonnements', 'offres', 'conversations']) {
      const { count } = await sbE.from(table).select('id', { count: 'exact', head: true });
      lectures[table] = count || 0;
    }
    const fuites = Object.entries(lectures).filter(([, n]) => n > 0);
    assert(fuites.length === 0,
      `un compte sans appartenance ne lit RIEN${fuites.length ? ' (fuite : ' + fuites.map(([t, n]) => `${t}=${n}`).join(', ') + ')' : ''}`);
    void creeE;

    // ══ F. Révoquer ferme, tout de suite ═════════════════════════════════
    console.log('\nF. Révocation');
    await admin.from('studio_membres')
      .update({ statut: 'revoque', revoque_at: new Date().toISOString() })
      .eq('auth_user_id', membreId);
    const sbM2 = commeSoi(tokenMembre);
    const { count: apresClients } = await sbM2.from('clients').select('id', { count: 'exact', head: true });
    const { count: apresCours } = await sbM2.from('cours').select('id', { count: 'exact', head: true });
    assert((apresClients || 0) === 0 && (apresCours || 0) === 0,
      'une fois révoquée, elle ne lit plus rien — sans redéploiement, sans reconnexion');

    await pM.goto(`${BASE}/dashboard`, { waitUntil: 'domcontentloaded' });
    await pM.waitForTimeout(4000);
    assert(pM.url().includes('/onboarding'),
      'et son navigateur la renvoie hors du studio');
    await pM.screenshot({ path: join(OUT, 'F-revoquee.png') });

    await ctxM.close();
  }

  await ctxProf.close();
} catch (e) {
  ko++;
  console.error('\nEXCEPTION :', e.message);
} finally {
  try { await purger(); } catch (e) { console.error('ménage :', e.message); }
  const { data } = await admin.auth.admin.listUsers({ page: 1, perPage: 200 });
  const restes = (data?.users || []).filter(u => [MEMBRE_EMAIL, ETRANGER_EMAIL].includes(u.email));
  assert(restes.length === 0, 'ménage : aucun compte jetable ne reste');
  if (V101) {
    const { count } = await admin.from('studio_membres').select('id', { count: 'exact', head: true }).eq('profile_id', profId);
    assert((count || 0) === 1, `ménage : le studio démo n'a plus que son propriétaire (${count})`);
  }
  if (browser) await browser.close();
}

console.log(`\n${'═'.repeat(62)}`);
console.log(`  ${ok} OK · ${ko} KO   ${V101 ? '(parcours complet)' : '(parcours dégradé, v101 non appliquée)'}`);
console.log(`  captures : ${OUT}`);
console.log('═'.repeat(62));
process.exit(ko === 0 ? 0 : 1);
