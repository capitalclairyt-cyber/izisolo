import { withRoute } from '@/lib/api-route';
import { createAdminClient } from '@/lib/supabase-admin';
import { parseJsonBody, adminFeedbackUpdateSchema } from '@/lib/validation';
import { reportError } from '@/lib/report';

// Triage des feedbacks bêta depuis /admin/feedbacks (statut + note interne).
export const POST = withRoute({ auth: 'admin' }, async ({ request }) => {
  const { data, errorResponse } = await parseJsonBody(request, adminFeedbackUpdateSchema);
  if (errorResponse) return errorResponse;
  const { feedbackId, status, admin_note } = data;

  const updates = {};
  if (status) {
    updates.status = status;
    // resolved_at suit le statut (posé en clôture, nettoyé si on rouvre).
    updates.resolved_at = (status === 'resolved' || status === 'wontfix')
      ? new Date().toISOString()
      : null;
  }
  if (admin_note !== undefined) updates.admin_note = admin_note || null;

  if (!Object.keys(updates).length) {
    return Response.json({ error: 'Rien à mettre à jour' }, { status: 400 });
  }

  // Écriture via le client ADMIN (la table feedback n'a pas de policy admin).
  const admin = createAdminClient();
  const { data: updated, error } = await admin
    .from('feedback')
    .update(updates)
    .eq('id', feedbackId)
    .select('id');

  if (error) {
    reportError('[admin/feedbacks] update error:', error);
    return new Response('Server error', { status: 500 });
  }
  if (!updated?.length) {
    return Response.json({ error: 'Feedback introuvable' }, { status: 404 });
  }

  return Response.json({ ok: true });
});
