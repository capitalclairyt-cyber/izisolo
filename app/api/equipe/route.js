import { z } from 'zod';
import { withRoute } from '@/lib/api-route';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { sendEmail } from '@/lib/email';
import { reportError } from '@/lib/report';
import { sanitizeRole, sanitizePermissions, permissionsParDefaut, CLES_PERMISSIONS } from '@/lib/studio-membre';
import { emailInvitation, verifierEmailInvitation, normaliserEmail, membrePublic } from '@/lib/equipe';

/**
 * /api/equipe — l'équipe d'un studio (lot 3 du chantier multi-prof).
 *
 * GET  → la liste, propriétaire compris.
 * POST → invite quelqu'un par email.
 *
 * DEUX gardes, et elles répondent à deux questions différentes :
 *   plan: 'equipe'       → le STUDIO a-t-il acheté le multi-prof ?
 *   perm: 'equipe_gerer' → CETTE personne a-t-elle le droit d'y toucher ?
 * Le propriétaire passe toujours la seconde ; personne ne passe la première
 * sans le plan Multi.
 */

const inviterSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(254),
  prenom: z.string().trim().max(60).optional(),
  role: z.enum(['admin', 'prof']).optional(),
  permissions: z.record(z.string(), z.boolean()).optional(),
});

export const GET = withRoute({ auth: 'user', plan: 'equipe', perm: 'equipe_gerer' }, async ({ auth }) => {
  const { studioId, supabase } = auth;

  const { data, error } = await supabase
    .from('studio_membres')
    .select('*')
    .eq('profile_id', studioId)
    .order('role', { ascending: true })
    .order('invite_at', { ascending: true });

  if (error) {
    const absente = error.code === 'PGRST205' || error.code === '42P01';
    return Response.json(
      { membres: [], indisponible: absente, error: absente ? 'MIGRATION_V101_REQUISE' : 'Lecture impossible' },
      { status: absente ? 200 : 500 }
    );
  }

  return Response.json({ membres: (data || []).map(membrePublic) });
});

export const POST = withRoute(
  { auth: 'active', schema: inviterSchema, plan: 'equipe', perm: 'equipe_gerer' },
  async ({ request, auth, body }) => {
    const { user, studioId, supabase, profile } = auth;

    const verdict = verifierEmailInvitation(body.email, user.email);
    if (!verdict.ok) {
      return Response.json({ error: verdict.raison, code: 'EMAIL_INVALIDE' }, { status: 400 });
    }
    const email = verdict.email;

    const role = sanitizeRole(body.role);
    // Permissions : celles envoyées si elles sont fournies, sinon le préréglage
    // du rôle. Dans les deux cas passées au tamis — une clé inventée ne doit
    // jamais atterrir en base, elle y deviendrait indéchiffrable.
    const permissions = body.permissions
      ? sanitizePermissions(body.permissions)
      : permissionsParDefaut(role);

    // Déjà dans l'équipe ? On le dit, plutôt que de heurter l'index unique et
    // de renvoyer un 500 illisible.
    const { data: deja } = await supabase
      .from('studio_membres')
      .select('id, statut, email')
      .eq('profile_id', studioId)
      .ilike('email', email)
      .maybeSingle();

    if (deja) {
      if (deja.statut === 'revoque') {
        // Ré-inviter quelqu'un qu'on avait retiré : on réactive SA ligne
        // plutôt que d'en créer une seconde. L'historique reste lisible.
        const { data: reactive, error: eReac } = await supabase
          .from('studio_membres')
          .update({ statut: 'invite', role, permissions, revoque_at: null, invite_at: new Date().toISOString() })
          .eq('id', deja.id)
          .select('*')
          .single();
        if (eReac) return Response.json({ error: 'Réactivation impossible.', code: 'UPDATE_FAILED' }, { status: 500 });
        return Response.json({ membre: membrePublic(reactive), reactive: true });
      }
      return Response.json(
        { error: 'Cette adresse fait déjà partie de ton équipe.', code: 'DEJA_MEMBRE' },
        { status: 409 }
      );
    }

    // ── Le compte auth : existe-t-il déjà ? ────────────────────────────────
    // Une prof peut très bien avoir un compte IziSolo (le sien, ou celui d'un
    // autre studio) : dans ce cas on ne crée RIEN, elle se connecte comme
    // d'habitude et le studio apparaît.
    let compteExistant = false;
    let lien = null;
    try {
      const { data: page } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1000 });
      compteExistant = (page?.users || []).some(u => normaliserEmail(u.email) === email);
    } catch (e) {
      await reportError('[equipe] listUsers', e, { route: '/api/equipe' });
    }

    if (!compteExistant) {
      // ⚠️ role:'membre' dans la metadata : le trigger handle_new_user (v101)
      // s'en sert pour NE PAS lui fabriquer un studio à elle. Sans ça, elle
      // repartirait avec un studio fantôme en essai 14 j — l'incident Bruno.
      const { error: eCreate } = await supabaseAdmin.auth.admin.createUser({
        email,
        email_confirm: true,
        user_metadata: { role: 'membre', prenom: body.prenom || '' },
      });
      if (eCreate) {
        await reportError('[equipe] createUser', eCreate.message, { route: '/api/equipe' });
        return Response.json({ error: "Le compte n'a pas pu être créé : " + eCreate.message, code: 'CREATE_FAILED' }, { status: 500 });
      }
    }

    const origine = new URL(request.url).origin;
    try {
      const { data: gen } = await supabaseAdmin.auth.admin.generateLink({
        type: compteExistant ? 'magiclink' : 'recovery',
        email,
        options: { redirectTo: `${origine}/auth/callback${compteExistant ? '' : '?type=recovery'}` },
      });
      lien = gen?.properties?.action_link || `${origine}/login`;
    } catch (e) {
      await reportError('[equipe] generateLink', e, { route: '/api/equipe' });
      lien = `${origine}/login`;
    }

    // La ligne naît « invite » : elle deviendra « actif » au PREMIER accès
    // réel (activerInvitationsEnAttente). Afficher « Actif » à quelqu'un qui
    // n'est jamais venu serait un mensonge de tableau de bord.
    const { data: membre, error: eIns } = await supabase
      .from('studio_membres')
      .insert({
        profile_id: studioId,
        email,
        role,
        permissions,
        statut: 'invite',
        invite_par: user.id,
      })
      .select('*')
      .single();

    if (eIns) {
      const absente = eIns.code === 'PGRST205' || eIns.code === '42P01';
      return Response.json(
        {
          error: absente
            ? "L'équipe arrive très bientôt : cette mise à jour n'est pas encore appliquée."
            : "L'invitation n'a pas pu être enregistrée.",
          code: absente ? 'MIGRATION_V101_REQUISE' : 'INSERT_FAILED',
        },
        { status: absente ? 503 : 500 }
      );
    }

    const { subject, html } = emailInvitation({
      studioNom: profile?.studio_nom,
      prenomInvitee: body.prenom,
      prenomProprietaire: profile?.prenom,
      lien,
      membre,
      compteExistant,
    });
    // Fire-and-forget : l'invitation est ENREGISTRÉE, l'email n'est que le
    // messager. Un envoi raté ne doit pas annuler ce que la prof a décidé —
    // elle peut renvoyer le lien depuis l'écran.
    sendEmail({ to: email, subject, html, categorie: 'transactionnel', replyTo: profile?.email_contact || undefined })
      .catch(e => reportError('[equipe] email invitation', e, { route: '/api/equipe' }));

    return Response.json({ membre: membrePublic(membre), compteExistant, clesPermissions: CLES_PERMISSIONS });
  }
);
