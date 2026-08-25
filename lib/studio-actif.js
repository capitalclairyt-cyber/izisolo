// ============================================================================
// IziSolo — Le studio actif (v101, 2026-08-25)
// ----------------------------------------------------------------------------
// « Quel studio est-ce que je suis en train de regarder ? » — LA question que
// l'app ne se posait pas, parce que la réponse était toujours « le mien ».
//
// Un seul endroit décide, et tout le reste en hérite : `requireAuth()` pour
// les routes API, le layout dashboard pour les pages et pour le contexte
// navigateur. Aucun composant ne recalcule cette réponse dans son coin.
//
// ⚠️ SERVEUR uniquement (prend un client Supabase serveur). Le navigateur lit
// `useStudioId()` (components/studio/StudioProvider), qui reçoit le résultat.
//
// DÉGRADATION : sans la migration v101, la table `studio_membres` n'existe pas.
// On retombe alors sur « le studio, c'est moi », ce qui est exactement l'état
// d'avant. Une fondation qui casse l'app quand sa migration n'est pas encore
// passée n'est pas une fondation, c'est un piège.
// ============================================================================

/**
 * Mémo de process : tant que la migration v101 n'est pas appliquée, inutile
 * de re-demander la table à CHAQUE requête. Une lambda froide fait une
 * tentative, retient la réponse, et arrête d'ajouter un aller-retour perdu
 * (et une erreur dans les logs Supabase) à chaque chargement de page.
 * Jamais mis à `true` : une fois la table vue, on ne repasse plus par là.
 */
let tableManquante = false;

/** Le membre synthétique d'une prof seule : propriétaire de son studio. */
function proprietaireImplicite(userId, email) {
  return {
    id: null,
    profile_id: userId,
    auth_user_id: userId,
    email: email || '',
    role: 'proprietaire',
    permissions: {},
    statut: 'actif',
    implicite: true,
  };
}

/**
 * Résout le studio actif d'un utilisateur connecté.
 *
 * @returns {{ studioId: string|null, membre: object|null, membres: object[] }}
 *   studioId  null = cette personne n'a aucun studio (une élève, typiquement)
 *   membre    son appartenance AU STUDIO ACTIF (jamais celle d'un autre)
 *   membres   toutes ses appartenances actives, pour le sélecteur du lot 3
 */
export async function resoudreStudioActif(supabase, user) {
  if (!user?.id) return { studioId: null, membre: null, membres: [] };

  let membres = [];
  let tableAbsente = tableManquante;
  if (!tableAbsente) {
    try {
      const { data, error } = await supabase
        .from('studio_membres')
        .select('id, profile_id, auth_user_id, email, role, permissions, statut')
        .eq('auth_user_id', user.id)
        .eq('statut', 'actif');
      if (error) {
        // PGRST205 = table inconnue du cache de schéma PostgREST (§12 : ce
        // n'est PAS le 42P01 de Postgres). Une erreur de SCHÉMA se mémorise ;
        // une erreur passagère (réseau, timeout) ne doit surtout pas éteindre
        // le multi-prof pour toute la durée de vie de la lambda.
        tableAbsente = true;
        if (error.code === 'PGRST205' || error.code === '42P01') tableManquante = true;
      } else {
        membres = data || [];
      }
    } catch {
      tableAbsente = true;
    }
  }

  // Son propre studio d'abord. C'est le cas de 100 % des comptes existants, et
  // ça reste le bon défaut pour une prof qui enseigne aussi ailleurs : on
  // atterrit chez soi, on bascule ensuite (sélecteur, lot 3).
  const sien = membres.find(m => m.profile_id === user.id);
  if (sien) return { studioId: user.id, membre: sien, membres };

  if (membres.length > 0) {
    const premier = membres[0];
    return { studioId: premier.profile_id, membre: premier, membres };
  }

  // Aucune appartenance. Deux cas très différents :
  //  • la table n'existe pas encore (pré-v101) → tout le monde est chez soi ;
  //  • elle existe et cette personne n'y est pas → seul un profil à son nom
  //    peut encore faire d'elle une prof (filet identique à celui du helper
  //    SQL : une prof ne perd JAMAIS son studio pour une ligne manquante).
  if (tableAbsente) {
    return { studioId: user.id, membre: proprietaireImplicite(user.id, user.email), membres: [] };
  }

  const { data: profil } = await supabase
    .from('profiles')
    .select('id')
    .eq('id', user.id)
    .maybeSingle();

  if (profil?.id) {
    return { studioId: user.id, membre: proprietaireImplicite(user.id, user.email), membres: [] };
  }

  return { studioId: null, membre: null, membres: [] };
}
