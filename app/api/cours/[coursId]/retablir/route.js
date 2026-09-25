import { withRoute } from '@/lib/api-route';
import { createAdminClient } from '@/lib/supabase-admin';
import { sendNotifEleve } from '@/lib/notifs-eleves';
import { sendPushToEmail } from '@/lib/push-server';
import { wantsNotif } from '@/lib/notif-prefs';
import { reportError } from '@/lib/report';
import { retablissable, planRetablissement } from '@/lib/retablir-seance';
import { chargerLanguesFiches, chargerLanguesStudios } from '@/lib/i18n-portail-serveur';
import { traducteur, langueEleve } from '@/lib/i18n-portail';

export const runtime = 'nodejs';

/**
 * Rétablit une séance annulée (retour Maude 2026-09-09 : deux séances de
 * séries annulées qu'elle voulait remettre, sans y parvenir — l'annulation
 * était « définitive » par construction).
 *
 * La MÊME séance redevient normale : même id, même série, mêmes inscrites,
 * jamais de doublon. Les inscrites encore actives sont prévenues (« séance
 * finalement maintenue »), gaté sur leur préférence « séance annulée » : c'est
 * la même conversation. Aucun carnet n'est touché (l'annulation a déjà rendu
 * ce qui devait l'être, le pointage fera le décompte). Les cas « cours annulé
 * par la prof » encore ouverts sur cette séance sont fermés : ils n'ont plus
 * d'objet.
 *
 * POST /api/cours/[coursId]/retablir
 */
export const POST = withRoute({ auth: 'active', perm: 'cours_gerer' }, async ({ params, auth }) => {
  const { studioId } = auth;
  const { coursId } = params;
  const supabaseAdmin = createAdminClient();

  const { data: cours } = await supabaseAdmin
    .from('cours')
    .select('id, nom, date, heure, lieu, est_annule, profile_id')
    .eq('id', coursId)
    .eq('profile_id', studioId)
    .single();
  if (!cours) return Response.json({ error: 'Cours introuvable' }, { status: 404 });

  const verdict = retablissable({ est_annule: cours.est_annule, date: cours.date });
  if (!verdict.ok) return Response.json({ error: verdict.raison, code: 'NON_RETABLISSABLE' }, { status: 409 });

  const { data: maj, error: updateErr } = await supabaseAdmin
    .from('cours')
    .update({ est_annule: false })
    .eq('id', coursId)
    .eq('profile_id', studioId)
    .eq('est_annule', true)
    .select('id');
  if (updateErr) {
    reportError('[cours/retablir] update error:', updateErr);
    return Response.json({ error: 'Erreur lors du rétablissement' }, { status: 500 });
  }
  if (!maj?.length) return Response.json({ error: 'Cette séance n\'est plus annulée.', code: 'NON_RETABLISSABLE' }, { status: 409 });

  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('id, studio_nom, studio_slug, notifs_eleves')
    .eq('id', studioId)
    .single();

  const { data: presences } = await supabaseAdmin
    .from('presences')
    .select('id, statut_pointage, annulation_tardive, client:client_id(id, prenom, nom, email, telephone, notif_prefs)')
    .eq('cours_id', coursId)
    .eq('profile_id', studioId);

  const plan = planRetablissement({ presences: presences || [] });

  // La langue de chaque élève (v122) : sa fiche > le réglage du studio > fr,
  // chargées une fois pour le lot par des requêtes séparées et défensives.
  // Le message est celui d'emailRetablissement (lib/retablir-seance), phrase
  // pour phrase, écrit ici dans la langue de chacune.
  const languesFiches = await chargerLanguesFiches(supabaseAdmin, plan.aPrevenir.map(r => r.client?.id));
  const languesStudios = await chargerLanguesStudios(supabaseAdmin, [studioId]);
  const traducteurPour = (clientId) => traducteur(langueEleve({
    client: clientId ? (languesFiches.get(clientId) || null) : null,
    studio: { langue_portail: languesStudios.get(studioId) },
  }));
  const messagePour = (t, prenom) => {
    const dateStr = cours.date
      ? new Date(cours.date + 'T12:00:00').toLocaleDateString(t.locale, { weekday: 'long', day: 'numeric', month: 'long' })
      : t('la date prévue');
    const heureStr = cours.heure
      ? (t.langue === 'en' ? cours.heure.slice(0, 5) : cours.heure.slice(0, 5).replace(':', 'h'))
      : '';
    const quand = heureStr ? t('{date} à {heure}', { date: dateStr, heure: heureStr }) : dateStr;
    return {
      dateStr,
      heureStr,
      sujet: t('Séance maintenue — {cours}', { cours: cours.nom }),
      corps: [
        `${t('Bonjour {prenom}', { prenom })},`,
        '',
        `${t('Bonne nouvelle : la séance « {cours} » du {quand} a finalement lieu.', { cours: cours.nom, quand })}${cours.lieu ? `\n${t('Lieu : {lieu}.', { lieu: cours.lieu })}` : ''}`,
        '',
        t('Ta réservation est toujours valable, rien à faire de ton côté. Si tu ne peux plus venir, annule depuis ton espace.'),
        '',
        `${t('À très vite')},`,
        profile?.studio_nom || t('Ton studio'),
      ].join('\n'),
      sms: `${t('Seance maintenue : « {cours} » du {quand} a finalement lieu. Ta reservation est valable.', { cours: cours.nom, quand })} — ${profile?.studio_nom || t('Studio')}`,
      push: t('{cours} — {quand} a finalement lieu.', { cours: cours.nom, quand }),
    };
  };

  let envoyees = 0, ignorees = 0;
  for (const row of plan.aPrevenir) {
    const client = row.client;
    if (!client?.id) continue;
    const t = traducteurPour(client.id);
    const message = messagePour(t, client.prenom || '');
    const { dateStr, heureStr } = message;
    if (wantsNotif(client.notif_prefs, 'cours_annule', 'eleve', 'email')) {
      // prefsOverride : la prof n'a pas de toggle « séance rétablie » à
      // part, la pref élève « séance annulée » a déjà tranché. Idempotence
      // par (client, type, related_id) dans notifications_eleves.
      const r = await sendNotifEleve(supabaseAdmin, {
        profile, client, type: 'cours_retabli', relatedId: coursId,
        prefsOverride: { email: true, sms: false },
        contexte: { cours_nom: cours.nom, date: dateStr || '', heure: heureStr, lieu: cours.lieu || '' },
        templates: { email: { sujet: message.sujet, corps: message.corps }, sms: { corps: message.sms } },
      });
      envoyees += r.sent; ignorees += r.skipped;
    } else {
      ignorees++;
    }
    if (client.email) {
      sendPushToEmail(client.email, {
        title: t('Séance maintenue'),
        body: message.push,
        url: profile?.studio_slug ? `/p/${profile.studio_slug}/espace` : '/',
        tag: `retabli-cours-${coursId}`,
      }, { type: 'cours_annule', profileId: studioId }).catch(() => {});
    }
  }

  // Les cas « cours annulé par la prof » ouverts sur cette séance (mode
  // manuel / élève choisit) n'ont plus d'objet.
  let casFermes = 0;
  try {
    const { data: fermes } = await supabaseAdmin
      .from('cas_a_traiter')
      .update({
        resolu_at: new Date().toISOString(),
        resolu_action: 'retabli_cours_prof',
        resolu_notes: 'Fermé automatiquement : la séance a été rétablie par la prof.',
      })
      .eq('cours_id', coursId)
      .eq('profile_id', studioId)
      .eq('case_type', 'cours_annule_prof')
      .is('resolu_at', null)
      .select('id');
    casFermes = fermes?.length || 0;
  } catch (e) { reportError('[retablir] fermeture cas (non-bloquant):', e?.message); }

  return Response.json({
    ok: true,
    inscrites: plan.nbInscrites,
    notifications: { envoyees, ignorees },
    cas_fermes: casFermes,
  });
});
