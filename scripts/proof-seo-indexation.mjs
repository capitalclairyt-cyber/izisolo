/**
 * scripts/proof-seo-indexation.mjs — preuve du lot « indexation » (2026-08-28).
 *
 * Déclencheur : l'export Search Console du 28/08 (37 pages indexées, 60 non
 * indexées) et l'export « fonctionnalités génératives » du même jour. Ce script
 * rejoue les mesures qui ont servi au diagnostic, pour qu'une régression se voie
 * tout de suite au lieu d'attendre trois semaines que Google la signale.
 *
 * Ce qu'il vérifie, dans l'ordre du rapport GSC :
 *   A. /favicon.ico répond 200 et est un vrai ICO (motif « Introuvable (404) »)
 *   B. les balises <link rel="icon"> et <link rel="canonical"> sont servies
 *      (motif « Autre page avec balise canonique correcte »)
 *   C. le sitemap ne se contredit plus et ne soumet plus de pages vides
 *   D. les pages Pilates parlent de Pilates (motif « explorée, non indexée »)
 *   E. le texte réellement propre à chaque page ville a augmenté
 *
 * Usage :
 *   npm run build && npx next start -p 3333    (dans un autre terminal)
 *   node scripts/proof-seo-indexation.mjs
 *   PROOF_BASE=https://www.izisolo.fr node scripts/proof-seo-indexation.mjs
 *
 * ⚠️ En local, NEXT_PUBLIC_APP_URL vaut http://localhost:3000 : les canoniques
 * portent donc ce host. On assertionne le CHEMIN, jamais le host, sinon le
 * script serait vert en prod et rouge en local pour une raison sans intérêt.
 */

const BASE = process.env.PROOF_BASE || 'http://localhost:3333';
const UA = { 'user-agent': 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)' };

let ok = 0, ko = 0;
const verifier = (condition, libelle, detail = '') => {
  if (condition) { ok++; console.log(`  ✓ ${libelle}${detail ? '  ' + detail : ''}`); }
  else { ko++; console.log(`  ✗ ${libelle}${detail ? '  ' + detail : ''}`); }
};

const html = async (chemin) => {
  const r = await fetch(BASE + chemin, { headers: UA });
  if (!r.ok) throw new Error(`${chemin} → HTTP ${r.status}`);
  return r.text();
};
const texte = (h) => h
  .replace(/<script[\s\S]*?<\/script>/gi, ' ')
  .replace(/<style[\s\S]*?<\/style>/gi, ' ')
  .replace(/<[^>]+>/g, ' ')
  .replace(/&#x27;/g, "'").replace(/&[a-z#0-9]+;/g, ' ')
  .replace(/\s+/g, ' ').trim();
const canonical = (h) => (h.match(/<link[^>]+rel="canonical"[^>]+href="([^"]+)"/i) || [])[1] || null;

const VILLES = ['paris', 'lyon', 'marseille', 'toulouse', 'bordeaux', 'nantes', 'strasbourg', 'lille', 'montpellier', 'rennes', 'nice'];

// Empreintes de 8 mots : la mesure standard du quasi-doublon. Le 28/08, avant
// ce lot, 77 % des empreintes d'une page ville se retrouvaient telles quelles
// sur au moins une de ses 21 soeurs.
const N_GRAMME = 8;
const empreintes = (t) => {
  const mots = t.toLowerCase().split(' ');
  const s = new Set();
  for (let i = 0; i + N_GRAMME <= mots.length; i++) s.add(mots.slice(i, i + N_GRAMME).join(' '));
  return s;
};

console.log(`\n=== Preuve indexation — ${BASE} ===`);

// ─── A. Le favicon existe ────────────────────────────────────────────────────
console.log('\nA. Le 404 unique du rapport');
{
  const r = await fetch(BASE + '/favicon.ico', { headers: UA });
  verifier(r.status === 200, '/favicon.ico répond 200', `(HTTP ${r.status})`);
  if (r.status === 200) {
    const buf = Buffer.from(await r.arrayBuffer());
    // En-tête ICONDIR : 2 octets réservés à 0, puis type 1 (icône).
    const estIco = buf.length > 6 && buf.readUInt16LE(0) === 0 && buf.readUInt16LE(2) === 1;
    verifier(estIco, "c'est un vrai fichier ICO", `(${buf.readUInt16LE(4)} tailles, ${buf.length} octets)`);
  }
}

// ─── B. Icônes et canoniques servies ─────────────────────────────────────────
console.log('\nB. Balises servies dans le <head>');
{
  const home = await html('/');
  verifier(/<link[^>]+rel="icon"[^>]+href="\/favicon\.ico"/i.test(home),
    'la home sert <link rel="icon"> vers /favicon.ico');

  const c = canonical(home);
  verifier(!!c && new URL(c).pathname === '/', 'la home a une canonique', c ? `(${c})` : '(aucune)');

  for (const chemin of ['/legal/cgu', '/legal/cgv', '/legal/mentions', '/legal/rgpd', '/register']) {
    const cc = canonical(await html(chemin));
    verifier(!!cc && new URL(cc).pathname === chemin, `canonique sur ${chemin}`, cc || '(aucune)');
  }

  // Portail : la canonique vit sur la PAGE et non sur le layout, sinon /espace
  // et /essai se déclareraient comme des copies de l'accueil du studio.
  const portail = await html('/p/atelier-soleil');
  const cp = canonical(portail);
  verifier(!!cp && new URL(cp).pathname === '/p/atelier-soleil', 'canonique sur un portail', cp || '(aucune)');
  const espace = await fetch(BASE + '/p/atelier-soleil/essai', { headers: UA }).then(r => r.text());
  const ce = canonical(espace);
  verifier(!ce || new URL(ce).pathname !== '/p/atelier-soleil',
    "une sous-page du portail n'hérite pas de la canonique de l'accueil", ce || '(aucune, attendu)');
}

// ─── C. Le sitemap ───────────────────────────────────────────────────────────
console.log('\nC. Le sitemap ne se contredit plus');
{
  const xml = await (await fetch(BASE + '/sitemap.xml', { headers: UA })).text();
  const urls = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m => new URL(m[1]).pathname);

  verifier(!urls.includes('/login'), '/login est sorti du sitemap (il est en noindex)');
  verifier(urls.includes('/creer-mon-studio'), '/creer-mon-studio y est entré');

  const portails = urls.filter(u => u.startsWith('/p/'));
  const TEST = ['/p/colin-studio', '/p/colin2', '/p/atelier-soleil', '/p/ben-yoga'];
  const fuites = TEST.filter(t => portails.includes(t));
  verifier(fuites.length === 0, 'aucun compte de test soumis à Google',
    fuites.length ? `(fuite : ${fuites.join(', ')})` : `(${portails.length} portails soumis)`);

  // Le filtre ne doit pas non plus tout raser : au moins un vrai studio reste.
  verifier(portails.length >= 1, 'au moins un vrai portail reste soumis', `(${portails.length})`);
}

// ─── D. Les pages Pilates parlent de Pilates ─────────────────────────────────
console.log('\nD. Contenu Pilates sur les pages Pilates');
{
  let faqYoga = 0, sansReformer = 0;
  for (const v of VILLES) {
    const h = await html(`/prof-pilates-${v}`);
    // ⚠️ `<summary[^>]*>` et non `<summary>` : styled-jsx pose une classe de
    // scope sur la balise. Avec le regex strict, ce bloc ne trouvait AUCUNE
    // question, donc « aucune question sur le yoga » passait à vide et la
    // preuve se croyait verte sur le point qu'elle était censée garder.
    const questions = [...h.matchAll(/<summary[^>]*>([\s\S]*?)<\/summary>/gi)].map(m => texte(m[1]));
    if (questions.length === 0) { sansReformer++; continue; }
    // On traque la SIGNATURE du bug, pas le mot « yoga ». Ce qui était servi
    // était la FAQ yoga telle quelle : « Combien gagne un·e PROF DE YOGA », « Où
    // louer une SALLE DE YOGA », « démarrer un STUDIO YOGA ». Une question qui
    // mentionne le yoga en passant, comme « Peut-on combiner Pilates et yoga sur
    // un même planning ? » à Lyon, est au contraire du bon contenu : la refuser
    // ferait échouer la preuve sur ce qu'elle est censée protéger.
    if (questions.some(q => /(prof|salle|studio|cours|séance)s? (de |du )?yoga/i.test(q))) faqYoga++;
    const corps = texte(h);
    if (!/Reformer/i.test(corps)) sansReformer++;
  }
  verifier(faqYoga === 0, 'aucune page Pilates ne pose une question sur le yoga',
    faqYoga ? `(${faqYoga} pages fautives)` : '(11 pages contrôlées)');
  verifier(sansReformer === 0, 'les 11 pages Pilates parlent bien de Reformer',
    sansReformer ? `(${sansReformer} sans mention)` : '');

  // Contre-épreuve : le yoga n'a pas été contaminé au passage.
  const yogaParis = texte(await html('/prof-yoga-paris'));
  verifier(!/Reformer/i.test(yogaParis) || /Pilates/i.test(yogaParis),
    'la page yoga garde son contenu yoga');
}

// ─── E. Le texte propre à chaque page ville ──────────────────────────────────
console.log('\nE. Part de texte réellement propre à chaque page ville');
{
  const pages = {};
  for (const v of VILLES) {
    pages[`yoga-${v}`] = texte(await html(`/prof-yoga-${v}`));
    pages[`pilates-${v}`] = texte(await html(`/prof-pilates-${v}`));
  }
  const S = Object.fromEntries(Object.entries(pages).map(([k, t]) => [k, empreintes(t)]));
  const noms = Object.keys(pages);

  let total = 0;
  for (const n of noms) {
    const autres = noms.filter(x => x !== n);
    let partagees = 0;
    for (const e of S[n]) if (autres.some(a => S[a].has(e))) partagees++;
    total += partagees / S[n].size * 100;
  }
  const moyenne = total / noms.length;
  // Mesuré à 77 % avant le lot. On exige une amélioration franche, pas un
  // chiffre parfait : du texte partagé est normal (nav, pied, tarifs).
  verifier(moyenne < 70, `boilerplate moyen sous 70 % (77 % avant le lot)`, `(${moyenne.toFixed(0)} %)`);

  // La paire la plus dupliquée était yoga-X ↔ pilates-X d'une même ville.
  const mots = (t) => new Set(t.toLowerCase().split(' ').filter(w => w.length > 3));
  const jaccard = (a, b) => {
    const A = mots(a), B = mots(b);
    const inter = [...A].filter(w => B.has(w)).length;
    return inter / (A.size + B.size - inter) * 100;
  };
  const paires = VILLES.map(v => ({ v, pct: jaccard(pages[`yoga-${v}`], pages[`pilates-${v}`]) }));
  const pire = paires.reduce((a, b) => (a.pct > b.pct ? a : b));
  verifier(pire.pct < 68, 'la paire yoga/pilates la plus proche sous 68 % (75 % avant)',
    `(${pire.v} : ${pire.pct.toFixed(0)} %)`);
}

console.log(`\n=== ${ok}/${ok + ko} ===`);
process.exit(ko === 0 ? 0 : 1);
