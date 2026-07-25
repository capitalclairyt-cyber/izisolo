import { slugify } from './utils';

/**
 * Slug de studio UNIQUE (B1d) : slugify + fallback 'studio' + dédoublonnage
 * -2, -3… contre les slugs existants.
 *
 * `profiles.studio_slug` est UNIQUE en DB : l'onboarding posait un slug BRUT
 * → la 2e « Studio Yoga » de France prenait un 23505 masqué en « Vérifie ta
 * connexion et réessaie », bloquée à vie au wizard. Paramètres avait déjà la
 * logique complète — extraite ici pour tous les appelants.
 */
export async function genererSlugStudioUnique(supabase, studioNom, profileId) {
  const base = slugify(studioNom || '') || 'studio';
  let candidate = base;
  let suffix = 1;
  while (suffix < 50) {
    const { data: existing, error } = await supabase
      .from('profiles')
      .select('id')
      .eq('studio_slug', candidate)
      .neq('id', profileId)
      .maybeSingle();
    if (error) throw error;
    if (!existing) return candidate;
    suffix += 1;
    candidate = `${base}-${suffix}`;
  }
  // 50 collisions : improbable — suffixe aléatoire court en dernier recours.
  return `${base}-${Math.random().toString(36).slice(2, 6)}`;
}
