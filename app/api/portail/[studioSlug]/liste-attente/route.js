import { createClient as createAdminSupabase } from '@supabase/supabase-js';
import { listeAttenteSchema } from '@/lib/validation';
import { checkAntiBot, ipFromRequest } from '@/lib/antibot';

export async function POST(request, { params }) {
  const { studioSlug } = await params;
  // Body brut lu une seule fois : website/turnstileToken sont hors schéma zod.
  const rawBody = await request.json().catch(() => null);
  if (!rawBody) return Response.json({ error: 'Body JSON invalide' }, { status: 400 });

  // Anti-bot : honeypot + rate limit + Turnstile — même pipeline que /reserver.
  // Route publique qui insère nom/email/tel arbitraires → borne anti-spam.
  const antibot = await checkAntiBot(request, {
    honeypot: rawBody.website,
    turnstileToken: rawBody.turnstileToken,
    max: 10,
    scope: 'liste-attente',
  });
  if (!antibot.ok) {
    console.warn('[liste-attente] antibot rejected:', antibot.code, 'ip=', ipFromRequest(request));
    return Response.json({ error: antibot.reason }, { status: antibot.code === 'RATE_LIMITED' ? 429 : 400 });
  }

  const parsed = listeAttenteSchema.safeParse(rawBody);
  if (!parsed.success) return Response.json({ error: 'Données invalides' }, { status: 400 });
  const { coursId, nom, email, tel } = parsed.data;

  const supabaseAdmin = createAdminSupabase(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  // Vérifier studio + cours
  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('id, studio_nom')
    .eq('studio_slug', studioSlug)
    .single();
  if (!profile) return Response.json({ error: 'Studio introuvable' }, { status: 404 });

  const { data: cours } = await supabaseAdmin
    .from('cours')
    .select('id, nom, date, capacite_max, est_annule, profile_id')
    .eq('id', coursId)
    .eq('profile_id', profile.id)
    .single();
  if (!cours) return Response.json({ error: 'Cours introuvable' }, { status: 404 });
  if (cours.est_annule) return Response.json({ error: 'Ce cours est annulé' }, { status: 400 });

  const today = new Date().toISOString().slice(0, 10);
  if (cours.date < today) return Response.json({ error: 'Ce cours est passé' }, { status: 400 });

  // Vérifier que le cours est BIEN complet (sécurité : pas la peine d'inscrire en LA si une place est libre)
  if (!cours.capacite_max) {
    return Response.json({ error: 'Ce cours n\'a pas de capacité limitée' }, { status: 400 });
  }
  const { count: nbInscrits } = await supabaseAdmin
    .from('presences')
    .select('id', { count: 'exact', head: true })
    .eq('cours_id', coursId);
  if ((nbInscrits || 0) < cours.capacite_max) {
    return Response.json({ error: 'Ce cours a encore des places — réserve directement.' }, { status: 400 });
  }

  // Lier au client si email connu dans ce studio
  const { data: existingClient } = await supabaseAdmin
    .from('clients')
    .select('id')
    .eq('profile_id', profile.id)
    .ilike('email', email)
    .maybeSingle();

  // Bloquer si l'élève est déjà inscrit (presence) à ce cours
  if (existingClient?.id) {
    const { data: dejaInscrit } = await supabaseAdmin
      .from('presences')
      .select('id')
      .eq('cours_id', coursId)
      .eq('client_id', existingClient.id)
      .maybeSingle();
    if (dejaInscrit) {
      return Response.json({ error: 'Tu es déjà inscrit·e à ce cours — pas besoin de la liste d\'attente.' }, { status: 409 });
    }
  }

  // Calculer position (taille actuelle + 1)
  const { count: tailleListe } = await supabaseAdmin
    .from('liste_attente')
    .select('id', { count: 'exact', head: true })
    .eq('cours_id', coursId);
  const position = (tailleListe || 0) + 1;

  // Upsert (unique sur cours_id + email)
  const { data: row, error: insertErr } = await supabaseAdmin
    .from('liste_attente')
    .upsert({
      profile_id: profile.id,
      cours_id: coursId,
      client_id: existingClient?.id || null,
      email,
      nom,
      telephone: tel || null,
      position,
    }, { onConflict: 'cours_id,email' })
    .select('id, position')
    .single();

  if (insertErr) {
    console.error('liste-attente insert error:', insertErr);
    return Response.json({ error: 'Erreur lors de l\'inscription' }, { status: 500 });
  }

  return Response.json({
    ok: true,
    position: row?.position || position,
  });
}
