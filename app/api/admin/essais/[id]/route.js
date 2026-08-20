// ⚠️ Malgré le chemin /api/admin/, cette route est celle du PRO (validation
// de SES demandes d'essai) — auth:'active', pas 'admin'. Écriture métier →
// bloquée si compte gelé (402).
import { withRoute } from '@/lib/api-route';
import { createAdminClient } from '@/lib/supabase-admin';
import { finaliserDemande, emailConfirmationVisiteur } from '@/lib/essai';
import { prixEssai, getEssaiPrixParType } from '@/lib/essai-tarif';
import { buildPortailMagicLink } from '@/lib/portail-magic-link';
import { sendPushToEmail } from '@/lib/push-server';
import { sendEmail } from '@/lib/email';
import { coursDejaCommence } from '@/lib/dates';
import { reportError } from '@/lib/report';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/admin/essais/[id]
 *
 * Body :
 *   { action: 'valider' } → finaliser la demande (créer client + presence)
 *   { action: 'refuser', motif?: string } → marquer comme refusée + email visiteur
 *
 * Réservé au pro propriétaire (RLS).
 */
export const POST = withRoute({ auth: 'active' }, async ({ request, params, auth }) => {
  const { profile, supabase, user } = auth;

  if (!profile?.studio_slug) {
    return Response.json({ error: 'Réservé aux pros' }, { status: 403 });
  }

  const { id } = params;

  let body;
  try { body = await request.json(); } catch { return Response.json({ error: 'JSON invalide' }, { status: 400 }); }
  const action = body.action;
  if (!['valider', 'refuser'].includes(action)) {
    return Response.json({ error: "action requis : 'valider' ou 'refuser'" }, { status: 400 });
  }

  // Récupérer la demande (filtrée par RLS — pro ne voit que les siennes)
  const { data: demande } = await supabase
    .from('cours_essai_demandes')
    .select('*')
    .eq('id', id)
    .single();
  if (!demande) return Response.json({ error: 'Demande introuvable' }, { status: 404 });
  if (demande.statut !== 'en_attente' && demande.statut !== 'acceptee') {
    return Response.json({ error: 'Demande déjà traitée' }, { status: 409 });
  }

  // Service-role pour les opérations cross-table (finalisation)
  const supabaseAdmin = createAdminClient();

  if (action === 'valider') {
    // Re-vérification AVANT de finaliser (audit 2026-07-25) : la validation
    // manuelle peut arriver des jours après la demande — le cours a pu être
    // annulé ou passer entre-temps. (Complet/annulé sont aussi re-vérifiés
    // sous verrou par la RPC dans finaliserDemande — ceci donne un message
    // clair sans rien écrire.)
    const { data: coursCheck } = await supabaseAdmin
      .from('cours')
      .select('id, date, heure, est_annule')
      .eq('id', demande.cours_id)
      .single();
    if (!coursCheck) return Response.json({ error: 'Ce cours n\'existe plus.' }, { status: 409 });
    if (coursCheck.est_annule) return Response.json({ error: 'Ce cours a été annulé — impossible de valider l\'essai dessus.' }, { status: 409 });
    if (coursDejaCommence(coursCheck)) {
      return Response.json({ error: 'Cette séance est déjà passée — propose-lui un autre créneau (ou refuse avec un mot gentil).' }, { status: 409 });
    }

    try {
      const { client_id, presence_id } = await finaliserDemande(supabaseAdmin, demande);

      // Email confirmation au visiteur
      const { data: cours } = await supabaseAdmin
        .from('cours')
        .select('id, nom, type_cours, date, heure, lieu')
        .eq('id', demande.cours_id)
        .single();
      // Tarif d'essai par type (v92, lecture défensive — null pré-migration)
      const surchargesEssai = await getEssaiPrixParType(supabaseAdmin, profile.id);
      // Accès direct à l'espace pour l'invité validé (comme la réservation).
      const magicLink = await buildPortailMagicLink({ email: demande.email, studioSlug: profile.studio_slug });
      emailConfirmationVisiteur({
        profileNom: profile.studio_nom,
        studioSlug: profile.studio_slug,
        prenom: demande.prenom,
        email: demande.email,
        cours,
        paiement: profile.essai_paiement,
        prix: prixEssai(profile, cours?.type_cours, surchargesEssai),
        stripeLink: profile.essai_paiement === 'stripe' ? profile.essai_stripe_payment_link : null,
        magicLink,
      });

      // Push (no-op si l'invité n'a pas d'abonnement)
      sendPushToEmail(demande.email, {
        title: `Cours d'essai confirmé 🎉`,
        body: `${profile.studio_nom} a validé ta demande — ${cours?.nom || 'ton cours'}.`,
        url: `/p/${profile.studio_slug}/espace`,
        tag: `essai-${id}`,
      }, { type: 'essai', profileId: profile.id }).catch(() => {});

      return Response.json({ ok: true, client_id, presence_id });
    } catch (err) {
      // Refus métier de la RPC (complet/annulé) ou fiche homonyme (index
      // anti-doublon) → 409 avec le message propre, pas un 500 (la demande
      // reste en_attente/acceptee, re-tentable après correction).
      if (['complet', 'annule', 'introuvable', 'fiche_homonyme'].includes(err?.code)) {
        return Response.json({ error: err.message }, { status: 409 });
      }
      reportError('[admin/essai] valider err:', err);
      return Response.json({ error: 'Erreur lors de la validation : ' + err.message }, { status: 500 });
    }
  }

  // refuser — erreur vérifiée (B2c) : un refus qui échouait laissait la
  // demande « en attente » côté DB pendant que l'UI confirmait le refus.
  const { error: refusErr } = await supabaseAdmin
    .from('cours_essai_demandes')
    .update({
      statut: 'refusee',
      motif_refus: body.motif || null,
      decided_at: new Date().toISOString(),
    })
    .eq('id', id);
  if (refusErr) {
    reportError('[admin/essai] refus update err:', refusErr);
    return Response.json({ error: 'Erreur lors du refus' }, { status: 500 });
  }

  // Email refus au visiteur
  if (process.env.RESEND_API_KEY) {
    try {
      // Transactionnel : réponse à SA demande d'essai
      await sendEmail({
        categorie: 'transactionnel',
        replyTo: user?.email || null,
        to: demande.email,
        subject: `Demande de cours d'essai chez ${profile.studio_nom}`,
        html: `
          <div style="font-family:-apple-system,BlinkMacSystemFont,sans-serif;max-width:560px;margin:0 auto;padding:24px;">
            <p style="color:#555;margin:0 0 12px;">Bonjour ${demande.prenom},</p>
            <p style="color:#555;margin:0 0 12px;">
              Merci pour ta demande de cours d'essai chez <strong>${profile.studio_nom}</strong>.
            </p>
            <p style="color:#555;margin:0 0 16px;">
              Malheureusement, ${profile.studio_nom} n'a pas pu donner suite à ta demande pour le moment.
              ${body.motif ? `<br/><br/><em style="color:#888;">"${body.motif}"</em>` : ''}
            </p>
            <p style="color:#555;margin:0 0 16px;">
              N'hésite pas à proposer une autre date depuis le portail public si l'envie te reprend.
            </p>
          </div>
        `,
      });
    } catch (err) {
      reportError('[admin/essai] email refus err:', err);
    }
  }

  // Push refus (no-op si pas d'abonnement)
  sendPushToEmail(demande.email, {
    title: `Réponse à ta demande d'essai`,
    body: `${profile.studio_nom} n'a pas pu donner suite pour le moment.`,
    url: `/p/${profile.studio_slug}`,
    tag: `essai-${id}`,
  }, { type: 'essai', profileId: profile.id }).catch(() => {});

  return Response.json({ ok: true });
});
