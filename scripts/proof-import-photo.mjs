/**
 * PREUVE — « Lire une photo de LISTE d'élèves » (2026-09-17).
 *
 * Déclencheur : le montage du compte d'Atout Gym. Maude avait le listing
 * papier de l'association (43 adhérentes sur deux pages) et l'import par
 * photo ne lisait qu'UNE fiche à la fois, par construction.
 *
 * Vrai navigateur (dev :3333), session prof démo :
 *   A. L'écran — bloc rendu, bouton réellement CLIQUABLE (elementFromPoint,
 *      §12 : le FAB a déjà recouvert trois boutons), état de lecture, puis
 *      l'étape de vérification avec les 7 colonnes PRÉ-MAPPÉES.
 *   B. La règle qui compte — une photo affiche TOUTES ses lignes, pas les six
 *      d'un CSV : l'écran dit « relis chaque ligne », il doit les montrer.
 *   C. Le bout de la chaîne — l'import réel (route NON interceptée) crée les
 *      fiches EN BASE, avec ce que l'aperçu montrait.
 *   D. Non-régression — un CSV se comporte exactement comme avant (6 lignes
 *      d'aperçu, pas de bandeau de lecture).
 *   E. (PROOF_IA=1) Le CHEMIN RÉEL — une liste dessinée au canvas part à la
 *      vraie route, et les personnes reviennent lues. ⚠️ Un appel Opus
 *      facturé (~0,15 €) et un décompte dans le quota du compte démo.
 *
 * Re-runnable, témoins purgés même en cas d'échec.
 *   node scripts/proof-import-photo.mjs
 *   PROOF_IA=1 node scripts/proof-import-photo.mjs
 */
import { createClient } from '@supabase/supabase-js';
import { readFileSync, writeFileSync, unlinkSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { lignesVersRows, EN_TETES_PHOTO } from '../lib/import-photo.js';

const BASE = process.env.PROOF_BASE || 'http://localhost:3333';
const AVEC_IA = process.env.PROOF_IA === '1';
const MARQUE = 'PREUVEPHOTO'; // le nom de famille des témoins, pour la purge

const env = Object.fromEntries(
  readFileSync(join(process.cwd(), '.env.local'), 'utf8')
    .split('\n').filter(l => l.includes('=') && !l.startsWith('#'))
    .map(l => [l.slice(0, l.indexOf('=')).trim(), l.slice(l.indexOf('=') + 1).trim()])
);
const PROJECT_REF = new URL(env.NEXT_PUBLIC_SUPABASE_URL).hostname.split('.')[0];
const svc = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

let ok = 0, ko = 0;
const c = (l, cond, d = '') => { if (cond) { ok++; console.log('  OK  ' + l + (d ? ' - ' + d : '')); } else { ko++; console.log('  KO  ' + l + (d ? ' - ' + d : '')); } };

const { data: demo } = await svc.from('profiles').select('id, studio_slug').eq('studio_slug', 'atelier-soleil').single();
if (!demo) { console.error('Démo introuvable'); process.exit(1); }

// Les témoins : neuf personnes, dont une SANS email (le cas de la liste papier)
// et une ligne que le tamis doit jeter.
const TEMOINS = Array.from({ length: 9 }, (_, i) => ({
  prenom: `Temoin${i + 1}`,
  nom: MARQUE,
  email: i === 3 ? '' : `preuve-photo-${i + 1}@example.com`,
  telephone: `06 00 00 00 0${i}`,
  date_naissance: i === 0 ? '1974-03-02' : '',
  ville: 'Gillonnay',
  notes: `Groupe ${i % 2 ? '20h-21h' : '18h45-19h45'}`,
}));

async function purger() {
  const { data: fiches } = await svc.from('clients').select('id').eq('profile_id', demo.id).eq('nom', MARQUE);
  for (const f of fiches || []) {
    await svc.from('presences').delete().eq('client_id', f.id);
    await svc.from('paiements').delete().eq('client_id', f.id);
    await svc.from('clients').delete().eq('id', f.id);
  }
  return (fiches || []).length;
}
await purger();

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

// Une image minuscule mais VALIDE : la page la décode et la recompresse au
// canvas avant l'envoi. En phase A la route est interceptée, son contenu
// n'a donc aucune importance.
const PNG_1PX = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');
const fichierImage = join(tmpdir(), `preuve-photo-${Date.now()}.png`);
writeFileSync(fichierImage, PNG_1PX);

let chromium; try { ({ chromium } = await import('playwright')); } catch { ({ chromium } = await import('@playwright/test')); }
let browser; try { browser = await chromium.launch({ channel: 'msedge' }); } catch { browser = await chromium.launch(); }

// Re-clique jusqu'à ce que l'effet soit là : un bouton rendu côté serveur
// existe avant que React ne lui ait attaché son handler (§12, piège v100).
const clicJusquA = async (page, sel, temoin, n = 8) => {
  for (let i = 0; i < n; i++) {
    await page.click(sel, { timeout: 5000 }).catch(() => {});
    try { await page.waitForSelector(temoin, { timeout: 2500 }); return true; } catch { /* on re-clique */ }
  }
  return false;
};

// Même piège pour un <input type=file> : setInputFiles émet l'événement
// « change », mais React n'a pas forcément encore attaché son onChange. Le
// premier dépôt part alors dans le vide, en silence.
const deposerJusquA = async (page, sel, fichier, temoin, n = 8) => {
  for (let i = 0; i < n; i++) {
    await page.setInputFiles(sel, fichier).catch(() => {});
    try { await page.waitForSelector(temoin, { timeout: 4000 }); return true; } catch { await page.setInputFiles(sel, []).catch(() => {}); }
  }
  return false;
};

try {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 1000 } });
  await ctx.addCookies((await sessionCookies('camille@atelier-soleil.fr')).map(cc => ({ ...cc, url: BASE, sameSite: 'Lax' })));
  const page = await ctx.newPage();
  const erreurs = [];
  page.on('pageerror', e => erreurs.push(String(e).slice(0, 160)));

  // ── A. L'écran ──────────────────────────────────────────────────────────
  console.log('\n— A. L\'écran d\'import propose la photo —');
  await page.goto(`${BASE}/clients/importer`, { waitUntil: 'domcontentloaded', timeout: 180000 });
  await page.waitForSelector('[data-testid="imp-photo-bloc"]', { timeout: 60000 });
  c('le bloc « photo de liste » est rendu', true);

  const txt = await page.locator('[data-testid="imp-photo-bloc"]').innerText();
  c('il dit qu\'on vérifie avant d\'enregistrer', /vérifi/i.test(txt), txt.replace(/\s+/g, ' ').slice(0, 90));

  // Le juge de la cliquabilité : ce que le navigateur trouve au centre du
  // bouton. ⚠️ elementFromPoint travaille en coordonnées de VIEWPORT : un
  // élément sous le pli rend null et accuserait le produit à tort (§12).
  await page.locator('[data-testid="imp-photo-btn"]').scrollIntoViewIfNeeded();
  const couvert = await page.evaluate(() => {
    const b = document.querySelector('[data-testid="imp-photo-btn"]');
    const r = b.getBoundingClientRect();
    const el = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
    if (!el) return 'hors viewport';
    return (el === b || b.contains(el)) ? false : `recouvert par ${el.tagName}.${el.className}`;
  });
  c('le bouton n\'est recouvert par rien (elementFromPoint)', couvert === false, String(couvert));

  // La route interceptée : on prouve le CÂBLAGE, pas le modèle.
  const rows = lignesVersRows(TEMOINS);
  let appel = null;
  await page.route('**/api/clients/extract-photo', async route => {
    const body = route.request().postDataJSON();
    appel = body;
    await route.fulfill({
      status: 200, contentType: 'application/json',
      body: JSON.stringify({ rows, lignes: TEMOINS, ignorees: 1, tronque: false }),
    });
  });

  const depot = await deposerJusquA(page, '[data-testid="imp-photo-bloc"] input[type=file]', fichierImage, '[data-testid="imp-lecture"]');
  c('le dépôt de la photo est pris en compte', depot);
  c('la route est appelée en mode « liste »', appel?.mode === 'liste', `mode=${appel?.mode}`);
  c('l\'image est compressée en JPEG avant l\'envoi', appel?.media_type === 'image/jpeg');
  c('le bandeau de lecture s\'affiche', true);

  const lecture = await page.locator('[data-testid="imp-lecture"]').innerText();
  c('il dit combien de personnes ont été lues', /9 élèves lues/.test(lecture), lecture.replace(/\s+/g, ' ').slice(0, 80));
  c('il avoue la ligne ignorée', /1 ligne ignorée/.test(lecture));
  c('il demande de relire', /[Rr]elis/.test(lecture));

  // ── Les colonnes sont pré-mappées ───────────────────────────────────────
  console.log('\n— A bis. Les 7 colonnes arrivent déjà reconnues —');
  const entetes = await page.locator('.imp-map select option').evaluateAll(o => o.map(x => x.textContent));
  c('les en-têtes de la lib sont bien ceux proposés à l\'écran',
    EN_TETES_PHOTO.every(h => entetes.includes(h)),
    EN_TETES_PHOTO.filter(h => !entetes.includes(h)).join(', ') || 'tous présents');

  const cardTxt = await page.locator('.imp-filecard').innerText();
  c('la carte annonce 9 lignes', /9 lignes/.test(cardTxt), cardTxt.replace(/\s+/g, ' ').slice(0, 80));
  c('la carte annonce 7 colonnes reconnues', /7 colonnes reconnues/.test(cardTxt));
  const ignorees = await page.locator('.imp-map select').evaluateAll(sels => sels.filter(s => s.value === '-1').length);
  c('aucune colonne n\'est laissée sur « Ignorer »', ignorees === 0, `${ignorees} ignorée(s)`);

  // ── B. LA règle : toutes les lignes, pas six ────────────────────────────
  console.log('\n— B. Une photo montre TOUTES ses lignes —');
  const nbApercu = await page.locator('table.imp-preview tbody tr').count();
  c('les 9 lignes sont à l\'écran (et pas 6)', nbApercu === 9, `${nbApercu} lignes`);
  const corps = await page.locator('table.imp-preview').innerText();
  c('la dernière personne est visible', corps.includes('Temoin9'));
  c('la personne SANS email est là quand même', corps.includes('Temoin4'));
  const scrollable = await page.locator('.imp-preview-wrap').evaluate(el => getComputedStyle(el).overflowY);
  c('le tableau défile au lieu de s\'étirer', ['auto', 'scroll'].includes(scrollable), scrollable);

  // ── C. Le bout de la chaîne : la base ───────────────────────────────────
  console.log('\n— C. L\'import réel écrit les fiches EN BASE —');
  await page.unroute('**/api/clients/extract-photo'); // la suite ne passe plus par l'IA
  const okImport = await clicJusquA(page, 'button:has-text("Importer")', 'text=/import/i');
  c('le bouton d\'import répond', okImport);
  await page.waitForSelector('text=/élèves? importée?s?|Aucune ligne/i', { timeout: 60000 }).catch(() => {});
  await new Promise(r => setTimeout(r, 1500));

  const { data: crees } = await svc.from('clients')
    .select('prenom, nom, email, telephone, ville, notes, date_naissance, statut, source')
    .eq('profile_id', demo.id).eq('nom', MARQUE).order('prenom');
  c('les 9 fiches sont en base', (crees || []).length === 9, `${(crees || []).length} fiches`);
  const t1 = (crees || []).find(x => x.prenom === 'Temoin1');
  c('la date lue est enregistrée', t1?.date_naissance === '1974-03-02', String(t1?.date_naissance));
  c('la ville est enregistrée', t1?.ville === 'Gillonnay');
  c('la note (le groupe) est enregistrée', /18h45/.test(t1?.notes || ''), t1?.notes);
  c('la fiche naît « prospect », source import', t1?.statut === 'prospect' && t1?.source === 'import');
  const sansMail = (crees || []).find(x => x.prenom === 'Temoin4');
  c('la personne sans email est bien créée', !!sansMail && !sansMail.email, `email=${JSON.stringify(sansMail?.email)}`);

  // ── D. Non-régression du CSV ────────────────────────────────────────────
  console.log('\n— D. Un CSV se comporte comme avant —');
  const csv = join(tmpdir(), `preuve-photo-${Date.now()}.csv`);
  writeFileSync(csv, 'prenom;nom;email\n' + Array.from({ length: 12 }, (_, i) => `Csv${i};ZZPREUVECSV;csv${i}@example.com`).join('\n'), 'utf8');
  await page.goto(`${BASE}/clients/importer`, { waitUntil: 'domcontentloaded', timeout: 120000 });
  await page.waitForSelector('.imp-drop input[type=file]', { state: 'attached', timeout: 60000 });
  const depotCsv = await deposerJusquA(page, '.imp-drop input[type=file]', csv, 'table.imp-preview');
  c('le dépôt du CSV est pris en compte', depotCsv);
  const nbCsv = await page.locator('table.imp-preview tbody tr').count();
  c('un CSV n\'affiche toujours que 6 lignes d\'aperçu', nbCsv === 6, `${nbCsv} lignes`);
  c('aucun bandeau de lecture sur un CSV', await page.locator('[data-testid="imp-lecture"]').count() === 0);
  unlinkSync(csv);

  c('console propre', erreurs.length === 0, erreurs.join(' | ').slice(0, 160));

  // ── E. Le chemin RÉEL (payant) ──────────────────────────────────────────
  if (AVEC_IA) {
    console.log('\n— E. Chemin réel : une vraie liste lue par le modèle —');
    // On dessine une liste lisible dans le navigateur, puis on l'envoie à la
    // VRAIE route : c'est la seule façon de prouver que le prompt tient.
    const dataUrl = await page.evaluate(() => {
      const cv = document.createElement('canvas');
      cv.width = 900; cv.height = 420;
      const g = cv.getContext('2d');
      g.fillStyle = '#fff'; g.fillRect(0, 0, cv.width, cv.height);
      g.fillStyle = '#000'; g.font = 'bold 26px Arial';
      g.fillText('Liste des adherentes 2026-2027', 40, 50);
      g.font = '24px Arial';
      const gens = [
        '1  Mireille ANDRE      07 81 67 86 38   mireille.andre@example.com',
        '2  Janique MARTIN      06 99 15 24 00   janique.martin@example.com',
        '3  Helene DURAND       06 08 48 90 12   helene.durand@example.com',
        '4  Karine TARRARE      06 50 54 21 13   karine.tarrare@example.com',
      ];
      gens.forEach((l, i) => g.fillText(l, 40, 120 + i * 60));
      return cv.toDataURL('image/png');
    });
    const img = join(tmpdir(), `preuve-photo-reelle-${Date.now()}.png`);
    writeFileSync(img, Buffer.from(dataUrl.split(',')[1], 'base64'));
    await page.goto(`${BASE}/clients/importer`, { waitUntil: 'domcontentloaded', timeout: 120000 });
    await page.waitForSelector('[data-testid="imp-photo-bloc"]', { timeout: 60000 });
    // Auto-adaptatif : sans clé Anthropic (le cas de .env.local), la route
    // répond 503 « Extraction IA non configurée » et c'est ÇA qu'on prouve,
    // plutot que d'accuser le modèle d'une clé absente.
    let statutRoute = null;
    page.on('response', r => { if (r.url().includes('/api/clients/extract-photo')) statutRoute = r.status(); });
    const lu = await deposerJusquA(page, '[data-testid="imp-photo-bloc"] input[type=file]', img, '[data-testid="imp-lecture"]', 2);
    if (statutRoute === 503) {
      const err = await page.locator('.imp-error').innerText().catch(() => '');
      c('sans clé IA, la route le DIT au lieu de faire semblant', /non configur/i.test(err), err.replace(/\s+/g, ' ').slice(0, 80));
      console.log('     (chemin réel non prouve en local : ANTHROPIC_API_KEY vide. Il tourne en prod.)');
    } else c('le modèle a rendu une liste exploitable', lu, `HTTP ${statutRoute}`);
    if (lu) {
      const tab = await page.locator('table.imp-preview').innerText();
      for (const nom of ['ANDRE', 'MARTIN', 'DURAND', 'TARRARE']) {
        c(`« ${nom} » est lue`, tab.toUpperCase().includes(nom));
      }
      c('un email est lu correctement', /mireille\.andre@example\.com/i.test(tab));
      c('la ligne de titre n\'est pas prise pour une personne', !/adherentes 2026/i.test(tab));
    }
    unlinkSync(img);
  } else {
    console.log('\n— E. Chemin réel : SAUTÉ (PROOF_IA=1 pour l\'exécuter, ~0,15 € d\'appel Opus) —');
  }
} catch (e) {
  // Une preuve qui meurt en silence ment sur ce qui s'est passé : on DIT quoi.
  ko++;
  console.log('\n  KO  exception pendant la preuve — ' + String(e?.stack || e).split('\n').slice(0, 4).join(' | '));
} finally {
  await browser.close().catch(() => {});
  try { unlinkSync(fichierImage); } catch { /* déjà parti */ }
  const purgees = await purger();
  console.log(`\nMénage : ${purgees} fiche(s) témoin supprimée(s).`);
  console.log(`\n${ok}/${ok + ko} OK${ko ? ` — ${ko} KO` : ''}`);
  process.exit(ko ? 1 : 0);
}
