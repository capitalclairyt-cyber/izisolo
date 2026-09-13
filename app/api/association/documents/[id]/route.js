import { withRoute } from '@/lib/api-route';

/** DELETE /api/association/documents/[id] — retirer un document (v113). Permission `documents`. */
export const DELETE = withRoute({ auth: 'active', plan: 'vie_asso', perm: 'documents' }, async ({ params, auth }) => {
  const { studioId, supabase } = auth;
  const { data: d } = await supabase.from('documents_structure').select('id').eq('id', params.id).eq('profile_id', studioId).maybeSingle();
  if (!d) return Response.json({ error: 'Document introuvable', code: 'INTROUVABLE' }, { status: 404 });
  const { error } = await supabase.from('documents_structure').delete().eq('id', d.id).eq('profile_id', studioId);
  if (error) return Response.json({ error: 'Suppression impossible.', code: 'DELETE_FAILED' }, { status: 500 });
  return Response.json({ ok: true });
});
