/**
 * POST /api/cas-a-traiter/[id]/undo
 *
 * Annule la résolution d'un cas dans la fenêtre de 7 jours.
 *
 * Comportement :
 *   • Vérifie que le cas est résolu et que resolu_at < 7 jours.
 *   • Pour les cas en mode "direct" avec un before_state : restaure l'état
 *     antérieur (statut présence, seances_utilisees, date_fin abonnement, etc.)
 *   • Pour les cas en mode "deja_fait" ou "a_faire" : on rouvre juste le cas
 *     SANS toucher aux ressources externes (paiement / abonnement créés
 *     restent en place — la prof devra les supprimer manuellement si besoin).
 *   • Reset resolu_at, resolu_action, resolu_notes, resolu_meta, resolu_par.
 *
 * Réponse :
 *   { ok: true, cas: {...}, ressource_warning?: string }
 */

import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api-auth';

const UNDO_WINDOW_DAYS = 7;

export async function POST(request, { params }) {
  let auth;
  try {
    auth = await requireAuth();
  } catch (res) {
    return res;
  }
  const { user, supabase } = auth;
  const { id } = await params;

  // Charger le cas
  const { data: cas, error: fetchErr } = await supabase
    .from('cas_a_traiter')
    .select('*')
    .eq('id', id)
    .eq('profile_id', user.id)
    .single();

  if (fetchErr || !cas) {
    return NextResponse.json({ error: 'Cas introuvable' }, { status: 404 });
  }

  if (!cas.resolu_at) {
    return NextResponse.json(
      { error: 'Ce cas n\'est pas résolu, rien à annuler' },
      { status: 409 }
    );
  }

  // Vérifier la fenêtre de 7 jours
  const resoluAt = new Date(cas.resolu_at);
  const ageMs = Date.now() - resoluAt.getTime();
  const ageDays = ageMs / (1000 * 60 * 60 * 24);
  if (ageDays > UNDO_WINDOW_DAYS) {
    return NextResponse.json(
      {
        error: `Ce cas a été résolu il y a ${Math.floor(ageDays)} jours. ` +
          `Au-delà de ${UNDO_WINDOW_DAYS} jours, l'annulation n'est plus possible (sécurité comptable).`
      },
      { status: 403 }
    );
  }

  const meta = cas.resolu_meta || {};
  let ressourceWarning = null;

  // Restauration de l'état antérieur pour mode "direct"
  if (meta.mode === 'direct' && meta.before_state) {
    const restoreErr = await restoreBeforeState({ supabase, cas, before: meta.before_state, action: cas.resolu_action });
    if (restoreErr) {
      return NextResponse.json(
        { error: `Annulation impossible : ${restoreErr}` },
        { status: 500 }
      );
    }
  }

  // Pour mode "deja_fait" ou "a_faire" : warning si une ressource externe
  // (paiement, abonnement) avait été liée — la prof doit la gérer manuellement
  if ((meta.mode === 'deja_fait' || meta.mode === 'a_faire') && meta.ressource_id) {
    const ressLabel = meta.ressource_type === 'paiement' ? 'paiement'
                    : meta.ressource_type === 'abonnement' ? 'carnet/abonnement'
                    : 'ressource';
    ressourceWarning = `Le ${ressLabel} créé n'a PAS été supprimé. Va dans la page concernée pour le retirer si nécessaire.`;
  }

  // Reset le cas en "ouvert"
  const { data: updated, error: updErr } = await supabase
    .from('cas_a_traiter')
    .update({
      resolu_at: null,
      resolu_action: null,
      resolu_notes: null,
      resolu_meta: null,
      resolu_par: null,
    })
    .eq('id', id)
    .eq('profile_id', user.id)
    .select('*, clients(prenom, nom), cours(nom, date)')
    .single();

  if (updErr) {
    return NextResponse.json({ error: updErr.message }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    cas: updated,
    ...(ressourceWarning && { ressource_warning: ressourceWarning }),
  });
}

/* ════════════════════════════════════════════════════════════════════════
 * Helpers
 * ════════════════════════════════════════════════════════════════════════ */

/**
 * Restaure l'état antérieur d'une ressource modifiée par une action directe.
 * Renvoie null si OK, ou un message d'erreur.
 */
async function restoreBeforeState({ supabase, cas, before, action }) {
  // Présence : restaurer le statut (et décrément seances_utilisees si on
  // avait incrémenté lors du décompte)
  if (before.presence_id) {
    const { error } = await supabase
      .from('presences')
      .update({
        ...(before.statut !== undefined && { statut: before.statut }),
        ...(before.cours_id !== undefined && { cours_id: before.cours_id }),
      })
      .eq('id', before.presence_id);
    if (error) return error.message;

    // Si l'action était "decompte" et qu'on avait incrémenté seances_utilisees,
    // on décrémente pour rétablir.
    if (action === 'decompte') {
      const { data: presence } = await supabase
        .from('presences')
        .select('abonnement_id')
        .eq('id', before.presence_id)
        .single();
      if (presence?.abonnement_id) {
        const { data: abo } = await supabase
          .from('abonnements')
          .select('seances_utilisees')
          .eq('id', presence.abonnement_id)
          .single();
        if (abo) {
          await supabase
            .from('abonnements')
            .update({ seances_utilisees: Math.max(0, (abo.seances_utilisees || 1) - 1) })
            .eq('id', presence.abonnement_id);
        }
      }
    }
    return null;
  }

  // Abonnement : restaurer date_fin OU seances_utilisees
  if (before.abonnement_id) {
    const update = {};
    if (before.date_fin !== undefined) update.date_fin = before.date_fin;
    if (before.seances_utilisees !== undefined) update.seances_utilisees = before.seances_utilisees;
    if (Object.keys(update).length > 0) {
      const { error } = await supabase
        .from('abonnements')
        .update(update)
        .eq('id', before.abonnement_id);
      if (error) return error.message;
    }
    return null;
  }

  return null; // pas de before_state à restaurer (ex: action ignore/offert)
}
