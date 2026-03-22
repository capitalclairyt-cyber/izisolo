import { createServerClient } from './supabase-server';

/**
 * Vérifie l'auth dans une API route.
 * Retourne { user, profile, supabase } ou lance une Response 401.
 */
export async function requireAuth() {
  const supabase = await createServerClient();
  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) {
    throw new Response(JSON.stringify({ error: 'Non authentifié' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Charger le profil
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  return { user, profile, supabase };
}

/**
 * Vérifie le secret cron pour les routes protégées
 */
export function requireCronAuth(request) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    throw new Response(JSON.stringify({ error: 'Non autorisé' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
