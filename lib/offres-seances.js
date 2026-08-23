/**
 * Ce qu'un abonnement donne droit à faire — source unique.
 *
 * Un abonnement se décrit par DEUX colonnes, et le formulaire de création les
 * posait comme deux questions indépendantes jusqu'au 2026-08-23 :
 *
 *   - `seances`            = le TOTAL sur la période  (null = pas de total)
 *   - `seances_par_semaine`= la CADENCE maximale      (null = pas de cadence)
 *
 * Posées séparément, elles se contredisaient à l'écran (retour Colin) :
 * choisir « Illimitées » réclamait quand même une cadence, et un abonnement
 * « une fois par semaine » obligeait la prof à calculer elle-même son total
 * (32 séances pour une saison de septembre à juin).
 *
 * ⚠️ Le vrai dégât n'était pas le vocabulaire : la création partait sur une
 * cadence de 1×/semaine PAR DÉFAUT, sans jamais offrir « sans limite » (que
 * l'édition proposait, elle). 7 des 13 abonnements de la prod sont donc nés
 * « illimités » ET capés à une séance par semaine, en silence — cap appliqué
 * pour de vrai par /api/portail/[slug]/reserver (403 WEEKLY_LIMIT) et par
 * reserver-serie. Aucun écran n'affichait cette cadence : la prof ne pouvait
 * pas la voir sans rouvrir le formulaire d'édition.
 *
 * D'où ce module : les deux colonnes deviennent UN choix à trois branches,
 * écrit et relu au même endroit, et une phrase en français que toutes les
 * surfaces (formulaires, liste d'offres, portail, espace élève) affichent.
 *
 * Vocabulaire fermé, comme lib/modes-paiement.js : on valide à l'écriture
 * (payloadSeances) et on normalise à la lecture (modeSeances).
 */

/** Les trois façons de borner un abonnement. */
export const MODE_ILLIMITE = 'illimite'; // ni total ni cadence
export const MODE_CADENCE  = 'cadence';  // X séances par semaine, pas de total
export const MODE_TOTAL    = 'total';    // N séances au total (+ cadence facultative)

/** Un entier >= 1, ou null. Tout le reste (0, '', 'abc', -2) vaut « pas de limite ». */
function borne(v) {
  const n = parseInt(v, 10);
  return Number.isFinite(n) && n >= 1 ? n : null;
}

/**
 * Le mode d'une offre existante, déduit de ses deux colonnes.
 * Un total l'emporte : « 32 séances, 2 par semaine max » reste un total borné.
 * @param {{seances?: any, seances_par_semaine?: any}} offre
 * @returns {'illimite'|'cadence'|'total'}
 */
export function modeSeances(offre) {
  if (borne(offre?.seances)) return MODE_TOTAL;
  if (borne(offre?.seances_par_semaine)) return MODE_CADENCE;
  return MODE_ILLIMITE;
}

/**
 * Les deux colonnes à écrire, à partir du choix fait à l'écran.
 * Seul chemin d'écriture : création et édition passent par ici, pour qu'un
 * abonnement créé et le même abonnement réédité veuillent dire la même chose.
 * @param {{mode: string, total?: any, cadence?: any}} choix
 * @returns {{seances: number|null, seances_par_semaine: number|null}}
 */
export function payloadSeances({ mode, total, cadence } = {}) {
  if (mode === MODE_TOTAL) {
    return { seances: borne(total), seances_par_semaine: borne(cadence) };
  }
  if (mode === MODE_CADENCE) {
    // Pas de total : c'est tout l'intérêt du mode (« 1 fois par semaine » sans
    // que la prof multiplie par le nombre de semaines de sa saison).
    return { seances: null, seances_par_semaine: borne(cadence) };
  }
  // Illimité = les deux colonnes vides. Rien à calculer, rien qui bloque.
  return { seances: null, seances_par_semaine: null };
}

/**
 * La phrase courte affichée partout où l'offre se montre (carte d'offre,
 * grille du portail, espace élève). Neutre : lisible par la prof comme par
 * l'élève, aucune des deux n'est tutoyée.
 * @param {{seances?: any, seances_par_semaine?: any}} offre
 * @returns {string}
 */
export function libelleSeances(offre) {
  const total   = borne(offre?.seances);
  const cadence = borne(offre?.seances_par_semaine);

  if (total && cadence) {
    return `${total} séance${total > 1 ? 's' : ''} au total, ${cadence} par semaine maximum`;
  }
  if (total)   return `${total} séance${total > 1 ? 's' : ''} au total`;
  if (cadence) return `${cadence} séance${cadence > 1 ? 's' : ''} par semaine`;
  return 'Séances illimitées';
}

/**
 * La phrase d'aperçu du formulaire : plus longue, adressée à la prof, elle
 * dit ce que l'élève POURRA FAIRE une fois l'offre vendue. C'est le contrat
 * que le portail appliquera vraiment.
 * @param {{mode: string, total?: any, cadence?: any}} choix
 * @returns {string}
 */
export function apercuSeances({ mode, total, cadence } = {}) {
  const { seances, seances_par_semaine } = payloadSeances({ mode, total, cadence });

  if (seances && seances_par_semaine) {
    return `Elle pourra venir ${seances} fois en tout, avec au maximum ${seances_par_semaine} séance${seances_par_semaine > 1 ? 's' : ''} par semaine.`;
  }
  if (seances) {
    return `Elle pourra venir ${seances} fois sur la période, au rythme qu'elle veut.`;
  }
  if (seances_par_semaine) {
    return `Elle pourra venir ${seances_par_semaine} fois par semaine, sans nombre total à épuiser.`;
  }
  return 'Elle pourra venir à autant de séances qu\'elle veut, sans limite.';
}
