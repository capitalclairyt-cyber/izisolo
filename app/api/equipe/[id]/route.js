import { z } from 'zod';
import { withRoute } from '@/lib/api-route';
import { sanitizeRole, sanitizePermissions, sanitizePortee } from '@/lib/studio-membre';
import { peutModifierMembre, membrePublic, poserPortee } from '@/lib/equipe';

/**
 * /api/equipe/[id] — modifier ou retirer un membre (lot 3).
 *
 * PATCH  → rôle et droits.
 * DELETE → retirer du studio. On RÉVOQUE, on ne supprime pas : la ligne garde
 *          la trace de qui a eu accès et quand, et ré-inviter la même personne
 *          réutilise sa ligne au lieu d'en empiler une seconde.
 *
 * Les trois refus de `peutModifierMembre` sont appliqués ICI, côté serveur :
 * l'écran les cache aussi, mais un bouton caché n'est pas une garde.
 */

const patchSchema = z.object({
  role: z.enum(['admin', 'prof']).optional(),
  permissions: z.record(z.string(), z.boolean()).optional(),
  portee_pointage: z.enum(['tous', 'miens']).optional(),
});

async function charger(supabase, studioId, id) {
  const { data } = await supabase
    .from('studio_membres')
    .select('*')
    .eq('id', id)
    .eq('profile_id', studioId)
    .maybeSingle();
  return data;
}

export const PATCH = withRoute(
  { auth: 'active', schema: patchSchema, plan: 'equipe', perm: 'equipe_gerer' },
  async ({ params, auth, body }) => {
    const { studioId, membre: acteur, supabase } = auth;

    const cible = await charger(supabase, studioId, params.id);
    const verdict = peutModifierMembre(acteur, cible);
    if (!verdict.ok) {
      return Response.json({ error: verdict.raison, code: 'REFUS' }, { status: cible ? 409 : 404 });
    }

    const patch = {};
    if (body.role !== undefined) patch.role = sanitizeRole(body.role);
    if (body.permissions !== undefined) patch.permissions = sanitizePermissions(body.permissions);
    // La portée à part (cf. poserPortee) : mélangée au patch, elle ferait
    // échouer TOUTE la modification tant que v103 n'est pas appliquée.
    if (body.portee_pointage !== undefined) {
      await poserPortee(supabase, cible.id, sanitizePortee(body.portee_pointage));
    }

    if (Object.keys(patch).length === 0) {
      if (body.portee_pointage !== undefined) {
        const apres = await charger(supabase, studioId, cible.id);
        return Response.json({ membre: membrePublic(apres || cible) });
      }
      return Response.json({ error: 'Rien à modifier.', code: 'VIDE' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('studio_membres')
      .update(patch)
      .eq('id', cible.id)
      .eq('profile_id', studioId)
      .select('*')
      .single();

    if (error) return Response.json({ error: 'Modification impossible.', code: 'UPDATE_FAILED' }, { status: 500 });
    return Response.json({ membre: membrePublic(data) });
  }
);

export const DELETE = withRoute(
  { auth: 'active', plan: 'equipe', perm: 'equipe_gerer' },
  async ({ params, auth }) => {
    const { studioId, membre: acteur, supabase } = auth;

    const cible = await charger(supabase, studioId, params.id);
    const verdict = peutModifierMembre(acteur, cible);
    if (!verdict.ok) {
      return Response.json({ error: verdict.raison, code: 'REFUS' }, { status: cible ? 409 : 404 });
    }

    const { error } = await supabase
      .from('studio_membres')
      .update({ statut: 'revoque', revoque_at: new Date().toISOString() })
      .eq('id', cible.id)
      .eq('profile_id', studioId)
      .is('revoque_at', null);

    if (error) return Response.json({ error: 'Retrait impossible.', code: 'UPDATE_FAILED' }, { status: 500 });
    // La RLS lit `statut = 'actif'` : le retrait est effectif à la requête
    // suivante, sans redéploiement et sans attendre qu'elle se reconnecte.
    return Response.json({ ok: true });
  }
);
