import { sendEmail } from './email';
import { createAdminClient } from './supabase-admin';
import { wantsNotif } from './notif-prefs';
import { reportError } from './report';

/**
 * Email instantané « {studio} t'a écrit » — 2026-08-01, demande Colin après
 * l'incident pleine lune : fini le rythme du digest 16 h UTC, l'élève est
 * prévenue par email DÈS que la prof envoie (annonce, message 1-à-1, groupe).
 *
 * Garde-fous :
 *   • pref élève `notif_prefs.message.email` (même toggle que le digest)
 *   • blacklist + List-Unsubscribe via sendEmail (pipeline central)
 *   • dédup/claim dans emails_envoyes (type 'message_instant') :
 *       - annonce  → ref `${profileId}:batch:${batchId}` (1 email par batch,
 *         chaque annonce est un envoi délibéré — pas de cooldown)
 *       - fil 1-à-1/groupe → ref `${profileId}:conv:${convId}:${bucket3h}` +
 *         check de la tranche précédente = cooldown 3-6 h par conversation
 *         (une discussion active ne mitraille pas la boîte mail)
 *   • claim AVANT envoi, libéré si l'envoi échoue (pattern digest/B1g) —
 *     et le digest de 16 h reste en FILET : il skip les élèves déjà
 *     notifiés en instantané, et rattrape les autres (échec d'envoi,
 *     messages antérieurs au déploiement).
 *
 * Le digest côté PRO (élève → prof) est inchangé.
 */

const COOLDOWN_MS = 3 * 3600 * 1000; // tranche de 3 h

export function escapeHtml(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Rendu HTML de l'email (exporté pour la preuve visuelle / tests).
 */
export function renderEmailMessageInstant({ prenom, studioNom, contenu = '', nbPieces = 0, url }) {
  const extrait = (contenu || '').trim().slice(0, 300);
  const suspension = (contenu || '').trim().length > 300 ? '…' : '';
  const mentionPieces = nbPieces > 0
    ? `📷 ${nbPieces} photo${nbPieces > 1 ? 's' : ''} ou fichier${nbPieces > 1 ? 's' : ''} joint${nbPieces > 1 ? 's' : ''} — à voir dans ton espace`
    : '';

  return `
    <div style="font-family: -apple-system, BlinkMacSystemFont, sans-serif; max-width: 560px; margin: 0 auto; padding: 24px; color: #555; line-height: 1.6;">
      <p>Bonjour ${escapeHtml(prenom || 'là')},</p>
      <p><strong>${escapeHtml(studioNom)}</strong> t'a envoyé un message :</p>
      ${extrait ? `
      <blockquote style="margin: 16px 0; padding: 12px 16px; background: #faf6f3; border-left: 3px solid #d4a0a0; border-radius: 0 8px 8px 0; color: #444; white-space: pre-line;">${escapeHtml(extrait)}${suspension}</blockquote>` : ''}
      ${mentionPieces ? `<p style="color: #777; font-size: 0.9rem;">${mentionPieces}</p>` : ''}
      <p style="text-align: center; margin: 24px 0;">
        <a href="${url}" style="display: inline-block; padding: 10px 20px; background: #d4a0a0; color: white; text-decoration: none; border-radius: 99px; font-weight: 600;">
          Lire et répondre
        </a>
      </p>
      <p style="color: #aaa; font-size: 0.8rem; margin: 32px 0 0; border-top: 1px solid #eee; padding-top: 16px; text-align: center;">
        Tu reçois cet email dès que ${escapeHtml(studioNom)} t'écrit. Tu peux le désactiver dans ton espace élève, réglages de notifications (section « Messages »).
        <br/>Propulsé par <a href="https://www.izisolo.fr" style="color: #d4a0a0;">IziSolo</a>
      </p>
    </div>
  `;
}

/**
 * Envoie l'email instantané aux fiches destinataires (séquentiel — la limite
 * Resend est ~2 req/s ; à appeler depuis after() pour ne pas retarder la
 * réponse HTTP).
 *
 * @param {Object} p
 * @param {string}   p.profileId       studio expéditeur
 * @param {string}   p.studioNom
 * @param {string}   p.studioSlug
 * @param {string?}  p.replyTo         email de la prof (les réponses mail lui arrivent)
 * @param {string[]} p.clientIds       fiches destinataires
 * @param {string}   p.contenu         texte du message (extrait cité dans l'email)
 * @param {number}   p.nbPieces        nb de pièces jointes
 * @param {string?}  p.batchId         annonce → dédup par batch
 * @param {string?}  p.conversationId  fil → cooldown 3-6 h par conversation
 * @returns {Promise<{sent: number, skipped: number, failed: number}>}
 */
export async function envoyerEmailsMessageInstant({
  profileId, studioNom, studioSlug, replyTo = null,
  clientIds = [], contenu = '', nbPieces = 0,
  batchId = null, conversationId = null,
}) {
  const bilan = { sent: 0, skipped: 0, failed: 0 };
  if (!profileId || clientIds.length === 0) return bilan;
  if (!batchId && !conversationId) return bilan;

  const admin = createAdminClient();
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://www.izisolo.fr';
  const url = studioSlug ? `${appUrl}/p/${studioSlug}/espace/messages` : appUrl;

  // .eq(profile_id) en ceinture-bretelles : même si un appelant passait des
  // ids d'un autre studio, aucun email ne partirait en son nom.
  const { data: clients, error } = await admin
    .from('clients')
    .select('id, prenom, email, notif_prefs')
    .in('id', clientIds)
    .eq('profile_id', profileId);
  if (error) {
    reportError('[messagerie] email instant — lecture clients err:', error);
    return bilan;
  }

  // Dédup par email (annonce « tous » peut viser 2 fiches de même adresse)
  const vus = new Set();
  for (const c of (clients || [])) {
    const dest = (c.email || '').trim().toLowerCase();
    if (!dest || vus.has(dest)) { bilan.skipped++; continue; }
    vus.add(dest);
    if (!wantsNotif(c.notif_prefs, 'message', 'eleve', 'email')) { bilan.skipped++; continue; }

    // Référence de dédup — préfixée profileId pour que le digest-filet
    // sache « cet·te élève a déjà été notifié·e pour CE studio ».
    let ref;
    if (batchId) {
      ref = `${profileId}:batch:${batchId}`;
    } else {
      const bucket = Math.floor(Date.now() / COOLDOWN_MS);
      ref = `${profileId}:conv:${conversationId}:${bucket}`;
      // Cooldown : déjà notifié·e pour cette conversation dans la tranche
      // courante OU la précédente → silence (elle est déjà au courant).
      const refPrecedente = `${profileId}:conv:${conversationId}:${bucket - 1}`;
      const { data: recents, error: cdErr } = await admin
        .from('emails_envoyes')
        .select('id')
        .eq('type', 'message_instant')
        .eq('destinataire', dest)
        .in('ref', [ref, refPrecedente])
        .limit(1);
      if (!cdErr && (recents || []).length > 0) { bilan.skipped++; continue; }
    }

    // Claim avant envoi (un retry/double-appel ne double-envoie pas)
    let claimed = true, persisted = false;
    try {
      const { data: claim, error: clErr } = await admin
        .from('emails_envoyes')
        .upsert(
          { type: 'message_instant', destinataire: dest, ref },
          { onConflict: 'type,destinataire,ref', ignoreDuplicates: true }
        )
        .select('id');
      if (clErr) throw clErr;
      claimed = (claim || []).length > 0;
      persisted = true;
    } catch (err) {
      // Fail-open : dédup indisponible → on envoie quand même (pattern digest)
      console.warn('[messagerie] email instant — dédup indisponible :', err?.message);
    }
    if (!claimed) { bilan.skipped++; continue; }

    const r = await sendEmail({
      categorie: 'notification',
      to: dest,
      subject: `${studioNom} t'a écrit`,
      replyTo,
      html: renderEmailMessageInstant({ prenom: c.prenom, studioNom, contenu, nbPieces, url }),
    });
    if (r.ok) bilan.sent++;
    else {
      bilan.failed++;
      // Échec → on libère le claim : le digest de 16 h rattrapera.
      if (persisted) {
        await admin.from('emails_envoyes').delete()
          .match({ type: 'message_instant', destinataire: dest, ref })
          .then(() => {}, () => {});
      }
    }
  }
  return bilan;
}
