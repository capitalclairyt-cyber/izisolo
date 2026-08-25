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
// auth:'active' : écriture métier → bloquée si compte gelé (402)
import { withRoute } from '@/lib/api-route';
import { resoudreCarnetApplicable } from '@/lib/carnet-resolution';
import { reportError } from '@/lib/report';

const ResolveBodySchema = z.object({
  action: z.string().min(1).max(50),
  mode: z.enum(['deja_fait', 'a_faire', 'direct']),
  notes: z.string().max(2000).optional().nullable(),
  ressource_id: z.string().uuid().optional().nullable(),
  ressource_type: z.enum(['paiement', 'abonnement', 'presence']).optional().nullable(),
});

export const POST = withRoute({ auth: 'active', perm: 'eleves_gerer' }, async ({ request, params, auth }) => {
  const { studioId, user, supabase } = auth;
  const { id } = params;

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
    .select('*, clients(prenom, nom, id), cours(nom, date, id, type_cours, tarif_unitaire, carnets_acceptes)')
    .eq('id', id)
    .eq('profile_id', studioId)
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
    .eq('profile_id', studioId)
    .select('*, clients(prenom, nom), cours(nom, date)')
    .single();

  if (updErr) {
    reportError('[cas-a-traiter resolve] update err:', updErr);
    return NextResponse.json({ error: 'Une erreur est survenue.' }, { status: 500 });
  }

  return NextResponse.json({ ok: true, mode: body.mode, cas: updated });
});

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
  if (['offert', 'ignore'].includes(action)) {
    return { beforeState: null, ressource: null };
  }

  // ── Dette créée : rendre la dette VISIBLE (audit 2026-07-25) ───────────
  // Avant : aucun effet DB → la « dette » n'existait nulle part (ni Revenus
  // ni espace élève). Désormais : est_due sur la présence si elle existe
  // (c'est ce que lisent « À percevoir » et « À régler »).
  if (action === 'dette_creee') {
    if (!cas.presence_id) return { beforeState: null, ressource: null }; // présence supprimée : le cas résolu reste la seule trace
    const { data: presence } = await supabase
      .from('presences')
      .select('id, est_due, motif_due')
      .eq('id', cas.presence_id)
      .maybeSingle();
    if (!presence) return { beforeState: null, ressource: null };
    const before = { presence_id: cas.presence_id, est_due: presence.est_due, motif_due: presence.motif_due };
    const { error: updErr } = await supabase
      .from('presences')
      .update({ est_due: true, motif_due: presence.motif_due || 'Dette actée par la prof (cas résolu)' })
      .eq('id', cas.presence_id);
    if (updErr) { reportError('[cas resolve dette_creee]', updErr); return { error: 'Une erreur est survenue.', status: 500 }; }
    return { beforeState: before, ressource: { type: 'presence', id: cas.presence_id } };
  }

  // ── Décompte / Excuse / Annulé / Place donnée/déclinée → presence.statut
  if (['decompte', 'excuse', 'annule', 'place_donnee', 'declinee'].includes(action)) {
    if (!cas.presence_id) {
      return { error: `Pas de présence liée au cas, action "${action}" impossible`, status: 400 };
    }
    // NB : la colonne s'appelle statut_pointage (PAS statut — colonne
    // inexistante que l'ancien code sélectionnait → 404 systématique).
    const { data: presence, error: pErr } = await supabase
      .from('presences')
      .select('id, statut_pointage, abonnement_id, est_due, annulation_tardive, motif_due')
      .eq('id', cas.presence_id)
      .single();
    if (pErr || !presence) {
      return { error: 'Présence introuvable', status: 404 };
    }
    const before = { statut: presence.statut_pointage };

    // ── Décompte RÉEL, une seule fois (fix audit 2026-07-25) ─────────────
    // AVANT le changement de statut, pour qu'un échec laisse tout intact.
    //   1) Jamais deux fois : si le pointage a DÉJÀ décompté (no-show strict →
    //      context.seance_decomptee, ou statut déjà absent_compte), on ne
    //      retouche pas le carnet (l'ancien code re-décomptait → 2 séances
    //      pour 1 absence, l'undo n'en rendait qu'une).
    //   2) Toujours une fois : une résa portail n'est jamais liée à un carnet
    //      → l'ancien garde `presence.abonnement_id` sautait le décompte EN
    //      SILENCE (statut « décompté », carnet intact). On résout désormais
    //      le carnet applicable, comme le pointage (v64) et l'annulation
    //      tardive.
    let decompteApplique = false;
    let aboDecompte = presence.abonnement_id || null;
    if (action === 'decompte') {
      const dejaDecomptee = !!cas.context?.seance_decomptee || before.statut === 'absent_compte';
      if (!dejaDecomptee) {
        if (!aboDecompte && cas.client_id) {
          const { data: abosActifs, error: abosErr } = await supabase
            .from('abonnements')
            .select('id, statut, seances_total, seances_utilisees, date_fin, date_pause_debut, date_pause_fin, types_cours_autorises')
            .eq('client_id', cas.client_id)
            .eq('profile_id', cas.profile_id)
            .eq('statut', 'actif');
          if (abosErr) { reportError('[cas resolve] abos:', abosErr); return { error: 'Une erreur est survenue.', status: 500 }; }
          aboDecompte = resoudreCarnetApplicable(abosActifs, {
            type_cours: cas.cours?.type_cours,
            date: cas.cours?.date || cas.context?.cours_date,
            tarif_unitaire: cas.cours?.tarif_unitaire,
            carnets_acceptes: cas.cours?.carnets_acceptes, // mixte v82
          })?.id || null;
        }
        if (!aboDecompte) {
          return {
            error: 'Aucun carnet applicable à décompter pour cet·te élève — choisis plutôt « Excusé » ou « Dette créée ».',
            status: 400,
          };
        }
        const { error: incErr } = await supabase
          .rpc('ajuster_seances', { p_abo_id: aboDecompte, p_delta: 1 });
        if (incErr) {
          reportError('[cas resolve] décompte carnet échoué:', incErr);
          return { error: 'Le décompte de la séance a échoué.', status: 500 };
        }
        decompteApplique = true;
      }
    }

    const newStatut = (
      action === 'decompte' ? 'absent_compte'
      : action === 'excuse' ? 'excuse'
      : action === 'annule' ? 'annule'
      : action === 'place_donnee' ? 'confirme'
      : action === 'declinee' ? 'declinee'
      : presence.statut_pointage
    );

    const updatePresence = { statut_pointage: newStatut };
    // Décompte via carnet résolu → lier la présence (symétrie recrédit/undo).
    if (action === 'decompte' && decompteApplique && !presence.abonnement_id) {
      updatePresence.abonnement_id = aboDecompte;
    }
    // Excuse = pardon complet : une annulation tardive excusée ne doit plus
    // être « due » nulle part (avant : est_due survivait → la dette
    // réapparaissait dans Revenus ET l'espace élève après l'excuse).
    if (action === 'excuse' && (presence.est_due || presence.annulation_tardive)) {
      before.est_due = presence.est_due;
      before.annulation_tardive = presence.annulation_tardive;
      before.motif_due = presence.motif_due;
      updatePresence.est_due = false;
      updatePresence.annulation_tardive = false;
      updatePresence.motif_due = null;
    }

    const { error: updErr } = await supabase
      .from('presences')
      .update(updatePresence)
      .eq('id', cas.presence_id);
    if (updErr) { reportError('[cas resolve applyDirectEffect]', updErr); return { error: 'Une erreur est survenue.', status: 500 }; }

    // ── Place libérée (annule/declinee) → promotion liste d'attente ────────
    // Le détail du cours promet « notifiées automatiquement si une place se
    // libère » : c'était vrai pour l'annulation élève, FAUX pour la
    // résolution de cas — la file attendait un email qui ne venait jamais
    // (B1b). Fire-and-forget : la résolution n'échoue pas si la promotion rate.
    if (['annule', 'declinee'].includes(action) && cas.cours_id) {
      try {
        const { createAdminClient } = await import('@/lib/supabase-admin');
        const admin = createAdminClient();
        const { data: coursRow } = await admin
          .from('cours')
          .select('id, nom, date, heure, est_annule, capacite_max')
          .eq('id', cas.cours_id)
          .maybeSingle();
        const todayParis = new Date().toLocaleDateString('sv-SE', { timeZone: 'Europe/Paris' });
        if (coursRow && !coursRow.est_annule && coursRow.date >= todayParis) {
          const { data: prof } = await admin
            .from('profiles').select('studio_slug').eq('id', cas.profile_id).maybeSingle();
          const { promouvoirListeAttente } = await import('@/lib/promotion-liste-attente');
          await promouvoirListeAttente(admin, cas.profile_id, coursRow, {
            studioSlug: prof?.studio_slug || null,
            notifier: true,
          });
        }
      } catch (promErr) {
        reportError('[cas resolve] promotion liste d\'attente échouée:', promErr);
      }
    }

    // Excuse d'une absence qui avait DÉJÀ été décomptée (no-show strict) → on
    // rend la séance. Le flag context.seance_decomptee, posé à la création du
    // cas par le pointage, est le seul signal fiable (le statut 'absent' seul
    // ne dit pas si le carnet a été touché). `recredited` permet à l'undo de
    // rétablir le décompte.
    let recredited = false;
    if (action === 'excuse' && cas.context?.seance_decomptee && presence.abonnement_id && before.statut !== 'excuse') {
      const { error: credErr } = await supabase
        .rpc('ajuster_seances', { p_abo_id: presence.abonnement_id, p_delta: -1 });
      if (credErr) {
        reportError('[cas resolve] re-crédit excuse échoué:', credErr);
        return { error: 'La restitution de la séance a échoué.', status: 500 };
      }
      recredited = true;
    }

    return {
      beforeState: {
        presence_id: cas.presence_id,
        ...before,
        ...(recredited && { recredited: true }),
        ...(action === 'decompte' && { decompte_applique: decompteApplique }),
      },
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
    // RPC v53 : décrément atomique (borné à 0 côté SQL)
    const { error: updErr } = await supabase
      .rpc('ajuster_seances', { p_abo_id: aboId, p_delta: -1 });
    if (updErr) { reportError('[cas resolve applyDirectEffect]', updErr); return { error: 'Une erreur est survenue.', status: 500 }; }

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
    if (updErr) { reportError('[cas resolve applyDirectEffect]', updErr); return { error: 'Une erreur est survenue.', status: 500 }; }

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
    if (updErr) { reportError('[cas resolve applyDirectEffect]', updErr); return { error: 'Une erreur est survenue.', status: 500 }; }

    return {
      beforeState: { presence_id: cas.presence_id, ...before },
      ressource: { type: 'presence', id: cas.presence_id },
    };
  }

  return { error: `Action "${action}" non supportée en mode direct`, status: 400 };
}
