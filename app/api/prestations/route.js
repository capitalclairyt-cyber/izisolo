import { withRoute } from '@/lib/api-route';
import { createAdminClient } from '@/lib/supabase-admin';
import { chargerPrestationsIntervenante } from '@/lib/prestations-service';
import { prestationPourIntervenante } from '@/lib/prestations';

/**
 * /api/prestations — « Mes prestations » (v112, pont 4 côté INTERVENANTE).
 *
 * GET → les relevés validés par les structures où la PERSONNE connectée est
 * intervenante, quel que soit le studio qu'elle regarde : c'est son argent à
 * elle, pas celui du studio affiché. Lecture en service_role scopée à ses
 * lignes d'équipe (auth_user_id), jamais une dépense de structure.
 */
export const GET = withRoute({ auth: 'user' }, async ({ auth }) => {
  const { user } = auth;
  const { prestations, migrationManquante } = await chargerPrestationsIntervenante(createAdminClient(), user.id);
  return Response.json({
    prestations: prestations.map(p => prestationPourIntervenante(p, p.structure)),
    indisponible: migrationManquante,
  });
});
