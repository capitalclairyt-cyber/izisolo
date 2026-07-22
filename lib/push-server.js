import webpush from 'web-push';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { wantsNotif } from '@/lib/notif-prefs';
import { escapeIlike } from '@/lib/utils';

/**
 * lib/push-server — envoi de notifications Web Push (VAPID).
 *
 * Config par env : NEXT_PUBLIC_VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT.
 * Sans ces clés, tout est un no-op silencieux (fail-open, comme les autres
 * canaux : la feature ne casse jamais le flux métier).
 *
 * Tout est keyé sur user_id (auth.users) :
 *   - prof  → user_id = profile_id
 *   - élève → user_id résolu depuis l'email de sa fiche client
 */

let configured = false;
function ensureConfigured() {
  if (configured) return true;
  const pub = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const priv = process.env.VAPID_PRIVATE_KEY;
  if (!pub || !priv) return false;
  webpush.setVapidDetails(process.env.VAPID_SUBJECT || 'mailto:bonjour@izisolo.fr', pub, priv);
  configured = true;
  return true;
}

/**
 * Envoie une notification push à TOUS les appareils d'un user (auth.users id).
 * Non-bloquant : les erreurs sont avalées, les abonnements morts (404/410)
 * sont purgés. Retourne le nombre d'envois réussis.
 *
 * @param {string} userId  auth.users id du destinataire
 * @param {{title:string, body:string, url?:string, tag?:string}} payload
 * @param {{type?:string}} [opts]  type de notif → gate sur profiles.notif_prefs (prof)
 */
export async function sendPushToUser(userId, payload, opts = {}) {
  if (!userId || !ensureConfigured()) return 0;

  // Gate préférences prof (userId = profile_id d'un prof).
  if (opts.type) {
    const { data: prof } = await supabaseAdmin
      .from('profiles').select('notif_prefs').eq('id', userId).maybeSingle();
    if (prof && !wantsNotif(prof.notif_prefs, opts.type, 'prof', 'push')) return 0;
  }

  const { data: subs } = await supabaseAdmin
    .from('push_subscriptions')
    .select('id, endpoint, p256dh, auth')
    .eq('user_id', userId);
  if (!subs || subs.length === 0) return 0;
  return sendToSubs(subs, payload);
}

/**
 * Réserve un "slot" de push dédupé pour une notif de CRON (carnet, rappel…),
 * via notifications_eleves (UNIQUE client_id/type/related_id/channel). Retourne
 * true si c'est neuf (→ pousser), false si déjà poussé (→ ne pas re-pousser).
 * Nécessaire car un cron re-tourne : sans ça le push repartirait chaque jour.
 */
export async function claimCronPush({ profileId, clientId, type, relatedId }) {
  if (!clientId || !type) return false;
  const { error } = await supabaseAdmin.from('notifications_eleves').insert({
    profile_id: profileId, client_id: clientId, type, channel: 'push',
    related_id: relatedId || null, statut: 'sent',
  });
  return !error; // 23505 (doublon) → error → false
}

/** Envoie à une liste d'abonnements + purge les morts (404/410). Interne. */
async function sendToSubs(subs, payload) {
  const body = JSON.stringify({
    title: payload.title || 'IziSolo',
    body: payload.body || '',
    url: payload.url || '/',
    tag: payload.tag || undefined,
  });

  let ok = 0;
  const morts = [];
  await Promise.all(subs.map(async (s) => {
    try {
      await webpush.sendNotification(
        { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
        body
      );
      ok++;
    } catch (err) {
      if (err?.statusCode === 404 || err?.statusCode === 410) {
        morts.push(s.id);
      } else {
        console.error('[push] send error:', err?.statusCode, err?.body || err?.message);
      }
    }
  }));

  if (morts.length) {
    await supabaseAdmin.from('push_subscriptions').delete().in('id', morts);
  }
  return ok;
}

/**
 * Envoie une notification push à un élève par son email (colonne dénormalisée
 * sur push_subscriptions → pas de listUsers). Utile pour les événements où l'on
 * connaît l'email/la fiche client mais pas l'auth id (message, promotion LA…).
 */
export async function sendPushToEmail(email, payload, opts = {}) {
  const clean = (email || '').trim().toLowerCase();
  if (!clean || !ensureConfigured()) return 0;

  // Gate préférences élève : on lit la fiche de CE studio (profileId) pour
  // respecter son choix pour ce studio précis. Sans profileId, pas de gate.
  if (opts.type && opts.profileId) {
    const { data: c } = await supabaseAdmin
      .from('clients').select('notif_prefs')
      .eq('profile_id', opts.profileId).ilike('email', escapeIlike(clean)).maybeSingle();
    if (c && !wantsNotif(c.notif_prefs, opts.type, 'eleve', 'push')) return 0;
  }

  const { data: subs } = await supabaseAdmin
    .from('push_subscriptions')
    .select('id, endpoint, p256dh, auth')
    .ilike('email', escapeIlike(clean));

  if (!subs || subs.length === 0) return 0;
  return sendToSubs(subs, payload);
}
