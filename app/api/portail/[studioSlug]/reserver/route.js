import { createServerClient } from '@/lib/supabase-server';
import { createClient as createAdminSupabase } from '@supabase/supabase-js';
import { parseJsonBody, reservationSchema } from '@/lib/validation';

export async function POST(request, { params }) {
  const { studioSlug } = await params;
  const { data: body, errorResponse } = await parseJsonBody(request, reservationSchema);
  if (errorResponse) return errorResponse;
  const { coursId, nom, email, tel } = body;

  // Détecter si la requête vient d'un user déjà authentifié
  const supabaseSession = await createServerClient();
  const { data: { user: authUser } } = await supabaseSession.auth.getUser();
  const isAuthenticated = !!authUser && authUser.email?.toLowerCase() === email.toLowerCase();

  // Utiliser le service role pour les opérations admin
  const supabaseAdmin = createAdminSupabase(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  // Vérifier que le studio existe et que le cours lui appartient
  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('id, studio_nom')
    .eq('studio_slug', studioSlug)
    .single();

  if (!profile) return Response.json({ error: 'Studio introuvable' }, { status: 404 });

  const { data: cours } = await supabaseAdmin
    .from('cours')
    .select('id, nom, date, heure, lieu, capacite_max, est_annule, profile_id')
    .eq('id', coursId)
    .eq('profile_id', profile.id)
    .single();

  if (!cours) return Response.json({ error: 'Cours introuvable' }, { status: 404 });
  if (cours.est_annule) return Response.json({ error: 'Ce cours est annulé' }, { status: 400 });

  const today = new Date().toISOString().slice(0, 10);
  if (cours.date < today) return Response.json({ error: 'Ce cours est passé' }, { status: 400 });

  // Vérifier la capacité
  if (cours.capacite_max) {
    const { count } = await supabaseAdmin
      .from('presences')
      .select('id', { count: 'exact', head: true })
      .eq('cours_id', coursId);
    if ((count || 0) >= cours.capacite_max) {
      return Response.json({ error: 'Ce cours est complet' }, { status: 409 });
    }
  }

  // Chercher ou créer le client dans la table clients du prof
  let clientId;
  let prenom;
  const { data: existingClient } = await supabaseAdmin
    .from('clients')
    .select('id, prenom')
    .eq('profile_id', profile.id)
    .ilike('email', email)
    .single();

  if (existingClient) {
    clientId = existingClient.id;
    prenom = existingClient.prenom;
  } else {
    const nomParts = nom.split(' ');
    prenom = nomParts[0];
    const clientNom = nomParts.slice(1).join(' ') || '';
    const { data: newClient, error: clientErr } = await supabaseAdmin
      .from('clients')
      .insert({
        profile_id: profile.id,
        prenom,
        nom: clientNom,
        email,
        telephone: tel || null,
      })
      .select('id')
      .single();
    if (clientErr) {
      console.error('create client error:', clientErr);
      return Response.json({ error: 'Erreur lors de la création du profil' }, { status: 500 });
    }
    clientId = newClient.id;
  }

  // Vérifier que l'élève n'est pas déjà inscrit
  const { data: dejaInscrit } = await supabaseAdmin
    .from('presences')
    .select('id')
    .eq('cours_id', coursId)
    .eq('client_id', clientId)
    .single();

  if (dejaInscrit) {
    return Response.json({ error: 'Tu es déjà inscrit·e à ce cours' }, { status: 409 });
  }

  // Créer la présence (inscrit, pas encore pointé)
  // Schéma : pointee BOOLEAN (default false), statut_pointage TEXT (default 'inscrit')
  // Les colonnes `present` et `source` n'existent pas — bug pré-existant qui faisait
  // échouer silencieusement TOUTE réservation portail.
  const { error: presenceErr } = await supabaseAdmin
    .from('presences')
    .insert({
      cours_id: coursId,
      client_id: clientId,
      profile_id: profile.id,
      // pointee + statut_pointage prennent leurs defaults ('false' + 'inscrit')
    });

  if (presenceErr) {
    console.error('create presence error:', presenceErr);
    return Response.json({ error: 'Erreur lors de la réservation : ' + presenceErr.message }, { status: 500 });
  }

  // Si l'utilisateur n'est pas authentifié, générer un magic link pour qu'il accède
  // à son espace en un clic. Le lien sera intégré dans l'email Resend de confirmation.
  let magicLink = null;
  if (!isAuthenticated) {
    try {
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://izisolo.fr';
      const { data: linkData, error: linkErr } = await supabaseAdmin.auth.admin.generateLink({
        type: 'magiclink',
        email,
        options: {
          redirectTo: `${appUrl}/auth/callback?next=/p/${studioSlug}/espace`,
        },
      });
      if (linkErr) {
        console.error('magic link error (non-blocking):', linkErr);
      } else {
        magicLink = linkData?.properties?.action_link || null;
      }
    } catch (linkErr) {
      console.error('magic link exception (non-blocking):', linkErr);
    }
  }

  // Envoyer email de confirmation (si Resend configuré)
  let magicLinkSent = false;
  try {
    if (process.env.RESEND_API_KEY) {
      const { Resend } = await import('resend');
      const resend = new Resend(process.env.RESEND_API_KEY);
      const dateStr = new Date(cours.date + 'T12:00:00').toLocaleDateString('fr-FR', {
        weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
      });
      const heureStr = cours.heure ? cours.heure.slice(0, 5).replace(':', 'h') : '';
      const espaceUrl = magicLink || `${process.env.NEXT_PUBLIC_APP_URL || 'https://izisolo.fr'}/p/${studioSlug}/espace`;
      magicLinkSent = !!magicLink;

      await resend.emails.send({
        from: process.env.RESEND_FROM_EMAIL || 'IziSolo <no-reply@izisolo.fr>',
        to: email,
        subject: `Réservation confirmée — ${cours.nom}`,
        html: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, sans-serif; max-width: 560px; margin: 0 auto; padding: 24px;">
            <h2 style="color: #d4a0a0; margin: 0 0 6px;">Réservation confirmée !</h2>
            <p style="color: #555; margin: 0 0 16px;">Bonjour ${prenom || nom},</p>
            <p style="color: #555; margin: 0 0 12px;">Ta place est réservée pour :</p>
            <div style="background: #faf8f5; border-radius: 12px; padding: 16px 20px; margin: 0 0 20px;">
              <strong style="font-size: 1.1rem; color: #1a1a2e;">${cours.nom}</strong><br/>
              <span style="color: #888;">📅 ${dateStr}</span><br/>
              <span style="color: #888;">🕐 ${heureStr}</span>
              ${cours.lieu ? `<br/><span style="color: #888;">📍 ${cours.lieu}</span>` : ''}
              <br/><span style="color: #888;">🏠 ${profile.studio_nom}</span>
            </div>
            <div style="text-align: center; margin: 0 0 20px;">
              <a href="${espaceUrl}" style="display: inline-block; background: #d4a0a0; color: white; text-decoration: none; padding: 12px 28px; border-radius: 10px; font-weight: 600; font-size: 0.95rem;">
                ${magicLink ? 'Accéder à mon espace' : 'Voir mon espace'}
              </a>
            </div>
            ${magicLink ? `
              <p style="color: #888; font-size: 0.8125rem; margin: 0 0 20px; text-align: center;">
                Ce lien te connecte automatiquement. Il expire dans 1 heure.
              </p>
            ` : ''}
            <div style="background: #fffaf0; border: 1px solid #ffe0b2; border-radius: 10px; padding: 12px 16px; margin: 0 0 16px; color: #7c4a03; font-size: 0.875rem;">
              <strong>Annulation flexible</strong><br/>
              Tu peux annuler depuis ton espace jusqu'à 24h avant le cours.
            </div>
            <p style="color: #aaa; font-size: 0.8rem; margin: 32px 0 0; border-top: 1px solid #eee; padding-top: 16px; text-align: center;">
              Propulsé par <a href="https://izisolo.fr" style="color: #d4a0a0;">IziSolo</a>
            </p>
          </div>
        `,
      });
    }
  } catch (emailErr) {
    console.error('email confirmation error (non-blocking):', emailErr);
    // On ne fait pas échouer la réservation si l'email plante
  }

  return Response.json({ ok: true, magicLinkSent });
}
