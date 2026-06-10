import { Resend } from 'resend';
import * as Sentry from '@sentry/nextjs';
import { createAdminClient } from './supabase-admin';

/**
 * sendEmail — pipeline central d'envoi (Sprint 5 audit).
 *
 * TOUT email sortant passe par ici. Centralise :
 *   1. le respect de la BLACKLIST de désinscription (table email_blacklist,
 *      v39) — vérifiée avant chaque envoi de catégorie 'notification'.
 *      Avant ce sprint, la table était écrite par /api/unsubscribe mais
 *      lue NULLE PART : la désinscription n'avait aucun effet (RGPD).
 *   2. le header List-Unsubscribe (délivrabilité + conformité)
 *   3. la gestion d'erreur : log + Sentry, jamais d'exception propagée
 *
 * @param {Object} p
 * @param {string} p.to          Destinataire
 * @param {string} p.subject     Sujet
 * @param {string} p.html        Corps HTML
 * @param {string} [p.replyTo]   Reply-To (ex : email du pro)
 * @param {string} [p.from]      Défaut : RESEND_FROM_EMAIL
 * @param {'transactionnel'|'notification'} [p.categorie='notification']
 *   - 'transactionnel' : liens d'auth, confirmations directes d'une action
 *     du destinataire → IGNORE la blacklist (l'utilisateur attend cet email).
 *   - 'notification'  : relances, digests, promotions de liste d'attente,
 *     notifs de règles → respecte la blacklist + List-Unsubscribe.
 * @returns {Promise<{ok: boolean, skipped?: string, error?: string}>}
 */
export async function sendEmail({ to, subject, html, replyTo = null, from = null, categorie = 'notification' }) {
  if (!process.env.RESEND_API_KEY) {
    console.warn('[email] RESEND_API_KEY manquante — envoi ignoré :', subject);
    return { ok: false, skipped: 'no_api_key' };
  }
  const dest = (to || '').trim().toLowerCase();
  if (!dest || !dest.includes('@')) {
    return { ok: false, skipped: 'no_recipient' };
  }

  if (categorie !== 'transactionnel') {
    const blacklisted = await isBlacklisted(dest);
    if (blacklisted) {
      console.warn('[email] destinataire désinscrit, envoi ignoré :', subject);
      return { ok: false, skipped: 'blacklist' };
    }
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://www.izisolo.fr';
  try {
    const resend = new Resend(process.env.RESEND_API_KEY);
    const { error } = await resend.emails.send({
      from: from || process.env.RESEND_FROM_EMAIL || 'IziSolo <bonjour@izisolo.fr>',
      to: dest,
      subject,
      html,
      ...(replyTo ? { reply_to: replyTo } : {}),
      ...(categorie !== 'transactionnel'
        ? { headers: { 'List-Unsubscribe': `<${appUrl}/unsubscribe?email=${encodeURIComponent(dest)}>` } }
        : {}),
    });
    if (error) throw new Error(error.message || 'Resend error');
    return { ok: true };
  } catch (err) {
    console.error('[email] envoi échoué :', subject, '—', err?.message);
    Sentry.captureException(err);
    return { ok: false, error: err?.message || 'send failed' };
  }
}

/**
 * L'adresse est-elle dans la blacklist de désinscription (v39) ?
 * Fail-open : si la requête échoue, on n'empêche pas l'envoi.
 */
export async function isBlacklisted(email) {
  try {
    const admin = createAdminClient();
    const { data, error } = await admin
      .from('email_blacklist')
      .select('id')
      .eq('email', (email || '').trim().toLowerCase())
      .maybeSingle();
    if (error) throw error;
    return !!data;
  } catch (err) {
    console.warn('[email] check blacklist indisponible (fail-open) :', err?.message);
    return false;
  }
}
