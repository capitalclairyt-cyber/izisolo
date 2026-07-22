import { createServerClient } from '@/lib/supabase-server';
import { createAdminClient } from '@/lib/supabase-admin';
import { parseJsonBody, annulationSchema } from '@/lib/validation';
import { checkRateLimitIP } from '@/lib/antibot';
import { studioHasFeature } from '@/lib/plan-guard';
import { evaluerAnnulation } from '@/lib/regles-annulation';
import { sendNotifEleve } from '@/lib/notifs-eleves';
import { getRegle } from '@/lib/regles-metier';
import { sendNotifElevePourRegle } from '@/lib/notif-eleve-regle';
import { sendPushToUser } from '@/lib/push-server';
import { resoudreCarnetApplicable } from '@/lib/carnet-resolution';
import { escapeIlike } from '@/lib/utils';
import { promouvoirListeAttente } from '@/lib/promotion-liste-attente';

export async function POST(request, { params }) {
  const { studioSlug } = await params;

  // Rate-limit IP : route publique d'écriture destructrice (delete presences)
  // — on borne les annulations automatisées (10/h/IP).
  const rl = checkRateLimitIP(request, { max: 10, scope: 'portail-annuler' });
  if (!rl.ok) return Response.json({ error: rl.reason }, { status: 429 });

  const { data, errorResponse } = await parseJsonBody(request, annulationSchema);
  if (errorResponse) return errorResponse;
  const { presenceId } = data;

  // Vérifier que l'utilisateur est authentifié
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return Response.json({ error: 'Non authentifié' }, { status: 401 });
  }

  const supabaseAdmin = createAdminClient();

  // Vérifier que le studio existe + récupérer ses règles + config notifs
  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('id, studio_nom, regles_annulation, regles_metier, notifs_eleves, twilio_account_sid, twilio_auth_token, twilio_phone_number, plan, trial_started_at, stripe_subscription_status')
    .eq('studio_slug', studioSlug)
    .single();

  // Récupérer l'email du pro pour reply_to sur les emails élèves
  let proEmail = null;
  try {
    const { data: { user: proUser } } = await supabaseAdmin.auth.admin.getUserById(profile?.id);
    proEmail = proUser?.email || null;
  } catch {}

  if (!profile) {
    return Response.json({ error: 'Studio introuvable' }, { status: 404 });
  }

  // Gate plan (Sprint 3) : l'annulation en ligne par l'élève est une feature
  // Pro du STUDIO. En Solo, l'élève contacte directement sa prof.
  if (!studioHasFeature(profile, 'annulationParEleve')) {
    return Response.json({
      error: 'L\'annulation en ligne n\'est pas activée pour ce studio. Contacte directement ton studio pour annuler.',
    }, { status: 403 });
  }

  // Trouver le client lié à cet user dans ce studio (incl. infos pour notif)
  const { data: client } = await supabaseAdmin
    .from('clients')
    .select('id, prenom, nom, email, telephone')
    .eq('profile_id', profile.id)
    .ilike('email', escapeIlike(user.email))
    .single();

  if (!client) {
    return Response.json({ error: 'Client introuvable' }, { status: 404 });
  }

  // Vérifier que la présence appartient bien à ce client dans ce studio
  const { data: presence } = await supabaseAdmin
    .from('presences')
    .select('id, abonnement_id, cours:cours_id(id, nom, date, heure, type_cours, est_annule, tarif_unitaire)')
    .eq('id', presenceId)
    .eq('client_id', client.id)
    .eq('profile_id', profile.id)
    .single();

  if (!presence) {
    return Response.json({ error: 'Réservation introuvable' }, { status: 404 });
  }

  // Vérifier que le cours n'est pas déjà passé
  const today = new Date().toISOString().slice(0, 10);
  if (presence.cours && presence.cours.date < today) {
    return Response.json({ error: 'Ce cours est déjà passé' }, { status: 400 });
  }

  // Évaluer la règle d'annulation (délai libre vs tardif)
  const evaluation = evaluerAnnulation(
    profile,
    presence.cours?.date,
    presence.cours?.heure,
    presence.cours?.type_cours
  );

  // Push prof « annulation » (gaté sur sa pref ; no-op sans abonnement).
  // Posé ici : quelle que soit la branche ci-dessous, l'élève annule bien.
  {
    const dStr = presence.cours?.date
      ? new Date(presence.cours.date + 'T12:00:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })
      : '';
    sendPushToUser(profile.id, {
      title: evaluation.annulable ? 'Annulation' : 'Annulation tardive ⚠️',
      body: `${client.prenom || client.email} — ${presence.cours?.nom || 'un cours'}${dStr ? ` (${dStr})` : ''}`,
      url: '/agenda',
      tag: `annul-${presenceId}`,
    }, { type: 'annulation' }).catch(() => {});
  }

  // ── Cas 1 : Annulation libre (dans les délais) → suppression de la presence
  if (evaluation.annulable) {
    const { error: deleteErr } = await supabaseAdmin
      .from('presences')
      .delete()
      .eq('id', presenceId);

    if (deleteErr) {
      console.error('annulation libre — delete error:', deleteErr);
      return Response.json({ error: 'Erreur lors de l\'annulation' }, { status: 500 });
    }

    // Promotion auto : s'il y a quelqu'un en liste d'attente sur ce cours,
    // on promeut le 1er (n°1 par created_at), on lui crée une presence et
    // on lui envoie un email de notification.
    try {
      await promouvoirListeAttente(supabaseAdmin, profile.id, presence.cours, { proEmail, studioSlug });
    } catch (promErr) {
      console.error('promotion liste attente (non-blocking):', promErr);
    }

    return Response.json({ ok: true, tardive: false });
  }

  // ── Cas 2 : Annulation tardive (au-delà du délai libre) ──────────────────
  // Le comportement dépend désormais de la règle métier annulation_hors_delai
  // configurée par la prof (cf. /parametres → Règles → Cas particuliers) :
  //
  //   • mode='auto' + choix='excuser'             → on traite comme libre
  //                                                  (delete presence, pas de décompte)
  //   • mode='auto' + choix='decompter'           → comportement historique
  //                                                  (presence=tardive, +1 séance utilisée)
  //   • mode='auto' + choix='decompter_ou_dette'  → décompte si carnet, sinon
  //                                                  log dans cas_a_traiter (dette)
  //   • mode='manuel'                             → presence reste, log dans
  //                                                  cas_a_traiter pour décision prof
  const regleAnnul = getRegle({ regles_metier: profile.regles_metier }, 'annulation_hors_delai');

  // Si la prof a explicitement excusé toutes les annulations tardives → free pass
  if (regleAnnul.mode === 'auto' && regleAnnul.choix === 'excuser') {
    const { error: deleteErr } = await supabaseAdmin
      .from('presences')
      .delete()
      .eq('id', presenceId);
    if (deleteErr) {
      console.error('annulation tardive (excusee) — delete error:', deleteErr);
      return Response.json({ error: 'Erreur lors de l\'annulation' }, { status: 500 });
    }
    // Promotion liste d'attente comme pour annulation libre
    try {
      await promouvoirListeAttente(supabaseAdmin, profile.id, presence.cours, { proEmail, studioSlug });
    } catch (e) { console.error('promotion (excuse): non-blocking:', e); }
    return Response.json({ ok: true, tardive: true, action: 'excusee' });
  }

  // Si mode manuel → on accepte l'annulation côté élève (delete presence) mais
  // on log le cas pour que la prof décide en aval (décompter / excuser / dette)
  if (regleAnnul.mode === 'manuel') {
    const { error: deleteErr } = await supabaseAdmin
      .from('presences')
      .delete()
      .eq('id', presenceId);
    if (deleteErr) {
      console.error('annulation tardive (manuel) — delete error:', deleteErr);
      return Response.json({ error: 'Erreur lors de l\'annulation' }, { status: 500 });
    }
    try {
      await supabaseAdmin.from('cas_a_traiter').insert({
        profile_id: profile.id,
        case_type: 'annulation_hors_delai',
        client_id: client.id,
        cours_id: presence.cours?.id || null,
        presence_id: null, // presence supprimée
        context: {
          mode: 'manuel',
          delai_h: evaluation.delaiHeures,
          client_nom: `${client.prenom || ''} ${client.nom || ''}`.trim(),
          client_email: client.email,
          cours_date: presence.cours?.date,
          cours_heure: presence.cours?.heure,
          presence_id: presenceId, // pour ref historique même si supprimée
        },
      });
    } catch (e) { console.error('annulation (manuel): cas_a_traiter non-bloquant:', e); }
    try { await promouvoirListeAttente(supabaseAdmin, profile.id, presence.cours, { proEmail, studioSlug }); } catch {}
    return Response.json({ ok: true, tardive: true, action: 'manuel' });
  }

  // mode='auto' + choix='decompter' OU 'decompter_ou_dette' (= comportement historique)
  const choixDecompte = regleAnnul.choix || 'decompter';
  const motif = `Annulation tardive (moins de ${evaluation.delaiHeures}h avant le cours)`;

  const { error: updateErr } = await supabaseAdmin
    .from('presences')
    .update({
      annulation_tardive: true,
      est_due: true,
      motif_due: motif,
    })
    .eq('id', presenceId);

  if (updateErr) {
    console.error('annulation tardive — update error:', updateErr);
    return Response.json({ error: 'Erreur lors de l\'annulation' }, { status: 500 });
  }

  // ── Décompte réel de la séance ────────────────────────────────────────────
  // Avant : on ne décomptait que si presence.abonnement_id était déjà lié — or
  // une réservation portail n'est JAMAIS liée (la liaison arrive au pointage)
  // → la sanction « décompter » ne décomptait quasiment jamais rien, mais
  // l'email affirmait « la séance a été comptée ». Désormais on RÉSOUT le
  // carnet applicable (mêmes règles que le pointage v64/v70 : type, dates,
  // pause, gate tarif_unitaire) et on ne dit à l'élève QUE ce qui s'est passé.
  let seanceDecomptee = false;
  let aboADecompter = presence.abonnement_id || null;
  if (!aboADecompter) {
    try {
      const { data: abosActifs } = await supabaseAdmin
        .from('abonnements')
        .select('id, statut, seances_total, seances_utilisees, date_fin, date_pause_debut, date_pause_fin, types_cours_autorises')
        .eq('client_id', client.id)
        .eq('profile_id', profile.id)
        .eq('statut', 'actif');
      aboADecompter = resoudreCarnetApplicable(abosActifs, {
        type_cours: presence.cours?.type_cours,
        date: presence.cours?.date,
        tarif_unitaire: presence.cours?.tarif_unitaire,
      })?.id || null;
    } catch (e) { console.error('annulation tardive — résolution carnet err:', e); }
  }
  if (aboADecompter) {
    const { error: incErr } = await supabaseAdmin
      .rpc('ajuster_seances', { p_abo_id: aboADecompter, p_delta: 1 });
    if (incErr) {
      console.error('annulation tardive — décompte err:', incErr);
    } else {
      seanceDecomptee = true;
      // Lier la présence au carnet décompté (symétrie : un éventuel recrédit
      // — cours annulé par la prof, cas excusé — retrouvera le bon carnet).
      if (!presence.abonnement_id) {
        await supabaseAdmin.from('presences')
          .update({ abonnement_id: aboADecompter })
          .eq('id', presenceId);
      }
    }
  }
  if (!seanceDecomptee && choixDecompte === 'decompter_ou_dette') {
    // Pas de carnet lié → log une dette dans cas_a_traiter
    try {
      await supabaseAdmin.from('cas_a_traiter').insert({
        profile_id: profile.id,
        case_type: 'annulation_hors_delai',
        client_id: client.id,
        cours_id: presence.cours?.id || null,
        presence_id: presenceId,
        context: {
          choix_applique: 'creer_dette',
          dette_a_regler: true,
          delai_h: evaluation.delaiHeures,
          client_nom: `${client.prenom || ''} ${client.nom || ''}`.trim(),
          client_email: client.email,
          cours_date: presence.cours?.date,
        },
      });
    } catch (e) { console.error('annul dette: cas_a_traiter non-bloquant:', e); }
  }

  // Notification à l'élève — le message reflète ce qui s'est RÉELLEMENT passé :
  //   • carnet décompté → « la séance a été décomptée de ton carnet » ;
  //   • pas de carnet applicable → « la séance reste due » (dette ou séance à
  //     régler avec le studio), sans jamais prétendre un décompte fictif.
  try {
    const dateStr = presence.cours?.date
      ? new Date(presence.cours.date + 'T12:00:00').toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })
      : '';
    const heureStr = presence.cours?.heure ? presence.cours.heure.slice(0, 5).replace(':', 'h') : '';
    const tarifStr = Number(presence.cours?.tarif_unitaire) > 0
      ? ` (${Number(presence.cours.tarif_unitaire).toFixed(2).replace('.', ',')} €)`
      : '';
    const emailTpl = seanceDecomptee
      ? {
          sujet: `À noter : ta séance du ${dateStr} a été comptée`,
          corps:
`Bonjour {{prenom}},

Pour rappel, l'annulation de ta séance prévue le ${dateStr}${heureStr ? ` à ${heureStr}` : ''} est intervenue moins de ${evaluation.delaiHeures}h avant le cours. Conformément à la politique d'annulation du studio, la séance a été décomptée de ton carnet.

Tu peux retrouver le détail dans ton espace personnel.

À très vite,`,
        }
      : {
          sujet: `À noter : ta séance du ${dateStr} reste due`,
          corps:
`Bonjour {{prenom}},

Ton annulation pour la séance du ${dateStr}${heureStr ? ` à ${heureStr}` : ''} est intervenue moins de ${evaluation.delaiHeures}h avant le cours. Conformément à la politique d'annulation du studio, la séance reste due${tarifStr} — le règlement se fera directement avec ton studio.

Tu peux retrouver le détail dans ton espace personnel.

À très vite,`,
        };
    await sendNotifEleve(supabaseAdmin, {
      profile,
      client,
      type: 'annulation_tardive',
      relatedId: presenceId,
      proEmail,
      contexte: { date: dateStr, heure: heureStr },
      templates: {
        email: emailTpl,
        sms: {
          corps: seanceDecomptee
            ? `Annulation tardive (<${evaluation.delaiHeures}h) — la seance du ${dateStr}${heureStr ? ` ${heureStr}` : ''} a ete decomptee de ton carnet. — {{studio}}`
            : `Annulation tardive (<${evaluation.delaiHeures}h) — la seance du ${dateStr}${heureStr ? ` ${heureStr}` : ''} reste due, a regler avec ton studio. — {{studio}}`,
        },
      },
    });
  } catch (notifErr) {
    console.error('annulation tardive — notif (non-blocking):', notifErr);
  }

  return Response.json({
    ok: true,
    tardive: true,
    motif,
    delaiHeures: evaluation.delaiHeures,
  });
}
