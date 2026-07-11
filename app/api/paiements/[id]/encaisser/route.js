import { z } from 'zod';
import { withRoute } from '@/lib/api-route';
import { sendPushToEmail } from '@/lib/push-server';

const encaisserSchema = z.object({
  mode: z.enum(['especes', 'cheque', 'virement', 'CB']),
  date_encaissement: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Format YYYY-MM-DD attendu').optional(),
  notes: z.string().trim().max(500).optional(),
  numero_cheque: z.string().trim().max(100).nullable().optional(),
});

export const POST = withRoute({ auth: 'active', schema: encaisserSchema }, async ({ params, auth, body }) => {
  const { user, supabase } = auth;
  const { id } = params;

  const today = new Date().toISOString().slice(0, 10);
  const { mode, date_encaissement = today, notes, numero_cheque } = body;

  // Vérifier que le paiement appartient bien au profile
  const { data: paiement, error: fetchErr } = await supabase
    .from('paiements')
    .select('id, statut, profile_id, notes, client_id')
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
      ...(numero_cheque !== undefined && { numero_cheque }),
    })
    .eq('id', id)
    .eq('profile_id', user.id);

  if (updateErr) {
    console.error('encaisser error:', updateErr);
    return Response.json({ error: 'Erreur lors de l\'encaissement' }, { status: 500 });
  }

  // Push élève « paiement enregistré » (gaté sur pref paiement ; no-op sans abo)
  if (paiement.client_id) {
    (async () => {
      const { data: cl } = await supabase.from('clients').select('email').eq('id', paiement.client_id).maybeSingle();
      if (!cl?.email) return;
      const { data: prof } = await supabase.from('profiles').select('studio_slug').eq('id', user.id).maybeSingle();
      await sendPushToEmail(cl.email, {
        title: `Paiement enregistré ✓`,
        body: `Ton règlement a bien été pris en compte par ton studio.`,
        url: prof?.studio_slug ? `/p/${prof.studio_slug}/espace` : '/',
        tag: `paiement-${id}`,
      }, { type: 'paiement', profileId: user.id });
    })().catch(() => {});
  }

  return Response.json({ ok: true });
});
