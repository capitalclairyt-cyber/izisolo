import { z } from 'zod';
import { withRoute } from '@/lib/api-route';
import { sanitizeAssemblee } from '@/lib/vie-asso';

/**
 * /api/association/assemblees/[id] — une AG (v113).
 * PATCH : modifier (date, lieu, ordre du jour), ou la TENIR (statut `tenue`,
 *         présentes et pouvoirs pour le compte de quorum), ou l'annuler.
 * DELETE : supprimer une AG jamais convoquée.
 */
const schema = z.object({
  type: z.enum(['ordinaire', 'extraordinaire']).optional(),
  titre: z.string().optional(),
  date: z.string().optional(),
  heure: z.string().nullable().optional(),
  lieu: z.string().nullable().optional(),
  ordre_du_jour: z.string().nullable().optional(),
  statut: z.enum(['a_venir', 'tenue', 'annulee']).optional(),
  presentes: z.number().int().min(0).nullable().optional(),
  pouvoirs: z.number().int().min(0).nullable().optional(),
});

async function charger(supabase, studioId, id) {
  const { data } = await supabase.from('assemblees').select('*').eq('id', id).eq('profile_id', studioId).maybeSingle();
  return data;
}

export const PATCH = withRoute({ auth: 'active', schema, plan: 'vie_asso', perm: 'documents' }, async ({ params, auth, body }) => {
  const { studioId, supabase } = auth;
  const ag = await charger(supabase, studioId, params.id);
  if (!ag) return Response.json({ error: 'Assemblée introuvable', code: 'INTROUVABLE' }, { status: 404 });
  const patch = {};
  if (body.date !== undefined || body.type !== undefined || body.titre !== undefined || body.heure !== undefined || body.lieu !== undefined || body.ordre_du_jour !== undefined) {
    const v = sanitizeAssemblee({ ...ag, ...body });
    if (!v.ok) return Response.json({ error: v.raison, code: 'INVALIDE' }, { status: 400 });
    Object.assign(patch, v.assemblee);
  }
  if (body.statut !== undefined) patch.statut = body.statut;
  if (body.presentes !== undefined) patch.presentes = body.presentes;
  if (body.pouvoirs !== undefined) patch.pouvoirs = body.pouvoirs;
  if (Object.keys(patch).length === 0) return Response.json({ error: 'Rien à modifier.', code: 'VIDE' }, { status: 400 });
  const { data, error } = await supabase.from('assemblees').update(patch).eq('id', ag.id).eq('profile_id', studioId).select('*').single();
  if (error) return Response.json({ error: 'Modification impossible.', code: 'UPDATE_FAILED' }, { status: 500 });
  return Response.json({ ok: true, assemblee: data });
});

export const DELETE = withRoute({ auth: 'active', plan: 'vie_asso', perm: 'documents' }, async ({ params, auth }) => {
  const { studioId, supabase } = auth;
  const ag = await charger(supabase, studioId, params.id);
  if (!ag) return Response.json({ error: 'Assemblée introuvable', code: 'INTROUVABLE' }, { status: 404 });
  if (ag.convocation_envoyee_at) return Response.json({ error: 'Une assemblée déjà convoquée ne se supprime pas : annule-la.', code: 'CONVOQUEE' }, { status: 409 });
  const { error } = await supabase.from('assemblees').delete().eq('id', ag.id).eq('profile_id', studioId);
  if (error) return Response.json({ error: 'Suppression impossible.', code: 'DELETE_FAILED' }, { status: 500 });
  return Response.json({ ok: true });
});
