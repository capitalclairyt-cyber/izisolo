import { NextResponse } from 'next/server';
import { withRoute } from '@/lib/api-route';
import { createAdminClient } from '@/lib/supabase-admin';
import { libererSerieSchema } from '@/lib/validation';
import { promouvoirListeAttente } from '@/lib/promotion-liste-attente';
import { coursDejaCommence } from '@/lib/dates';
import { reportError } from '@/lib/report';

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
  // ⚠️ La colonne est recurrence_parent_id — recurrence_id (v1) n'est écrite
  // par AUCUN chemin de création : l'ancien filtre matchait 0 ligne et la
  // feature était morte en silence depuis toujours (audit 2026-07-25).
  const { data: presences } = await supabase
    .from('presences')
    .select('id, cours_id, statut_pointage, annulation_tardive, cours:cours_id!inner(id, date, heure, nom, recurrence_parent_id, capacite_max)')
    .eq('client_id', clientId)
    .eq('profile_id', profile.id)
    .eq('cours.recurrence_parent_id', recurrenceId);

  // Garde-fous (mêmes règles que les suppressions de cours) : on ne libère
  // QUE les réservations « vivantes » à venir — jamais une séance déjà
  // commencée (heure de Paris), pointée, décomptée ou annulée tardivement
  // (le décompte survivrait à la suppression, sans trace ni recrédit).
  const aLiberer = [];
  let skipped = 0;
  for (const p of (presences || [])) {
    if (!p.cours?.date || p.cours.date < depuisDate) { skipped++; continue; }
    if (coursDejaCommence(p.cours)) { skipped++; continue; }
    if (p.annulation_tardive || !['inscrit', 'confirme'].includes(p.statut_pointage || 'inscrit')) { skipped++; continue; }
    aLiberer.push(p);
  }

  if (aLiberer.length === 0) {
    return NextResponse.json({ ok: true, liberees: 0, promues: 0, skipped });
  }

  const supabaseAdmin = createAdminClient();

  // Supprimer toutes les présences à libérer
  const ids = aLiberer.map(p => p.id);
  const { error: delErr } = await supabaseAdmin
    .from('presences')
    .delete()
    .in('id', ids);

  if (delErr) {
    reportError('[liberer-serie] delete err:', delErr);
    return NextResponse.json({ error: 'Erreur lors de la libération' }, { status: 500 });
  }

  // Pour chaque place libérée, promouvoir la 1ère personne en liste d'attente.
  // notifier: true (audit 2026-07-25) — l'ancienne promotion silencieuse
  // inscrivait quelqu'un SANS le prévenir : sa première nouvelle était le
  // rappel J-1 d'une place jamais confirmée.
  let promues = 0;
  for (const p of aLiberer) {
    try {
      const promoted = await promouvoirListeAttente(supabaseAdmin, profile.id, p.cours, {
        studioSlug: profile.studio_slug || null,
        notifier: true,
      });
      if (promoted) promues++;
    } catch (e) {
      console.warn('[liberer-serie] promotion non-bloquant:', e?.message);
    }
  }

  return NextResponse.json({
    ok: true,
    liberees: aLiberer.length,
    promues,
    skipped,
  });
});
