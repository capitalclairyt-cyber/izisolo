import { z } from 'zod';
import { withRoute } from '@/lib/api-route';
import { poserIntervenante } from '@/lib/intervenante';

/**
 * PATCH /api/cours/[coursId]/intervenante — désigner qui donne la séance (v103).
 *
 * L'écriture passe par `poserIntervenante` (UPDATE séparé, jamais un insert
 * qui nommerait la colonne) : sans la migration, la route répond 503 avec un
 * message honnête au lieu de faire semblant.
 *
 * `perm: 'cours_gerer'` — désigner l'intervenante d'une séance, c'est modifier
 * le cours. Et l'intervenante choisie doit appartenir à CE studio : sans cette
 * vérification, un identifiant deviné rattacherait une séance à quelqu'un
 * d'ailleurs.
 */
const schema = z.object({ intervenantId: z.string().uuid().nullable().optional() });

export const PATCH = withRoute(
  { auth: 'active', schema, perm: 'cours_gerer' },
  async ({ params, auth, body }) => {
    const { studioId, supabase } = auth;

    const { data: cours } = await supabase
      .from('cours')
      .select('id')
      .eq('id', params.coursId)
      .eq('profile_id', studioId)
      .maybeSingle();
    if (!cours) {
      return Response.json({ error: 'Séance introuvable', code: 'NOT_FOUND' }, { status: 404 });
    }

    if (body.intervenantId) {
      const { data: membre } = await supabase
        .from('studio_membres')
        .select('id')
        .eq('id', body.intervenantId)
        .eq('profile_id', studioId)
        .eq('statut', 'actif')
        .maybeSingle();
      if (!membre) {
        return Response.json(
          { error: "Cette personne ne fait pas partie de ton équipe.", code: 'HORS_EQUIPE' },
          { status: 400 }
        );
      }
    }

    const res = await poserIntervenante(supabase, [cours.id], body.intervenantId || null);
    if (!res.ok) {
      return Response.json(
        {
          error: res.migrationManquante
            ? "Cette mise à jour n'est pas encore appliquée sur ton studio."
            : "Ça n'a pas pu être enregistré.",
          code: res.migrationManquante ? 'MIGRATION_V103_REQUISE' : 'UPDATE_FAILED',
        },
        { status: res.migrationManquante ? 503 : 500 }
      );
    }

    return Response.json({ ok: true, intervenantId: body.intervenantId || null });
  }
);
