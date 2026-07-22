import { NextResponse } from 'next/server';
import { withRoute } from '@/lib/api-route';
import { createAdminClient } from '@/lib/supabase-admin';
import { libererSerieSchema } from '@/lib/validation';
import { promouvoirListeAttente } from '@/lib/promotion-liste-attente';

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
export const POST = withRoute({ auth: 'active' }, async ({ request, auth }) => {
  const { profile, supabase } = auth;

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

  const supabaseAdmin = createAdminClient();

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
      const promoted = await promouvoirListeAttente(supabaseAdmin, profile.id, p.cours, { notifier: false });
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
});
