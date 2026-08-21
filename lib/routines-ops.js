/**
 * lib/routines-ops.js — le travail RÉCURRENT de l'équipe IziSolo, en une
 * source unique versionnée (affichée sur /admin/routines, badge de retard
 * dans la nav admin).
 *
 * Pourquoi un fichier et pas une table : c'est de la configuration d'équipe
 * (2 personnes), le rythme est hebdo/trimestriel, et l'historique vit dans
 * git. Qui fait la tâche met à jour `derniereExecution` (AAAA-MM-JJ) dans ce
 * fichier, commit, déploie. Pas de migration, pas d'écrivain en prod.
 *
 * `frequenceJours: null` = tâche « à la demande » (jamais en retard, listée
 * pour mémoire avec sa procédure).
 */

export const ROUTINES_OPS = [
  {
    id: 'comparatifs-prix',
    nom: 'Re-relever les grilles des comparatifs',
    description:
      'Les 6 pages comparatifs du blog (Momoyoga, bsport, Eversports, Mindbody, '
      + 'Mirandaflow, Calendly) portent des chiffres datés. Re-relever chaque grille '
      + 'à la source, corriger les articles au moindre écart, mettre à jour la date '
      + 'de relevé et le champ updated.',
    frequenceJours: 90,
    derniereExecution: '2026-08-21',
    procedure:
      'Automatique : une routine Claude programmée fait le relevé chaque trimestre et '
      + 'pousse les correctifs. À la main : demander à Claude « lance la vérification '
      + 'des comparatifs ». Un signalement reçu sur bonjour@ = relevé immédiat, sans '
      + 'attendre l\'échéance.',
  },
  {
    id: 'search-console',
    nom: 'Revue Search Console',
    description:
      'Exporter les performances (3 mois), regarder les requêtes qui impriment, les '
      + 'positions du cluster « logiciel gestion yoga », et les pages à pousser par '
      + 'maillage interne. Donner l\'export à Claude pour l\'analyse.',
    frequenceJours: 30,
    derniereExecution: '2026-08-21',
    procedure:
      'Search Console → Performances → Exporter (zip) → le déposer dans la '
      + 'conversation Claude. Après publication de nouvelles pages : Inspection '
      + 'd\'URL → demander l\'indexation.',
  },
  {
    id: 'demo-refresh',
    nom: 'Rafraîchir le démo Atelier Soleil',
    description:
      'Avant chaque démo prospect ou tournage : données fraîches, Pleine Lune '
      + 'complet, anniversaires du jour. Le seed reste calibré ~6 semaines.',
    frequenceJours: null,
    derniereExecution: null,
    procedure: 'Bouton « Rafraîchir » sur /admin/demo (ou le lien de connexion démo au même endroit).',
    lien: '/admin/demo',
  },
];

/**
 * État calculé d'une routine à une date donnée.
 * Retourne { statut, prochaine, joursRestants } :
 *  - statut 'a_la_demande'  : pas de fréquence, jamais en retard
 *  - statut 'a_jour'        : prochaine échéance à plus de 7 jours
 *  - statut 'bientot'       : échéance dans 0 à 7 jours
 *  - statut 'en_retard'     : échéance dépassée (ou jamais exécutée)
 */
export function etatRoutine(routine, maintenant = new Date()) {
  if (!routine?.frequenceJours) {
    return { statut: 'a_la_demande', prochaine: null, joursRestants: null };
  }
  if (!routine.derniereExecution) {
    return { statut: 'en_retard', prochaine: null, joursRestants: null };
  }
  const derniere = new Date(routine.derniereExecution + 'T12:00:00');
  if (Number.isNaN(derniere.getTime())) {
    return { statut: 'en_retard', prochaine: null, joursRestants: null };
  }
  const prochaine = new Date(derniere.getTime() + routine.frequenceJours * 24 * 3600 * 1000);
  const joursRestants = Math.floor((prochaine.getTime() - maintenant.getTime()) / (24 * 3600 * 1000));
  if (joursRestants < 0) return { statut: 'en_retard', prochaine, joursRestants };
  if (joursRestants <= 7) return { statut: 'bientot', prochaine, joursRestants };
  return { statut: 'a_jour', prochaine, joursRestants };
}

/** Nombre de routines en retard (badge nav admin). */
export function nbRoutinesEnRetard(routines = ROUTINES_OPS, maintenant = new Date()) {
  return routines.filter(r => etatRoutine(r, maintenant).statut === 'en_retard').length;
}
