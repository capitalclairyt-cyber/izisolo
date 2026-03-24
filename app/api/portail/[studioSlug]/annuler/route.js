import { createServerClient } from '@/lib/supabase-server';
import { createClient as createAdminSupabase } from '@supabase/supabase-js';

export async function POST(request, { params }) {
  const { studioSlug } = await params;
  const { presenceId } = await request.json();

  if (!presenceId) {
    return Response.json({ error: 'Données manquantes' }, { status: 400 });
  }

  // Vérifier que l'utilisateur est authentifié
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return Response.json({ error: 'Non authentifié' }, { status: 401 });
  }

  const supabaseAdmin = createAdminSupabase(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  // Vérifier que le studio existe
  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('id')
    .eq('studio_slug', studioSlug)
    .single();

  if (!profile) {
    return Response.json({ error: 'Studio introuvable' }, { status: 404 });
  }

  // Trouver le client lié à cet user dans ce studio
  const { data: client } = await supabaseAdmin
    .from('clients')
    .select('id')
    .eq('profile_id', profile.id)
    .ilike('email', user.email)
    .single();

  if (!client) {
    return Response.json({ error: 'Client introuvable' }, { status: 404 });
  }

  // Vérifier que la présence appartient bien à ce client dans ce studio
  const { data: presence } = await supabaseAdmin
    .from('presences')
    .select('id, cours:cours_id(date, est_annule)')
    .eq('id', presenceId)
    .eq('client_id', client.id)
    .eq('profile_id', profile.id)
    .single();

  if (!presence) {
    return Response.json({ error: 'Réservation introuvable' }, { status: 404 });
  }

  // Vérifier que le cours n'est pas déjà passé
  const today = new Date().toISOString().slice(0, 10);
  if (presence.cours && presence.cours.date < today) {
    return Response.json({ error: 'Ce cours est déjà passé' }, { status: 400 });
  }

  // Supprimer la présence (annulation)
  const { error: deleteErr } = await supabaseAdmin
    .from('presences')
    .delete()
    .eq('id', presenceId);

  if (deleteErr) {
    console.error('annulation error:', deleteErr);
    return Response.json({ error: 'Erreur lors de l\'annulation' }, { status: 500 });
  }

  return Response.json({ ok: true });
}
