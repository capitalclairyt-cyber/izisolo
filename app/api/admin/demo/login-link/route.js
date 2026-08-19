import { withRoute } from '@/lib/api-route';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { reportError } from '@/lib/report';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const DEMO_EMAIL = 'camille@atelier-soleil.fr';

/**
 * POST /api/admin/demo/login-link — lien de connexion UNE-FOIS pour ouvrir le
 * compte démo Camille sur un appareil de démo/tournage (magic link admin,
 * aucun mot de passe touché). Pendant du CLI scripts/demo-login-link.mjs.
 * Usage unique et expire vite : à générer au moment de s'en servir.
 */
export const POST = withRoute({ auth: 'admin' }, async () => {
  const { data, error } = await supabaseAdmin.auth.admin.generateLink({
    type: 'magiclink', email: DEMO_EMAIL,
    options: { redirectTo: 'https://www.izisolo.fr/dashboard' },
  });
  if (error) {
    reportError('[admin/demo/login-link]', error.message, { route: '/api/admin/demo/login-link' });
    return Response.json({ error: 'Génération impossible : ' + error.message }, { status: 500 });
  }
  return Response.json({ ok: true, url: data.properties.action_link });
});
