import { withRoute } from '@/lib/api-route';
import { reportError } from '@/lib/report';

/**
 * DELETE /api/clients/[id] — Supprime une fiche client.
 *
 * Les dépendances sont gérées par les contraintes FK de la base :
 *   - abonnements, presences, inscriptions_evenements : ON DELETE CASCADE
 *     (supprimés automatiquement avec le client)
 *   - paiements : ON DELETE SET NULL (la trace comptable reste, client_id = NULL)
 *   - cours, recurrences, lieux, messages_envoyes : ON DELETE SET NULL
 *
 * Un simple DELETE sur clients suffit donc : la base s'occupe du reste.
 */
export const DELETE = withRoute({ auth: 'active', perm: 'eleves_gerer' }, async ({ params, auth }) => {
  const { studioId, supabase } = auth;
  const { id } = params;

  // Vérifie que le client existe et appartient bien au prof connecté.
  const { data: client, error: fetchErr } = await supabase
    .from('clients')
    .select('id')
    .eq('id', id)
    .eq('profile_id', studioId)
    .single();

  if (fetchErr || !client) {
    return Response.json({ error: 'Client introuvable' }, { status: 404 });
  }

  const { error: deleteErr } = await supabase
    .from('clients')
    .delete()
    .eq('id', id)
    .eq('profile_id', studioId);

  if (deleteErr) {
    // On remonte le message réel : toutes les FK client_id sont censées être en
    // CASCADE/SET NULL (donc la suppression doit passer) ; si ça échoue quand
    // même, le message aide à diagnostiquer (contrainte oubliée, trigger…).
    reportError('[clients DELETE] error:', deleteErr);
    return Response.json({ error: 'Erreur lors de la suppression : ' + (deleteErr.message || 'inconnue') }, { status: 500 });
  }

  return Response.json({ ok: true });
});
