import { z } from 'zod';
import { after } from 'next/server';
import { withRoute } from '@/lib/api-route';
import { createAdminClient } from '@/lib/supabase-admin';
import { envoyerFactureAuto } from '@/lib/facture-auto';

/**
 * POST /api/factures/auto — « ces paiements viennent d'être réglés, envoie
 * leur facture si la prof l'a demandé » (v106).
 *
 * Appelée en fire-and-forget par les deux tunnels de vente après une vente
 * réussie (la RPC vendre_offre écrit depuis le navigateur ; le serveur
 * n'apprend l'encaissement que par cet appel). La route ne fait que
 * VÉRIFIER la propriété des paiements puis déléguer à lib/facture-auto, qui
 * décide seule : réglage à false, SIRET absent, paiement non réglé, fiche
 * sans email → rien ne part, et ce n'est pas une erreur.
 *
 * Réponse immédiate ; l'émission + l'email tournent dans `after()` : la
 * prof n'attend pas la génération d'un PDF pour voir sa vente confirmée.
 */
const schema = z.object({
  paiementIds: z.array(z.string().uuid()).min(1).max(24),
});

export const POST = withRoute({ auth: 'active', schema, perm: 'argent_gerer' }, async ({ auth, body }) => {
  const { studioId, profile, supabase } = auth;

  // Propriété vérifiée en RLS (le jeton de la prof ne lit que son studio).
  const { data: miens } = await supabase
    .from('paiements')
    .select('id')
    .eq('profile_id', studioId)
    .eq('statut', 'paid')
    .in('id', body.paiementIds);
  const ids = (miens || []).map(p => p.id);
  if (ids.length === 0) return Response.json({ ok: true, count: 0 });

  after(async () => {
    const admin = createAdminClient();
    for (const paiementId of ids) {
      await envoyerFactureAuto(admin, { profileId: studioId, paiementId, profile });
    }
  });

  return Response.json({ ok: true, count: ids.length });
});
