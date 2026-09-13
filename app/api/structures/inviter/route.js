import { z } from 'zod';
import { withRoute } from '@/lib/api-route';
import { createAdminClient } from '@/lib/supabase-admin';
import { sendEmail } from '@/lib/email';
import { reportError } from '@/lib/report';
import { genererToken, hashToken } from '@/lib/lien-pointage';
import { sanitizeInvitation, expirationInvitation, emailInvitationStructure } from '@/lib/parrainage';

/**
 * /api/structures/inviter — le pont 1 (v111) : une prof fait entrer son
 * association ou son studio sur IziSolo.
 *
 * POST → enregistre l'invitation (jeton à usage unique, sha256 en base),
 *        envoie l'email à l'ADRESSE DE LA STRUCTURE. À la création de son
 *        espace, la prof y sera membre automatiquement (route parrainage).
 * GET  → ses invitations, pour l'écran « Ailleurs ».
 *
 * Aucune garde de plan : faire entrer sa structure est un geste de la
 * PERSONNE, et une prof gratuite y a droit (c'est le freemium qui fait
 * tourner l'écosystème, PLAN-ASSOS-STUDIOS §2.1). `auth: 'active'` : un
 * compte gelé (impayé) n'invite pas.
 */
const ABSENT = ['PGRST204', 'PGRST205', '42703', '42P01'];

const schema = z.object({
  nom: z.string().max(200),
  email: z.string().max(254),
  type: z.string().max(20),
  message: z.string().max(2000).optional().nullable(),
});

export const GET = withRoute({ auth: 'user' }, async ({ auth }) => {
  const { user, supabase } = auth;
  const { data, error } = await supabase
    .from('invitations_structure')
    .select('id, nom_structure, email_structure, type_structure, statut, created_at, acceptee_at, expire_at, structure_profile_id')
    .eq('parrain_auth_user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(20);
  if (error) {
    return Response.json({ invitations: [], indisponible: ABSENT.includes(error.code) });
  }
  return Response.json({ invitations: data || [], indisponible: false });
});

export const POST = withRoute(
  { auth: 'active', schema, rateLimit: { max: 20, windowSeconds: 3600, scope: 'inviter-structure' } },
  async ({ request, auth, body }) => {
    const { user, profile, supabase } = auth;

    const v = sanitizeInvitation(body, user.email);
    if (!v.ok) return Response.json({ error: v.raison, code: 'INVITATION_INVALIDE' }, { status: 400 });

    // Une structure déjà sur IziSolo à cette adresse ? On le dit : le pont
    // n'est pas fait pour recréer un espace qui existe.
    try {
      const admin = createAdminClient();
      const { data: page } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
      const existe = (page?.users || []).some(u => String(u.email || '').toLowerCase() === v.email);
      if (existe) {
        return Response.json({
          error: "Cette adresse a déjà un compte IziSolo. Demande à la structure de t'inviter depuis son écran Équipe.",
          code: 'COMPTE_EXISTANT',
        }, { status: 409 });
      }
    } catch (e) {
      await reportError('[structures/inviter] listUsers', e, { route: '/api/structures/inviter' });
    }

    const token = genererToken();
    // Le studio de la PROF qui invite est le sien propre (une structure = son
    // compte, §6.1), quel que soit le studio qu'elle regarde en ce moment :
    // inviter son asso depuis l'écran d'un autre studio rattacherait la
    // structure au mauvais parrain. Ce n'est PAS le studio actif.
    const sonStudioId = user.id;
    const { data: inv, error } = await supabase
      .from('invitations_structure')
      .insert({
        parrain_profile_id: sonStudioId,
        parrain_auth_user_id: user.id,
        email_structure: v.email,
        nom_structure: v.nom,
        type_structure: v.type,
        message: v.message,
        token_hash: hashToken(token),
        expire_at: expirationInvitation().toISOString(),
      })
      .select('id, nom_structure, email_structure, type_structure, statut, created_at, expire_at')
      .single();

    if (error) {
      const migrationManquante = ABSENT.includes(error.code);
      return Response.json(
        {
          error: migrationManquante
            ? "Cette possibilité arrive très bientôt sur ton compte (mise à jour en cours). En attendant, envoie-lui izisolo.fr/creer-mon-studio."
            : "L'invitation n'a pas pu être enregistrée.",
          code: migrationManquante ? 'MIGRATION_V111_REQUISE' : 'INSERT_FAILED',
        },
        { status: migrationManquante ? 503 : 500 }
      );
    }

    const origine = new URL(request.url).origin;
    const lien = `${origine}/parrainage/${token}`;
    // SON profil (prénom, nom de son studio), pas celui du studio affiché :
    // `auth.profile` est celui du studio actif, qui peut être une autre structure.
    const { data: moi } = await supabase.from('profiles').select('prenom, studio_nom').eq('id', sonStudioId).maybeSingle();
    const { subject, html } = emailInvitationStructure({
      prenomParrain: moi?.prenom || profile?.prenom || null,
      studioParrain: moi?.studio_nom || null,
      nomStructure: v.nom,
      type: v.type,
      lien,
      message: v.message,
    });
    // Fire-and-forget : l'invitation est ENREGISTRÉE, l'email n'est que le
    // messager ; l'écran montre le lien pour qu'elle puisse l'envoyer elle-même.
    sendEmail({ to: v.email, subject, html, categorie: 'transactionnel', replyTo: user.email || undefined })
      .catch(e => reportError('[structures/inviter] email', e, { route: '/api/structures/inviter' }));

    return Response.json({ invitation: inv, lien });
  }
);
