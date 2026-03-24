import { createServerClient } from '@/lib/supabase-server';
import { createClient as createAdminSupabase } from '@supabase/supabase-js';

function slugify(str) {
  return str.toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim().replace(/\s+/g, '-');
}

export async function POST(request, { params }) {
  const { studioSlug } = await params;
  const { coursId, nom, email, tel } = await request.json();

  if (!coursId || !nom?.trim() || !email?.trim()) {
    return Response.json({ error: 'Données manquantes' }, { status: 400 });
  }

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
  const { data: existingClient } = await supabaseAdmin
    .from('clients')
    .select('id')
    .eq('profile_id', profile.id)
    .ilike('email', email.trim())
    .single();

  if (existingClient) {
    clientId = existingClient.id;
  } else {
    // Créer le client
    const nomParts = nom.trim().split(' ');
    const prenom = nomParts[0];
    const clientNom = nomParts.slice(1).join(' ') || '';
    const { data: newClient, error: clientErr } = await supabaseAdmin
      .from('clients')
      .insert({
        profile_id: profile.id,
        prenom,
        nom: clientNom,
        email: email.trim(),
        telephone: tel?.trim() || null,
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
  const { error: presenceErr } = await supabaseAdmin
    .from('presences')
    .insert({
      cours_id: coursId,
      client_id: clientId,
      profile_id: profile.id,
      present: false,
      source: 'portail',
    });

  if (presenceErr) {
    console.error('create presence error:', presenceErr);
    return Response.json({ error: 'Erreur lors de la réservation' }, { status: 500 });
  }

  // Envoyer email de confirmation (si Resend configuré)
  try {
    if (process.env.RESEND_API_KEY) {
      const { Resend } = await import('resend');
      const resend = new Resend(process.env.RESEND_API_KEY);
      const dateStr = new Date(cours.date + 'T12:00:00').toLocaleDateString('fr-FR', {
        weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
      });
      const heureStr = cours.heure ? cours.heure.slice(0, 5).replace(':', 'h') : '';
      await resend.emails.send({
        from: process.env.RESEND_FROM_EMAIL || 'IziSolo <no-reply@izisolo.app>',
        to: email.trim(),
        subject: `✅ Réservation confirmée — ${cours.nom}`,
        html: `
          <div style="font-family: sans-serif; max-width: 560px; margin: 0 auto; padding: 24px;">
            <h2 style="color: #d4a0a0; margin-bottom: 4px;">Réservation confirmée !</h2>
            <p style="color: #555;">Bonjour ${prenom || nom},</p>
            <p style="color: #555;">Ta place est réservée pour :</p>
            <div style="background: #faf8f5; border-radius: 12px; padding: 16px 20px; margin: 16px 0;">
              <strong style="font-size: 1.1rem; color: #1a1a2e;">${cours.nom}</strong><br/>
              <span style="color: #888;">📅 ${dateStr}</span><br/>
              <span style="color: #888;">🕐 ${heureStr}</span><br/>
              ${cours.lieu ? `<span style="color: #888;">📍 ${cours.lieu}</span><br/>` : ''}
              <span style="color: #888;">🏠 ${profile.studio_nom}</span>
            </div>
            <p style="color: #888; font-size: 0.875rem;">
              Si tu ne peux plus venir, merci de nous prévenir dès que possible.
            </p>
            <p style="color: #aaa; font-size: 0.8rem; margin-top: 32px; border-top: 1px solid #eee; padding-top: 16px;">
              Propulsé par <a href="https://izisolo.app" style="color: #d4a0a0;">IziSolo</a>
            </p>
          </div>
        `,
      });
    }
  } catch (emailErr) {
    console.error('email confirmation error (non-blocking):', emailErr);
    // On ne fait pas échouer la réservation si l'email plante
  }

  return Response.json({ ok: true });
}
