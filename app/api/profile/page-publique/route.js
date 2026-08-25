import { withRoute } from '@/lib/api-route';
import { z } from 'zod';
import { reportError } from '@/lib/report';

export const runtime = 'nodejs';

/**
 * Endpoints pour gérer le brouillon + publication de la page publique.
 *
 *  PATCH /api/profile/page-publique           → save brouillon (jsonb)
 *  POST  /api/profile/page-publique?action=publish  → applique brouillon aux vrais champs
 *  POST  /api/profile/page-publique?action=discard  → vide le brouillon
 */

const draftSchema = z.object({
  bio: z.string().max(400).nullable().optional(),
  philosophie: z.string().max(600).nullable().optional(),
  formations: z.string().max(500).nullable().optional(),
  annees_experience: z.number().int().min(0).max(80).nullable().optional(),
  horaires_studio: z.string().max(500).nullable().optional(),
  afficher_tarifs: z.boolean().optional(),
  afficher_horaires: z.boolean().optional(),
  faq_publique: z.array(z.object({
    q: z.string().max(200),
    a: z.string().max(2000),
  })).max(20).optional(),
  photo_url: z.string().url().nullable().optional(),
  photo_couverture: z.string().url().nullable().optional(),
  instagram_url: z.string().url().nullable().optional(),
  facebook_url: z.string().url().nullable().optional(),
  website_url: z.string().url().nullable().optional(),
});

export const PATCH = withRoute({ auth: 'user' }, async ({ request, auth }) => {
  const { studioId, supabase } = auth;
  let body;
  try { body = await request.json(); } catch { return Response.json({ error: 'JSON invalide' }, { status: 400 }); }
  const parsed = draftSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: 'Données invalides', issues: parsed.error.issues }, { status: 400 });
  }

  const { error } = await supabase
    .from('profiles')
    .update({ page_publique_draft: parsed.data })
    .eq('id', studioId);

  if (error) {
    reportError('[page-publique] save draft error:', error);
    return Response.json({ error: 'Erreur sauvegarde brouillon' }, { status: 500 });
  }
  return Response.json({ ok: true });
});

export const POST = withRoute({ auth: 'user' }, async ({ request, auth }) => {
  const { studioId, supabase } = auth;
  const url = new URL(request.url);
  const action = url.searchParams.get('action');

  // Charger profil + brouillon
  const { data: profile } = await supabase
    .from('profiles')
    .select('page_publique_draft')
    .eq('id', studioId)
    .single();

  if (action === 'publish') {
    const draft = profile?.page_publique_draft;
    if (!draft) {
      return Response.json({ error: 'Aucun brouillon à publier' }, { status: 400 });
    }
    // Copier les champs du brouillon vers les vrais champs + reset draft
    const { error } = await supabase
      .from('profiles')
      .update({
        ...draft,
        page_publique_draft: null,
        page_publique_published_at: new Date().toISOString(),
      })
      .eq('id', studioId);
    if (error) {
      reportError('[page-publique] publish error:', error);
      return Response.json({ error: 'Erreur publication' }, { status: 500 });
    }
    return Response.json({ ok: true, publishedAt: new Date().toISOString() });
  }

  if (action === 'discard') {
    const { error } = await supabase
      .from('profiles')
      .update({ page_publique_draft: null })
      .eq('id', studioId);
    if (error) return Response.json({ error: 'Erreur suppression brouillon' }, { status: 500 });
    return Response.json({ ok: true });
  }

  return Response.json({ error: 'action requise (publish | discard)' }, { status: 400 });
});
