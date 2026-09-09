/**
 * Rétablir une séance annulée — source unique.
 *
 * Retour Maude, 2026-09-09 : deux séances de séries annulées (Yin Yoga du
 * 14/09, Yoga du 15/09) qu'elle voulait remettre, sans y parvenir. Constaté :
 * l'annulation était « définitive » par construction (la fiche ne proposait
 * que la corbeille), l'écran des séries comptait la date comme OCCUPÉE (donc
 * ni « + » sur la case, ni régénération par « Ajuster », qui dédoublonne sur
 * toutes les dates, annulées comprises), et recréer à la main fabriquait une
 * séance orpheline hors série. Le seul chemin (corbeille puis « + ») tenait
 * en deux écrans et n'était écrit nulle part ; avec des inscrites il les
 * effaçait.
 *
 * LE PRINCIPE : rétablir = la MÊME séance redevient normale. Même id, même
 * série, mêmes inscrites, jamais de doublon.
 *
 * CE QU'ON NE REFAIT PAS : l'annulation a déjà rendu les crédits « réellement
 * décomptés » (route annuler). On ne re-décompte rien au rétablissement, le
 * pointage s'en chargera comme pour n'importe quelle séance. Les inscrites
 * sont PRÉVENUES (elles ont reçu « séance annulée », elles doivent recevoir
 * « finalement maintenue »), celles qui avaient elles-mêmes annulé ne le sont
 * pas : elles ne viennent pas.
 */
import { presenceEstReservationActive } from './presences.js';

/** Peut-on rétablir cette séance ? { ok, raison } */
export function retablissable({ est_annule, date, aujourdhui } = {}) {
  if (!est_annule) return { ok: false, raison: 'Cette séance n\'est pas annulée.' };
  const auj = aujourdhui || new Date().toISOString().slice(0, 10);
  if (date && date < auj) {
    return { ok: false, raison: 'Cette séance est passée : elle ne peut plus avoir lieu. Pour du rattrapage d\'historique, recrée-la.' };
  }
  return { ok: true };
}

/**
 * Qui prévenir ? Les réservations encore actives (statut « inscrit », pas une
 * annulation tardive ni une résa annulée/déclinée). `presences` porte
 * `statut_pointage`, `annulation_tardive` et optionnellement `client`.
 */
export function planRetablissement({ presences = [] } = {}) {
  const aPrevenir = presences.filter(p => presenceEstReservationActive(p));
  return {
    nbInscrites: aPrevenir.length,
    aPrevenir,
    nbIgnorees: presences.length - aPrevenir.length,
  };
}

/** La phrase du confirm, avant de rétablir. */
export function apercuRetablissement(plan) {
  const tete = 'La séance redevient normale : même série, même horaire, réservable à nouveau.';
  if (!plan || plan.nbInscrites === 0) {
    return `${tete} Personne n'était inscrit·e, aucun email ne part.`;
  }
  const n = plan.nbInscrites;
  return `${tete} ${n} inscrit·e${n > 1 ? 's' : ''} ${n > 1 ? 'reçoivent' : 'reçoit'} un email « séance finalement maintenue ». Les carnets ne bougent pas : le pointage fera le décompte, comme d'habitude.`;
}

/** L'email à l'inscrite. `{{prenom}}` est remplacé par sendNotifEleve. */
export function emailRetablissement({ coursNom, dateStr, heureStr, lieu, studio } = {}) {
  const quand = `${dateStr || 'la date prévue'}${heureStr ? ` à ${heureStr}` : ''}`;
  return {
    sujet: `Séance maintenue — ${coursNom}`,
    corps:
`Bonjour {{prenom}},

Bonne nouvelle : la séance « ${coursNom} » du ${quand} a finalement lieu.${lieu ? `\nLieu : ${lieu}.` : ''}

Ta réservation est toujours valable, rien à faire de ton côté. Si tu ne peux plus venir, annule depuis ton espace.

À très vite,
${studio || 'Ton studio'}`,
    sms: `Seance maintenue : « ${coursNom} » du ${quand} a finalement lieu. Ta reservation est valable. — ${studio || 'Studio'}`,
  };
}
