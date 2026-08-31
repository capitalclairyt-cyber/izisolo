/**
 * Preuve — l'élève demande une offre, la prof valide et encaisse (v97).
 *
 * Demande Colin (2026-08-23) : « il faut aussi que les élèves puissent voir
 * les offres dispo du studio et faire une demande, la prof valide ensuite de
 * son côté et gère le paiement ».
 *
 * LE TROU : la boucle commerce élève n'existait QUE par Stripe. L'espace élève
 * ne listait que les offres portant un Payment Link ; une prof sans Stripe (ou
 * en plan Essentiel, ou qui encaisse en chèque au cours suivant) n'avait
 * strictement rien à montrer, donc rien à vendre. La grille publique, elle,
 * affichait des prix sans permettre le moindre geste.
 *
 * LA RÈGLE : une demande n'est PAS une vente. Aucun abonnement, aucun
 * paiement, aucune place réservée. C'est ce qui permet à la prof d'encaisser
 * comme elle veut, et c'est ce que les écrans doivent dire.
 *
 * Déroulé (vrai navigateur sur :3333, chemin réel) :
 *   A. L'espace élève montre une offre SANS Stripe (invisible avant) et
 *      propose « Demander ».
 *   B. La demande part, et l'écran promet une demande, jamais un achat.
 *   C. EN BASE : demande « nouvelle », rattachée à la fiche de l'élève, sans
 *      le moindre abonnement ni paiement créé.
 *   D. Re-demander ne fabrique pas de doublon dans la file de la prof.
 *   E. La grille PUBLIQUE permet la même chose à une prospecte (prénom+email).
 *   F. Côté prof, /offres affiche la file, « Attribuer l'offre » ouvre le
 *      tunnel de vente DIRECTEMENT sur le règlement, et la vente sort la
 *      demande de la file en créant l'abonnement + le paiement.
 *   G. Ménage : témoins purgés, même en cas d'échec.
 *
 * Sans v97, le script vérifie le dégradé : l'élève reçoit un refus honnête qui
 * la renvoie vers son studio, et rien n'est inventé.
 *
 * Usage : node scripts/proof-demande-offre.mjs [dossier-captures]
 * Prérequis : dev server sur :3333 (npm run dev).
 */
import { createClient } from '@supabase/supabase-js';
import { createHash } from 'node:crypto';
import { readFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = process.cwd();
const OUT = process.argv[2] || join(process.env.TEMP || '.', 'proof-demande-offre');
mkdirSync(OUT, { recursive: true });
const BASE = 'http://localhost:3333';
const PROF_EMAIL = 'bonjour@melutek.com';
const MARQUEUR = '[preuve demande]';

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
 * Re-clique jusqu a ce que le temoin soit vrai. Un bouton rendu cote SERVEUR
 * existe avant que React n ait attache son handler : le premier clic part
 * dans le vide, et la preuve accuse le produit (lecon v100).
 */
async function clicJusquA(bouton, temoin, essais = 8) {
  for (let i = 0; i < essais; i++) {
    if (await temoin()) return true;
    await bouton.click({ timeout: 5000 }).catch(() => {});
    await attendre(900);
  }
  return await temoin();
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
const V97 = !sonde;
console.log(`migration v97 : ${V97 ? 'APPLIQUEE (parcours complet)' : 'absente (degrade)'}`);

const EMAIL_ELEVE = `preuve-demande-${Date.now()}@example.com`;
let eleveUserId = null;

const purger = async () => {
  const { data: of } = await admin.from('offres').select('id').eq('profile_id', profileId).ilike('nom', `${MARQUEUR}%`);
  const ofIds = (of || []).map(o => o.id);
  const { data: cl } = await admin.from('clients').select('id').eq('profile_id', profileId).ilike('nom', `${MARQUEUR}%`);
  const clIds = (cl || []).map(c => c.id);
  // Les demandes AVANT les fiches : la FK est `on delete set null`, supprimer
  // l'élève d'abord laisserait une demande anonyme impossible à retrouver.
  if (V97) {
    if (ofIds.length) await admin.from('demandes_offre').delete().in('offre_id', ofIds);
    if (clIds.length) await admin.from('demandes_offre').delete().in('client_id', clIds);
  }
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
  if (eleveUserId) { await admin.auth.admin.deleteUser(eleveUserId).catch(() => {}); eleveUserId = null; }
};

let browser;
try {
  await purger();

  // Une offre SANS Payment Link : invisible côté élève avant v97.
  const { data: offre, error: eOf } = await admin.from('offres').insert({
    profile_id: profileId, nom: `${MARQUEUR} Carnet 10`, type: 'carnet',
    prix: 120, seances: 10, actif: true,
  }).select('id, nom, prix').single();
  if (eOf) throw new Error(`offre : ${eOf.message}`);

  const { data: eleve, error: eCl } = await admin.from('clients').insert({
    profile_id: profileId, prenom: 'Ines', nom: `${MARQUEUR} Temoin`,
    email: EMAIL_ELEVE, statut: 'actif', type_client: 'particulier',
  }).select('id, prenom, nom').single();
  if (eCl) throw new Error(`client : ${eCl.message}`);

  // Compte élève (role eleve : jamais de profil prof fantôme, leçon v57).
  const { data: cree, error: eUser } = await admin.auth.admin.createUser({
    email: EMAIL_ELEVE, email_confirm: true, user_metadata: { role: 'eleve' },
  });
  if (eUser) throw new Error(`compte eleve : ${eUser.message}`);
  eleveUserId = cree.user.id;

  let chromium;
  try { ({ chromium } = await import('playwright')); }
  catch { ({ chromium } = await import('@playwright/test')); }
  try { browser = await chromium.launch(); }
  catch { browser = await chromium.launch({ channel: 'msedge' }); }

  const ctxEleve = await browser.newContext({ viewport: { width: 420, height: 1000 } });
  await ctxEleve.addCookies((await sessionCookies(EMAIL_ELEVE)).cookies.map(c => ({ ...c, domain: 'localhost', path: '/' })));
  const pageEleve = await ctxEleve.newPage();
  const BRUIT = [/unique "key" prop.*OuterLayoutRouter/s, /status of 50[03]/, /status of 40[039]/];
  const erreurs = [];
  const noter = t => { if (!BRUIT.some(r => r.test(t))) erreurs.push(t); };
  pageEleve.on('console', m => { if (m.type() === 'error') noter(m.text()); });
  pageEleve.on('pageerror', e => noter(`pageerror: ${e.message}`));

  // ══ A. L'offre sans Stripe est ENFIN visible ══════════════════════════════
  console.log('\nA. L\'espace eleve montre le catalogue');
  await pageEleve.goto(`${BASE}/p/${SLUG}/espace`, { waitUntil: 'networkidle' });
  await attendre(1500);
  const texteEspace = await pageEleve.evaluate(() => document.body.innerText);
  // Titre lu en MAJUSCULES : .espace-section-title est en text-transform
  // uppercase, et innerText rend le texte AFFICHÉ, pas la source.
  assert(/les offres du studio/i.test(texteEspace), 'la section « Les offres du studio » existe');
  assert(texteEspace.includes(`${MARQUEUR} Carnet 10`),
    'une offre SANS lien Stripe y figure (avant : invisible pour l\'eleve)');
  // Le bouton DE CETTE offre, jamais le premier venu : le catalogue du démo
  // en contient plusieurs, et cliquer au hasard posait une demande sur une
  // vraie offre du studio (puis, la fiche témoin supprimée, la FK
  // `on delete set null` laissait une ligne orpheline en prod).
  const carteOffre = pageEleve.locator('.espace-stripe-card').filter({ hasText: `${MARQUEUR} Carnet 10` }).first();
  const btnDemander = carteOffre.locator('.espace-demander-btn');
  assert(await btnDemander.count() === 1, 'et elle porte un bouton « Demander »');
  await pageEleve.screenshot({ path: join(OUT, 'A-espace-offres.png'), fullPage: true });

  // ══ B. La demande part, sans rien promettre ═══════════════════════════════
  console.log('\nB. La demande part');
  // Temoin SCOPE a la carte : cherche dans tout le body, il serait deja vrai
  // avant le moindre clic (la mini-aide eleve de la page parle elle aussi de
  // demander une offre) et clicJusquA ne cliquerait jamais — lecon v98.
  await clicJusquA(btnDemander, async () => await carteOffre.locator('.espace-demande-ok').count() > 0);
  const apres = await pageEleve.evaluate(() => document.body.innerText);

  if (!V97) {
    assert(/arrivent très bientôt|parles-en directement/i.test(apres),
      'sans la table, le refus est honnete et renvoie vers le studio');
    console.log('     (applique v97 puis relance pour le parcours complet)');
  } else {
    assert(/Demande envoyée/.test(apres), 'l\'ecran confirme une DEMANDE');
    assert(/rien n'est réservé|Rien n'est débité/i.test(apres),
      'et dit noir sur blanc que rien n\'est debite ni reserve');
    // La CONFIRMATION (les ~250 car. qui suivent « Demande envoyée ») ne parle
    // jamais d'achat. Plus bas dans la page, la mini-aide élève a le DROIT de
    // répondre à « Comment acheter un carnet ou un abonnement ? » (sweep centre
    // d'aide 2026-08-23) : c'est la promesse de la confirmation qu'on verrouille.
    assert(!/achet/i.test((apres.split('Demande envoyée')[1] || '').slice(0, 250)), 'la confirmation ne parle jamais d\'achat');
    await pageEleve.screenshot({ path: join(OUT, 'B-demande-envoyee.png'), fullPage: true });

    // ══ C. En base : une intention, et RIEN d'autre ═════════════════════════
    console.log('\nC. En base : une intention, rien de plus');
    const { data: dem } = await admin.from('demandes_offre')
      .select('id, statut, client_id, offre_id').eq('offre_id', offre.id).maybeSingle();
    assert(!!dem, 'la demande est enregistree');
    assert(dem?.statut === 'nouvelle', 'statut « nouvelle »');
    assert(dem?.client_id === eleve.id, 'rattachee a la FICHE de l\'eleve (pas a un nom saisi)');
    const { count: nbAbos } = await admin.from('abonnements')
      .select('*', { count: 'exact', head: true }).eq('client_id', eleve.id);
    const { count: nbPaies } = await admin.from('paiements')
      .select('*', { count: 'exact', head: true }).eq('client_id', eleve.id);
    assert(nbAbos === 0 && nbPaies === 0,
      `aucun abonnement ni paiement cree (${nbAbos} / ${nbPaies}) : une demande n'est pas une vente`);
    const { count: nbNotifs } = await admin.from('notifications')
      .select('*', { count: 'exact', head: true }).eq('profile_id', profileId).eq('type', 'offre_demande');
    assert(nbNotifs === 1, 'la prof est prevenue par sa cloche');

    // ══ D. Re-demander ne double pas la file ════════════════════════════════
    console.log('\nD. Re-demander ne double pas la file');
    const rejeu = await pageEleve.evaluate(async ({ slug, offreId }) => {
      const r = await fetch(`/api/portail/${slug}/demander-offre`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ offreId }),
      });
      return { status: r.status, json: await r.json().catch(() => ({})) };
    }, { slug: SLUG, offreId: offre.id });
    assert(rejeu.status === 200 && rejeu.json.deja === true,
      'la 2e demande est accueillie sans drame (« deja enregistree »)');
    const { count: nbDem } = await admin.from('demandes_offre')
      .select('*', { count: 'exact', head: true }).eq('offre_id', offre.id);
    assert(nbDem === 1, `une seule demande dans la file (lu : ${nbDem})`);

    // ══ E. La grille publique, pour une prospecte ═══════════════════════════
    console.log('\nE. La grille publique');
    await admin.from('profiles').update({ afficher_tarifs: true }).eq('id', profileId);
    const ctxAnon = await browser.newContext({ viewport: { width: 420, height: 1000 } });
    const pageAnon = await ctxAnon.newPage();
    await pageAnon.goto(`${BASE}/p/${SLUG}`, { waitUntil: 'networkidle' });
    await attendre(1000);
    const ongletTarifs = pageAnon.getByRole('tab', { name: /Tarifs/i }).first();
    if (await ongletTarifs.count()) { await ongletTarifs.click(); await attendre(800); }
    const carte = pageAnon.locator('.portail-price-card').filter({ hasText: `${MARQUEUR} Carnet 10` }).first();
    assert(await carte.count() === 1, 'l\'offre est sur la grille publique');
    await carte.getByRole('button', { name: /Demander cette offre/ }).click();
    await attendre(400);
    await carte.locator('.pp-demande-input').nth(0).fill('Prospecte');
    await carte.locator('.pp-demande-input').nth(1).fill(`prospect-${Date.now()}@example.com`);
    await carte.getByRole('button', { name: /Envoyer ma demande/ }).click();
    await attendre(2500);
    assert(/Demande envoyée/.test(await carte.innerText()), 'une prospecte peut demander sans compte');
    const { data: demProspect } = await admin.from('demandes_offre')
      .select('id, client_id, prenom').eq('offre_id', offre.id).is('client_id', null).maybeSingle();
    assert(demProspect?.prenom === 'Prospecte', 'sa demande arrive avec ses coordonnees, sans fiche');
    await pageAnon.screenshot({ path: join(OUT, 'C-grille-publique.png'), fullPage: true });
    await ctxAnon.close();

    // ══ F. La prof valide et encaisse ══════════════════════════════════════
    console.log('\nF. La prof valide et encaisse');
    const ctxProf = await browser.newContext({ viewport: { width: 1100, height: 1100 } });
    await ctxProf.addCookies(cookiesProf.map(c => ({ ...c, domain: 'localhost', path: '/' })));
    const pageProf = await ctxProf.newPage();
    await pageProf.goto(`${BASE}/offres`, { waitUntil: 'networkidle' });
    await attendre(1500);
    const bloc = pageProf.locator('.dem-bloc');
    assert(await bloc.count() === 1, 'la file des demandes est en tete de la page Offres');
    const texteBloc = await bloc.innerText();
    assert(/Ines/.test(texteBloc), 'la demande de l\'eleve y figure, a son nom');
    assert(/pas encore de fiche/.test(texteBloc), 'la prospecte est signalee comme sans fiche');
    await pageProf.screenshot({ path: join(OUT, 'D-file-prof.png'), fullPage: true });

    const ligneInes = bloc.locator('.dem-ligne').filter({ hasText: 'Ines' }).first();
    await ligneInes.getByRole('button', { name: /Attribuer l'offre/ }).click();
    await attendre(1500);
    const texteModal = await pageProf.evaluate(() => document.body.innerText);
    assert(/Règlement|Mode de règlement|Montant total/i.test(texteModal),
      'le tunnel s\'ouvre DIRECTEMENT sur le reglement : l\'eleve et l\'offre sont deja connues');
    await pageProf.locator('.mode-btn').first().click();
    await attendre(300);
    await pageProf.getByRole('button', { name: /Valider le paiement/ }).last().click();
    await attendre(4000);

    const { data: aboCree } = await admin.from('abonnements')
      .select('id, offre_id, statut').eq('client_id', eleve.id).maybeSingle();
    assert(aboCree?.offre_id === offre.id && aboCree?.statut === 'actif',
      'l\'abonnement est cree par le tunnel habituel');
    const { data: paieCree } = await admin.from('paiements')
      .select('id, montant, statut, mode').eq('client_id', eleve.id).maybeSingle();
    assert(paieCree?.statut === 'paid' && Number(paieCree?.montant) === 120,
      `le paiement est enregistre (${paieCree?.montant} €, ${paieCree?.mode})`);
    const { data: demApres } = await admin.from('demandes_offre')
      .select('statut').eq('client_id', eleve.id).maybeSingle();
    assert(demApres?.statut === 'acceptee', 'et la demande sort de la file, marquee acceptee');
  }

  assert(erreurs.length === 0, `console propre (${erreurs.length} erreur(s))`);
  if (erreurs.length) erreurs.slice(0, 5).forEach(e => console.log('     ', e.slice(0, 200)));

} catch (err) {
  ko++;
  console.error('\nEXCEPTION :', err.message);
} finally {
  if (browser) await browser.close();
  await purger();
  await admin.from('profiles').update({ afficher_tarifs: profil.afficher_tarifs }).eq('id', profileId);
  const { count: reste } = await admin.from('offres')
    .select('*', { count: 'exact', head: true }).eq('profile_id', profileId).ilike('nom', `${MARQUEUR}%`);
  console.log(`\nMenage : ${reste === 0 ? 'aucun temoin restant' : `⚠ ${reste} offre(s) temoin restante(s)`}`);
  console.log(`Captures : ${OUT}`);
  console.log(`\n${ok} OK / ${ko} KO`);
  process.exit(ko === 0 ? 0 : 1);
}
