/**
 * État de compte d'un·e élève, côté prof.
 *
 * Combine :
 *   - client.invitation_envoyee_at  (colonne clients, v67)
 *   - statut.last_sign_in_at        (RPC eleves_statut_compte, joint auth.users)
 *
 * 3 états, du plus « chaud » au plus « froid » :
 *   - 'actif'  : s'est déjà connecté·e (dernière connexion connue)
 *   - 'invite' : invitation envoyée, mais jamais connecté·e
 *   - 'aucun'  : ni compte actif ni invitation → la prof peut inviter
 */
export function statutCompteEleve(client, statut) {
  const lastSignIn = statut?.last_sign_in_at || null;
  const invite = client?.invitation_envoyee_at || null;
  if (lastSignIn) return { etat: 'actif', lastSignIn, invite };
  if (invite) return { etat: 'invite', lastSignIn: null, invite };
  return { etat: 'aucun', lastSignIn: null, invite: null };
}

/** Libellé court par état (pour la pastille de liste). */
export const STATUT_COMPTE_LABEL = {
  actif: 'Compte actif',
  invite: 'Invité·e',
  aucun: 'Pas de compte',
};

/**
 * Date relative FR courte : « aujourd'hui », « hier », « il y a 3 j »,
 * « il y a 2 sem. », sinon « le 12 juil. ». Tolérant aux entrées nulles.
 */
export function formatDateRelative(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  const now = new Date();
  const jours = Math.floor((now - d) / 86400000);
  if (jours <= 0) return "aujourd'hui";
  if (jours === 1) return 'hier';
  if (jours < 7) return `il y a ${jours} j`;
  if (jours < 31) return `il y a ${Math.floor(jours / 7)} sem.`;
  return `le ${d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}`;
}
