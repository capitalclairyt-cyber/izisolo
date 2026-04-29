import { requireAuth } from '@/lib/api-auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/messagerie/conversations/[id]
 * Retourne les métadonnées d'une conversation (pour afficher en header de
 * ChatRoom : titre, peer_label, etc.).
 */
export async function GET(_request, { params }) {
  let user, profile, supabase;
  try {
    ({ user, profile, supabase } = await requireAuth());
  } catch (res) {
    return res;
  }
  const { id: conversationId } = await params;

  const { data: conv, error } = await supabase
    .from('conversations')
    .select('id, type, titre, profile_id, client_id, cours_id, last_message_at, archived')
    .eq('id', conversationId)
    .maybeSingle();
  if (error) return Response.json({ error: error.message }, { status: 500 });
  if (!conv) return Response.json({ error: 'Conversation introuvable' }, { status: 404 });

  // Hydrater peer_label selon le viewer
  let peer_label = conv.titre || '';
  let is_owner_pro = false;

  if (profile?.studio_slug && profile.id === conv.profile_id) {
    is_owner_pro = true;
    if (!peer_label) {
      if (conv.type === 'client' && conv.client_id) {
        const { data: cl } = await supabase
          .from('clients')
          .select('prenom, nom')
          .eq('id', conv.client_id)
          .maybeSingle();
        peer_label = `${cl?.prenom || ''} ${cl?.nom || ''}`.trim() || 'Élève';
      } else if (conv.type === 'cours' && conv.cours_id) {
        const { data: co } = await supabase
          .from('cours')
          .select('nom, date, heure')
          .eq('id', conv.cours_id)
          .maybeSingle();
        peer_label = co?.nom || 'Cours';
      }
    }
  } else {
    // Côté élève : on affiche le studio_nom
    if (!peer_label) {
      const { data: studio } = await supabase
        .from('profiles')
        .select('studio_nom')
        .eq('id', conv.profile_id)
        .maybeSingle();
      peer_label = studio?.studio_nom || 'Studio';
    }
  }

  return Response.json({
    conversation: {
      id: conv.id,
      type: conv.type,
      titre: conv.titre,
      peer_label,
      is_owner_pro,
    },
  });
}

/**
 * PATCH /api/messagerie/conversations/[id]
 * Body: { titre?: string|null }
 *
 * Pour l'instant : permet au PRO propriétaire de la conversation de
 * renommer son titre. Le titre est partagé pro/élève (visible des 2 côtés).
 *
 * Auth : seul le pro owner peut renommer (vérifié via profile_id = auth.uid()).
 */
export async function PATCH(request, { params }) {
  let supabase;
  try {
    ({ supabase } = await requireAuth());
  } catch (res) {
    return res;
  }

  const { id: conversationId } = await params;

  let body;
  try { body = await request.json(); } catch { return Response.json({ error: 'JSON invalide' }, { status: 400 }); }

  const updates = {};
  if (body.titre !== undefined) {
    const t = typeof body.titre === 'string' ? body.titre.trim() : null;
    updates.titre = t === '' ? null : t;
    if (updates.titre && updates.titre.length > 200) {
      return Response.json({ error: 'Titre trop long (max 200)' }, { status: 400 });
    }
  }

  if (Object.keys(updates).length === 0) {
    return Response.json({ error: 'Aucun champ à mettre à jour' }, { status: 400 });
  }

  // L'UPDATE est filtré par RLS — la policy "Pro CRUD ses conversations" assure
  // que seul le pro owner peut modifier. Si le caller n'est pas owner, 0 row
  // affectée.
  const { data, error } = await supabase
    .from('conversations')
    .update(updates)
    .eq('id', conversationId)
    .select()
    .maybeSingle();

  if (error) {
    console.error('[messagerie PATCH] err:', error);
    return Response.json({ error: 'Erreur mise à jour', detail: error.message }, { status: 500 });
  }
  if (!data) {
    return Response.json({ error: 'Conversation introuvable ou non autorisé' }, { status: 404 });
  }

  return Response.json({ conversation: data });
}
