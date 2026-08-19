import { withRoute } from '@/lib/api-route';
import { countUnread } from '@/lib/messagerie';
import { escapeIlike } from '@/lib/utils';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/messagerie/unread
 * Retourne le compteur global de messages non lus pour le viewer.
 */
export const GET = withRoute({ auth: 'user' }, async ({ auth }) => {
  const { user, profile, supabase } = auth;

  // Pro = a un studio_slug configuré. Sinon élève.
  if (profile?.studio_slug) {
    const count = await countUnread(supabase, 'pro', profile.id);
    return Response.json({ count });
  }

  // Élève : agréger sur ses différents clients (multi-studios).
  // Chemin nominal v90 : fiches par RPC indexée (le .ilike global seq-scannait
  // toute la table clients à chaque poll — AUDIT-PERF cat 2.6) + UN agrégat
  // non-lus pour toutes les fiches d'un coup (cat 2.1).
  try {
    const { createAdminClient } = await import('@/lib/supabase-admin');
    const admin = createAdminClient();
    const { data: fiches, error: fichesErr } = await admin
      .rpc('fiches_par_email', { p_email: user.email });
    if (!fichesErr) {
      const clientIds = (fiches || []).map(f => f.id);
      if (clientIds.length === 0) return Response.json({ count: 0 });
      const { data: total, error: totalErr } = await admin.rpc('messages_non_lus_total', {
        p_viewer: 'eleve', p_profile_id: null, p_client_ids: clientIds,
      });
      if (!totalErr) return Response.json({ count: Number(total) || 0 });
    }
  } catch { /* pré-migration v90 → chemin historique ci-dessous */ }

  const { data: clients } = await supabase
    .from('clients')
    .select('id')
    .ilike('email', escapeIlike(user.email));
  let total = 0;
  for (const c of (clients || [])) {
    total += await countUnread(supabase, 'eleve', c.id);
  }
  return Response.json({ count: total });
});
