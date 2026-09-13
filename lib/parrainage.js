// ============================================================================
// IziSolo — Le pont 1 : une prof fait entrer sa structure (v111, lot 1
// Associations & Studios, 2026-09-13, PLAN-ASSOS-STUDIOS-2026.md §6.2)
// ----------------------------------------------------------------------------
// Depuis son IziSolo, une prof saisit le nom et l'ADRESSE de son association
// ou de son studio (« pas la tienne » : une structure a son propre compte,
// §6.1). La structure reçoit un lien ; l'ouvrir pose un cookie, la structure
// s'inscrit, et à la création de son espace la prof en devient membre
// automatiquement, avec le préréglage « Prof ». La structure garde la trace
// de qui l'a amenée (`profiles.parrainee_par`) : c'est la mécanique de
// parrainage annoncée depuis juillet, dont le crédit (un mois offert des deux
// côtés, décision Colin) viendra quand la caisse saura l'appliquer. Rien n'est
// promis à l'écran d'ici là.
//
// Fichier PUR (sanitize, verdicts, emails). Les écritures vivent dans les
// routes /api/structures/*.
// ============================================================================

import { CODES_STRUCTURE, TYPES_STRUCTURE } from './structure';

// Fichier PUR : aucun import de crypto (il est importé par des composants
// navigateur). Le jeton se fabrique et se hache côté serveur avec
// `genererToken` / `hashToken` de lib/lien-pointage.
export const COOKIE_PARRAINAGE = 'izi_parrainage';
export const DUREE_INVITATION_JOURS = 30;
const MAX_NOM = 120;
const MAX_MESSAGE = 600;

/** Types de structure qu'on peut faire entrer : jamais « solo » (une prof
 *  seule s'inscrit elle-même, c'est l'inscription normale). */
export const TYPES_INVITABLES = CODES_STRUCTURE.filter(c => c !== 'solo');

/**
 * Nettoie ce que la prof a saisi. TRONQUE au lieu de rejeter (un nom de
 * 121 caractères ne doit pas faire perdre une invitation), mais REFUSE ce qui
 * rendrait le lien inutilisable : un email vide ou difforme, un type inconnu,
 * ou l'adresse de la prof elle-même (une structure a son propre compte).
 */
export function sanitizeInvitation(brut, emailParrain) {
  const email = String(brut?.email || '').trim().toLowerCase();
  const nom = String(brut?.nom || '').replace(/\s+/g, ' ').trim().slice(0, MAX_NOM);
  const type = TYPES_INVITABLES.includes(brut?.type) ? brut.type : null;
  const message = String(brut?.message || '').trim().slice(0, MAX_MESSAGE) || null;
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { ok: false, raison: "L'adresse de la structure est invalide." };
  }
  if (emailParrain && email === String(emailParrain).trim().toLowerCase()) {
    return { ok: false, raison: "C'est ton adresse. Une association ou un studio a son propre compte : indique la sienne (contact@…, ou celle de la personne qui la gère)." };
  }
  if (!nom) return { ok: false, raison: 'Le nom de la structure est obligatoire.' };
  if (!type) return { ok: false, raison: 'Dis-nous si c\'est une association ou un studio.' };
  return { ok: true, email, nom, type, message };
}

export function expirationInvitation(maintenant = new Date()) {
  return new Date(maintenant.getTime() + DUREE_INVITATION_JOURS * 86400000);
}

/** Le verdict d'ouverture d'un lien d'invitation. */
export function verifierInvitation(inv, maintenant = new Date()) {
  if (!inv) return { ok: false, code: 'INTROUVABLE', message: "Ce lien d'invitation ne correspond à rien." };
  if (inv.statut === 'acceptee') return { ok: false, code: 'DEJA_ACCEPTEE', message: 'Cette invitation a déjà servi : la structure a son espace.' };
  if (inv.statut === 'annulee') return { ok: false, code: 'ANNULEE', message: 'Cette invitation a été annulée.' };
  if (inv.expire_at && new Date(inv.expire_at).getTime() <= maintenant.getTime()) {
    return { ok: false, code: 'EXPIREE', message: "Cette invitation a expiré. Demande un nouveau lien à la prof qui t'a invitée." };
  }
  return { ok: true, code: 'OK' };
}

/** Ce que l'écran d'inscription a le droit d'afficher de l'invitation. */
export function invitationPublique(inv, parrain) {
  if (!inv) return null;
  return {
    nom_structure: inv.nom_structure,
    type_structure: inv.type_structure,
    label_type: TYPES_STRUCTURE[inv.type_structure]?.label || inv.type_structure,
    parrain_prenom: parrain?.prenom || null,
    parrain_studio: parrain?.studio_nom || null,
  };
}

/**
 * L'email envoyé à la structure. Dit trois choses : qui invite, ce qui se
 * passe si elle clique (son espace, la prof déjà dedans, 30 jours d'essai
 * sans carte), et qu'elle peut ignorer. Aucune promesse de remise : le
 * parrainage n'est pas encore câblé.
 */
export function emailInvitationStructure({ prenomParrain, studioParrain, nomStructure, type, lien, message }) {
  const qui = [prenomParrain, studioParrain ? `(${studioParrain})` : null].filter(Boolean).join(' ') || 'Une prof';
  const quoi = type === 'association' ? 'ton association' : 'ton studio';
  const plan = type === 'association' ? 'Association' : 'Studio';
  return {
    subject: `${prenomParrain || 'Une prof'} te propose d'ouvrir l'espace IziSolo de ${nomStructure}`,
    html: `
      <p>Bonjour,</p>
      <p><strong>${qui}</strong> donne des cours chez <strong>${nomStructure}</strong> et utilise IziSolo pour gérer les siens.
      Elle te propose d'ouvrir l'espace de ${quoi} : planning, élèves, pointage, encaissements, et ses profs dedans avec leurs droits.</p>
      ${message ? `<blockquote style="margin:12px 0;padding:10px 14px;border-left:3px solid #d8c7b8;color:#4a3f3a;">${escapeHtml(message)}</blockquote>` : ''}
      <p>Si tu crées l'espace depuis ce lien, <strong>${prenomParrain || 'elle'} y est déjà inscrite comme intervenante</strong> : rien à ressaisir. Tu essaies le plan ${plan} 30 jours, sans carte, et tu arrêtes quand tu veux.</p>
      <p><a href="${lien}" style="display:inline-block;background:#1a1612;color:#ffffff;padding:12px 20px;border-radius:10px;text-decoration:none;font-weight:600;">Ouvrir l'espace de ${escapeHtml(nomStructure)}</a></p>
      <p style="color:#6b5f5a;font-size:14px;">Ce lien vaut 30 jours. Si ce n'est pas pour toi, ignore simplement cet email : rien n'est créé sans toi.</p>
    `,
  };
}

/** L'email à la prof quand sa structure a ouvert son espace. */
export function emailParrainAccepte({ prenomParrain, nomStructure, lien }) {
  return {
    subject: `${nomStructure} est sur IziSolo, et tu y es déjà`,
    html: `
      <p>Bonjour ${prenomParrain || ''},</p>
      <p><strong>${escapeHtml(nomStructure)}</strong> vient d'ouvrir son espace IziSolo depuis ton invitation. Tu y es inscrite comme intervenante : ses séances apparaissent dans ton IziSolo, et tu bascules dessus depuis le nom du studio en haut de ta barre latérale.</p>
      <p><a href="${lien}" style="display:inline-block;background:#1a1612;color:#ffffff;padding:12px 20px;border-radius:10px;text-decoration:none;font-weight:600;">Ouvrir mon IziSolo</a></p>
    `,
  };
}

function escapeHtml(s) {
  return String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
