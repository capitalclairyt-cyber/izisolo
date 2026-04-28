import { requireCronAuth } from '@/lib/api-auth';
import { createClient as createAdminSupabase } from '@supabase/supabase-js';
import { sendNotifEleve } from '@/lib/notifs-eleves';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Cron quotidien (8h UTC = 9h/10h Paris selon DST) qui envoie aux élèves :
 *   - Crédits faibles : abonnements actifs avec
 *     (seances_total - seances_utilisees) <= profile.alerte_seances_seuil
 *   - Expiration prochaine : abonnements actifs avec
 *     date_fin - now <= profile.alerte_expiration_jours
 *
 * Idempotence : la table notifications_eleves a UNIQUE (client_id, type,
 * related_id, channel) → on ne re-spammera pas le même élève pour le même abo.
 *
 * Le pro contrôle on/off via profile.notifs_eleves[type].email/sms.
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

  // Charger tous les profils actifs (avec leurs préférences notifs + Twilio)
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, studio_nom, notifs_eleves, twilio_account_sid, twilio_auth_token, twilio_phone_number, alerte_seances_seuil, alerte_expiration_jours');

  let totalSent = 0, totalSkipped = 0, totalErrors = 0, profilsTraites = 0;

  for (const profile of (profiles || [])) {
    profilsTraites++;
    const seuilSeances = profile.alerte_seances_seuil || 2;
    const seuilJoursExp = profile.alerte_expiration_jours || 7;
    const dateExpMax = new Date(Date.now() + seuilJoursExp * 86400000).toISOString().slice(0, 10);

    // Charger tous les abos actifs du studio avec le client lié
    const { data: abos } = await supabase
      .from('abonnements')
      .select(`
        id, offre_nom, type, seances_total, seances_utilisees, date_fin,
        clients(id, prenom, nom, email, telephone)
      `)
      .eq('profile_id', profile.id)
      .eq('statut', 'actif');

    for (const abo of (abos || [])) {
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
              contexte: {
                cours_nom: abo.offre_nom || 'ton carnet',
                seances_restantes: reste,
              },
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
  }

  return Response.json({
    ok: true,
    profils: profilsTraites,
    sent: totalSent,
    skipped: totalSkipped,
    errors: totalErrors,
    timestamp: new Date().toISOString(),
  });
}
