import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api-auth';
import { createClient as createAdminSupabase } from '@supabase/supabase-js';
import { libererSerieSchema } from '@/lib/validation';

/**
 * POST /api/presences/liberer-serie
 *
 * Libère toutes les présences futures d'un·e élève sur un cours récurrent.
 *
 * Body : { clientId, recurrenceId, depuisDate? (YYYY-MM-DD, défaut = aujourd'hui) }
 *
 * Retourne : { ok, liberees, promues, skipped }
 *   - liberees : nombre de presences supprimées
 *   - promues : nombre de places données à des personnes en liste d'attente
 *   - skipped : nombre de présences déjà passées (non touchées)
 *
 * Utilité : un·e élève ne vient plus → libérer toutes ses réservations
 * récurrentes futures d'un coup au lieu d'annuler une par une.
 */
export async function POST(request) {
  let profile, supabase;
  try {
    ({ profile, supabase } = await requireAuth());
  } catch (res) { return res; }

  let body;
  try { body = await request.json(); } catch { return NextResponse.json({ error: 'JSON invalide' }, { status: 400 }); }

  const { clientId, recurrenceId } = body || {};
  if (!clientId || !recurrenceId) {
    return NextResponse.json({ error: 'clientId et recurrenceId requis' }, { status: 400 });
  }

  // Validation zod (UUID) — on ne renvoie pas le détail brut zod.
  const parsed = libererSerieSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Données invalides' }, { status: 400 });
  }
  const depuisDate = parsed.data.depuisDate || new Date().toISOString().slice(0, 10);

  // Vérifier que le client appartient bien à ce prof
  const { data: client } = await supabase
    .from('clients')
    .select('id')
    .eq('id', clientId)
    .eq('profile_id', profile.id)
    .single();
  if (!client) return NextResponse.json({ error: 'Client introuvable' }, { status: 404 });

  // Récupérer toutes les présences futures de ce client sur cette récurrence.
  // Le filtre recurrence_id est appliqué côté SQL (jointure interne sur cours)
  // pour éviter tout match accidentel — pas seulement en JS post-fetch.
  const { data: presences } = await supabase
    .from('presences')
    .select('id, cours_id, cours:cours_id!inner(id, date, heure, nom, recurrence_id, capacite_max)')
    .eq('client_id', clientId)
    .eq('profile_id', profile.id)
    .eq('cours.recurrence_id', recurrenceId);

  const aLiberer = (presences || []).filter(p => p.cours?.date >= depuisDate);

  if (aLiberer.length === 0) {
    return NextResponse.json({ ok: true, liberees: 0, promues: 0, skipped: 0 });
  }

  const supabaseAdmin = createAdminSupabase(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  // Supprimer toutes les présences à libérer
  const ids = aLiberer.map(p => p.id);
  const { error: delErr } = await supabaseAdmin
    .from('presences')
    .delete()
    .in('id', ids);

  if (delErr) {
    console.error('[liberer-serie] delete err:', delErr);
    return NextResponse.json({ error: 'Erreur lors de la libération' }, { status: 500 });
  }

  // Pour chaque place libérée, tenter de promouvoir la 1ère personne en liste d'attente
  let promues = 0;
  for (const p of aLiberer) {
    try {
      const promoted = await promouvoirListeAttente(supabaseAdmin, profile.id, p.cours);
      if (promoted) promues++;
    } catch (e) {
      console.warn('[liberer-serie] promotion non-bloquant:', e?.message);
    }
  }

  return NextResponse.json({
    ok: true,
    liberees: aLiberer.length,
    promues,
    skipped: 0,
  });
}

// ─── Promotion automatique de la liste d'attente (copié de annuler/route.js) ──
async function promouvoirListeAttente(supabaseAdmin, profileId, cours) {
  if (!cours?.id) return false;

  const { data: nextRow } = await supabaseAdmin
    .from('liste_attente')
    .select('id, email, nom, telephone, client_id')
    .eq('cours_id', cours.id)
    .eq('profile_id', profileId)
    .is('notified_at', null)
    .order('position', { ascending: true })
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle();

  if (!nextRow) return false;

  let clientId = nextRow.client_id;
  if (!clientId) {
    const { data: existingClient } = await supabaseAdmin
      .from('clients')
      .select('id')
      .eq('profile_id', profileId)
      .ilike('email', nextRow.email)
      .maybeSingle();
    if (existingClient) {
      clientId = existingClient.id;
    } else {
      const nomParts = (nextRow.nom || '').split(' ');
      const prenom = nomParts[0] || nextRow.email.split('@')[0];
      const clientNom = nomParts.slice(1).join(' ') || '';
      const { data: newClient } = await supabaseAdmin
        .from('clients')
        .insert({
          profile_id: profileId,
          prenom,
          nom: clientNom,
          email: nextRow.email,
          telephone: nextRow.telephone || null,
        })
        .select('id')
        .single();
      clientId = newClient?.id;
    }
  }
  if (!clientId) return false;

  const { error: presErr } = await supabaseAdmin
    .from('presences')
    .insert({
      cours_id: cours.id,
      client_id: clientId,
      profile_id: profileId,
      present: false,
      source: 'liste_attente',
    });
  if (presErr) {
    console.error('[liberer-serie] create presence error:', presErr);
    return false;
  }

  await supabaseAdmin
    .from('liste_attente')
    .update({ notified_at: new Date().toISOString() })
    .eq('id', nextRow.id);

  // Note : email de notification omis ici pour la promotion en masse — on
  // pourrait l'ajouter en option si besoin.
  return true;
}
