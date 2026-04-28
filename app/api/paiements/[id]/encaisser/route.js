import { z } from 'zod';
import { requireAuth } from '@/lib/api-auth';
import { parseJsonBody } from '@/lib/validation';

const encaisserSchema = z.object({
  mode: z.enum(['especes', 'cheque', 'virement', 'CB']),
  date_encaissement: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Format YYYY-MM-DD attendu').optional(),
  notes: z.string().trim().max(500).optional(),
});

export async function POST(request, { params }) {
  let user, supabase;
  try {
    ({ user, supabase } = await requireAuth());
  } catch (res) {
    return res;
  }

  const { id } = await params;
  const { data, errorResponse } = await parseJsonBody(request, encaisserSchema);
  if (errorResponse) return errorResponse;

  const today = new Date().toISOString().slice(0, 10);
  const { mode, date_encaissement = today, notes } = data;

  // Vérifier que le paiement appartient bien au profile
  const { data: paiement, error: fetchErr } = await supabase
    .from('paiements')
    .select('id, statut, profile_id, notes')
    .eq('id', id)
    .eq('profile_id', user.id)
    .single();

  if (fetchErr || !paiement) {
    return Response.json({ error: 'Paiement introuvable' }, { status: 404 });
  }

  if (paiement.statut === 'paid') {
    return Response.json({ error: 'Paiement déjà marqué comme payé' }, { status: 409 });
  }

  // Concaténer les notes existantes avec les nouvelles si fourni
  const mergedNotes = notes
    ? (paiement.notes ? `${paiement.notes}\n${notes}` : notes)
    : paiement.notes;

  const { error: updateErr } = await supabase
    .from('paiements')
    .update({
      statut: 'paid',
      mode,
      date_encaissement,
      notes: mergedNotes,
    })
    .eq('id', id)
    .eq('profile_id', user.id);

  if (updateErr) {
    console.error('encaisser error:', updateErr);
    return Response.json({ error: 'Erreur lors de l\'encaissement' }, { status: 500 });
  }

  return Response.json({ ok: true });
}
