import { z } from 'zod';
import { withRoute } from '@/lib/api-route';
import { createAdminClient } from '@/lib/supabase-admin';
import { reportError } from '@/lib/report';

// ════════════════════════════════════════════════════════════════════════════
// Mot de passe OPTIONNEL (2026-07-26, go Colin — retour d'une élève de Maude :
// « je dois redemander un lien par email à chaque connexion »).
// L'élève définit/change son mot de passe depuis son espace → peut ensuite se
// connecter directement sur /p/[slug]/connexion sans magic link. Le lien
// email reste le chemin par défaut (et le secours « mot de passe oublié »).
// Self-service strict : on ne modifie QUE le compte du JWT appelant.
// ════════════════════════════════════════════════════════════════════════════

const schema = z.object({
  password: z.string().min(8, 'Au moins 8 caractères').max(72),
});

export const POST = withRoute({ auth: 'user', schema, rateLimit: { max: 10, scope: 'eleve-mdp' } }, async ({ auth, body }) => {
  const { user } = auth;

  const admin = createAdminClient();
  const { error } = await admin.auth.admin.updateUserById(user.id, { password: body.password });
  if (error) {
    reportError('[eleve/mot-de-passe] updateUserById:', error);
    return Response.json({ error: 'Impossible d\'enregistrer le mot de passe — réessaie.' }, { status: 500 });
  }

  return Response.json({ ok: true });
});
