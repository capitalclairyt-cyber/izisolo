/**
 * Cours en ligne (v86, feedback Ariana 2026-08-19) — SOURCE UNIQUE.
 *
 * Deux responsabilités :
 *   1. `lienVisioVisible(...)` : LA règle de visibilité du lien de visio pour
 *      une inscrite. Toute surface qui montre (ou tait) le lien passe par ici
 *      — espace élève, rappel J-1, page cours portail. Verrou CI : visio.spec.js.
 *   2. `getVisioCours(sb, coursId)` : lecture DÉFENSIVE des colonnes v86
 *      (requête séparée — les nommer dans un select partagé tuerait la page
 *      entière tant que la migration n'est pas appliquée, classe 42703).
 *
 * Règle de visibilité (v1) : le lien se révèle quand le paiement est CONSTATÉ
 * dans IziSolo — pas à la seconde d'un paiement Stripe externe (v2, webhook
 * par cours). Concrètement :
 *   - cours non verrouillé (lien_visio_verrouille = false) → visible ;
 *   - présence couverte par un carnet/abo (abonnement_id lié) → visible ;
 *   - paiement 'paid' rattaché à la présence (presence_id, v65) → visible ;
 *   - présence essai ou offerte (la prof a accepté/offert) → visible ;
 *   - sinon → verrouillé (« le lien apparaîtra une fois ta séance réglée »).
 */

export function estCoursEnLigne(cours) {
  return cours?.format === 'visio' || cours?.format === 'hybride';
}

/** Assainit une URL de visio saisie par la prof ('' si invalide).
 *  Parse réel via new URL (un simple regex laissait passer
 *  « https://javascript:alert(1) » après préfixage). https only. */
export function sanitizeLienVisio(url) {
  const u = String(url || '').trim();
  if (!u || u.length > 500) return '';
  const avecProto = /^https?:\/\//i.test(u) ? u : `https://${u}`;
  try {
    const parsed = new URL(avecProto);
    if (parsed.protocol !== 'https:' || !parsed.hostname.includes('.')) return '';
    return avecProto;
  } catch {
    return '';
  }
}

/**
 * Le lien doit-il être montré à CETTE inscrite ?
 * @param {object} visio    { lien_visio, lien_visio_verrouille } (via getVisioCours)
 * @param {object} presence { abonnement_id, type_presence } — la présence de l'élève
 * @param {Array}  paiementsPresence paiements rattachés à cette présence [{statut}]
 */
export function lienVisioVisible(visio, presence, paiementsPresence = []) {
  if (!visio?.lien_visio) return false;
  if (visio.lien_visio_verrouille === false) return true;
  if (!presence) return false;
  if (presence.abonnement_id) return true; // couverte par carnet/abo
  if (['essai', 'offert'].includes(presence.type_presence)) return true;
  return paiementsPresence.some(p => p?.statut === 'paid');
}

/** Lecture défensive des colonnes v86 (migration pas appliquée → null). */
export async function getVisioCours(supabase, coursId) {
  if (!coursId) return null;
  try {
    const { data, error } = await supabase
      .from('cours')
      .select('lien_visio, lien_visio_verrouille')
      .eq('id', coursId)
      .maybeSingle();
    if (error || !data?.lien_visio) return null;
    return { lien_visio: data.lien_visio, lien_visio_verrouille: data.lien_visio_verrouille !== false };
  } catch {
    return null;
  }
}

/** Variante lot : map coursId → visio (une requête, défensive). */
export async function getVisioCoursMap(supabase, coursIds = []) {
  const ids = [...new Set(coursIds.filter(Boolean))];
  if (!ids.length) return {};
  try {
    const { data, error } = await supabase
      .from('cours')
      .select('id, lien_visio, lien_visio_verrouille')
      .in('id', ids);
    if (error) return {};
    const map = {};
    for (const c of data || []) {
      if (c.lien_visio) map[c.id] = { lien_visio: c.lien_visio, lien_visio_verrouille: c.lien_visio_verrouille !== false };
    }
    return map;
  } catch {
    return {};
  }
}
