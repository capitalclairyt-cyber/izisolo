/**
 * scripts/clean-prospects.mjs
 *
 * Nettoyage de la liste prospects-yoga-fr.csv pour préparer l'envoi Smartlead.
 *
 * Inputs :
 *   prospection/prospects-yoga-fr.csv (séparateur ; — UTF-8 BOM)
 *
 * Outputs :
 *   prospection/clean/premium.csv     → prospects avec prénom + ville + email nominatif
 *   prospection/clean/generic.csv     → emails contact@, info@... mais nom OK
 *   prospection/clean/noprenom.csv    → pas de prénom extractible
 *   prospection/clean/all.csv         → tout, avec colonne `quality_tier`
 *   prospection/clean/REPORT.md       → rapport humain
 *
 * Format Smartlead (séparateur virgule) :
 *   email,first_name,last_name,city,postal_code,specialty,source
 *
 * Usage : node scripts/clean-prospects.mjs
 */

import fs from 'node:fs';
import path from 'node:path';

const INPUT  = path.resolve('prospection', 'prospects-yoga-fr.csv');
const OUTDIR = path.resolve('prospection', 'clean');

const GENERIC_PREFIXES = [
  'contact', 'info', 'hello', 'bonjour', 'secretariat', 'secretaire',
  'admin', 'asso', 'association', 'accueil', 'yoga', 'studio', 'ecole',
  'centre', 'atelier', 'maison', 'inscriptions', 'inscription',
  'reservation', 'office', 'formation', 'direction', 'equipe',
];

const PARTICULES_NOM = new Set([
  'de', 'la', 'le', 'du', 'des', 'van', 'der', 'von', 'da', 'di',
  'd', 'l', "d'", "l'",
]);

const PARTICULES_VILLE = new Set([
  'de', 'la', 'le', 'du', 'des', 'aux', 'en', 'sur', 'sous',
  'lès', 'les', 'sainte', 'saint',
]);

// ─── Parsing CSV manuel (séparateur ;) ─────────────────────────────────────
function parseCSV(content) {
  // Strip BOM
  if (content.charCodeAt(0) === 0xfeff) content = content.slice(1);
  const lines = content.split(/\r?\n/).filter(l => l.length > 0);
  if (lines.length === 0) return [];
  const header = lines[0].split(';').map(h => h.trim());
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const cells = lines[i].split(';');
    const obj = {};
    for (let j = 0; j < header.length; j++) {
      obj[header[j]] = (cells[j] || '').trim();
    }
    rows.push(obj);
  }
  return rows;
}

// ─── Échappement CSV (séparateur virgule, format Smartlead) ────────────────
function csvEscape(val) {
  if (val === null || val === undefined) return '';
  const s = String(val);
  if (s.includes(',') || s.includes('"') || s.includes('\n')) {
    return '"' + s.replace(/"/g, '""') + '"';
  }
  return s;
}

function toCSVLine(values) {
  return values.map(csvEscape).join(',');
}

// ─── Parsing nom / prénom ──────────────────────────────────────────────────
//
// Cas gérés (issus du gros CSV) :
//   "ALTHAUS Cornelia"        → prenom="Cornelia"   nom="Althaus"
//   "DE LA RUE Jean-Pierre"   → prenom="Jean-Pierre" nom="De La Rue"
//   "BATAILLE"                → prenom=null         nom="Bataille"
//   "Hugo Erni"               → prenom="Hugo"       nom="Erni"
//   "DRÉNO-ROBERT"            → prenom=null         nom="Dréno-Robert"
//   "Margaux Theo Favre"      → prenom="Margaux"    nom="Theo Favre" (fallback imparfait)
function parseName(nomRaw) {
  if (!nomRaw || !nomRaw.trim()) return { prenom: null, nom: null };

  const tokens = nomRaw.trim().split(/\s+/);
  if (tokens.length === 0) return { prenom: null, nom: null };

  // Un seul token : c'est un nom de famille seul
  if (tokens.length === 1) {
    return { prenom: null, nom: titleCase(tokens[0]) };
  }

  // CAS SPÉCIAL : tous les tokens sont en MAJUSCULES (annuaires type Sadhana,
  // Yoga-Énergie qui écrivent "NOM PRÉNOM" entièrement en capitales).
  // Convention française : le 1er token est le nom de famille, sauf si c'est
  // une particule auquel cas on l'absorbe jusqu'au "vrai" nom.
  const allUpper = tokens.every(t => t === t.toUpperCase());
  if (allUpper) {
    const nomParts = [];
    let i = 0;
    // Absorber les particules en début (DE, LA, LE, VAN, etc.)
    while (i < tokens.length && PARTICULES_NOM.has(tokens[i].toLowerCase())) {
      nomParts.push(tokens[i]);
      i++;
    }
    // Le token suivant est le "nom principal"
    if (i < tokens.length) {
      nomParts.push(tokens[i]);
      i++;
    }
    const prenomParts = tokens.slice(i);
    if (prenomParts.length === 0) {
      // Pas de prénom détecté (nom à particules sans prénom après)
      return { prenom: null, nom: nomParts.map(titleCase).join(' ') };
    }
    return {
      prenom: prenomParts.map(titleCase).join(' '),
      nom: nomParts.map(titleCase).join(' '),
    };
  }

  // Accumuler les tokens en MAJUSCULE (ou particule) comme nom
  const nomParts = [];
  let i = 0;
  while (i < tokens.length) {
    const t = tokens[i];
    if (t === t.toUpperCase() || PARTICULES_NOM.has(t.toLowerCase())) {
      nomParts.push(t);
      i++;
    } else {
      break;
    }
  }

  const prenomParts = tokens.slice(i);

  // Si on a séparation nette nom-majuscule / prénom-titlecase
  if (nomParts.length > 0 && prenomParts.length > 0) {
    return {
      prenom: prenomParts.map(titleCase).join(' '),
      nom: nomParts.map(titleCase).join(' '),
    };
  }

  // Sinon, pas de pattern majuscule
  if (nomParts.length > 0 && prenomParts.length === 0) {
    return { prenom: null, nom: nomParts.map(titleCase).join(' ') };
  }

  // Pattern "Prénom Nom" en title case
  // Heuristique : si l'un des tokens est uppercase → c'est le nom
  const upperIdx = tokens.findIndex(t => t === t.toUpperCase() && t.length > 1);
  if (upperIdx > 0) {
    return {
      prenom: tokens.slice(0, upperIdx).map(titleCase).join(' '),
      nom: tokens.slice(upperIdx).map(titleCase).join(' '),
    };
  }

  // Dernier cas : 1er = prénom, reste = nom
  return {
    prenom: titleCase(tokens[0]),
    nom: tokens.slice(1).map(titleCase).join(' '),
  };
}

function titleCase(s) {
  if (!s) return s;
  if (s.length === 1) return s.toUpperCase();
  // Préserver les noms à apostrophe ou tiret
  return s.split(/(\s|-|'|’)/).map(part => {
    if (!part || /^[\s\-'’]+$/.test(part)) return part;
    return part[0].toUpperCase() + part.slice(1).toLowerCase();
  }).join('');
}

// ─── Normalisation ville + extraction code postal ──────────────────────────
function normalizeCity(villeRaw) {
  if (!villeRaw || !villeRaw.trim()) return { city: null, postalCode: null };

  let ville = villeRaw.trim();

  // Extraire code postal (5 chiffres)
  const cpMatch = ville.match(/\b(\d{5})\b/);
  const cp = cpMatch ? cpMatch[1] : null;
  if (cp) ville = ville.replace(cp, '').trim();

  // Retirer les "(XX)" en fin
  ville = ville.replace(/\s*\(\d+\)\s*$/, '').trim();

  // Retirer "Xème arrondissement"
  ville = ville.replace(/\b\d+\s*[èe]?me?\s+arrondissement\b/gi, '').trim();

  // Normaliser espaces
  ville = ville.replace(/\s+/g, ' ').trim();

  // Title case avec préservation des particules
  ville = ville.split(/(\s|-)/).map((part, idx, arr) => {
    if (!part || /^[\s\-]+$/.test(part)) return part;
    const isFirstWord = idx === 0;
    if (!isFirstWord && PARTICULES_VILLE.has(part.toLowerCase())) {
      return part.toLowerCase();
    }
    return part[0].toUpperCase() + part.slice(1).toLowerCase();
  }).join('');

  return { city: ville || null, postalCode: cp };
}

// ─── Classification email ──────────────────────────────────────────────────
function isGenericEmail(email) {
  if (!email) return false;
  const prefix = email.split('@')[0].toLowerCase();
  // Regex sur préfixe générique exact OU contenant un mot-clé
  return GENERIC_PREFIXES.some(p =>
    prefix === p || prefix.startsWith(p + '.') || prefix.startsWith(p + '-') || prefix.startsWith(p + '_')
  );
}

// ─── Source URL mapping ────────────────────────────────────────────────────
const SOURCE_URLS = {
  'annuaireduyoga.com': 'https://www.annuaireduyoga.com/',
  'ify.fr': 'https://www.ify.fr/trouvez-un-professeur/',
  'chin-mudra.yoga': 'https://chin-mudra.yoga/directory/ecoles-de-yoga-1/',
  'Sadhana': 'https://annuaire.sadhanalifecenter.com/professeur-yoga/',
  'viniyoga-fr': 'https://www.viniyoga.fr/',
  'efyso.fr': 'https://www.efyso.fr/annuaire/',
  'gerardarnaud-yoga.com': 'https://www.gerardarnaud-yoga.com/diplomes',
  'shanti-cercle.yoga': 'https://shanti-cercle.yoga/annuaire/',
  'yoga-energie.fr': 'https://www.yoga-energie.fr/annuaire-des-professeurs-de-yoga-formes/',
  'yogaduson-fr': 'https://www.yogaduson.fr/',
  'shanti-yoga-ayurveda.fr': 'https://www.shanti-yoga-ayurveda.fr/annuaire-professeur-de-yoga/',
  'IIY': "Institut International de Yoga (annuaire papier)",
  'YogMee': 'https://yogmee.fr/enseignants',
  'GAYA': 'https://www.gerardarnaud-yoga.com/diplomes',
  'AYA': 'https://www.annuaireduyoga.com/',
  'EFYSO': 'https://www.efyso.fr/annuaire/',
};

function lookupSourceURL(sourceRaw) {
  if (!sourceRaw) return '';
  // Cherche par correspondance exacte d'abord
  if (SOURCE_URLS[sourceRaw]) return SOURCE_URLS[sourceRaw];
  // Sinon par substring
  for (const [key, url] of Object.entries(SOURCE_URLS)) {
    if (sourceRaw.includes(key)) return url;
  }
  return '';
}

// ─── Main ──────────────────────────────────────────────────────────────────
function main() {
  console.log('Lecture du CSV...');
  const content = fs.readFileSync(INPUT, 'utf-8');
  const rows = parseCSV(content);
  console.log(`  → ${rows.length} lignes lues`);

  fs.mkdirSync(OUTDIR, { recursive: true });

  const seen = new Set();
  const buckets = { premium: [], generic: [], noprenom: [] };
  const all = [];

  let duplicates = 0;
  let stats = {
    parsed: 0,
    prenomOK: 0,
    cpExtrait: 0,
    villeNorm: 0,
  };

  const cityCounter = new Map();
  const sourceCounter = new Map();

  for (const row of rows) {
    const email = (row.email || '').trim().toLowerCase();
    if (!email || !email.includes('@')) continue;
    if (seen.has(email)) { duplicates++; continue; }
    seen.add(email);

    const { prenom, nom } = parseName(row.nom || '');
    const { city, postalCode } = normalizeCity(row.ville || '');
    const generic = isGenericEmail(email);
    const sourceURL = lookupSourceURL(row.source || '');

    if (prenom) stats.prenomOK++;
    if (postalCode) stats.cpExtrait++;
    if (city) stats.villeNorm++;

    const cleaned = {
      email,
      first_name: prenom || '',
      last_name: nom || '',
      city: city || '',
      postal_code: postalCode || '',
      specialty: (row.specialite || '').trim(),
      source: (row.source || '').trim(),
      source_url: sourceURL,
      generic: generic ? '1' : '0',
    };

    // Quality tier
    let tier;
    if (!prenom) tier = 'noprenom';
    else if (generic) tier = 'generic';
    else tier = 'premium';

    cleaned.quality_tier = tier;
    buckets[tier].push(cleaned);
    all.push(cleaned);
    stats.parsed++;

    if (city) cityCounter.set(city, (cityCounter.get(city) || 0) + 1);
    if (row.source) sourceCounter.set(row.source.trim(), (sourceCounter.get(row.source.trim()) || 0) + 1);
  }

  // ─── Écriture des CSV ────────────────────────────────────────────────────
  const HEADER_SMARTLEAD = ['email', 'first_name', 'last_name', 'city', 'postal_code', 'specialty', 'source', 'source_url'];
  const HEADER_ALL = [...HEADER_SMARTLEAD, 'quality_tier', 'generic'];

  function writeCSV(filepath, header, items) {
    const lines = [toCSVLine(header)];
    for (const item of items) {
      lines.push(toCSVLine(header.map(h => item[h] || '')));
    }
    fs.writeFileSync(filepath, lines.join('\n'), 'utf-8');
  }

  writeCSV(path.join(OUTDIR, 'premium.csv'),   HEADER_SMARTLEAD, buckets.premium);
  writeCSV(path.join(OUTDIR, 'generic.csv'),   HEADER_SMARTLEAD, buckets.generic);
  writeCSV(path.join(OUTDIR, 'noprenom.csv'),  HEADER_SMARTLEAD, buckets.noprenom);
  writeCSV(path.join(OUTDIR, 'all.csv'),       HEADER_ALL, all);

  // ─── Rapport markdown ────────────────────────────────────────────────────
  const topCities = [...cityCounter.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 30);
  const topSources = [...sourceCounter.entries()]
    .sort((a, b) => b[1] - a[1]);

  const report = `# Rapport de nettoyage — prospects yoga FR

Généré par \`scripts/clean-prospects.mjs\` le ${new Date().toISOString().slice(0, 10)}.

---

## Volumes

| | Valeur |
|---|---|
| Lignes lues dans le CSV source | ${rows.length} |
| Doublons supprimés | ${duplicates} |
| **Prospects uniques nettoyés** | **${stats.parsed}** |
| Avec prénom extractible | ${stats.prenomOK} (${(100 * stats.prenomOK / stats.parsed).toFixed(1)}%) |
| Avec ville normalisée | ${stats.villeNorm} (${(100 * stats.villeNorm / stats.parsed).toFixed(1)}%) |
| Avec code postal extrait | ${stats.cpExtrait} (${(100 * stats.cpExtrait / stats.parsed).toFixed(1)}%) |

## Répartition en 3 segments Smartlead

| Segment | Volume | % | Recommandation |
|---|---|---|---|
| 🟢 **premium** (prénom + nom + email nominatif) | ${buckets.premium.length} | ${(100 * buckets.premium.length / stats.parsed).toFixed(1)}% | Cohorte principale, template avec \`{{prenom}}\` |
| 🟡 **generic** (email \`contact@\`, \`info@\`... mais nom OK) | ${buckets.generic.length} | ${(100 * buckets.generic.length / stats.parsed).toFixed(1)}% | Cohorte secondaire, template adapté (mention "studio de X") |
| 🟠 **noprenom** (pas de prénom extractible) | ${buckets.noprenom.length} | ${(100 * buckets.noprenom.length / stats.parsed).toFixed(1)}% | Cohorte tertiaire, template "Bonjour" sans prénom |

## Top 30 villes (après normalisation)

| Ville | Prospects |
|---|---|
${topCities.map(([c, n]) => `| ${c} | ${n} |`).join('\n')}

## Toutes les sources

| Source | Prospects |
|---|---|
${topSources.map(([s, n]) => `| ${s} | ${n} |`).join('\n')}

---

## Fichiers générés

- \`premium.csv\` — ${buckets.premium.length} lignes — à envoyer en premier
- \`generic.csv\` — ${buckets.generic.length} lignes — template adapté
- \`noprenom.csv\` — ${buckets.noprenom.length} lignes — sans personnalisation prénom
- \`all.csv\` — ${all.length} lignes — archive complète avec colonne \`quality_tier\`

## Format de sortie (Smartlead-ready)

Séparateur : **virgule** (format CSV standard)
Encodage : **UTF-8** (pas de BOM)

\`\`\`csv
email,first_name,last_name,city,postal_code,specialty,source,source_url
\`\`\`

## Prochaines étapes

1. **Validation des emails** : passer \`premium.csv\` dans Bouncer (~28 € pour 4000 ; ~22 € pour le segment premium seul). Compter 10-20 % de morts.
2. **Warmup domaine** \`izisolo.com\` : 2-3 semaines minimum avant envoi en volume.
3. **Phase 1 — Test 50 mails** : prendre 50 lignes premium d'une source précise (ex: IFY) avec template ultra-personnalisé.
4. **Phase 2 — A/B test objet** : tester les 2 variantes documentées dans \`sequence-cold-email.md\` sur 200 mails.
5. **Phase 3 — Scale** : 400 mails/semaine sur 8 semaines pour couvrir la base premium.

Le segment \`generic\` est à attaquer **après** premium (template adapté) — ces emails sont souvent gérés par 1 personne mais avec un filtre spam plus strict.
Le segment \`noprenom\` est à attaquer **en dernier** (taux d'engagement plus faible attendu sans prénom).
`;

  fs.writeFileSync(path.join(OUTDIR, 'REPORT.md'), report, 'utf-8');

  console.log('');
  console.log('═'.repeat(60));
  console.log('RÉSUMÉ');
  console.log('═'.repeat(60));
  console.log(`  Prospects uniques  : ${stats.parsed}`);
  console.log(`  Doublons retirés   : ${duplicates}`);
  console.log('');
  console.log(`  🟢 Premium         : ${buckets.premium.length}`);
  console.log(`  🟡 Generic         : ${buckets.generic.length}`);
  console.log(`  🟠 Sans prénom     : ${buckets.noprenom.length}`);
  console.log('');
  console.log(`  Fichiers écrits dans : ${OUTDIR}`);
  console.log(`    • premium.csv`);
  console.log(`    • generic.csv`);
  console.log(`    • noprenom.csv`);
  console.log(`    • all.csv (archive)`);
  console.log(`    • REPORT.md`);
  console.log('═'.repeat(60));
}

main();
