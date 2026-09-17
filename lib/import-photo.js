// ============================================================================
// IziSolo — Lire une LISTE d'élèves sur une photo (2026-09-17)
// ----------------------------------------------------------------------------
// L'import par photo (v51) lit UNE fiche : une carte de visite, une fiche
// d'inscription. Son prompt le dit en toutes lettres (« UN seul contact »,
// « s'il y a plusieurs contacts, prends le plus visible »). Maude, qui montait
// le compte d'Atout Gym avec le listing papier de l'association, s'est heurtée
// à ça le 17/09 : trente élèves, trente photos.
//
// Ce module ajoute le mode LISTE. Il est PUR : aucune requête, aucun `window`,
// donc testable sans base (verrou CI `import-photo.spec.js`).
//
// ⚠️ LA décision de conception : on ne construit PAS un second tunnel d'import.
// `lignesVersRows` rend exactement la forme que `parseCSV` rend (un tableau de
// tableaux, en-têtes en première ligne), donc la photo retombe sur l'écran
// d'aperçu existant : correspondance des colonnes, relecture avant
// enregistrement, dédup par email, invitation groupée. Une liste manuscrite mal
// lue qui entrerait en base sans relecture, ce serait trente fiches à corriger
// à la main : l'aperçu n'est pas une politesse, c'est le garde-fou.
// ============================================================================

/** Les champs qu'on sait lire, dans l'ordre des colonnes rendues. */
export const CHAMPS_PHOTO = ['prenom', 'nom', 'email', 'telephone', 'date_naissance', 'ville', 'notes'];

/**
 * Les en-têtes posés en première ligne. Ils sont écrits avec les mots que
 * l'auto-mapping de l'écran d'import reconnaît déjà (`TARGETS.syn`) : la photo
 * arrive donc pré-mappée, sans toucher à cet écran.
 */
export const EN_TETES_PHOTO = ['Prénom', 'Nom', 'Email', 'Téléphone', 'Date de naissance', 'Ville', 'Notes'];

/**
 * Plafond de lignes par photo. Au-delà, ce n'est plus une liste papier mais un
 * export, et le bon outil est le CSV. Le plafond sert aussi à borner la sortie
 * du modèle : sans lui, une grande image pourrait faire dépasser maxTokens et
 * rendre un JSON tronqué, donc illisible.
 */
export const MAX_LIGNES_PHOTO = 60;

/**
 * Place pour la sortie. Une ligne fait 60 à 90 tokens de JSON ; 60 lignes plus
 * le « thinking » d'Opus tiennent largement ici. Le mode fiche reste à 1500.
 */
export const MAX_TOKENS_LISTE = 8000;

const texte = (v, max) => {
  if (v == null) return '';
  const s = String(v).replace(/\s+/g, ' ').trim();
  if (!s || s.toLowerCase() === 'null') return '';
  return s.slice(0, max);
};

/**
 * Une date lisible, ou rien. On accepte l'ISO et le JJ/MM/AAAA français (la
 * route d'import sait lire les deux), on refuse tout le reste plutôt que
 * d'enregistrer une date douteuse. Jamais de correction silencieuse.
 */
export function normaliserDatePhoto(brut) {
  const s = texte(brut, 12);
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const m = s.match(/^(\d{1,2})[/.\-](\d{1,2})[/.\-](\d{4})$/);
  if (!m) return '';
  const [, j, mo, a] = m;
  const jj = Number(j), mm = Number(mo);
  if (jj < 1 || jj > 31 || mm < 1 || mm > 12) return '';
  return `${a}-${String(mm).padStart(2, '0')}-${String(jj).padStart(2, '0')}`;
}

/**
 * Une ligne saine, ou null. Même règle d'existence que la route d'import :
 * il faut au moins un prénom, un nom ou un email. Une ligne de total, un
 * en-tête de tableau recopié ou une case vide tombent ici.
 */
export function sanitizeLignePhoto(brut) {
  if (!brut || typeof brut !== 'object') return null;
  const l = {
    prenom: texte(brut.prenom, 120),
    nom: texte(brut.nom, 120),
    email: texte(brut.email, 254).toLowerCase(),
    telephone: texte(brut.telephone, 40),
    date_naissance: normaliserDatePhoto(brut.date_naissance),
    ville: texte(brut.ville, 120),
    notes: texte(brut.notes, 1000),
  };
  if (!l.prenom && !l.nom && !l.email) return null;
  return l;
}

/**
 * Le tableau rendu par le modèle, passé au tamis.
 * @returns {{ lignes: object[], ignorees: number, tronque: boolean }}
 *   `tronque` : le modèle a rendu autant de lignes que le plafond, donc il en
 *   reste peut-être. On le DIT à l'écran plutôt que de laisser croire que la
 *   page entière est passée.
 */
export function sanitizeLignesPhoto(brut) {
  const entree = Array.isArray(brut) ? brut : [];
  const lignes = [];
  let ignorees = 0;
  for (const b of entree) {
    if (lignes.length >= MAX_LIGNES_PHOTO) { ignorees++; continue; }
    const l = sanitizeLignePhoto(b);
    if (l) lignes.push(l); else ignorees++;
  }
  return { lignes, ignorees, tronque: entree.length >= MAX_LIGNES_PHOTO };
}

/**
 * Les lignes au format de `parseCSV` : en-têtes puis une ligne par personne.
 * C'est ce qui permet à l'écran d'import de ne rien savoir de la photo.
 */
export function lignesVersRows(lignes) {
  const saines = Array.isArray(lignes) ? lignes : [];
  return [EN_TETES_PHOTO, ...saines.map(l => CHAMPS_PHOTO.map(c => l?.[c] || ''))];
}

/** « 12 élèves lues », pour l'écran. */
export function resumeLecture({ lignes = [], ignorees = 0, tronque = false } = {}) {
  const n = lignes.length;
  const parts = [`${n} ${n > 1 ? 'élèves lues' : 'élève lue'}`];
  if (ignorees > 0) parts.push(`${ignorees} ${ignorees > 1 ? 'lignes ignorées' : 'ligne ignorée'}`);
  if (tronque) parts.push('la liste est peut-être plus longue, photographie la suite à part');
  return parts.join(' · ');
}

/**
 * Le prompt du mode liste. Il vit ici, pas dans la route, pour être figé par
 * le verrou CI : c'est lui qui interdit d'inventer, et c'est la seule chose
 * qui nous sépare d'une base d'élèves imaginaire.
 */
export function promptListe(max = MAX_LIGNES_PHOTO) {
  return `Tu lis la photo d'une LISTE d'élèves fournie par une prof de yoga, pilates ou bien-être : un listing papier, un cahier d'inscriptions, un tableau imprimé ou manuscrit, une capture de tableur.

Réponds UNIQUEMENT par un tableau JSON valide, sans aucun texte autour. Un objet par personne, avec exactement ces clés :
[{ "prenom": string|null, "nom": string|null, "email": string|null, "telephone": string|null, "date_naissance": string|null, "ville": string|null, "notes": string|null }]

Règles strictes :
- N'invente RIEN. Une information absente, illisible ou incertaine vaut null. Mieux vaut une ligne incomplète qu'une ligne fausse : la prof relit tout avant d'enregistrer.
- UNE personne par objet, dans l'ordre de la liste. N'en fusionne aucune, n'en dédouble aucune.
- Si une colonne contient "MARTIN Sophie" ou "Sophie MARTIN", sépare en "nom" et "prenom". En cas de doute sur lequel est lequel, mets le tout dans "nom" et laisse "prenom" à null.
- Ne rends PAS les en-têtes du tableau, les lignes de total, les numéros de page ni les mentions de bas de page.
- "telephone" : format français lisible si possible (ex. "06 12 34 56 78").
- "date_naissance" : format ISO AAAA-MM-JJ. Les dates manuscrites françaises sont JJ/MM/AAAA (ex. "05/12/1990" donne "1990-12-05"). null si absente ou ambiguë.
- "notes" : uniquement une information utile réellement lue sur la ligne de cette personne (niveau, cours suivi, contrainte, blessure). Jamais une description de l'image, jamais une information déjà mise dans un autre champ. null s'il n'y a rien.
- Au plus ${max} personnes. S'il y en a davantage, rends les ${max} premières.
- Si l'image ne contient aucune liste de personnes, réponds par un tableau vide [].`;
}
