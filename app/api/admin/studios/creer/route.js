import { withRoute } from '@/lib/api-route';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { parseJsonBody, adminStudioCreerSchema } from '@/lib/validation';
import { genererSlugStudioUnique } from '@/lib/slug-studio';
import { TYPES_COURS_DEFAUT } from '@/lib/constantes';
import { reportError } from '@/lib/report';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/admin/studios/creer — studio CONCIERGE : l'équipe crée le studio
 * d'une prospecte (typiquement pendant la visio de démo), le paramètre devant
 * elle via le lien de connexion, puis lui envoie le lien d'appropriation.
 *
 * Chemin : createUser (email confirmé, metadata prenom → handle_new_user crée
 * le profil PROF, jamais role='eleve' ici) puis complétion du profil comme le
 * ferait l'onboarding (slug unique, métier, types de cours par défaut, portail
 * actif) → le compte atterrit directement sur le dashboard, trial 14 j
 * démarré. Toujours avec l'accord de l'intéressée (elle est en visio).
 */
export const POST = withRoute({ auth: 'admin' }, async ({ request, auth }) => {
  const { data, errorResponse } = await parseJsonBody(request, adminStudioCreerSchema);
  if (errorResponse) return errorResponse;
  const { prenom, email, studioNom, metier } = data;

  // Un compte auth existe déjà pour cet email ? On refuse avec un message
  // clair (élève : le flip volontaire existe côté user ; prof : rien à créer).
  const { data: usersPage, error: eList } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (eList) {
    await reportError('[admin/studios/creer] listUsers', eList.message, { route: '/api/admin/studios/creer' });
    return Response.json({ error: 'Vérification email impossible : ' + eList.message }, { status: 500 });
  }
  const existant = usersPage.users.find(u => (u.email || '').toLowerCase() === email);
  if (existant) {
    return Response.json({
      error: 'Un compte existe déjà avec cet email. Si c\'est un compte élève, elle peut ouvrir son studio elle-même depuis son espace ; si c\'est un studio, il est déjà là.',
    }, { status: 409 });
  }

  const { data: cree, error: eCreate } = await supabaseAdmin.auth.admin.createUser({
    email,
    email_confirm: true,
    user_metadata: { prenom, concierge: true },
  });
  if (eCreate) {
    await reportError('[admin/studios/creer] createUser', eCreate.message, { route: '/api/admin/studios/creer' });
    return Response.json({ error: 'Création du compte impossible : ' + eCreate.message }, { status: 500 });
  }
  const userId = cree.user.id;

  // Complétion du profil (créé par le trigger handle_new_user) : mêmes champs
  // que l'onboarding, pour que la garde `studio_slug` laisse entrer direct.
  let slug;
  try {
    slug = await genererSlugStudioUnique(supabaseAdmin, studioNom, userId);
  } catch (e) {
    await reportError('[admin/studios/creer] slug', e, { route: '/api/admin/studios/creer' });
    return Response.json({ error: 'Génération du slug impossible : ' + (e?.message || e) }, { status: 500 });
  }
  const { data: profil, error: eProfil } = await supabaseAdmin
    .from('profiles')
    .update({
      prenom,
      studio_nom: studioNom,
      studio_slug: slug,
      metier,
      types_cours: TYPES_COURS_DEFAUT[metier] || TYPES_COURS_DEFAUT.autre,
      portail_actif: true,
    })
    .eq('id', userId)
    .select('id, studio_slug')
    .maybeSingle();
  if (eProfil || !profil) {
    await reportError('[admin/studios/creer] profil', eProfil?.message || 'profil introuvable après createUser', { route: '/api/admin/studios/creer' });
    return Response.json({ error: 'Profil non complété : ' + (eProfil?.message || 'introuvable') }, { status: 500 });
  }

  // Lien de connexion une-fois pour paramétrer le studio pendant la visio.
  const { data: lien, error: eLien } = await supabaseAdmin.auth.admin.generateLink({
    type: 'magiclink', email,
    options: { redirectTo: 'https://www.izisolo.fr/dashboard' },
  });
  if (eLien) {
    await reportError('[admin/studios/creer] generateLink', eLien.message, { route: '/api/admin/studios/creer' });
  }

  // Trace d'impersonation dans les logs serveur (qui a créé quoi).
  console.log(`[concierge] studio créé par ${auth?.user?.email || 'admin'} : ${studioNom} (${slug}) pour ${email}`);

  return Response.json({
    ok: true,
    profileId: userId,
    slug,
    loginLink: lien?.properties?.action_link || null,
  });
});
