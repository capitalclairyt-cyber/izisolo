import { z } from 'zod';
import { withRoute } from '@/lib/api-route';

const updateSchema = z.object({
  statut: z.enum(['actif', 'suspendu', 'expire', 'resilie']).optional(),
  date_debut: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Format YYYY-MM-DD attendu').nullable().optional(),
  date_fin: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Format YYYY-MM-DD attendu').nullable().optional(),
  seances_total: z.number().int().min(0).nullable().optional(),
  seances_utilisees: z.number().int().min(0).optional(),
  notes: z.string().max(1000).nullable().optional(),
});

export const PATCH = withRoute({ auth: 'active', schema: updateSchema }, async ({ params, auth, body }) => {
  const { user, supabase } = auth;
  const { id } = params;

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
  if (body.statut !== undefined) update.statut = body.statut;
  if (body.date_debut !== undefined) update.date_debut = body.date_debut;
  if (body.date_fin !== undefined) update.date_fin = body.date_fin;
  if (body.seances_total !== undefined) update.seances_total = body.seances_total;
  if (body.seances_utilisees !== undefined) update.seances_utilisees = body.seances_utilisees;
  if (body.notes !== undefined) update.notes = body.notes;

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
});

export const DELETE = withRoute({ auth: 'active' }, async ({ params, auth }) => {
  const { user, supabase } = auth;
  const { id } = params;

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
});
