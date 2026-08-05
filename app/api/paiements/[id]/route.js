import { z } from 'zod';
import { withRoute } from '@/lib/api-route';
import { reportError } from '@/lib/report';

/**
 * v84 : un paiement porté par une facture ÉMISE est verrouillé — le document
 * comptable téléchargé par l'élève doit rester vrai. Renvoie le numéro de la
 * facture, ou null (pas facturé / migration v84 absente → pas de verrou).
 */
async function factureVerrouillante(supabase, paiementId) {
  const { data, error } = await supabase
    .from('factures_paiements')
    .select('facture:facture_id (numero_affiche, statut)')
    .eq('paiement_id', paiementId)
    .maybeSingle();
  if (error || !data) return null; // table absente ou non facturé : pas de verrou
  return data.facture?.statut === 'emise' ? data.facture.numero_affiche : null;
}

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

  // v84 : montant / dates / mode / statut d'un paiement facturé sont gelés
  // (notes et n° de chèque restent libres — ils n'apparaissent pas sur le
  // document). Annuler la facture le déverrouille.
  const champsFactures = ['montant', 'mode', 'date', 'date_encaissement', 'statut'];
  if (champsFactures.some(c => body[c] !== undefined)) {
    const numeroFacture = await factureVerrouillante(supabase, id);
    if (numeroFacture) {
      return Response.json({
        error: `Ce paiement figure sur la facture ${numeroFacture} — annule d'abord la facture (fiche élève → Paiements) pour le modifier.`,
        code: 'PAIEMENT_FACTURE',
      }, { status: 409 });
    }
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
    .select('id, statut, abonnement_id, echeancier_id')
    .eq('id', id)
    .eq('profile_id', user.id)
    .single();

  if (fetchErr || !paiement) {
    return Response.json({ error: 'Paiement introuvable' }, { status: 404 });
  }

  // v84 : jamais de suppression d'un paiement facturé — le justificatif de
  // l'élève (CSE/mutuelle) pointerait sur de l'argent disparu de la compta.
  const numeroFacture = await factureVerrouillante(supabase, id);
  if (numeroFacture) {
    return Response.json({
      error: `Ce paiement figure sur la facture ${numeroFacture} — annule d'abord la facture (fiche élève → Paiements) pour le supprimer.`,
      code: 'PAIEMENT_FACTURE',
    }, { status: 409 });
  }

  // B1f : supprimer un paiement ENCAISSÉ rattaché à un carnet/échéancier
  // effaçait de l'argent de la compta en silence (l'abo restait « payé »
  // sans trace, l'échéancier perdait un versement).
  if (paiement.statut === 'paid' && (paiement.abonnement_id || paiement.echeancier_id)) {
    return Response.json({
      error: 'Ce paiement encaissé est rattaché à un carnet ou un échéancier — modifie-le plutôt que de le supprimer (la suppression fausserait ta compta).',
      code: 'PAIEMENT_LIE',
    }, { status: 409 });
  }

  const { error: deleteErr } = await supabase
    .from('paiements')
    .delete()
    .eq('id', id)
    .eq('profile_id', user.id);

  if (deleteErr) {
    reportError('[paiements DELETE] err:', deleteErr, { route: '/api/paiements/[id]' });
    return Response.json({ error: "Erreur lors de la suppression" }, { status: 500 });
  }

  return Response.json({ ok: true });
});
