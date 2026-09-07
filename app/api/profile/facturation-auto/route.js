import { z } from 'zod';
import { withRoute } from '@/lib/api-route';
import { lireFacturationAuto, poserFacturationAuto } from '@/lib/facture-auto';

/**
 * PATCH /api/profile/facturation-auto — « envoyer la facture à l'élève à
 * chaque encaissement » (v106).
 *
 * Route SÉPARÉE, comme les couleurs de marque (v104) : la colonne est neuve,
 * et l'ajouter au gros payload des Paramètres ferait échouer TOUTE la
 * sauvegarde de la carte Facturation tant que v106 n'est pas appliquée
 * (PostgREST refuse la requête entière). Ici, un échec ne coûte que ce
 * réglage, et on le DIT.
 */
const schema = z.object({ actif: z.boolean() });

export const PATCH = withRoute({ auth: 'active', schema, perm: 'parametres' }, async ({ auth, body }) => {
  const { studioId, supabase } = auth;

  const res = await poserFacturationAuto(supabase, studioId, body.actif);
  if (!res.ok) {
    return Response.json(
      {
        error: res.migrationManquante
          ? "L'envoi automatique des factures n'est pas encore actif sur ton compte (mise à jour en cours). Tes factures restent disponibles au clic, sur chaque paiement."
          : "Le réglage n'a pas pu être enregistré.",
        code: res.migrationManquante ? 'MIGRATION_V106_REQUISE' : 'UPDATE_FAILED',
      },
      { status: res.migrationManquante ? 503 : 500 }
    );
  }

  // On répond la valeur ÉCRITE, jamais une relecture dans la même requête :
  // Next mémoïse les fetch d'une requête et la relecture rendait l'ANCIENNE
  // valeur (attrapé par la preuve : base à true, réponse à false).
  return Response.json({ ok: true, actif: body.actif === true });
});

export const GET = withRoute({ auth: 'active' }, async ({ auth }) => {
  const { studioId, supabase } = auth;
  const res = await lireFacturationAuto(supabase, studioId);
  return Response.json({ ok: true, actif: res.auto, disponible: !res.migrationManquante });
});
