import { requireAuth } from '@/lib/api-auth';
import { createClient as createAdminSupabase } from '@supabase/supabase-js';
import { finaliserDemande, emailConfirmationVisiteur } from '@/lib/essai';
import { Resend } from 'resend';

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
export async function POST(request, { params }) {
  let profile, supabase;
  try {
    ({ profile, supabase } = await requireAuth());
  } catch (res) { return res; }

  if (!profile?.studio_slug) {
    return Response.json({ error: 'Réservé aux pros' }, { status: 403 });
  }

  const { id } = await params;

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
  const supabaseAdmin = createAdminSupabase(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  if (action === 'valider') {
    try {
      const { client_id, presence_id } = await finaliserDemande(supabaseAdmin, demande);

      // Email confirmation au visiteur
      const { data: cours } = await supabaseAdmin
        .from('cours')
        .select('id, nom, date, heure, lieu')
        .eq('id', demande.cours_id)
        .single();
      emailConfirmationVisiteur({
        profileNom: profile.studio_nom,
        studioSlug: profile.studio_slug,
        prenom: demande.prenom,
        email: demande.email,
        cours,
        paiement: profile.essai_paiement,
        prix: profile.essai_prix,
        stripeLink: profile.essai_paiement === 'stripe' ? profile.essai_stripe_payment_link : null,
      });

      return Response.json({ ok: true, client_id, presence_id });
    } catch (err) {
      console.error('[admin/essai] valider err:', err);
      return Response.json({ error: 'Erreur lors de la validation : ' + err.message }, { status: 500 });
    }
  }

  // refuser
  await supabaseAdmin
    .from('cours_essai_demandes')
    .update({
      statut: 'refusee',
      motif_refus: body.motif || null,
      decided_at: new Date().toISOString(),
    })
    .eq('id', id);

  // Email refus au visiteur
  if (process.env.RESEND_API_KEY) {
    try {
      const resend = new Resend(process.env.RESEND_API_KEY);
      await resend.emails.send({
        from: process.env.RESEND_FROM_EMAIL || 'IziSolo <no-reply@izisolo.fr>',
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
      console.error('[admin/essai] email refus err:', err);
    }
  }

  return Response.json({ ok: true });
}
