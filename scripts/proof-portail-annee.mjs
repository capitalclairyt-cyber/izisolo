/**
 * PREUVE — le planning public au-delà de deux mois, à la demande
 * (2026-09-23, retour Manon / Soleya : elle voyait ses séances de novembre
 * dans son agenda, ses élèves lisaient « Aucun cours cette semaine »).
 *
 * Vrai navigateur (Chromium) contre le dev server (:3333 par défaut,
 * PROOF_BASE sinon), démo Atelier Soleil, visiteuse ANONYME. Six séances
 * témoins créées puis purgées, même en cas d'échec :
 *   J+70  publique         → doit être servie
 *   J+70  privée           → jamais à une anonyme
 *   J+70  « inscrits »     → jamais à une anonyme
 *   J+70  annulée          → jamais
 *   J+200 publique         → servie (dans l'année)
 *   J+400 publique         → hors horizon, jamais
 *
 *   A. La page charge 60 jours et rien de plus : la témoin J+70 n'est pas
 *      dans le HTML initial, la fin de fenêtre est transmise.
 *   B. La route : la semaine de J+70 rend la publique seule ; J+200 rendue ;
 *      32 jours → 400 ; inversée → 400 ; J+400 → 400 HORS_HORIZON (en anglais
 *      avec le cookie EN).
 *   C. Vue semaine : ▶ jusqu'à la semaine de J+70 déclenche UNE requête de
 *      route pour cette semaine, la carte publique apparaît, aucune des trois
 *      autres, et « Aucun cours cette semaine » n'a jamais été affiché pour
 *      cette semaine avant la réponse.
 *   D. Erreur : la route coupée → « Impossible de charger cette semaine » +
 *      Réessayer ; route rendue → la carte apparaît.
 *   E. Vue liste : « Voir les semaines suivantes » jusqu'à la témoin J+70,
 *      « Planning affiché jusqu'au » avance, puis jusqu'à l'horizon : le
 *      bouton disparaît et la note « jusqu'à un an » le remplace, J+400 absente.
 *   F. Au-delà de l'horizon en vue semaine : ▶ se désactive, sans requête.
 *   G. Mobile 390 : rien ne déborde.
 *
 * Re-runnable, témoins purgés, quota anti-abus de l'IP locale libéré, aucun email.
 */
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { ajouterJours, finFenetre, finHorizon } from '../lib/portail-fenetre.js';

const BASE = process.env.PROOF_BASE || 'http://localhost:3333';
const NOM = 'Preuve fenêtre annuelle';

const env = Object.fromEntries(
  readFileSync(join(process.cwd(), '.env.local'), 'utf8')
    .split('\n').filter(l => l.includes('=') && !l.startsWith('#'))
    .map(l => [l.slice(0, l.indexOf('=')).trim(), l.slice(l.indexOf('=') + 1).trim()])
);
const svc = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

let ok = 0, ko = 0;
const c = (l, cond, d = '') => { if (cond) { ok++; console.log('  OK  ' + l + (d ? ' - ' + d : '')); } else { ko++; console.log('  KO  ' + l + (d ? ' - ' + d : '')); } };
const attendre = async (fn, ms = 30000) => { const fin = Date.now() + ms; let v; while (Date.now() < fin) { v = await fn().catch(() => null); if (v) return v; await new Promise(r => setTimeout(r, 250)); } return null; };

const { data: demo } = await svc.from('profiles').select('id, studio_slug, studio_nom').eq('studio_slug', 'atelier-soleil').single();
if (!demo) { console.error('Démo introuvable'); process.exit(1); }
const SLUG = demo.studio_slug;
const today = new Date().toLocaleDateString('sv-SE', { timeZone: 'Europe/Paris' });
const FIN_FENETRE = finFenetre(today);
const HORIZON = finHorizon(today);
const J70 = ajouterJours(today, 70), J200 = ajouterJours(today, 200), J400 = ajouterJours(today, 400);
const lundiDe = (iso) => { const d = new Date(iso + 'T12:00:00Z'); const j = d.getUTCDay(); return ajouterJours(iso, j === 0 ? -6 : 1 - j); };
const SEM70 = { de: lundiDe(J70), a: ajouterJours(lundiDe(J70), 6) };
console.log(`aujourd'hui ${today} · fenêtre → ${FIN_FENETRE} · horizon → ${HORIZON} · J+70 = ${J70} (semaine ${SEM70.de} → ${SEM70.a}) · J+200 = ${J200} · J+400 = ${J400}`);

// Quota anti-abus de la route (120/h par IP, compteur partagé en base) : on
// libère la clé de l'appelant LOCAL seulement, jamais un like('scope:%').
for (const ip of ['null', '::1', '127.0.0.1', '::ffff:127.0.0.1']) {
  const empreinte = createHash('sha256').update(ip + (env.IP_HASH_SALT || 'izisolo')).digest('hex').slice(0, 32);
  await svc.from('rate_limits').delete().eq('cle', `portail-seances:${empreinte}`).then(() => {}, () => {});
}

const temoins = [];
async function purger() {
  const { data } = await svc.from('cours').select('id').eq('profile_id', demo.id).eq('nom', NOM);
  const ids = [...new Set([...temoins, ...(data || []).map(x => x.id)])];
  if (ids.length) await svc.from('cours').delete().in('id', ids);
}
await purger();
const creer = async (o) => {
  const { data, error } = await svc.from('cours').insert({
    profile_id: demo.id, nom: NOM, duree_minutes: 60, capacite_max: 8, visibilite: 'public', format: 'presentiel',
    lieu: 'Salle de la preuve', heure: '10:00:00', est_annule: false, ...o,
  }).select('id').single();
  if (error) throw new Error('création témoin : ' + error.message);
  temoins.push(data.id);
  return data.id;
};
const idPub70 = await creer({ date: J70 });
const idPrive70 = await creer({ date: J70, heure: '11:00:00', visibilite: 'prive' });
const idInscrits70 = await creer({ date: J70, heure: '12:00:00', visibilite: 'inscrits' });
const idAnnule70 = await creer({ date: J70, heure: '13:00:00', est_annule: true });
const idPub200 = await creer({ date: J200 });
const idPub400 = await creer({ date: J400 });

// Préchauffer la route et la page (la PREMIÈRE compilation en dev recharge
// l'écran par Fast Refresh et avale un clic, §12).
await fetch(`${BASE}/p/${SLUG}`).catch(() => {});
await fetch(`${BASE}/api/portail/${SLUG}/seances?de=${SEM70.de}&a=${SEM70.a}`).catch(() => {});

let chromium; try { ({ chromium } = await import('playwright')); } catch { ({ chromium } = await import('@playwright/test')); }
let browser; try { browser = await chromium.launch({ channel: 'msedge' }); } catch { browser = await chromium.launch(); }
const erreurs = [];

try {
  // ── A. Le premier rendu ne charge que 60 jours ──────────────────────────
  console.log('\n— A. Le premier rendu : 60 jours, et la fin de fenêtre transmise —');
  const html = await (await fetch(`${BASE}/p/${SLUG}`)).text();
  c('la témoin J+70 n\'est PAS dans le premier rendu', !html.includes(idPub70));
  c('la fin de fenêtre part au navigateur', html.includes(FIN_FENETRE), FIN_FENETRE);

  // ── B. La route ─────────────────────────────────────────────────────────
  console.log('\n— B. La route /api/portail/[slug]/seances —');
  const appel = async (de, a, headers = {}) => { const r = await fetch(`${BASE}/api/portail/${SLUG}/seances?de=${de}&a=${a}`, { headers }); return { status: r.status, json: await r.json().catch(() => ({})) }; };
  const r70 = await appel(SEM70.de, SEM70.a);
  const ids70 = (r70.json.cours || []).map(x => x.id);
  c('semaine de J+70 : 200 et la publique servie', r70.status === 200 && ids70.includes(idPub70), `${r70.status}, ${ids70.length} séances`);
  c('ni la privée, ni la « inscrits », ni l\'annulée', !ids70.includes(idPrive70) && !ids70.includes(idInscrits70) && !ids70.includes(idAnnule70));
  c('la séance servie a la forme de la page (nbInscrits, intervenante, photo greffable)', (() => { const s = (r70.json.cours || []).find(x => x.id === idPub70); return s && typeof s.nbInscrits === 'number' && 'intervenante' in s && s.nom === NOM; })());
  const r200 = await appel(lundiDe(J200), ajouterJours(lundiDe(J200), 6));
  c('J+200 : servie (dans l\'année)', r200.status === 200 && (r200.json.cours || []).some(x => x.id === idPub200));
  const r32 = await appel(SEM70.de, ajouterJours(SEM70.de, 31));
  c('32 jours → 400', r32.status === 400 && r32.json.code === 'PLAGE_TROP_LONGUE', JSON.stringify(r32.json));
  const rInv = await appel(SEM70.a, SEM70.de);
  c('plage inversée → 400', rInv.status === 400 && rInv.json.code === 'PLAGE_INVERSEE');
  const r400 = await appel(lundiDe(J400), ajouterJours(lundiDe(J400), 6), { cookie: 'izi_lang=en' });
  c('J+400 → 400 HORS_HORIZON, en anglais avec le cookie EN', r400.status === 400 && r400.json.code === 'HORS_HORIZON' && /one year ahead/.test(r400.json.error || ''), JSON.stringify(r400.json));
  const rInconnu = await fetch(`${BASE}/api/portail/studio-qui-n-existe-pas/seances?de=${SEM70.de}&a=${SEM70.a}`);
  c('studio inconnu → 404', rInconnu.status === 404);

  // ── C. Vue semaine : ▶ jusqu'à J+70 ─────────────────────────────────────
  console.log('\n— C. Vue semaine : ▶ va chercher la semaine de J+70 —');
  const ctx = await browser.newContext({ viewport: { width: 1100, height: 900 } });
  const page = await ctx.newPage();
  page.on('pageerror', e => erreurs.push('C: ' + String(e).slice(0, 160)));
  const requetes = [];
  page.on('request', r => { if (r.url().includes(`/api/portail/${SLUG}/seances`)) requetes.push(new URL(r.url()).search); });
  await page.goto(`${BASE}/p/${SLUG}`, { waitUntil: 'domcontentloaded', timeout: 120000 });
  await page.waitForSelector('[data-testid="portail-semaine-suivante"]', { timeout: 90000 });
  // Le composant ancre la semaine sur la première séance à venir : on lit son
  // lundi dans l'état du DOM plutôt que de le deviner, et on avance jusqu'à
  // la semaine de J+70 en surveillant qu'aucun « Aucun cours » ne s'affiche
  // pour elle avant la réponse.
  let vuVideAvantReponse = false;
  let clics = 0;
  const labelSemaine = async () => (await page.innerText('.portail-week-label')).replace(/\s+/g, ' ');
  // Nombre de clics : de la semaine courante affichée à celle de J+70. On
  // clique jusqu'à ce que la carte témoin OU l'état vide/chargement de la
  // semaine cible apparaisse, avec un plafond.
  const cibleLabel = await page.evaluate((iso) => {
    const d = new Date(iso + 'T12:00:00');
    return d.getDate(); // le numéro du lundi de la semaine cible, présent dans le libellé
  }, SEM70.de);
  for (let i = 0; i < 20; i++) {
    const lab = await labelSemaine();
    const [debutLab] = lab.split(/[–-]/);
    if (parseInt(debutLab, 10) === cibleLabel && requetes.some(q => q.includes(`de=${SEM70.de}`))) break;
    await page.click('[data-testid="portail-semaine-suivante"]');
    clics++;
    await page.waitForTimeout(150);
    if (await page.locator('[data-testid="portail-semaine-vide"]').count()) {
      const l = await labelSemaine();
      if (parseInt(l.split(/[–-]/)[0], 10) === cibleLabel) vuVideAvantReponse = true;
    }
  }
  const carte = await attendre(() => page.locator(`a[href*="/cours/${idPub70}"]`).count().then(n => n > 0 ? n : null), 20000);
  c('la carte de la témoin publique apparaît sur la semaine de J+70', !!carte, `${clics} clics ▶`);
  c('UNE requête de route pour cette semaine, et pas pour les semaines déjà chargées', requetes.filter(q => q.includes(`de=${SEM70.de}`)).length === 1 && !requetes.some(q => q.includes(`de=${today}`)), requetes.join(' '));
  c('« Aucun cours cette semaine » n\'a jamais été affiché pour cette semaine avant la réponse', !vuVideAvantReponse);
  c('la privée, la « inscrits » et l\'annulée ne sont pas rendues', (await page.locator(`a[href*="/cours/${idPrive70}"], a[href*="/cours/${idInscrits70}"], a[href*="/cours/${idAnnule70}"]`).count()) === 0);
  c('aucune erreur de page', erreurs.length === 0, erreurs.join(' | '));

  // ── D. La route coupée : l'écran le dit, et se rattrape ─────────────────
  console.log('\n— D. La route coupée : « Impossible de charger », puis Réessayer —');
  const ctxD = await browser.newContext({ viewport: { width: 1100, height: 900 } });
  const pd = await ctxD.newPage();
  await pd.route(`**/api/portail/${SLUG}/seances**`, r => r.abort());
  await pd.goto(`${BASE}/p/${SLUG}`, { waitUntil: 'domcontentloaded', timeout: 120000 });
  await pd.waitForSelector('[data-testid="portail-semaine-suivante"]', { timeout: 90000 });
  for (let i = 0; i < clics; i++) { await pd.click('[data-testid="portail-semaine-suivante"]'); await pd.waitForTimeout(80); }
  const erreurVisible = await attendre(() => pd.locator('[data-testid="portail-semaine-erreur"]').count().then(n => n > 0 ? n : null), 15000);
  c('la semaine coupée dit « Impossible de charger cette semaine » avec Réessayer', !!erreurVisible && (await pd.innerText('[data-testid="portail-semaine-erreur"]')).includes('Réessayer'));
  c('et ne dit PAS « Aucun cours cette semaine »', (await pd.locator('[data-testid="portail-semaine-vide"]').count()) === 0);
  await pd.unroute(`**/api/portail/${SLUG}/seances**`);
  await pd.click('[data-testid="portail-semaine-erreur"] button');
  c('Réessayer → la carte apparaît', !!(await attendre(() => pd.locator(`a[href*="/cours/${idPub70}"]`).count().then(n => n > 0 ? n : null), 20000)));
  await ctxD.close();

  // ── E. Vue liste : « Voir les semaines suivantes » ──────────────────────
  console.log('\n— E. Vue liste : la suite, puis l\'horizon —');
  await page.click('button[role="tab"]:has-text("Liste")');
  await page.waitForSelector('[data-testid="portail-liste-suite"]', { timeout: 15000 });
  const jusquAvant = await page.innerText('[data-testid="portail-liste-jusqu"]');
  let plus = 0;
  while ((await page.locator('[data-testid="portail-liste-plus"]').count()) && plus < 20) {
    await page.click('[data-testid="portail-liste-plus"]:not([disabled])');
    plus++;
    await attendre(() => page.locator('[data-testid="portail-liste-plus"]:not([disabled]), [data-testid="portail-horizon"]').count().then(n => n > 0 ? n : null), 20000);
    if (plus === 1) {
      const jusquApres = await page.innerText('[data-testid="portail-liste-jusqu"]');
      c('« Planning affiché jusqu\'au » avance après un clic', jusquApres !== jusquAvant, `${jusquAvant} → ${jusquApres}`);
    }
  }
  c('la témoin J+70 est dans la liste', (await page.locator(`a[href*="/cours/${idPub70}"]`).count()) > 0);
  c('la témoin J+200 aussi', (await page.locator(`a[href*="/cours/${idPub200}"]`).count()) > 0);
  c('J+400 (hors horizon) jamais', (await page.locator(`a[href*="/cours/${idPub400}"]`).count()) === 0);
  c('à l\'horizon, le bouton disparaît et la note « un an » le remplace', (await page.locator('[data-testid="portail-liste-plus"]').count()) === 0 && (await page.locator('[data-testid="portail-horizon"]').count()) > 0, `${plus} clics`);
  c('aucune erreur de chargement affichée', (await page.locator('[data-testid="portail-liste-erreur"]').count()) === 0);

  // ── F. Vue semaine à l'horizon : ▶ se désactive sans requête ────────────
  console.log('\n— F. Vue semaine à l\'horizon : ▶ désactivé, zéro requête de plus —');
  const nbRequetesAvant = requetes.length;
  await page.click('button[role="tab"]:has-text("Semaine")');
  await page.waitForSelector('[data-testid="portail-semaine-suivante"]', { timeout: 15000 });
  let n = 0;
  while (!(await page.locator('[data-testid="portail-semaine-suivante"]').isDisabled()) && n < 60) { await page.click('[data-testid="portail-semaine-suivante"]'); n++; await page.waitForTimeout(30); }
  c('▶ finit désactivé, la note « un an » est là', (await page.locator('[data-testid="portail-semaine-suivante"]').isDisabled()) && (await page.locator('[data-testid="portail-horizon"]').count()) > 0, `${n} clics`);
  await page.waitForTimeout(500);
  c('tout était déjà chargé par la liste : aucune requête de route de plus', requetes.length === nbRequetesAvant, `${requetes.length - nbRequetesAvant} de plus`);
  c('aucune erreur de page', erreurs.length === 0, erreurs.join(' | '));
  await ctx.close();

  // ── G. Mobile ───────────────────────────────────────────────────────────
  console.log('\n— G. Mobile 390 —');
  const ctxM = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const pm = await ctxM.newPage();
  await pm.goto(`${BASE}/p/${SLUG}`, { waitUntil: 'domcontentloaded', timeout: 120000 });
  await pm.waitForSelector('[data-testid="portail-semaine-suivante"]', { timeout: 90000 });
  for (let i = 0; i < clics; i++) { await pm.click('[data-testid="portail-semaine-suivante"]'); await pm.waitForTimeout(60); }
  await attendre(() => pm.locator(`a[href*="/cours/${idPub70}"]`).count().then(x => x > 0 ? x : null), 20000);
  const largeur = await pm.evaluate(() => document.documentElement.scrollWidth);
  c('rien ne déborde en 390 px après chargement', largeur <= 390, `${largeur} px`);
  await pm.click('button[role="tab"]:has-text("Liste")');
  await pm.waitForSelector('[data-testid="portail-liste-plus"]', { timeout: 15000 });
  const btn = await pm.locator('[data-testid="portail-liste-plus"]').boundingBox();
  c('le bouton « Voir les semaines suivantes » est dans l\'écran', !!btn && btn.x >= 0 && btn.x + btn.width <= 390);
  await ctxM.close();
} catch (e) {
  ko++;
  console.log('  KO  exception : ' + (e?.stack || e));
} finally {
  await browser.close().catch(() => {});
  await purger();
  console.log(`\nRÉSULTAT : ${ok} OK / ${ko} KO` + (ko === 0 ? ' — preuve verte, témoins purgés.' : ''));
  process.exit(ko === 0 ? 0 : 1);
}
