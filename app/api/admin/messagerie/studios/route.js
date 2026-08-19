import { withRoute } from '@/lib/api-route';
import { createAdminClient } from '@/lib/supabase-admin';
import { reportError } from '@/lib/report';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/messagerie/studios — le picker « Écrire à une prof » de
 * /admin/messagerie (v87b). Tous les VRAIS profs (studio_slug configuré),
 * triés par nom de studio.
 */
export const GET = withRoute({ auth: 'admin' }, async () => {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from('profiles')
    .select('id, prenom, studio_nom, studio_slug')
    .not('studio_slug', 'is', null)
    .order('studio_nom', { ascending: true })
    .limit(500);
  if (error) {
    reportError('[admin/messagerie] studios err:', error, { route: '/api/admin/messagerie/studios' });
    return Response.json({ error: 'Lecture impossible' }, { status: 500 });
  }
  return Response.json({
    studios: (data || []).map(p => ({
      id: p.id,
      prenom: p.prenom || '',
      studio_nom: p.studio_nom || p.studio_slug || 'Studio',
    })),
  });
});
