// ============================================================================
// IziSolo — Le pays d'un studio (v105, 2026-08-25)
// ----------------------------------------------------------------------------
// Déclencheur : Melyflow, prof de yoga à Genly (Belgique), inscrite le
// 2026-08-25. Elle n'était pas bloquée — son numéro d'entreprise passait — mais
// l'app lui affichait « SIRET : 14 chiffres » en rouge et imprimait « SIRET »
// sur ses factures. Une app qui dit à quelqu'un qu'il a tort alors qu'il a
// raison perd sa confiance en une capture d'écran.
//
// CE FICHIER EST LA SOURCE UNIQUE de tout ce qui dépend du pays. PUR : aucune
// requête, aucun `window`, testable sans base.
//
// ── Ce que ce module fait, et ce qu'il ne fait PAS ─────────────────────────
// Il porte l'IDENTITÉ LÉGALE (numéro d'entreprise, son libellé, son format) et
// dit quelles surfaces françaises s'éteignent ailleurs. Il ne porte AUCUN
// taux, AUCUN seuil, AUCUNE mention inventée : ces chiffres bougent d'une
// année à l'autre et se vérifient à la source. Une mention fiscale fausse
// imprimée sur une facture engage la prof, pas nous.
//
// C'est pourquoi `mentionDefaut` n'existe que pour la France (elle est stable
// et déjà en production depuis v84) : ailleurs on SUGGÈRE dans le placeholder
// et on laisse la prof valider. Rien ne s'imprime qu'elle n'ait relu.
//
// ⚠️ La Suisse n'est PAS dans ce catalogue : le franc suisse est un chantier à
// part (245 « € » écrits en dur dans des textes, des emails et des PDF).
// L'ajouter ici sans ça donnerait des montants faux, ce qui est pire que rien.
// ============================================================================

export const PAYS_DEFAUT = 'FR';

/**
 * Les pays servis. Une entrée = tout ce que le reste de l'app doit savoir.
 *
 *   identifiant.label       ce que la prof lit à l'écran ET sur sa facture
 *   identifiant.exemple     un vrai format, pour qu'elle reconnaisse le sien
 *   declarationSociale      l'organisme qui appelle les cotisations, ou null
 *                           quand la prof déclare elle-même (le cas français)
 *   livreRecettes           le registre chronologique est-il une obligation
 *                           qu'on outille ? (aujourd'hui : la France seule)
 *   apisLocales             a-t-on des autocomplétions pour ce pays ?
 */
export const PAYS = {
  FR: {
    code: 'FR',
    nom: 'France',
    drapeau: '🇫🇷',
    devise: 'EUR',
    locale: 'fr-FR',
    identifiant: {
      label: 'SIRET',
      // Exemple LISIBLE et valide au sens de Luhn : un placeholder qui ne
      // passe pas sa propre validation apprendrait un mauvais format.
      exemple: '123 456 789 00007',
      aide: 'Le numéro à 14 chiffres de ton établissement.',
    },
    mentionDefaut: 'TVA non applicable, art. 293 B du CGI.',
    mentionSuggeree: null,
    // La micro-entrepreneuse déclare SON chiffre d'affaires elle-même : c'est
    // ce qui rend le bloc URSSAF utile, et c'est une exception européenne.
    declarationSociale: { nom: 'URSSAF', autoDeclaree: true },
    livreRecettes: true,
    vacancesScolaires: true,
    apisLocales: true,
  },
  BE: {
    code: 'BE',
    nom: 'Belgique',
    drapeau: '🇧🇪',
    devise: 'EUR',
    locale: 'fr-BE',
    identifiant: {
      label: "Numéro d'entreprise",
      exemple: '0123.456.749',
      aide: 'Le numéro BCE à 10 chiffres, celui de ta publication au Moniteur.',
    },
    mentionDefaut: null,
    mentionSuggeree: 'Régime particulier de franchise des petites entreprises',
    // L'INASTI et la caisse d'assurances sociales APPELLENT les cotisations sur
    // une base qu'elles connaissent : il n'y a rien à déclarer trimestriellement
    // dans IziSolo. Traduire le bloc URSSAF ici serait inventer un besoin.
    declarationSociale: { nom: 'ta caisse d\'assurances sociales', autoDeclaree: false },
    livreRecettes: false,
    vacancesScolaires: false,
    apisLocales: false,
  },
  LU: {
    code: 'LU',
    nom: 'Luxembourg',
    drapeau: '🇱🇺',
    devise: 'EUR',
    locale: 'fr-LU',
    identifiant: {
      label: 'Numéro RCS',
      exemple: 'B123456',
      aide: 'Ton immatriculation au Registre de commerce et des sociétés.',
    },
    mentionDefaut: null,
    mentionSuggeree: 'Régime de franchise pour petites entreprises',
    declarationSociale: { nom: 'le CCSS', autoDeclaree: false },
    livreRecettes: false,
    vacancesScolaires: false,
    apisLocales: false,
  },
};

export const CODES_PAYS = Object.keys(PAYS);

/** Le pays d'un profil, toujours valide. Une valeur inconnue retombe sur FR :
 *  c'est l'état de 100 % des comptes existants, et le seul défaut sûr. */
export function paysDe(profileOuCode) {
  const code = typeof profileOuCode === 'string'
    ? profileOuCode
    : profileOuCode?.pays;
  return PAYS[String(code || '').toUpperCase()] || PAYS[PAYS_DEFAUT];
}

export function estFrance(profileOuCode) {
  return paysDe(profileOuCode).code === 'FR';
}

// ── L'identifiant d'entreprise ──────────────────────────────────────────────

const chiffres = (v) => String(v || '').replace(/[\s.\-/]/g, '');

/** Luhn sur 14 chiffres — la règle SIRET, inchangée depuis v84. */
function siretValide(n) {
  if (!/^\d{14}$/.test(n)) return false;
  let somme = 0;
  for (let i = 0; i < 14; i++) {
    let d = parseInt(n[i], 10);
    if (i % 2 === 0) { d *= 2; if (d > 9) d -= 9; }
    somme += d;
  }
  return somme % 10 === 0;
}

/**
 * Numéro d'entreprise belge : 10 chiffres, les 2 derniers valant
 * 97 − (les 8 premiers modulo 97).
 *
 * ⚠️ Le résultat reste INDICATIF (comme le SIRET l'a toujours été) : on
 * signale, on ne refuse jamais. Une prof qui a son numéro sous les yeux ne
 * doit pas être empêchée de travailler par notre arithmétique.
 */
function bceValide(n) {
  if (!/^[01]\d{9}$/.test(n)) return false;
  const base = parseInt(n.slice(0, 8), 10);
  const cle = parseInt(n.slice(8), 10);
  return 97 - (base % 97) === cle;
}

/**
 * Valide un identifiant d'entreprise selon le pays.
 * Retourne toujours { valide, message } — et `valide: true` sur une valeur
 * vide : l'identifiant reste optionnel partout (sans lui, l'élève télécharge
 * un reçu simple au lieu d'une facture, comme avant).
 */
export function validerIdentifiant(codePays, valeur) {
  const p = paysDe(codePays);
  const n = chiffres(valeur);
  if (!n) return { valide: true, message: '' };

  if (p.code === 'FR') {
    if (!/^\d{14}$/.test(n)) return { valide: false, message: 'SIRET : 14 chiffres' };
    return siretValide(n)
      ? { valide: true, message: '' }
      : { valide: false, message: 'SIRET invalide (vérification Luhn)' };
  }

  if (p.code === 'BE') {
    if (!/^\d{10}$/.test(n)) {
      return { valide: false, message: "Numéro d'entreprise : 10 chiffres" };
    }
    return bceValide(n)
      ? { valide: true, message: '' }
      : { valide: false, message: 'Vérifie ta saisie : la clé de contrôle ne tombe pas juste' };
  }

  // Luxembourg et tout pays futur : on vérifie qu'il y a quelque chose de
  // plausible, sans prétendre connaître une règle qu'on n'a pas vérifiée.
  const brut = String(valeur || '').trim();
  return brut.length >= 4
    ? { valide: true, message: '' }
    : { valide: false, message: 'Numéro trop court' };
}

/** Mise en forme lisible, par pays. Inconnu = rendu tel quel, jamais mutilé. */
export function formaterIdentifiant(codePays, valeur) {
  const p = paysDe(codePays);
  const n = chiffres(valeur);
  if (!n) return '';
  if (p.code === 'FR' && /^\d{14}$/.test(n)) {
    return `${n.slice(0, 3)} ${n.slice(3, 6)} ${n.slice(6, 9)} ${n.slice(9)}`;
  }
  if (p.code === 'BE' && /^\d{10}$/.test(n)) {
    return `${n.slice(0, 4)}.${n.slice(4, 7)}.${n.slice(7)}`;
  }
  return String(valeur || '').trim();
}

/** Le libellé imprimé sur une facture : « SIRET », « Numéro d'entreprise »… */
export function labelIdentifiant(codePays) {
  return paysDe(codePays).identifiant.label;
}

// ── Ce qui s'éteint hors de France ──────────────────────────────────────────

/**
 * La prof déclare-t-elle elle-même son chiffre d'affaires ?
 * En France oui (URSSAF, trimestriel ou mensuel). Ailleurs, une caisse appelle
 * les cotisations : afficher un bloc de déclaration serait inventer un geste
 * qui n'existe pas, et l'inviter à s'en occuper serait la déranger pour rien.
 */
export function aDeclarationAutomatisable(profileOuCode) {
  return !!paysDe(profileOuCode).declarationSociale?.autoDeclaree;
}

/** Le livre des recettes est-il une obligation qu'on outille pour ce pays ? */
export function aLivreRecettes(profileOuCode) {
  return !!paysDe(profileOuCode).livreRecettes;
}

/** A-t-on des autocomplétions locales (communes, registre des entreprises) ? */
export function aApisLocales(profileOuCode) {
  return !!paysDe(profileOuCode).apisLocales;
}

/** Les vacances scolaires par zone existent-elles pour ce pays ? */
export function aVacancesScolaires(profileOuCode) {
  return !!paysDe(profileOuCode).vacancesScolaires;
}

/**
 * La mention de régime à écrire par défaut sur les factures.
 * `null` hors de France, et c'est VOULU : on suggère dans le placeholder, la
 * prof valide. Imprimer une mention fiscale devinée engagerait sa
 * responsabilité sur un document qu'elle n'a pas relu.
 */
export function mentionParDefaut(profileOuCode) {
  return paysDe(profileOuCode).mentionDefaut;
}

export function mentionSuggeree(profileOuCode) {
  const p = paysDe(profileOuCode);
  return p.mentionDefaut || p.mentionSuggeree || '';
}
