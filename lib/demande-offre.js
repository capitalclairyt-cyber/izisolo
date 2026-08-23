/**
 * « Je veux cette offre » — règles pures de la demande d'offre (v97).
 *
 * Demande Colin (2026-08-23) : « il faut aussi que les élèves puissent voir
 * les offres dispo du studio et faire une demande, la prof valide ensuite de
 * son côté et gère le paiement ».
 *
 * CE QU'UNE DEMANDE N'EST PAS : une vente. Elle ne crée ni abonnement ni
 * paiement, ne réserve aucune place, et ne donne aucun droit à l'élève tant
 * que la prof n'a rien validé. Toute la valeur du geste tient dans cette
 * séparation : c'est elle qui permet d'encaisser en espèces au cours suivant,
 * en chèque, ou en trois fois, sans qu'IziSolo prétende savoir.
 *
 * L'écran de l'élève doit donc dire la vérité : « demande envoyée », jamais
 * « offre achetée ».
 *
 * Module sans dépendance : importable par les specs Node pures.
 */

export const STATUTS_DEMANDE_OFFRE = {
  nouvelle: { label: 'À traiter', ton: 'warning' },
  acceptee: { label: 'Acceptée', ton: 'success' },
  refusee: { label: 'Écartée', ton: 'neutral' },
};

const texte = (v, max) => {
  const s = String(v ?? '').trim();
  if (!s) return null;
  return s.length > max ? s.slice(0, max) : s;
};

/**
 * Nettoie ce qui arrive du portail. Deux identités possibles : une fiche
 * connue (élève connectée) ou de simples coordonnées (prospecte sur la grille
 * publique). Dans les deux cas il faut de quoi RECONTACTER : une demande dont
 * on ne sait pas à qui répondre n'a aucune valeur pour la prof.
 *
 * @returns {{ok: boolean, erreur?: string, valeurs?: object}}
 */
export function sanitizeDemandeOffre(brut = {}) {
  const offreId = texte(brut.offreId, 60);
  if (!offreId) return { ok: false, erreur: 'Offre introuvable.' };

  const clientId = texte(brut.clientId, 60);
  const email = texte(brut.email, 160)?.toLowerCase() || null;
  const prenom = texte(brut.prenom, 80);

  if (!clientId) {
    if (!prenom) return { ok: false, erreur: 'Ton prénom, pour que ta prof sache qui demande.' };
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
      return { ok: false, erreur: 'Une adresse email valide, pour qu\'elle puisse te répondre.' };
    }
  }

  return {
    ok: true,
    valeurs: {
      offre_id: offreId,
      client_id: clientId || null,
      prenom,
      nom: texte(brut.nom, 80),
      email,
      message: texte(brut.message, 1000),
    },
  };
}

/** Le nom à afficher à la prof, quelle que soit la porte d'entrée. */
export function nomDemandeur(demande = {}) {
  const fiche = demande.clients || demande.client;
  const depuisFiche = [fiche?.prenom, fiche?.nom].filter(Boolean).join(' ').trim();
  if (depuisFiche) return depuisFiche;
  const libre = [demande.prenom, demande.nom].filter(Boolean).join(' ').trim();
  return libre || demande.email || 'Quelqu\'un';
}

/** L'email de contact, fiche d'abord (elle fait foi), coordonnées ensuite. */
export function emailDemandeur(demande = {}) {
  const fiche = demande.clients || demande.client;
  return fiche?.email || demande.email || null;
}

/**
 * La demande vient-elle d'une personne SANS fiche ? La prof doit le savoir :
 * accepter voudra dire créer la fiche au passage.
 */
export function estProspect(demande = {}) {
  return !demande.client_id;
}

/**
 * Ce que l'élève lit après avoir demandé. Le mot « demande » y est central :
 * promettre l'offre serait mentir, la prof n'a encore rien validé.
 */
export function confirmationEleve({ offreNom = '', studioNom = '' } = {}) {
  const offre = offreNom ? ` pour « ${offreNom} »` : '';
  const studio = studioNom || 'ton studio';
  return `Demande envoyée${offre}. ${studio} la reçoit et revient vers toi pour le règlement. `
    + 'Rien n\'est débité, rien n\'est réservé pour l\'instant.';
}

/**
 * La ligne que la prof voit dans sa file. Elle dit qui, quoi, et depuis quand
 * (une demande de trois semaines n'a pas le même poids qu'une d'hier).
 */
export function resumeDemande(demande = {}, maintenant = new Date()) {
  const nom = nomDemandeur(demande);
  const jours = Math.floor((maintenant - new Date(demande.created_at)) / 86400000);
  const quand = !Number.isFinite(jours) ? ''
    : jours <= 0 ? "aujourd'hui"
    : jours === 1 ? 'hier'
    : `il y a ${jours} jours`;
  return { nom, quand, prospect: estProspect(demande) };
}
