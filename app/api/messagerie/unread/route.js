import { requireAuth } from '@/lib/api-auth';
import { countUnread } from '@/lib/messagerie';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/messagerie/unread
 * Retourne le compteur global de messages non lus pour le viewer.
 */
export async function GET() {
  let user, profile, supabase;
  try {
    ({ user, profile, supabase } = await requireAuth());
  } catch (res) { return res; }

  // Pro = a un studio_slug configuré. Sinon élève.
  if (profile?.studio_slug) {
    const count = await countUnread(supabase, 'pro', profile.id);
    return Response.json({ count });
  }

  // Élève : agréger sur ses différents clients (multi-studios)
  const { data: clients } = await supabase
    .from('clients')
    .select('id')
    .ilike('email', user.email);
  let total = 0;
  for (const c of (clients || [])) {
    total += await countUnread(supabase, 'eleve', c.id);
  }
  return Response.json({ count: total });
}
