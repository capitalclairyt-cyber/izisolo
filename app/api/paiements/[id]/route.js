import { z } from 'zod';
import { withRoute } from '@/lib/api-route';

const updateSchema = z.object({
  montant: z.number().positive().optional(),
  mode: z.enum(['especes', 'cheque', 'virement', 'CB']).optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Format YYYY-MM-DD attendu').optional(),
  date_encaissement: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Format YYYY-MM-DD attendu').nullable().optional(),
  notes: z.string().trim().max(500).nullable().optional(),
  numero_cheque: z.string().trim().max(100).nullable().optional(),
  statut: z.enum(['paid', 'pending', 'overdue']).optional(),
});

export const PATCH = withRoute({ auth: 'active', schema: updateSchema }, async ({ params, auth, body }) => {
  const { user, supabase } = auth;
  const { id } = params;

  const { data: paiement, error: fetchErr } = await supabase
    .from('paiements')
    .select('id')
    .eq('id', id)
    .eq('profile_id', user.id)
    .single();

  if (fetchErr || !paiement) {
    return Response.json({ error: 'Paiement introuvable' }, { status: 404 });
  }

  const update = {};
  if (body.montant !== undefined) update.montant = body.montant;
  if (body.mode !== undefined) update.mode = body.mode;
  if (body.date !== undefined) update.date = body.date;
  if (body.date_encaissement !== undefined) update.date_encaissement = body.date_encaissement;
  if (body.notes !== undefined) update.notes = body.notes;
  if (body.numero_cheque !== undefined) update.numero_cheque = body.numero_cheque;
  if (body.statut !== undefined) update.statut = body.statut;

  if (Object.keys(update).length === 0) {
    return Response.json({ error: 'Rien à modifier' }, { status: 400 });
  }

  const { error: updateErr } = await supabase
    .from('paiements')
    .update(update)
    .eq('id', id)
    .eq('profile_id', user.id);

  if (updateErr) {
    return Response.json({ error: "Erreur lors de la modification" }, { status: 500 });
  }

  return Response.json({ ok: true });
});

export const DELETE = withRoute({ auth: 'active' }, async ({ params, auth }) => {
  const { user, supabase } = auth;
  const { id } = params;

  const { data: paiement, error: fetchErr } = await supabase
    .from('paiements')
    .select('id')
    .eq('id', id)
    .eq('profile_id', user.id)
    .single();

  if (fetchErr || !paiement) {
    return Response.json({ error: 'Paiement introuvable' }, { status: 404 });
  }

  const { error: deleteErr } = await supabase
    .from('paiements')
    .delete()
    .eq('id', id)
    .eq('profile_id', user.id);

  if (deleteErr) {
    return Response.json({ error: "Erreur lors de la suppression" }, { status: 500 });
  }

  return Response.json({ ok: true });
});
