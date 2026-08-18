/**
 * Documents d'inscription du studio (v85) — questionnaire santé (QS-SPORT),
 * CGV / règlement intérieur… que la prof dépose dans Paramètres → Ma page et
 * que les élèves téléchargent à l'inscription (formulaire d'essai) et depuis
 * leur espace, avec la consigne « imprime et rapporte signé » (pas de
 * signature électronique — demande Patricia 2026-08-18).
 *
 * Forme en DB (profiles.docs_inscription jsonb) :
 *   [{ url, nom, ajoute_le }]   (url = Vercel Blob public, max MAX_DOCS)
 *
 * TOUTE lecture passe par getDocsInscription : requête SÉPARÉE et défensive —
 * tant que la migration v85 n'est pas appliquée, la colonne n'existe pas et
 * un select explicite qui la nommerait tuerait la page entière (42703, la
 * classe de bug la plus meurtrière du projet). Ici : erreur → [].
 */

export const MAX_DOCS = 3;

export function sanitizeDocs(value) {
  if (!Array.isArray(value)) return [];
  return value
    .filter(d => d && typeof d.url === 'string' && /^https:\/\//.test(d.url) && typeof d.nom === 'string' && d.nom.trim())
    .slice(0, MAX_DOCS)
    .map(d => ({ url: d.url, nom: d.nom.trim().slice(0, 80), ajoute_le: d.ajoute_le || null }));
}

/** Lecture défensive (server ou client authentifié). Colonne absente → []. */
export async function getDocsInscription(supabase, profileId) {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('docs_inscription')
      .eq('id', profileId)
      .maybeSingle();
    if (error) return []; // v85 pas appliquée (42703) ou RLS → pas de docs, jamais de casse
    return sanitizeDocs(data?.docs_inscription);
  } catch {
    return [];
  }
}
