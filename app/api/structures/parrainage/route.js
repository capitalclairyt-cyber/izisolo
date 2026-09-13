import { cookies } from 'next/headers';
import { withRoute } from '@/lib/api-route';
import { createAdminClient } from '@/lib/supabase-admin';
import { sendEmail } from '@/lib/email';
import { reportError } from '@/lib/report';
import { permissionsParDefaut } from '@/lib/studio-membre';
import { hashToken } from '@/lib/lien-pointage';
import { COOKIE_PARRAINAGE, verifierInvitation, invitationPublique, emailParrainAccepte } from '@/lib/parrainage';

/**
 * /api/structures/parrainage — le pont 1, côté STRUCTURE (v111).
 *
 * Le lien /parrainage/<jeton> pose un cookie (httpOnly, 7 jours) puis envoie
 * vers l'inscription. Ici :
 *   GET  → ce que l'onboarding peut afficher de l'invitation (nom de la
 *          structure, son type, qui invite), lu par le cookie.
 *   POST → l'ACCEPTATION, appelée par l'onboarding une fois le studio créé :
 *          la prof qui a invité devient membre (préréglage « Prof »), la
 *          structure garde `parrainee_par`, l'invitation passe « acceptee »,
 *          le cookie tombe, la prof est prévenue par email.
 *
 * Idempotente et jamais bloquante pour l'onboarding : sans cookie, sans
 * invitation valide, ou sans migration, on répond « rien à faire ».
 */
const ABSENT = ['PGRST204', 'PGRST205', '42703', '42P01'];

async function lireInvitation(admin) {
  const jar = await cookies();
  const token = jar.get(COOKIE_PARRAINAGE)?.value;
  if (!token) return { invitation: null };
  const { data: inv, error } = await admin
    .from('invitations_structure')
    .select('*')
    .eq('token_hash', hashToken(token))
    .maybeSingle();
  if (error) return { invitation: null, indisponible: ABSENT.includes(error.code) };
  return { invitation: inv || null };
}

export const GET = withRoute({ auth: 'user' }, async () => {
  const admin = createAdminClient();
  const { invitation, indisponible } = await lireInvitation(admin);
  if (!invitation) return Response.json({ invitation: null, indisponible: !!indisponible });
  const verdict = verifierInvitation(invitation, new Date());
  if (!verdict.ok) return Response.json({ invitation: null, raison: verdict.message });
  const { data: parrain } = await admin
    .from('profiles')
    .select('prenom, studio_nom')
    .eq('id', invitation.parrain_profile_id)
    .maybeSingle();
  return Response.json({ invitation: invitationPublique(invitation, parrain) });
});

export const POST = withRoute({ auth: 'user' }, async ({ request, auth }) => {
  const { user, studioId, supabase } = auth;
  const admin = createAdminClient();
  const { invitation } = await lireInvitation(admin);
  if (!invitation) return Response.json({ ok: true, rien: true });

  const verdict = verifierInvitation(invitation, new Date());
  if (!verdict.ok) return Response.json({ ok: true, rien: true, raison: verdict.message });

  // La structure qui accepte est CELLE qui vient de se créer (le studio de
  // la personne connectée). Une prof invitée ailleurs qui aurait ce cookie
  // n'accepte rien pour un studio qu'elle ne possède pas.
  if (!studioId || studioId !== user.id) return Response.json({ ok: true, rien: true });

  const { data: parrain } = await admin
    .from('profiles')
    .select('id, prenom, nom, studio_nom, email_contact')
    .eq('id', invitation.parrain_profile_id)
    .maybeSingle();
  const { data: parrainAuth } = invitation.parrain_auth_user_id
    ? await admin.auth.admin.getUserById(invitation.parrain_auth_user_id).catch(() => ({ data: null }))
    : { data: null };
  const emailParrain = String(parrainAuth?.user?.email || parrain?.email_contact || '').toLowerCase();

  // 1. La prof devient membre de la structure, ACTIVE tout de suite (elle a
  //    un compte) avec le préréglage « Prof ». Rejouer ne double rien
  //    (index unique profile_id + lower(email)).
  if (emailParrain && invitation.parrain_auth_user_id) {
    const { error: eMembre } = await admin.from('studio_membres').upsert({
      profile_id: studioId,
      auth_user_id: invitation.parrain_auth_user_id,
      email: emailParrain,
      role: 'prof',
      permissions: permissionsParDefaut('prof'),
      statut: 'actif',
      accepte_at: new Date().toISOString(),
      invite_par: user.id,
    }, { onConflict: 'profile_id,auth_user_id', ignoreDuplicates: true });
    if (eMembre) await reportError('[parrainage] membre non créé', eMembre, { route: '/api/structures/parrainage' });
    // Le prénom de la prof, pour que le planning la nomme (v111, à part).
    await admin.from('studio_membres')
      .update({ prenom: parrain?.prenom || null, nom: parrain?.nom || null })
      .eq('profile_id', studioId)
      .eq('auth_user_id', invitation.parrain_auth_user_id)
      .then(() => {}, () => {});
  }

  // 2. La structure garde la trace de qui l'a amenée.
  await supabase.from('profiles').update({ parrainee_par: invitation.parrain_profile_id }).eq('id', studioId).then(() => {}, () => {});

  // 3. L'invitation a servi.
  await admin.from('invitations_structure')
    .update({ statut: 'acceptee', acceptee_at: new Date().toISOString(), structure_profile_id: studioId })
    .eq('id', invitation.id);

  // 4. La prof le sait.
  if (emailParrain) {
    const origine = new URL(request.url).origin;
    const { subject, html } = emailParrainAccepte({ prenomParrain: parrain?.prenom, nomStructure: invitation.nom_structure, lien: `${origine}/dashboard` });
    sendEmail({ to: emailParrain, subject, html, categorie: 'transactionnel' })
      .catch(e => reportError('[parrainage] email parrain', e, { route: '/api/structures/parrainage' }));
  }

  const reponse = Response.json({ ok: true, parrain: parrain?.prenom || null, nom_structure: invitation.nom_structure });
  reponse.headers.append('Set-Cookie', `${COOKIE_PARRAINAGE}=; Path=/; Max-Age=0; SameSite=Lax; HttpOnly`);
  return reponse;
});
