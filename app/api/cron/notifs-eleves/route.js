import { withRoute } from '@/lib/api-route';
import { createAdminClient } from '@/lib/supabase-admin';
import { sendNotifEleve } from '@/lib/notifs-eleves';
import { sendPushToEmail, claimCronPush } from '@/lib/push-server';
import { wantsNotif } from '@/lib/notif-prefs';
import { evaluerReglesAll } from '@/lib/regles';
import { can } from '@/lib/plan-guard';
import { reportError } from '@/lib/report';

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

export const GET = withRoute({ auth: 'cron' }, async () => {
  const supabase = createAdminClient();

  const today = new Date().toISOString().slice(0, 10);

  // Charger tous les profils (avec préférences notifs + champs plan pour le
  // gate capacité — sans eux, can() lirait undefined → tout le monde gâté).
  const { data: profiles } = await supabase
    .from('profiles')
    // studio_slug : indispensable aux URLs des push (sans lui, tous les push
    // carnet/expiration pointaient sur « / » — audit 2026-07-25).
    .select('id, studio_nom, studio_slug, notifs_eleves, alerte_seances_seuil, alerte_expiration_jours, sms_seuil_mois, plan, trial_started_at, stripe_subscription_status');

  let totalSent = 0, totalSkipped = 0, totalErrors = 0, totalReglesDeclenchees = 0, profilsTraites = 0, profilsGates = 0;

  for (const profile of (profiles || [])) {
    // Gate capacité (B3b — fuite connue depuis B1g) : les notifs auto élèves
    // sont une capacité Complet. Un studio Essentiel ne déclenche RIEN ici —
    // avant, la feature Pro tournait gratuitement pour tous les plans.
    if (!can(profile, 'notifs_eleves_auto')) { profilsGates++; continue; }
    profilsTraites++;
    const seuilSeances = profile.alerte_seances_seuil || 2;
    const seuilJoursExp = profile.alerte_expiration_jours || 7;
    const dateExpMax = new Date(Date.now() + seuilJoursExp * 86400000).toISOString().slice(0, 10);

    // Charger règles actives du profil pour évaluation custom (PASS 2)
    const { data: regles } = await supabase
      .from('regles')
      .select('*')
      .eq('profile_id', profile.id)
      .eq('actif', true);

    // Charger tous les abos actifs du studio avec le client lié
    const { data: abos } = await supabase
      .from('abonnements')
      .select(`
        id, offre_nom, type, seances_total, seances_utilisees, date_fin, statut,
        clients(id, prenom, nom, email, telephone, niveau, statut, notif_prefs)
      `)
      .eq('profile_id', profile.id);

    // ─────────────────────────────────────────────────────────────────
    // PASS 1 — Notifs système (crédits faibles + expiration)
    // ─────────────────────────────────────────────────────────────────
    for (const abo of (abos || []).filter(a => a.statut === 'actif')) {
      const client = abo.clients;
      if (!client?.id || !client?.email) continue;

      // ─── Crédits faibles (carnets uniquement)
      if (abo.seances_total != null) {
        const reste = abo.seances_total - (abo.seances_utilisees || 0);
        if (reste > 0 && reste <= seuilSeances) {
          try {
            const wantEmail = wantsNotif(client.notif_prefs, 'carnet', 'eleve', 'email');
            const wantPush = wantsNotif(client.notif_prefs, 'carnet', 'eleve', 'push');
            if (wantEmail) {
              const r = await sendNotifEleve(supabase, {
                profile, client,
                type: 'credits_faibles',
                relatedId: abo.id,
                contexte: { cours_nom: abo.offre_nom || 'ton carnet', seances_restantes: reste },
                templates: {
                  email: {
                    sujet: `Plus que ${reste} séance${reste > 1 ? 's' : ''} sur ton carnet`,
                    corps:
`Bonjour {{prenom}},

Petit rappel amical : il te reste seulement ${reste} séance${reste > 1 ? 's' : ''} sur ton carnet « ${abo.offre_nom || 'carnet'} » chez ${profile.studio_nom}.

Pour ne pas être pris·e de court, n'hésite pas à renouveler dès que possible — on aura toujours plaisir à te revoir.

À très vite,`,
                  },
                  sms: {
                    corps: `Hello {{prenom}}, plus que ${reste} seance${reste > 1 ? 's' : ''} sur ton carnet ${abo.offre_nom || ''} chez ${profile.studio_nom}. Pense a renouveler !`,
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
                  title: `Plus que ${reste} séance${reste > 1 ? 's' : ''} 📋`,
                  body: `Ton carnet « ${abo.offre_nom || 'carnet'} » chez ${profile.studio_nom} — pense à renouveler.`,
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
          if (wantEmail) {
            const r = await sendNotifEleve(supabase, {
              profile, client,
              type: 'expiration_abo',
              relatedId: abo.id,
              contexte: {
                cours_nom: abo.offre_nom || 'ton abonnement',
                jours_restants: joursRestants,
                date_fin: new Date(abo.date_fin).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' }),
              },
              templates: {
                email: {
                  sujet: `Ton abonnement expire dans ${joursRestants} jour${joursRestants > 1 ? 's' : ''}`,
                  corps:
`Bonjour {{prenom}},

Ton abonnement « ${abo.offre_nom || 'abonnement'} » chez ${profile.studio_nom} arrive à échéance le ${new Date(abo.date_fin).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })} (dans ${joursRestants} jour${joursRestants > 1 ? 's' : ''}).

Pour assurer la continuité de tes cours, pense à le renouveler avant cette date.

À très vite,`,
                },
                sms: {
                  corps: `Hello {{prenom}}, ton abonnement ${abo.offre_nom || ''} chez ${profile.studio_nom} expire dans ${joursRestants}j (${new Date(abo.date_fin).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}). Pense a renouveler !`,
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
                title: `Ton abonnement expire bientôt ⏳`,
                body: `« ${abo.offre_nom || 'abonnement'} » chez ${profile.studio_nom} — dans ${joursRestants} j.`,
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
      for (const regle of reglesQuiMatchent) {
        const params = regle.action_params || {};
        const typeNotif = `regle:${regle.id}`;

        try {
          if (regle.action_type === 'envoyer_email' && client.email) {
            const r = await sendNotifEleve(supabase, {
              profile, client,
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
                  sujet: params.sujet || 'Un mot pour toi',
                  corps: params.corps || 'Bonjour {{prenom}},\n\nÀ très vite.',
                },
              },
            });
            totalSent += r.sent;
            totalSkipped += r.skipped;
            if (r.sent > 0) totalReglesDeclenchees++;
          }

          if (regle.action_type === 'envoyer_sms' && client.telephone) {
            const r = await sendNotifEleve(supabase, {
              profile, client,
              type: typeNotif,
              relatedId: regle.id, // même dédup NON NULL que l'email (B1g)
              contexte: {},
              prefsOverride: { email: false, sms: true },
              templates: {
                sms: {
                  corps: params.corps || 'Hello {{prenom}}, à très vite — {{studio}}',
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
    errors: totalErrors,
    timestamp: new Date().toISOString(),
  });
});
