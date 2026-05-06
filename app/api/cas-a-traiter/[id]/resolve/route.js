/**
 * POST /api/cas-a-traiter/[id]/resolve
 *
 * Résout un cas. 3 modes possibles :
 *   • "deja_fait"  : la prof a déjà fait l'action externe (saisi un paiement,
 *                    créé un carnet, etc.) → on enregistre juste le résultat
 *                    avec optionnellement la ressource_id liée.
 *   • "a_faire"    : la prof veut créer la ressource maintenant. On marque le
 *                    cas comme "résolu en attente" et on retourne un
 *                    redirect_to vers le formulaire pré-rempli.
 *   • "direct"     : action immédiate (crédit restitué, carnet prolongé,
 *                    excuse, décompte, etc.) — pas de ressource externe à
 *                    créer, on applique l'effet métier en DB et on ferme.
 *
 * Body attendu :
 *   {
 *     action: string,           // ex: "carnet_vendu", "decompte", etc.
 *     mode: "deja_fait" | "a_faire" | "direct",
 *     notes?: string,           // note libre saisie par la prof
 *     ressource_id?: string,    // si mode === "deja_fait", ID de la ressource déjà créée
 *     ressource_type?: string,  // "paiement" | "abonnement" | "presence"
 *   }
 *
 * Réponse :
 *   { ok: true, cas: {...}, redirect_to?: string }
 */

import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAuth } from '@/lib/api-auth';

const ResolveBodySchema = z.object({
  action: z.string().min(1).max(50),
  mode: z.enum(['deja_fait', 'a_faire', 'direct']),
  notes: z.string().max(2000).optional().nullable(),
  ressource_id: z.string().uuid().optional().nullable(),
  ressource_type: z.enum(['paiement', 'abonnement', 'presence']).optional().nullable(),
});

export async function POST(request, { params }) {
  let auth;
  try {
    auth = await requireAuth();
  } catch (res) {
    return res;
  }
  const { user, supabase } = auth;
  const { id } = await params;

  // Validation body
  let body;
  try {
    body = ResolveBodySchema.parse(await request.json());
  } catch (err) {
    return NextResponse.json(
      { error: 'Body invalide', details: err.issues || err.message },
      { status: 400 }
    );
  }

  // Charger le cas pour avoir le contexte (case_type, client_id, cours_id)
  const { data: cas, error: fetchErr } = await supabase
    .from('cas_a_traiter')
    .select('*, clients(prenom, nom, id), cours(nom, date, id)')
    .eq('id', id)
    .eq('profile_id', user.id)
    .single();

  if (fetchErr || !cas) {
    return NextResponse.json(
      { error: 'Cas introuvable' },
      { status: 404 }
    );
  }

  if (cas.resolu_at) {
    return NextResponse.json(
      { error: 'Cas déjà résolu' },
      { status: 409 }
    );
  }

  // ─── Mode "a_faire" : on calcule l'URL du formulaire et on retourne ──────
  // (la résolution finale se fera quand le formulaire sera submitté avec
  // ?cas_id=... dans l'URL ; cf. /revenus/nouveau et /abonnements/nouveau)
  if (body.mode === 'a_faire') {
    const redirect = computeRedirect(cas, body.action);
    if (!redirect) {
      return NextResponse.json(
        { error: `Pas de redirect défini pour action="${body.action}" en mode "a_faire"` },
        { status: 400 }
      );
    }
    // On NE résout PAS le cas ici : il restera ouvert tant que le formulaire
    // n'a pas été validé. La prof voit toujours le cas "ouvert" en attendant.
    return NextResponse.json({
      ok: true,
      mode: 'a_faire',
      redirect_to: redirect,
      cas,
    });
  }

  // ─── Mode "direct" : appliquer l'effet métier puis résoudre ──────────────
  let beforeState = null;
  let metaRessource = null;

  if (body.mode === 'direct') {
    const result = await applyDirectEffect({ supabase, cas, action: body.action, userId: user.id });
    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: result.status || 400 });
    }
    beforeState = result.beforeState;
    metaRessource = result.ressource || null;
  }

  // ─── Mode "deja_fait" ou "direct" → on UPDATE le cas pour le résoudre ────
  const resolu_meta = {
    mode: body.mode,
    ressource_type: body.ressource_type || metaRessource?.type || null,
    ressource_id:   body.ressource_id   || metaRessource?.id   || null,
    before_state:   beforeState, // null pour deja_fait
  };

  const { data: updated, error: updErr } = await supabase
    .from('cas_a_traiter')
    .update({
      resolu_at: new Date().toISOString(),
      resolu_action: body.action,
      resolu_notes: body.notes || null,
      resolu_meta,
      resolu_par: user.id,
    })
    .eq('id', id)
    .eq('profile_id', user.id)
    .select('*, clients(prenom, nom), cours(nom, date)')
    .single();

  if (updErr) {
    return NextResponse.json({ error: updErr.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, mode: body.mode, cas: updated });
}

/* ════════════════════════════════════════════════════════════════════════
 * Helpers
 * ════════════════════════════════════════════════════════════════════════ */

/**
 * Pour le mode "a_faire", calcule l'URL où envoyer la prof selon le type
 * de cas + l'action choisie. La query string contient `cas_id` et `cas_action`
 * pour que le formulaire puisse, au submit, appeler /resolve avec le
 * ressource_id créé.
 */
function computeRedirect(cas, action) {
  const clientId = cas.client_id;
  const coursId  = cas.cours_id;
  const params   = new URLSearchParams();
  if (clientId) params.set('client_id', clientId);
  if (coursId)  params.set('cours_id', coursId);
  params.set('cas_id', cas.id);
  params.set('cas_action', action);

  // Actions qui créent un paiement
  const paiementActions = ['encaisse', 'unitaire', 'paye_stripe', 'paye_place', 'rembourse'];
  if (paiementActions.includes(action)) {
    return `/revenus/nouveau?${params.toString()}`;
  }

  // Actions qui créent un abonnement → fiche client (où vit la modale d'ajout)
  // NB : pour l'instant pas d'auto-résolution au retour. La prof reviendra
  // manuellement sur la page Cas à traiter et choisira "Déjà fait" en
  // sélectionnant le nouvel abonnement dans le dropdown. Évolution future :
  // intégrer l'auto-resolve dans la modale d'ajout abonnement de FicheClient.
  const abonnementActions = ['carnet_vendu', 'nouveau_carnet'];
  if (abonnementActions.includes(action)) {
    return clientId ? `/clients/${clientId}` : null;
  }

  return null; // pas de redirect → l'API renverra une erreur
}

/**
 * Pour le mode "direct" : applique l'effet métier en DB et retourne le
 * before_state pour permettre l'undo.
 *
 * Actions supportées :
 *   - decompte / excuse           : update presences.statut
 *   - credit_rendu                : abonnement.seances_utilisees -= 1
 *   - prolonge                    : abonnement.date_fin = cours.date
 *   - reporte                     : presence.cours_id = nouveau cours (à passer en context)
 *   - annule                      : presence.statut = 'annule'
 *   - place_donnee / declinee     : presence.statut = 'confirme' | 'declinee'
 *   - dette_creee                 : marque l'élève (pas d'effet DB pour l'instant)
 *   - offert / ignore             : juste résoudre (pas d'effet DB)
 */
async function applyDirectEffect({ supabase, cas, action, userId }) {
  // ── Aucun effet DB nécessaire ──────────────────────────────────────────
  if (['offert', 'ignore', 'dette_creee'].includes(action)) {
    return { beforeState: null, ressource: null };
  }

  // ── Décompte / Excuse / Annulé / Place donnée/déclinée → presence.statut
  if (['decompte', 'excuse', 'annule', 'place_donnee', 'declinee'].includes(action)) {
    if (!cas.presence_id) {
      return { error: `Pas de présence liée au cas, action "${action}" impossible`, status: 400 };
    }
    const { data: presence, error: pErr } = await supabase
      .from('presences')
      .select('id, statut, abonnement_id')
      .eq('id', cas.presence_id)
      .single();
    if (pErr || !presence) {
      return { error: 'Présence introuvable', status: 404 };
    }
    const before = { statut: presence.statut };

    const newStatut = (
      action === 'decompte' ? 'absent_compte'
      : action === 'excuse' ? 'excuse'
      : action === 'annule' ? 'annule'
      : action === 'place_donnee' ? 'confirme'
      : action === 'declinee' ? 'declinee'
      : presence.statut
    );

    const { error: updErr } = await supabase
      .from('presences')
      .update({ statut: newStatut })
      .eq('id', cas.presence_id);
    if (updErr) return { error: updErr.message, status: 500 };

    // Si décompte ET abonnement lié → incrément seances_utilisees (idempotent
    // via comparaison statut avant/après)
    if (action === 'decompte' && presence.abonnement_id && before.statut !== 'absent_compte') {
      await supabase.rpc('incr_seances_utilisees', { p_abo_id: presence.abonnement_id }).catch(() => {});
    }

    return {
      beforeState: { presence_id: cas.presence_id, ...before },
      ressource: { type: 'presence', id: cas.presence_id },
    };
  }

  // ── Crédit restitué : décrémenter seances_utilisees ────────────────────
  if (action === 'credit_rendu') {
    // Trouver l'abonnement le plus récent du client lié au cours
    const aboId = cas.context?.abonnement_id;
    if (!aboId) {
      return { error: 'Pas d\'abonnement_id en contexte pour credit_rendu', status: 400 };
    }
    const { data: abo, error: aErr } = await supabase
      .from('abonnements')
      .select('id, seances_utilisees')
      .eq('id', aboId)
      .single();
    if (aErr || !abo) return { error: 'Abonnement introuvable', status: 404 };

    const before = { seances_utilisees: abo.seances_utilisees };
    const { error: updErr } = await supabase
      .from('abonnements')
      .update({ seances_utilisees: Math.max(0, (abo.seances_utilisees || 0) - 1) })
      .eq('id', aboId);
    if (updErr) return { error: updErr.message, status: 500 };

    return {
      beforeState: { abonnement_id: aboId, ...before },
      ressource: { type: 'abonnement', id: aboId },
    };
  }

  // ── Carnet prolongé : update date_fin ──────────────────────────────────
  if (action === 'prolonge') {
    const aboId = cas.context?.abonnement_id;
    const newDateFin = cas.cours?.date || cas.context?.cours_date;
    if (!aboId || !newDateFin) {
      return { error: 'Manque abonnement_id ou date du cours', status: 400 };
    }
    const { data: abo, error: aErr } = await supabase
      .from('abonnements')
      .select('id, date_fin')
      .eq('id', aboId)
      .single();
    if (aErr || !abo) return { error: 'Abonnement introuvable', status: 404 };

    const before = { date_fin: abo.date_fin };
    const { error: updErr } = await supabase
      .from('abonnements')
      .update({ date_fin: newDateFin })
      .eq('id', aboId);
    if (updErr) return { error: updErr.message, status: 500 };

    return {
      beforeState: { abonnement_id: aboId, ...before },
      ressource: { type: 'abonnement', id: aboId },
    };
  }

  // ── Reporté sur autre cours : update presence.cours_id ─────────────────
  if (action === 'reporte') {
    const newCoursId = cas.context?.nouveau_cours_id;
    if (!cas.presence_id || !newCoursId) {
      return { error: 'Manque presence_id ou nouveau_cours_id', status: 400 };
    }
    const { data: presence, error: pErr } = await supabase
      .from('presences')
      .select('id, cours_id')
      .eq('id', cas.presence_id)
      .single();
    if (pErr || !presence) return { error: 'Présence introuvable', status: 404 };

    const before = { cours_id: presence.cours_id };
    const { error: updErr } = await supabase
      .from('presences')
      .update({ cours_id: newCoursId })
      .eq('id', cas.presence_id);
    if (updErr) return { error: updErr.message, status: 500 };

    return {
      beforeState: { presence_id: cas.presence_id, ...before },
      ressource: { type: 'presence', id: cas.presence_id },
    };
  }

  return { error: `Action "${action}" non supportée en mode direct`, status: 400 };
}
