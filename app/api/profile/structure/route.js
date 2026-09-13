import { z } from 'zod';
import { withRoute } from '@/lib/api-route';
import { CODES_STRUCTURE, sanitizeRna, erreurRna, typeStructure } from '@/lib/structure';

/**
 * PATCH /api/profile/structure — le type de structure (solo / association /
 * studio) et le numéro RNA d'une association (lot 0 Associations & Studios,
 * 2026-09-13, PLAN-ASSOS-STUDIOS-2026.md §7).
 *
 * Route SÉPARÉE (patron v104/v106/v108) : les deux colonnes sont neuves
 * (v110). Les mêler au payload de la carte « Mon activité » ferait échouer
 * TOUTE sa sauvegarde tant que la migration n'est pas appliquée. Ici, un
 * échec ne coûte que ce réglage, et on le DIT.
 *
 * Règles :
 *   - une association DOIT avoir un RNA valide (W + 9 chiffres), sinon 400 ;
 *   - une prof seule ou un studio n'en a pas : le RNA est effacé ;
 *   - une structure qui a un abonnement Association vivant ne repasse pas en
 *     prof seule ou studio par ce chemin (son plan et son type se
 *     contrediraient) : on renvoie vers le Customer Portal.
 */
const COLONNE_ABSENTE = ['42703', 'PGRST204', 'PGRST205'];
const schema = z.object({
  type_structure: z.enum(CODES_STRUCTURE),
  rna: z.string().max(20).optional().nullable(),
});

export const PATCH = withRoute({ auth: 'active', schema, perm: 'parametres' }, async ({ auth, body }) => {
  const { studioId, supabase } = auth;
  const type = body.type_structure;
  const rna = type === 'association' ? sanitizeRna(body.rna) : null;

  const erreur = erreurRna(type, body.rna);
  if (erreur) {
    return Response.json({ error: erreur, code: 'RNA_INVALIDE' }, { status: 400 });
  }

  // Un plan Association payé ne se garde qu'en association.
  const { data: actuel } = await supabase
    .from('profiles')
    .select('plan, stripe_subscription_status')
    .eq('id', studioId)
    .maybeSingle();
  const aboVivant = ['active', 'trialing', 'past_due'].includes(actuel?.stripe_subscription_status);
  if (aboVivant && actuel?.plan === 'asso' && type !== 'association') {
    return Response.json({
      error: 'Ton abonnement Association est en cours : change d\'abord de plan depuis « Gérer mon abonnement », puis reviens ici.',
      code: 'PLAN_ASSO_EN_COURS',
    }, { status: 409 });
  }

  const { error } = await supabase
    .from('profiles')
    .update({ type_structure: type, rna })
    .eq('id', studioId);
  if (error) {
    const migrationManquante = COLONNE_ABSENTE.includes(error.code);
    return Response.json(
      {
        error: migrationManquante
          ? "Ce réglage n'est pas encore actif sur ton compte (mise à jour en cours). Le reste de tes paramètres est enregistré normalement."
          : "Le réglage n'a pas pu être enregistré.",
        code: migrationManquante ? 'MIGRATION_V110_REQUISE' : 'UPDATE_FAILED',
      },
      { status: migrationManquante ? 503 : 500 }
    );
  }
  // La valeur ÉCRITE, jamais une relecture dans la même requête (leçon v106).
  return Response.json({ ok: true, type_structure: type, rna });
});

export const GET = withRoute({ auth: 'active' }, async ({ auth }) => {
  const { studioId, supabase } = auth;
  const { data, error } = await supabase.from('profiles').select('type_structure, rna').eq('id', studioId).maybeSingle();
  return Response.json({
    ok: true,
    type_structure: typeStructure(error ? null : data),
    rna: error ? null : (data?.rna || null),
    disponible: !error,
  });
});
