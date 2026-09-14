import { withRoute } from '@/lib/api-route';

/**
 * /api/adhesions/[id] — annuler une adhésion (v113). On n'efface pas : le
 * statut passe « annulee » (la saison redevient libre pour une nouvelle
 * adhésion ? non : l'index unique porte sur client + saison, on SUPPRIME donc
 * la ligne annulée après l'avoir tracée, sinon la personne ne pourrait plus
 * ré-adhérer la même saison). Le paiement, lui, reste : de l'argent reçu est
 * de l'argent reçu ; un paiement en attente est supprimé.
 */
export const DELETE = withRoute({ auth: 'active', plan: 'vie_asso', perm: 'argent_gerer' }, async ({ params, auth }) => {
  const { studioId, supabase } = auth;
  const { data: a } = await supabase.from('adhesions').select('id, paiement_id').eq('id', params.id).eq('profile_id', studioId).maybeSingle();
  if (!a) return Response.json({ error: 'Adhésion introuvable', code: 'INTROUVABLE' }, { status: 404 });
  if (a.paiement_id) {
    await supabase.from('paiements').delete().eq('id', a.paiement_id).eq('profile_id', studioId).eq('statut', 'pending');
  }
  // On relit les lignes supprimées : sous RLS, un DELETE sans policy ne lève
  // aucune erreur et touche zéro ligne (v113 n'en avait pas, v116 l'ajoute).
  const { data: supprimees, error } = await supabase.from('adhesions').delete().eq('id', a.id).eq('profile_id', studioId).select('id');
  if (error) return Response.json({ error: 'Annulation impossible.', code: 'DELETE_FAILED' }, { status: 500 });
  if (!supprimees || supprimees.length === 0) {
    return Response.json({ error: 'Cette mise à jour n\'est pas encore appliquée : l\'adhésion reste en place, rien n\'a été modifié.', code: 'MIGRATION_V116_REQUISE' }, { status: 503 });
  }
  return Response.json({ ok: true });
});
