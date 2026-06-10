import { createClient } from '@supabase/supabase-js';

/**
 * Client admin (service_role) — SEUL point d'accès à la clé service_role.
 *
 * RÈGLES (enforced par ESLint no-restricted-syntax hors lib/) :
 *   1. Ne JAMAIS instancier la clé service_role ailleurs que dans ce fichier.
 *   2. Le service_role CONTOURNE la RLS : toute requête DOIT être scopée
 *      tenant explicitement (.eq('profile_id', …) / .eq('client_id', …) /
 *      vérification d'appartenance AVANT l'écriture). Un filtre oublié =
 *      fuite cross-studio silencieuse.
 *   3. Jamais côté navigateur (server-only).
 *
 * Usage légitime : crons, webhooks Stripe, routes portail public (lectures
 * de contenu public + écritures validées), helpers serveur (magic link).
 */

/**
 * Factory — à privilégier dans les routes. Garde-fou env : échoue
 * explicitement si la clé n'est pas montée (au lieu d'un client muet
 * créé avec `undefined` qui échoue plus loin de façon cryptique).
 */
export function createAdminClient() {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('[supabase-admin] SUPABASE_SERVICE_ROLE_KEY absente de l\'environnement');
  }
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
}

// Singleton historique (13 importeurs : crons, pages serveur portail, helpers).
// Conservé pour compat — mêmes règles de scoping tenant.
export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);
