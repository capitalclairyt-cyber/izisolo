/**
 * Preuve — « Confier le pointage » : le lien remis à quelqu'un SANS compte
 * (v100, demande Colin 2026-08-25, lot 1 du chantier multi-prof).
 *
 * Ce qu'on prouve, dans l'ordre de gravité. Ce lot ouvre une porte publique
 * sur des données d'élèves : la seule preuve qui vaille est celle qui essaie
 * de la forcer.
 *
 *   A. La prof crée le lien depuis la fiche de la séance, en vrai navigateur.
 *   B. Une visiteuse ANONYME (contexte sans cookie) l'ouvre sans être renvoyée
 *      sur /login — le piège default-deny du proxy, déjà mordu deux fois.
 *   C. Elle voit les NOMS et RIEN d'autre : aucun email, aucun téléphone,
 *      aucun montant, aucun nom de carnet dans le HTML de la page.
 *   D. Elle pointe : le carnet est décompté EN BASE (le geste a de vraies
 *      conséquences, ce n'est pas un écran de démonstration).
 *   E. Une ligne « a annulé » ne lui propose aucun bouton.
 *   F. LE test de cloisonnement : le lien du cours A refuse une présence du
 *      cours B, même en tapant l'API directement.
 *   G. Un jeton inventé est refusé, sans rien dire du studio.
 *   H. La prof révoque : le lien ferme immédiatement.
 *   I. Le mot laissé par l'invitée arrive chez la prof (note + cloche).
 *   J. Ménage : témoins purgés, MÊME en cas d'échec.
 *
 * Le script SONDE la migration v100 : sans elle, il prouve la dégradation
 * honnête (l'écran le dit, rien ne casse) ; avec elle, il déroule tout.
 *
 * Usage : node scripts/proof-lien-pointage.mjs [dossier-captures]
 * Prérequis : dev server sur :3333.
 */
import { createClient } from '@supabase/supabase-js';
import { readFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = process.cwd();
const OUT = process.argv[2] || join(process.env.TEMP || '.', 'proof-lien-pointage');
mkdirSync(OUT, { recursive: true });
const BASE = 'http://localhost:3333';
const PROF_EMAIL = 'bonjour@melutek.com';
const MARQUEUR = '[preuve lien]';

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
 * Clique jusqu'à ce que l'effet soit VRAI. `waitForSelector` trouve un bouton
 * rendu côté serveur avant que React n'ait attaché son handler : le premier
 * clic part alors dans le vide, et la preuve échoue sur un défaut d'horloge,
 * pas de produit. Le témoin doit être PROPRE au panneau ouvert (leçon v98 :
 * un témoin déjà vrai avant le clic ne clique jamais).
 */
async function clicJusquA(page, selecteurBouton, temoinOuvert, essais = 12) {
  for (let i = 0; i < essais; i++) {
    if (await page.locator(temoinOuvert).count() > 0) return true;
    await page.click(selecteurBouton, { timeout: 5000 }).catch(() => {});
    await page.waitForTimeout(700);
  }
  return await page.locator(temoinOuvert).count() > 0;
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
console.log('dev server pret\n');

const { cookies, userId: profileId } = await sessionCookies(PROF_EMAIL);

const jour = (delta) => {
  const d = new Date();
  d.setDate(d.getDate() + delta);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
const AUJ = jour(0);

// ── Sonde v100 : la table existe-t-elle ? ────────────────────────────────────
const { error: eSonde } = await admin.from('liens_pointage').select('id').limit(1);
const V100 = !eSonde;
console.log(V100
  ? '── v100 appliquée : parcours COMPLET ──\n'
  : `── v100 absente (${eSonde.code}) : parcours DÉGRADÉ ──\n`);

const purger = async () => {
  const { data: co } = await admin.from('cours').select('id').eq('profile_id', profileId).ilike('nom', `${MARQUEUR}%`);
  const coIds = (co || []).map(c => c.id);
  const { data: cl } = await admin.from('clients').select('id').eq('profile_id', profileId).ilike('nom', `${MARQUEUR}%`);
  const clIds = (cl || []).map(c => c.id);
  if (V100 && coIds.length) await admin.from('liens_pointage').delete().in('cours_id', coIds);
  if (coIds.length) {
    await admin.from('presences').delete().in('cours_id', coIds);
    await admin.from('notifications').delete().eq('profile_id', profileId).like('ref_key', 'pointage_invite_%');
  }
  if (clIds.length) {
    await admin.from('presences').delete().in('client_id', clIds);
    await admin.from('abonnements').delete().in('client_id', clIds);
    await admin.from('cas_a_traiter').delete().in('client_id', clIds);
  }
  if (coIds.length) await admin.from('cours').delete().in('id', coIds);
  if (clIds.length) await admin.from('clients').delete().in('id', clIds);
};

let browser;
try {
  await purger();

  // ── Décor : deux séances (dont une « autre cours » pour le cloisonnement) ──
  const { data: seances, error: eCo } = await admin.from('cours').insert([
    { profile_id: profileId, nom: `${MARQUEUR} Vinyasa`, date: AUJ, heure: '07:00', duree_minutes: 60,
      type_cours: 'Vinyasa', lieu: 'Grande salle', capacite_max: 20, visibilite: 'public' },
    { profile_id: profileId, nom: `${MARQUEUR} Autre cours`, date: AUJ, heure: '09:00', duree_minutes: 60,
      type_cours: 'Yin', capacite_max: 20, visibilite: 'public' },
  ]).select('id, nom');
  if (eCo) throw new Error(`cours : ${eCo.message}`);
  const coursA = seances.find(c => c.nom.includes('Vinyasa'));
  const coursB = seances.find(c => c.nom.includes('Autre'));

  const mk = async (prenom, extra = {}) => {
    const { data, error } = await admin.from('clients').insert({
      profile_id: profileId, prenom, nom: `${MARQUEUR} Temoin`,
      email: `preuve-lien-${prenom.toLowerCase()}@example.com`,
      telephone: '0612340000', statut: 'actif', type_client: 'particulier', ...extra,
    }).select('id, prenom, email, telephone').single();
    if (error) throw new Error(`client ${prenom} : ${error.message}`);
    return data;
  };
  const surCarnet = await mk('Bea');    // pointée par l'invitée → carnet décompté
  const simple = await mk('Alba');
  const annulee = await mk('Chloe');    // ligne « info », non pointable

  const { data: abo, error: eAbo } = await admin.from('abonnements').insert({
    profile_id: profileId, client_id: surCarnet.id, offre_nom: `${MARQUEUR} Carnet Secret`,
    type: 'carnet', statut: 'actif', date_debut: jour(-30), date_fin: jour(60),
    seances_total: 10, seances_utilisees: 0,
  }).select('id').single();
  if (eAbo) throw new Error(`abo : ${eAbo.message}`);

  const { data: presA, error: ePr } = await admin.from('presences').insert([
    { profile_id: profileId, cours_id: coursA.id, client_id: surCarnet.id, statut_pointage: 'inscrit', pointee: false, abonnement_id: abo.id },
    { profile_id: profileId, cours_id: coursA.id, client_id: simple.id, statut_pointage: 'inscrit', pointee: false },
    { profile_id: profileId, cours_id: coursA.id, client_id: annulee.id, statut_pointage: 'inscrit', pointee: false, annulation_tardive: true },
  ]).select('id, client_id');
  if (ePr) throw new Error(`presences A : ${ePr.message}`);
  const presBea = presA.find(p => p.client_id === surCarnet.id).id;

  const { data: presB, error: ePrB } = await admin.from('presences').insert({
    profile_id: profileId, cours_id: coursB.id, client_id: simple.id, statut_pointage: 'inscrit', pointee: false,
  }).select('id').single();
  if (ePrB) throw new Error(`presence B : ${ePrB.message}`);

  let chromium;
  try { ({ chromium } = await import('playwright')); }
  catch { ({ chromium } = await import('@playwright/test')); }
  try { browser = await chromium.launch(); }
  catch { browser = await chromium.launch({ channel: 'msedge' }); }

  // ══ A. La prof crée le lien, depuis la fiche de la séance ═════════════════
  console.log('A. Côté prof — « Confier le pointage »');
  const ctxProf = await browser.newContext({ viewport: { width: 1280, height: 1000 } });
  await ctxProf.addCookies(cookies.map(c => ({ ...c, domain: 'localhost', path: '/' })));
  const prof = await ctxProf.newPage();
  await prof.goto(`${BASE}/cours/${coursA.id}`, { waitUntil: 'domcontentloaded' });
  // ATTENDRE le sélecteur, jamais un délai fixe : sur un dev server froid, la
  // première compilation de /cours/[coursId] dépasse allègrement 2 s, et un
  // `count()` lu trop tôt rend 0 — un KO fantôme qui ne dit rien du produit.
  await prof.waitForSelector('.cp-entete', { timeout: 60000 });

  const carte = prof.locator('.cp-entete');
  assert(await carte.count() === 1, 'la carte « Confier le pointage » est sur la fiche du cours');
  assert(await clicJusquA(prof, '.cp-entete', '.cp-corps'), 'la carte s\'ouvre au clic');
  await prof.screenshot({ path: join(OUT, 'A-carte-ouverte.png'), fullPage: false });

  const intro = await prof.locator('.cp-intro').innerText().catch(() => '');
  assert(/ni coordonnées|ni carnets|ni montants/i.test(intro),
    'la carte annonce à la prof ce que l\'invitée NE verra pas');

  if (!V100) {
    const alerte = await prof.locator('.cp-alerte').innerText().catch(() => '');
    assert(/pas encore appliquée|très bientôt/i.test(alerte),
      'DÉGRADÉ : l\'écran dit honnêtement que la mise à jour manque (pas « aucun lien »)');
    const boutonAbsent = await prof.locator('.cp-creer').count();
    assert(boutonAbsent === 0, 'DÉGRADÉ : aucun bouton « Créer le lien » qui échouerait en silence');

    // L'API doit refuser proprement, avec un code lisible.
    const res = await prof.request.post(`${BASE}/api/liens-pointage`, {
      data: { coursId: coursA.id, duree: 'fin_journee' },
    });
    const corps = await res.json().catch(() => ({}));
    assert(res.status() === 503 && corps.code === 'MIGRATION_V100_REQUISE',
      'DÉGRADÉ : la route répond 503 MIGRATION_V100_REQUISE, jamais un faux succès');

    // Et le chemin public reste fermé, sans fuite.
    const ctxAnon0 = await browser.newContext();
    const anon0 = await ctxAnon0.newPage();
    await anon0.goto(`${BASE}/pointage-invite/jeton-bidon-mais-assez-long-pour-passer`, { waitUntil: 'domcontentloaded' });
    await anon0.waitForTimeout(2000);
    const t0 = await anon0.innerText('body');
    assert(!/login|connexion/i.test(await anon0.url()), 'DÉGRADÉ : la page publique n\'est pas renvoyée vers /login (proxy)');
    assert(!t0.includes('Bea') && !t0.includes('@example.com'), 'DÉGRADÉ : aucune donnée d\'élève ne fuit');
    await anon0.screenshot({ path: join(OUT, 'A-degrade-public.png') });
    await ctxAnon0.close();
  } else {
    await prof.fill('.cp-champ input', 'Claire');
    await prof.selectOption('.cp-champ select', 'j1');
    // UN seul clic ici : le panneau est ouvert, donc React est hydraté (c'est
    // un changement d'état qui l'a ouvert). Re-cliquer en boucle fabriquerait
    // un second lien et rendrait la relecture en base ambiguë.
    await prof.click('.cp-creer');
    await prof.waitForSelector('.cp-url', { timeout: 30000 });
    const url = (await prof.locator('.cp-url').innerText()).trim();
    await prof.screenshot({ path: join(OUT, 'A-lien-cree.png'), fullPage: false });
    assert(/^http:\/\/localhost:3333\/pointage-invite\/[A-Za-z0-9_-]{43}$/.test(url),
      'le lien créé porte un jeton de 43 caractères (256 bits)');

    const avertissement = await prof.locator('.cp-fraiche-titre').innerText();
    assert(/ne sera plus affiché/i.test(avertissement),
      'l\'écran prévient que le jeton ne sera plus jamais montré');

    const token = url.split('/').pop();
    // Lecture qui DIT ce qu'elle trouve : un `maybeSingle()` rend `null` aussi
    // bien pour « zéro ligne » que pour « plusieurs », et l'assertion qui suit
    // échoue sans qu'on sache laquelle des deux — trois KO muets au premier run.
    const { data: liensEnBase, error: eLiens } = await admin.from('liens_pointage')
      .select('id, token_hash, nom_invitee, expire_at, cours_id, created_at')
      .eq('cours_id', coursA.id).order('created_at', { ascending: false });
    if (eLiens) console.log(`      (lecture liens_pointage : ${eLiens.message})`);
    assert((liensEnBase || []).length === 1,
      `EN BASE : un clic = UN lien (${(liensEnBase || []).length} trouvé(s))`);
    const enBase = (liensEnBase || [])[0];
    const lienId = enBase?.id;
    assert(enBase && enBase.token_hash && !enBase.token_hash.includes(token),
      'EN BASE : seul le hash est stocké, jamais le jeton');
    assert(enBase?.nom_invitee === 'Claire', 'EN BASE : le nom de l\'invitée est enregistré');

    // ══ B + C. La visiteuse anonyme ════════════════════════════════════════
    console.log('\nB/C. Côté invitée — anonyme, et minimisée');
    const ctxAnon = await browser.newContext({ viewport: { width: 420, height: 900 } });
    const anon = await ctxAnon.newPage();
    const erreursConsole = [];
    anon.on('pageerror', e => erreursConsole.push(String(e)));
    await anon.goto(url, { waitUntil: 'domcontentloaded' });
    await anon.waitForSelector('.inv-liste', { timeout: 15000 });
    await anon.waitForTimeout(600);
    await anon.screenshot({ path: join(OUT, 'B-ecran-invitee.png'), fullPage: true });

    assert(!anon.url().includes('/login'),
      'la page publique n\'est PAS renvoyée vers /login (le piège default-deny du proxy)');
    const texte = await anon.innerText('body');
    assert(texte.includes('Bea') && texte.includes('Alba'), 'la liste d\'appel affiche les noms');
    assert(texte.includes('Vinyasa'), 'l\'en-tête nomme la séance');

    const html = await anon.content();
    const fuites = ['preuve-lien-bea@example.com', '0612340000', 'Carnet Secret', surCarnet.id, abo.id];
    const trouvees = fuites.filter(f => html.includes(f));
    assert(trouvees.length === 0,
      `LE test de fuite : ni email, ni téléphone, ni carnet, ni identifiant dans le HTML${trouvees.length ? ' (fuite : ' + trouvees.join(', ') + ')' : ''}`);

    // ══ D. Elle pointe : conséquence RÉELLE en base ════════════════════════
    console.log('\nD. Le pointage a de vraies conséquences');
    const ligneBea = anon.locator('.inv-ligne', { hasText: 'Bea' });
    await ligneBea.locator('.inv-btn').first().click();
    await anon.waitForTimeout(2500);

    const { data: aboApres } = await admin.from('abonnements').select('seances_utilisees').eq('id', abo.id).single();
    assert(aboApres?.seances_utilisees === 1, `EN BASE : le carnet est passé de 0 à ${aboApres?.seances_utilisees} séance utilisée`);
    const { data: presApres } = await admin.from('presences').select('statut_pointage, pointee').eq('id', presBea).single();
    assert(presApres?.statut_pointage === 'present' && presApres.pointee === true,
      'EN BASE : la présence est marquée présente et pointée');
    await anon.screenshot({ path: join(OUT, 'D-apres-pointage.png'), fullPage: true });

    // ══ E. La ligne « a annulé » ne se pointe pas ══════════════════════════
    const ligneChloe = anon.locator('.inv-ligne', { hasText: 'Chloe' });
    assert(await ligneChloe.locator('.inv-btn').count() === 0,
      'une ligne « a annulé » ne propose aucun bouton (le cas appartient à la prof)');

    // ══ F. Cloisonnement : le lien de A ne touche pas une présence de B ════
    console.log('\nF. Cloisonnement');
    const croise = await anon.request.post(`${BASE}/api/pointage-invite/${token}`, {
      data: { action: 'pointer', presenceId: presB.id, statut: 'present' },
    });
    const corpsCroise = await croise.json().catch(() => ({}));
    assert(croise.status() === 404 && corpsCroise.code === 'HORS_SEANCE',
      'LE test qui compte : une présence d\'un AUTRE cours est refusée (404 HORS_SEANCE)');
    const { data: presBapres } = await admin.from('presences').select('statut_pointage').eq('id', presB.id).single();
    assert(presBapres?.statut_pointage === 'inscrit', 'EN BASE : la présence de l\'autre cours n\'a pas bougé');

    // ══ G. Jeton inventé ══════════════════════════════════════════════════
    const faux = await anon.request.get(`${BASE}/api/pointage-invite/${'x'.repeat(43)}`);
    const corpsFaux = await faux.json().catch(() => ({}));
    assert(faux.status() === 404, 'un jeton inventé est refusé (404)');
    assert(!JSON.stringify(corpsFaux).includes('Bea') && !JSON.stringify(corpsFaux).includes(profileId),
      'le refus ne dit rien du studio ni de ses élèves');

    // ══ I. Le mot laissé à la prof ════════════════════════════════════════
    console.log('\nI. Le mot laissé à la prof');
    await anon.fill('#inv-note-champ', 'Lea est venue mais n etait pas sur la liste.');
    await anon.click('.inv-note-btn');
    await anon.waitForTimeout(2000);
    const { data: lienNote } = await admin.from('liens_pointage')
      .select('note_invitee, nb_pointages, premiere_utilisation_at').eq('id', lienId).maybeSingle();
    assert(/Lea est venue/.test(lienNote?.note_invitee || ''), 'EN BASE : le mot de l\'invitée est enregistré');
    assert((lienNote?.nb_pointages || 0) >= 1 && !!lienNote?.premiere_utilisation_at,
      'EN BASE : l\'usage du lien est tracé (compteur + première utilisation)');

    const { data: notifs } = await admin.from('notifications')
      .select('type, corps').eq('profile_id', profileId).eq('type', 'pointage_invite');
    assert((notifs || []).length >= 1, 'la prof reçoit une notification « pointage confié »');
    assert((notifs || []).some(n => /Claire/.test(n.corps || '')), 'la notification nomme la personne invitée');

    assert(erreursConsole.length === 0, `console de l'invitée propre (${erreursConsole.length} erreur(s))`);

    // ══ H. Révocation ═════════════════════════════════════════════════════
    console.log('\nH. Révocation');
    prof.on('dialog', d => d.accept());
    await prof.reload({ waitUntil: 'domcontentloaded' });
    await prof.waitForSelector('.cp-entete', { timeout: 60000 });
    assert(await clicJusquA(prof, '.cp-entete', '.cp-revoquer'),
      'la prof retrouve son lien sur la fiche de la séance');
    const noteVue = await prof.locator('.cp-note').innerText().catch(() => '');
    assert(/Lea est venue/.test(noteVue), 'la prof LIT le mot de l\'invitée sur la fiche de la séance');
    await prof.screenshot({ path: join(OUT, 'H-cote-prof.png'), fullPage: false });
    await prof.click('.cp-revoquer');
    await prof.waitForTimeout(2000);

    const { data: lienRevoque } = await admin.from('liens_pointage')
      .select('revoque_at').eq('id', lienId).maybeSingle();
    assert(!!lienRevoque?.revoque_at, 'EN BASE : le lien porte sa date de révocation');

    await anon.reload({ waitUntil: 'domcontentloaded' });
    await anon.waitForTimeout(2500);
    const texteApres = await anon.innerText('body');
    assert(/Lien indisponible/i.test(texteApres), 'la visiteuse voit « Lien indisponible » après révocation');
    assert(/désactivé par le studio/i.test(texteApres), 'et on lui dit pourquoi, sans jargon');
    assert(!texteApres.includes('Bea'), 'plus aucun nom d\'élève après révocation');
    await anon.screenshot({ path: join(OUT, 'I-revoque.png'), fullPage: true });

    const refuse = await anon.request.post(`${BASE}/api/pointage-invite/${token}`, {
      data: { action: 'pointer', presenceId: presBea, statut: 'absent' },
    });
    assert(refuse.status() === 404, 'l\'API refuse aussi le lien révoqué (pas seulement l\'écran)');
    const { data: presFin } = await admin.from('presences').select('statut_pointage').eq('id', presBea).single();
    assert(presFin?.statut_pointage === 'present', 'EN BASE : le pointage déjà fait reste intact');

    await ctxAnon.close();
  }

  await ctxProf.close();
} catch (e) {
  ko++;
  console.error('\nEXCEPTION :', e.message);
} finally {
  // ══ J. Ménage — MÊME en cas d'échec ═════════════════════════════════════
  try { await purger(); } catch (e) { console.error('ménage :', e.message); }
  const { data: reste } = await admin.from('clients').select('id').eq('profile_id', profileId).ilike('nom', `${MARQUEUR}%`);
  assert((reste || []).length === 0, 'ménage : aucun témoin ne reste en base');
  if (browser) await browser.close();
}

console.log(`\n${'═'.repeat(60)}`);
console.log(`  ${ok} OK · ${ko} KO   ${V100 ? '(parcours complet)' : '(parcours dégradé, v100 non appliquée)'}`);
console.log(`  captures : ${OUT}`);
console.log('═'.repeat(60));
process.exit(ko === 0 ? 0 : 1);
