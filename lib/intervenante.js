// ============================================================================
// IziSolo — Qui donne cette séance (v103, lot 3b du chantier multi-prof ;
// étendu au lot 1 Associations & Studios, v111, 2026-09-13)
// ----------------------------------------------------------------------------
// SOURCE UNIQUE de la lecture et de l'écriture de `cours.intervenant_id` et,
// depuis v111, de `recurrences.intervenant_id`.
//
// ⚠️ LA COLONNE N'ENTRE JAMAIS DANS UN INSERT NI DANS UN SELECT PRINCIPAL.
// C'est le patron exact de `poserLienVisio` (v86) et des vignettes (v99), et
// il vient d'un vrai dégât : un insert qui nomme une colonne absente est
// REFUSÉ EN ENTIER par PostgREST (PGRST204), et la séance part à la poubelle
// avec son tarif, sa visibilité et son lieu. On pose donc l'intervenante par
// un UPDATE de rattrapage, et on la lit par une requête séparée : sans la
// migration, l'app se comporte exactement comme avant.
//
// ⚠️ SERVEUR ou navigateur : ces helpers prennent le client en paramètre.
// ============================================================================

/** Codes PostgREST d'une colonne / table absente du cache de schéma (§12). */
const ABSENT = ['PGRST204', 'PGRST205', '42703', '42P01'];
const estAbsent = (e) => !!e && ABSENT.includes(e.code);

/**
 * Les personnes à qui on peut confier une séance : les membres ACTIFS du
 * studio, plus celles INVITÉES qui n'ont pas encore de compte (une
 * intervenante peut ne jamais en avoir, elle travaille par son lien, v111).
 * Le propriétaire en fait partie : c'est elle qui donne la plupart des cours.
 * `select('*')` volontairement : prénom, nom, bio, photo n'existent qu'à
 * partir de v111, et les nommer ferait échouer la lecture avant.
 */
export async function chargerIntervenantes(supabase, studioId) {
  try {
    const { data, error } = await supabase
      .from('studio_membres')
      .select('*')
      .eq('profile_id', studioId)
      .in('statut', ['actif', 'invite'])
      .order('role', { ascending: true });
    if (error) return [];
    return data || [];
  } catch {
    return [];
  }
}

/**
 * Pose (ou retire) l'intervenante sur une ou plusieurs séances.
 * Retourne { ok } ou { ok:false, migrationManquante:true } — jamais une
 * exception : le reste de la création de cours ne doit pas tomber pour ça.
 */
export async function poserIntervenante(supabase, coursIds, intervenantId) {
  const ids = (Array.isArray(coursIds) ? coursIds : [coursIds]).filter(Boolean);
  if (ids.length === 0) return { ok: true };
  try {
    const { error } = await supabase
      .from('cours')
      .update({ intervenant_id: intervenantId || null })
      .in('id', ids);
    if (error) return { ok: false, migrationManquante: estAbsent(error) };
    return { ok: true };
  } catch {
    return { ok: false, migrationManquante: false };
  }
}

/**
 * Pose l'intervenante d'une SÉRIE (v111) : chaque séance que la série
 * fabriquera ensuite (ajout d'occurrence, ajustement) la recopie, comme la
 * capacité. UPDATE séparé, mêmes raisons.
 */
export async function poserIntervenanteRecurrence(supabase, recurrenceId, intervenantId) {
  if (!recurrenceId) return { ok: true };
  try {
    const { error } = await supabase
      .from('recurrences')
      .update({ intervenant_id: intervenantId || null })
      .eq('id', recurrenceId);
    if (error) return { ok: false, migrationManquante: estAbsent(error) };
    return { ok: true };
  } catch {
    return { ok: false, migrationManquante: false };
  }
}

/** L'intervenante d'une série, ou null (pré-v111 compris). */
export async function lireIntervenanteRecurrence(supabase, recurrenceId) {
  if (!recurrenceId) return null;
  try {
    const { data, error } = await supabase
      .from('recurrences')
      .select('intervenant_id')
      .eq('id', recurrenceId)
      .maybeSingle();
    if (error) return null;
    return data?.intervenant_id || null;
  } catch {
    return null;
  }
}

/**
 * Lit l'intervenante de plusieurs séances. Requête SÉPARÉE et défensive :
 * pré-migration, on rend une carte vide et personne ne s'en aperçoit.
 * @returns {Record<string, string>} coursId → intervenantId
 */
export async function lireIntervenantes(supabase, coursIds) {
  const ids = (coursIds || []).filter(Boolean);
  if (ids.length === 0) return {};
  try {
    const { data, error } = await supabase
      .from('cours')
      .select('id, intervenant_id')
      .in('id', ids);
    if (error) return {};
    return Object.fromEntries((data || []).filter(c => c.intervenant_id).map(c => [c.id, c.intervenant_id]));
  } catch {
    return {};
  }
}

/**
 * Le nom lisible d'un membre : son prénom (et son nom) quand la structure les
 * a saisis (v111), sinon le début de son email. Mieux vaut « claire@… » que
 * « Membre #3 ».
 */
export function labelIntervenante(membre) {
  if (!membre) return null;
  const prenom = String(membre.prenom || '').trim();
  const nom = String(membre.nom || '').trim();
  if (prenom || nom) return [prenom, nom].filter(Boolean).join(' ');
  const avant = String(membre.email || '').split('@')[0];
  if (!avant) return 'Membre';
  return avant.charAt(0).toUpperCase() + avant.slice(1);
}

/** Le prénom seul, pour « avec Léa » sur une carte du portail. */
export function prenomIntervenante(membre) {
  if (!membre) return null;
  const prenom = String(membre.prenom || '').trim();
  if (prenom) return prenom;
  return labelIntervenante(membre);
}

/**
 * Ce que le PORTAIL a le droit de montrer d'un membre de l'équipe : prénom,
 * nom, bio, photo. Jamais l'email, jamais le rôle, jamais les droits. Un
 * membre sans prénom ni photo n'est pas montré : « claire@… » n'a rien à
 * faire sur une page publique.
 */
export function membrePourPortail(membre) {
  if (!membre) return null;
  const prenom = String(membre.prenom || '').trim();
  if (!prenom) return null;
  return {
    id: membre.id,
    prenom,
    nom: String(membre.nom || '').trim() || null,
    bio: String(membre.bio || '').trim() || null,
    photo_url: membre.photo_url || null,
  };
}

/** Réunit propriétaire (depuis profiles) et membres pour la page « L'équipe ». */
export function equipePourPortail(profile, membres) {
  const proprio = profile ? {
    id: 'proprietaire',
    prenom: String(profile.prenom || '').trim() || null,
    nom: String(profile.nom || '').trim() || null,
    bio: null,
    photo_url: profile.photo_url || null,
    proprietaire: true,
  } : null;
  const autres = (membres || [])
    .filter(m => m.role !== 'proprietaire')
    .map(membrePourPortail)
    .filter(Boolean);
  return [proprio, ...autres].filter(m => m && m.prenom);
}
