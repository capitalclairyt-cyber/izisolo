/**
 * État de compte d'un·e élève, côté prof. Fonctions PURES.
 *
 * ⚠️ CE QUE CE MODULE NE DIT PLUS (v120, 17/09/2026). Il rendait « Compte
 * actif · dernière connexion le 26 juil. » à partir de `auth.users.
 * last_sign_in_at`, la dernière connexion du COMPTE. Or l'identité élève est
 * GLOBALE : un compte par email, pour tout IziSolo. Le jour de l'import
 * d'Atout Gym, quatre adhérentes s'y affichaient « actives » parce qu'elles
 * sont aussi élèves chez Maude Yoga, alors qu'aucune des 43 fiches n'avait
 * jamais ouvert l'espace de l'association. La présidente lisait l'activité
 * d'un autre studio et en concluait qu'elle n'avait personne à inviter.
 *
 * La date d'un autre studio ne sort donc plus d'ici. Ce qui compte pour une
 * prof, c'est « cette personne est-elle venue sur MON espace », et ça se lit
 * sur la fiche, qui est par studio :
 *   - client.auth_user_id       (FK douce v83, posée à la 1re visite ICI)
 *   - client.derniere_visite_at (v120, la date de cette visite, ICI)
 *   - client.invitation_envoyee_at (v67)
 *   - statut.has_account        (RPC v67 : un compte existe à cet email)
 *
 * Quatre états, du plus chaud au plus froid :
 *   - 'venue'  : a déjà ouvert l'espace de CE studio
 *   - 'invite' : invitation envoyée, pas encore venue
 *   - 'compte' : a un compte IziSolo, mais n'est jamais venue ici. État le
 *                plus trompeur d'avant : c'est une bonne nouvelle (elle
 *                entrera sans mot de passe) et une invitation à envoyer, pas
 *                une case déjà cochée. On ne dit JAMAIS où elle a ce compte.
 *   - 'aucun'  : ni compte, ni invitation
 *
 * Verrou CI : tests/e2e/eleve-statut.spec.js
 */

export function statutCompteEleve(client, statut) {
  const visite = client?.derniere_visite_at || null;
  // Une fiche liée sans date, c'est une visite d'avant v120 : on l'affirme
  // quand même, sans inventer de date.
  const venueIci = Boolean(client?.auth_user_id || visite);
  const invite = client?.invitation_envoyee_at || null;
  const aUnCompte = Boolean(statut?.has_account || statut?.last_sign_in_at);

  if (venueIci) return { etat: 'venue', visite, invite, aUnCompte: true };
  if (invite) return { etat: 'invite', visite: null, invite, aUnCompte };
  if (aUnCompte) return { etat: 'compte', visite: null, invite: null, aUnCompte: true };
  return { etat: 'aucun', visite: null, invite: null, aUnCompte: false };
}

/** Libellé court par état (pastille de la liste). */
export const STATUT_COMPTE_LABEL = {
  venue: 'Connecté·e',
  invite: 'Invité·e',
  compte: 'Jamais connecté·e ici',
  aucun: 'Pas de compte',
};

/**
 * L'explication au survol et sur la fiche. Elle dit ce que la prof peut faire,
 * parce qu'un état qui ne mène à aucun geste ne sert à rien.
 */
export const STATUT_COMPTE_AIDE = {
  venue: 'A déjà ouvert son espace élève chez toi',
  invite: 'Invitation envoyée, pas encore venue sur ton espace',
  compte: 'A déjà un compte IziSolo, mais jamais ouvert ton espace. Invite-la : elle entrera en un clic, sans mot de passe',
  aucun: "Pas encore de compte, pense à l'inviter",
};

/** L'invitation a-t-elle encore un sens ? Elle en a partout sauf si elle est déjà venue. */
export function resteAInviter(etat) {
  return etat !== 'venue';
}

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
