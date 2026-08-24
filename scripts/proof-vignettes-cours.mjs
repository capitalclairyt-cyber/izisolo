/**
 * Preuve — identité visuelle des cours (v99) : couleur et vignette par TYPE,
 * photo propre à une SÉANCE, sur le portail, l'embed et la page publique du
 * cours. Plus le second bloc intégrable « Mes offres ».
 *
 * Le script SONDE la migration et s'adapte :
 *   Phase A (toujours, y compris AVANT v99) — le dégradé doit être invisible :
 *     1. portail : les cartes s'affichent, tonnées par type, ZÉRO vignette ;
 *     2. plus de « 🖥 En ligne » en double dans la vue semaine (la carte était
 *        écrite deux fois, les deux copies avaient divergé) ;
 *     3. embed planning : cartes rendues + palette résolue (le fichier CSS
 *        partagé embed-palette.css est bien chargé) ;
 *     4. embed offres : les offres actives, chacune vers ?tab=tarifs&src=embed,
 *        en nouvel onglet et sans chemin d'écriture dans l'iframe ;
 *     5. le lien d'arrivée ouvre bien l'onglet Tarifs du portail ;
 *     6. console sans erreur applicative.
 *   Phase B (une fois v99 appliquée) — la chaîne réelle :
 *     7. vignette + ton posés sur un TYPE → la carte de ce type porte l'image
 *        et la couleur choisie (et pas celle que déduisait lib/tones) ;
 *     8. photo posée sur UNE séance → elle PRIME sur celle de son type, les
 *        autres séances du même type gardent la vignette du type ;
 *     9. la page publique du cours porte la même image en tête ;
 *    10. l'embed porte la vignette mais PAS le ton (ses couleurs sont celles
 *        du site de la prof, par design) ;
 *    11. restauration complète des réglages du studio témoin.
 *
 * Usage : node scripts/proof-vignettes-cours.mjs [dossier-captures]
 *   PROOF_BASE=http://localhost:3334 pour viser un autre serveur local.
 */
import { createClient } from '@supabase/supabase-js';
import { readFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = process.cwd();
const OUT = process.argv[2] || join(process.env.TEMP || '.', 'proof-vignettes');
mkdirSync(OUT, { recursive: true });
const BASE = process.env.PROOF_BASE || 'http://localhost:3333';
const STUDIO_SLUG = 'atelier-soleil';

const env = Object.fromEntries(
  readFileSync(join(ROOT, '.env.local'), 'utf8')
    .split('\n').filter(l => l.includes('=') && !l.startsWith('#'))
    .map(l => [l.slice(0, l.indexOf('=')).trim(), l.slice(l.indexOf('=') + 1).trim()])
);
const PROJECT_REF = new URL(env.NEXT_PUBLIC_SUPABASE_URL).hostname.split('.')[0];
const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

// Session prof réelle (magic link → cookie @supabase/ssr), comme les autres
// preuves : on veut l'écran que la prof voit, pas une approximation.
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
  return cookies.map(c => ({ ...c, domain: 'localhost', path: '/' }));
}

let ok = 0, ko = 0;
const assert = (cond, label) => {
  if (cond) { ok++; console.log(`  ✅ ${label}`); }
  else { ko++; console.log(`  ❌ ${label}`); }
};
const attendre = ms => new Promise(r => setTimeout(r, ms));

// ── serveur ────────────────────────────────────────────────────────────────
for (let i = 0; i < 60; i++) {
  try { const r = await fetch(`${BASE}/login`); if (r.ok) break; } catch { /* pas prêt */ }
  await attendre(2000);
  if (i === 59) { console.error(`serveur injoignable sur ${BASE}`); process.exit(1); }
}
console.log(`🌐 serveur prêt (${BASE})`);

// ── studio témoin ──────────────────────────────────────────────────────────
const { data: studio } = await admin
  .from('profiles')
  .select('id, studio_nom, studio_slug')
  .eq('studio_slug', STUDIO_SLUG)
  .single();
if (!studio) { console.error(`studio ${STUDIO_SLUG} introuvable`); process.exit(1); }
console.log(`👤 studio : ${studio.studio_nom}`);

// ── sonde v99 ──────────────────────────────────────────────────────────────
const sondeProfil = await admin.from('profiles').select('tons_par_type, vignettes_par_type').eq('id', studio.id).maybeSingle();
const sondeCours = await admin.from('cours').select('id, photo_url').eq('profile_id', studio.id).limit(1);
const migree = !sondeProfil.error && !sondeCours.error;
console.log(migree
  ? '🗄️  v99 appliquée → phases A et B'
  : `🗄️  v99 PAS appliquée (${sondeProfil.error?.code || sondeCours.error?.code}) → phase A (dégradé) seulement`);

// ── navigateur ─────────────────────────────────────────────────────────────
let chromium;
try { ({ chromium } = await import('playwright')); }
catch { ({ chromium } = await import('@playwright/test')); }
let browser;
try { browser = await chromium.launch(); }
catch { browser = await chromium.launch({ channel: 'msedge' }); }

const erreursConsole = [];
const page = await browser.newPage({ viewport: { width: 1180, height: 900 } });
page.on('console', m => {
  if (m.type() !== 'error') return;
  const t = m.text();
  // Bruit local connu : Vercel Analytics / Speed Insights n'existent pas hors
  // production (l'URL apparaît parfois encodée, d'où le test sur « _vercel »).
  if (t.includes('_vercel')) return;
  erreursConsole.push(t);
});

// Sauvegardes à restaurer quoi qu'il arrive
let reglagesOriginaux = null;
let seanceTemoin = null;
let photoSeanceOriginale = null;

try {
  // ═══ PHASE A — le dégradé est invisible ═══════════════════════════════════
  console.log('\n── Phase A : le planning et les blocs, sans aucune photo ──');

  await page.goto(`${BASE}/p/${STUDIO_SLUG}`, { waitUntil: 'networkidle' });
  const portailA = await page.evaluate(() => {
    const cartes = [...document.querySelectorAll('.portail-cours-card')];
    return {
      cartes: cartes.length,
      vignettes: document.querySelectorAll('.portail-cours-vignette').length,
      tons: [...new Set(cartes.map(c => [...c.classList].find(x => x.startsWith('portail-cours-card--')) || ''))],
      enLigneDouble: cartes.some(c => (c.innerText.match(/En ligne/g) || []).length > 1),
    };
  });
  assert(portailA.cartes > 0, `portail : ${portailA.cartes} séances affichées`);
  assert(portailA.vignettes === 0, 'portail : aucune vignette tant qu\'aucune photo n\'est déposée');
  assert(portailA.tons.length > 0, `portail : les cartes restent tonnées par type (${portailA.tons.length} tons)`);
  assert(!portailA.enLigneDouble, 'plus de « En ligne » affiché deux fois sur la même carte');

  await page.goto(`${BASE}/embed/${STUDIO_SLUG}`, { waitUntil: 'networkidle' });
  const embedA = await page.evaluate(() => {
    const root = document.querySelector('.emb');
    const cs = root ? getComputedStyle(root) : null;
    return {
      cartes: document.querySelectorAll('.emb-cours').length,
      vignettes: document.querySelectorAll('.emb-vign, .emb-sc-vign').length,
      varDeep: cs ? cs.getPropertyValue('--e-deep').trim() : '',
      varBorder: cs ? cs.getPropertyValue('--e-border').trim() : '',
    };
  });
  assert(embedA.cartes > 0, `embed planning : ${embedA.cartes} séances`);
  assert(embedA.vignettes === 0, 'embed planning : aucune vignette avant dépôt');
  assert(!!embedA.varDeep && !!embedA.varBorder, `embed : palette partagée résolue (--e-deep ${embedA.varDeep})`);

  await page.goto(`${BASE}/embed/${STUDIO_SLUG}/offres`, { waitUntil: 'networkidle' });
  const offresA = await page.evaluate(() => {
    const cartes = [...document.querySelectorAll('.embo-carte')];
    return {
      n: cartes.length,
      liens: [...new Set(cartes.map(c => c.getAttribute('href')))],
      cible: cartes[0]?.getAttribute('target') || null,
      rel: cartes[0]?.getAttribute('rel') || null,
      formulaires: document.querySelectorAll('form, input, button[type="submit"]').length,
      textes: cartes.map(c => c.innerText.replace(/\n+/g, ' | ')),
    };
  });
  assert(offresA.n > 0, `embed offres : ${offresA.n} offres listées`);
  assert(offresA.liens.length === 1 && offresA.liens[0].includes('tab=tarifs') && offresA.liens[0].includes('src=embed'),
    'embed offres : chaque carte renvoie vers l\'onglet Tarifs du portail, tagué embed');
  assert(offresA.cible === '_blank' && /noopener/.test(offresA.rel || ''),
    'embed offres : l\'action SORT de l\'iframe (nouvel onglet, noopener)');
  assert(offresA.formulaires === 0, 'embed offres : aucun champ ni bouton d\'envoi dans l\'iframe');
  console.log(`     offres vues : ${offresA.textes.join(' / ')}`);

  await page.goto(`${BASE}/p/${STUDIO_SLUG}?tab=tarifs&src=embed`, { waitUntil: 'networkidle' });
  const arrivee = await page.evaluate(() => ({
    onglet: [...document.querySelectorAll('[class*="portail-tab"]')].filter(b => b.className.includes('active')).map(b => b.innerText.trim()),
    grille: document.querySelectorAll('.portail-price-card').length,
  }));
  assert(arrivee.onglet.includes('Tarifs') && arrivee.grille > 0,
    `l'arrivée depuis le bloc offres ouvre l'onglet Tarifs (${arrivee.grille} offres)`);

  // ═══ PHASE B — la chaîne réelle ═══════════════════════════════════════════
  if (migree) {
    console.log('\n── Phase B : une vignette de type, puis une photo de séance ──');

    // Image témoin : une VRAIE photo déjà hébergée chez nous (sinon l'URL ne
    // passerait pas imageOptimisable et on ne prouverait rien de réel).
    const { data: avecPhoto } = await admin
      .from('profiles')
      .select('photo_couverture, photo_url')
      .or('photo_couverture.not.is.null,photo_url.not.is.null')
      .limit(5);
    const urlsReelles = (avecPhoto || [])
      .flatMap(p => [p.photo_couverture, p.photo_url])
      .filter(u => typeof u === 'string' && /\.(supabase\.co|public\.blob\.vercel-storage\.com)\//.test(u));
    if (urlsReelles.length < 2) {
      console.log('  ⚠️  moins de 2 images réelles disponibles : phase B ignorée (rien de faux ne sera affiché)');
    } else {
      const IMG_TYPE = urlsReelles[0];
      const IMG_SEANCE = urlsReelles[1];

      // Séance témoin : la première séance publique à venir qui porte un type.
      const today = new Date().toLocaleDateString('sv-SE', { timeZone: 'Europe/Paris' });
      const { data: seances } = await admin
        .from('cours')
        .select('id, nom, type_cours, date, visibilite, photo_url')
        .eq('profile_id', studio.id)
        .eq('est_annule', false)
        .gte('date', today)
        .not('type_cours', 'is', null)
        .order('date')
        .limit(40);
      const candidates = (seances || []).filter(c => !c.visibilite || c.visibilite === 'public');
      const typeTemoin = candidates[0]?.type_cours;
      const memeType = candidates.filter(c => c.type_cours === typeTemoin);
      seanceTemoin = memeType[0] || null;
      photoSeanceOriginale = seanceTemoin?.photo_url ?? null;

      if (!seanceTemoin || memeType.length < 2) {
        console.log('  ⚠️  pas assez de séances publiques du même type : phase B ignorée');
      } else {
        reglagesOriginaux = {
          tons_par_type: sondeProfil.data?.tons_par_type ?? null,
          vignettes_par_type: sondeProfil.data?.vignettes_par_type ?? null,
        };

        // 7. vignette + ton sur le TYPE
        await admin.from('profiles').update({
          vignettes_par_type: { [typeTemoin]: IMG_TYPE },
          tons_par_type: { [typeTemoin]: 'ink' },
        }).eq('id', studio.id);
        await attendre(300);

        await page.goto(`${BASE}/p/${STUDIO_SLUG}`, { waitUntil: 'networkidle' });
        const b1 = await page.evaluate((type) => {
          const cartes = [...document.querySelectorAll('.portail-cours-card')];
          const duType = cartes.filter(c => c.innerText.includes(type));
          return {
            total: cartes.length,
            duType: duType.length,
            avecVignette: duType.filter(c => c.querySelector('.portail-cours-vignette img')).length,
            ink: duType.filter(c => c.className.includes('--ink')).length,
            srcs: duType.map(c => c.querySelector('.portail-cours-vignette img')?.getAttribute('src') || null),
          };
        }, typeTemoin);
        assert(b1.duType > 0 && b1.avecVignette === b1.duType,
          `portail : les ${b1.duType} séances de « ${typeTemoin} » portent la vignette du type`);
        assert(b1.ink === b1.duType, `portail : elles prennent le ton CHOISI (ink), pas celui déduit`);
        assert(b1.srcs.every(s => s && s.includes('/_next/image')),
          'portail : les vignettes passent par l\'optimiseur next/image');

        // 8. photo propre à UNE séance → elle prime
        await admin.from('cours').update({ photo_url: IMG_SEANCE }).eq('id', seanceTemoin.id);
        await attendre(300);
        await page.goto(`${BASE}/p/${STUDIO_SLUG}`, { waitUntil: 'networkidle' });
        const b2 = await page.evaluate((nom) => {
          const cartes = [...document.querySelectorAll('.portail-cours-card')];
          const cible = cartes.find(c => c.innerText.includes(nom));
          const img = cible?.querySelector('.portail-cours-vignette img');
          const src = img?.getAttribute('src') || '';
          const dec = src.includes('url=') ? decodeURIComponent(src.split('url=')[1].split('&')[0]) : src;
          return { trouvee: !!cible, source: dec };
        }, seanceTemoin.nom);
        assert(b2.trouvee && b2.source === IMG_SEANCE,
          'portail : la photo de LA séance prime sur celle de son type');

        // ...et les autres séances du même type gardent celle du type
        const b2b = await page.evaluate((args) => {
          const cartes = [...document.querySelectorAll('.portail-cours-card')];
          const autres = cartes.filter(c => c.innerText.includes(args.type) && !c.innerText.includes(args.nom));
          return autres.map(c => {
            const src = c.querySelector('.portail-cours-vignette img')?.getAttribute('src') || '';
            return src.includes('url=') ? decodeURIComponent(src.split('url=')[1].split('&')[0]) : src;
          });
        }, { type: typeTemoin, nom: seanceTemoin.nom });
        assert(b2b.length > 0 && b2b.every(s => s === IMG_TYPE),
          `les ${b2b.length} autres séances de « ${typeTemoin} » gardent la vignette du type`);

        // 9. page publique de la séance
        await page.goto(`${BASE}/p/${STUDIO_SLUG}/cours/${seanceTemoin.id}`, { waitUntil: 'networkidle' });
        const b3 = await page.evaluate(() => {
          const img = document.querySelector('.resa-vignette img');
          const src = img?.getAttribute('src') || '';
          return src.includes('url=') ? decodeURIComponent(src.split('url=')[1].split('&')[0]) : src;
        });
        assert(b3 === IMG_SEANCE, 'page publique du cours : la même image en tête de fiche');

        // 10. embed : la vignette oui, le ton non
        await page.goto(`${BASE}/embed/${STUDIO_SLUG}`, { waitUntil: 'networkidle' });
        const b4 = await page.evaluate(() => ({
          vignettes: document.querySelectorAll('.emb-vign img').length,
          palette: document.querySelector('.emb')?.dataset.palette || null,
        }));
        assert(b4.vignettes > 0, `embed : ${b4.vignettes} vignettes servies`);
        assert(b4.palette === 'sable', 'embed : les couleurs restent celles du site de la prof (ton de type non appliqué)');
      }
    }
  }

  assert(erreursConsole.length === 0, `console sans erreur applicative${erreursConsole.length ? ' → ' + erreursConsole[0] : ''}`);
  await page.screenshot({ path: join(OUT, 'portail.png'), fullPage: false });

  // ═══ PHASE C — l'écran de la prof ═════════════════════════════════════════
  console.log('\n── Phase C : l\'écran de réglage, côté prof ──');
  const { data: userInfo } = await admin.auth.admin.getUserById(studio.id);
  const emailProf = userInfo?.user?.email;
  if (!emailProf) {
    console.log('  ⚠️  email du studio introuvable : phase C ignorée');
  } else {
    const ctx = await browser.newContext({ viewport: { width: 1180, height: 1000 } });
    await ctx.addCookies(await sessionCookies(emailProf));
    const pageProf = await ctx.newPage();

    await pageProf.goto(`${BASE}/parametres?tab=portail&s=apparence`, { waitUntil: 'networkidle' });
    await attendre(800);
    const carte = await pageProf.evaluate(() => {
      const lignes = [...document.querySelectorAll('.tc-ligne')];
      return {
        presente: !!document.querySelector('.tc-liste, .tc-intro'),
        types: lignes.length,
        pastillesParLigne: lignes[0] ? lignes[0].querySelectorAll('.tc-pastille').length : 0,
        actives: lignes.filter(l => l.querySelector('.tc-pastille.active')).length,
        uploaders: document.querySelectorAll('.tc-ligne .photo-uploader').length,
        aide: !!document.querySelector('a.aide-ctx[href="/aide#apparence-cours"]'),
        // Le « ? » doit être un rond discret, pas un lien bleu de navigateur
        // (piège § 12 : styled-jsx scopé ne hashe jamais un <Link>).
        aideStyle: (() => {
          const a = document.querySelector('a.aide-ctx');
          if (!a) return null;
          const cs = getComputedStyle(a);
          return { display: cs.display, largeur: cs.width };
        })(),
      };
    });
    assert(carte.presente, 'Paramètres → Portail public → Types de cours : la carte s\'affiche');
    assert(carte.types > 0, `la carte liste les ${carte.types} types du studio`);
    assert(carte.pastillesParLigne === 5, 'chaque type propose les 5 couleurs de la palette');
    assert(carte.actives === carte.types, 'chaque type montre la couleur qui lui est appliquée aujourd\'hui');
    assert(carte.uploaders === carte.types, 'chaque type a son dépôt de photo');
    assert(carte.aide && carte.aideStyle?.display === 'inline-flex',
      `le « ? » du guide est branché et stylé (largeur ${carte.aideStyle?.largeur})`);

    // Changer une couleur → le bouton Enregistrer de la carte se réveille
    const avant = await pageProf.evaluate(() => {
      const btns = [...document.querySelectorAll('.save-btn')];
      return btns.length ? btns[btns.length - 1].disabled : null;
    });
    await pageProf.evaluate(() => {
      const ligne = document.querySelector('.tc-ligne');
      const pastilles = [...ligne.querySelectorAll('.tc-pastille')];
      (pastilles.find(p => !p.classList.contains('active')) || pastilles[0]).click();
    });
    await attendre(300);
    const apres = await pageProf.evaluate(() => {
      const btns = [...document.querySelectorAll('.save-btn')];
      return btns.length ? btns[btns.length - 1].disabled : null;
    });
    assert(avant === true && apres === false, 'changer une couleur réveille le bouton Enregistrer de CETTE carte');

    // Enregistrer : succès si migrée, message honnête sinon (jamais une erreur brute)
    await pageProf.evaluate(() => {
      const btns = [...document.querySelectorAll('.save-btn')];
      btns[btns.length - 1].click();
    });
    await attendre(1800);
    const retour = await pageProf.evaluate(() => document.body.innerText);
    if (migree) {
      assert(/Enregistré/i.test(retour), 'la couleur choisie est enregistrée');
    } else {
      assert(/attend une mise à jour de la base/i.test(retour),
        'sans la migration, la carte le DIT au lieu d\'afficher une erreur de base de données');
    }

    await pageProf.screenshot({ path: join(OUT, 'parametres-types-cours.png'), fullPage: false });

    await pageProf.goto(`${BASE}/aide#apparence-cours`, { waitUntil: 'networkidle' });
    await attendre(500);
    const guide = await pageProf.evaluate(() => {
      const section = document.getElementById('apparence-cours');
      return {
        presente: !!section,
        titre: section?.innerText.split('\n')[0] || null,
        citeLEcran: /Types de cours/.test(section?.innerText || ''),
      };
    });
    assert(guide.presente, `le guide a sa section « ${guide.titre} »`);
    assert(guide.citeLEcran, 'le guide cite le nom EXACT de l\'écran qu\'il décrit');

    await pageProf.screenshot({ path: join(OUT, 'guide-apparence.png'), fullPage: false });
    await ctx.close();
  }
} finally {
  // ═══ MÉNAGE — même en cas d'échec ═════════════════════════════════════════
  if (reglagesOriginaux) {
    await admin.from('profiles').update(reglagesOriginaux).eq('id', studio.id);
    console.log('\n🧹 réglages du studio restaurés');
  }
  if (seanceTemoin) {
    await admin.from('cours').update({ photo_url: photoSeanceOriginale }).eq('id', seanceTemoin.id);
    console.log('🧹 photo de la séance témoin restaurée');
  }
  await browser.close();
}

console.log(`\n${ko === 0 ? '✅' : '❌'} ${ok}/${ok + ko} vérifications`);
process.exit(ko === 0 ? 0 : 1);
