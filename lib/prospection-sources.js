/**
 * D'où vient l'adresse d'une prof qu'on démarche par email (2026-09-12).
 *
 * Source UNIQUE, partagée par scripts/prospect-du-jour.mjs (qui ne tire que
 * des lignes dont la source est nommable) et scripts/envoyer-email-prof.mjs
 * (dont le pied RGPD cite la phrase). Une source absente d'ici n'est pas
 * démarchable : on ne peut pas dire à quelqu'un où on a trouvé son adresse.
 *
 * Les clés sont celles de la colonne `source` de prospection/prospects-yoga-fr.csv
 * (hors dépôt) ; `site` = l'adresse vient de la page contact de son propre site.
 */
export const SOURCES = {
  site: 'ton adresse est sur la page contact de ton site',
  'annuaireduyoga.com': "ta fiche est publiée sur l'Annuaire du Yoga",
  'ify.fr': "ta fiche est publiée sur l'annuaire de l'Institut Français de Yoga",
  'chin-mudra.yoga': "ta fiche est publiée dans l'annuaire Chin Mudra",
  'viniyoga-fr': "ta fiche est publiée dans l'annuaire Viniyoga",
  'efyso.fr': "ta fiche est publiée sur l'annuaire de l'EFYSO",
  'gerardarnaud-yoga.com': "ta fiche est publiée sur l'annuaire des diplômées de Gérard Arnaud Yoga",
  'shanti-cercle.yoga': "ta fiche est publiée dans l'annuaire Shanti Cercle",
  'yoga-energie.fr': "ta fiche est publiée dans l'annuaire Yoga de l'Énergie",
  'yogaduson-fr': "ta fiche est publiée dans l'annuaire Yoga du Son",
  'shanti-yoga-ayurveda.fr': "ta fiche est publiée dans l'annuaire Shanti Yoga Ayurveda",
  'yogavision-paris': "ta fiche est publiée dans l'annuaire Yoga Vision",
  'iiy.fr': "ta fiche est publiée dans l'annuaire de l'Institut International de Yoga",
  IIY: "ta fiche est publiée dans l'annuaire de l'Institut International de Yoga",
  'ecole-yoga-fr': "ta fiche est publiée dans l'annuaire de l'École Française de Yoga",
};

/** Sources jamais démarchées, et pourquoi (le tirage les écarte). */
export const SOURCES_ECARTEES = {
  Sadhana: 'école locale de Maude, relation à ménager',
  'cartes-fédération': 'origine non identifiée, on ne saurait pas la citer',
  'annuaire-mouvement': 'annuaire fourni à la main, origine non citable',
};

export function sourceNommable(source) {
  return Object.prototype.hasOwnProperty.call(SOURCES, source);
}
