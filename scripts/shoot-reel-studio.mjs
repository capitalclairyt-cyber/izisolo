/**
 * Visuels « plan Studio » du RÉEL (reel/src/Studio.jsx, 2026-09-23) — captures
 * RÉELLES, mobile, d'un studio JETABLE seedé pour l'occasion, parce que le démo
 * Atelier Soleil est une prof seule : il n'a ni équipe rémunérée, ni salles, ni
 * Compta. Écrites dans reel/public/ et FUSIONNÉES dans manifest.json (les
 * autres coordonnées du réel ne bougent pas), même discipline que
 * shoot-reel-visuels : elles se REFONT quand l'UI d'un écran montré change.
 *
 *   studio-equipe.jpg         /equipe : deux profs avec leur rémunération convenue
 *                             + repère studioRemu (la ligne « Rémunération : 30 € / séance »)
 *   studio-releve.jpg         Compta → Relevés : le relevé de Léa pour le mois dernier
 *                             + repère studioReleve (la tuile « Montant dû »)
 *   studio-analyse.jpg        Compta → Analyse : recettes, résultat, la marge de chaque séance
 *                             + repère studioMarge (la cellule marge de la 1re séance)
 *   studio-salles.jpg         Paramètres → Studio & lieux, carte Lieux ouverte, deux salles
 *                             + repère studioSalle (la puce « Salle Reformer · 6 places »)
 *   studio-chevauchement.jpg  Nouveau cours : une seconde séance dans la Salle Reformer à
 *                             la même heure → le toast qui la refuse AVANT d'écrire
 *                             + repère studioToast
 *
 * Le studio jetable (Studio Ondine, Lyon), ses deux profs (Léa, Inès), ses
 * élèves (@example.com, aucun email ne part) et toutes leurs lignes sont PURGÉS
 * à la fin, même en échec. Aucune écriture hors des lignes du studio jetable.
 *
 * Usage : node scripts/shoot-reel-studio.mjs        (contre la prod)
 *         SHOOT_BASE=http://localhost:3333 node …   (contre un dev server)
 */
import { createClient } from '@supabase/supabase-js';
import sharp from 'sharp';
import { readFileSync, mkdirSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = process.cwd();
const env = Object.fromEntries(
  readFileSync(join(ROOT, '.env.local'), 'utf8')
    .split('\n').filter(l => l.includes('=') && !l.startsWith('#'))
    .map(l => [l.slice(0, l.indexOf('=')).trim(), l.slice(l.indexOf('=') + 1).trim()])
);
const OUT = join(ROOT, 'reel', 'public');
mkdirSync(OUT, { recursive: true });
const BASE = process.env.SHOOT_BASE || 'https://www.izisolo.fr';
const PROJECT_REF = new URL(env.NEXT_PUBLIC_SUPABASE_URL).hostname.split('.')[0];
const LARGEUR = 720;
const ECHELLE = LARGEUR / 1170; // px de capture (390 × 3) → px de l'image écrite
const svc = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

// Des adresses qui ressemblent à de vraies adresses (elles s'affichent sur la
// page Équipe), toutes en @example.com : le garde-fou RFC 2606 de lib/email
// ignore tout envoi vers ce domaine. Les élèves portent le PRÉFIXE, les trois
// comptes nommés sont purgés par leur adresse exacte.
const PREFIXE = 'reel-studio-';
const EMAILS = {
  studio: 'bonjour.studio-ondine@example.com',
  lea: 'lea.marchand@example.com',
  ines: 'ines.ferreira@example.com',
};
const estJetable = (email) => (email || '').startsWith(PREFIXE) || Object.values(EMAILS).includes(email || '');
const dormir = (ms) => new Promise(r => setTimeout(r, ms));
const attendre = async (fn, ms = 20000, pas = 500) => { const fin = Date.now() + ms; for (;;) { const r = await fn(); if (r) return r; if (Date.now() > fin) return null; await dormir(pas); } };
const AUJ = new Date().toLocaleDateString('sv-SE', { timeZone: 'Europe/Paris' });
const j = (n) => new Date(Date.now() + n * 864e5).toLocaleDateString('sv-SE', { timeZone: 'Europe/Paris' });
// Le mois dernier, en dates : du 1er au dernier jour.
const [A, M] = AUJ.slice(0, 7).split('-').map(Number);
const prec = new Date(Date.UTC(A, M - 2, 1));
const MOIS_PREC = `${prec.getUTCFullYear()}-${String(prec.getUTCMonth() + 1).padStart(2, '0')}`;
const jourPrec = (d) => `${MOIS_PREC}-${String(d).padStart(2, '0')}`;
const nbJoursPrec = new Date(Date.UTC(prec.getUTCFullYear(), prec.getUTCMonth() + 1, 0)).getUTCDate();

let ok = 0, ko = 0;
const manifest = existsSync(join(OUT, 'manifest.json')) ? JSON.parse(readFileSync(join(OUT, 'manifest.json'), 'utf8')) : {};
manifest.reperes = manifest.reperes || {};

async function purger() {
  const { data: lst } = await svc.auth.admin.listUsers({ page: 1, perPage: 500 }).catch(() => ({ data: null }));
  const users = (lst?.users || []).filter(u => estJetable(u.email));
  for (const u of users) {
    await svc.from('studio_membres').delete().eq('profile_id', u.id).then(() => {}, () => {});
    await svc.from('studio_membres').delete().eq('auth_user_id', u.id).then(() => {}, () => {});
    await svc.from('prestations').delete().eq('profile_id', u.id).then(() => {}, () => {});
    await svc.from('depenses').delete().eq('profile_id', u.id).then(() => {}, () => {});
    await svc.from('paiements').delete().eq('profile_id', u.id);
    await svc.from('presences').delete().eq('profile_id', u.id);
    await svc.from('abonnements').delete().eq('profile_id', u.id);
    await svc.from('cours').delete().eq('profile_id', u.id);
    await svc.from('lieux').delete().eq('profile_id', u.id);
    await svc.from('clients').delete().eq('profile_id', u.id);
    await svc.auth.admin.deleteUser(u.id).catch(() => {});
  }
}

const sessionCookies = async (email) => {
  const { data: linkData, error } = await svc.auth.admin.generateLink({ type: 'magiclink', email });
  if (error) throw new Error(`generateLink ${email}: ${error.message}`);
  const anon = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: otp, error: eOtp } = await anon.auth.verifyOtp({ type: 'magiclink', token_hash: linkData.properties.hashed_token });
  if (eOtp || !otp?.session) throw new Error(`verifyOtp ${email}: ${eOtp?.message || 'pas de session'}`);
  const value = 'base64-' + Buffer.from(JSON.stringify(otp.session)).toString('base64url');
  const nm = `sb-${PROJECT_REF}-auth-token`;
  const cookies = [];
  if (value.length <= 3180) cookies.push({ name: nm, value });
  else for (let i = 0; i * 3180 < value.length; i++) cookies.push({ name: `${nm}.${i}`, value: value.slice(i * 3180, (i + 1) * 3180) });
  return cookies;
};
const api = async (cookies, path, init = {}) => {
  const r = await fetch(`${BASE}${path}`, { ...init, headers: { 'Content-Type': 'application/json', cookie: cookies.map(k => `${k.name}=${k.value}`).join('; '), ...(init.headers || {}) } });
  const body = await r.json().catch(() => ({}));
  return { status: r.status, body };
};

// ── Le studio jetable, seedé comme un vrai studio de quartier ───────────────
async function seeder() {
  const { data: cree, error } = await svc.auth.admin.createUser({ email: EMAILS.studio, email_confirm: true, password: `Reel-${Date.now()}!`, user_metadata: { prenom: 'Camille' } });
  if (error) throw new Error(`createUser studio: ${error.message}`);
  const id = cree.user.id;
  const profil = await attendre(async () => { const { data } = await svc.from('profiles').select('id').eq('id', id).maybeSingle(); return data || null; }, 15000, 500);
  if (!profil) throw new Error('le trigger handle_new_user n\'a pas créé le profil');
  const { error: eMaj } = await svc.from('profiles').update({
    studio_nom: 'Studio Ondine', studio_slug: `studio-ondine-${Date.now().toString(36)}`, prenom: 'Camille', nom: 'Ondine',
    metier: 'pilates', ville: 'Lyon', types_cours: ['Reformer', 'Vinyasa', 'Hatha', 'Barre au sol'],
    plan: 'studio', type_structure: 'studio', trial_started_at: j(-90), stripe_subscription_status: null, portail_actif: true,
    notif_prefs: { message: { email: false } },
  }).eq('id', id);
  if (eMaj) throw new Error(`profil: ${eMaj.message}`);
  const cookies = await sessionCookies(EMAILS.studio);

  // Deux profs, invitées par la vraie route, puis actives et rémunérées.
  const membres = {};
  for (const [cle, prenom, nom, rem] of [['lea', 'Léa', 'Marchand', { mode: 'par_seance', montant: 30 }], ['ines', 'Inès', 'Ferreira', { mode: 'horaire', montant: 28 }]]) {
    const inv = await api(cookies, '/api/equipe', { method: 'POST', body: JSON.stringify({ email: EMAILS[cle], prenom, nom, role: 'prof' }) });
    if (inv.status !== 200 || !inv.body?.membre?.id) throw new Error(`invitation ${prenom}: ${inv.status} ${JSON.stringify(inv.body).slice(0, 120)}`);
    membres[cle] = inv.body.membre.id;
    // Son compte existe (créé par l'invitation) : on la rattache comme si elle avait accepté.
    const { data: lst } = await svc.auth.admin.listUsers({ page: 1, perPage: 500 });
    const compte = (lst?.users || []).find(u => u.email === EMAILS[cle]);
    await svc.from('studio_membres').update({ statut: 'actif', auth_user_id: compte?.id || null, accepte_at: new Date().toISOString(), remuneration: rem }).eq('id', membres[cle]);
  }

  // Un lieu et ses deux salles.
  const { data: lieu, error: eLieu } = await svc.from('lieux').insert({ profile_id: id, nom: 'Studio Ondine', ville: 'Lyon', ordre: 0 }).select('id').single();
  if (eLieu) throw new Error(`lieu: ${eLieu.message}`);
  const { data: salles, error: eSalles } = await svc.from('lieux').insert([
    { profile_id: id, nom: 'Salle Zen', ordre: 1, salle_de: lieu.id, capacite: 12 },
    { profile_id: id, nom: 'Salle Reformer', ordre: 2, salle_de: lieu.id, capacite: 6 },
  ]).select('id, nom');
  if (eSalles) throw new Error(`salles: ${eSalles.message}`);
  const zen = salles.find(s => s.nom === 'Salle Zen');
  const reformer = salles.find(s => s.nom === 'Salle Reformer');

  // Douze élèves, des carnets et des abonnements payés le mois dernier.
  const PRENOMS = ['Anna', 'Sofia', 'Julie', 'Margaux', 'Chloé', 'Nour', 'Élise', 'Lina', 'Clara', 'Maya', 'Inaya', 'Romane'];
  const NOMS = ['Bernard', 'Costa', 'Dumont', 'Garnier', 'Leroy', 'Martins', 'Perrin', 'Rousseau', 'Simon', 'Vidal', 'Roux', 'Lambert'];
  const { data: fiches, error: eFiches } = await svc.from('clients').insert(PRENOMS.map((p, i) => ({
    profile_id: id, prenom: p, nom: NOMS[i], email: `${PREFIXE}eleve${i + 1}@example.com`, statut: 'actif',
    notif_prefs: { rappel_cours: { email: false, push: false }, message: { email: false, push: false } },
  }))).select('id, prenom');
  if (eFiches) throw new Error(`fiches: ${eFiches.message}`);
  const abos = [];
  for (let i = 0; i < fiches.length; i++) {
    const f = fiches[i];
    const carnet = i % 3 !== 0; // deux carnets pour un abonnement
    const { data: abo, error: eAbo } = await svc.from('abonnements').insert(carnet
      ? { profile_id: id, client_id: f.id, offre_nom: 'Carnet 10 séances', type: 'carnet', date_debut: jourPrec(1), date_fin: j(240), seances_total: 10, seances_utilisees: 0, statut: 'actif' }
      : { profile_id: id, client_id: f.id, offre_nom: 'Abonnement mensuel', type: 'abonnement', date_debut: jourPrec(1), date_fin: j(20), statut: 'actif' }
    ).select('id, client_id, type').single();
    if (eAbo) throw new Error(`abo: ${eAbo.message}`);
    abos.push(abo);
    const { error: ePai } = await svc.from('paiements').insert({ profile_id: id, client_id: f.id, abonnement_id: abo.id, intitule: carnet ? 'Carnet 10 séances' : 'Abonnement mensuel', type: carnet ? 'carnet' : 'abonnement',
      montant: carnet ? 150 : 89, statut: 'paid', mode: i % 2 ? 'CB' : 'virement', date: jourPrec(2 + (i % 5)), date_encaissement: jourPrec(2 + (i % 5)) });
    if (ePai) throw new Error(`paiement: ${ePai.message}`);
  }

  // Le mois dernier : Léa donne Vinyasa (mardi 18:30) et Hatha (jeudi 19:30) en
  // Salle Zen, Inès le Reformer (samedi 10:00) en Salle Reformer. Toutes pointées.
  const seances = [];
  for (let d = 1; d <= nbJoursPrec; d++) {
    const dow = new Date(`${jourPrec(d)}T12:00:00Z`).getUTCDay();
    if (dow === 2) seances.push({ nom: 'Vinyasa', type_cours: 'Vinyasa', date: jourPrec(d), heure: '18:30', duree_minutes: 60, lieu_id: zen.id, lieu: 'Salle Zen · Studio Ondine', capacite_max: 12, membre: 'lea', nb: 9 });
    if (dow === 4) seances.push({ nom: 'Hatha doux', type_cours: 'Hatha', date: jourPrec(d), heure: '19:30', duree_minutes: 75, lieu_id: zen.id, lieu: 'Salle Zen · Studio Ondine', capacite_max: 12, membre: 'lea', nb: 7 });
    if (dow === 6) seances.push({ nom: 'Reformer', type_cours: 'Reformer', date: jourPrec(d), heure: '10:00', duree_minutes: 55, lieu_id: reformer.id, lieu: 'Salle Reformer · Studio Ondine', capacite_max: 6, membre: 'ines', nb: 6 });
  }
  const { data: cours, error: eCours } = await svc.from('cours').insert(seances.map(({ membre: _m, nb: _n, ...s }) => ({ profile_id: id, visibilite: 'public', ...s }))).select('id, nom, date');
  if (eCours) throw new Error(`cours: ${eCours.message}`);
  for (const s of seances) {
    const c = cours.find(x => x.nom === s.nom && x.date === s.date);
    await svc.from('cours').update({ intervenant_id: membres[s.membre] }).eq('id', c.id);
    // Les présentes : les nb premières fiches, en tournant pour que tout le monde vienne.
    const debut = seances.indexOf(s) % fiches.length;
    const presentes = Array.from({ length: s.nb }, (_, k) => fiches[(debut + k) % fiches.length]);
    const { error: ePres } = await svc.from('presences').insert(presentes.map(f => {
      const abo = abos.find(a => a.client_id === f.id);
      return { profile_id: id, cours_id: c.id, client_id: f.id, abonnement_id: abo?.id || null, statut_pointage: 'present', pointee: true };
    }));
    if (ePres) throw new Error(`présences: ${ePres.message}`);
  }
  // Les carnets décomptés en conséquence (le seed écrit ce que le pointage aurait écrit).
  for (const abo of abos.filter(a => a.type === 'carnet')) {
    const { count } = await svc.from('presences').select('id', { count: 'exact', head: true }).eq('abonnement_id', abo.id);
    await svc.from('abonnements').update({ seances_utilisees: Math.min(10, count || 0) }).eq('id', abo.id);
  }

  // Les séances à venir : celle qui va gêner (Reformer, J+5 à 18:00) et deux autres.
  const { data: aVenir, error: eAv } = await svc.from('cours').insert([
    { profile_id: id, nom: 'Reformer', type_cours: 'Reformer', date: j(5), heure: '18:00', duree_minutes: 55, lieu_id: reformer.id, lieu: 'Salle Reformer · Studio Ondine', capacite_max: 6, visibilite: 'public' },
    { profile_id: id, nom: 'Vinyasa', type_cours: 'Vinyasa', date: j(5), heure: '18:30', duree_minutes: 60, lieu_id: zen.id, lieu: 'Salle Zen · Studio Ondine', capacite_max: 12, visibilite: 'public' },
    { profile_id: id, nom: 'Barre au sol', type_cours: 'Barre au sol', date: j(6), heure: '12:15', duree_minutes: 45, lieu_id: zen.id, lieu: 'Salle Zen · Studio Ondine', capacite_max: 12, visibilite: 'public' },
  ]).select('id, nom');
  if (eAv) throw new Error(`à venir: ${eAv.message}`);
  await svc.from('cours').update({ intervenant_id: membres.ines }).eq('id', aVenir.find(c => c.nom === 'Reformer').id);
  await svc.from('cours').update({ intervenant_id: membres.lea }).in('id', aVenir.filter(c => c.nom !== 'Reformer').map(c => c.id));

  // Les dépenses du mois dernier, réglées : le loyer de la salle, l'assurance,
  // un peu de matériel. C'est ce qui fait un RÉSULTAT et pas seulement des recettes.
  const { error: eDep } = await svc.from('depenses').insert([
    { profile_id: id, date: jourPrec(1), categorie: 'salle', libelle: 'Loyer du studio', montant_ttc: 900, statut: 'reglee', date_reglement: jourPrec(1), mode_reglement: 'virement', lieu_id: lieu.id },
    { profile_id: id, date: jourPrec(5), categorie: 'assurance', libelle: 'Assurance RC pro', montant_ttc: 45, statut: 'reglee', date_reglement: jourPrec(5), mode_reglement: 'virement' },
    { profile_id: id, date: jourPrec(12), categorie: 'materiel', libelle: 'Sangles et blocs', montant_ttc: 118, statut: 'reglee', date_reglement: jourPrec(12), mode_reglement: 'CB' },
  ]);
  if (eDep) throw new Error(`dépenses: ${eDep.message}`);

  console.log(`🌱 Studio Ondine : ${fiches.length} élèves, ${seances.length} séances pointées en ${MOIS_PREC}, 2 profs, 2 salles`);
  return { id, cookies, membres, reformerId: reformer.id, lea: membres.lea };
}

// ── Les captures ─────────────────────────────────────────────────────────────
const HIDE = `[class*="fab" i], [class*="feedback" i], nextjs-portal { display: none !important; }`;
async function ecrire(id, buf, { width = LARGEUR, quality = 82 } = {}) {
  try {
    const info = await sharp(buf).resize({ width }).jpeg({ quality, mozjpeg: true }).toFile(join(OUT, `${id}.jpg`));
    manifest[id] = { w: info.width, h: info.height };
    console.log(`📸 ${id}.jpg ${info.width}×${info.height} · ${Math.round(info.size / 1024)} Ko`);
    ok++;
  } catch (e) { console.log(`❌ ${id} : ${e.message.slice(0, 120)}`); ko++; }
}
// `pleinePage` : la capture est un fullPage, la position est absolue dans le
// document ; sinon c'est une capture du viewport, on ne compte pas le scroll.
const rect = (page, sel, pleinePage) => page.evaluate(([s, pp]) => {
  const el = document.querySelector(s);
  if (!el) return null;
  const r = el.getBoundingClientRect();
  return { x: r.left + r.width / 2, y: r.top + r.height / 2 + (pp ? window.scrollY : 0) };
}, [sel, pleinePage]);
const repere = async (page, cle, sel, { pleinePage = true } = {}) => {
  const r = await rect(page, sel, pleinePage);
  if (!r) { console.log(`❌ repère ${cle} introuvable (${sel})`); ko++; return; }
  manifest.reperes[cle] = [Math.round(r.x * 3 * ECHELLE), Math.round(r.y * 3 * ECHELLE)];
};
const aller = async (page, url) => {
  try { await page.goto(`${BASE}${url}`, { waitUntil: 'networkidle', timeout: 90000 }); }
  catch (e) { if (!/ERR_ABORTED|interrupted|Timeout/.test(String(e))) throw e; }
  await page.waitForTimeout(1500);
  await page.addStyleTag({ content: HIDE }).catch(() => {});
};

let chromium;
try { ({ chromium } = await import('playwright')); } catch { ({ chromium } = await import('@playwright/test')); }
let browser;
try { browser = await chromium.launch(); } catch { browser = await chromium.launch({ channel: 'msedge' }); }

try {
  await purger();
  const st = await seeder();
  // Les pages sont neuves pour ce studio : on les préchauffe, sinon la première
  // compilation (en dev) ou le premier rendu froid décale les captures.
  const mob = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true, locale: 'fr-FR' });
  await mob.addCookies(st.cookies.map(c => ({ ...c, url: BASE, sameSite: 'Lax' })));
  const page = await mob.newPage();
  page.on('dialog', d => d.accept());

  // 1. L'équipe : deux profs et leur rémunération convenue.
  await aller(page, '/equipe');
  await page.waitForSelector('[data-testid="remuneration"]', { timeout: 60000 });
  await page.waitForTimeout(600);
  await repere(page, 'studioRemu', '[data-testid="remuneration"]');
  await ecrire('studio-equipe', await page.screenshot({ fullPage: true }));

  // 2. Le relevé de Léa pour le mois dernier.
  await aller(page, '/compta?onglet=releves');
  await page.waitForSelector('[data-testid="releve-membre"]', { timeout: 60000 });
  await page.selectOption('[data-testid="releve-membre"]', st.lea);
  await attendre(async () => {
    const t = await page.textContent('[data-testid="releve-montant-du"]').catch(() => '');
    return t && t.trim() !== '—' ? true : null;
  }, 30000, 500);
  await page.waitForTimeout(600);
  await repere(page, 'studioReleve', '[data-testid="releve-montant-du"]');
  await ecrire('studio-releve', await page.screenshot({ fullPage: true }));

  // 3. L'analyse : recettes, résultat, la marge de chaque séance.
  await aller(page, '/compta?onglet=analyse');
  await page.waitForSelector('[data-testid="analyse-seance"]', { timeout: 60000 });
  await page.waitForTimeout(600);
  await repere(page, 'studioRecettes', '[data-testid="analyse-recettes"]');
  await repere(page, 'studioResultat', '[data-testid="analyse-resultat"]');
  // Le résultat de Léa dans le tableau par intervenante (4e colonne de sa ligne) :
  // sur mobile, la colonne « marge » du tableau des séances sort de l'écran.
  await repere(page, 'studioLeaResultat', '[data-testid="analyse-intervenante"] tbody tr:first-child td:nth-child(4)');
  await ecrire('studio-analyse', await page.screenshot({ fullPage: true }));

  // 4. Les salles, sous leur lieu.
  await aller(page, '/parametres/studio');
  await page.waitForSelector('[data-carte-reglage="lieux"] .carte-reglage-entete', { timeout: 60000 });
  await page.click('[data-carte-reglage="lieux"] .carte-reglage-entete');
  await page.waitForSelector('[data-testid="salle-chip"]', { timeout: 30000 });
  await page.waitForTimeout(600);
  await repere(page, 'studioSalle', '[data-testid="salle-chip"]:last-of-type');
  await ecrire('studio-salles', await page.screenshot({ fullPage: true }));

  // 5. Le chevauchement refusé : une seconde séance dans la Salle Reformer à 18:00.
  await aller(page, '/cours/nouveau');
  await page.waitForSelector('select option[value="public"]', { state: 'attached', timeout: 60000 });
  await attendre(async () => (await page.locator(`select option[value="${st.reformerId}"]`).count()) > 0 ? true : null, 20000, 300);
  await page.getByPlaceholder('Ex : Yoga Vinyasa').fill('Reformer débutants');
  await page.fill('input[type="date"]', j(5));
  await page.selectOption('select[aria-label="Heure"]', '18');
  await page.selectOption('select[aria-label="Minutes"]', '00');
  await page.selectOption(`select:has(option[value="${st.reformerId}"])`, st.reformerId);
  await page.waitForTimeout(400);
  await page.getByRole('button', { name: /Créer le cours/ }).click();
  const toast = await page.waitForSelector('.toast-message', { timeout: 20000 }).catch(() => null);
  if (!toast) { console.log('❌ aucun toast de refus'); ko++; }
  else {
    const texte = await toast.textContent();
    console.log(`💬 toast : ${texte.slice(0, 110)}`);
    if (!/déjà prise/.test(texte)) { console.log('❌ le toast ne refuse pas le chevauchement'); ko++; }
    await page.waitForTimeout(250);
    await repere(page, 'studioToast', '.toast-item', { pleinePage: false });
    await ecrire('studio-chevauchement', await page.screenshot());
    const { data: ecrit } = await svc.from('cours').select('id').eq('profile_id', st.id).eq('nom', 'Reformer débutants');
    if ((ecrit || []).length) { console.log('❌ la séance refusée a quand même été écrite'); ko++; }
  }
  await page.close();
  await mob.close();
} catch (e) {
  console.error('💥', e.message);
  ko++;
} finally {
  await browser.close().catch(() => {});
  await purger();
  console.log('🧹 Studio Ondine purgé (comptes, profs, élèves, séances, salles).');
}

writeFileSync(join(OUT, 'manifest.json'), JSON.stringify(manifest, null, 2));
console.log(`\n${ok} visuel(s), ${ko} échec(s) — manifest fusionné dans reel/public/.`);
process.exit(ko ? 1 : 0);
