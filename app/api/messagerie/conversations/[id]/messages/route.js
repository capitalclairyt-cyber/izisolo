import { requireAuth } from '@/lib/api-auth';
import { sendMessage, resolveClientFromUserEmail } from '@/lib/messagerie';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/messagerie/conversations/[id]/messages?before=ISO&limit=50
 * Liste les messages d'une conversation (paginé desc).
 *
 * POST /api/messagerie/conversations/[id]/messages
 * Body: { content?, message_type?, media_url?, media_urls?[], shared_ref_type?, shared_ref_id? }
 *   - Pro envoie en sender_type='pro'
 *   - Élève envoie en sender_type='eleve' (vérifie qu'il est membre + email match)
 */

export async function GET(request, { params }) {
  let user, profile, supabase;
  try {
    ({ user, profile, supabase } = await requireAuth());
  } catch (res) { return res; }

  const { id: conversationId } = await params;
  const url = new URL(request.url);
  const limit = Math.min(parseInt(url.searchParams.get('limit') || '50'), 200);
  const before = url.searchParams.get('before');

  // Vérifier que le viewer a accès à cette conversation (RLS le couvre déjà mais on
  // préfère échouer fort pour le débug).
  const { data: conv } = await supabase
    .from('conversations')
    .select('id, type, profile_id, client_id, cours_id')
    .eq('id', conversationId)
    .maybeSingle();

  if (!conv) return Response.json({ error: 'Conversation introuvable' }, { status: 404 });

  let q = supabase
    .from('messages')
    .select('id, sender_type, sender_profile_id, sender_client_id, message_type, content, media_url, media_urls, shared_ref_type, shared_ref_id, announce_batch_id, created_at')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (before) q = q.lt('created_at', before);

  const { data: messages, error } = await q;
  if (error) {
    console.error('[messagerie] GET messages err:', error);
    return Response.json({ error: 'Erreur lecture messages' }, { status: 500 });
  }

  // Asc pour affichage (oldest → newest)
  return Response.json({ messages: (messages || []).reverse() });
}

export async function POST(request, { params }) {
  let user, profile, supabase;
  try {
    ({ user, profile, supabase } = await requireAuth());
  } catch (res) { return res; }

  const { id: conversationId } = await params;

  let body;
  try { body = await request.json(); } catch { return Response.json({ error: 'JSON invalide' }, { status: 400 }); }

  // Validation minimale : content OU media
  const hasContent = body.content && body.content.trim().length > 0;
  const hasMedia = (body.media_url && body.media_url.length > 0) ||
                   (Array.isArray(body.media_urls) && body.media_urls.length > 0);
  if (!hasContent && !hasMedia) {
    return Response.json({ error: 'Message vide' }, { status: 400 });
  }
  if (body.content && body.content.length > 4000) {
    return Response.json({ error: 'Message trop long (max 4000)' }, { status: 400 });
  }

  // Charger la conversation pour déterminer le rôle de l'expéditeur
  const { data: conv } = await supabase
    .from('conversations')
    .select('id, profile_id, type, client_id, cours_id')
    .eq('id', conversationId)
    .maybeSingle();
  if (!conv) return Response.json({ error: 'Conversation introuvable' }, { status: 404 });

  // L'expéditeur est-il le pro de cette conversation ?
  if (profile?.id === conv.profile_id) {
    try {
      const msg = await sendMessage(supabase, {
        conversationId,
        senderKind: 'pro',
        senderProfileId: profile.id,
        content: body.content || null,
        messageType: body.message_type || (hasMedia ? 'photo' : 'text'),
        mediaUrl: body.media_url || null,
        mediaUrls: body.media_urls || [],
        sharedRefType: body.shared_ref_type || null,
        sharedRefId: body.shared_ref_id || null,
      });
      return Response.json({ message: msg });
    } catch (err) {
      console.error('[messagerie] pro send err:', err);
      return Response.json({ error: 'Erreur envoi' }, { status: 500 });
    }
  }

  // Sinon, est-ce un élève membre de cette conversation ?
  const client = await resolveClientFromUserEmail(supabase, conv.profile_id, user.email);
  if (!client) {
    return Response.json({ error: 'Non autorisé' }, { status: 403 });
  }

  // Vérifier que client est bien membre
  const { data: member } = await supabase
    .from('conversation_members')
    .select('client_id')
    .eq('conversation_id', conversationId)
    .eq('client_id', client.id)
    .maybeSingle();
  if (!member) {
    return Response.json({ error: 'Pas membre de cette conversation' }, { status: 403 });
  }

  try {
    const msg = await sendMessage(supabase, {
      conversationId,
      senderKind: 'eleve',
      senderClientId: client.id,
      content: body.content || null,
      messageType: body.message_type || (hasMedia ? 'photo' : 'text'),
      mediaUrl: body.media_url || null,
      mediaUrls: body.media_urls || [],
    });
    return Response.json({ message: msg });
  } catch (err) {
    console.error('[messagerie] eleve send err:', err);
    return Response.json({ error: 'Erreur envoi' }, { status: 500 });
  }
}
