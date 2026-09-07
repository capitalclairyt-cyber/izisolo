import { z } from 'zod';
import { withRoute } from '@/lib/api-route';
import { catalogueEspaceVisible } from '@/lib/paiement-en-ligne';

/**
 * PATCH /api/profile/offres-espace — « proposer mes offres dans l'espace de
 * mes élèves » (v108, retour Manon 2026-09-07 : elle vend depuis son site).
 *
 * Route SÉPARÉE (patron v104/v106) : la colonne est neuve, l'ajouter au
 * payload de la carte « Page publique » ferait échouer TOUTE sa sauvegarde
 * tant que v108 n'est pas appliquée. Ici, un échec ne coûte que ce réglage,
 * et on le DIT.
 */
const COLONNE_ABSENTE = ['42703', 'PGRST204', 'PGRST205'];
const schema = z.object({ visible: z.boolean() });

export const PATCH = withRoute({ auth: 'active', schema, perm: 'parametres' }, async ({ auth, body }) => {
  const { studioId, supabase } = auth;
  const { error } = await supabase
    .from('profiles')
    .update({ offres_espace: body.visible === true })
    .eq('id', studioId);
  if (error) {
    const migrationManquante = COLONNE_ABSENTE.includes(error.code);
    return Response.json(
      {
        error: migrationManquante
          ? "Ce réglage n'est pas encore actif sur ton compte (mise à jour en cours). Tes élèves voient encore tes offres dans leur espace."
          : "Le réglage n'a pas pu être enregistré.",
        code: migrationManquante ? 'MIGRATION_V108_REQUISE' : 'UPDATE_FAILED',
      },
      { status: migrationManquante ? 503 : 500 }
    );
  }
  // La valeur ÉCRITE, jamais une relecture dans la même requête (leçon v106).
  return Response.json({ ok: true, visible: body.visible === true });
});

export const GET = withRoute({ auth: 'active' }, async ({ auth }) => {
  const { studioId, supabase } = auth;
  const { data, error } = await supabase.from('profiles').select('offres_espace').eq('id', studioId).maybeSingle();
  return Response.json({ ok: true, visible: catalogueEspaceVisible(error ? null : data), disponible: !error });
});
