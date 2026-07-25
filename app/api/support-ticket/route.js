import { withRoute } from '@/lib/api-route';
import { parseJsonBody, supportTicketSchema } from '@/lib/validation';
import { reportError } from '@/lib/report';

export const POST = withRoute({ auth: 'user' }, async ({ request, auth }) => {
  const { user, supabase } = auth;

  const { data, errorResponse } = await parseJsonBody(request, supportTicketSchema);
  if (errorResponse) return errorResponse;
  const { subject, message } = data;

  const { error } = await supabase.from('support_tickets').insert({
    user_id: user.id,
    user_email: user.email,
    subject: subject || null,
    message,
    status: 'open',
  });

  if (error) {
    reportError('create ticket error:', error);
    return new Response('Server error', { status: 500 });
  }

  return new Response(JSON.stringify({ ok: true }), {
    headers: { 'Content-Type': 'application/json' },
  });
});
