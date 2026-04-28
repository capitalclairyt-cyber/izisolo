import { requireCronAuth } from '@/lib/api-auth';
import { createClient as createAdminSupabase } from '@supabase/supabase-js';
import { sendNotifEleve } from '@/lib/notifs-eleves';
import { evaluerReglesAll } from '@/lib/regles';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

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

export async function GET(request) {
  try {
    requireCronAuth(request);
  } catch (res) {
    return res;
  }

  const supabase = createAdminSupabase(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  const today = new Date().toISOString().slice(0, 10);

  // Charger tous les profils (avec préférences notifs)
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, studio_nom, notifs_eleves, alerte_seances_seuil, alerte_expiration_jours, sms_seuil_mois');

  let totalSent = 0, totalSkipped = 0, totalErrors = 0, totalReglesDeclenchees = 0, profilsTraites = 0;

  for (const profile of (profiles || [])) {
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
        clients(id, prenom, nom, email, telephone, niveau, statut)
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
          } catch (e) {
            console.error('[cron notifs] credits_faibles err', e);
            totalErrors++;
          }
        }
      }

      // ─── Expiration prochaine (abos avec date_fin)
      if (abo.date_fin && abo.date_fin >= today && abo.date_fin <= dateExpMax) {
        const joursRestants = Math.ceil((new Date(abo.date_fin) - new Date(today)) / 86400000);
        try {
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
        } catch (e) {
          console.error('[cron notifs] expiration_abo err', e);
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
      if (!c?.id) continue;
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

    // Pour les conditions "derniere_visite_jours" et "nb_reservations_30j_min",
    // on charge le contexte par client (présences récentes).
    const il30j = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);
    const { data: presences30j } = await supabase
      .from('presences')
      .select('client_id, cours:cours_id (date)')
      .eq('profile_id', profile.id)
      .gte('cours.date', il30j);

    const ctxByClient = new Map();
    for (const p of (presences30j || [])) {
      if (!p.client_id || !p.cours?.date) continue;
      const c = ctxByClient.get(p.client_id) || { dates: [] };
      c.dates.push(p.cours.date);
      ctxByClient.set(p.client_id, c);
    }
    // Charger aussi la dernière présence de chaque client (pour derniere_visite_jours)
    const { data: dernieresPresences } = await supabase
      .from('presences')
      .select('client_id, cours:cours_id (date)')
      .eq('profile_id', profile.id)
      .order('id', { ascending: false })
      .limit(2000);
    const lastByClient = new Map();
    for (const p of (dernieresPresences || [])) {
      if (!p.client_id || !p.cours?.date) continue;
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
              relatedId: null,
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
              relatedId: null,
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
            // Insertion dans la table notifications (alertes côté pro, v10) si elle existe
            await supabase.from('notifications').insert({
              profile_id: profile.id,
              type: 'regle_match',
              titre: regle.nom || 'Règle déclenchée',
              message: `${client.prenom || ''} ${client.nom || ''} — ${params.message || regle.nom || ''}`.trim(),
              client_id: client.id,
              lu: false,
            }).then(() => {
              totalReglesDeclenchees++;
            }, () => { /* ignore si table absente ou doublon */ });
          }
        } catch (e) {
          console.error('[cron notifs] regle err', regle.id, e);
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
    regles_declenchees: totalReglesDeclenchees,
    errors: totalErrors,
    timestamp: new Date().toISOString(),
  });
}
