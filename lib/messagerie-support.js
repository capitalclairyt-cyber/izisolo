/**
 * lib/messagerie-support.js — messagerie support prof ↔ IziSolo (v87, 2026-08-19)
 * ─────────────────────────────────────────────────────────────────
 * La prof écrit à l'équipe depuis SA messagerie (conversation épinglée
 * « Équipe IziSolo », type='support', une par prof) ; l'équipe répond depuis
 * /admin/messagerie en sender_type='izisolo'. Option B validée par Colin :
 * le widget feedback reste SÉPARÉ, aucune liaison automatique.
 *
 * Ce fichier = les RÈGLES du chantier, en helpers PURS (verrou CI
 * tests/e2e/messagerie-support.spec.js — aucun import lourd ici, le spec
 * tourne en Node nu) + le getOrCreate défensif pré-migration.
 *
 * Les emails du flux (sonnette à bonjour@ + réponse à la prof) vivent dans
 * lib/messagerie-email.js (pipeline sendEmail + dédup emails_envoyes).
 * ─────────────────────────────────────────────────────────────────
 */

export const SUPPORT_TITRE = 'Équipe IziSolo';
export const SUPPORT_EMAIL = process.env.SUPPORT_EMAIL || 'bonjour@izisolo.fr';

/** La conversation est-elle le fil support prof ↔ IziSolo ? */
export function estSupport(conv) {
  return conv?.type === 'support';
}

/**
 * Visibilité côté ÉLÈVE — LISTE BLANCHE, pas liste noire : seuls les types
 * qui concernent un·e élève (1-à-1, groupe-cours) passent. Un type inconnu
 * ou 'support' ne fuit JAMAIS dans un espace élève, même si un futur type
 * est ajouté sans penser à ce filtre.
 */
export function estVisiblePourEleve(conv) {
  return conv?.type === 'client' || conv?.type === 'cours';
}

/**
 * Destinataires ÉLÈVES d'une notification (email instantané / push) après un
 * message de la prof — SOURCE UNIQUE de la dérivation par type :
 *   client  → la fiche cible
 *   cours   → les membres élèves de la conversation (dédupliqués)
 *   support → PERSONNE (c'est un fil prof ↔ IziSolo, aucun élève dedans)
 * Type inconnu → personne (même principe de liste blanche).
 */
export function clientIdsNotifiables(conv, membreClientIds = []) {
  if (!conv) return [];
  if (conv.type === 'client') return conv.client_id ? [conv.client_id] : [];
  if (conv.type === 'cours') return [...new Set((membreClientIds || []).filter(Boolean))];
  return [];
}

/**
 * Non-lu côté ADMIN : le dernier message de la prof est-il plus récent que la
 * dernière lecture de l'équipe ? NULL = jamais lu (le champ naît NULL, posé
 * uniquement par l'action de lecture — anti-pattern « Lu fantôme » de v24).
 */
export function estNonLuePourAdmin(dernierMsgProAt, adminLastReadAt) {
  if (!dernierMsgProAt) return false;          // fil sans message prof : rien à lire
  if (!adminLastReadAt) return true;           // jamais ouvert par l'équipe
  return new Date(dernierMsgProAt) > new Date(adminLastReadAt);
}

/**
 * Accusé de lecture côté ADMIN (2026-08-19, demande Colin) : la prof a-t-elle
 * lu ce message de l'équipe ? Source : conversation_members.last_read_at du
 * membre PRO (posé par markRead quand elle ouvre le fil). Affiché UNIQUEMENT
 * dans /admin/messagerie — la prof, elle, ne voit jamais si l'équipe a lu.
 * NULL = jamais ouvert → non lu. Lecture à la même milliseconde = lu
 * (symétrie estNonLuePourAdmin).
 */
export function estLuParProf(messageCreatedAt, profLastReadAt) {
  if (!messageCreatedAt || !profLastReadAt) return false;
  return new Date(profLastReadAt) >= new Date(messageCreatedAt);
}

/**
 * Extrait TEASER pour l'email de notif (2026-08-19, demande Colin) : seules
 * les 3-4 premières lignes du message partent par email — le message complet
 * se lit dans la messagerie IziSolo (l'email ramène dans l'app, il ne la
 * remplace pas). Plafond de caractères en plus : une « ligne » de 2000
 * caractères ne doit pas vider la règle de son sens.
 * @returns {{ texte: string, tronque: boolean }}
 */
export function extraitEmail(contenu, { maxLignes = 3, maxChars = 240 } = {}) {
  const brut = (contenu || '').trim();
  if (!brut) return { texte: '', tronque: false };
  const lignes = brut.split('\n');
  let texte = lignes.slice(0, maxLignes).join('\n');
  let tronque = lignes.length > maxLignes;
  if (texte.length > maxChars) {
    texte = texte.slice(0, maxChars).trimEnd();
    tronque = true;
  }
  return { texte, tronque };
}

/**
 * L'erreur Postgres signe-t-elle la migration v87 manquante ?
 * 23514 = check_violation : le CHECK pré-v87 refuse type='support' /
 * sender_type='izisolo'. (Piège v19/v77 : sans ce mapping, l'insert échouerait
 * en silence derrière un « Erreur serveur » générique.)
 */
export function estErreurMigrationV87(error) {
  return error?.code === '23514';
}

export const MESSAGE_MIGRATION_V87 =
  'La messagerie avec l\'équipe IziSolo n\'est pas encore activée (migration v87 à appliquer).';

/**
 * Récupère ou crée LA conversation support du prof (une seule par studio,
 * index unique partiel v87). Pattern getOrCreateConversationClient :
 * erreurs vérifiées, course concurrente tolérée, membre pro créé pour le
 * suivi non-lu (countUnread passe par conversation_members).
 */
export async function getOrCreateConversationSupport(supabase, profileId) {
  if (!profileId) throw new Error('profileId requis');

  const { data: existing, error: selErr } = await supabase
    .from('conversations')
    .select('*')
    .eq('profile_id', profileId)
    .eq('type', 'support')
    .maybeSingle();
  if (selErr) throw selErr;
  if (existing) return existing;

  const { data: created, error } = await supabase
    .from('conversations')
    .insert({ profile_id: profileId, type: 'support', titre: SUPPORT_TITRE })
    .select()
    .single();

  if (error) {
    if (estErreurMigrationV87(error)) {
      const e = new Error(MESSAGE_MIGRATION_V87);
      e.code = 'MIGRATION_V87_REQUISE';
      throw e;
    }
    if (error.code === '23505') {
      // Course concurrente (2 onglets) : la conv vient d'être créée ailleurs.
      const { data: again, error: againErr } = await supabase
        .from('conversations')
        .select('*')
        .eq('profile_id', profileId)
        .eq('type', 'support')
        .maybeSingle();
      if (againErr) throw againErr;
      if (again) return again;
    }
    throw error;
  }

  // Membre PRO (suivi de lecture) — last_read_at au DEFAULT now() : elle crée
  // la conversation, elle est à jour par définition (cf. v24/lib/messagerie).
  // 23505 toléré : course concurrente, le membre existe déjà.
  const { error: eMembre } = await supabase
    .from('conversation_members')
    .insert({ conversation_id: created.id, profile_id: profileId });
  if (eMembre && eMembre.code !== '23505') throw eMembre;

  return created;
}
