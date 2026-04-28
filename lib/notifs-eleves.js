/**
 * Helper unifié pour envoyer des notifications aux élèves (email + SMS).
 *
 * Architecture (modèle économique) :
 *   - Email : Resend Mélutek (RESEND_API_KEY global) — inclus dans tous les plans
 *   - SMS   : Twilio Mélutek (TWILIO_ACCOUNT_SID/AUTH_TOKEN/PHONE_NUMBER global)
 *             facturé 0,10 €/SMS au pro sur sa facture mensuelle.
 *             Conso trackée via notifications_eleves (channel='sms', statut='sent')
 *             → comptage trivial dans le job de facturation Stripe SaaS mensuel.
 *
 * Idempotence : UNIQUE (client_id, type, related_id, channel) sur la table.
 *
 * Usage :
 *   import { sendNotifEleve } from '@/lib/notifs-eleves';
 *   await sendNotifEleve(supabaseAdmin, {
 *     profile, client, type, relatedId, contexte, templates,
 *   });
 */

export const SMS_PRIX_UNITAIRE = 0.10; // EUR — facturé au pro

import { appliquerVariables } from './templates-defaut';

export async function sendNotifEleve(supabase, opts) {
  const { profile, client, type, relatedId = null, contexte = {}, templates } = opts;
  if (!profile?.id || !client?.id || !type || !templates) {
    console.warn('[notifs-eleves] params manquants', { profile_id: profile?.id, client_id: client?.id, type });
    return { sent: 0, skipped: 0 };
  }

  const prefs = profile.notifs_eleves?.[type] || { email: false, sms: false };
  const ctx = {
    prenom: client.prenom || '',
    nom: client.nom || '',
    studio: profile.studio_nom || '',
    ...contexte,
  };

  let sent = 0, skipped = 0;

  // ─── Email
  if (prefs.email && client.email && templates.email) {
    const result = await tryInsertAndSendEmail(supabase, {
      profile, client, type, relatedId,
      sujet: appliquerVariables(templates.email.sujet, ctx),
      corps: appliquerVariables(templates.email.corps, ctx),
    });
    if (result === 'sent') sent++;
    else if (result === 'skipped') skipped++;
  }

  // ─── SMS (Twilio Mélutek global, facturé au pro 0,10€/SMS)
  if (prefs.sms && client.telephone && templates.sms && process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_PHONE_NUMBER) {
    const result = await tryInsertAndSendSms(supabase, {
      profile, client, type, relatedId,
      corps: appliquerVariables(templates.sms.corps, ctx),
    });
    if (result === 'sent') sent++;
    else if (result === 'skipped') skipped++;
  }

  return { sent, skipped };
}

// ─── Email via Resend ───────────────────────────────────────────────────────
async function tryInsertAndSendEmail(supabase, { profile, client, type, relatedId, sujet, corps }) {
  // Idempotence : tente l'insert d'abord, si conflit → skip
  const { error: insertErr } = await supabase
    .from('notifications_eleves')
    .insert({
      profile_id: profile.id,
      client_id: client.id,
      email: client.email,
      type,
      channel: 'email',
      statut: 'sent', // optimiste, on update si fail
      sujet,
      related_id: relatedId,
    });

  if (insertErr) {
    if (insertErr.code === '23505') return 'skipped'; // unique violation = déjà envoyé
    console.error('[notifs-eleves] insert email error:', insertErr);
    return 'failed';
  }

  // Send via Resend
  if (!process.env.RESEND_API_KEY) {
    await markFailed(supabase, profile.id, client.id, type, relatedId, 'email', 'RESEND_API_KEY manquante');
    return 'failed';
  }
  try {
    const { Resend } = await import('resend');
    const resend = new Resend(process.env.RESEND_API_KEY);
    await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || 'IziSolo <no-reply@izisolo.fr>',
      to: client.email,
      subject: sujet,
      html: htmlWrap(corps, profile.studio_nom),
    });
    return 'sent';
  } catch (err) {
    console.error('[notifs-eleves] resend send error:', err);
    await markFailed(supabase, profile.id, client.id, type, relatedId, 'email', err.message?.slice(0, 200));
    return 'failed';
  }
}

// ─── SMS via Twilio (du pro) ────────────────────────────────────────────────
async function tryInsertAndSendSms(supabase, { profile, client, type, relatedId, corps }) {
  const { error: insertErr } = await supabase
    .from('notifications_eleves')
    .insert({
      profile_id: profile.id,
      client_id: client.id,
      telephone: client.telephone,
      type,
      channel: 'sms',
      statut: 'sent',
      related_id: relatedId,
    });

  if (insertErr) {
    if (insertErr.code === '23505') return 'skipped';
    console.error('[notifs-eleves] insert sms error:', insertErr);
    return 'failed';
  }

  // Twilio Mélutek global (env vars), pas par pro
  const sid   = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  const from  = process.env.TWILIO_PHONE_NUMBER;
  try {
    const auth = Buffer.from(`${sid}:${token}`).toString('base64');
    const body = new URLSearchParams({
      From: from,
      To: normaliserTelephone(client.telephone),
      Body: corps.slice(0, 459),
    });
    const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
      method: 'POST',
      headers: { 'Authorization': `Basic ${auth}`, 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
    });
    if (!res.ok) {
      const errText = await res.text().catch(() => 'unknown');
      throw new Error(`Twilio ${res.status}: ${errText.slice(0, 150)}`);
    }
    return 'sent';
  } catch (err) {
    console.error('[notifs-eleves] twilio send error:', err);
    await markFailed(supabase, profile.id, client.id, type, relatedId, 'sms', err.message?.slice(0, 200));
    return 'failed';
  }
}

/**
 * Compte la conso SMS d'un pro sur le mois en cours (ou un mois spécifique).
 * Sert au calcul de la facture mensuelle SaaS.
 */
export async function compterSmsMois(supabase, profileId, dateRef = new Date()) {
  const debutMois = new Date(dateRef.getFullYear(), dateRef.getMonth(), 1).toISOString();
  const debutMoisSuivant = new Date(dateRef.getFullYear(), dateRef.getMonth() + 1, 1).toISOString();
  const { count } = await supabase
    .from('notifications_eleves')
    .select('id', { count: 'exact', head: true })
    .eq('profile_id', profileId)
    .eq('channel', 'sms')
    .eq('statut', 'sent')
    .gte('sent_at', debutMois)
    .lt('sent_at', debutMoisSuivant);
  return {
    count: count || 0,
    montant: parseFloat(((count || 0) * SMS_PRIX_UNITAIRE).toFixed(2)),
  };
}

async function markFailed(supabase, profileId, clientId, type, relatedId, channel, errorMessage) {
  await supabase
    .from('notifications_eleves')
    .update({ statut: 'failed', error_message: errorMessage })
    .eq('profile_id', profileId)
    .eq('client_id', clientId)
    .eq('type', type)
    .eq('channel', channel)
    .is('related_id', relatedId);
}

// ─── HTML wrapper basique pour les emails (consistance visuelle) ────────────
function htmlWrap(corps, studioNom) {
  // Convertit \n en <br/> et garde la simplicité
  const corpsHtml = String(corps || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\n/g, '<br/>');
  return `
    <div style="font-family: -apple-system, BlinkMacSystemFont, sans-serif; max-width: 560px; margin: 0 auto; padding: 24px; color: #555; line-height: 1.6;">
      ${corpsHtml}
      <p style="color: #aaa; font-size: 0.8rem; margin: 32px 0 0; border-top: 1px solid #eee; padding-top: 16px; text-align: center;">
        ${studioNom || 'Studio'} · Propulsé par <a href="https://izisolo.fr" style="color: #d4a0a0;">IziSolo</a>
      </p>
    </div>
  `;
}

function normaliserTelephone(tel) {
  // Convertit "06 12 34 56 78" -> "+33612345678" (format E.164 attendu par Twilio)
  if (!tel) return tel;
  const cleaned = tel.replace(/[\s.\-()]/g, '');
  if (cleaned.startsWith('+')) return cleaned;
  if (cleaned.startsWith('0033')) return '+33' + cleaned.slice(4);
  if (cleaned.startsWith('0') && cleaned.length === 10) return '+33' + cleaned.slice(1);
  return cleaned;
}
