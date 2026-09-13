import { withRoute } from '@/lib/api-route';
import { sanitizeDepense } from '@/lib/depenses';

/**
 * /api/depenses/[id] — modifier ou supprimer une dépense (v112).
 * Une dépense née d'une PRESTATION (relevé validé) ne se modifie pas ici :
 * son montant est celui du relevé, son règlement passe par la prestation
 * (« Réglée » sur l'onglet Prestations), et sa suppression par le retrait du
 * relevé. Sinon la compta et le relevé diraient deux choses différentes.
 */
const ABSENT = ['PGRST204', 'PGRST205', '42703', '42P01'];

async function charger(supabase, studioId, id) {
  const { data } = await supabase.from('depenses').select('*').eq('id', id).eq('profile_id', studioId).maybeSingle();
  return data;
}

export const PATCH = withRoute({ auth: 'active', plan: 'depenses', perm: 'argent_gerer' }, async ({ request, params, auth }) => {
  const { studioId, supabase } = auth;
  const existante = await charger(supabase, studioId, params.id);
  if (!existante) return Response.json({ error: 'Dépense introuvable', code: 'INTROUVABLE' }, { status: 404 });
  if (existante.prestation_id) {
    return Response.json({ error: "Cette dépense vient d'un relevé d'intervenante : elle se règle depuis l'onglet Prestations.", code: 'PRESTATION' }, { status: 409 });
  }
  const brut = await request.json().catch(() => null);
  if (!brut) return Response.json({ error: 'Body JSON invalide', code: 'BAD_JSON' }, { status: 400 });
  const v = sanitizeDepense({ ...existante, ...brut });
  if (!v.ok) return Response.json({ error: v.raison, code: 'INVALIDE' }, { status: 400 });
  const { data, error } = await supabase.from('depenses').update(v.depense).eq('id', existante.id).eq('profile_id', studioId).select('*').single();
  if (error) return Response.json({ error: 'Modification impossible.', code: ABSENT.includes(error.code) ? 'MIGRATION_V112_REQUISE' : 'UPDATE_FAILED' }, { status: ABSENT.includes(error.code) ? 503 : 500 });
  return Response.json({ ok: true, depense: data });
});

export const DELETE = withRoute({ auth: 'active', plan: 'depenses', perm: 'argent_gerer' }, async ({ params, auth }) => {
  const { studioId, supabase } = auth;
  const existante = await charger(supabase, studioId, params.id);
  if (!existante) return Response.json({ error: 'Dépense introuvable', code: 'INTROUVABLE' }, { status: 404 });
  if (existante.prestation_id) {
    return Response.json({ error: "Cette dépense vient d'un relevé d'intervenante : retire le relevé depuis l'onglet Prestations.", code: 'PRESTATION' }, { status: 409 });
  }
  const { error } = await supabase.from('depenses').delete().eq('id', existante.id).eq('profile_id', studioId);
  if (error) return Response.json({ error: 'Suppression impossible.', code: 'DELETE_FAILED' }, { status: 500 });
  return Response.json({ ok: true });
});
