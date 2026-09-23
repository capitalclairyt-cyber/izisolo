import { z } from 'zod';
import { withRoute } from '@/lib/api-route';
import { REGLAGES_LANGUE_STUDIO, reglageLangueStudio } from '@/lib/i18n-portail';

/**
 * PATCH /api/profile/langue-portail — la langue par défaut du portail élève
 * (v121, 2026-09-22 : les élèves anglophones de Romain s'arrêtaient à la
 * connexion d'un portail qui ne parle que français).
 *
 * Route SÉPARÉE (patron v104 / v108) : la colonne est neuve, l'ajouter au
 * payload de la carte « Page publique » ferait échouer TOUTE sa sauvegarde
 * tant que v121 n'est pas appliquée. Ici, un échec ne coûte que ce réglage,
 * et on le DIT.
 */
const COLONNE_ABSENTE = ['42703', 'PGRST204', 'PGRST205'];
// v123 : « auto » (la langue du navigateur de chaque visiteuse) devient le
// défaut. Sans v123, le CHECK de v121 refuse cette valeur (23514) : on le dit.
const schema = z.object({ langue: z.enum(REGLAGES_LANGUE_STUDIO) });

export const PATCH = withRoute({ auth: 'active', schema, perm: 'parametres' }, async ({ auth, body }) => {
  const { studioId, supabase } = auth;
  const { error } = await supabase
    .from('profiles')
    .update({ langue_portail: body.langue })
    .eq('id', studioId);
  if (error) {
    if (body.langue === 'auto' && (error.code === '23514' || /langue_portail_check/.test(error.message || ''))) {
      return Response.json(
        {
          error: "Le réglage « Automatique » n'est pas encore actif sur ton compte (mise à jour en cours). Ta page reste dans la langue choisie, et tes élèves gardent le bouton FR / EN.",
          code: 'MIGRATION_V123_REQUISE',
        },
        { status: 503 }
      );
    }
    const migrationManquante = COLONNE_ABSENTE.includes(error.code) || /langue_portail/.test(error.message || '');
    return Response.json(
      {
        error: migrationManquante
          ? "Ce réglage n'est pas encore actif sur ton compte (mise à jour en cours). Ta page reste en français, et tes élèves peuvent déjà basculer en anglais avec le bouton EN de ta page."
          : "Le réglage n'a pas pu être enregistré.",
        code: migrationManquante ? 'MIGRATION_V121_REQUISE' : 'UPDATE_FAILED',
      },
      { status: migrationManquante ? 503 : 500 }
    );
  }
  // La valeur ÉCRITE, jamais une relecture dans la même requête (leçon v106).
  return Response.json({ ok: true, langue: body.langue });
});

export const GET = withRoute({ auth: 'active' }, async ({ auth }) => {
  const { studioId, supabase } = auth;
  const { data, error } = await supabase.from('profiles').select('langue_portail').eq('id', studioId).maybeSingle();
  return Response.json({ ok: true, langue: reglageLangueStudio(error ? null : data), disponible: !error });
});
