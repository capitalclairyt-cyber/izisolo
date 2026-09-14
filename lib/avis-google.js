// ============================================================================
// IziSolo — Demander un avis Google (v117, 2026-09-14)
// ----------------------------------------------------------------------------
// SOURCE UNIQUE de lecture et d'écriture de `profiles.avis_google`, et des
// RÈGLES de la demande automatique. Règle §12 : un JSONB de config se lit par
// SON helper, jamais brut avec ses propres défauts.
//
// Le besoin (Maude, 2026-09-14) : demander un avis Google à ses élèves.
// Trois règles de Google qu'on ne contourne jamais, et que le code ENCODE :
//   1. aucune contrepartie (une séance offerte contre un avis est interdit) :
//      l'email ne promet rien, et `emailAvis` est verrouillé par la spec CI ;
//   2. pas de tri par satisfaction (« review gating ») : on demande à celles
//      qui VIENNENT (3e présence pointée), jamais à celles qui « aiment » ;
//   3. pas de pic : Google filtre les rafales d'avis sur une fiche. Le
//      déclencheur par présence répartit les demandes tout seul, et un plafond
//      par studio et par jour (MAX_PAR_JOUR) draine une base existante en
//      quelques semaines au lieu d'une matinée.
//
// ⚠️ La colonne ne va JAMAIS dans un select principal ni dans le payload de
// la carte Page publique (patron v104 / v108) : écriture par route dédiée.
// ============================================================================

/** Codes PostgREST d'une colonne inconnue du cache de schéma (§12). */
const ABSENTE = ['PGRST204', '42703'];

/** Après combien de présences pointées « présente » l'email part (une fois). */
export const SEUIL_PRESENCES = 3;
/** Plafond d'emails par studio et par jour : jamais de rafale sur la fiche. */
export const MAX_PAR_JOUR = 5;
/** Type dans notifications_eleves (dédup client + studio, à vie). */
export const TYPE_NOTIF_AVIS = 'avis_google';

const HOTES = ['g.page', 'google.com', 'goo.gl', 'google.fr'];

/**
 * Le lien d'avis est-il une adresse Google ? https seulement, hôte Google ou
 * l'un de ses sous-domaines (search.google.com, maps.app.goo.gl, g.page/r/…).
 * On n'invente jamais un lien : un lien qui n'est pas de Google est JETÉ.
 */
export function lienAvisValide(lien) {
  if (typeof lien !== 'string') return false;
  const s = lien.trim();
  if (s.length < 12 || s.length > 500) return false;
  let u;
  try { u = new URL(s); } catch { return false; }
  if (u.protocol !== 'https:') return false;
  const h = u.hostname.toLowerCase();
  return HOTES.some(d => h === d || h.endsWith('.' + d));
}

/**
 * Nettoie ce qui vient d'un formulaire ou de la base. `null` = aucun réglage.
 * Un lien invalide rend null (l'email automatique ne peut pas partir sans
 * lien, et un QR vers une adresse cassée ne se patche pas une fois imprimé).
 */
export function sanitizeAvisGoogle(brut) {
  const lien = typeof brut?.lien === 'string' ? brut.lien.trim() : '';
  if (!lienAvisValide(lien)) return null;
  return { lien, auto: brut?.auto !== false };
}

/** Lecture depuis une row profiles déjà chargée (select('*') du layout). */
export function lireAvisGoogle(row) {
  return sanitizeAvisGoogle(row?.avis_google);
}

/** Le lien seul, ou null. */
export function lienAvis(config) {
  return sanitizeAvisGoogle(config)?.lien || null;
}

/** L'email automatique est-il armé ? (lien posé ET auto non éteint) */
export function emailAutoActif(config) {
  const c = sanitizeAvisGoogle(config);
  return !!(c && c.auto !== false);
}

/**
 * Les élèves à solliciter aujourd'hui. PUR.
 * @param {Array<{client_id, statut_pointage, cours:{date, est_annule}}>} presences
 * @param {Set<string>} dejaSollicites  client_id déjà servis (sent/skipped)
 * @param {string} today  'AAAA-MM-JJ'
 * @returns {Array<{ client_id, nb, derniere }>} au plus `max`, les plus
 *          récentes d'abord (celles qui viennent de franchir le seuil)
 */
export function candidatesAvis(presences, dejaSollicites, today, { seuil = SEUIL_PRESENCES, max = MAX_PAR_JOUR } = {}) {
  const parClient = new Map();
  for (const p of presences || []) {
    if (!p?.client_id || p.statut_pointage !== 'present') continue;
    const d = p.cours?.date;
    if (!d || d > today || p.cours?.est_annule === true) continue;
    if (dejaSollicites?.has(p.client_id)) continue;
    const c = parClient.get(p.client_id) || { client_id: p.client_id, nb: 0, derniere: '' };
    c.nb += 1;
    if (d > c.derniere) c.derniere = d;
    parClient.set(p.client_id, c);
  }
  return [...parClient.values()]
    .filter(c => c.nb >= seuil)
    .sort((a, b) => (b.derniere < a.derniere ? -1 : b.derniere > a.derniere ? 1 : 0))
    .slice(0, max);
}

/**
 * L'email « Un mot sur tes séances ? ». Texte brut, htmlWrap de notifs-eleves
 * le met en forme. Aucune contrepartie, aucune condition, une seule fois.
 */
export function emailAvis({ prenom, studioNom, lien }) {
  const salut = prenom ? `Bonjour ${prenom},` : 'Bonjour,';
  return {
    sujet: `Un mot sur tes séances chez ${studioNom} ?`,
    corps:
`${salut}

Tu es venue plusieurs fois maintenant, et ça fait vraiment plaisir.

Si tu as une minute, un avis sur Google aide énormément : c'est comme ça que d'autres personnes trouvent ${studioNom}.

Laisser un avis : ${lien}

Tu écris ce que tu veux, ce que tu penses vraiment. Ce message n'est envoyé qu'une seule fois.

Merci, et à bientôt sur le tapis,`,
  };
}

/**
 * Le gabarit d'annonce (Messagerie → Annoncer) pour une vague à la main.
 * Même esprit que l'email automatique : rien promis, rien exigé.
 */
export function gabaritAnnonceAvis({ studioNom, lien }) {
  return `Bonjour à toutes,

Si tu as une minute, un avis sur Google aide énormément ${studioNom} à être trouvé par de nouvelles élèves.

Laisser un avis : ${lien}

Tu écris ce que tu veux, ce que tu penses vraiment. Merci du fond du cœur, et à bientôt sur le tapis !`;
}

/**
 * Chargement DÉFENSIF, en requête SÉPARÉE. Pré-v117 la colonne n'existe pas :
 * on rend `null` et rien ne s'affiche, comme avant.
 */
export async function chargerAvisGoogle(supabase, profileId) {
  if (!profileId) return null;
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('avis_google')
      .eq('id', profileId)
      .maybeSingle();
    if (error) return null;
    return lireAvisGoogle(data);
  } catch {
    return null;
  }
}

/**
 * Écriture défensive. `{ ok }`, ou `{ ok:false, migrationManquante }` sans
 * exception. `brut` null ou lien vide = retirer le réglage.
 */
export async function poserAvisGoogle(supabase, profileId, brut) {
  try {
    const valeur = brut && typeof brut.lien === 'string' && brut.lien.trim()
      ? sanitizeAvisGoogle(brut)
      : null;
    const { error } = await supabase
      .from('profiles')
      .update({ avis_google: valeur })
      .eq('id', profileId);
    if (error) {
      const manque = ABSENTE.includes(error.code) || /avis_google/.test(error.message || '');
      return { ok: false, migrationManquante: manque, error: error.message };
    }
    return { ok: true, valeur };
  } catch (e) {
    return { ok: false, migrationManquante: false, error: e?.message };
  }
}
