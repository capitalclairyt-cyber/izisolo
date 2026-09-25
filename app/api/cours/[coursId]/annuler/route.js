import { withRoute } from '@/lib/api-route';
import { createAdminClient } from '@/lib/supabase-admin';
import { sendNotifEleve } from '@/lib/notifs-eleves';
import { sendEmail } from '@/lib/email';
import { sendPushToEmail } from '@/lib/push-server';
import { wantsNotif } from '@/lib/notif-prefs';
import { getRegle } from '@/lib/regles-metier';
import { reportError } from '@/lib/report';
import { chargerLanguesFiches, chargerLanguesStudios } from '@/lib/i18n-portail-serveur';
import { traducteur, langueEleve } from '@/lib/i18n-portail';

export const runtime = 'nodejs';

/**
 * Annule un cours côté pro et envoie une notification email/SMS automatique
 * à tous les inscrits. Le pro ne se positionne plus en "porteur de mauvaise
 * nouvelle" — l'app se charge de tout.
 *
 * POST /api/cours/[coursId]/annuler
 *   Body : { raison?: string }    — message optionnel à inclure dans l'email
 */

export const POST = withRoute({ auth: 'active', perm: 'cours_gerer' }, async ({ request, params, auth }) => {
  const { studioId } = auth;
  const { coursId } = params;
  let body = {};
  try { body = await request.json(); } catch { /* body optionnel : annulation sans motif */ }
  const raison = (body.raison || '').toString().trim().slice(0, 500);

  const supabaseAdmin = createAdminClient();

  // Vérifie ownership + récupère le cours
  const { data: cours } = await supabaseAdmin
    .from('cours')
    .select('id, nom, date, heure, lieu, est_annule, profile_id')
    .eq('id', coursId)
    .eq('profile_id', studioId)
    .single();

  if (!cours) return Response.json({ error: 'Cours introuvable' }, { status: 404 });
  if (cours.est_annule) return Response.json({ error: 'Cours déjà annulé' }, { status: 409 });

  // Profile (notifs_eleves + règles métier). ⚠️ Ne JAMAIS re-sélectionner
  // twilio_* : colonnes SUPPRIMÉES par v21 → 42703 → profile null → la route
  // tournait à vide (annulation prof sans notifications) depuis v21.
  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('id, studio_nom, studio_slug, notifs_eleves, regles_metier')
    .eq('id', studioId)
    .single();

  const regleAnnul = getRegle({ regles_metier: profile?.regles_metier }, 'cours_annule_prof');

  // Marquer le cours annulé
  const { error: updateErr } = await supabaseAdmin
    .from('cours')
    .update({ est_annule: true })
    .eq('id', coursId)
    .eq('profile_id', studioId);

  if (updateErr) {
    reportError('[cours/annuler] update error:', updateErr);
    return Response.json({ error: 'Erreur lors de l\'annulation' }, { status: 500 });
  }

  // Envoyer notifications aux inscrits + restituer crédits selon règle
  const { data: presences } = await supabaseAdmin
    .from('presences')
    .select('id, abonnement_id, statut_pointage, annulation_tardive, est_due, client:client_id(id, prenom, nom, email, telephone, notif_prefs)')
    .eq('cours_id', coursId)
    .eq('profile_id', studioId);

  // La langue de chaque élève (v122) : sa fiche > le réglage du studio > fr.
  // Chargées UNE fois pour tout le lot, par des requêtes séparées et
  // défensives : la colonne n'entre jamais dans le select des présences.
  // Les notifications de la PROF, plus bas, restent en français.
  const languesFiches = await chargerLanguesFiches(supabaseAdmin, (presences || []).map(r => r.client?.id));
  const languesStudios = await chargerLanguesStudios(supabaseAdmin, [studioId]);
  const traducteurPour = (clientId) => traducteur(langueEleve({
    client: clientId ? (languesFiches.get(clientId) || null) : null,
    studio: { langue_portail: languesStudios.get(studioId) },
  }));
  // Date, heure et « quand » dans la langue de l'élève :
  // « mardi 3 octobre à 18h30 » ou « Tuesday 3 October at 18:30 ».
  const quandPour = (t) => {
    const dateStr = cours.date
      ? new Date(cours.date + 'T12:00:00').toLocaleDateString(t.locale, { weekday: 'long', day: 'numeric', month: 'long' })
      : t('la date prévue');
    const heureStr = cours.heure
      ? (t.langue === 'en' ? cours.heure.slice(0, 5) : cours.heure.slice(0, 5).replace(':', 'h'))
      : '';
    const quand = heureStr ? t('{date} à {heure}', { date: dateStr, heure: heureStr }) : dateStr;
    return { dateStr, heureStr, quand };
  };

  // Application de la règle cours_annule_prof :
  //   • mode='auto' + choix='rendre_seances' → recréditer les abos (decrémenter
  //                                            seances_utilisees) et envoyer email
  //   • mode='auto' + choix='eleve_choisit' → log cas_a_traiter pour que l'élève
  //                                            choisisse (crédit/refund) + email
  //   • mode='manuel'                         → log cas_a_traiter par inscrit + email
  const isAutoRendre = regleAnnul.mode === 'auto' && regleAnnul.choix === 'rendre_seances';

  let sentTotal = 0, skippedTotal = 0, clientsNotifies = 0;
  let creditsRestitues = 0;
  let casLoggés = 0;

  for (const row of (presences || [])) {
    const client = row.client;
    if (!client?.id) continue;
    // Une résa résolue « annulée »/« déclinée » n'attend rien de cette séance :
    // pas d'email « ta séance est annulée » (les tardives, SI : recrédit) — B1b.
    if (['annule', 'declinee'].includes(row.statut_pointage)) { skippedTotal++; continue; }
    clientsNotifies++;

    // 1) Restitution du crédit si rendre_seances + abonnement lié ET séance
    //    réellement décomptée (fix audit 2026-07-25 : une présence LIÉE mais
    //    jamais décomptée existe — batch-add pré-Lot A, présent dé-pointé,
    //    absent-strict excusé — et l'ancien recrédit aveugle OFFRAIT une
    //    séance à chacune). Décomptée = pointée comptante (present /
    //    absent_compte) ou annulation tardive sanctionnée (liée en décomptant).
    const reellementDecomptee = ['present', 'absent_compte'].includes(row.statut_pointage) || row.annulation_tardive;
    if (isAutoRendre && row.abonnement_id && reellementDecomptee) {
      const { error: decErr } = await supabaseAdmin
        .rpc('ajuster_seances', { p_abo_id: row.abonnement_id, p_delta: -1 });
      if (decErr) console.warn('[annuler] credit non-restitue:', decErr.message);
      else creditsRestitues++;
    }

    // Email honnête par élève (audit 2026-07-25) : l'ancien texte promettait
    // « ton crédit sera restitué automatiquement » même en mode manuel (rien
    // n'était restitué) et pour les élèves sans carnet. La promesse suit ce
    // qui s'est RÉELLEMENT passé pour CETTE personne.
    const creditRestitue = isAutoRendre && row.abonnement_id && reellementDecomptee;
    const t = traducteurPour(client.id);
    const { dateStr, heureStr, quand } = quandPour(t);
    const sujet = t('Séance annulée — {cours}', { cours: cours.nom });
    const ligneCredit = creditRestitue
      ? t('Ta séance est bien re-créditée sur ton carnet automatiquement (rien à faire).')
      : (regleAnnul.mode === 'manuel' || regleAnnul.choix === 'eleve_choisit')
        ? t('{studio} revient vers toi pour la suite (report ou crédit).', { studio: profile?.studio_nom || t('Ton studio') })
        : t('Si tu avais réglé cette séance, rapproche-toi de ton studio pour la suite.');
    const templates = {
      email: {
        sujet,
        corps: [
          `${t('Bonjour {prenom}', { prenom: client.prenom || '' })},`,
          '',
          `${t('La séance « {cours} » du {quand} est annulée.', { cours: cours.nom, quand })}${raison ? `\n\n${t('Motif : {raison}', { raison })}` : ''}`,
          '',
          ligneCredit,
          '',
          t('Désolé·e pour le désagrément, à très vite.'),
        ].join('\n'),
      },
      sms: {
        corps: `${t('Seance annulee : « {cours} » du {quand}.', { cours: cours.nom, quand: `${dateStr}${heureStr ? ` ${heureStr}` : ''}` })} ${raison ? raison + ' ' : ''}${creditRestitue ? t('Ton credit est restitue.') : ''} — ${profile?.studio_nom || t('Studio')}`,
      },
    };

    // 2) Log dans cas_a_traiter pour modes 'eleve_choisit' ou 'manuel'
    //    (la prof devra valider la décision pour cet élève)
    if (regleAnnul.mode === 'manuel' || regleAnnul.choix === 'eleve_choisit') {
      try {
        await supabaseAdmin.from('cas_a_traiter').insert({
          profile_id: studioId,
          case_type: 'cours_annule_prof',
          client_id: client.id,
          cours_id: coursId,
          presence_id: row.id,
          context: {
            mode: regleAnnul.mode,
            choix: regleAnnul.choix,
            client_nom: `${client.prenom || ''} ${client.nom || ''}`.trim(),
            client_email: client.email,
            cours_nom: cours.nom,
            cours_date: cours.date,
            raison: raison || null,
            abonnement_id: row.abonnement_id || null,
          },
        });
        casLoggés++;
      } catch (e) { console.warn('[annuler] cas log non-bloquant:', e?.message); }
    }

    // 3) Envoyer la notif email/SMS standard (gaté sur pref élève email)
    if (wantsNotif(client.notif_prefs, 'cours_annule', 'eleve', 'email')) {
      const result = await sendNotifEleve(supabaseAdmin, {
        profile,
        client,
        type: 'cours_annule',
        relatedId: coursId,
        contexte: { cours_nom: cours.nom, date: dateStr, heure: heureStr, lieu: cours.lieu || '' },
        templates,
      });
      sentTotal += result.sent;
      skippedTotal += result.skipped;
    }

    // Push élève « cours annulé » (gaté sur pref cours_annule push ; no-op sans abo)
    if (client.email) {
      sendPushToEmail(client.email, {
        title: t('Cours annulé'),
        body: t('{cours} — {quand} est annulé.', { cours: cours.nom, quand }),
        url: profile?.studio_slug ? `/p/${profile.studio_slug}/espace` : '/',
        tag: `annul-cours-${coursId}`,
      }, { type: 'cours_annule', profileId: studioId }).catch(() => {});
    }
  }

  // ── Liste d'attente : prévenir puis purger (audit 2026-07-25) ────────────
  // Avant : les personnes en file restaient en attente d'un cours mort (la
  // purge n'arrivait que 60 j plus tard via le cron), sans jamais être
  // prévenues.
  let listeAttentePrevenues = 0;
  try {
    const { data: enAttente } = await supabaseAdmin
      .from('liste_attente')
      .select('id, email, nom, client_id')
      .eq('cours_id', coursId)
      .eq('profile_id', studioId);
    // Une entrée de liste d'attente porte parfois une fiche (client_id) : sa
    // langue vient de là, sinon du studio (v122).
    const languesAttente = await chargerLanguesFiches(supabaseAdmin, (enAttente || []).map(e => e.client_id));
    for (const entry of enAttente || []) {
      if (entry.email && process.env.RESEND_API_KEY) {
        try {
          const t = traducteur(langueEleve({
            client: entry.client_id ? (languesAttente.get(entry.client_id) || null) : null,
            studio: { langue_portail: languesStudios.get(studioId) },
          }));
          const { quand } = quandPour(t);
          await sendEmail({
            categorie: 'notification',
            to: entry.email,
            subject: t('Séance annulée — {cours}', { cours: cours.nom }),
            html: `
              <div style="font-family:-apple-system,BlinkMacSystemFont,sans-serif;max-width:560px;margin:0 auto;padding:24px;">
                <p style="color:#555;margin:0 0 12px;">${t('Bonjour {prenom}', { prenom: (entry.nom || '').split(' ')[0] || '' })},</p>
                <p style="color:#555;margin:0 0 12px;">
                  ${t("Tu étais en liste d'attente pour « {cours} » du {quand} — cette séance est finalement {annulee}.", { cours: `<strong>${cours.nom}</strong>`, quand, annulee: `<strong>${t('annulée')}</strong>` })}${raison ? `<br/><em style="color:#888;">${raison}</em>` : ''}
                </p>
                <p style="color:#555;margin:0 0 12px;">${t("Ta place en liste d'attente est retirée, rien à faire de ton côté.")}</p>
              </div>
            `,
          });
          listeAttentePrevenues++;
        } catch (e) { reportError('[annuler] email liste attente (non-bloquant):', e?.message); }
      }
    }
    if ((enAttente || []).length > 0) {
      await supabaseAdmin.from('liste_attente').delete().eq('cours_id', coursId).eq('profile_id', studioId);
    }
  } catch (e) { reportError('[annuler] purge liste attente (non-bloquant):', e?.message); }

  // ── Paiements à la séance déjà encaissés (v65) : signaler à la prof ──────
  let paiementsSeancePayes = 0;
  try {
    const presenceIds = (presences || []).map(r => r.id);
    if (presenceIds.length > 0) {
      const { count } = await supabaseAdmin
        .from('paiements')
        .select('id', { count: 'exact', head: true })
        .in('presence_id', presenceIds)
        .eq('statut', 'paid');
      paiementsSeancePayes = count || 0;
    }
  } catch (e) { reportError('[annuler] comptage paiements séance (non-bloquant):', e?.message); }

  // ── Nettoyage des dettes du cours (audit 2026-07-25) ─────────────────────
  // Une séance annulée par la prof ne peut plus être « due » : on cleare
  // est_due sur les présences (sinon « À percevoir » réclamait l'argent d'un
  // cours annulé — l'espace élève, lui, l'excluait déjà) et on ferme les cas
  // d'annulation tardive encore ouverts sur ce cours.
  try {
    await supabaseAdmin
      .from('presences')
      .update({ est_due: false, motif_due: null })
      .eq('cours_id', coursId)
      .eq('est_due', true);
    await supabaseAdmin
      .from('cas_a_traiter')
      .update({
        resolu_at: new Date().toISOString(),
        resolu_action: 'annule_cours_prof',
        resolu_notes: 'Fermé automatiquement : la séance a été annulée par la prof.',
      })
      .eq('cours_id', coursId)
      .eq('profile_id', studioId)
      .eq('case_type', 'annulation_hors_delai')
      .is('resolu_at', null);
  } catch (e) { reportError('[annuler] nettoyage dettes (non-bloquant):', e?.message); }

  return Response.json({
    ok: true,
    notifications: { envoyees: sentTotal, ignorees: skippedTotal, clients: clientsNotifies },
    credits_restitues: creditsRestitues,
    cas_loggés: casLoggés,
    liste_attente_prevenues: listeAttentePrevenues,
    paiements_seance_payes: paiementsSeancePayes,
    regle_appliquée: regleAnnul.mode === 'auto' ? regleAnnul.choix : 'manuel',
  });
});
