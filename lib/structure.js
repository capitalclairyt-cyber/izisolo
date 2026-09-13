// ============================================================================
// IziSolo — Le type de structure (lot 0 du chantier Associations & Studios,
// 2026-09-13, PLAN-ASSOS-STUDIOS-2026.md §6.1)
// ----------------------------------------------------------------------------
// Une ligne `profiles` est une STRUCTURE : la prof seule (type `solo`), une
// association loi 1901 (`association`) ou un studio commercial (`studio`).
// Le type ne change RIEN à ce qui est enregistré (élèves, cours, argent) : il
// décide des libellés, du plan d'essai, de la présence des rubriques propres à
// chaque famille, et du numéro RNA demandé à une association.
//
// Ce fichier est PUR : aucune requête, aucun `window`, importable serveur
// comme navigateur, et testable sans base (verrou CI `freemium.spec.js`).
// ============================================================================

export const TYPES_STRUCTURE = {
  solo: {
    label: 'Prof à mon compte',
    description: 'Tu enseignes en ton nom, seule ou avec des remplaçantes de temps en temps.',
    // Le mot que l'app emploie pour parler de la structure à sa propriétaire.
    mot: 'studio',
    emoji: '🧘',
  },
  association: {
    label: 'Une association',
    description: 'Un bureau, des adhérentes, une ou plusieurs profs qui donnent les cours.',
    mot: 'association',
    emoji: '🤝',
  },
  studio: {
    label: 'Un studio',
    description: 'Un lieu, plusieurs intervenantes, une gérante qui suit les cours et les comptes.',
    mot: 'studio',
    emoji: '🏛️',
  },
};

export const CODES_STRUCTURE = Object.keys(TYPES_STRUCTURE);
export const TYPE_STRUCTURE_DEFAUT = 'solo';

/** Valeur sûre pour la base : un type inconnu devient `solo`, jamais une erreur. */
export function sanitizeTypeStructure(brut) {
  return CODES_STRUCTURE.includes(brut) ? brut : TYPE_STRUCTURE_DEFAUT;
}

/** Le type d'un profil, défaut `solo` (colonne absente ou nulle = la prof seule). */
export function typeStructure(profile) {
  return sanitizeTypeStructure(profile?.type_structure);
}

export function estAssociation(profile) {
  return typeStructure(profile) === 'association';
}

export function estStudio(profile) {
  return typeStructure(profile) === 'studio';
}

/**
 * Le plan qu'une structure ESSAIE pendant ses 30 jours, et celui qu'on lui
 * propose d'acheter en premier. Une prof seule essaie Complet (la boucle
 * élève, comme depuis toujours) ; une association essaie Association, un
 * studio essaie Studio : on n'essaie pas un produit pour en acheter un autre.
 */
export function planEssai(profile) {
  const t = typeStructure(profile);
  if (t === 'association') return 'asso';
  if (t === 'studio') return 'studio';
  return 'pro';
}

// ── Le numéro RNA ────────────────────────────────────────────────────────────
// Le numéro du Répertoire National des Associations : la lettre W suivie de
// neuf chiffres (« W751234567 »). Il figure sur le récépissé de déclaration en
// préfecture et sur la page de l'association au Journal officiel. Comme le
// SIRET (Luhn) ou l'IBAN (mod-97), on valide le FORMAT, pas l'existence : c'est
// le garde-fou contre le studio qui se déclarerait association pour payer
// moins, décision Colin du 13/09.

/** Normalise une saisie : majuscule, sans espaces ni tirets. `''` si vide. */
export function normaliserRna(brut) {
  return String(brut ?? '').toUpperCase().replace(/[\s.-]/g, '');
}

/** Vrai si la saisie, une fois normalisée, a la forme W + 9 chiffres. */
export function rnaValide(brut) {
  return /^W\d{9}$/.test(normaliserRna(brut));
}

/**
 * La valeur à ÉCRIRE en base : le RNA normalisé s'il est valide, sinon null.
 * On n'enregistre jamais un numéro difforme : mieux vaut un champ vide qu'un
 * faux numéro imprimé sur un reçu de cotisation.
 */
export function sanitizeRna(brut) {
  const n = normaliserRna(brut);
  return rnaValide(n) ? n : null;
}

/** « W751 234 567 », lisible à l'écran et sur les documents. */
export function formaterRna(rna) {
  const n = normaliserRna(rna);
  if (!rnaValide(n)) return n;
  return `${n.slice(0, 4)} ${n.slice(4, 7)} ${n.slice(7)}`;
}

/**
 * Le message d'erreur à afficher sous le champ, ou null si tout va bien.
 * Une association SANS RNA ne peut pas finir son onboarding (décision Colin),
 * une prof seule ou un studio n'en a pas.
 */
export function erreurRna(type, brut) {
  if (type !== 'association') return null;
  const n = normaliserRna(brut);
  if (!n) return "Le numéro RNA de l'association est obligatoire (il commence par W, sur ton récépissé de préfecture).";
  if (!rnaValide(n)) return 'Un numéro RNA, c\'est la lettre W suivie de neuf chiffres, par exemple W751234567.';
  return null;
}
