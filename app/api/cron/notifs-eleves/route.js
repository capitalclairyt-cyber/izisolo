import { withRoute } from '@/lib/api-route';
import { createAdminClient } from '@/lib/supabase-admin';
import { sendNotifEleve } from '@/lib/notifs-eleves';
import { sendPushToEmail, claimCronPush } from '@/lib/push-server';
import { wantsNotif } from '@/lib/notif-prefs';
import { evaluerReglesAll } from '@/lib/regles';
import { can } from '@/lib/plan-guard';
import { reportError } from '@/lib/report';
import { lireAvisGoogle, emailAutoActif, candidatesAvis, emailAvis, TYPE_NOTIF_AVIS } from '@/lib/avis-google';
import { traducteur, langueEleve, localeDe } from '@/lib/i18n-portail';
import { chargerLanguesFiches, chargerLanguesStudios } from '@/lib/i18n-portail-serveur';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
// Durée max explicite (fluid compute : 300 s = plafond Hobby)
export const maxDuration = 300;

/**
 * Cron quotidien (8h UTC = 9h/10h Paris selon DST). Deux passes :
 *
 *  PASS 1 — Notifs "système" idempotentes basées sur l'état des abonnements :
 *    - Crédits faibles (carnet) : reste <= profile.alerte_seances_seuil
 *    - Expiration prochaine     : date_fin <= now + alerte_expiration_jours
 *
 *  PASS 2 — Règles SI/ALORS personnalisées (lib/regles.js) :
 *    Pour chaque règle active du pro avec action_type ∈
 *    ('envoyer_email', 'envoyer_sms', 'creer_alerte_pro'),
 *    on évalue la condition par client et on déclenche l'action si match.
 *    Idempotence : UNIQUE (client_id, type='regle:<id>', related_id=null, channel)
 *    → la règle ne se déclenche qu'une seule fois par client (pas par jour).
 *
 * Le pro contrôle on/off via :
 *   - profile.notifs_eleves[type].email/sms (notifs système)
 *   - profile.notifs_eleves.sms_global_off (kill-switch master, vu dans sendNotifEleve)
 *   - regles.actif (règles custom)
 */

export const GET = withRoute({ auth: 'cron' }, async ({ request }) => {
  const supabase = createAdminClient();

  const today = new Date().toISOString().slice(0, 10);
  // `?profil=<uuid>` derrière l'auth cron : restreint le passage à UN studio
  // (la preuve v117 le rejoue sur un studio jetable sans toucher aux autres).
  const profilSeul = (() => {
    try {
      const p = new URL(request.url).searchParams.get('profil');
      return /^[0-9a-f-]{36}$/i.test(p || '') ? p : null;
    } catch { return null; }
  })();

  // ─── v117 : les studios qui ont posé un lien d'avis Google. UNE requête
  // SÉPARÉE et défensive (pré-v117 la colonne n'existe pas : map vide, et le
  // reste du cron tourne exactement comme avant).
  const avisParProfil = new Map();
  try {
    const { data: lignes, error } = await supabase
      .from('profiles')
      .select('id, avis_google')
      .not('avis_google', 'is', null);
    if (!error) for (const l of lignes || []) {
      const cfg = lireAvisGoogle(l);
      if (cfg) avisParProfil.set(l.id, cfg);
    }
  } catch { /* pré-v117 */ }
  let totalAvis = 0;

  // Charger tous les profils (avec préférences notifs + champs plan pour le
  // gate capacité — sans eux, can() lirait undefined → tout le monde gâté).
  // PAGINÉ (AUDIT-PERF 2.2) : le select nu aurait ignoré les profils 1001+.
  const profiles = [];
  for (let page = 0; page < 20; page++) {
    const { data: lot, error: pErr } = await supabase
      .from('profiles')
      // studio_slug : indispensable aux URLs des push (sans lui, tous les push
      // carnet/expiration pointaient sur « / » — audit 2026-07-25).
      .select('id, studio_nom, studio_slug, notifs_eleves, alerte_seances_seuil, alerte_expiration_jours, sms_seuil_mois, plan, trial_started_at, stripe_subscription_status, type_structure')
      .order('id')
      .range(page * 1000, page * 1000 + 999);
    if (pErr) {
      reportError('[cron notifs] profiles err:', pErr, { route: '/api/cron/notifs-eleves' });
      break;
    }
    profiles.push(...(lot || []));
    if (!lot || lot.length < 1000) break;
  }

  let totalSent = 0, totalSkipped = 0, totalErrors = 0, totalReglesDeclenchees = 0, profilsTraites = 0, profilsGates = 0;

  // v122 : la langue par défaut de chaque studio, UNE requête séparée et
  // défensive pour tout le lot (le select nommé ci-dessus ne porte jamais
  // `langue_portail`). La langue des fiches se charge par studio, par lot,
  // plus bas : jamais une requête par élève.
  const languesStudios = await chargerLanguesStudios(supabase, (profiles || []).map(p => p.id));
  const traducteurPour = (languesFiches, clientId, profileId) => traducteur(langueEleve({
    client: { langue: languesFiches.get(clientId) },
    studio: { langue_portail: languesStudios.get(profileId) },
  }));

  for (const profile of (profiles || [])) {
    if (profilSeul && profile.id !== profilSeul) continue;
    // Gate capacité (B3b — fuite connue depuis B1g) : les notifs auto élèves
    // sont une capacité Complet. Un studio Essentiel ne déclenche RIEN ici —
    // avant, la feature Pro tournait gratuitement pour tous les plans.
    if (!can(profile, 'notifs_eleves_auto')) { profilsGates++; continue; }
    profilsTraites++;

    // ─────────────────────────────────────────────────────────────────
    // PASS 0 — v117 : « Un mot sur tes séances ? », l'email d'avis Google.
    // Le lendemain de la 3e présence pointée « présente », une seule fois
    // par élève et par studio (dédup notifications_eleves, related_id =
    // studio), au plus MAX_PAR_JOUR par studio et par jour (jamais une
    // rafale d'avis sur une fiche), gaté par la pref élève `avis` (email).
    // Jamais une élève archivée, jamais sans email, jamais une séance
    // annulée ou à venir. Aucune contrepartie dans le texte (règle Google).
    // ─────────────────────────────────────────────────────────────────
    const cfgAvis = avisParProfil.get(profile.id);
    if (cfgAvis && emailAutoActif(cfgAvis)) {
      try {
        // Déjà servies (envoyé ou volontairement ignoré) : un envoi ÉCHOUÉ
        // reste candidat, sendNotifEleve re-clame la ligne 'failed' (B1g).
        const { data: dejaRows, error: dejaErr } = await supabase
          .from('notifications_eleves')
          .select('client_id')
          .eq('profile_id', profile.id)
          .eq('type', TYPE_NOTIF_AVIS)
          .eq('channel', 'email')
          .neq('statut', 'failed');
        if (dejaErr) throw dejaErr;
        const deja = new Set((dejaRows || []).map(r => r.client_id));

        // Les présences pointées « présente » sur des séances passées, non
        // annulées. Paginé (le cap PostgREST 1000 rendrait le seuil faux).
        const presAvis = [];
        for (let page = 0; page < 10; page++) {
          const { data: lot, error: pErr } = await supabase
            .from('presences')
            .select('client_id, statut_pointage, cours:cours_id!inner(date, est_annule)')
            .eq('profile_id', profile.id)
            .eq('statut_pointage', 'present')
            .eq('cours.est_annule', false)
            .lte('cours.date', today)
            .order('created_at', { ascending: false })
            .range(page * 1000, page * 1000 + 999);
          if (pErr) throw pErr;
          presAvis.push(...(lot || []));
          if (!lot || lot.length < 1000) break;
        }
        const cands = candidatesAvis(presAvis, deja, today);
        if (cands.length) {
          const { data: fiches, error: fErr } = await supabase
            .from('clients')
            .select('id, prenom, nom, email, statut, notif_prefs')
            .in('id', cands.map(c => c.client_id));
          if (fErr) throw fErr;
          const languesAvis = await chargerLanguesFiches(supabase, cands.map(c => c.client_id));
          for (const cand of cands) {
            const client = (fiches || []).find(f => f.id === cand.client_id);
            if (!client?.email || client.statut === 'archive') continue;
            if (!wantsNotif(client.notif_prefs, 'avis', 'eleve', 'email')) continue;
            const t = traducteurPour(languesAvis, client.id, profile.id);
            const mail = emailAvis({ prenom: client.prenom, studioNom: profile.studio_nom || t('ton studio'), lien: cfgAvis.lien, t });
            const r = await sendNotifEleve(supabase, {
              profile, client, t,
              type: TYPE_NOTIF_AVIS,
              relatedId: profile.id, // NON NULL : la dédup UNIQUE compte les NULL comme distincts (B1g)
              contexte: {},
              prefsOverride: { email: true, sms: false },
              templates: { email: { sujet: mail.sujet, corps: mail.corps } },
            });
            totalSent += r.sent;
            totalSkipped += r.skipped;
            totalAvis += r.sent;
          }
        }
      } catch (e) {
        reportError('[cron notifs] avis_google err', e, { route: '/api/cron/notifs-eleves', profileId: profile.id });
        totalErrors++;
      }
    }
    const seuilSeances = profile.alerte_seances_seuil || 2;
    const seuilJoursExp = profile.alerte_expiration_jours || 7;
    const dateExpMax = new Date(Date.now() + seuilJoursExp * 86400000).toISOString().slice(0, 10);

    // Charger règles actives du profil pour évaluation custom (PASS 2)
    const { data: regles } = await supabase
      .from('regles')
      .select('*')
      .eq('profile_id', profile.id)
      .eq('actif', true);

    // Charger les abos ACTIFS du studio avec le client lié. Filtre statut à la
    // requête (AUDIT-PERF 2.2) : sans lui, TOUS les carnets jamais vendus
    // (expirés/épuisés compris) revenaient chaque nuit → cap 1000 par studio à
    // terme = PASS 1/2 silencieusement partiels. Iso-comportement : PASS 1
    // filtrait déjà actif en JS, et toutes les conditions d'abo de
    // lib/regles.js exigent statut='actif' (vérifié ligne à ligne).
    const { data: abos } = await supabase
      .from('abonnements')
      .select(`
        id, offre_nom, type, seances_total, seances_utilisees, date_fin, statut,
        clients(id, prenom, nom, email, telephone, niveau, statut, notif_prefs)
      `)
      .eq('profile_id', profile.id)
      .eq('statut', 'actif');

    // v122 : les langues des fiches de ce studio, un seul lot (les clients
    // arrivent par la jointure nommée ci-dessus, qui ne porte pas `langue`).
    const languesFiches = await chargerLanguesFiches(supabase, (abos || []).map(a => a.clients?.id));

    // ─────────────────────────────────────────────────────────────────
    // PASS 1 — Notifs système (crédits faibles + expiration)
    // ─────────────────────────────────────────────────────────────────
    for (const abo of (abos || []).filter(a => a.statut === 'actif')) {
      const client = abo.clients;
      if (!client?.id || !client?.email) continue;
      const t = traducteurPour(languesFiches, client.id, profile.id);
      const prenom = client.prenom || '';

      // ─── Crédits faibles (carnets uniquement)
      if (abo.seances_total != null) {
        const reste = abo.seances_total - (abo.seances_utilisees || 0);
        if (reste > 0 && reste <= seuilSeances) {
          try {
            const wantEmail = wantsNotif(client.notif_prefs, 'carnet', 'eleve', 'email');
            const wantPush = wantsNotif(client.notif_prefs, 'carnet', 'eleve', 'push');
            const offre = abo.offre_nom || t('carnet');
            if (wantEmail) {
              const r = await sendNotifEleve(supabase, {
                profile, client, t,
                type: 'credits_faibles',
                relatedId: abo.id,
                contexte: { cours_nom: abo.offre_nom || t('ton carnet'), seances_restantes: reste },
                templates: {
                  email: {
                    sujet: reste > 1
                      ? t('Plus que {n} séances sur ton carnet', { n: reste })
                      : t('Plus que {n} séance sur ton carnet', { n: reste }),
                    corps:
`${t('Bonjour {prenom}', { prenom })},

${reste > 1
  ? t('Petit rappel amical : il te reste seulement {n} séances sur ton carnet « {offre} » chez {studio}.', { n: reste, offre, studio: profile.studio_nom })
  : t('Petit rappel amical : il te reste seulement {n} séance sur ton carnet « {offre} » chez {studio}.', { n: reste, offre, studio: profile.studio_nom })}

${t("Pour ne pas être pris·e de court, n'hésite pas à renouveler dès que possible : on aura toujours plaisir à te revoir.")}

${t('À très vite')},`,
                  },
                  sms: {
                    corps: reste > 1
                      ? t('Hello {prenom}, plus que {n} seances sur ton carnet {offre} chez {studio}. Pense a renouveler !', { prenom, n: reste, offre: abo.offre_nom || '', studio: profile.studio_nom })
                      : t('Hello {prenom}, plus que {n} seance sur ton carnet {offre} chez {studio}. Pense a renouveler !', { prenom, n: reste, offre: abo.offre_nom || '', studio: profile.studio_nom }),
                  },
                },
              });
              totalSent += r.sent;
              totalSkipped += r.skipped;
            }
            // Push : canal indépendant, dédupé par claimCronPush.
            if (wantPush && client.email) {
              const fresh = await claimCronPush({ profileId: profile.id, clientId: client.id, type: 'credits_faibles', relatedId: abo.id });
              if (fresh) {
                sendPushToEmail(client.email, {
                  title: reste > 1 ? t('Plus que {n} séances 📋', { n: reste }) : t('Plus que {n} séance 📋', { n: reste }),
                  body: t('Ton carnet « {offre} » chez {studio} : pense à renouveler.', { offre, studio: profile.studio_nom }),
                  url: profile.studio_slug ? `/p/${profile.studio_slug}/espace` : '/',
                  tag: `carnet-${abo.id}`,
                }, { type: 'carnet', profileId: profile.id }).catch(() => {});
              }
            }
          } catch (e) {
            reportError('[cron notifs] credits_faibles err', e);
            totalErrors++;
          }
        }
      }

      // ─── Expiration prochaine (abos avec date_fin)
      if (abo.date_fin && abo.date_fin >= today && abo.date_fin <= dateExpMax) {
        const joursRestants = Math.ceil((new Date(abo.date_fin) - new Date(today)) / 86400000);
        try {
          const wantEmail = wantsNotif(client.notif_prefs, 'carnet', 'eleve', 'email');
          const wantPush = wantsNotif(client.notif_prefs, 'carnet', 'eleve', 'push');
          const offre = abo.offre_nom || t('abonnement');
          // « 3 octobre » ou « 3 October » ; « 3 oct. » ou « 3 Oct » pour le SMS.
          const dateFinLongue = new Date(abo.date_fin).toLocaleDateString(localeDe(t.langue), { day: 'numeric', month: 'long' });
          const dateFinCourte = new Date(abo.date_fin).toLocaleDateString(localeDe(t.langue), { day: 'numeric', month: 'short' });
          if (wantEmail) {
            const r = await sendNotifEleve(supabase, {
              profile, client, t,
              type: 'expiration_abo',
              relatedId: abo.id,
              contexte: {
                cours_nom: abo.offre_nom || t('ton abonnement'),
                jours_restants: joursRestants,
                date_fin: dateFinLongue,
              },
              templates: {
                email: {
                  sujet: joursRestants > 1
                    ? t('Ton abonnement expire dans {n} jours', { n: joursRestants })
                    : t('Ton abonnement expire dans {n} jour', { n: joursRestants }),
                  corps:
`${t('Bonjour {prenom}', { prenom })},

${joursRestants > 1
  ? t('Ton abonnement « {offre} » chez {studio} arrive à échéance le {date} (dans {n} jours).', { offre, studio: profile.studio_nom, date: dateFinLongue, n: joursRestants })
  : t('Ton abonnement « {offre} » chez {studio} arrive à échéance le {date} (dans {n} jour).', { offre, studio: profile.studio_nom, date: dateFinLongue, n: joursRestants })}

${t('Pour assurer la continuité de tes cours, pense à le renouveler avant cette date.')}

${t('À très vite')},`,
                },
                sms: {
                  corps: t('Hello {prenom}, ton abonnement {offre} chez {studio} expire dans {n}j ({date}). Pense a renouveler !', { prenom, offre: abo.offre_nom || '', studio: profile.studio_nom, n: joursRestants, date: dateFinCourte }),
                },
              },
            });
            totalSent += r.sent;
            totalSkipped += r.skipped;
          }
          if (wantPush && client.email) {
            const fresh = await claimCronPush({ profileId: profile.id, clientId: client.id, type: 'expiration_abo', relatedId: abo.id });
            if (fresh) {
              sendPushToEmail(client.email, {
                title: t('Ton abonnement expire bientôt ⏳'),
                body: t('« {offre} » chez {studio}, dans {n} j.', { offre, studio: profile.studio_nom, n: joursRestants }),
                url: profile.studio_slug ? `/p/${profile.studio_slug}/espace` : '/',
                tag: `exp-${abo.id}`,
              }, { type: 'carnet', profileId: profile.id }).catch(() => {});
            }
          }
        } catch (e) {
          reportError('[cron notifs] expiration_abo err', e);
          totalErrors++;
        }
      }
    }

    // ─────────────────────────────────────────────────────────────────
    // PASS 2 — Règles SI/ALORS personnalisées
    // ─────────────────────────────────────────────────────────────────
    const reglesActions = (regles || []).filter(r =>
      ['envoyer_email', 'envoyer_sms', 'creer_alerte_pro'].includes(r.action_type)
    );
    if (reglesActions.length === 0) continue;

    // Reconstituer (client → abos) pour réutilisation
    const clientsMap = new Map();
    for (const abo of (abos || [])) {
      const c = abo.clients;
      // Une fiche ARCHIVÉE avec un vieil abo entrait en PASS 2 et recevait
      // les emails automatiques du studio (B1g) — alignée sur clientsSeuls.
      if (!c?.id || c.statut === 'archive') continue;
      if (!clientsMap.has(c.id)) clientsMap.set(c.id, { client: c, abos: [] });
      clientsMap.get(c.id).abos.push(abo);
    }

    // Charger aussi les clients sans abo (pour règles type "statut_client" ou "toujours")
    const { data: clientsSeuls } = await supabase
      .from('clients')
      .select('id, prenom, nom, email, telephone, niveau, statut')
      .eq('profile_id', profile.id)
      .in('statut', ['prospect', 'actif', 'fidele', 'inactif']);
    for (const c of (clientsSeuls || [])) {
      if (!clientsMap.has(c.id)) clientsMap.set(c.id, { client: c, abos: [] });
    }
    // v122 : les fiches sans abo n'étaient pas dans le lot du PASS 1, un
    // seul complément pour elles (les textes par défaut d'une règle partent
    // dans la langue de l'élève ; ce que la prof a écrit reste tel quel).
    const languesSeules = await chargerLanguesFiches(supabase, (clientsSeuls || []).map(c => c.id).filter(id => !languesFiches.has(id)));
    for (const [id, l] of languesSeules) languesFiches.set(id, l);

    // Contexte présences pour "derniere_visite_jours" / "nb_reservations_30j" :
    // UNE fenêtre bornée à 365 j, jointure !inner, paginée avec erreurs lues.
    // L'ancien couple de requêtes était doublement faux (B1g) : le filtre
    // 30 j SANS !inner ne filtrait pas les lignes parentes (cap 1000 →
    // échantillon arbitraire → règles « Régulier » mortes dès ~1000
    // présences), et « dernière visite » était triée par UUID ALÉATOIRE
    // (limit 2000 plafonné à 1000) → emails « tu nous manques » envoyés à
    // des habituées — chaque jour, grâce au dédup NULL (autre rouge B1g).
    // Au-delà de 365 j sans venir = traité comme « jamais venue » (même
    // matching pour tout seuil d'inactivité raisonnable).
    const il30j = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);
    const horizon = new Date(Date.now() - 365 * 86400000).toISOString().slice(0, 10);
    const presWindow = [];
    for (let page = 0; page < 5; page++) {
      const { data: lot, error: presErr } = await supabase
        .from('presences')
        .select('client_id, cours:cours_id!inner(date)')
        .eq('profile_id', profile.id)
        .gte('cours.date', horizon)
        .order('created_at', { ascending: false })
        .range(page * 1000, page * 1000 + 999);
      if (presErr) {
        reportError('[cron notifs] presences fenêtre err:', presErr, { route: '/api/cron/notifs-eleves' });
        totalErrors++;
        break;
      }
      presWindow.push(...(lot || []));
      if (!lot || lot.length < 1000) break;
    }
    const ctxByClient = new Map();
    const lastByClient = new Map();
    for (const p of presWindow) {
      if (!p.client_id || !p.cours?.date) continue;
      if (p.cours.date >= il30j && p.cours.date <= today) {
        const c = ctxByClient.get(p.client_id) || { dates: [] };
        c.dates.push(p.cours.date);
        ctxByClient.set(p.client_id, c);
      }
      if (!lastByClient.has(p.client_id) || lastByClient.get(p.client_id) < p.cours.date) {
        lastByClient.set(p.client_id, p.cours.date);
      }
    }

    for (const { client, abos: clAbos } of clientsMap.values()) {
      if (!client?.id) continue;
      const ctx = ctxByClient.get(client.id);
      const contexte = {
        derniere_presence_at: lastByClient.get(client.id) || null,
        nb_reservations_30j: ctx?.dates?.length || 0,
      };

      const reglesQuiMatchent = evaluerReglesAll(client, clAbos, reglesActions, contexte);
      const t = traducteurPour(languesFiches, client.id, profile.id);
      const prenom = client.prenom || '';
      for (const regle of reglesQuiMatchent) {
        const params = regle.action_params || {};
        const typeNotif = `regle:${regle.id}`;

        try {
          if (regle.action_type === 'envoyer_email' && client.email) {
            const r = await sendNotifEleve(supabase, {
              profile, client, t,
              type: typeNotif,
              // relatedId NON NULL obligatoire (B1g, rouge) : l'index UNIQUE
              // (client, type, related_id, channel) considère les NULL comme
              // DISTINCTS → « une seule fois par règle » devenait un email
              // par JOUR tant que la condition restait vraie.
              relatedId: regle.id,
              contexte: {},
              prefsOverride: { email: true, sms: false },
              templates: {
                email: {
                  sujet: params.sujet || t('Un mot pour toi'),
                  corps: params.corps || `${t('Bonjour {prenom}', { prenom })},\n\n${t('À très vite')}.`,
                },
              },
            });
            totalSent += r.sent;
            totalSkipped += r.skipped;
            if (r.sent > 0) totalReglesDeclenchees++;
          }

          if (regle.action_type === 'envoyer_sms' && client.telephone) {
            const r = await sendNotifEleve(supabase, {
              profile, client, t,
              type: typeNotif,
              relatedId: regle.id, // même dédup NON NULL que l'email (B1g)
              contexte: {},
              prefsOverride: { email: false, sms: true },
              templates: {
                sms: {
                  corps: params.corps || t('Hello {prenom}, à très vite. {studio}', { prenom, studio: profile.studio_nom || '' }),
                },
              },
            });
            totalSent += r.sent;
            totalSkipped += r.skipped;
            if (r.sent > 0) totalReglesDeclenchees++;
          }

          if (regle.action_type === 'creer_alerte_pro') {
            // ⚠️ Colonnes réelles v10 = titre/corps/data (l'ancien insert
            // visait message/client_id, inexistantes → 42703 avalé : l'action
            // « Créer une alerte pro » n'a JAMAIS rien créé — audit 2026-07-25).
            // ref_key = dédup par (règle, client) : l'insert nu empilait une
            // cloche NEUVE par client matché et par jour de cron (B1g) —
            // même patron que le rappel de pointage (alertes).
            const { error: alerteErr } = await supabase.from('notifications').upsert({
              profile_id: profile.id,
              type: 'regle_match',
              ref_key: `regle_${regle.id}_${client.id}`,
              titre: regle.nom || 'Règle déclenchée',
              corps: `${client.prenom || ''} ${client.nom || ''} — ${params.message || regle.nom || ''}`.trim(),
              data: { client_id: client.id },
              lu: false,
            }, { onConflict: 'profile_id,ref_key', ignoreDuplicates: true });
            if (alerteErr) reportError('[cron notifs] alerte pro:', alerteErr.message);
            else totalReglesDeclenchees++;
          }
        } catch (e) {
          reportError('[cron notifs] regle err', regle.id, e);
          totalErrors++;
        }
      }
    }
  }

  return Response.json({
    ok: true,
    profils: profilsTraites,
    sent: totalSent,
    skipped: totalSkipped,
    profils_gates_plan: profilsGates,
    regles_declenchees: totalReglesDeclenchees,
    avis_envoyes: totalAvis,
    errors: totalErrors,
    timestamp: new Date().toISOString(),
  });
});
