import { z } from 'zod';
import { withRoute } from '@/lib/api-route';
import { createAdminClient } from '@/lib/supabase-admin';
import { reportError } from '@/lib/report';

const schema = z.object({
  demandeId: z.string().uuid(),
  statut: z.enum(['nouvelle', 'en_cours', 'creee', 'sans_suite']),
  admin_note: z.string().trim().max(2000).nullable().optional(),
});

// Triage des demandes « on crée mon studio » depuis /admin/demandes (v96).
// La table est service_role only : l'écriture passe par le client admin.
export const POST = withRoute({ auth: 'admin', schema }, async ({ body }) => {
  const { demandeId, statut, admin_note } = body;

  const updates = { statut };
  // traitee_at suit le statut : posé à la clôture, nettoyé si on rouvre.
  updates.traitee_at = (statut === 'creee' || statut === 'sans_suite')
    ? new Date().toISOString()
    : null;
  if (admin_note !== undefined) updates.admin_note = admin_note || null;

  const { data, error } = await createAdminClient()
    .from('demandes_studio')
    .update(updates)
    .eq('id', demandeId)
    .select('id');

  if (error) {
    reportError('[admin/demandes] update:', error, { route: '/api/admin/demandes/update' });
    return Response.json({ error: 'Enregistrement impossible' }, { status: 500 });
  }
  if (!data?.length) {
    return Response.json({ error: 'Demande introuvable' }, { status: 404 });
  }

  return Response.json({ ok: true });
});
