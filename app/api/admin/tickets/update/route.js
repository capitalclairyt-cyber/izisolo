import { withRoute } from '@/lib/api-route';
import { createAdminClient } from '@/lib/supabase-admin';
import { parseJsonBody, adminTicketUpdateSchema } from '@/lib/validation';
import { reportError } from '@/lib/report';

export const POST = withRoute({ auth: 'admin' }, async ({ request }) => {
  const { data, errorResponse } = await parseJsonBody(request, adminTicketUpdateSchema);
  if (errorResponse) return errorResponse;
  const { ticketId, status, admin_reply } = data;

  // ⚠️ Schéma réel en prod = colonnes FRANÇAISES (statut / reponse) — sondé
  // 2026-07-24. L'API garde status/admin_reply côté client (mapping ici).
  const updates = { updated_at: new Date().toISOString() };
  if (status) updates.statut = status;
  if (admin_reply !== undefined) updates.reponse = admin_reply;

  // Écriture via le client ADMIN : la RLS rendait l'update d'un ticket d'un
  // autre user silencieusement sans effet (0 ligne touchée). Sprint 3 audit.
  const admin = createAdminClient();
  const { data: updated, error } = await admin
    .from('support_tickets')
    .update(updates)
    .eq('id', ticketId)
    .select('id');

  if (error) {
    reportError('update ticket error:', error);
    return new Response('Server error', { status: 500 });
  }
  if (!updated?.length) {
    return Response.json({ error: 'Ticket introuvable' }, { status: 404 });
  }

  return new Response(JSON.stringify({ ok: true }), {
    headers: { 'Content-Type': 'application/json' },
  });
});
