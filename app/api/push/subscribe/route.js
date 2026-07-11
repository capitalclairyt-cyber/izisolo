import { requireAuth } from '@/lib/api-auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/push/subscribe — enregistre un PushSubscription pour le user
 *   connecté (prof ou élève). Idempotent par endpoint.
 *   Body : { subscription: { endpoint, keys: { p256dh, auth } } }
 *
 * DELETE /api/push/subscribe — retire un abonnement.
 *   Body : { endpoint }
 *
 * Écriture via la session (RLS : user_id = auth.uid()).
 */
export async function POST(request) {
  let user, profile, supabase;
  try { ({ user, profile, supabase } = await requireAuth()); }
  catch (res) { return res; }

  let body;
  try { body = await request.json(); } catch { return Response.json({ error: 'JSON invalide' }, { status: 400 }); }

  const sub = body?.subscription;
  const endpoint = sub?.endpoint;
  const p256dh = sub?.keys?.p256dh;
  const auth = sub?.keys?.auth;
  if (!endpoint || !p256dh || !auth) {
    return Response.json({ error: 'Abonnement invalide' }, { status: 400 });
  }

  const role = profile?.studio_slug ? 'prof' : 'eleve';

  // Upsert par endpoint (unique) : re-souscrire depuis le même appareil met à
  // jour les clés/last_seen sans dupliquer.
  const { error } = await supabase
    .from('push_subscriptions')
    .upsert({
      user_id: user.id,
      email: (user.email || '').toLowerCase() || null,
      endpoint,
      p256dh,
      auth,
      role,
      user_agent: (request.headers.get('user-agent') || '').slice(0, 300),
      last_seen_at: new Date().toISOString(),
    }, { onConflict: 'endpoint' });

  if (error) {
    console.error('[push/subscribe] upsert error:', error.message);
    return Response.json({ error: 'Erreur serveur' }, { status: 500 });
  }
  return Response.json({ ok: true });
}

export async function DELETE(request) {
  let user, supabase;
  try { ({ user, supabase } = await requireAuth()); }
  catch (res) { return res; }

  let body;
  try { body = await request.json(); } catch { body = {}; }
  const endpoint = body?.endpoint;
  if (!endpoint) return Response.json({ error: 'endpoint requis' }, { status: 400 });

  await supabase
    .from('push_subscriptions')
    .delete()
    .eq('endpoint', endpoint)
    .eq('user_id', user.id);

  return Response.json({ ok: true });
}
