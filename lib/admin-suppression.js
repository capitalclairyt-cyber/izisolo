// ============================================================================
// IziSolo — Suppression d'un studio depuis l'admin (2026-08-22, demande Colin :
// « les comptes de test vont être nombreux », studios d'entraînement de Maude)
// ----------------------------------------------------------------------------
// C'est l'opération la plus destructive de l'app : supprimer le compte auth
// d'une prof efface EN CASCADE tout ce qu'elle possède (profiles.id référence
// auth.users(id) ON DELETE CASCADE, et ~40 tables référencent profiles avec
// ON DELETE CASCADE). Rien n'est récupérable ensuite.
//
// D'où la mécanique en trois temps, dont ce module tient les règles :
//   1. INVENTAIRE : on montre ce qui va disparaître AVANT de proposer le
//      bouton. Un studio vivant ne se supprime pas par mégarde parce qu'on a
//      confondu deux lignes de la liste.
//   2. REFUS : certains cas ne se suppriment pas du tout (son propre compte,
//      un abonnement Stripe encore actif).
//   3. AVERTISSEMENTS : le reste passe, mais bruyamment (factures émises,
//      argent encaissé, compte qui ne ressemble pas à un compte de test).
//
// Module PUR : aucune dépendance, testable en spec Node (urssaf-style).
// Verrou CI : admin-suppression.spec.js.
// ============================================================================

/** La confirmation tapée doit être le nom EXACT du studio (espaces en trop tolérés). */
export function confirmationValide(saisie, attendu) {
  const norm = (v) => String(v ?? '').trim().replace(/\s+/g, ' ');
  const a = norm(attendu);
  if (!a) return false;                      // studio sans nom : on ne devine pas
  return norm(saisie) === a;
}

/**
 * Motifs de REFUS — la suppression n'a pas lieu, quoi qu'on tape.
 * @returns {string[]} vide = on peut continuer
 */
export function motifsDeRefus({ profil = {}, adminUserId = null } = {}) {
  const motifs = [];

  if (adminUserId && profil.id === adminUserId) {
    motifs.push('C\'est ton propre compte. On ne se supprime pas soi-même depuis l\'admin.');
  }

  // Un abonnement encore actif chez Stripe continuerait de facturer un compte
  // qui n'existe plus, et le webhook n'aurait plus de profil à mettre à jour.
  if (['active', 'trialing', 'past_due'].includes(profil.stripe_subscription_status || '')) {
    motifs.push(
      `L'abonnement IziSolo est encore « ${profil.stripe_subscription_status} » chez Stripe. `
      + 'Résilie-le dans Stripe avant de supprimer le compte, sinon le prélèvement continue.'
    );
  }

  return motifs;
}

/**
 * Avertissements — la suppression reste possible, mais on regarde à deux fois.
 * @returns {Array<{niveau: 'grave'|'attention', texte: string}>}
 */
export function avertissements({ inventaire = {}, estTest = false } = {}) {
  const out = [];
  const n = (v) => Number(v) || 0;

  // Les factures sont des pièces COMPTABLES numérotées : les détruire, ce
  // n'est pas perdre une donnée d'app, c'est perdre un document légal que
  // l'élève ou son CSE peut encore réclamer.
  if (n(inventaire.factures) > 0) {
    out.push({
      niveau: 'grave',
      texte: `${inventaire.factures} facture(s) émise(s) seront détruites. Ce sont des pièces comptables numérotées, réclamables par les élèves et leur CSE.`,
    });
  }

  if (n(inventaire.encaisse) > 0) {
    out.push({
      niveau: 'grave',
      texte: `${inventaire.encaisse} € réellement encaissés disparaîtront de la compta, avec le livre des recettes qui va avec.`,
    });
  }

  if (!estTest) {
    out.push({
      niveau: 'grave',
      texte: 'Ce compte ne ressemble PAS à un compte de test (ni email @example.com, ni studio de démo). Vérifie que tu es sur la bonne fiche.',
    });
  }

  if (n(inventaire.clients) > 0) {
    out.push({
      niveau: 'attention',
      texte: `${inventaire.clients} fiche(s) élève seront effacées, avec leur historique de présences et de paiements.`,
    });
  }

  if (inventaire.derniereActivite) {
    out.push({
      niveau: 'attention',
      texte: `Ce studio a été utilisé le ${inventaire.derniereActivite}.`,
    });
  }

  return out;
}

/**
 * Ce que la suppression NE fait PAS. Affiché tel quel dans l'admin : mieux
 * vaut une liste honnête qu'une promesse de « tout effacer » qui laisserait
 * des traces sans le dire.
 */
export const CE_QUI_RESTE = [
  'Les fichiers déposés sur le stockage (photo de couverture, documents d\'inscription) : ils vivent hors de la base.',
  'Les marqueurs d\'emails déjà envoyés (dédup des rappels et digests), qui ne sont rattachés à aucun profil.',
  'Les comptes élèves qui appartiennent aussi à un autre studio : ce sont des identités globales, pas la propriété du studio supprimé.',
];

/**
 * Un compte élève devenu orphelin peut-il être supprimé avec le studio ?
 * OUI seulement si : c'est bien un compte élève (jamais un profil prof), et
 * il ne reste AUCUNE fiche à son email dans quelque studio que ce soit.
 *
 * @param {Object} compte      { id, email, estProf }
 * @param {Set}    emailsAvecFicheRestante  emails (minuscules) encore rattachés
 */
export function orphelinSupprimable(compte, emailsAvecFicheRestante) {
  if (!compte?.id || !compte?.email) return false;
  if (compte.estProf) return false;                        // un prof n'est jamais un orphelin d'élève
  return !emailsAvecFicheRestante.has(String(compte.email).toLowerCase());
}

/** Résumé lisible d'une suppression, pour les logs et le retour d'écran. */
export function resumeSuppression({ studio, inventaire = {}, orphelinsSupprimes = 0 }) {
  const bouts = [
    `${inventaire.clients || 0} élève(s)`,
    `${inventaire.cours || 0} séance(s)`,
    `${inventaire.paiements || 0} paiement(s)`,
  ];
  if (inventaire.factures) bouts.push(`${inventaire.factures} facture(s)`);
  if (orphelinsSupprimes) bouts.push(`${orphelinsSupprimes} compte(s) élève orphelin(s)`);
  return `« ${studio || 'studio sans nom'} » supprimé : ${bouts.join(', ')}.`;
}
