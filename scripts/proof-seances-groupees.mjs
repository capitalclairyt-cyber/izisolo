/**
 * Preuve — replier les séances identiques d'une journée (2026-08-25).
 *
 * Déclencheur : le portail de Melyflow. Elle n'enseigne QUE le samedi, et sa
 * rentrée compte cinq « Cours découverte » au même endroit, au même prix, à
 * cinq heures différentes. Cinq cartes empilées donnaient l'impression d'un
 * planning brouillon alors qu'elle propose simplement plusieurs horaires.
 *
 * Ce qu'on prouve, sur le VRAI portail, en vrai navigateur :
 *   A. Cinq séances jumelles deviennent UNE carte.
 *   B. Le pli ne cache pas l'offre : les cinq horaires sont lisibles SANS
 *      déplier (sinon on paierait la mise en page en réservations perdues).
 *   C. Déplier rend les cinq créneaux, chacun avec son propre lien vers SA
 *      séance — le pli n'enlève rien de réservable.
 *   D. La carte tient sur un mobile (mesuré : largeur du bloc titre non nulle,
 *      zéro débordement horizontal) — le premier essai laissait au titre une
 *      colonne de 0 px en vue semaine, et ça ne se voyait pas dans le texte.
 *   E. Une séance ANNULÉE garde sa propre carte : jamais derrière un chevron.
 *   F. Un cours au tarif différent n'est PAS replié avec les autres.
 *   G. Une journée aux cours variés (le démo) ne change pas d'un pixel.
 *   H. Ménage : séances témoins purgées, MÊME en cas d'échec.
 *
 * Usage : node scripts/proof-seances-groupees.mjs
 * Prérequis : dev server sur :3333.
 */
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = process.cwd();
const PORT = 3333;
// Le démo VISUELS : c'est le seul qui porte un planning fourni, donc le seul
// où la non-régression « une journée variée ne bouge pas » veut dire quelque
// chose. Le portail étant public, aucune session n'est nécessaire — on résout
// le studio par son slug, pas par un compte auth.
const SLUG = 'atelier-soleil';

const env = Object.fromEntries(
  readFileSync(join(ROOT, '.env.local'), 'utf8')
    .split('\n').filter(l => l.includes('=') && !l.startsWith('#'))
    .map(l => [l.slice(0, l.indexOf('=')).trim(), l.slice(l.indexOf('=') + 1).trim()])
);
const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

let ok = 0, ko = 0;
const check = (cond, label, detail = '') => {
  if (cond) { ok++; console.log(`  OK  ${label}${detail ? ` — ${detail}` : ''}`); }
  else { ko++; console.log(`  KO  ${label}${detail ? ` — ${detail}` : ''}`); }
};
const attendre = ms => new Promise(r => setTimeout(r, ms));

for (let i = 0; i < 90; i++) {
  try { const r = await fetch(`http://localhost:${PORT}/login`); if (r.ok) break; } catch { /* pas prêt */ }
  await attendre(2000);
  if (i === 89) { console.error(`dev server injoignable sur :${PORT}`); process.exit(1); }
}
console.log('dev server pret\n');

const { data: profil, error: eProfil } = await admin.from('profiles')
  .select('id, studio_nom').eq('studio_slug', SLUG).maybeSingle();
if (eProfil || !profil) { console.error(`studio /p/${SLUG} introuvable`); process.exit(1); }
const prof = { id: profil.id };

// La journée témoin : un dimanche lointain, pour ne croiser AUCUNE séance du
// seed démo. Le portail liste 60 jours, donc elle sera bien rendue.
const jour = new Date();
jour.setDate(jour.getDate() + 45);
while (jour.getDay() !== 0) jour.setDate(jour.getDate() + 1);
const DATE = jour.toISOString().slice(0, 10);
const NOM = 'Découverte preuve';

console.log(`studio « ${profil.studio_nom} » (/p/${SLUG}) — journée témoin ${DATE}\n`);

const temoins = [];
const creer = async (o) => {
  const { data, error } = await admin.from('cours').insert({
    profile_id: prof.id, date: DATE, duree_minutes: 60,
    capacite_max: 8, visibilite: 'public', format: 'presentiel',
    lieu: 'Yourte de la preuve', tarif_unitaire: 5, nom: NOM,
    ...o,
  }).select('id, heure, nom, tarif_unitaire, est_annule').single();
  if (error) throw new Error(`création séance : ${error.message}`);
  temoins.push(data.id);
  return data;
};
const purger = async () => {
  if (!temoins.length) return;
  await admin.from('cours').delete().in('id', temoins);
  const { count } = await admin.from('cours')
    .select('id', { count: 'exact', head: true }).eq('profile_id', prof.id).eq('date', DATE);
  console.log(`  ménage : ${count ?? '?'} séance(s) témoin restante(s)`);
};

let browser;
try {
  // 5 jumelles + 1 annulée + 1 à tarif différent : tout ce qu'il faut pour
  // vérifier ce qui se replie ET ce qui refuse de se replier.
  for (const h of ['09:30', '11:00', '13:00', '14:30', '16:00']) await creer({ heure: h });
  // Les ids partent dans `temoins` (donc dans le menage) : on ne garde pas de
  // reference locale, on verifie ces deux-la par ce que la PAGE en fait.
  await creer({ heure: '17:30', est_annule: true });
  await creer({ heure: '18:30', tarif_unitaire: 25 });

  let chromium;
  try { ({ chromium } = await import('playwright')); }
  catch { ({ chromium } = await import('@playwright/test')); }
  try { browser = await chromium.launch(); }
  catch { browser = await chromium.launch({ channel: 'msedge' }); }

  const ctx = await browser.newContext({ viewport: { width: 375, height: 812 } });
  const page = await ctx.newPage();
  const erreurs = [];
  page.on('pageerror', e => erreurs.push(String(e)));

  // Vue LISTE : elle porte 60 jours, donc notre journée témoin y est.
  await page.goto(`http://localhost:${PORT}/p/${SLUG}`, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('.portail-cours-card, .portail-groupe', { timeout: 25000 });
  let vueListe = false;
  for (let i = 0; i < 20 && !vueListe; i++) {
    await page.evaluate(() => {
      const b = [...document.querySelectorAll('button')].find(x => x.innerText.trim() === 'Liste');
      if (b) b.click();
    });
    await attendre(500);
    vueListe = await page.evaluate(() => document.querySelectorAll('.portail-day-group').length > 0);
  }
  check(vueListe, 'la vue Liste est ouverte (60 jours, notre journée témoin comprise)');

  // Le bloc de NOTRE journée, et lui seul : le démo a d'autres jours.
  const bloc = async () => page.evaluate((nom) => {
    const groupe = [...document.querySelectorAll('.portail-groupe')]
      .find(g => g.innerText.includes(nom));
    const cartes = [...document.querySelectorAll('.portail-cours-card')]
      .filter(c => c.innerText.includes(nom));
    if (!groupe) return { groupe: null, cartes: cartes.map(c => c.innerText.replace(/\n/g, ' | ')) };
    const r = groupe.getBoundingClientRect();
    const info = groupe.querySelector('.portail-cours-info')?.getBoundingClientRect();
    return {
      groupe: {
        texte: groupe.innerText.replace(/\n/g, ' | '),
        h: Math.round(r.height),
        largeurInfo: info ? Math.round(info.width) : 0,
        creneaux: [...groupe.querySelectorAll('.portail-creneau')].length,
        toggle: groupe.querySelector('.portail-groupe-toggle')?.innerText.trim() || '',
      },
      cartes: cartes.map(c => c.innerText.replace(/\n/g, ' | ')),
      debordement: document.documentElement.scrollWidth > window.innerWidth,
    };
  }, NOM);

  // ══ A. Cinq jumelles = UNE carte ═══════════════════════════════════════════
  console.log('A→B. Le pli range la répétition, pas l\'offre');
  const avant = await bloc();
  check(!!avant.groupe, 'les cinq séances jumelles sont repliées sous une carte',
    avant.groupe ? avant.groupe.texte.slice(0, 70) : `aucun groupe (${avant.cartes.length} cartes)`);
  check(avant.groupe?.texte.includes('5 créneaux'),
    'l\'en-tête annonce le nombre de créneaux', avant.groupe?.texte.match(/\d+ créneaux[^|]*/)?.[0] || '');

  // ══ B. Les horaires restent lisibles sans déplier ══════════════════════════
  const heuresLisibles = ['9h30', '11h', '13h', '14h30', '16h']
    .filter(h => avant.groupe?.texte.includes(h));
  check(heuresLisibles.length === 5,
    'les 5 horaires sont lisibles SANS déplier', heuresLisibles.join(' · '));
  check(avant.groupe?.creneaux === 0, 'et le détail est bien replié au départ');
  check(avant.groupe?.toggle.includes('Choisir mon heure'),
    'le bouton dit ce qu\'il fait', avant.groupe?.toggle);

  // ══ D. La carte tient sur un mobile ════════════════════════════════════════
  console.log('\nD. Mesuré, pas supposé');
  check((avant.groupe?.largeurInfo || 0) > 150,
    'le bloc titre a une vraie largeur', `${avant.groupe?.largeurInfo}px sur 375`);
  check(avant.debordement === false, 'aucun débordement horizontal');

  // ══ E+F. Ce qui refuse de se replier ═══════════════════════════════════════
  console.log('\nE→F. Ce qui ne se replie JAMAIS');
  check(avant.cartes.some(t => t.includes('25')),
    'le créneau à 25 EUR garde sa propre carte (le pli ne masque pas un prix different)',
    avant.cartes.join(' // ').slice(0, 70));
  check(avant.groupe && /5 creneaux|5 cr.neaux/.test(avant.groupe.texte),
    'le groupe compte exactement 5 creneaux : ni le tarif a part, ni l annulee');
  // Constat, pas supposition : le portail public ne sert AUCUNE seance annulee
  // (.eq('est_annule', false) dans app/p/[studioSlug]/page.js), decision
  // anterieure et independante de ce lot. Ce qu'on verifie ici, c'est qu'elle
  // n'est pas non plus AVALEE par le groupe : elle est absente de la page, pas
  // cachee dedans. La regle « une annulee ne rejoint jamais un groupe » reste
  // figee par le verrou CI seances-groupees.spec.js, pour le jour ou une
  // surface deciderait de les afficher.
  const annuleeQuelquePart = (avant.groupe?.texte || '').includes('17h30')
    || avant.cartes.some(t => t.includes('17h30'));
  check(!annuleeQuelquePart,
    'la seance annulee n est ni affichee ni avalee par le groupe');

  // ══ C. Déplier rend les cinq créneaux réservables ══════════════════════════
  console.log('\nC. Déplier ne fabrique rien, ne perd rien');
  await page.evaluate((nom) => {
    const g = [...document.querySelectorAll('.portail-groupe')].find(x => x.innerText.includes(nom));
    g.querySelector('.portail-groupe-tete').click();
  }, NOM);
  await attendre(500);
  const apres = await page.evaluate((nom) => {
    const g = [...document.querySelectorAll('.portail-groupe')].find(x => x.innerText.includes(nom));
    const rows = [...g.querySelectorAll('.portail-creneau')];
    return {
      nb: rows.length,
      liens: rows.map(r => r.getAttribute('href')),
      heures: rows.map(r => r.querySelector('.portail-creneau-heure')?.innerText.replace(/\n/g, ' ').trim()),
      toggle: g.querySelector('.portail-groupe-toggle')?.innerText.trim() || '',
      debordement: document.documentElement.scrollWidth > window.innerWidth,
    };
  }, NOM);
  check(apres.nb === 5, 'les 5 créneaux apparaissent', String(apres.nb));
  check(new Set(apres.liens).size === 5,
    'chacun pointe vers SA séance, cinq pages distinctes', `${new Set(apres.liens).size} liens uniques`);
  check(apres.liens.every(h => temoins.some(id => h?.includes(id))),
    'et ce sont bien nos cinq séances témoins');
  check(apres.heures.join(' ').includes('9h30') && apres.heures.join(' ').includes('16h'),
    'dans l\'ordre de la journée', apres.heures.join(' · '));
  check(apres.toggle.includes('Replier'), 'le bouton propose maintenant de replier', apres.toggle);
  check(apres.debordement === false, 'toujours aucun débordement, déplié');

  // ══ G. Non-régression : une journée variée ne bouge pas ════════════════════
  console.log('\nG. Une journée aux cours variés ne change pas');
  const variee = await page.evaluate(() => {
    const jours = [...document.querySelectorAll('.portail-day-group')];
    // Un jour du seed démo : plusieurs cours DIFFÉRENTS, aucun groupe attendu.
    const autres = jours.filter(j => !j.innerText.includes('Découverte preuve'));
    return {
      jours: autres.length,
      groupes: autres.reduce((n, j) => n + j.querySelectorAll('.portail-groupe').length, 0),
      cartes: autres.reduce((n, j) => n + j.querySelectorAll('.portail-cours-card').length, 0),
    };
  });
  check(variee.groupes === 0,
    'aucun regroupement là où les cours diffèrent', `${variee.jours} jours, ${variee.cartes} cartes`);
  check(variee.cartes > 0, 'et les cartes du démo sont bien rendues', `${variee.cartes} cartes`);

  check(erreurs.length === 0, 'console navigateur propre',
    erreurs.slice(0, 2).join(' | ') || 'aucune erreur');

} catch (e) {
  ko++;
  console.log(`\n  KO  exception : ${e.message}`);
} finally {
  console.log('\nH. Ménage');
  try { await purger(); } catch (e) { console.log(`  ⚠️ ménage incomplet : ${e.message}`); }
  if (browser) await browser.close();
}

console.log(`\n${ok}/${ok + ko} — ${ko === 0 ? '✅ tout est vert' : `❌ ${ko} échec(s)`}`);
process.exit(ko === 0 ? 0 : 1);
