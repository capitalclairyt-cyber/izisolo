/**
 * Changer les PLACES d'une série récurrente déjà créée — source unique.
 *
 * Retour Maude, 2026-09-09 : elle voulait passer « Yoga enfants » de 8 à 13
 * places et n'y arrivait pas. Constaté en base : une seule séance à 13 (celle
 * qu'elle avait ouverte), trente autres à 8, et la récurrence elle-même à 8.
 * Aucun écran ne permettait de régler la capacité d'une série entière : le
 * champ n'existait qu'à la création de la série et sur UNE séance.
 *
 * Le trou avait un second étage : la table `recurrences` porte sa propre
 * `capacite_max`, recopiée sur chaque séance que « Ajuster la série » ou
 * « Ajouter une occurrence » fabrique. Corriger les séances une par une ne
 * suffisait donc pas : toute prolongation renaissait à l'ancienne capacité.
 * D'où la règle : on écrit les séances à venir ET la récurrence, toujours
 * ensemble.
 *
 * CE QU'ON NE FAIT JAMAIS : retirer une inscrite. Si une séance à venir a déjà
 * plus d'inscrites que la nouvelle capacité, elle devient « sur-complète »
 * (plus de réservation possible, personne dehors) et l'aperçu le DIT avant
 * que la prof confirme.
 */

/**
 * Lit ce que la prof a tapé dans le champ « Places max ».
 * - vide → { ok: true, capacite: null }  (illimité, comme à la création)
 * - entier ≥ 1 → { ok: true, capacite: n }
 * - le reste → { ok: false, raison }
 */
export function parseCapacite(saisie) {
  const s = saisie == null ? '' : String(saisie).trim();
  if (s === '') return { ok: true, capacite: null };
  if (!/^\d+$/.test(s)) return { ok: false, raison: 'Un nombre entier de places, ou vide pour « illimité ».' };
  const n = parseInt(s, 10);
  if (n < 1) return { ok: false, raison: 'Au moins 1 place. Laisse vide pour « illimité ».' };
  return { ok: true, capacite: n };
}

/** Deux capacités égales au sens « rien à écrire » (null = illimité). */
export function capaciteInchangee(avant, apres) {
  return (avant ?? null) === (apres ?? null);
}

/**
 * Ce qui va se passer sur les séances À VENIR si on pose `capacite`.
 * `occurrences` = [{ id, date, inscrites }] (inscrites = formule v74,
 * lib/presences : une annulation tardive ne compte pas).
 */
export function planCapacite({ occurrences = [], capacite }) {
  const cap = capacite ?? null;
  const depassements = cap == null
    ? []
    : occurrences
      .filter(o => (o.inscrites || 0) > cap)
      .map(o => ({ id: o.id, date: o.date, inscrites: o.inscrites }));
  return {
    capacite: cap,
    nbSeances: occurrences.length,
    depassements,
  };
}

const fr = iso => {
  const [y, m, d] = String(iso || '').split('-');
  return d && m && y ? `${d}/${m}/${y}` : String(iso || '');
};

/** La phrase de l'aperçu, avant confirmation. */
export function apercuCapacite(plan) {
  if (!plan) return '';
  const n = plan.nbSeances;
  const sujet = n === 1 ? 'La séance à venir passe' : `Les ${n} séances à venir passent`;
  const tete = plan.capacite == null
    ? `${sujet} en places illimitées.`
    : `${sujet} à ${plan.capacite} place${plan.capacite > 1 ? 's' : ''}.`;
  if (!plan.depassements.length) return tete;
  const d = plan.depassements;
  const exemples = d.slice(0, 3).map(x => `${fr(x.date)} : ${x.inscrites}`).join(', ');
  const suite = d.length > 3 ? '…' : '';
  return `${tete} ${d.length} séance${d.length > 1 ? 's ont' : ' a'} déjà plus d'inscrites que ça (${exemples}${suite}) : personne n'est retiré, ${d.length > 1 ? 'elles restent' : 'elle reste'} complète${d.length > 1 ? 's' : ''} jusqu'à ce que ça se libère.`;
}
