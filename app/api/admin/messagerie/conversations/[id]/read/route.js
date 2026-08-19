import { withRoute } from '@/lib/api-route';
import { createAdminClient } from '@/lib/supabase-admin';
import { reportError } from '@/lib/report';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/admin/messagerie/conversations/[id]/read — messagerie support (v87).
 * L'équipe a ouvert le fil : support_admin_last_read_at = now().
 * (Le champ naît NULL = jamais lu, et n'est posé QUE par cette action ou une
 * réponse — anti-pattern DEFAULT now() § 12 de la bible.)
 */
export const POST = withRoute({ auth: 'admin' }, async ({ params }) => {
  const admin = createAdminClient();
  const { id: conversationId } = params;

  const { data, error } = await admin
    .from('conversations')
    .update({ support_admin_last_read_at: new Date().toISOString() })
    .eq('id', conversationId)
    .eq('type', 'support')
    .select('id')
    .maybeSingle();

  if (error) {
    reportError('[admin/messagerie] read err:', error, { route: '/api/admin/messagerie/conversations/[id]/read' });
    return Response.json({ error: 'Marquage impossible' }, { status: 500 });
  }
  if (!data) return Response.json({ error: 'Fil support introuvable' }, { status: 404 });
  return Response.json({ ok: true });
});
