/**
 * lib/visibilite.js — Visibilité conditionnelle des cours sur le portail public.
 *
 * Niveaux :
 *   - 'public'    : visible par tous les visiteurs (default)
 *   - 'inscrits'  : visible si le visiteur est un client du studio (a une fiche)
 *   - 'abonnes'   : visible si le visiteur a un abonnement ACTIF dans le studio
 *   - 'fideles'   : visible si le client a statut='fidele'
 *
 * L'app résout l'auth context une fois (user → client → abos), puis filtre la
 * liste de cours en mémoire avec canSeeCours().
 */

export const VISIBILITE_OPTIONS = [
  { value: 'public',   label: 'Tout le monde',          desc: 'Visible par tous les visiteurs du portail.' },
  { value: 'inscrits', label: 'Élèves inscrits',         desc: 'Seulement les personnes ayant déjà une fiche dans ton studio.' },
  { value: 'abonnes',  label: 'Détenteurs d\'abonnement', desc: 'Seulement les élèves avec un abonnement actif (carnet, mensuel, etc.).' },
  { value: 'fideles',  label: 'Élèves fidèles',          desc: 'Seulement les élèves marqués \'Fidèle\' dans ta CRM.' },
];

/**
 * Détermine si un cours est visible pour un viewer donné.
 *
 * @param {string} coursVisibilite - 'public' | 'inscrits' | 'abonnes' | 'fideles'
 * @param {object|null} clientInfo - { statut, has_active_abo } ou null si non-client
 * @returns {boolean}
 */
export function canSeeCours(coursVisibilite, clientInfo) {
  const v = coursVisibilite || 'public';
  if (v === 'public') return true;
  if (!clientInfo) return false;
  if (v === 'inscrits') return true;          // client existant = inscrit
  if (v === 'abonnes')  return !!clientInfo.has_active_abo;
  if (v === 'fideles')  return clientInfo.statut === 'fidele';
  return false;
}

/**
 * Filtre une liste de cours selon le viewer (server-side).
 *
 * @param {Array} cours
 * @param {object|null} clientInfo
 * @returns {Array}
 */
export function filterCoursVisibles(cours, clientInfo) {
  if (!Array.isArray(cours)) return [];
  return cours.filter(c => canSeeCours(c.visibilite, clientInfo));
}

/**
 * Résout le clientInfo d'un visiteur depuis Supabase (server-side).
 * Retourne null si :
 *   - pas authentifié
 *   - authentifié mais pas client de ce studio (pas de fiche email match)
 *
 * @param supabase  client Supabase server (anon ou service)
 * @param profileId  id du studio
 * @param userEmail  email du visiteur authentifié (= auth.email())
 * @returns {Promise<{client_id, statut, has_active_abo}|null>}
 */
export async function resolveClientInfo(supabase, profileId, userEmail) {
  if (!profileId || !userEmail) return null;
  const { data: client } = await supabase
    .from('clients')
    .select('id, statut')
    .eq('profile_id', profileId)
    .ilike('email', userEmail)
    .maybeSingle();
  if (!client) return null;

  const { data: abos } = await supabase
    .from('abonnements')
    .select('id, statut, date_fin')
    .eq('profile_id', profileId)
    .eq('client_id', client.id)
    .eq('statut', 'actif');

  const today = new Date().toISOString().slice(0, 10);
  const has_active_abo = (abos || []).some(a => !a.date_fin || a.date_fin >= today);

  return {
    client_id: client.id,
    statut: client.statut || 'prospect',
    has_active_abo,
  };
}
