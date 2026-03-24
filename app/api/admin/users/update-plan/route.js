import { createServerClient } from '@/lib/supabase-server';

const ADMIN_EMAILS = [
  'admin@melutek.fr',
  'colin.boulgakoff@free.fr',
];

const VALID_PLANS = ['free', 'solo', 'pro', 'studio', 'premium'];

export async function POST(request) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user || !ADMIN_EMAILS.includes(user.email)) {
    return new Response('Forbidden', { status: 403 });
  }

  const { userId, plan } = await request.json();

  if (!userId || !VALID_PLANS.includes(plan)) {
    return new Response('Bad request', { status: 400 });
  }

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
