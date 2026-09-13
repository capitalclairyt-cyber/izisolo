import { z } from 'zod';
import { withRoute } from '@/lib/api-route';
import { peutModifierMembre, membrePublic } from '@/lib/equipe';
import { sanitizeRemuneration, CODES_REMUNERATION } from '@/lib/remuneration';
import { poserRemuneration, lireRemuneration } from '@/lib/releve-service';

/**
 * /api/equipe/[id]/remuneration — ce que la structure a convenu avec une
 * intervenante (v112, lot 2 Associations & Studios).
 *
 * PATCH { mode, montant } ou { remuneration: null } pour retirer.
 * Plan `equipe` + permission `argent_gerer` : c'est de l'argent, pas un
 * réglage d'équipe. UPDATE séparé (poserRemuneration) : sans v112 la colonne
 * manque, et la route le dit en 503 au lieu d'échouer en silence.
 */
const schema = z.object({
  mode: z.enum(CODES_REMUNERATION).optional(),
  montant: z.union([z.number(), z.string()]).optional(),
  remuneration: z.null().optional(),
});

export const PATCH = withRoute(
  { auth: 'active', schema, plan: 'equipe', perm: 'argent_gerer' },
  async ({ params, auth, body }) => {
    const { studioId, membre: acteur, supabase } = auth;
    const { data: cible } = await supabase.from('studio_membres').select('*').eq('id', params.id).eq('profile_id', studioId).maybeSingle();
    const verdict = peutModifierMembre(acteur, cible);
    if (!verdict.ok) return Response.json({ error: verdict.raison, code: 'REFUS' }, { status: cible ? 409 : 404 });

    const retirer = body.remuneration === null && body.mode === undefined;
    const rem = retirer ? null : sanitizeRemuneration({ mode: body.mode, montant: body.montant });
    if (!retirer && !rem) {
      return Response.json({ error: 'Choisis un mode et un montant valides (un pourcentage entre 0 et 100, un montant positif).', code: 'INVALIDE' }, { status: 400 });
    }
    const r = await poserRemuneration(supabase, cible.id, rem);
    if (!r.ok) {
      return Response.json(
        { error: r.migrationManquante ? "Les rémunérations arrivent très bientôt : cette mise à jour n'est pas encore appliquée." : 'Enregistrement impossible.', code: r.migrationManquante ? 'MIGRATION_V112_REQUISE' : 'UPDATE_FAILED' },
        { status: r.migrationManquante ? 503 : 500 }
      );
    }
    const { remuneration } = await lireRemuneration(supabase, cible.id);
    return Response.json({ ok: true, remuneration, membre: membrePublic({ ...cible, remuneration }) });
  }
);
