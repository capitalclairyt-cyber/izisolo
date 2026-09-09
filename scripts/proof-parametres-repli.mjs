/**
 * PREUVE — Lot 2 « Paramètres qui respirent » : le repli (2026-09-09).
 *
 * Le lot qui répond à « ça fait beaucoup trop impressionnant et fouilli » :
 * des cartes fermées par défaut avec un résumé d'état, une ligne d'aide par
 * champ (le reste derrière « En savoir plus »), Ma page en trois cartes,
 * Types de cours en lignes, Cours d'essai qui ne montre le prix que s'il
 * est payant, Abonnement replié.
 *
 * Vrai navigateur (dev :3333, PROOF_BASE pour un autre port), session prof
 * démo Atelier Soleil :
 *   A. MESURE : la hauteur fermée et le nombre de mots de chaque rubrique,
 *      comparés au relevé fait AVANT le lot 2 (même méthode, même démo) —
 *      aucune rubrique au-dessus de 1 400 px sur desktop et 2 000 px sur
 *      mobile, et les rubriques lourdes perdent au moins un tiers de leurs
 *      mots.
 *   B. Le repli ne cache rien : chaque carte repliée porte un résumé qui dit
 *      l'état réel (lu EN BASE), s'ouvre au clic, et montre les valeurs déjà
 *      enregistrées — jamais un champ vide fantôme.
 *   C. Le repli ne casse rien : un champ modifié dans une carte repliée
 *      (« Aller plus loin ») s'enregistre EN BASE avec ses seules colonnes.
 *   D. Types de cours : huit lignes, aucune couleur avant le clic, cinq
 *      couleurs et le dépôt de photo après.
 *   E. Cours d'essai : le prix disparaît en « Gratuit », revient en payant ;
 *      la grille par type n'apparaît que sur demande.
 *   F. Abonnement : les cartes de plans n'apparaissent qu'en ouvrant
 *      « Changer de plan » (le démo est abonné) ; le détail du plan est replié.
 *
 * Re-runnable : la philosophie et le mode d'essai du démo sont restaurés même
 * en cas d'échec.
 */
import { createClient } from '@supabase/supabase-js';
import { readFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

const BASE = process.env.PROOF_BASE || 'http://localhost:3333';
const OUT = join(process.cwd(), 'docs', 'proof-parametres-repli');
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
const AVANT = { philosophie: demo.philosophie, essai_paiement: demo.essai_paiement, essai_prix_par_type: demo.essai_prix_par_type };
const restaurer = async () => { await svc.from('profiles').update(AVANT).eq('id', demo.id); };

// Relevé AVANT le lot 2 (2026-09-09, même méthode : hauteur de .parametres-main
// et mots de son innerText, desktop 1280 / mobile 390, démo Atelier Soleil).
const AVANT_LOT2 = {
  profil: { desktop: { h: 607, mots: 31 }, mobile: { h: 763, mots: 32 } },
  studio: { desktop: { h: 728, mots: 71 }, mobile: { h: 912, mots: 72 } },
  page: { desktop: { h: 2276, mots: 332 }, mobile: { h: 2646, mots: 333 } },
  'types-cours': { desktop: { h: 1585, mots: 173 }, mobile: { h: 1844, mots: 174 } },
  essai: { desktop: { h: 1686, mots: 165 }, mobile: { h: 1898, mots: 166 } },
  documents: { desktop: { h: 386, mots: 61 }, mobile: { h: 518, mots: 62 } },
  integrer: { desktop: { h: 1214, mots: 327 }, mobile: { h: 1902, mots: 328 } },
  facturation: { desktop: { h: 948, mots: 192 }, mobile: { h: 1277, mots: 193 } },
  'paiement-en-ligne': { desktop: { h: 739, mots: 160 }, mobile: { h: 1076, mots: 161 } },
  virement: { desktop: { h: 781, mots: 163 }, mobile: { h: 1076, mots: 164 } },
  urssaf: { desktop: { h: 790, mots: 177 }, mobile: { h: 1208, mots: 178 } },
  champs: { desktop: { h: 833, mots: 99 }, mobile: { h: 935, mots: 100 } },
  visibilite: { desktop: { h: 649, mots: 125 }, mobile: { h: 836, mots: 126 } },
  annulation: { desktop: { h: 632, mots: 118 }, mobile: { h: 1007, mots: 119 } },
  'cas-particuliers': { desktop: { h: 843, mots: 178 }, mobile: { h: 1270, mots: 179 } },
  seuils: { desktop: { h: 760, mots: 167 }, mobile: { h: 1103, mots: 168 } },
  'mes-notifications': { desktop: { h: 1184, mots: 200 }, mobile: { h: 1503, mots: 201 } },
  'notifications-eleves': { desktop: { h: 1012, mots: 162 }, mobile: { h: 1313, mots: 163 } },
  abonnement: { desktop: { h: 1950, mots: 398 }, mobile: { h: 2883, mots: 399 } },
};
// Les rubriques où la prose était le fouilli : au moins un tiers de mots en moins.
const LOURDES = ['page', 'integrer', 'abonnement', 'essai', 'types-cours', 'seuils', 'notifications-eleves', 'visibilite', 'documents'];
// Les formulaires d'argent (facturation, virement, URSSAF) sont faits de libellés
// et d'options plus que de prose : au moins un sixième de mots en moins.
const FORMULAIRES = ['facturation', 'virement', 'urssaf', 'annulation', 'cas-particuliers']; // « Infos collectées » est une liste de champs, pas de la prose : elle ne doit juste pas grandir
const PLAFOND = { desktop: 1400, mobile: 2000 };

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

const mesurer = (page) => page.evaluate(() => {
  const el = document.querySelector('.parametres-main');
  return { h: el.scrollHeight, mots: (el.innerText || '').split(/\s+/).filter(Boolean).length };
});

let chromium; try { ({ chromium } = await import('playwright')); } catch { ({ chromium } = await import('@playwright/test')); }
let browser; try { browser = await chromium.launch({ channel: 'msedge' }); } catch { browser = await chromium.launch(); }

try {
  const cookies = (await sessionCookies('camille@atelier-soleil.fr')).map(cc => ({ ...cc, url: BASE, sameSite: 'Lax' }));
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 1000 } });
  await ctx.addCookies(cookies);
  const page = await ctx.newPage();
  const erreurs = [];
  page.on('pageerror', e => erreurs.push(String(e).slice(0, 160)));
  const aller = async (id) => {
    await page.goto(`${BASE}/parametres/${id}`, { waitUntil: 'domcontentloaded', timeout: 120000 });
    await page.waitForSelector('.parametres-main .section, .parametres-main .rm-tab', { timeout: 90000 });
    await page.waitForTimeout(900);
  };
  // Pré-chauffe (Fast Refresh à la première compilation d'une route en dev).
  for (const id of Object.keys(AVANT_LOT2)) await aller(id);

  // ── A. Mesure ────────────────────────────────────────────────────────────
  console.log('\n— A. Hauteur fermée et mots, rubrique par rubrique (desktop 1280) —');
  const apres = {};
  for (const id of Object.keys(AVANT_LOT2)) {
    await aller(id);
    apres[id] = { desktop: await mesurer(page) };
  }
  const ctxM = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, deviceScaleFactor: 1 });
  await ctxM.addCookies(cookies);
  const pm = await ctxM.newPage();
  for (const id of Object.keys(AVANT_LOT2)) {
    await pm.goto(`${BASE}/parametres/${id}`, { waitUntil: 'domcontentloaded', timeout: 120000 });
    await pm.waitForSelector('.parametres-main .section, .parametres-main .rm-tab', { timeout: 90000 });
    await pm.waitForTimeout(700);
    apres[id].mobile = await mesurer(pm);
  }
  await ctxM.close();
  console.log('  rubrique                 desktop av→ap px   mots av→ap   mobile av→ap px');
  for (const id of Object.keys(AVANT_LOT2)) {
    const a = AVANT_LOT2[id], b = apres[id];
    console.log(`  ${id.padEnd(22)} ${String(a.desktop.h).padStart(5)} → ${String(b.desktop.h).padStart(5)}      ${String(a.desktop.mots).padStart(3)} → ${String(b.desktop.mots).padStart(3)}      ${String(a.mobile.h).padStart(5)} → ${String(b.mobile.h).padStart(5)}`);
  }
  const depassentD = Object.keys(apres).filter(id => apres[id].desktop.h > PLAFOND.desktop);
  const depassentM = Object.keys(apres).filter(id => apres[id].mobile.h > PLAFOND.mobile);
  c(`aucune rubrique au-dessus de ${PLAFOND.desktop} px fermée sur desktop`, depassentD.length === 0, depassentD.join(', '));
  c(`aucune rubrique au-dessus de ${PLAFOND.mobile} px fermée sur mobile`, depassentM.length === 0, depassentM.join(', '));
  const pasAssez = LOURDES.filter(id => apres[id].desktop.mots > AVANT_LOT2[id].desktop.mots * (2 / 3));
  c('les rubriques lourdes ont perdu au moins un tiers de leurs mots', pasAssez.length === 0, pasAssez.map(id => `${id} ${AVANT_LOT2[id].desktop.mots}→${apres[id].desktop.mots}`).join(', '));
  const pasAssezF = FORMULAIRES.filter(id => apres[id].desktop.mots > AVANT_LOT2[id].desktop.mots * (5 / 6));
  c('les formulaires ont perdu au moins un sixième de leurs mots', pasAssezF.length === 0, pasAssezF.map(id => `${id} ${AVANT_LOT2[id].desktop.mots}→${apres[id].desktop.mots}`).join(', '));
  const totalAv = Object.values(AVANT_LOT2).reduce((n, v) => n + v.desktop.mots, 0);
  const totalAp = Object.values(apres).reduce((n, v) => n + v.desktop.mots, 0);
  c(`au total, les 19 rubriques passent de ${totalAv} à ${totalAp} mots (au moins un tiers de moins)`, totalAp <= totalAv * (2 / 3));
  const plusHautes = Object.keys(apres).filter(id => apres[id].desktop.h > AVANT_LOT2[id].desktop.h + 40);
  c('aucune rubrique n\'a grandi', plusHautes.length === 0, plusHautes.join(', '));

  // ── B. Le repli ne cache rien ────────────────────────────────────────────
  console.log('\n— B. Chaque carte repliée dit son état, s\'ouvre, et montre ce qui est enregistré —');
  const { data: lieux } = await svc.from('lieux').select('nom').eq('profile_id', demo.id).order('ordre');
  await aller('studio');
  const carteLieux = page.locator('[data-carte-reglage="lieux"]');
  c('la carte Lieux est repliée à l\'arrivée', await carteLieux.evaluate(el => el.classList.contains('fermee')));
  const resumeLieux = await carteLieux.locator('.carte-reglage-resume').innerText();
  c('son résumé compte les lieux et les nomme (lu en base)', resumeLieux.startsWith(`${lieux.length} lieu`) && lieux.every(l => resumeLieux.includes(l.nom)), resumeLieux);
  await carteLieux.locator('.carte-reglage-entete').click();
  await page.waitForSelector('[data-carte-reglage="lieux"] .lieu-card', { timeout: 20000 });
  c('ouverte, elle liste chaque lieu enregistré', (await page.locator('[data-carte-reglage="lieux"] .lieu-card').count()) === lieux.length);
  await carteLieux.locator('.carte-reglage-entete').click();
  await page.waitForTimeout(200);
  c('un second clic la referme', await carteLieux.evaluate(el => el.classList.contains('fermee')));

  await aller('page');
  const cartesPage = await page.locator('.parametres-main .carte-reglage').evaluateAll(els => els.map(e => [e.dataset.carteReglage, e.classList.contains('ouverte')]));
  c('Ma page = trois cartes : l\'essentiel ouvert, « Ce que ta page montre » et « Aller plus loin » repliées', JSON.stringify(cartesPage) === JSON.stringify([['page', true], ['page_affichage', false], ['page_plus', false]]), JSON.stringify(cartesPage));
  const resumeAffichage = await page.locator('[data-carte-reglage="page_affichage"] .carte-reglage-resume').innerText();
  const attenduAffichage = `${demo.afficher_horaires === true ? 'horaires affichés' : 'horaires masqués'} · ${demo.afficher_tarifs === true ? 'tarifs affichés' : 'tarifs masqués'}`;
  c('le résumé de « Ce que ta page montre » dit l\'état réel des interrupteurs', resumeAffichage.startsWith(attenduAffichage), resumeAffichage);
  c('un seul bouton Enregistrer pour Ma page, hors des cartes', (await page.locator('.parametres-main > button.save-btn[data-carte="page"]').count()) === 1 && (await page.locator('.carte-reglage button.save-btn').count()) === 0);
  c('les explications longues sont derrière « En savoir plus »', (await page.locator('.parametres-main details.ensavoir').count()) >= 1);
  await page.click('[data-carte-reglage="page_plus"] .carte-reglage-entete');
  await page.waitForSelector('text=Ma philosophie', { timeout: 20000 });
  const philoAffichee = await page.locator('[data-carte-reglage="page_plus"] textarea[maxlength="600"]').inputValue();
  c('« Aller plus loin » ouvert montre la philosophie déjà enregistrée', philoAffichee === (demo.philosophie || ''), philoAffichee.slice(0, 40));

  await aller('notifications-eleves');
  c('Anniversaires est repliée avec son état', await page.locator('[data-carte-reglage="anniv"].fermee .carte-reglage-resume').innerText() === ((demo.anniversaire_mode || 'semi') !== 'off' ? 'Activé · message prêt' : 'Désactivé'));
  await page.click('[data-carte-reglage="anniv"] .carte-reglage-entete');
  await page.waitForSelector('[data-carte-reglage="anniv"] textarea', { timeout: 20000 });
  const messageAnniv = await page.locator('[data-carte-reglage="anniv"] textarea').inputValue();
  c('ouverte, elle montre le message d\'anniversaire enregistré', messageAnniv.length > 10 && (!demo.anniversaire_message || messageAnniv === demo.anniversaire_message));

  await aller('seuils');
  c('« Paiement en attente » est repliée avec son seuil', (await page.locator('[data-carte-reglage="seuils_prof"].fermee .carte-reglage-resume').innerText()) === `après ${demo.alerte_paiement_attente_jours || 14} jours d'attente`);
  await page.screenshot({ path: join(OUT, 'B-page-desktop.png'), fullPage: true });

  // ── C. Le repli ne casse pas le save ─────────────────────────────────────
  console.log('\n— C. Un champ modifié dans une carte repliée s\'enregistre, avec ses seules colonnes —');
  await aller('page');
  await page.click('[data-carte-reglage="page_plus"] .carte-reglage-entete');
  await page.waitForSelector('[data-carte-reglage="page_plus"] textarea[maxlength="600"]', { timeout: 20000 });
  const { data: avantSave } = await svc.from('profiles').select('*').eq('id', demo.id).single();
  const PHILO = 'Philosophie témoin du repli (lot 2).';
  await page.locator('[data-carte-reglage="page_plus"] textarea[maxlength="600"]').fill(PHILO);
  const btn = page.locator('button.save-btn[data-carte="page"]');
  c('le bouton Enregistrer de Ma page s\'allume', await btn.isEnabled());
  await Promise.all([
    page.waitForResponse(r => r.url().includes('/rest/v1/profiles') && r.request().method() === 'PATCH', { timeout: 45000 }),
    btn.click(),
  ]);
  await page.waitForTimeout(600);
  const { data: apresSave } = await svc.from('profiles').select('*').eq('id', demo.id).single();
  c('la philosophie est écrite EN BASE', apresSave.philosophie === PHILO);
  const diff = Object.keys(avantSave).filter(k => !['philosophie', 'updated_at'].includes(k) && JSON.stringify(avantSave[k]) !== JSON.stringify(apresSave[k]));
  c('aucune colonne hors de la carte page n\'a bougé', diff.length === 0, diff.join(','));
  await svc.from('profiles').update({ philosophie: AVANT.philosophie }).eq('id', demo.id);

  // ── D. Types de cours en lignes ──────────────────────────────────────────
  console.log('\n— D. Types de cours : des lignes, les couleurs à un clic —');
  await aller('types-cours');
  const nbLignes = await page.locator('.tc-ligne').count();
  c('une ligne par type', nbLignes >= 5, String(nbLignes));
  c('aucune pastille de couleur rendue avant le clic', (await page.locator('.tc-pastille').count()) === 0);
  c('chaque ligne montre sa couleur en vigueur (point coloré) et son nom', (await page.locator('.tc-ligne .tc-point').count()) === nbLignes && (await page.locator('.tc-ligne .tc-nom').count()) === nbLignes);
  await page.locator('.tc-ligne .tc-entete').first().click();
  await page.waitForSelector('.tc-ligne.ouverte .tc-pastille', { timeout: 20000 });
  c('la ligne cliquée propose les cinq couleurs et le dépôt de photo', (await page.locator('.tc-ligne.ouverte .tc-pastille').count()) === 5 && (await page.locator('.tc-ligne.ouverte .photo-uploader').count()) === 1);
  c('les autres lignes restent repliées', (await page.locator('.tc-ligne.ouverte').count()) === 1);
  await page.screenshot({ path: join(OUT, 'D-types-cours.png'), fullPage: true });

  // ── E. Cours d'essai conditionnel ────────────────────────────────────────
  console.log('\n— E. Cours d\'essai : le prix n\'apparaît que s\'il est payant —');
  await svc.from('profiles').update({ essai_paiement: 'gratuit', essai_prix_par_type: null }).eq('id', demo.id);
  await aller('essai');
  c('en « Gratuit », aucun champ de prix', (await page.locator('text=Prix du cours d\'essai').count()) === 0);
  await page.click('label.essai-radio-opt:has-text("Payant sur place")');
  await page.waitForSelector('text=Prix du cours d\'essai', { timeout: 20000 });
  c('en « Payant sur place », le prix apparaît', true);
  c('la grille par type n\'apparaît que sur demande', (await page.locator('.essai-type-row').count()) === 0 && (await page.locator('button.essai-lien').count()) === 1);
  await page.click('button.essai-lien');
  await page.waitForSelector('.essai-type-row', { timeout: 20000 });
  c('… et liste alors les types du studio', (await page.locator('.essai-type-row').count()) >= 5);
  await svc.from('profiles').update({ essai_paiement: AVANT.essai_paiement, essai_prix_par_type: AVANT.essai_prix_par_type }).eq('id', demo.id);

  // ── F. Abonnement replié ─────────────────────────────────────────────────
  console.log('\n— F. Abonnement : les cartes de plans n\'apparaissent qu\'en le demandant —');
  await aller('abonnement');
  c('le plan actuel est ouvert et « Changer de plan » repliée (le démo est abonné)', (await page.locator('[data-carte-reglage="plan_actuel"].ouverte').count()) === 1 && (await page.locator('[data-carte-reglage="changer_plan"].fermee').count()) === 1);
  c('aucune carte de plan rendue avant le clic', (await page.locator('.plan-card').count()) === 0);
  c('le détail des capacités est derrière « Ce que ton plan comprend »', (await page.locator('details.ensavoir summary:has-text("Ce que ton plan comprend")').count()) === 1 && !(await page.locator('.abo-feature').first().isVisible().catch(() => false)));
  await page.click('[data-carte-reglage="changer_plan"] .carte-reglage-entete');
  await page.waitForSelector('.plan-card', { timeout: 20000 });
  c('ouverte, « Changer de plan » montre les trois plans', (await page.locator('.plan-card').count()) === 3);
  c('aucune erreur de page sur tout le parcours', erreurs.length === 0, erreurs[0] || '');
  await page.screenshot({ path: join(OUT, 'F-abonnement.png'), fullPage: true });

  await ctx.close();
} catch (e) {
  ko++;
  console.log('  KO  exception : ' + (e?.stack || e).toString().slice(0, 400));
} finally {
  await restaurer();
  await browser.close();
}

console.log(`\n${ok} OK / ${ko} KO — philosophie et essai du démo restaurés`);
process.exit(ko ? 1 : 0);
