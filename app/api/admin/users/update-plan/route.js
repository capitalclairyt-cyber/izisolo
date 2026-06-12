import { createServerClient } from '@/lib/supabase-server';
import { createAdminClient } from '@/lib/supabase-admin';
import { parseJsonBody, adminUpdatePlanSchema } from '@/lib/validation';
import { isAdminEmail } from '@/lib/admin';

export async function POST(request) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user || !isAdminEmail(user.email)) {
    return new Response('Forbidden', { status: 403 });
  }

  const { data, errorResponse } = await parseJsonBody(request, adminUpdatePlanSchema);
  if (errorResponse) return errorResponse;
  const { userId, plan } = data;

  // Écriture via le client ADMIN : avec le client session, la RLS de profiles
  // (id = auth.uid()) rendait l'update d'un AUTRE profil silencieusement sans
  // effet (0 ligne touchée, { ok: true } mensonger). Sprint 3 audit.
  const admin = createAdminClient();
  const { data: updated, error } = await admin
    .from('profiles')
    .update({ plan })
    .eq('id', userId)
    .select('id');

  if (error) {
    console.error('update-plan error:', error);
    return new Response('Server error', { status: 500 });
  }
  if (!updated?.length) {
    return Response.json({ error: 'Profil introuvable' }, { status: 404 });
  }

  return new Response(JSON.stringify({ ok: true }), {
    headers: { 'Content-Type': 'application/json' },
  });
}
