import { z } from 'zod';
import { withRoute } from '@/lib/api-route';
import { poserCouleursMarque, lireCouleursMarque } from '@/lib/couleurs-marque';

/**
 * PATCH /api/profile/couleurs-marque — ses deux couleurs (v104).
 *
 * Route SÉPARÉE, et c'est délibéré : la colonne est neuve, et l'ajouter au
 * gros payload des Paramètres ferait échouer TOUTE la sauvegarde tant que
 * v104 n'est pas appliquée (PostgREST refuse la requête entière — le dégât
 * exact de v95). Ici, un échec ne coûte que les couleurs, et on le DIT.
 *
 * Envoyer `{ c1: null }` remet la palette du métier.
 */
const schema = z.object({
  c1: z.string().max(9).nullable().optional(),
  c2: z.string().max(9).nullable().optional(),
});

export const PATCH = withRoute(
  { auth: 'active', schema, perm: 'parametres' },
  async ({ auth, body }) => {
    const { studioId, supabase } = auth;

    const res = await poserCouleursMarque(supabase, studioId, { c1: body.c1, c2: body.c2 });
    if (!res.ok) {
      return Response.json(
        {
          error: res.migrationManquante
            ? "Tes couleurs s'appliquent déjà au bloc intégré. Sur ta page publique, cette mise à jour n'est pas encore active."
            : "Tes couleurs n'ont pas pu être enregistrées.",
          code: res.migrationManquante ? 'MIGRATION_V104_REQUISE' : 'UPDATE_FAILED',
        },
        { status: res.migrationManquante ? 503 : 500 }
      );
    }

    const { data } = await supabase
      .from('profiles').select('couleurs_marque').eq('id', studioId).maybeSingle();
    return Response.json({ ok: true, couleurs: lireCouleursMarque(data) });
  }
);
