/**
 * PREUVE — Lot 1 « Paramètres qui respirent » : la structure (2026-09-09).
 *
 * Avant : 5 onglets × 13 sous-onglets, deux barres qui débordaient sur mobile.
 * Après : /parametres = une liste de rubriques avec résumé d'état,
 * /parametres/<rubrique> = une rubrique, colonne gauche sur desktop, écran +
 * retour sur mobile. Les anciens deep-links sont redirigés côté serveur.
 *
 * Vrai navigateur (dev :3333, PROOF_BASE pour un autre port), session prof
 * démo Atelier Soleil :
 *   A. Les 18 anciens deep-links ?tab=&s= atterrissent sur la bonne rubrique,
 *      et le retour Stripe garde ses paramètres (abo=success).
 *   B. La liste : les groupes, les lignes, leurs résumés, et chaque ligne
 *      CLIQUABLE (elementFromPoint, le piège du FAB feedback).
 *   C. Chaque rubrique rend son titre et ses cartes, sans erreur de page.
 *   D. Le save par carte écrit encore SES colonnes et rien d'autre (relecture
 *      EN BASE, profil restauré).
 *   E. Mobile 390 : rien ne déborde, le lien de retour est là, la colonne
 *      de gauche est cachée.
 *   F. Une rubrique inconnue rend un vrai 404 ; « Intégrer sur mon site » a
 *      quitté Ma page ; le SMS a quitté les notifications élèves.
 *
 * Re-runnable : la ville du démo est restaurée même en cas d'échec.
 */
import { createClient } from '@supabase/supabase-js';
import { readFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

const BASE = process.env.PROOF_BASE || 'http://localhost:3333';
const OUT = join(process.cwd(), 'docs', 'proof-parametres-structure');
mkdirSync(OUT, { recursive: true });

const env = Object.fromEntries(
  readFileSync(join(process.cwd(), '.env.local'), 'utf8')
    .split('\n').filter(l => l.includes('=') && !l.startsWith('#'))
    .map(l => [l.slice(0, l.indexOf('=')).trim(), l.slice(l.indexOf('=') + 1).trim()])
);
const PROJECT_REF = new URL(env.NEXT_PUBLIC_SUPABASE_URL).hostname.split('.')[0];
const svc = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

let ok = 0, ko = 0;
const c = (l, cond, d = '') => { if (cond) { ok++; console.log('  OK  ' + l + (d ? ' - ' + d : '')); } else { ko++; console.log('  KO  ' + l + (d ? ' - ' + d : '')); } };

const { data: demo } = await svc.from('profiles').select('*').eq('studio_slug', 'atelier-soleil').single();
if (!demo) { console.error('Démo introuvable'); process.exit(1); }
const VILLE_AVANT = demo.ville;
const restaurer = async () => { await svc.from('profiles').update({ ville: VILLE_AVANT }).eq('id', demo.id); };

const sessionCookies = async (email) => {
  const { data: linkData, error } = await svc.auth.admin.generateLink({ type: 'magiclink', email });
  if (error) throw new Error('generateLink: ' + error.message);
  const anon = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: otp } = await anon.auth.verifyOtp({ type: 'magiclink', token_hash: linkData.properties.hashed_token });
  const value = 'base64-' + Buffer.from(JSON.stringify(otp.session)).toString('base64url');
  const nm = `sb-${PROJECT_REF}-auth-token`;
  const cookies = [];
  if (value.length <= 3180) cookies.push({ name: nm, value });
  else for (let i = 0; i * 3180 < value.length; i++) cookies.push({ name: `${nm}.${i}`, value: value.slice(i * 3180, (i + 1) * 3180) });
  return cookies;
};

// Les 18 destinations de l'ancien écran → la rubrique qui les remplace.
const ANCIENS = [
  ['?tab=profil', 'profil'], ['?tab=profil&s=profil', 'profil'], ['?tab=profil&s=activite', 'studio'],
  ['?tab=profil&s=lieux', 'studio'], ['?tab=profil&s=champs', 'champs'],
  ['?tab=portail', 'page'], ['?tab=portail&s=page', 'page'], ['?tab=portail&s=apparence', 'types-cours'],
  ['?tab=portail&s=visibilite', 'visibilite'], ['?tab=portail&s=essai', 'essai'], ['?tab=portail&s=paiement', 'paiement-en-ligne'],
  ['?tab=notifications', 'mes-notifications'], ['?tab=notifications&s=notifs', 'mes-notifications'],
  ['?tab=notifications&s=eleves', 'notifications-eleves'], ['?tab=notifications&s=seuils', 'seuils'], ['?tab=notifications&s=anniv', 'notifications-eleves'],
  ['?tab=regles', 'annulation'], ['?tab=regles&s=annulation', 'annulation'], ['?tab=regles&s=metier', 'cas-particuliers'],
  ['?tab=abonnement', 'abonnement'],
];

// Chaque rubrique : un témoin de carte (texte qui n'existe QUE dans sa carte).
const RUBRIQUES = [
  ['profil', 'Profil', 'Mon profil'],
  ['studio', 'Studio & lieux', 'Mes lieux'],
  ['page', 'Ma page', 'Photo de couverture'],
  ['types-cours', 'Types de cours', 'Types de cours'],
  ['essai', "Cours d'essai", 'Mode de validation'],
  ['documents', "Documents d'inscription", "Documents d'inscription"],
  ['integrer', 'Intégrer sur mon site', 'Intègre ton planning'],
  ['facturation', 'Facturation', 'Mention TVA'],
  ['paiement-en-ligne', 'Paiement en ligne', 'Webhook signing secret'],
  ['virement', 'Virement (RIB)', 'Règlement par virement'],
  ['urssaf', 'Déclaration URSSAF', 'Ton régime'],
  ['champs', 'Infos collectées', 'Infos collectées sur tes élèves'],
  ['visibilite', 'Visibilité par défaut', 'Visibilité des cours'],
  ['annulation', 'Annulation', "Règles d'annulation"],
  ['cas-particuliers', 'Cas particuliers', 'Cadre les cas particuliers'],
  ['seuils', "Seuils d'alerte", 'Carnet bientôt épuisé'],
  ['mes-notifications', 'Ce que je reçois', 'Mes notifications'],
  ['notifications-eleves', 'Ce que tes élèves reçoivent', 'Anniversaires'],
  ['abonnement', 'Mon abonnement IziSolo', 'Changer de plan'],
];

let chromium; try { ({ chromium } = await import('playwright')); } catch { ({ chromium } = await import('@playwright/test')); }
let browser; try { browser = await chromium.launch({ channel: 'msedge' }); } catch { browser = await chromium.launch(); }

try {
  const cookies = (await sessionCookies('camille@atelier-soleil.fr')).map(cc => ({ ...cc, url: BASE, sameSite: 'Lax' }));
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 1000 } });
  await ctx.addCookies(cookies);
  const page = await ctx.newPage();
  const erreurs = [];
  page.on('pageerror', e => erreurs.push(String(e).slice(0, 160)));
  const aller = async (url) => { await page.goto(`${BASE}${url}`, { waitUntil: 'domcontentloaded', timeout: 120000 }); };

  // Pré-chauffe : en dev, la première compilation d'une route recharge la page
  // (Fast Refresh) — on visite la liste et une rubrique avant de mesurer.
  await aller('/parametres'); await page.waitForSelector('.rubrique-ligne', { timeout: 120000 });
  await aller('/parametres/profil'); await page.waitForSelector('text=Mon profil', { timeout: 120000 });

  // ── A. Les anciens deep-links ────────────────────────────────────────────
  console.log('\n— A. Les anciens deep-links atterrissent sur la bonne rubrique —');
  for (const [ancien, cible] of ANCIENS) {
    await aller(`/parametres${ancien}`);
    await page.waitForSelector('.parametres-rubrique-titre', { timeout: 60000 }).catch(() => {});
    const path = new URL(page.url()).pathname;
    c(`${ancien} → /parametres/${cible}`, path === `/parametres/${cible}`, path);
  }
  await aller('/parametres?tab=abonnement&abo=success&session_id=cs_test_temoin');
  await page.waitForSelector('text=Mon abonnement IziSolo', { timeout: 60000 });
  await page.waitForTimeout(800);
  const corpsAbo = await page.innerText('body');
  c('le retour Stripe garde abo=success : le toast « Paiement reçu » s\'affiche', corpsAbo.includes('Paiement reçu'));
  c('puis l\'URL est nettoyée (/parametres/abonnement)', new URL(page.url()).pathname === '/parametres/abonnement' && !page.url().includes('abo='));

  // ── B. La liste ──────────────────────────────────────────────────────────
  console.log('\n— B. La liste des rubriques —');
  await aller('/parametres');
  await page.waitForSelector('.rubrique-ligne', { timeout: 60000 });
  await page.screenshot({ path: join(OUT, 'B-liste-desktop.png'), fullPage: true });
  // textContent, pas innerText : le CSS met les titres de groupe en capitales.
  const groupes = await page.locator('.rubriques-groupe-titre').evaluateAll(els => els.map(e => e.textContent.trim()));
  c('six groupes, dans l\'ordre', JSON.stringify(groupes) === JSON.stringify(['Mon studio', 'Ma page publique', 'Argent', 'Élèves & cours', 'Notifications', 'Abonnement IziSolo']), groupes.join(' | '));
  const lignes = await page.locator('.rubrique-ligne').count();
  // 19 rubriques rendues (le démo est Complet, pas Multi : pas d'Équipe ; en France : URSSAF visible)
  c('dix-neuf lignes (Complet, France : pas d\'Équipe, URSSAF présente)', lignes === 19, String(lignes));
  c('aucune barre d\'onglets (les deux niveaux ont disparu)', (await page.locator('.tabs-bar, .subtabs-bar').count()) === 0);
  const resumeFact = await page.locator('[data-rubrique="facturation"] .rubrique-resume').innerText();
  c('le résumé de Facturation dit l\'état (SIRET ou « à renseigner »)', /SIRET/.test(resumeFact), resumeFact);
  const resumeStudio = await page.locator('[data-rubrique="studio"] .rubrique-resume').innerText();
  c('le résumé de Studio & lieux nomme le studio et compte les lieux', /Atelier Soleil/.test(resumeStudio) && /lieu/.test(resumeStudio), resumeStudio);
  const resumeAbo = await page.locator('[data-rubrique="abonnement"] .rubrique-resume').innerText();
  c('le résumé de l\'abonnement nomme le plan', /Complet|Essentiel|Multi|Essai/.test(resumeAbo), resumeAbo);
  // Chaque ligne est réellement cliquable (elementFromPoint) : le piège du FAB feedback.
  const recouvertes = await page.evaluate(() => {
    const out = [];
    for (const a of document.querySelectorAll('.rubrique-ligne')) {
      const r = a.getBoundingClientRect();
      a.scrollIntoView({ block: 'center' });
      const r2 = a.getBoundingClientRect();
      const el = document.elementFromPoint(r2.left + r2.width / 2, r2.top + r2.height / 2);
      if (!el || !a.contains(el)) out.push(a.dataset.rubrique + ' ← ' + (el ? el.tagName + '.' + el.className : 'rien'));
      void r;
    }
    return out;
  });
  c('chaque ligne est cliquable au centre (rien ne la recouvre)', recouvertes.length === 0, recouvertes.join(' ; '));
  await page.click('[data-rubrique="facturation"]');
  await page.waitForSelector('text=Mention TVA', { timeout: 60000 });
  c('un clic sur une ligne ouvre sa rubrique', new URL(page.url()).pathname === '/parametres/facturation');
  c('la colonne de gauche liste les rubriques en compact', (await page.locator('.parametres-aside .rubrique-ligne').count()) === 19);
  c('la ligne courante est marquée active dans la colonne', (await page.locator('.parametres-aside .rubrique-ligne.active[data-rubrique="facturation"]').count()) === 1);
  c('la sidebar de l\'app garde « Paramètres » actif sur une rubrique', (await page.locator('.sidebar-item.active:has-text("Paramètres")').count()) >= 1); // desktop + tiroir mobile
  await page.screenshot({ path: join(OUT, 'B-rubrique-desktop.png'), fullPage: false });

  // ── C. Chaque rubrique ───────────────────────────────────────────────────
  console.log('\n— C. Chaque rubrique rend son titre et ses cartes —');
  for (const [id, titre, temoin] of RUBRIQUES) {
    erreurs.length = 0;
    await aller(`/parametres/${id}`);
    const trouve = await page.waitForSelector(`text=${temoin}`, { timeout: 60000 }).then(() => true).catch(() => false);
    // Le titre se lit APRÈS l'hydratation : en dev, la première compilation
    // d'une route recharge la page (Fast Refresh) et un innerText trop tôt rend ''.
    await page.waitForSelector('.parametres-rubrique-titre', { timeout: 60000 }).catch(() => {});
    const h1 = await page.locator('.parametres-rubrique-titre').innerText().catch(() => '');
    await page.waitForTimeout(300);
    c(`/parametres/${id} : titre « ${titre} » + carte « ${temoin} », sans erreur`, trouve && h1 === titre && erreurs.length === 0, [h1 !== titre ? `h1=${h1}` : '', erreurs[0] || ''].filter(Boolean).join(' ; '));
  }
  const boutons = await page.evaluate(() => Array.from(document.querySelectorAll('button.save-btn')).map(b => b.dataset.carte));
  c('la rubrique Abonnement n\'a aucun bouton Enregistrer (rien à écrire)', boutons.length === 0);
  await aller('/parametres/seuils');
  await page.waitForSelector('text=Carnet bientôt épuisé', { timeout: 60000 });
  // Lot 2 : la seconde carte est repliée, son bouton n'existe qu'ouverte.
  await page.click('[data-carte-reglage="seuils_prof"] .carte-reglage-entete');
  await page.waitForSelector('button.save-btn[data-carte="seuils_prof"]', { timeout: 20000 });
  const boutonsSeuils = await page.evaluate(() => Array.from(document.querySelectorAll('button.save-btn')).map(b => b.dataset.carte).sort());
  c('Seuils d\'alerte réunit les deux cartes (seuils + seuils_prof)', JSON.stringify(boutonsSeuils) === JSON.stringify(['seuils', 'seuils_prof']), boutonsSeuils.join(','));

  // ── D. Le save par carte ─────────────────────────────────────────────────
  console.log('\n— D. Le save par carte écrit SES colonnes, et rien d\'autre —');
  const { data: avant } = await svc.from('profiles').select('*').eq('id', demo.id).single();
  await aller('/parametres/studio');
  await page.waitForSelector('text=Mes lieux', { timeout: 60000 });
  await page.waitForTimeout(700); // hydratation
  const VILLE_TEMOIN = 'Bordeaux (témoin structure)';
  const inputVille = page.locator('.section:has-text("Mon activité") input.izi-input').nth(1);
  await inputVille.fill(VILLE_TEMOIN);
  const btn = page.locator('button.save-btn[data-carte="activite"]');
  c('le bouton Enregistrer de la carte s\'allume à la modification', await btn.isEnabled());
  c('celui d\'aucune autre carte ne bouge (une seule carte modifiée)', (await page.locator('button.save-btn:enabled').count()) === 1);
  await Promise.all([
    page.waitForResponse(r => r.url().includes('/rest/v1/profiles') && r.request().method() === 'PATCH', { timeout: 45000 }),
    btn.click(),
  ]);
  await page.waitForTimeout(600);
  const { data: apres } = await svc.from('profiles').select('*').eq('id', demo.id).single();
  c('la ville est écrite EN BASE', apres.ville === VILLE_TEMOIN, apres.ville);
  const diff = Object.keys(avant).filter(k => k !== 'ville' && k !== 'updated_at' && JSON.stringify(avant[k]) !== JSON.stringify(apres[k]));
  c('aucune autre colonne n\'a bougé', diff.length === 0, diff.join(','));
  await restaurer();
  c('bouton grisé après enregistrement', !(await btn.isEnabled()));

  // ── E. Mobile ────────────────────────────────────────────────────────────
  console.log('\n— E. Mobile 390 : rien ne déborde, le retour est là —');
  const ctxM = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, deviceScaleFactor: 1 });
  await ctxM.addCookies(cookies);
  const pm = await ctxM.newPage();
  const errM = [];
  pm.on('pageerror', e => errM.push(String(e).slice(0, 160)));
  const deborde = async () => pm.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
  await pm.goto(`${BASE}/parametres`, { waitUntil: 'domcontentloaded', timeout: 120000 });
  await pm.waitForSelector('.rubrique-ligne', { timeout: 60000 });
  c('la liste ne déborde pas horizontalement', !(await deborde()));
  c('les résumés sont visibles sur mobile', (await pm.locator('.rubrique-resume').count()) >= 15);
  await pm.screenshot({ path: join(OUT, 'E-liste-mobile.png'), fullPage: true });
  for (const id of ['page', 'facturation', 'types-cours', 'mes-notifications']) {
    await pm.goto(`${BASE}/parametres/${id}`, { waitUntil: 'domcontentloaded', timeout: 120000 });
    await pm.waitForSelector('.parametres-rubrique-titre', { timeout: 60000 });
    await pm.waitForTimeout(500);
    const retourVisible = await pm.locator('.parametres-retour-mobile').isVisible();
    const asideVisible = await pm.locator('.parametres-aside').isVisible().catch(() => false);
    c(`/parametres/${id} sur mobile : pas de débordement, lien de retour visible, colonne cachée`, !(await deborde()) && retourVisible && !asideVisible);
  }
  await pm.screenshot({ path: join(OUT, 'E-rubrique-mobile.png'), fullPage: false });
  await pm.click('.parametres-retour-mobile');
  await pm.waitForSelector('.rubrique-ligne', { timeout: 60000 });
  c('le lien de retour ramène à la liste', new URL(pm.url()).pathname === '/parametres');
  c('aucune erreur de page sur mobile', errM.length === 0, errM[0] || '');
  await ctxM.close();

  // ── F. Les retraits ──────────────────────────────────────────────────────
  console.log('\n— F. 404, Intégrer sorti de Ma page, SMS retiré —');
  const rep = await page.goto(`${BASE}/parametres/rubrique-inexistante`, { waitUntil: 'domcontentloaded', timeout: 120000 });
  c('une rubrique inconnue rend un vrai 404', rep?.status() === 404, String(rep?.status()));
  await aller('/parametres/page');
  await page.waitForSelector('text=Photo de couverture', { timeout: 60000 });
  const corpsPage = await page.evaluate(() => document.querySelector('.parametres-main')?.innerText || '');
  c('Ma page ne porte plus le code d\'intégration ni le QR', !corpsPage.includes('widget.js') && !corpsPage.includes('QR code'));
  c('Ma page garde « Voir l\'aperçu »', corpsPage.includes("Voir l'aperçu"));
  await aller('/parametres/integrer');
  await page.waitForSelector('text=Intègre ton planning', { timeout: 60000 });
  const corpsInt = await page.evaluate(() => document.querySelector('.parametres-main')?.innerText || '');
  c('Intégrer sur mon site porte les deux blocs de code et le QR', corpsInt.includes('widget.js') && corpsInt.includes('Et tes offres') && corpsInt.includes('QR code'));
  await aller('/parametres/notifications-eleves');
  await page.waitForSelector('text=Anniversaires', { timeout: 60000 });
  const corpsNotif = await page.evaluate(() => document.querySelector('.parametres-main')?.innerText || '');
  c('le bloc SMS a disparu des notifications élèves', !/SMS/.test(corpsNotif));
  c('les quatre emails automatiques sont toujours réglables', (await page.locator('.notifs-table tbody tr').count()) === 4);

  await ctx.close();
} catch (e) {
  ko++;
  console.log('  KO  exception : ' + (e?.stack || e).toString().slice(0, 400));
} finally {
  await restaurer();
  await browser.close();
}

console.log(`\n${ok} OK / ${ko} KO — ville du démo restaurée (« ${VILLE_AVANT} »)`);
process.exit(ko ? 1 : 0);
