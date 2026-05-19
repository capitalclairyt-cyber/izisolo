import { z } from 'zod';
import { requireAuth } from '@/lib/api-auth';
import { parseJsonBody } from '@/lib/validation';

const updateSchema = z.object({
  montant: z.number().positive().optional(),
  mode: z.enum(['especes', 'cheque', 'virement', 'CB']).optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Format YYYY-MM-DD attendu').optional(),
  date_encaissement: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Format YYYY-MM-DD attendu').nullable().optional(),
  notes: z.string().trim().max(500).nullable().optional(),
  statut: z.enum(['paid', 'pending', 'unpaid', 'cb']).optional(),
});

export async function PATCH(request, { params }) {
  let user, supabase;
  try {
    ({ user, supabase } = await requireAuth());
  } catch (res) {
    return res;
  }

  const { id } = await params;
  const { data, errorResponse } = await parseJsonBody(request, updateSchema);
  if (errorResponse) return errorResponse;

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
  if (data.montant !== undefined) update.montant = data.montant;
  if (data.mode !== undefined) update.mode = data.mode;
  if (data.date !== undefined) update.date = data.date;
  if (data.date_encaissement !== undefined) update.date_encaissement = data.date_encaissement;
  if (data.notes !== undefined) update.notes = data.notes;
  if (data.statut !== undefined) update.statut = data.statut;

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
}
