import { createClient as createAdminSupabase } from '@supabase/supabase-js';
import { parseJsonBody, listeAttenteSchema } from '@/lib/validation';

export async function POST(request, { params }) {
  const { studioSlug } = await params;
  const { data: body, errorResponse } = await parseJsonBody(request, listeAttenteSchema);
  if (errorResponse) return errorResponse;
  const { coursId, nom, email, tel } = body;

  const supabaseAdmin = createAdminSupabase(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  // Vérifier studio + cours
  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('id, studio_nom')
    .eq('studio_slug', studioSlug)
    .single();
  if (!profile) return Response.json({ error: 'Studio introuvable' }, { status: 404 });

  const { data: cours } = await supabaseAdmin
    .from('cours')
    .select('id, nom, date, capacite_max, est_annule, profile_id')
    .eq('id', coursId)
    .eq('profile_id', profile.id)
    .single();
  if (!cours) return Response.json({ error: 'Cours introuvable' }, { status: 404 });
  if (cours.est_annule) return Response.json({ error: 'Ce cours est annulé' }, { status: 400 });

  const today = new Date().toISOString().slice(0, 10);
  if (cours.date < today) return Response.json({ error: 'Ce cours est passé' }, { status: 400 });

  // Vérifier que le cours est BIEN complet (sécurité : pas la peine d'inscrire en LA si une place est libre)
  if (!cours.capacite_max) {
    return Response.json({ error: 'Ce cours n\'a pas de capacité limitée' }, { status: 400 });
  }
  const { count: nbInscrits } = await supabaseAdmin
    .from('presences')
    .select('id', { count: 'exact', head: true })
    .eq('cours_id', coursId);
  if ((nbInscrits || 0) < cours.capacite_max) {
    return Response.json({ error: 'Ce cours a encore des places — réserve directement.' }, { status: 400 });
  }

  // Lier au client si email connu dans ce studio
  const { data: existingClient } = await supabaseAdmin
    .from('clients')
    .select('id')
    .eq('profile_id', profile.id)
    .ilike('email', email)
    .maybeSingle();

  // Calculer position (taille actuelle + 1)
  const { count: tailleListe } = await supabaseAdmin
    .from('liste_attente')
    .select('id', { count: 'exact', head: true })
    .eq('cours_id', coursId);
  const position = (tailleListe || 0) + 1;

  // Upsert (unique sur cours_id + email)
  const { data: row, error: insertErr } = await supabaseAdmin
    .from('liste_attente')
    .upsert({
      profile_id: profile.id,
      cours_id: coursId,
      client_id: existingClient?.id || null,
      email,
      nom,
      telephone: tel || null,
      position,
    }, { onConflict: 'cours_id,email' })
    .select('id, position')
    .single();

  if (insertErr) {
    console.error('liste-attente insert error:', insertErr);
    return Response.json({ error: 'Erreur lors de l\'inscription' }, { status: 500 });
  }

  return Response.json({
    ok: true,
    position: row?.position || position,
  });
}
