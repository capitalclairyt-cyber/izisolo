import { createServerClient } from '@/lib/supabase-server';
import { parseJsonBody, supportTicketSchema } from '@/lib/validation';

export async function POST(request) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return new Response('Unauthorized', { status: 401 });

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
    console.error('create ticket error:', error);
    return new Response('Server error', { status: 500 });
  }

  return new Response(JSON.stringify({ ok: true }), {
    headers: { 'Content-Type': 'application/json' },
  });
}
