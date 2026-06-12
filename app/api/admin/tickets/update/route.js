import { createServerClient } from '@/lib/supabase-server';
import { createAdminClient } from '@/lib/supabase-admin';
import { parseJsonBody, adminTicketUpdateSchema } from '@/lib/validation';
import { isAdminEmail } from '@/lib/admin';

export async function POST(request) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user || !isAdminEmail(user.email)) {
    return new Response('Forbidden', { status: 403 });
  }

  const { data, errorResponse } = await parseJsonBody(request, adminTicketUpdateSchema);
  if (errorResponse) return errorResponse;
  const { ticketId, status, admin_reply } = data;

  const updates = { updated_at: new Date().toISOString() };
  if (status) updates.status = status;
  if (admin_reply !== undefined) updates.admin_reply = admin_reply;

  // Écriture via le client ADMIN : la RLS rendait l'update d'un ticket d'un
  // autre user silencieusement sans effet (0 ligne touchée). Sprint 3 audit.
  const admin = createAdminClient();
  const { data: updated, error } = await admin
    .from('support_tickets')
    .update(updates)
    .eq('id', ticketId)
    .select('id');

  if (error) {
    console.error('update ticket error:', error);
    return new Response('Server error', { status: 500 });
  }
  if (!updated?.length) {
    return Response.json({ error: 'Ticket introuvable' }, { status: 404 });
  }

  return new Response(JSON.stringify({ ok: true }), {
    headers: { 'Content-Type': 'application/json' },
  });
}
