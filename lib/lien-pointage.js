// ============================================================================
// IziSolo — Lien de pointage confié (v100, 2026-08-25)
// ----------------------------------------------------------------------------
// « Un lien sécurisé à envoyer pour accéder UNIQUEMENT au pointage d'un cours,
// même sans compte » (Colin, 2026-08-25). Le cas d'usage : la remplaçante, la
// collègue qui dépanne, la prof occasionnelle d'une asso.
//
// CE FICHIER EST LA SOURCE UNIQUE des règles du lien : fabrication du jeton,
// validité, expiration, et surtout MINIMISATION de ce que la personne invitée
// reçoit. Les routes ne décident rien, elles appliquent.
//
// ⚠️ SERVEUR uniquement (node:crypto). Aucun composant navigateur ne doit
// l'importer : l'écran invité reçoit ses données déjà filtrées par la route.
//
// ── Les trois règles non négociables ────────────────────────────────────────
// 1. On stocke le HASH du jeton, jamais le jeton. Le jeton n'existe que dans
//    l'URL remise, et n'est affiché qu'une fois, à la création.
// 2. La personne invitée voit des NOMS et rien d'autre : ni email, ni
//    téléphone, ni carnet, ni montant, ni lien visio. Un appel de présence est
//    une liste de noms ; le reste ne la regarde pas (minimisation RGPD).
// 3. Le lien porte UN cours. La route re-vérifie l'appartenance de chaque
//    présence touchée à CE cours, à chaque appel. C'est cette vérification,
//    et elle seule, qui empêche un lien de dépannage de devenir une clé du
//    studio — la RLS ne protège rien ici, le chemin public est en service_role.
// ============================================================================

import { createHash, randomBytes } from 'node:crypto';

/** Les seuls statuts qu'une personne invitée peut poser. Pas de résolution de
 *  cas, pas d'annulation, pas d'encaissement : présent, absent, excusé. */
export const STATUTS_INVITE = ['present', 'absent', 'excuse'];

/** Durées proposées à la création. `fin_journee` = défaut : le lien meurt avec
 *  la journée de la séance, ce qui couvre « je pointe en rentrant le soir »
 *  sans laisser traîner un accès pendant des semaines. */
export const DUREES = [
  { cle: 'fin_journee', label: "Jusqu'à la fin de la journée", aide: 'Le lien expire à minuit, après la séance.' },
  { cle: 'j1',          label: "Jusqu'à demain soir",          aide: 'Une nuit de plus, si le pointage se fait au calme.' },
  { cle: 'j7',          label: 'Pendant 7 jours',              aide: 'Pour une remplaçante qui enchaîne plusieurs séances.' },
];
export const DUREE_DEFAUT = 'fin_journee';

const MAX_NOM = 60;
const MAX_NOTE = 500;

// ── Jeton ────────────────────────────────────────────────────────────────────

/** 32 octets aléatoires en base64url : 256 bits, illisible et non devinable. */
export function genererToken() {
  return randomBytes(32).toString('base64url');
}

/** sha256 hex. Un jeton trop court ne doit JAMAIS produire un hash exploitable. */
export function hashToken(token) {
  const t = String(token || '');
  if (t.length < 20) return null;
  return createHash('sha256').update(t).digest('hex');
}

/** L'URL à remettre. `base` vient de la requête, jamais d'un champ éditable. */
export function urlLien(base, token) {
  return `${String(base || '').replace(/\/+$/, '')}/pointage-invite/${token}`;
}

// ── Temps ────────────────────────────────────────────────────────────────────

/**
 * Convertit une heure murale de Paris ('YYYY-MM-DDTHH:mm:ss') en instant réel.
 * Deux passes : on interprète d'abord en UTC, on mesure l'écart que Paris
 * applique à cet instant, on le retire. Exact hors du trou d'une heure des
 * bascules d'heure d'été (02h→03h) — les expirations calculées ici tombent à
 * 23h59, jamais dans ce trou.
 */
export function parisVersUtc(mural) {
  const suppose = new Date(`${mural}Z`);
  if (Number.isNaN(suppose.getTime())) return null;
  const vuDeParis = new Date(`${suppose.toLocaleString('sv-SE', { timeZone: 'Europe/Paris' }).replace(' ', 'T')}Z`);
  return new Date(suppose.getTime() - (vuDeParis.getTime() - suppose.getTime()));
}

/** 'YYYY-MM-DD' du jour, à Paris (l'astuce sv-SE du reste du code). */
export function jourParis(maintenant = new Date()) {
  return maintenant.toLocaleString('sv-SE', { timeZone: 'Europe/Paris' }).slice(0, 10);
}

function plusDeJours(dateISO, n) {
  const [y, m, d] = String(dateISO).split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + n);
  return dt.toISOString().slice(0, 10);
}

/**
 * Instant d'expiration pour un cours et une durée choisie. Ancré sur la DATE
 * DE LA SÉANCE, pas sur le moment de la création : un lien préparé trois jours
 * à l'avance ne doit pas mourir avant le cours. Et un lien créé APRÈS la
 * séance (pointage oublié) s'ancre sur aujourd'hui, sinon il naîtrait expiré.
 */
export function expirationPour(cours, duree = DUREE_DEFAUT, maintenant = new Date()) {
  const dateCours = cours?.date;
  if (!dateCours) return null;
  const aujourdhui = jourParis(maintenant);
  const ancre = dateCours > aujourdhui ? dateCours : aujourdhui;
  const jours = duree === 'j7' ? 7 : duree === 'j1' ? 1 : 0;
  return parisVersUtc(`${plusDeJours(ancre, jours)}T23:59:59`);
}

// ── Validité ─────────────────────────────────────────────────────────────────

/** 'actif' | 'revoque' | 'expire' — l'état affiché à la prof. */
export function etatLien(lien, maintenant = new Date()) {
  if (!lien) return 'expire';
  if (lien.revoque_at) return 'revoque';
  if (!lien.expire_at || new Date(lien.expire_at).getTime() <= maintenant.getTime()) return 'expire';
  return 'actif';
}

/**
 * LE contrôle d'accès du chemin public. Retourne { ok } ou { ok:false, code,
 * message } — le message est celui que la personne invitée lira, il doit être
 * honnête sans rien révéler du studio.
 */
export function verifierLien(lien, cours, maintenant = new Date()) {
  if (!lien) {
    return { ok: false, code: 'INTROUVABLE', message: "Ce lien de pointage n'existe pas ou a été supprimé." };
  }
  const etat = etatLien(lien, maintenant);
  if (etat === 'revoque') {
    return { ok: false, code: 'REVOQUE', message: 'Ce lien a été désactivé par le studio.' };
  }
  if (etat === 'expire') {
    return { ok: false, code: 'EXPIRE', message: "Ce lien de pointage a expiré. Demande-en un nouveau au studio." };
  }
  if (!cours) {
    return { ok: false, code: 'COURS_INTROUVABLE', message: "La séance liée à ce lien n'existe plus." };
  }
  // Cohérence : le lien et le cours doivent appartenir au même studio. Une
  // incohérence ici signifierait une donnée corrompue — on ferme.
  if (cours.profile_id !== lien.profile_id || cours.id !== lien.cours_id) {
    return { ok: false, code: 'INCOHERENT', message: 'Ce lien ne correspond pas à cette séance.' };
  }
  if (cours.est_annule) {
    return { ok: false, code: 'ANNULE', message: "Cette séance a été annulée : il n'y a rien à pointer." };
  }
  return { ok: true };
}

// ── Minimisation : ce que la personne invitée a le droit de voir ─────────────

/**
 * Une ligne de la liste d'appel. Prénom et nom : on est devant ces personnes,
 * une initiale ne suffit pas à les distinguer. Rien d'autre ne sort d'ici,
 * ni email, ni téléphone, ni carnet, ni dette, ni paiement.
 *
 * `info` marque les lignes NON pointables (annulation tardive, place rendue) :
 * elles restent visibles pour que la personne comprenne qui manque, mais on ne
 * lui demande pas de trancher un cas qui appartient à la prof.
 */
export function presencePourInvitee(presence) {
  if (!presence) return null;
  const statut = presence.statut_pointage || (presence.pointee ? 'present' : 'inscrit');
  const info = !!presence.annulation_tardive || ['annule', 'declinee'].includes(statut);
  return {
    id: presence.id,
    prenom: presence.clients?.prenom || '',
    nom: presence.clients?.nom || '',
    statut,
    info,
    // « essai » mérite d'être dit à quelqu'un qui ne connaît pas le groupe.
    essai: presence.type_presence === 'essai',
  };
}

/**
 * L'en-tête de la séance. ⚠️ `lien_visio` est volontairement absent : le lien
 * d'un cours en ligne est un bien payant (v86), il ne part pas dans un JSON
 * public parce qu'on a confié un pointage.
 */
export function coursPourInvitee(cours, studioNom) {
  if (!cours) return null;
  return {
    id: cours.id,
    nom: cours.nom,
    type_cours: cours.type_cours || null,
    date: cours.date,
    heure: cours.heure ? String(cours.heure).slice(0, 5) : null,
    duree_minutes: cours.duree_minutes || null,
    lieu: cours.lieu || null,
    en_ligne: cours.format === 'en_ligne',
    studio_nom: studioNom || null,
  };
}

// ── Entrées de la prof / de l'invitée ────────────────────────────────────────

export function sanitizeNomInvitee(v) {
  const s = String(v ?? '').replace(/\s+/g, ' ').trim();
  return s ? s.slice(0, MAX_NOM) : null;
}

/** La note est libre mais TRONQUÉE, jamais rejetée : perdre le message de la
 *  remplaçante parce qu'il fait 501 caractères serait absurde. */
export function sanitizeNote(v) {
  const s = String(v ?? '').trim();
  return s ? s.slice(0, MAX_NOTE) : null;
}

export function statutInviteValide(statut) {
  return STATUTS_INVITE.includes(String(statut || ''));
}

/** Libellé d'état pour l'écran de la prof. */
export function labelEtat(etat) {
  return etat === 'actif' ? 'Actif' : etat === 'revoque' ? 'Désactivé' : 'Expiré';
}
