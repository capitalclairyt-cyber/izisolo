import { z } from 'zod';
import { withRoute } from '@/lib/api-route';
import { createAdminClient } from '@/lib/supabase-admin';
import { reglerPrestation, annulerPrestation } from '@/lib/prestations-service';
import { MODES_REGLEMENT_DEPENSE } from '@/lib/depenses';

/**
 * /api/prestations/[id]/regler — la structure règle une prestation (v112).
 *
 * POST { date, mode } → RPC atomique : sa dépense passe « réglée », la
 * prestation « réglée », et chez l'intervenante (si elle a son IziSolo) un
 * paiement encaissé naît, rattaché à sa facture qui passe « payée ». C'est le
 * maillon qui fait entrer l'argent dans SON assiette URSSAF.
 * DELETE → retire un relevé validé mais ni facturé ni réglé.
 * Plan `equipe`, permission `argent_gerer`.
 */
const schema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  mode: z.enum(MODES_REGLEMENT_DEPENSE).optional(),
});

export const POST = withRoute({ auth: 'active', schema, plan: 'equipe', perm: 'argent_gerer' }, async ({ params, auth, body }) => {
  const date = body.date || new Date().toLocaleDateString('sv-SE', { timeZone: 'Europe/Paris' });
  const r = await reglerPrestation(createAdminClient(), { studioId: auth.studioId, prestationId: params.id, date, mode: body.mode || 'virement' });
  if (!r.ok) {
    const status = r.code === 'MIGRATION_V112_REQUISE' ? 503 : r.code === 'INTROUVABLE' ? 404 : r.code === 'DEJA_REGLEE' ? 409 : 400;
    const error = r.code === 'DEJA_REGLEE' ? 'Déjà réglée.' : r.code === 'MIGRATION_V112_REQUISE' ? "Cette mise à jour n'est pas encore appliquée." : 'Règlement impossible.';
    return Response.json({ error, code: r.code }, { status });
  }
  return Response.json({ ok: true, paiementId: r.paiementId });
});

export const DELETE = withRoute({ auth: 'active', plan: 'equipe', perm: 'argent_gerer' }, async ({ params, auth }) => {
  const r = await annulerPrestation(createAdminClient(), { studioId: auth.studioId, prestationId: params.id });
  if (!r.ok) return Response.json({ error: r.message || 'Retrait impossible.', code: r.code }, { status: r.code === 'INTROUVABLE' ? 404 : 409 });
  return Response.json({ ok: true });
});
