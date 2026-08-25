import { z } from 'zod';
import { withRoute } from '@/lib/api-route';
import { COOKIE_STUDIO } from '@/lib/studio-actif';

/**
 * POST /api/studio-actif — basculer d'un studio à l'autre (lot 3b).
 *
 * Une prof peut posséder son studio ET donner des cours dans une association.
 * Sans cette bascule, elle atterrissait toujours chez elle et ne pouvait
 * JAMAIS atteindre l'association : un trou fonctionnel du lot 3.
 *
 * Le cookie n'est qu'une préférence d'affichage. Il est revalidé à CHAQUE
 * résolution contre les appartenances réelles (lib/studio-actif) : le
 * bricoler ne donne accès à rien. On le vérifie quand même ici, pour ne pas
 * poser une préférence qui serait ignorée sans explication.
 */
const schema = z.object({ studioId: z.string().uuid() });

export const POST = withRoute({ auth: 'user', schema }, async ({ auth, body }) => {
  const { membres } = auth;

  if (!(membres || []).some(m => m.profile_id === body.studioId)) {
    return Response.json(
      { error: "Tu ne fais pas partie de ce studio.", code: 'PAS_MEMBRE' },
      { status: 403 }
    );
  }

  const reponse = Response.json({ ok: true, studioId: body.studioId });
  // 90 jours : une préférence, pas une session. `sameSite: lax` suffit (aucune
  // écriture ne dépend de ce cookie, la RLS reste la seule garde).
  reponse.headers.append(
    'Set-Cookie',
    `${COOKIE_STUDIO}=${body.studioId}; Path=/; Max-Age=${90 * 24 * 3600}; SameSite=Lax; HttpOnly`
  );
  return reponse;
});
