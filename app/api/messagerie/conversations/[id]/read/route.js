import { withRoute } from '@/lib/api-route';
import { markRead, resolveClientFromUserEmail } from '@/lib/messagerie';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/messagerie/conversations/[id]/read
 * Marque la conversation comme lue par le viewer (pro ou élève).
 */
export const POST = withRoute({ auth: 'user' }, async ({ params, auth }) => {
  const { user, profile, supabase } = auth;
  const { id: conversationId } = params;

  const { data: conv } = await supabase
    .from('conversations')
    .select('id, profile_id')
    .eq('id', conversationId)
    .maybeSingle();
  if (!conv) return Response.json({ error: 'Conversation introuvable' }, { status: 404 });

  if (profile?.id === conv.profile_id) {
    await markRead(supabase, conversationId, 'pro', profile.id);
    return Response.json({ ok: true });
  }

  const client = await resolveClientFromUserEmail(supabase, conv.profile_id, user.email);
  if (!client) return Response.json({ error: 'Non autorisé' }, { status: 403 });

  await markRead(supabase, conversationId, 'eleve', client.id);
  return Response.json({ ok: true });
});
