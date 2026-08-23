/**
 * Inscrire un·e élève sur TOUT ou PARTIE d'une série récurrente — règles pures.
 *
 * Retour Maude (2026-08-23, depuis l'écran de pointage) : « on doit pouvoir
 * inscrire l'élève soi même sur toute la récurrence des cours ». Jusque-là,
 * « Ajouter des élèves » n'inscrivait que sur LA séance affichée : pour une
 * élève qui vient tous les lundis, il fallait rouvrir chaque séance de la
 * saison, une par une.
 *
 * Côté élève, la réservation en série existait déjà (/api/portail/[slug]/
 * reserver-serie) ; côté prof, non.
 *
 * LES RÈGLES, toutes défendables devant une prof :
 *   • on n'inscrit que sur les séances À VENIR, jamais dans le passé (une
 *     présence rétroactive fausserait l'historique et les carnets) ;
 *   • jamais sur une séance ANNULÉE ;
 *   • jamais deux fois la même personne sur la même séance (dédup contre
 *     l'existant, pas contre l'espoir) ;
 *   • la séance affichée n'est pas concernée : elle est traitée par le chemin
 *     d'ajout normal, qui gère l'écran et les carnets.
 *
 * Module sans dépendance : importable par les specs Node pures.
 */

export const PORTEE_SEULE = 'seule';   // cette séance uniquement (défaut)
export const PORTEE_TOUTES = 'toutes'; // toutes les séances à venir de la série
export const PORTEE_N = 'n';           // les N prochaines

/**
 * Les séances de la série sur lesquelles on va inscrire, en plus de celle
 * affichée. Toujours triées par date : « les 4 prochaines » doit vouloir dire
 * les 4 plus proches, quel que soit l'ordre d'arrivée des lignes.
 *
 * @param {object} p
 * @param {Array<{id: string, date: string, est_annule?: boolean}>} p.occurrences  la série entière
 * @param {{id: string, date: string}} p.coursActuel  la séance affichée
 * @param {string} p.portee   'seule' | 'toutes' | 'n'
 * @param {number} [p.nb]     pour 'n'
 * @param {string} [p.aujourdhui] AAAA-MM-JJ (défaut : la date du cours affiché)
 * @returns {Array<{id: string, date: string}>}
 */
export function occurrencesCibles({ occurrences, coursActuel, portee, nb, aujourdhui } = {}) {
  if (portee !== PORTEE_TOUTES && portee !== PORTEE_N) return [];
  if (!coursActuel?.date) return [];

  // Plancher : après la séance affichée, ET jamais avant aujourd'hui. Pointer
  // une séance passée puis « inscrire sur la suite » ne doit pas ressusciter
  // les séances intermédiaires, elles aussi passées.
  const plancher = aujourdhui && aujourdhui > coursActuel.date ? aujourdhui : coursActuel.date;

  const eligibles = (occurrences || [])
    .filter(o => o?.id && o?.date)
    .filter(o => o.id !== coursActuel.id)
    .filter(o => o.date >= plancher)
    .filter(o => o.est_annule !== true)
    .sort((a, b) => a.date.localeCompare(b.date));

  if (portee === PORTEE_TOUTES) return eligibles;
  const n = parseInt(nb, 10);
  return Number.isFinite(n) && n > 0 ? eligibles.slice(0, n) : [];
}

/**
 * Les lignes `presences` à insérer, dédupliquées contre l'existant.
 *
 * @param {object} p
 * @param {Array<{id: string}>} p.cibles          séances visées
 * @param {string[]} p.clientIds                  élèves à inscrire
 * @param {Array<{cours_id: string, client_id: string}>} p.dejaInscrits
 * @param {string} p.profileId
 * @param {string} [p.typePresence]               'normal' par défaut
 * @returns {{lignes: Array<object>, ignorees: number}}
 */
export function lignesInscription({ cibles, clientIds, dejaInscrits, profileId, typePresence } = {}) {
  const deja = new Set((dejaInscrits || []).map(d => `${d.cours_id}|${d.client_id}`));
  const lignes = [];
  let ignorees = 0;

  for (const cible of (cibles || [])) {
    for (const clientId of (clientIds || [])) {
      if (!cible?.id || !clientId) continue;
      if (deja.has(`${cible.id}|${clientId}`)) { ignorees++; continue; }
      lignes.push({
        profile_id: profileId,
        cours_id: cible.id,
        client_id: clientId,
        // Jamais de pré-liaison de carnet : la résolution officielle se fait
        // au pointage par le RPC (v64/v70/v82). Pré-lier ici a déjà fait
        // décompter le mauvais carnet.
        abonnement_id: null,
        pointee: false,
        statut_pointage: 'inscrit',
        type_presence: typePresence || 'normal',
      });
    }
  }
  return { lignes, ignorees };
}

/**
 * La phrase de compte rendu. Elle dit ce qui a été fait ET ce qui a été
 * ignoré : un « c'est fait » qui tait 12 doublons laisse croire à un bug le
 * jour où la prof recompte.
 */
export function resumeInscription({ nbEleves = 0, nbSeances = 0, ignorees = 0 } = {}) {
  if (nbSeances === 0) return '';
  const eleves = `${nbEleves} élève${nbEleves > 1 ? 's' : ''}`;
  const seances = `${nbSeances} séance${nbSeances > 1 ? 's' : ''} à venir`;
  let phrase = `${eleves} inscrit${nbEleves > 1 ? 's' : ''} sur ${seances}.`;
  if (ignorees > 0) {
    phrase += ` ${ignorees} inscription${ignorees > 1 ? 's' : ''} existai${ignorees > 1 ? 'en' : ''}t déjà, ignorée${ignorees > 1 ? 's' : ''}.`;
  }
  return phrase;
}

/**
 * L'aperçu AVANT de valider : ce que la prof s'apprête à faire.
 * Sans lui, « toute la série » est un saut dans le vide.
 */
export function apercuPortee({ portee, cibles = [], nbEleves = 1 } = {}) {
  if (portee === PORTEE_SEULE || cibles.length === 0) return 'Uniquement cette séance.';
  const der = cibles[cibles.length - 1];
  const fr = (iso) => { const [y, m, d] = String(iso).split('-'); return `${d}/${m}/${y}`; };
  const total = cibles.length * Math.max(1, nbEleves);
  return `Cette séance + ${cibles.length} séance${cibles.length > 1 ? 's' : ''} à venir, `
    + `jusqu'au ${fr(der.date)} (${total} inscription${total > 1 ? 's' : ''} au total).`;
}
