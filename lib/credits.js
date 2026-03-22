// ============================================
// IziSolo — Logique de décompte des séances
// ============================================

/**
 * Trouve le meilleur abonnement actif d'un client pour un cours donné.
 * Priorité : carnet avec le moins de séances restantes > abonnement illimité > cours_unique
 */
export function trouverMeilleurAbonnement(abonnements) {
  const actifs = abonnements.filter(a => a.statut === 'actif');

  if (actifs.length === 0) return null;

  // Séparer les types
  const carnets = actifs.filter(a => a.type === 'carnet' && a.seances_total !== null);
  const abos = actifs.filter(a => a.type === 'abonnement');
  const uniques = actifs.filter(a => a.type === 'cours_unique');

  // 1. Carnet avec le moins de séances restantes (utiliser en priorité)
  if (carnets.length > 0) {
    const sorted = carnets.sort((a, b) => {
      const resteA = (a.seances_total || 0) - (a.seances_utilisees || 0);
      const resteB = (b.seances_total || 0) - (b.seances_utilisees || 0);
      return resteA - resteB;
    });
    return sorted[0];
  }

  // 2. Abonnement (illimité ou avec séances)
  if (abos.length > 0) return abos[0];

  // 3. Cours unique
  if (uniques.length > 0) return uniques[0];

  return null;
}

/**
 * Calcule les séances restantes d'un abonnement
 */
export function seancesRestantes(abonnement) {
  if (!abonnement) return 0;
  if (abonnement.seances_total === null) return Infinity; // illimité
  return Math.max(0, (abonnement.seances_total || 0) - (abonnement.seances_utilisees || 0));
}

/**
 * Détermine la couleur du badge crédit
 */
export function couleurCredit(reste, seuil = 2) {
  if (reste === Infinity) return 'success'; // illimité
  if (reste <= 0) return 'danger';
  if (reste <= seuil) return 'warning';
  return 'success';
}

/**
 * Formate l'affichage du crédit
 */
export function formatCredit(abonnement) {
  if (!abonnement) return { texte: 'Aucun crédit', couleur: 'danger' };

  const reste = seancesRestantes(abonnement);

  if (reste === Infinity) {
    return { texte: `${abonnement.offre_nom} ✓`, couleur: 'success' };
  }

  if (reste <= 0) {
    return { texte: '0 séance — renouveler', couleur: 'danger' };
  }

  return {
    texte: `${reste}/${abonnement.seances_total}`,
    couleur: couleurCredit(reste),
  };
}

/**
 * Vérifie si un client peut être pointé (a des crédits disponibles)
 */
export function peutPointer(abonnements) {
  const meilleur = trouverMeilleurAbonnement(abonnements);
  if (!meilleur) return false;
  return seancesRestantes(meilleur) > 0;
}
