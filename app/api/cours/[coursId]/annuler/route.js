import { requireAuth } from '@/lib/api-auth';
import { createClient as createAdminSupabase } from '@supabase/supabase-js';
import { sendNotifEleve } from '@/lib/notifs-eleves';
import { getRegle } from '@/lib/regles-metier';

export const runtime = 'nodejs';

/**
 * Annule un cours côté pro et envoie une notification email/SMS automatique
 * à tous les inscrits. Le pro ne se positionne plus en "porteur de mauvaise
 * nouvelle" — l'app se charge de tout.
 *
 * POST /api/cours/[coursId]/annuler
 *   Body : { raison?: string }    — message optionnel à inclure dans l'email
 */

export async function POST(request, { params }) {
  let user;
  try {
    ({ user } = await requireAuth());
  } catch (res) {
    return res;
  }

  const { coursId } = await params;
  let body = {};
  try { body = await request.json(); } catch {}
  const raison = (body.raison || '').toString().trim().slice(0, 500);

  const supabaseAdmin = createAdminSupabase(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  // Vérifie ownership + récupère le cours
  const { data: cours } = await supabaseAdmin
    .from('cours')
    .select('id, nom, date, heure, lieu, est_annule, profile_id')
    .eq('id', coursId)
    .eq('profile_id', user.id)
    .single();

  if (!cours) return Response.json({ error: 'Cours introuvable' }, { status: 404 });
  if (cours.est_annule) return Response.json({ error: 'Cours déjà annulé' }, { status: 409 });

  // Profile complet (pour twilio + notifs_eleves + règles métier)
  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('id, studio_nom, notifs_eleves, regles_metier, twilio_account_sid, twilio_auth_token, twilio_phone_number')
    .eq('id', user.id)
    .single();

  const regleAnnul = getRegle({ regles_metier: profile?.regles_metier }, 'cours_annule_prof');

  // Marquer le cours annulé
  const { error: updateErr } = await supabaseAdmin
    .from('cours')
    .update({ est_annule: true })
    .eq('id', coursId)
    .eq('profile_id', user.id);

  if (updateErr) {
    console.error('[cours/annuler] update error:', updateErr);
    return Response.json({ error: 'Erreur lors de l\'annulation' }, { status: 500 });
  }

  // Envoyer notifications aux inscrits + restituer crédits selon règle
  const { data: presences } = await supabaseAdmin
    .from('presences')
    .select('id, abonnement_id, client:client_id(id, prenom, nom, email, telephone)')
    .eq('cours_id', coursId)
    .eq('profile_id', user.id);

  const dateStr = cours.date
    ? new Date(cours.date + 'T12:00:00').toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })
    : 'la date prévue';
  const heureStr = cours.heure ? cours.heure.slice(0, 5).replace(':', 'h') : '';

  const sujet = `Cours annulé — ${cours.nom}`;
  const corpsBase =
`Bonjour {{prenom}},

Le cours « ${cours.nom} » du ${dateStr}${heureStr ? ` à ${heureStr}` : ''} est annulé.${raison ? `\n\nMotif : ${raison}` : ''}

Si tu utilisais un crédit pour ce cours, il sera bien restitué automatiquement (rien à faire).

Désolé·e pour le désagrément, à très vite.`;

  const corpsSms = `Cours annule : « ${cours.nom} » du ${dateStr}${heureStr ? ` ${heureStr}` : ''}. ${raison ? raison + ' ' : ''}Ton credit est restitue. — ${profile?.studio_nom || 'Studio'}`;

  const templates = {
    email: { sujet, corps: corpsBase },
    sms: { corps: corpsSms },
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
    clientsNotifies++;

    // 1) Restitution du crédit si rendre_seances + abonnement lié
    if (isAutoRendre && row.abonnement_id) {
      try {
        const { data: abo } = await supabaseAdmin
          .from('abonnements')
          .select('seances_utilisees')
          .eq('id', row.abonnement_id)
          .single();
        if (abo && (abo.seances_utilisees || 0) > 0) {
          await supabaseAdmin
            .from('abonnements')
            .update({ seances_utilisees: (abo.seances_utilisees || 0) - 1 })
            .eq('id', row.abonnement_id);
          creditsRestitues++;
        }
      } catch (e) { console.warn('[annuler] credit non-restitue:', e?.message); }
    }

    // 2) Log dans cas_a_traiter pour modes 'eleve_choisit' ou 'manuel'
    //    (la prof devra valider la décision pour cet élève)
    if (regleAnnul.mode === 'manuel' || regleAnnul.choix === 'eleve_choisit') {
      try {
        await supabaseAdmin.from('cas_a_traiter').insert({
          profile_id: user.id,
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

    // 3) Envoyer la notif email/SMS standard
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

  return Response.json({
    ok: true,
    notifications: { envoyees: sentTotal, ignorees: skippedTotal, clients: clientsNotifies },
    credits_restitues: creditsRestitues,
    cas_loggés: casLoggés,
    regle_appliquée: regleAnnul.mode === 'auto' ? regleAnnul.choix : 'manuel',
  });
}
