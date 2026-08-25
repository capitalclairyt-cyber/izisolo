// ============================================================================
// IziSolo — Appartenance à un studio (v101, 2026-08-25)
// ----------------------------------------------------------------------------
// Lot 2 du chantier multi-prof. CE FICHIER EST LA SOURCE UNIQUE du vocabulaire
// des rôles et des permissions. Il est PUR : aucune requête, aucun `window`,
// importable serveur comme navigateur, et testable sans base.
//
// ⚠️ Les trois noms de permission `argent_voir`, `messagerie` et `parametres`
// sont AUSSI écrits dans les policies RLS (migrations-v101, helper
// `mes_studios_staff(p_perm)`). Renommer l'un ici sans le renommer là-bas ferait
// dire deux choses différentes à l'écran et à la base — et c'est la base qui
// gagnerait, en silence. Toute modification de ces trois clés est une migration.
//
// ⚠️ À ne pas confondre avec `lib/fiche-eleve.js` : ici on parle des personnes
// qui TRAVAILLENT dans un studio, jamais de celles qui y prennent des cours.
// ============================================================================

/** Rôles. `proprietaire` = qui a créé le compte ; il ignore la matrice. */
export const ROLES = ['proprietaire', 'admin', 'prof'];

/**
 * La matrice. Une capacité = une ligne, un libellé lisible par une prof, et
 * la mention explicite de ce qui est aussi gardé par la base.
 */
export const PERMISSIONS = [
  { cle: 'pointer',      label: 'Pointer les séances',        aide: 'Marquer présent, absent, excusé.' },
  { cle: 'cours_gerer',  label: 'Créer et modifier des cours', aide: 'Séances, séries, annulations.' },
  { cle: 'eleves_voir',  label: 'Voir les élèves',            aide: 'Fiches et coordonnées.' },
  { cle: 'eleves_gerer', label: 'Modifier les élèves',        aide: 'Créer, éditer, archiver, fusionner.' },
  { cle: 'argent_voir',  label: "Voir l'argent",              aide: 'Revenus, à percevoir, factures.', rls: true },
  { cle: 'argent_gerer', label: "Encaisser et vendre",        aide: 'Paiements, offres, déclaration.' },
  { cle: 'messagerie',   label: 'Écrire aux élèves',          aide: 'Messages, annonces, mailing.', rls: true },
  { cle: 'parametres',   label: 'Modifier les réglages',      aide: 'Portail, règles, notifications.', rls: true },
  { cle: 'equipe_gerer', label: "Gérer l'équipe",             aide: 'Inviter, retirer, changer les droits.' },
];

export const CLES_PERMISSIONS = PERMISSIONS.map(p => p.cle);

/**
 * Les deux préréglages proposés à l'invitation. Personne ne devrait avoir à
 * cocher neuf cases pour inviter une remplaçante : on propose, on ajuste après.
 *
 * « Prof » = ce qu'il faut pour donner un cours et rien de plus : pas d'argent,
 * pas de messagerie, pas de réglages. C'est le défaut, et il est volontairement
 * étroit — un droit qui manque se demande, un droit de trop ne se voit pas.
 */
export const PRESETS = {
  admin: Object.fromEntries(CLES_PERMISSIONS.map(c => [c, true])),
  prof: { pointer: true, cours_gerer: true, eleves_voir: true },
};

/** Les permissions d'un rôle, avant tout ajustement individuel. */
export function permissionsParDefaut(role) {
  if (role === 'proprietaire') return { ...PRESETS.admin };
  return { ...(PRESETS[role] || PRESETS.prof) };
}

/**
 * LE test de permission, miroir exact de `mes_studios_staff(p_perm)` en SQL.
 * Un membre non actif ne peut RIEN, quelle que soit sa matrice : révoquer doit
 * fermer immédiatement, sans dépendre du nettoyage du jsonb.
 */
export function peut(membre, permission) {
  if (!membre || membre.statut !== 'actif') return false;
  if (membre.role === 'proprietaire') return true;
  if (!CLES_PERMISSIONS.includes(permission)) {
    // Permission inconnue = faute de frappe. On refuse, comme plan-guard refuse
    // une capacité inconnue : on ne fuit jamais un droit par typo.
    if (typeof console !== 'undefined') {
      console.warn(`[studio-membre] permission inconnue « ${permission} » — refusée`);
    }
    return false;
  }
  return membre.permissions?.[permission] === true;
}

/** Le propriétaire, celui qu'on ne peut ni révoquer ni rétrograder. */
export function estProprietaire(membre) {
  return membre?.role === 'proprietaire';
}

export function estMembreActif(membre) {
  return !!membre && membre.statut === 'actif';
}

/**
 * Ne garde que les clés connues, et seulement à `true`. Une matrice qui
 * contient une clé inventée est une matrice qu'on ne sait pas relire : on la
 * nettoie à l'écriture plutôt que de deviner à la lecture.
 */
export function sanitizePermissions(brut) {
  const sortie = {};
  if (brut && typeof brut === 'object') {
    for (const cle of CLES_PERMISSIONS) {
      if (brut[cle] === true) sortie[cle] = true;
    }
  }
  return sortie;
}

/** Rôle valide, `prof` par défaut. Jamais `proprietaire` par une entrée libre :
 *  il n'y a qu'un propriétaire, celui qui a créé le compte. */
export function sanitizeRole(brut) {
  return brut === 'admin' ? 'admin' : 'prof';
}

/** Libellé lisible d'un membre, pour les écrans et les emails. */
export function labelRole(role) {
  return role === 'proprietaire' ? 'Propriétaire' : role === 'admin' ? 'Admin' : 'Prof';
}

export function labelStatut(statut) {
  return statut === 'actif' ? 'Actif' : statut === 'invite' ? 'Invitée' : 'Retirée';
}

/**
 * Résumé des droits en une phrase, pour la liste de l'équipe. Le propriétaire
 * et l'admin ont tout : l'énumérer serait du bruit.
 */
export function resumeDroits(membre) {
  if (estProprietaire(membre)) return 'Tous les droits';
  const actives = CLES_PERMISSIONS.filter(c => membre?.permissions?.[c] === true);
  if (actives.length === 0) return 'Aucun droit';
  if (actives.length === CLES_PERMISSIONS.length) return 'Tous les droits';
  return PERMISSIONS.filter(p => actives.includes(p.cle)).map(p => p.label).join(' · ');
}

/**
 * Portée du pointage (décision Colin 2026-08-25 : c'est un choix PAR MEMBRE).
 * Le vocabulaire est posé ici pour que SQL, routes et écrans le partagent dès
 * maintenant ; la mise en œuvre attend `cours.intervenant_id` (lot 3), sans
 * quoi « seulement les siens » ne veut rien dire — un cours n'a pas encore
 * d'intervenante.
 */
export const PORTEES_POINTAGE = ['tous', 'miens'];
export const PORTEE_POINTAGE_DEFAUT = 'tous';
