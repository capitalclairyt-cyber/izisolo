import { createServerClient } from '@/lib/supabase-server';
import { createClient as createAdminSupabase } from '@supabase/supabase-js';

/**
 * POST /api/portail/[studioSlug]/reserver-serie
 *
 * Inscrit l'élève authentifié à toutes les occurrences futures d'un cours
 * récurrent jusqu'à une date donnée.
 *
 * Body : { coursId, jusquAu (YYYY-MM-DD) }
 *
 * Retourne : { ok, booked: [...], skipped: [...] }
 *   - booked : { coursId, date, heure } pour chaque inscription créée
 *   - skipped : { coursId, date, reason } pour chaque skip
 */
export async function POST(request, { params }) {
  const { studioSlug } = await params;

  let body;
  try { body = await request.json(); } catch { return Response.json({ error: 'JSON invalide' }, { status: 400 }); }
  const { coursId, jusquAu } = body || {};
  if (!coursId || !jusquAu) {
    return Response.json({ error: 'coursId et jusquAu requis' }, { status: 400 });
  }

  // Auth requise (l'élève doit être connecté pour s'inscrire en série)
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: 'Tu dois être connecté·e' }, { status: 401 });

  const supabaseAdmin = createAdminSupabase(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  // Studio
  const { data: profile } = await supabaseAdmin
    .from('profiles').select('id, studio_nom').eq('studio_slug', studioSlug).single();
  if (!profile) return Response.json({ error: 'Studio introuvable' }, { status: 404 });

  // Client lié à cet email dans ce studio
  const { data: client } = await supabaseAdmin
    .from('clients').select('id, prenom').eq('profile_id', profile.id).ilike('email', user.email).maybeSingle();
  if (!client) return Response.json({ error: 'Client introuvable' }, { status: 404 });

  // Cours de référence
  const { data: baseCours } = await supabaseAdmin
    .from('cours')
    .select('id, recurrence_id, date, nom, heure')
    .eq('id', coursId)
    .eq('profile_id', profile.id)
    .single();
  if (!baseCours) return Response.json({ error: 'Cours introuvable' }, { status: 404 });
  if (!baseCours.recurrence_id) {
    return Response.json({ error: 'Ce cours n\'est pas récurrent' }, { status: 400 });
  }

  if (jusquAu < baseCours.date) {
    return Response.json({ error: 'La date limite doit être après le cours initial' }, { status: 400 });
  }

  // Toutes les occurrences futures (même recurrence_id, date entre base et jusquAu, non annulées)
  const { data: futureCourses } = await supabaseAdmin
    .from('cours')
    .select('id, date, heure, capacite_max, est_annule')
    .eq('recurrence_id', baseCours.recurrence_id)
    .eq('profile_id', profile.id)
    .gte('date', baseCours.date)
    .lte('date', jusquAu)
    .order('date', { ascending: true });

  const booked = [];
  const skipped = [];

  for (const c of futureCourses || []) {
    if (c.est_annule) {
      skipped.push({ coursId: c.id, date: c.date, reason: 'Cours annulé' });
      continue;
    }

    // Doublon
    const { data: existing } = await supabaseAdmin
      .from('presences')
      .select('id')
      .eq('cours_id', c.id)
      .eq('client_id', client.id)
      .maybeSingle();
    if (existing) {
      skipped.push({ coursId: c.id, date: c.date, reason: 'Déjà inscrit·e' });
      continue;
    }

    // Capacité
    if (c.capacite_max) {
      const { count } = await supabaseAdmin
        .from('presences')
        .select('id', { count: 'exact', head: true })
        .eq('cours_id', c.id);
      if ((count || 0) >= c.capacite_max) {
        skipped.push({ coursId: c.id, date: c.date, reason: 'Complet' });
        continue;
      }
    }

    // Création presence
    const { data: newP, error: pErr } = await supabaseAdmin
      .from('presences')
      .insert({
        cours_id: c.id,
        client_id: client.id,
        profile_id: profile.id,
      })
      .select('id')
      .single();

    if (pErr) {
      console.error('[reserver-serie] insert err:', pErr);
      skipped.push({ coursId: c.id, date: c.date, reason: 'Erreur' });
      continue;
    }

    // Re-check capacité après insertion (rollback si dépassement)
    if (c.capacite_max) {
      const { count: apres } = await supabaseAdmin
        .from('presences')
        .select('id', { count: 'exact', head: true })
        .eq('cours_id', c.id);
      if ((apres || 0) > c.capacite_max) {
        await supabaseAdmin.from('presences').delete().eq('id', newP.id);
        skipped.push({ coursId: c.id, date: c.date, reason: 'Complet' });
        continue;
      }
    }

    booked.push({ coursId: c.id, date: c.date, heure: c.heure });
  }

  return Response.json({
    ok: true,
    totalBooked: booked.length,
    totalSkipped: skipped.length,
    booked,
    skipped,
  });
}
