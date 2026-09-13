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
  const { error } = await supabase.from('adhesions').delete().eq('id', a.id).eq('profile_id', studioId);
  if (error) return Response.json({ error: 'Annulation impossible.', code: 'DELETE_FAILED' }, { status: 500 });
  return Response.json({ ok: true });
});
