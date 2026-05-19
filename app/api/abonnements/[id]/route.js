import { z } from 'zod';
import { requireAuth } from '@/lib/api-auth';
import { parseJsonBody } from '@/lib/validation';

const updateSchema = z.object({
  statut: z.enum(['actif', 'suspendu', 'expire', 'resilie']).optional(),
  date_debut: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Format YYYY-MM-DD attendu').nullable().optional(),
  date_fin: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Format YYYY-MM-DD attendu').nullable().optional(),
  seances_total: z.number().int().min(0).nullable().optional(),
  seances_utilisees: z.number().int().min(0).optional(),
  notes: z.string().max(1000).nullable().optional(),
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

  const { data: abo, error: fetchErr } = await supabase
    .from('abonnements')
    .select('id')
    .eq('id', id)
    .eq('profile_id', user.id)
    .single();

  if (fetchErr || !abo) {
    return Response.json({ error: 'Abonnement introuvable' }, { status: 404 });
  }

  const update = {};
  if (data.statut !== undefined) update.statut = data.statut;
  if (data.date_debut !== undefined) update.date_debut = data.date_debut;
  if (data.date_fin !== undefined) update.date_fin = data.date_fin;
  if (data.seances_total !== undefined) update.seances_total = data.seances_total;
  if (data.seances_utilisees !== undefined) update.seances_utilisees = data.seances_utilisees;
  if (data.notes !== undefined) update.notes = data.notes;

  if (Object.keys(update).length === 0) {
    return Response.json({ error: 'Rien à modifier' }, { status: 400 });
  }

  const { error: updateErr } = await supabase
    .from('abonnements')
    .update(update)
    .eq('id', id)
    .eq('profile_id', user.id);

  if (updateErr) {
    return Response.json({ error: 'Erreur lors de la modification' }, { status: 500 });
  }

  return Response.json({ ok: true });
}

export async function DELETE(request, { params }) {
  let user, supabase;
  try {
    ({ user, supabase } = await requireAuth());
  } catch (res) {
    return res;
  }

  const { id } = await params;

  const { data: abo, error: fetchErr } = await supabase
    .from('abonnements')
    .select('id')
    .eq('id', id)
    .eq('profile_id', user.id)
    .single();

  if (fetchErr || !abo) {
    return Response.json({ error: 'Abonnement introuvable' }, { status: 404 });
  }

  const { error: payErr } = await supabase
    .from('paiements')
    .delete()
    .eq('abonnement_id', id)
    .eq('profile_id', user.id);

  if (payErr) {
    return Response.json({ error: 'Erreur suppression paiements liés' }, { status: 500 });
  }

  const { error: deleteErr } = await supabase
    .from('abonnements')
    .delete()
    .eq('id', id)
    .eq('profile_id', user.id);

  if (deleteErr) {
    return Response.json({ error: 'Erreur lors de la suppression' }, { status: 500 });
  }

  return Response.json({ ok: true });
}
