import { requireAuth } from '@/lib/api-auth';
import { createClient as createAdminSupabase } from '@supabase/supabase-js';

export async function POST(request) {
  let profile;
  try {
    ({ profile } = await requireAuth());
  } catch (res) { return res; }

  let body;
  try { body = await request.json(); } catch {
    return Response.json({ error: 'JSON invalide' }, { status: 400 });
  }

  const { type, message, url } = body;

  if (!message || typeof message !== 'string' || message.trim().length < 1 || message.length > 4000) {
    return Response.json({ error: 'Message requis (1-4000 caractères)' }, { status: 400 });
  }

  const validTypes = ['bug', 'manque', 'confus', 'kiff', 'autre'];
  const feedbackType = validTypes.includes(type) ? type : 'autre';

  const userAgent = (request.headers.get('user-agent') || '').slice(0, 500);

  const supabaseAdmin = createAdminSupabase(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  const { error } = await supabaseAdmin.from('feedback').insert({
    user_id: profile.id,
    type: feedbackType,
    message: message.trim(),
    url: url || null,
    user_agent: userAgent || null,
  });

  if (error) {
    console.error('[feedback] insert error:', error);
    return Response.json({ error: 'Erreur serveur' }, { status: 500 });
  }

  return Response.json({ ok: true });
}
