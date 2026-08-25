// ============================================================================
// IziSolo — L'équipe d'un studio (lot 3 du chantier multi-prof, 2026-08-25)
// ----------------------------------------------------------------------------
// Inviter, accepter, révoquer. Les RÈGLES de droits vivent dans
// lib/studio-membre.js (vocabulaire pur) ; ici c'est la mécanique : qui peut
// inviter qui, ce que l'email raconte, et comment une invitation devient une
// appartenance le jour où la personne se connecte.
//
// ⚠️ SERVEUR uniquement (client admin, envoi d'email).
// ============================================================================

import { labelRole, resumeDroits, estProprietaire } from './studio-membre';

/** Normalise un email comme le fait le reste de l'app (lower + trim). */
export function normaliserEmail(v) {
  return String(v || '').trim().toLowerCase();
}

/**
 * Qui a le droit de toucher à QUI. Trois refus, chacun pour une raison qu'on
 * peut expliquer à voix haute :
 *   • on ne se retire pas soi-même (le studio se retrouverait sans personne
 *     pour gérer l'équipe) ;
 *   • on ne touche pas au propriétaire (c'est le compte qui paie) ;
 *   • un admin ne peut pas se hisser propriétaire (un seul propriétaire, celui
 *     qui a créé le studio).
 */
export function peutModifierMembre(acteur, cible) {
  if (!acteur || !cible) return { ok: false, raison: 'Membre introuvable.' };
  if (cible.role === 'proprietaire') {
    return { ok: false, raison: "Le propriétaire du studio ne peut pas être modifié ni retiré." };
  }
  if (acteur.auth_user_id && acteur.auth_user_id === cible.auth_user_id) {
    return { ok: false, raison: "Tu ne peux pas modifier tes propres droits." };
  }
  return { ok: true };
}

/**
 * Une invitation à SOI-MÊME n'a pas de sens et créerait une ligne en double
 * du propriétaire. On le dit plutôt que d'échouer sur une contrainte SQL.
 */
export function verifierEmailInvitation(email, emailProprietaire) {
  const e = normaliserEmail(email);
  if (!e || !e.includes('@')) return { ok: false, raison: 'Adresse email invalide.' };
  if (e === normaliserEmail(emailProprietaire)) {
    return { ok: false, raison: "C'est ton adresse : tu es déjà dans ton studio." };
  }
  return { ok: true, email: e };
}

/**
 * L'email d'invitation. PUR (aucun envoi ici) pour être testable.
 *
 * Il dit trois choses, et pas une de plus : qui invite, ce qu'elle pourra
 * faire, et où cliquer. Énumérer neuf permissions dans un email ferait fuir
 * n'importe qui — `resumeDroits` s'en charge en une ligne.
 */
export function emailInvitation({ studioNom, prenomInvitee, prenomProprietaire, lien, membre, compteExistant }) {
  const studio = studioNom || 'un studio';
  const qui = prenomProprietaire ? `${prenomProprietaire} (${studio})` : studio;
  const bonjour = prenomInvitee ? `Bonjour ${prenomInvitee},` : 'Bonjour,';
  const droits = resumeDroits(membre);
  const bouton = compteExistant
    ? 'Ouvrir le studio'
    : 'Choisir mon mot de passe et entrer';

  return {
    subject: `${qui} t'invite à rejoindre son studio sur IziSolo`,
    html: `
      <p>${bonjour}</p>
      <p><strong>${qui}</strong> t'a ajoutée à son studio sur IziSolo, en tant que <strong>${labelRole(membre?.role)}</strong>.</p>
      <p>Ce que tu pourras y faire : ${droits}.</p>
      <p><a href="${lien}" style="display:inline-block;background:#1a1612;color:#ffffff;padding:12px 20px;border-radius:10px;text-decoration:none;font-weight:600;">${bouton}</a></p>
      ${compteExistant
        ? `<p>Tu as déjà un compte IziSolo : connecte-toi normalement, le studio apparaîtra.</p>`
        : `<p>Ce lien te fait choisir ton mot de passe. Ensuite, tu te connecteras comme n'importe qui.</p>`}
      <p style="color:#6b5f5a;font-size:14px;">Tu ne vois que ce que ${studio} t'a ouvert, et tu peux quitter ce studio à tout moment en le demandant à ${prenomProprietaire || 'la personne qui t\'a invitée'}.</p>
    `,
  };
}

/**
 * L'invitation devient une appartenance au PREMIER accès de la personne.
 *
 * Pourquoi ici et pas à l'invitation : au moment où on invite, on ne sait pas
 * toujours quel compte auth portera cet email (elle peut en créer un plus
 * tard, ou en avoir déjà un). On rattache donc par EMAIL, une seule fois, le
 * jour où quelqu'un se présente avec cette adresse.
 *
 * Appelé UNIQUEMENT quand la personne n'a aucune appartenance active : c'est
 * le seul chemin où l'on peut découvrir une invitation en attente, et ça évite
 * de payer cette requête à chaque chargement de page pour tout le monde.
 *
 * Jamais bloquant : si ça échoue, elle reste devant « aucun studio », ce qui
 * est déjà son état — on ne casse rien de plus.
 *
 * ⚠️ DEUX PIÈGES, tous deux mesurés sur le premier accès réel d'une invitée,
 * et tous deux invisibles au deuxième :
 *
 * 1. Next MÉMOÏSE les fetch identiques d'un même rendu. La lecture des
 *    appartenances faite AVANT l'activation renvoie « 0 » ; toute relecture
 *    identique après l'écriture reçoit cette même réponse périmée. On ne
 *    relit donc jamais : on rend les lignes.
 *
 * 2. Un même chargement de page déclenche PLUSIEURS résolutions (le layout,
 *    puis une route API). La première active l'invitation ; la seconde lit
 *    « 0 » (mémoïsé) et n'a plus rien à activer — elle concluait « aucun
 *    studio » et redirigeait vers /onboarding, en écrasant le travail de la
 *    première. D'où la lecture de secours en service_role ci-dessous : elle
 *    répond la vérité du moment, quel que soit le rang de l'appel.
 *
 * Cette fonction est donc IDEMPOTENTE : elle rend les appartenances actives de
 * la personne, qu'elle vienne de les activer ou qu'elles l'aient déjà été.
 */
export async function activerInvitationsEnAttente(user) {
  const email = normaliserEmail(user?.email);
  if (!user?.id || !email) return [];
  try {
    // Import DYNAMIQUE : lib/supabase-admin fabrique son singleton au
    // chargement du module et jette si la clé service_role est absente. Le
    // charger en tête rendrait tout ce fichier inutilisable par un test Node
    // pur — alors que la moitié de ses fonctions n'ont besoin de rien.
    const { createAdminClient } = await import('./supabase-admin');
    const admin = createAdminClient();
    const { data, error } = await admin
      .from('studio_membres')
      .update({
        auth_user_id: user.id,
        statut: 'actif',
        accepte_at: new Date().toISOString(),
      })
      .eq('statut', 'invite')
      .is('auth_user_id', null)
      .ilike('email', email)          // l'index unique est sur lower(email)
      .select('id, profile_id, auth_user_id, email, role, permissions, statut');
    if (!error && (data || []).length > 0) return data;

    // Rien à activer : soit il n'y a pas d'invitation, soit un appel précédent
    // du MÊME chargement l'a déjà consommée. Une lecture fraîche tranche —
    // scopée explicitement à la personne authentifiée, comme l'exige l'usage
    // du service_role (cf. lib/supabase-admin).
    const { data: deja } = await admin
      .from('studio_membres')
      .select('id, profile_id, auth_user_id, email, role, permissions, statut')
      .eq('auth_user_id', user.id)
      .eq('statut', 'actif');
    return deja || [];
  } catch {
    return [];
  }
}

/** Ce qu'on renvoie à l'écran pour une ligne d'équipe — jamais l'id auth. */
export function membrePublic(m) {
  return {
    id: m.id,
    email: m.email,
    role: m.role,
    permissions: m.permissions || {},
    statut: m.statut,
    accepte_at: m.accepte_at,
    invite_at: m.invite_at,
    revoque_at: m.revoque_at,
    // « a-t-elle déjà mis les pieds ici ? » est ce que la prof veut savoir.
    liee: !!m.auth_user_id,
    proprietaire: estProprietaire(m),
  };
}
