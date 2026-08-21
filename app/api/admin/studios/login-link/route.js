import { withRoute } from '@/lib/api-route';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { parseJsonBody, adminStudioCibleSchema } from '@/lib/validation';
import { reportError } from '@/lib/report';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/admin/studios/login-link — lien de connexion UNE-FOIS vers le
 * studio d'un profil (généralisation du lien démo Atelier Soleil). Sert le
 * concierge (paramétrer le studio d'une prospecte pendant la visio) et le
 * support (voir ce qu'elle voit, avec son accord).
 *
 * ⚠️ IMPERSONATION totale : admin-gated, usage unique, expire vite, et chaque
 * génération est tracée dans les logs serveur.
 */
export const POST = withRoute({ auth: 'admin' }, async ({ request, auth }) => {
  const { data, errorResponse } = await parseJsonBody(request, adminStudioCibleSchema);
  if (errorResponse) return errorResponse;

  const { data: user, error: eUser } = await supabaseAdmin.auth.admin.getUserById(data.profileId);
  if (eUser || !user?.user?.email) {
    return Response.json({ error: 'Compte introuvable pour ce profil.' }, { status: 404 });
  }

  const { data: lien, error } = await supabaseAdmin.auth.admin.generateLink({
    type: 'magiclink', email: user.user.email,
    options: { redirectTo: 'https://www.izisolo.fr/dashboard' },
  });
  if (error) {
    await reportError('[admin/studios/login-link]', error.message, { route: '/api/admin/studios/login-link' });
    return Response.json({ error: 'Génération impossible : ' + error.message }, { status: 500 });
  }

  console.log(`[concierge] login-link généré par ${auth?.user?.email || 'admin'} pour ${user.user.email}`);
  return Response.json({ ok: true, url: lien.properties.action_link });
});
