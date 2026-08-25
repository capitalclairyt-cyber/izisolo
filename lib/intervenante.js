// ============================================================================
// IziSolo — Qui donne cette séance (v103, lot 3b du chantier multi-prof)
// ----------------------------------------------------------------------------
// SOURCE UNIQUE de la lecture et de l'écriture de `cours.intervenant_id`.
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
 * studio. Le propriétaire en fait partie — c'est elle qui donne la plupart
 * des cours.
 */
export async function chargerIntervenantes(supabase, studioId) {
  try {
    const { data, error } = await supabase
      .from('studio_membres')
      .select('id, email, role, statut, auth_user_id')
      .eq('profile_id', studioId)
      .eq('statut', 'actif')
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
 * Le nom lisible d'un membre. On n'a que son email tant qu'elle n'a pas de
 * fiche : mieux vaut « claire@… » que « Membre #3 ».
 */
export function labelIntervenante(membre) {
  if (!membre) return null;
  const avant = String(membre.email || '').split('@')[0];
  if (!avant) return 'Membre';
  return avant.charAt(0).toUpperCase() + avant.slice(1);
}
