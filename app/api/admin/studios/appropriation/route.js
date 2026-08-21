import { withRoute } from '@/lib/api-route';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { parseJsonBody, adminStudioCibleSchema } from '@/lib/validation';
import { sendEmail } from '@/lib/email';
import { reportError } from '@/lib/report';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/admin/studios/appropriation — envoie à la prof le lien pour
 * S'APPROPRIER son studio concierge : un lien de définition de mot de passe
 * (flux recovery existant), avec un email chaleureux qui dit clairement
 * qu'un compte a été créé pour elle et par qui. Le geste de fin de visio.
 */
export const POST = withRoute({ auth: 'admin' }, async ({ request, auth }) => {
  const { data, errorResponse } = await parseJsonBody(request, adminStudioCibleSchema);
  if (errorResponse) return errorResponse;

  const { data: user, error: eUser } = await supabaseAdmin.auth.admin.getUserById(data.profileId);
  if (eUser || !user?.user?.email) {
    return Response.json({ error: 'Compte introuvable pour ce profil.' }, { status: 404 });
  }
  const email = user.user.email;

  const { data: profil } = await supabaseAdmin
    .from('profiles')
    .select('prenom, studio_nom, studio_slug')
    .eq('id', data.profileId)
    .maybeSingle();

  const { data: lien, error: eLien } = await supabaseAdmin.auth.admin.generateLink({
    type: 'recovery', email,
    options: { redirectTo: 'https://www.izisolo.fr/auth/callback?type=recovery' },
  });
  if (eLien) {
    await reportError('[admin/studios/appropriation] generateLink', eLien.message, { route: '/api/admin/studios/appropriation' });
    return Response.json({ error: 'Génération du lien impossible : ' + eLien.message }, { status: 500 });
  }

  const prenom = profil?.prenom || '';
  const studio = profil?.studio_nom || 'ton studio';
  const res = await sendEmail({
    to: email,
    subject: `${studio} est prêt : ton accès IziSolo`,
    replyTo: 'bonjour@izisolo.fr',
    categorie: 'transactionnel',
    html: `
      <p>Bonjour${prenom ? ' ' + prenom : ''},</p>
      <p>Comme convenu ensemble, on a créé et préparé <strong>${studio}</strong> sur IziSolo pendant notre échange. Il est à toi.</p>
      <p><a href="${lien.properties.action_link}" style="display:inline-block;background:#1a1612;color:#ffffff;padding:12px 20px;border-radius:10px;text-decoration:none;font-weight:600;">Choisir mon mot de passe et entrer</a></p>
      <p>Ce lien te fait choisir ton mot de passe, puis tu retrouves ton studio tel qu'on l'a configuré : tes cours, tes offres, ta page de réservation. Ton essai de 14 jours court, sans carte bancaire.</p>
      <p>Pense à installer l'app sur ton téléphone (le guide dans le menu explique tout), et si quoi que ce soit coince : réponds à cet email, c'est nous qui lisons.</p>
      <p>À très vite 🌿</p>
    `,
  });
  if (!res?.ok) {
    return Response.json({ error: 'Email non parti : ' + (res?.skipped || res?.error || 'inconnu') }, { status: 500 });
  }

  console.log(`[concierge] appropriation envoyée par ${auth?.user?.email || 'admin'} à ${email} (${profil?.studio_slug || '?'})`);
  return Response.json({ ok: true });
});
