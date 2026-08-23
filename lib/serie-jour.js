/**
 * Changer le JOUR d'une série récurrente déjà créée — source unique.
 *
 * Le 2026-08-22, le jour est devenu un CHOIX à la création (avant, il était
 * déduit de la date de départ : démarrer un samedi fabriquait une série du
 * samedi, en silence). Le rattrapage avait été laissé de côté ce jour-là.
 * Retour Colin le 2026-08-23 : « on devrait avoir la modif du jour sur cet
 * écran pour les cours récurrents ».
 *
 * LE PRINCIPE : on ne supprime ni ne recrée RIEN. Chaque séance à venir garde
 * son identité, ses inscrites, son historique, et se DÉCALE d'un même nombre
 * de jours. Régénérer la série ferait perdre les réservations : c'est
 * exactement ce que la prof faisait à la main faute de mieux.
 *
 * LA LOI DU DÉCALAGE : on avance de 1 à 6 jours, JAMAIS en arrière — même
 * règle qu'à la création. Reculer ferait passer une séance de cette semaine
 * dans le passé, ou avant une séance déjà pointée.
 *
 * CE QUI RESTE INTERDIT (serieDeplacable) : les fréquences où le jour de la
 * semaine ne veut rien dire (mensuel = un jour du mois), les séries à
 * plusieurs jours (« lundis et jeudis » : il n'y a pas UN jour à changer), et
 * les séries dont les séances à venir ne tombent pas toutes le même jour —
 * un décalage uniforme y produirait un planning incohérent.
 */
import { parseDate, toDateStr } from './dates.js';

export const JOURS_SEMAINE = [
  { value: 1, label: 'Lun' },
  { value: 2, label: 'Mar' },
  { value: 3, label: 'Mer' },
  { value: 4, label: 'Jeu' },
  { value: 5, label: 'Ven' },
  { value: 6, label: 'Sam' },
  { value: 7, label: 'Dim' },
];

/** Au singulier : « le samedi devient mercredi ». */
export const JOUR_LONG = {
  1: 'lundi', 2: 'mardi', 3: 'mercredi', 4: 'jeudi',
  5: 'vendredi', 6: 'samedi', 7: 'dimanche',
};

/** Au pluriel : « tous les mercredis ». */
export const JOUR_LONG_PLURIEL = {
  1: 'lundis', 2: 'mardis', 3: 'mercredis', 4: 'jeudis',
  5: 'vendredis', 6: 'samedis', 7: 'dimanches',
};

/** Jour de la semaine d'une date ISO : 1 = lundi … 7 = dimanche. */
export function jourDeLaSemaine(dateISO) {
  if (!dateISO) return null;
  const d = parseDate(dateISO).getDay();
  return d === 0 ? 7 : d;
}

/**
 * De combien de jours faut-il avancer pour passer de `jourActuel` à
 * `jourVise` ? Toujours vers l'avant : 0 (même jour) à 6.
 */
export function deltaVersJour(jourActuel, jourVise) {
  if (!jourActuel || !jourVise) return 0;
  return (jourVise - jourActuel + 7) % 7;
}

/** Une date ISO avancée de `delta` jours (heure locale : pas de dérive DST). */
export function decalerJours(dateISO, delta) {
  if (!dateISO) return dateISO;
  const n = Number(delta);
  if (!Number.isFinite(n) || n === 0) return dateISO;
  const d = parseDate(dateISO);
  d.setDate(d.getDate() + n);
  return toDateStr(d);
}

/**
 * Prochaine date >= dateISO qui tombe un jour cible. Sert au recalage quand la
 * prof choisit le jour d'une série à la CRÉATION : on ne recule jamais, une
 * série ne doit pas démarrer avant la date saisie.
 */
export function prochaineOccurrenceJour(dateISO, jourCible) {
  if (!dateISO || !jourCible) return dateISO;
  return decalerJours(dateISO, deltaVersJour(jourDeLaSemaine(dateISO), jourCible));
}

/**
 * Cette série peut-elle changer de jour ?
 * @param {object} p
 * @param {string} p.frequence         'hebdomadaire' | 'bimensuel' | 'mensuel' | 'personnalise'
 * @param {number[]} [p.joursSemaine]  jours configurés sur la récurrence
 * @param {Array<{date: string}>} [p.occurrences] séances À VENIR
 * @returns {{ok: boolean, raison?: string, jourActuel?: number}}
 */
export function serieDeplacable({ frequence, joursSemaine, occurrences } = {}) {
  if (frequence && !['hebdomadaire', 'bimensuel'].includes(frequence)) {
    return {
      ok: false,
      raison: frequence === 'mensuel'
        ? 'Cette série suit un jour du mois, pas un jour de la semaine.'
        : 'Cette série tourne sur plusieurs jours : change-les depuis la création d\'une nouvelle série.',
    };
  }
  if (joursSemaine?.length > 1) {
    return { ok: false, raison: 'Cette série tourne sur plusieurs jours : il n\'y a pas un seul jour à déplacer.' };
  }
  const dates = (occurrences || []).map(o => o?.date).filter(Boolean);
  if (!dates.length) {
    return { ok: false, raison: 'Il n\'y a plus de séance à venir dans cette série.' };
  }
  const jours = [...new Set(dates.map(jourDeLaSemaine))];
  if (jours.length > 1) {
    return {
      ok: false,
      raison: 'Les séances à venir ne tombent pas toutes le même jour : les décaler ensemble donnerait un planning incohérent.',
    };
  }
  return { ok: true, jourActuel: jours[0] };
}

/**
 * Le plan de déplacement : ce qui va bouger, et de combien.
 * Aucune écriture ici — c'est ce que l'écran affiche AVANT de confirmer, et
 * ce que la sauvegarde applique ensuite. Une seule vérité pour les deux.
 *
 * @param {object} p
 * @param {Array<{id: string, date: string, inscrites?: number}>} p.occurrences séances à venir
 * @param {number} p.jourVise  1..7
 * @returns {{delta: number, jourActuel: number|null, mouvements: Array, nbInscrites: number, nbSeancesAvecInscrites: number}}
 */
export function planDeplacement({ occurrences, jourVise } = {}) {
  const liste = (occurrences || []).filter(o => o?.id && o?.date)
    .slice().sort((a, b) => a.date.localeCompare(b.date));
  const jourActuel = liste.length ? jourDeLaSemaine(liste[0].date) : null;
  const delta = deltaVersJour(jourActuel, jourVise);
  const mouvements = delta === 0 ? [] : liste.map(o => ({
    id: o.id,
    de: o.date,
    vers: decalerJours(o.date, delta),
    inscrites: o.inscrites || 0,
  }));
  const avecInscrites = mouvements.filter(m => m.inscrites > 0);
  return {
    delta,
    jourActuel,
    mouvements,
    nbSeancesAvecInscrites: avecInscrites.length,
    nbInscrites: avecInscrites.reduce((s, m) => s + m.inscrites, 0),
  };
}

/**
 * La phrase que l'écran affiche avant de confirmer. Elle doit dire les trois
 * choses qu'on ne peut pas deviner : de combien on avance, ce que devient la
 * première séance, et combien d'élèves sont déjà inscrites dessus.
 */
export function apercuDeplacement(plan) {
  if (!plan || !plan.delta) return '';
  const { delta, jourActuel, mouvements, nbSeancesAvecInscrites, nbInscrites } = plan;
  const premier = mouvements[0];
  const jourVise = premier ? jourDeLaSemaine(premier.vers) : null;
  const fr = iso => { const [y, m, d] = iso.split('-'); return `${d}/${m}/${y}`; };
  let phrase = `Chaque séance à venir avance de ${delta} jour${delta > 1 ? 's' : ''} : `
    + `le ${JOUR_LONG[jourActuel]} devient ${JOUR_LONG[jourVise]}.`;
  if (premier) phrase += ` La prochaine passe du ${fr(premier.de)} au ${fr(premier.vers)}.`;
  if (nbSeancesAvecInscrites > 0) {
    phrase += ` ${nbInscrites} inscription${nbInscrites > 1 ? 's' : ''} sur ${nbSeancesAvecInscrites} séance${nbSeancesAvecInscrites > 1 ? 's' : ''} : `
      + 'elles suivent le déplacement, préviens ces élèves.';
  }
  return phrase;
}
