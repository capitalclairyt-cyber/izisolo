import { withRoute } from '@/lib/api-route';

/**
 * DELETE /api/liens-pointage/[id] — désactiver un lien confié (v100).
 *
 * On RÉVOQUE, on ne supprime pas : la ligne garde la trace de ce qui a été
 * confié, à qui, et de ce qui a été pointé avec. Une prof qui se demande
 * « qui a pointé mardi ? » six mois plus tard doit trouver la réponse.
 * La purge des liens morts depuis plus de 90 jours revient au cron.
 *
 * Sous la session de la prof, donc sous RLS : un lien qui n'est pas le sien
 * est simplement introuvable.
 */
export const DELETE = withRoute({ auth: 'user', perm: 'pointer' }, async ({ params, auth }) => {
  const { studioId, supabase } = auth;

  const { data, error } = await supabase
    .from('liens_pointage')
    .update({ revoque_at: new Date().toISOString() })
    .eq('id', params.id)
    .eq('profile_id', studioId)
    .is('revoque_at', null)      // re-cliquer ne réécrit pas la date de révocation
    .select('id')
    .maybeSingle();

  if (error) {
    return Response.json({ error: "Le lien n'a pas pu être désactivé, réessaie.", code: 'UPDATE_FAILED' }, { status: 500 });
  }
  // Aucune ligne : soit le lien n'existe pas / n'est pas à elle, soit il était
  // déjà révoqué. Dans les deux cas l'état voulu est atteint, on répond ok.
  return Response.json({ ok: true, deja: !data });
});
