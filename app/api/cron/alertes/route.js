import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { requireCronAuth } from '@/lib/api-auth';
import { sendNotifEleve } from '@/lib/notifs-eleves';
import { sendPushToEmail } from '@/lib/push-server';
import { wantsNotif } from '@/lib/notif-prefs';

// Durée max explicite (fluid compute : 300 s = plafond Hobby)
export const maxDuration = 300;

/**
 * Cron quotidien (7h UTC ≈ 9h Paris) — RAPPEL DE COURS J-1.
 *
 * Pour chaque élève inscrit·e à un cours DEMAIN, envoie un rappel (email dédupé
 * + push), gaté sur sa préférence `rappel_cours` (défaut ON). Anti no-show +
 * laisse le temps d'annuler pour libérer la place.
 *
 * Dédup : sendNotifEleve insère dans notifications_eleves avec UNIQUE
 * (client_id, type, related_id, channel) → un rappel par réservation, jamais 2.
 */
export async function GET(request) {
  try {
    requireCronAuth(request);
  } catch (res) {
    return res;
  }

  // « Demain » en heure de Paris (le serveur Vercel tourne en UTC).
  const parisDate = new Date().toLocaleString('sv-SE', { timeZone: 'Europe/Paris' }).slice(0, 10);
  const d = new Date(parisDate + 'T12:00:00Z');
  d.setUTCDate(d.getUTCDate() + 1);
  const demain = d.toISOString().slice(0, 10);

  // 1. Cours de demain, non annulés (tous studios).
  const { data: coursDemain } = await supabaseAdmin
    .from('cours')
    .select('id, nom, heure, lieu, profile_id')
    .eq('date', demain)
    .eq('est_annule', false);
  if (!coursDemain || coursDemain.length === 0) {
    return NextResponse.json({ rappels: 0, sent: 0, demain });
  }
  const coursById = Object.fromEntries(coursDemain.map(c => [c.id, c]));
  const coursIds = coursDemain.map(c => c.id);
  const profileIds = [...new Set(coursDemain.map(c => c.profile_id))];

  // 2. Présences sur ces cours (on exclut absent/excusé/annulé).
  const { data: presences } = await supabaseAdmin
    .from('presences')
    .select('id, cours_id, client_id, statut_pointage')
    .in('cours_id', coursIds);
  const pres = (presences || []).filter(p => p.client_id && !['absent', 'excuse', 'annule'].includes(p.statut_pointage));
  if (pres.length === 0) {
    return NextResponse.json({ rappels: 0, sent: 0, demain });
  }

  // 3. Clients + profils en batch (pas de N+1).
  const clientIds = [...new Set(pres.map(p => p.client_id))];
  const { data: clients } = await supabaseAdmin
    .from('clients')
    .select('id, prenom, nom, email, telephone, notif_prefs')
    .in('id', clientIds);
  const clientById = Object.fromEntries((clients || []).map(c => [c.id, c]));

  const { data: profiles } = await supabaseAdmin
    .from('profiles')
    .select('id, studio_nom, studio_slug, email_contact, notifs_eleves')
    .in('id', profileIds);
  const profileById = Object.fromEntries((profiles || []).map(p => [p.id, p]));

  const dateStr = new Date(demain + 'T12:00:00').toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });

  // 4. Envoi (email dédupé + push), gaté sur la pref élève rappel_cours.
  let sent = 0, skipped = 0, prefOff = 0;
  for (const p of pres) {
    const client = clientById[p.client_id];
    const cours = coursById[p.cours_id];
    const profile = cours ? profileById[cours.profile_id] : null;
    if (!client || !cours || !profile) continue;
    if (!wantsNotif(client.notif_prefs, 'rappel_cours', 'eleve')) { prefOff++; continue; }

    const heureStr = cours.heure ? cours.heure.slice(0, 5).replace(':', 'h') : '';
    const lieuStr = cours.lieu ? ` — ${cours.lieu}` : '';

    try {
      const r = await sendNotifEleve(supabaseAdmin, {
        profile, client,
        type: 'rappel_cours',
        relatedId: p.id,
        prefsOverride: { email: true, sms: false },
        contexte: { cours_nom: cours.nom, date: dateStr, heure: heureStr },
        templates: {
          email: {
            sujet: `Rappel : ${cours.nom} demain`,
            corps:
`Bonjour {{prenom}},

Petit rappel : tu es inscrit·e à ${cours.nom} demain ${dateStr}${heureStr ? ` à ${heureStr}` : ''}${lieuStr} chez ${profile.studio_nom}.

À demain !`,
          },
        },
      });
      sent += r.sent;
      skipped += r.skipped;

      // Push seulement si l'email a réellement été envoyé (respecte la dédup).
      if (r.sent > 0 && client.email) {
        sendPushToEmail(client.email, {
          title: `Demain : ${cours.nom} ⏰`,
          body: `${dateStr}${heureStr ? ` à ${heureStr}` : ''}${lieuStr}`,
          url: profile.studio_slug ? `/p/${profile.studio_slug}/espace` : '/',
          tag: `rappel-${p.id}`,
        }, { type: 'rappel_cours', profileId: profile.id }).catch(() => {});
      }
    } catch (e) {
      console.error('[cron alertes] rappel err', p.id, e?.message);
    }
  }

  return NextResponse.json({
    rappels: pres.length,
    sent,
    skipped,
    prefOff,
    demain,
    timestamp: new Date().toISOString(),
  });
}
