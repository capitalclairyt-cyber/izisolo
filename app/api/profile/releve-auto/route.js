import { z } from 'zod';
import { withRoute } from '@/lib/api-route';

/**
 * PATCH /api/profile/releve-auto — « envoyer le relevé du mois précédent à
 * chaque intervenante le 1er du mois » (v114, lot 4 Associations & Studios).
 *
 * Route SÉPARÉE (patron v104 / v106) : la colonne est neuve, et l'ajouter au
 * payload d'une autre carte ferait échouer toute la sauvegarde tant que v114
 * n'est pas appliquée. Ici un échec ne coûte que ce réglage, et on le DIT.
 * Plan `depenses` (Association et Studio), permission `parametres`.
 */
const ABSENT = ['PGRST204', 'PGRST205', '42703', '42P01'];
const schema = z.object({ actif: z.boolean() });

export const PATCH = withRoute({ auth: 'active', schema, plan: 'depenses', perm: 'parametres' }, async ({ auth, body }) => {
  const { studioId, supabase } = auth;
  const { error } = await supabase.from('profiles').update({ releve_auto: body.actif === true }).eq('id', studioId);
  if (error) {
    const absente = ABSENT.includes(error.code);
    return Response.json({
      error: absente
        ? "L'envoi automatique des relevés n'est pas encore actif sur ton compte (mise à jour en cours). Les relevés restent disponibles à tout moment, page Compta → Relevés."
        : "Le réglage n'a pas pu être enregistré.",
      code: absente ? 'MIGRATION_V114_REQUISE' : 'UPDATE_FAILED',
    }, { status: absente ? 503 : 500 });
  }
  // La valeur ÉCRITE, jamais une relecture dans la même requête (leçon v106).
  return Response.json({ ok: true, actif: body.actif === true });
});

export const GET = withRoute({ auth: 'user', plan: 'depenses' }, async ({ auth }) => {
  const { studioId, supabase } = auth;
  const { data, error } = await supabase.from('profiles').select('releve_auto').eq('id', studioId).maybeSingle();
  if (error) return Response.json({ ok: true, actif: false, disponible: !ABSENT.includes(error.code) });
  return Response.json({ ok: true, actif: data?.releve_auto === true, disponible: true });
});
