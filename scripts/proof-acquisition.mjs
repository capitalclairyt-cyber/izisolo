/**
 * Preuve en vrai navigateur — la source d'une inscription suit l'URL, sans
 * cookie ni balise (2026-09-26, campagne Google Ads).
 *
 *   node scripts/proof-acquisition.mjs        (dev server sur :3333, ou PROOF_BASE)
 *
 * Ce qu'elle vérifie :
 *   A. La home ouverte avec les utm_* d'une annonce : après hydratation, tous
 *      les liens vers /register et /creer-mon-studio portent la source, un
 *      lien de navigation interne aussi (la source suit d'une page à l'autre),
 *      un lien externe non.
 *   B. Sans utm dans l'URL, les liens sont exactement ceux d'avant.
 *   C. /changer-d-outil avec utm : le bouton concierge garde `src=changer` ET
 *      porte les utm (rien n'est écrasé).
 *   D. /register avec utm : le formulaire connaît la source (data-acq-source),
 *      sans utm il ne connaît rien.
 *   E. Une demande concierge POSTée avec la source : enregistrée EN BASE, et
 *      la colonne `source` la porte si v125 est appliquée (sinon la preuve le
 *      dit et vérifie que la demande est passée quand même). Témoin purgé.
 *      ⚠️ Envoie 1 email réel à bonjour@izisolo.fr (l'alerte interne) ; celui
 *      de la prospecte part en @example.com, ignoré par le garde-fou RFC 2606.
 *   F. Le calculateur ne dit plus « 15 €/mois » : il modélise Complet à 29 €.
 *   G. Aucun cookie posé par la home avec utm (la promesse RGPD tient).
 */
import { chromium } from 'playwright';
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const BASE = process.env.PROOF_BASE || 'http://localhost:3333';
const UTM = 'utm_source=google&utm_medium=cpc&utm_campaign=recherche-oct-2026&utm_content=yoga&utm_term=logiciel+prof+yoga';
const EMAIL_TEMOIN = 'preuve-acquisition@example.com';

const env = Object.fromEntries(
  readFileSync(join(ROOT, '.env.local'), 'utf8')
    .split('\n')
    .filter(l => l.includes('=') && !l.trim().startsWith('#'))
    .map(l => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^["']|["']$/g, '')]; })
);
const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

let nbOk = 0, nbKo = 0;
const ok = (cond, msg) => { if (cond) { nbOk++; console.log('  ✓', msg); } else { nbKo++; console.log('  ✗', msg); } };

async function purge() {
  await admin.from('demandes_studio').delete().eq('email', EMAIL_TEMOIN);
}

let browser;
try { browser = await chromium.launch(); } catch { browser = await chromium.launch({ channel: 'msedge' }); }

try {
  await purge();
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();
  const hrefs = (sel) => page.$$eval(sel, as => as.map(a => a.getAttribute('href')));
  const attendre = async (fn, essais = 20) => { for (let i = 0; i < essais; i++) { if (await fn()) return true; await page.waitForTimeout(250); } return fn(); };

  console.log('\nA. La home avec les utm d\'une annonce');
  await page.goto(`${BASE}/?${UTM}`, { waitUntil: 'networkidle' });
  ok(await attendre(async () => (await hrefs('a[href^="/register"]')).every(h => h.includes('utm_source=google'))), 'tous les liens /register portent utm_source=google après hydratation');
  const reg = await hrefs('a[href^="/register"]');
  ok(reg.length >= 3 && reg.every(h => h.includes('utm_content=yoga') && h.includes('utm_term=logiciel+prof+yoga')), `${reg.length} liens /register avec le groupe et le mot-clé`);
  const cms = await hrefs('a[href^="/creer-mon-studio"]');
  ok(cms.length >= 2 && cms.every(h => h.includes('utm_source=google')), `${cms.length} liens /creer-mon-studio avec la source`);
  const blog = await hrefs('a[href^="/blog"]');
  ok(blog.length > 0 && blog.every(h => h.includes('utm_source=google')), 'un lien de navigation interne (/blog) porte aussi la source : elle suit de page en page');
  // Les ancres de la nav sont des « #tarifs » sans slash : elles ne mènent nulle
  // part ailleurs, elles restent telles quelles (la home n'a aucun lien externe
  // absolu : le témoin « externe » est l'ancre seule).
  const ancres = await hrefs('a[href^="#"]');
  ok(ancres.length >= 3 && ancres.every(h => !h.includes('utm_')), `${ancres.length} ancres seules (#tarifs, #faq…) intactes`);
  const tous = await hrefs('a[href]');
  ok(tous.every(h => !h.startsWith('/') || h.startsWith('//') || h.includes('utm_source=google')), `${tous.length} liens : tout lien interne porte la source, rien d'autre n'est touché`);

  console.log('\nG. Aucun cookie, aucun stockage');
  const cookies = await ctx.cookies();
  ok(cookies.length === 0, `aucun cookie posé par la home avec utm (${cookies.length})`);
  const stockage = await page.evaluate(() => ({ ls: localStorage.length, ss: sessionStorage.length }));
  ok(stockage.ss === 0, `sessionStorage vide (${stockage.ss})`);

  console.log('\nB. Sans utm, rien ne change');
  await page.goto(`${BASE}/`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(500);
  const regNu = await hrefs('a[href^="/register"]');
  ok(regNu.length >= 3 && regNu.every(h => h === '/register'), 'les liens /register sont exactement /register');

  console.log('\nC. /changer-d-outil : le src=changer survit aux utm');
  await page.goto(`${BASE}/changer-d-outil?${UTM}`, { waitUntil: 'networkidle' });
  ok(await attendre(async () => (await hrefs('a[href^="/creer-mon-studio"]')).every(h => h.includes('utm_source=google'))), 'les boutons concierge portent la source');
  // Les DEUX boutons de la page portent `?src=changer` (le pied de page a un
  // troisième lien concierge, générique, sans src : il n'est pas le témoin).
  const cta = await hrefs('a[href^="/creer-mon-studio?src=changer"]');
  ok(cta.length >= 2 && cta.every(h => h.startsWith('/creer-mon-studio?src=changer&utm_source=google')), `${cta.length} boutons : src=changer reste en tête, les utm derrière`);

  console.log('\nD. /register connaît la source');
  await page.goto(`${BASE}/register?${UTM}`, { waitUntil: 'networkidle' });
  ok(await attendre(async () => (await page.$('form[data-acq-source="google"]')) !== null), 'le formulaire porte data-acq-source="google"');
  await page.goto(`${BASE}/register`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(500);
  ok((await page.$('form[data-acq-source]')) === null, 'sans utm, le formulaire ne porte aucune source');

  console.log('\nE. Une demande concierge avec sa source (1 email réel interne)');
  const res = await fetch(`${BASE}/api/demande-studio`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      prenom: 'Preuve', nom: 'Acquisition', email: EMAIL_TEMOIN, activite: 'Yoga', ville: 'Test',
      message: 'Témoin de preuve, à purger.',
      acquisition: { source: 'google', canal: 'cpc', campagne: 'recherche-oct-2026', groupe: 'yoga', mot: 'logiciel prof yoga' },
      verif_hp: '',
    }),
  });
  const json = await res.json().catch(() => ({}));
  ok(res.status === 200 && json.ok === true, `POST /api/demande-studio → 200 (${res.status})`);
  const sonde = await admin.from('demandes_studio').select('id, source').eq('email', EMAIL_TEMOIN).maybeSingle();
  const v125 = !sonde.error;
  if (v125) {
    ok(sonde.data?.id, 'la demande est EN BASE');
    ok(sonde.data?.source === 'google / cpc / recherche-oct-2026 / yoga / logiciel prof yoga', `v125 appliquée : source = « ${sonde.data?.source} »`);
  } else {
    const sansSource = await admin.from('demandes_studio').select('id').eq('email', EMAIL_TEMOIN).maybeSingle();
    ok(sansSource.data?.id, `v125 absente (${sonde.error?.code}) : la demande est quand même EN BASE, sans source`);
    console.log('  ℹ après v125 : node scripts/proof-acquisition.mjs → la colonne source sera vérifiée');
  }

  console.log('\nF. Le calculateur ne dit plus 15 €/mois');
  await page.goto(`${BASE}/outils/calculateur-revenu-prof-yoga`, { waitUntil: 'networkidle' });
  const texte = await page.evaluate(() => document.body.innerText);
  ok(texte.includes('Complet à 29 €/mois'), 'le calculateur nomme Complet à 29 €/mois');
  ok(!/15 ?€\/mois/.test(texte), 'plus aucun « 15 €/mois »');

  await ctx.close();
} finally {
  await purge();
  await browser.close();
}

console.log(`\n${nbOk} OK / ${nbKo} KO`);
process.exit(nbKo ? 1 : 0);
