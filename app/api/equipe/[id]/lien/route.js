import { withRoute } from '@/lib/api-route';
import { peutModifierMembre, membrePublic } from '@/lib/equipe';
import { genererToken, hashToken } from '@/lib/lien-pointage';
import { urlLienIntervenante, finDeSaison } from '@/lib/lien-intervenante';

/**
 * /api/equipe/[id]/lien — le LIEN PERMANENT d'une intervenante (v111).
 *
 * POST   → fabrique (ou remplace) le lien : jeton 256 bits, sha256 seul en
 *          base, expiration à la fin de la saison. L'URL est rendue UNE fois.
 * DELETE → révoque : l'écran et l'API se ferment à la requête suivante.
 *
 * Le lien vaut pour la personne, pas pour une séance : elle y voit ses
 * séances à venir et les pointe (lib/pointage-confie), sans compte. Plan
 * `equipe` et permission `equipe_gerer`, comme toute l'équipe. Le
 * propriétaire n'en a pas besoin (il a un compte) : refusé.
 */
const ABSENT = ['PGRST204', 'PGRST205', '42703', '42P01'];

async function charger(supabase, studioId, id) {
  const { data } = await supabase
    .from('studio_membres')
    .select('*')
    .eq('id', id)
    .eq('profile_id', studioId)
    .maybeSingle();
  return data;
}

export const POST = withRoute(
  { auth: 'active', plan: 'equipe', perm: 'equipe_gerer' },
  async ({ request, params, auth }) => {
    const { studioId, membre: acteur, supabase } = auth;
    const cible = await charger(supabase, studioId, params.id);
    const verdict = peutModifierMembre(acteur, cible);
    if (!verdict.ok) {
      return Response.json({ error: verdict.raison, code: 'REFUS' }, { status: cible ? 409 : 404 });
    }
    if (cible.statut === 'revoque') {
      return Response.json({ error: "Cette personne a été retirée de l'équipe : ré-invite-la d'abord.", code: 'RETIREE' }, { status: 409 });
    }

    const token = genererToken();
    const maintenant = new Date();
    const { error } = await supabase
      .from('studio_membres')
      .update({
        lien_hash: hashToken(token),
        lien_cree_at: maintenant.toISOString(),
        lien_expire_at: finDeSaison(maintenant).toISOString(),
        lien_revoque_at: null,
        lien_usages: 0,
        lien_derniere_utilisation_at: null,
      })
      .eq('id', cible.id)
      .eq('profile_id', studioId);

    if (error) {
      const migrationManquante = ABSENT.includes(error.code);
      return Response.json(
        {
          error: migrationManquante
            ? "Les liens d'intervenante ne sont pas encore actifs sur ton studio (mise à jour en cours)."
            : "Le lien n'a pas pu être créé.",
          code: migrationManquante ? 'MIGRATION_V111_REQUISE' : 'UPDATE_FAILED',
        },
        { status: migrationManquante ? 503 : 500 }
      );
    }

    const origine = new URL(request.url).origin;
    const apres = await charger(supabase, studioId, cible.id);
    return Response.json({
      url: urlLienIntervenante(origine, token),
      expire_at: finDeSaison(maintenant).toISOString(),
      membre: membrePublic(apres || cible),
    });
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
      .update({ lien_revoque_at: new Date().toISOString() })
      .eq('id', cible.id)
      .eq('profile_id', studioId);
    if (error) {
      return Response.json({ error: 'Révocation impossible.', code: ABSENT.includes(error.code) ? 'MIGRATION_V111_REQUISE' : 'UPDATE_FAILED' }, { status: ABSENT.includes(error.code) ? 503 : 500 });
    }
    const apres = await charger(supabase, studioId, cible.id);
    return Response.json({ ok: true, membre: membrePublic(apres || cible) });
  }
);
