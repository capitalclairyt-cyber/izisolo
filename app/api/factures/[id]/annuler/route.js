import { withRoute } from '@/lib/api-route';
import { createAdminClient } from '@/lib/supabase-admin';
import { reportError } from '@/lib/report';

/**
 * Annule une facture émise (v84) — le geste « je me suis trompée » de la prof.
 * Le numéro reste BRÛLÉ dans la séquence (marqué annulé, jamais réattribué)
 * et les paiements sont libérés pour re-facturation. RPC atomique.
 */
export const POST = withRoute({ auth: 'active' }, async ({ params, auth }) => {
  const { user } = auth;
  const { id } = params;
  const admin = createAdminClient();

  const { data, error } = await admin.rpc('annuler_facture', {
    p_profile_id: user.id,
    p_facture_id: id,
  });

  if (error) {
    const rpcAbsente = error.code === '42883' || error.code === 'PGRST202';
    if (!rpcAbsente) reportError('[factures annuler] err:', error, { route: '/api/factures/[id]/annuler' });
    return Response.json({ error: 'Annulation impossible — réessaie.' }, { status: 500 });
  }
  if (!data?.ok) {
    return Response.json({ error: 'Facture introuvable ou déjà annulée.' }, { status: 404 });
  }

  return Response.json({ ok: true });
});
