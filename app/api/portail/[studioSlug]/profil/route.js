import { createServerClient } from '@/lib/supabase-server';
import { createAdminClient } from '@/lib/supabase-admin';

/**
 * PATCH /api/portail/[studioSlug]/profil
 * L'élève met à jour SES coordonnées (téléphone / adresse / ville) depuis son
 * espace. Auth par session : on retrouve la fiche client par l'email du compte
 * connecté. Seuls des champs non sensibles sont modifiables — jamais l'email,
 * le nom, le statut, les notes ou quoi que ce soit côté CRM du studio.
 */
export async function PATCH(request, { params }) {
  const { studioSlug } = await params;
  const body = await request.json().catch(() => null);
  if (!body) return Response.json({ error: 'JSON invalide' }, { status: 400 });

  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: 'Non authentifié' }, { status: 401 });

  const supabaseAdmin = createAdminClient();

  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('id')
    .eq('studio_slug', studioSlug)
    .single();
  if (!profile) return Response.json({ error: 'Studio introuvable' }, { status: 404 });

  const { data: client } = await supabaseAdmin
    .from('clients')
    .select('id')
    .eq('profile_id', profile.id)
    .ilike('email', user.email)
    .single();
  if (!client) return Response.json({ error: 'Client introuvable' }, { status: 404 });

  // Liste blanche stricte des champs modifiables par l'élève.
  const clean = (v) => {
    if (typeof v !== 'string') return null;
    const t = v.trim();
    return t ? t.slice(0, 200) : null;
  };
  const update = {
    telephone: clean(body.telephone),
    adresse_postale: clean(body.adresse_postale),
    ville: clean(body.ville),
  };

  const { error } = await supabaseAdmin
    .from('clients')
    .update(update)
    .eq('id', client.id);
  if (error) {
    console.error('[profil] update error:', error);
    return Response.json({ error: 'Erreur lors de la mise à jour' }, { status: 500 });
  }

  return Response.json({ ok: true, ...update });
}
