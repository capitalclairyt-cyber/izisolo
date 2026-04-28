import { createServerClient } from '@/lib/supabase-server';
import { parseJsonBody, adminTicketUpdateSchema } from '@/lib/validation';

const ADMIN_EMAILS = [
  'admin@melutek.fr',
  'colin.boulgakoff@free.fr',
];

export async function POST(request) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user || !ADMIN_EMAILS.includes(user.email)) {
    return new Response('Forbidden', { status: 403 });
  }

  const { data, errorResponse } = await parseJsonBody(request, adminTicketUpdateSchema);
  if (errorResponse) return errorResponse;
  const { ticketId, status, admin_reply } = data;

  const updates = { updated_at: new Date().toISOString() };
  if (status) updates.status = status;
  if (admin_reply !== undefined) updates.admin_reply = admin_reply;

  const { error } = await supabase
    .from('support_tickets')
    .update(updates)
    .eq('id', ticketId);

  if (error) {
    console.error('update ticket error:', error);
    return new Response('Server error', { status: 500 });
  }

  return new Response(JSON.stringify({ ok: true }), {
    headers: { 'Content-Type': 'application/json' },
  });
}
