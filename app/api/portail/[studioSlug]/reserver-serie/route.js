import { createServerClient } from '@/lib/supabase-server';
import { createAdminClient } from '@/lib/supabase-admin';
import { reserverSerieSchema } from '@/lib/validation';
import { checkRateLimitIP } from '@/lib/antibot';

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

  // Rate-limit IP : route d'écriture qui boucle sur N occurrences — on borne
  // le volume par IP (10/h), compteur isolé du reste via le scope.
  const rl = checkRateLimitIP(request, { max: 10, scope: 'reserver-serie' });
  if (!rl.ok) return Response.json({ error: rl.reason }, { status: 429 });

  let body;
  try { body = await request.json(); } catch { return Response.json({ error: 'JSON invalide' }, { status: 400 }); }
  const { coursId, jusquAu } = body || {};
  if (!coursId || !jusquAu) {
    return Response.json({ error: 'coursId et jusquAu requis' }, { status: 400 });
  }
  // Validation zod : coursId UUID + jusquAu date YYYY-MM-DD.
  // On ne renvoie pas le détail brut zod.
  if (!reserverSerieSchema.safeParse(body).success) {
    return Response.json({ error: 'Données invalides' }, { status: 400 });
  }

  // Auth requise (l'élève doit être connecté pour s'inscrire en série)
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: 'Tu dois être connecté·e' }, { status: 401 });

  const supabaseAdmin = createAdminClient();

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

    // Réservation ATOMIQUE (RPC v53) : doublon + capacité vérifiés sous
    // verrou par cours — remplace le check-insert-recheck-delete.
    const { data: resa, error: pErr } = await supabaseAdmin
      .rpc('reserver_place', {
        p_profile_id: profile.id,
        p_cours_id: c.id,
        p_client_id: client.id,
      });

    if (pErr) {
      console.error('[reserver-serie] rpc err:', pErr);
      skipped.push({ coursId: c.id, date: c.date, reason: 'Erreur' });
      continue;
    }
    if (!resa?.ok) {
      skipped.push({
        coursId: c.id,
        date: c.date,
        reason: resa?.reason === 'doublon' ? 'Déjà inscrit·e'
          : resa?.reason === 'complet' ? 'Complet'
          : resa?.reason === 'annule' ? 'Cours annulé'
          : 'Erreur',
      });
      continue;
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
