import { createServerClient } from '@/lib/supabase-server';
import { parseJsonBody, adminUpdatePlanSchema } from '@/lib/validation';

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

  const { data, errorResponse } = await parseJsonBody(request, adminUpdatePlanSchema);
  if (errorResponse) return errorResponse;
  const { userId, plan } = data;

  const { error } = await supabase
    .from('profiles')
    .update({ plan })
    .eq('id', userId);

  if (error) {
    console.error('update-plan error:', error);
    return new Response('Server error', { status: 500 });
  }

  return new Response(JSON.stringify({ ok: true }), {
    headers: { 'Content-Type': 'application/json' },
  });
}
