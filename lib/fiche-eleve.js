import { escapeIlike } from './utils';

/**
 * Résolution de LA fiche élève d'un compte connecté dans un studio (v83).
 *
 * Ordre : 1) FK douce `clients.auth_user_id` (le lien solide, survit à un
 * changement d'email de la fiche) ; 2) secours par email (le lien historique) —
 * et dans ce cas on POSE la FK au passage (« posée à la connexion »), ce qui
 * migre le parc au fil de l'eau sans backfill applicatif.
 *
 * ⚠️ Toute surface qui identifie la fiche d'un·e élève connecté·e DOIT passer
 * par ici (l'ancienne jointure email seule recrée des doublons dès que la
 * prof corrige un email de fiche — la raison d'être de v83).
 *
 * @param {object} supabase  client SERVICE ROLE (les pages portail lisent en
 *   admin, RLS inapplicable aux élèves) — les filtres profile_id font l'isolation.
 * @param {string} profileId studio
 * @param {{ id: string, email: string }} user  auth user connecté
 * @param {string} [select]  colonnes à renvoyer (défaut : identité + contact)
 * @returns {Promise<object|null>} la fiche, ou null si ce studio ne connaît
 *   pas cette personne (ni par compte, ni par email).
 */
export async function resoudreFicheEleve(supabase, profileId, user, select = 'id, prenom, nom, email, telephone, statut') {
  if (!profileId || !user?.id) return null;

  // Le select doit toujours porter auth_user_id (pour savoir si le lien est posé).
  const cols = select.includes('auth_user_id') ? select : `${select}, auth_user_id`;

  // 1) FK douce — le lien solide.
  const { data: parFk, error: eFk } = await supabase
    .from('clients')
    .select(cols)
    .eq('profile_id', profileId)
    .eq('auth_user_id', user.id)
    .limit(1)
    .maybeSingle();
  if (eFk) {
    // Colonne absente (v83 pas appliquée) → dégrade sur l'email, sans casser.
    if (eFk.code !== '42703') return null;
  }
  if (parFk) return parFk;

  // 2) Secours email — et pose de la FK pour la suite.
  if (!user.email) return null;
  const { data: parEmail } = await supabase
    .from('clients')
    .select(cols.replace(', auth_user_id', '') + (eFk?.code === '42703' ? '' : ', auth_user_id'))
    .eq('profile_id', profileId)
    .ilike('email', escapeIlike(user.email))
    .limit(1)
    .maybeSingle();
  if (!parEmail) return null;

  if (eFk?.code !== '42703' && !parEmail.auth_user_id) {
    // Pose silencieuse — échec non bloquant (le lien se re-tentera au
    // prochain passage), mais jamais avalé sans trace.
    const { error: ePose } = await supabase
      .from('clients')
      .update({ auth_user_id: user.id })
      .eq('id', parEmail.id)
      .is('auth_user_id', null);
    if (ePose) console.warn('[fiche-eleve] pose FK échouée:', ePose.message);
    else parEmail.auth_user_id = user.id;
  }
  return parEmail;
}
