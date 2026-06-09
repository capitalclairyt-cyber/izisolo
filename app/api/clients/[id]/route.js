import { requireAuth } from '@/lib/api-auth';

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
export async function DELETE(request, { params }) {
  let user, supabase;
  try {
    ({ user, supabase } = await requireAuth());
  } catch (res) {
    return res;
  }

  const { id } = await params;

  // Vérifie que le client existe et appartient bien au prof connecté.
  const { data: client, error: fetchErr } = await supabase
    .from('clients')
    .select('id')
    .eq('id', id)
    .eq('profile_id', user.id)
    .single();

  if (fetchErr || !client) {
    return Response.json({ error: 'Client introuvable' }, { status: 404 });
  }

  const { error: deleteErr } = await supabase
    .from('clients')
    .delete()
    .eq('id', id)
    .eq('profile_id', user.id);

  if (deleteErr) {
    return Response.json({ error: 'Erreur lors de la suppression' }, { status: 500 });
  }

  return Response.json({ ok: true });
}
