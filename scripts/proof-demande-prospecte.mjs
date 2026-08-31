/**
 * Preuve — la demande d'une INCONNUE est actionnable (31/08/2026).
 *
 * L'INCIDENT : Maude reçoit une demande d'abonnement à 480 € signée
 * « Anne-Sophie », et écrit « je ne sais pas qui c'est et je ne vois pas ses
 * coordonnées ». Vérifié en base le jour même : la demande venait bien de la
 * page publique, avec un prénom et une adresse email — présents depuis la
 * première seconde. Aucun écran ne montrait cette adresse.
 *
 * Pire, le geste suivant était un cul-de-sac : « Attribuer l'offre » ouvrait
 * le tunnel de vente sur « Choisir un élève », une liste où cette personne
 * n'existe pas, avec un lien « Ajouter un élève » qui FERME la modale et perd
 * la demande — sans jamais avoir montré l'email à recopier.
 *
 * Le helper `emailDemandeur` existait pourtant dans lib/demande-offre, et il
 * était même testé par la spec CI. Un helper vert que personne n'appelle ne
 * protège rien : c'est la leçon de ce lot.
 *
 * Déroulé (vrai navigateur sur :3333, chemin réel) :
 *   A. Une visiteuse ANONYME demande une offre depuis la grille publique.
 *   B. EN BASE : la demande arrive sans fiche, avec son email.
 *   C. La prof VOIT l'adresse dans sa file, cliquable, et le badge qui dit
 *      d'où vient la demande.
 *   D. « Créer la fiche et attribuer » crée la fiche EN BASE avec le bon
 *      email, rattache la demande, et ouvre le tunnel sur le RÈGLEMENT.
 *   E. La vente s'enregistre et la demande sort de la file.
 *   F. Dédup : une seconde demande à la MÊME adresse ne fabrique pas une
 *      deuxième fiche — elle reprend celle qui existe.
 *
 * Re-runnable. Témoins purgés même en cas d'échec.
 *   node scripts/proof-demande-prospecte.mjs
 */
import { chromium } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';
import { createHash } from 'node:crypto';
import { readFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = process.argv[2] || join(process.env.TEMP || '.', 'proof-demande-prospecte');
mkdirSync(OUT, { recursive: true });

const BASE = 'http://localhost:3333';
const PROF_EMAIL = 'bonjour@melutek.com';
const MARQUEUR = '[preuve prospecte]';

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

/**
 * Re-clique jusqu'à ce que le témoin d'ouverture soit vrai. `waitForSelector`
 * trouve un bouton rendu côté SERVEUR avant que React n'ait attaché son
 * handler : le premier clic part dans le vide, et la preuve échoue sur un
 * défaut d'horloge, pas de produit (leçon v100).
 */
async function clicJusquA(bouton, temoin, essais = 8) {
  let derniere = null;
  for (let i = 0; i < essais; i++) {
    if (await temoin()) return true;
    await bouton.click({ timeout: 5000 }).catch(e => { derniere = e.message; });
    await attendre(700);
  }
  const fini = await temoin();
  // Une preuve qui echoue doit DIRE pourquoi : un clic avale par un element
  // fixe et un handler pas encore attache ne se distinguent pas autrement.
  if (!fini && derniere) console.log("     dernier echec de clic :", String(derniere).split(String.fromCharCode(10))[0]);
  return fini;
}

/**
 * Attend qu'une condition devienne vraie, au lieu de parier sur une durée.
 * En dev, Next compile la route API au PREMIER appel : un `attendre(2500)`
 * suffisait un jour sur deux, et la preuve accusait le produit.
 */
async function attendreQue(condition, ms = 20000, pas = 400) {
  const fin = Date.now() + ms;
  while (Date.now() < fin) {
    if (await condition()) return true;
    await attendre(pas);
  }
  return false;
}

/** Le tunnel de vente est-il ouvert SUR LE RÈGLEMENT ? */
async function tunnelSurReglement(page) {
  const titre = page.locator('.modal-sheet .modal-title');
  if (await titre.count() === 0) return false;
  return /^Paiement$/i.test((await titre.first().innerText()).trim());
}

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

for (let i = 0; i < 90; i++) {
  try { const r = await fetch(`${BASE}/login`); if (r.ok) break; } catch { /* pas prêt */ }
  await attendre(2000);
  if (i === 89) { console.error('dev server injoignable sur :3333'); process.exit(1); }
}
console.log('dev server pret');

// L'antibot de /demander-offre : 10 demandes/heure/IP. En enchaînant les runs
// on épuise le quota, et la preuve rend des KO qui accusent le produit alors
// que c'est le garde-fou qui fonctionne. On libère la SEULE clé de cette
// machine — jamais un `like(...)` : la table est partagée avec la prod.
// ⚠️ Deux étages : celui-ci (en base) et un compteur mémoire dans le process
// du serveur de dev. Si les KO persistent, redémarrer `npm run dev`.
const empreinteLocale = createHash('sha256')
  .update('::1' + (env.IP_HASH_SALT || 'izisolo')).digest('hex').slice(0, 32);
await admin.from('rate_limits').delete().eq('cle', `demande-offre:${empreinteLocale}`);

const { cookies: cookiesProf, userId: profileId } = await sessionCookies(PROF_EMAIL);
const { data: profil } = await admin.from('profiles')
  .select('studio_slug, afficher_tarifs').eq('id', profileId).single();
const SLUG = profil.studio_slug;

const { error: sonde } = await admin.from('demandes_offre').select('id').limit(1);
if (sonde) { console.error('v97 absente : ce lot n\'a pas de sens sans la table.'); process.exit(1); }

// L'adresse de la prospecte : @example.com (RFC 2606), donc jamais un vrai
// destinataire, et le garde-fou domaine-test de lib/email n'enverra rien.
const EMAIL_PROSPECTE = `anne-sophie-${Date.now()}@example.com`;
const PRENOM_PROSPECTE = 'Anne Sophie';

const purger = async () => {
  const { data: of } = await admin.from('offres').select('id').eq('profile_id', profileId).ilike('nom', `${MARQUEUR}%`);
  const ofIds = (of || []).map(o => o.id);
  const { data: cl } = await admin.from('clients').select('id').eq('profile_id', profileId).ilike('email', 'anne-sophie-%@example.com');
  const clIds = (cl || []).map(c => c.id);
  // Les demandes AVANT les fiches : la FK client_id est `on delete set null`,
  // supprimer la fiche d'abord laisse une demande anonyme introuvable (v97).
  if (ofIds.length) await admin.from('demandes_offre').delete().in('offre_id', ofIds);
  if (clIds.length) await admin.from('demandes_offre').delete().in('client_id', clIds);
  if (clIds.length) {
    await admin.from('paiements').delete().in('client_id', clIds);
    await admin.from('abonnements').delete().in('client_id', clIds);
  }
  if (ofIds.length) {
    await admin.from('paiements').delete().in('offre_id', ofIds);
    await admin.from('abonnements').delete().in('offre_id', ofIds);
    await admin.from('offres').delete().in('id', ofIds);
  }
  if (clIds.length) await admin.from('clients').delete().in('id', clIds);
  await admin.from('notifications').delete().eq('profile_id', profileId).eq('type', 'offre_demande');
};

let browser;
try {
  await purger();

  const { data: offre, error: eOf } = await admin.from('offres').insert({
    profile_id: profileId, nom: `${MARQUEUR} Abonnement annuel`, type: 'carnet',
    prix: 480, seances: 40, actif: true,
  }).select('id, nom, prix').single();
  if (eOf) throw new Error(`offre : ${eOf.message}`);
  await admin.from('profiles').update({ afficher_tarifs: true }).eq('id', profileId);

  try { browser = await chromium.launch(); }
  catch { browser = await chromium.launch({ channel: 'msedge' }); }

  const erreurs = [];

  // ══ A. Une visiteuse anonyme demande, depuis la grille publique ══════════
  console.log('\nA. La grille publique, visiteuse ANONYME');
  const ctxAnon = await browser.newContext({ viewport: { width: 420, height: 1000 } });
  const pageAnon = await ctxAnon.newPage();
  pageAnon.on('pageerror', e => erreurs.push('anon: ' + String(e.message || e)));
  await pageAnon.goto(`${BASE}/p/${SLUG}?tab=tarifs`, { waitUntil: 'networkidle' });
  await attendre(1200);

  const carte = pageAnon.locator('.portail-price-card').filter({ hasText: `${MARQUEUR} Abonnement annuel` }).first();
  assert(await carte.count() === 1, 'l\'offre est sur la grille publique');

  const btnDemander = carte.getByRole('button', { name: /Demander cette offre/ });
  const ouvert = await clicJusquA(btnDemander, async () => await carte.locator('.pp-demande-input').count() >= 2);
  assert(ouvert, 'le formulaire de demande s\'ouvre (prenom + email)');
  await carte.locator('.pp-demande-input').nth(0).fill(PRENOM_PROSPECTE);
  await carte.locator('.pp-demande-input').nth(1).fill(EMAIL_PROSPECTE);
  await carte.getByRole('button', { name: /Envoyer ma demande/ }).click();
  const confirmee = await attendreQue(async () => /Demande envoyée/.test(await carte.innerText()));
  assert(confirmee, 'elle recoit une confirmation de DEMANDE');
  const texteConfirmation = await carte.innerText();
  // On traque la SIGNATURE du bug (une offre présentée comme acquise), pas un
  // mot-clé : « Rien n'est débité » contient « débité » et serait un faux KO.
  assert(!/(offre|abonnement|carnet)\s+(acquis|achet)/i.test(texteConfirmation)
    && /Rien n'est débité/i.test(texteConfirmation),
    'et jamais une promesse d\'achat : « rien n\'est débité, rien n\'est réservé »');
  await pageAnon.screenshot({ path: join(OUT, 'A-demande-anonyme.png'), fullPage: true });
  await ctxAnon.close();

  // ══ B. En base : sans fiche, mais avec de quoi repondre ═════════════════
  console.log('\nB. Ce qui est ecrit en base');
  const lireDemandes = async () => (await admin.from('demandes_offre')
    .select('id, client_id, prenom, email, statut').eq('offre_id', offre.id)).data || [];
  await attendreQue(async () => (await lireDemandes()).length > 0);
  const demandes = await lireDemandes();
  console.log(`     ${demandes?.length ?? 0} demande(s) trouvee(s)`);
  const dem = (demandes || [])[0];
  assert(demandes?.length === 1, 'une demande, une seule');
  assert(dem?.client_id === null, 'sans fiche : c\'est une inconnue, par construction');
  assert(dem?.email === EMAIL_PROSPECTE, `son email EST en base (${dem?.email})`);
  assert(dem?.statut === 'nouvelle', 'statut « nouvelle » : rien n\'est vendu');

  // ══ C. La prof VOIT comment la recontacter ══════════════════════════════
  console.log('\nC. Ce que la prof voit');
  const ctxProf = await browser.newContext({ viewport: { width: 1200, height: 1200 } });
  await ctxProf.addCookies(cookiesProf.map(c => ({ ...c, domain: 'localhost', path: '/' })));
  const pageProf = await ctxProf.newPage();
  pageProf.on('pageerror', e => erreurs.push('prof: ' + String(e.message || e)));
  await pageProf.goto(`${BASE}/offres`, { waitUntil: 'networkidle' });
  await attendre(1800);

  const bloc = pageProf.locator('.dem-bloc');
  assert(await bloc.count() === 1, 'la file des demandes est en tete de la page Offres');
  const ligne = bloc.locator('.dem-ligne').filter({ hasText: PRENOM_PROSPECTE }).first();
  assert(await ligne.count() === 1, 'sa demande y figure, a son prenom');

  // Le juge est le DOM RENDU, pas le texte de la reponse : on compte des
  // elements atteignables (lecon du faux positif buy.stripe.com, 26/08).
  const mailto = ligne.locator(`a[href="mailto:${EMAIL_PROSPECTE}"]`);
  assert(await mailto.count() === 1, 'son EMAIL est affiche, en lien mailto cliquable');
  assert((await mailto.innerText()).includes(EMAIL_PROSPECTE), 'et l\'adresse est LISIBLE, pas seulement dans le href');
  assert(/page publique/.test(await ligne.innerText()), 'le badge dit d\'ou vient la demande');
  const libelle = await ligne.getByRole('button').first().innerText();
  assert(/Créer la fiche et attribuer/.test(libelle), `le bouton annonce ce qu'il va faire (« ${libelle} »)`);

  // Le bouton REÇOIT-IL le clic ? « Il est dans le DOM et visible » ne prouve
  // rien : c'est cette mesure qui a trouvé, en écrivant cette preuve, que la
  // bulle du FAB feedback recouvrait le coin haut-droite de toutes les pages
  // du dashboard sur desktop, pendant les 5 premières visites.
  const recoitLeClic = await pageProf.evaluate(() => {
    const l = [...document.querySelectorAll('.dem-ligne')].find(x => x.innerText.includes('Anne Sophie'));
    const b = l && l.querySelector('button');
    if (!b) return { ok: false, dessus: 'bouton introuvable' };
    const r = b.getBoundingClientRect();
    const e = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
    return { ok: e === b || b.contains(e), dessus: e ? `${e.tagName}.${e.className}` : 'null' };
  });
  assert(recoitLeClic.ok, `le bouton n'est recouvert par rien (elementFromPoint : ${recoitLeClic.dessus})`);
  await pageProf.screenshot({ path: join(OUT, 'B-file-prof.png'), fullPage: true });

  // ══ D. Creer la fiche et attribuer ══════════════════════════════════════
  console.log('\nD. « Creer la fiche et attribuer »');
  const btnAttribuer = ligne.getByRole('button', { name: /Créer la fiche et attribuer/ });
  // Témoin propre à la modale : le bloc des demandes contient EN PERMANENCE
  // la phrase « tu attribues l'offre et tu choisis le règlement » — un témoin
  // cherché dans tout le body serait vrai avant le moindre clic (leçon v98).
  const tunnelOuvert = await clicJusquA(btnAttribuer, () => tunnelSurReglement(pageProf));
  assert(tunnelOuvert, 'le tunnel s\'ouvre DIRECTEMENT sur le reglement (plus de « Choisir un eleve »)');

  const lireFiches = async () => (await admin.from('clients')
    .select('id, prenom, nom, email, statut, source').eq('profile_id', profileId).ilike('email', EMAIL_PROSPECTE)).data || [];
  await attendreQue(async () => (await lireFiches()).length > 0);
  const fiches = await lireFiches();
  console.log(`     ${fiches?.length ?? 0} fiche(s) a cette adresse`);
  const fiche = (fiches || [])[0];
  assert(fiches?.length === 1, 'UNE fiche a ete creee, une seule');
  assert(fiche?.prenom === PRENOM_PROSPECTE, `le prenom compose est garde entier (« ${fiche?.prenom} »)`);
  assert(!fiche?.nom, 'le nom reste VIDE : on ne decoupe pas un prenom au hasard');
  assert(fiche?.email === EMAIL_PROSPECTE, 'avec SON email');
  assert(fiche?.statut === 'prospect', 'statut « prospect », comme toute fiche nee d\'un flux public');

  const { data: demLiee } = await admin.from('demandes_offre').select('client_id').eq('id', dem.id).maybeSingle();
  assert(demLiee?.client_id === fiche?.id, 'la demande est rattachee a la fiche (elle apparait sur sa page)');
  await pageProf.screenshot({ path: join(OUT, 'C-tunnel-reglement.png'), fullPage: true });

  // ══ E. La vente s'enregistre, la demande sort de la file ════════════════
  console.log('\nE. La vente');
  await pageProf.locator('.mode-btn').first().click();
  await attendre(400);
  await pageProf.getByRole('button', { name: /Valider le paiement/ }).last().click();
  await attendre(4500);

  const { data: abo } = await admin.from('abonnements')
    .select('id, offre_id, statut').eq('client_id', fiche.id).maybeSingle();
  assert(abo?.offre_id === offre.id && abo?.statut === 'actif', 'l\'abonnement est cree par le tunnel habituel');
  const { data: paie } = await admin.from('paiements')
    .select('id, montant, statut, mode').eq('client_id', fiche.id).maybeSingle();
  assert(paie?.statut === 'paid' && Number(paie?.montant) === 480,
    `le paiement est enregistre (${paie?.montant} €, ${paie?.mode})`);
  const { data: demFinale } = await admin.from('demandes_offre').select('statut').eq('id', dem.id).maybeSingle();
  assert(demFinale?.statut === 'acceptee', 'et la demande sort de la file');

  // ══ F. Dedup : la MEME adresse ne fabrique pas une 2e fiche ═════════════
  console.log('\nF. La dedup par email');
  const { data: dem2, error: eDem2 } = await admin.from('demandes_offre').insert({
    profile_id: profileId, offre_id: offre.id,
    prenom: 'Anne-Sophie', email: EMAIL_PROSPECTE, statut: 'nouvelle',
  }).select('id').single();
  if (eDem2) throw new Error(`2e demande : ${eDem2.message}`);

  await pageProf.goto(`${BASE}/offres`, { waitUntil: 'networkidle' });
  await attendre(1800);
  const ligne2 = pageProf.locator('.dem-ligne').filter({ hasText: 'Anne-Sophie' }).first();
  const tunnel2 = await clicJusquA(
    ligne2.getByRole('button', { name: /Créer la fiche et attribuer/ }),
    () => tunnelSurReglement(pageProf),
  );
  assert(tunnel2, 'le geste marche aussi la deuxieme fois');

  const { data: fiches2 } = await admin.from('clients')
    .select('id').eq('profile_id', profileId).ilike('email', EMAIL_PROSPECTE);
  console.log(`     ${fiches2?.length ?? 0} fiche(s) a cette adresse apres la 2e demande`);
  assert(fiches2?.length === 1, 'TOUJOURS une seule fiche : on reprend l\'existante, on n\'en cree pas une 2e');
  await attendreQue(async () => (await admin.from('demandes_offre')
    .select('client_id').eq('id', dem2.id).maybeSingle()).data?.client_id != null);
  const { data: dem2Liee } = await admin.from('demandes_offre').select('client_id').eq('id', dem2.id).maybeSingle();
  assert(dem2Liee?.client_id === fiche.id, 'et la 2e demande pointe sur la MEME fiche');
  await pageProf.screenshot({ path: join(OUT, 'D-dedup.png'), fullPage: true });

  assert(erreurs.length === 0, `console propre (${erreurs.length} erreur(s))`);
  erreurs.slice(0, 5).forEach(e => console.log('     ', e.slice(0, 200)));

} catch (err) {
  ko++;
  console.error('\nEXCEPTION :', err.message);
} finally {
  if (browser) await browser.close();
  await purger();
  await admin.from('profiles').update({ afficher_tarifs: profil.afficher_tarifs }).eq('id', profileId);
  const { count: resteOffres } = await admin.from('offres')
    .select('*', { count: 'exact', head: true }).eq('profile_id', profileId).ilike('nom', `${MARQUEUR}%`);
  const { count: resteFiches } = await admin.from('clients')
    .select('*', { count: 'exact', head: true }).eq('profile_id', profileId).ilike('email', 'anne-sophie-%@example.com');
  console.log(`\nMenage : ${resteOffres === 0 && resteFiches === 0
    ? 'aucun temoin restant'
    : `⚠ ${resteOffres} offre(s) / ${resteFiches} fiche(s) restante(s)`}`);
  console.log(`Captures : ${OUT}`);
  console.log(`\n${ok} OK / ${ko} KO`);
  process.exit(ko === 0 ? 0 : 1);
}
