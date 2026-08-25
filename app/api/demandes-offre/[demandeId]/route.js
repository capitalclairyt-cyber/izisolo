import { z } from 'zod';
import { withRoute } from '@/lib/api-route';
import { reportError } from '@/lib/report';

const schema = z.object({
  statut: z.enum(['nouvelle', 'acceptee', 'refusee']),
});

/**
 * PATCH /api/demandes-offre/[demandeId] — la prof traite une demande (v97).
 *
 * Volontairement BÊTE : ça ne vend rien, ça ne crée ni abonnement ni paiement.
 * La vente passe par le tunnel existant (RPC vendre_offre), où la prof choisit
 * son mode de règlement. Cette route ne fait que ranger la file d'attente.
 *
 * Mélanger les deux aurait fabriqué un second chemin de vente, avec sa propre
 * façon d'écrire l'argent : c'est exactement ce que l'audit de juillet a passé
 * une journée à défaire (Lot C : « tunnel de vente unifié sur PaiementStep »).
 */
export const PATCH = withRoute({ auth: 'active', schema, perm: 'argent_gerer' }, async ({ params, auth, body }) => {
  const { studioId, supabase } = auth;
  const { demandeId } = params;

  const { data, error } = await supabase
    .from('demandes_offre')
    .update({
      statut: body.statut,
      traitee_at: body.statut === 'nouvelle' ? null : new Date().toISOString(),
    })
    .eq('id', demandeId)
    .eq('profile_id', studioId)
    .select('id');

  if (error) {
    reportError('[demandes-offre PATCH]', error, { route: '/api/demandes-offre/[demandeId]' });
    return Response.json({ error: 'Enregistrement impossible' }, { status: 500 });
  }
  if (!data?.length) {
    return Response.json({ error: 'Demande introuvable' }, { status: 404 });
  }

  return Response.json({ ok: true });
});
