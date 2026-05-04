/**
 * lib/essai.js
 *
 * Helpers pour la fonctionnalité "Cours d'essai".
 *
 * Workflow :
 *   1. createDemande() — appelée par /api/portail/[slug]/essai (service-role)
 *      - Mode 'auto' ou 'semi' : finalise immédiatement (création client + presence)
 *      - Mode 'manuel' : statut='en_attente', le pro doit valider
 *   2. validerDemande() — appelée par le pro depuis /essais (mode manuel uniquement)
 *      - Crée le client + presence + marque 'finalisee'
 *   3. refuserDemande() — pareil, marque 'refusee' avec motif
 *
 * Création de fiche client : QUE à la validation (auto/semi → immédiate /
 * manuel → après accept). Les demandes refusées ou abandonnées ne polluent
 * pas la table clients.
 */

import { Resend } from 'resend';

/**
 * Finalise une demande : crée client (si inexistant) + presence + marque
 * la demande 'finalisee'.
 *
 * @param supabase  client Supabase (service-role recommandé)
 * @param demande   { id, profile_id, cours_id, prenom, nom, email, telephone }
 * @returns { client_id, presence_id }
 */
export async function finaliserDemande(supabase, demande) {
  // 1. Trouver ou créer le client
  let clientId;
  const { data: existing } = await supabase
    .from('clients')
    .select('id')
    .eq('profile_id', demande.profile_id)
    .ilike('email', demande.email)
    .maybeSingle();

  if (existing) {
    clientId = existing.id;
  } else {
    const { data: newClient, error } = await supabase
      .from('clients')
      .insert({
        profile_id: demande.profile_id,
        prenom: demande.prenom,
        nom: demande.nom || '',
        email: demande.email,
        telephone: demande.telephone || null,
        statut: 'prospect',
        source: 'Cours d\'essai',
      })
      .select('id')
      .single();
    if (error) throw new Error('create client: ' + error.message);
    clientId = newClient.id;
  }

  // 2. Créer la presence (si pas déjà inscrit)
  const { data: existingPresence } = await supabase
    .from('presences')
    .select('id')
    .eq('cours_id', demande.cours_id)
    .eq('client_id', clientId)
    .maybeSingle();

  let presenceId = existingPresence?.id;
  if (!presenceId) {
    const { data: newPresence, error } = await supabase
      .from('presences')
      .insert({
        cours_id: demande.cours_id,
        client_id: clientId,
        profile_id: demande.profile_id,
      })
      .select('id')
      .single();
    if (error) throw new Error('create presence: ' + error.message);
    presenceId = newPresence.id;
  }

  // 3. Marquer la demande
  await supabase
    .from('cours_essai_demandes')
    .update({
      statut: 'finalisee',
      client_id: clientId,
      presence_id: presenceId,
      decided_at: new Date().toISOString(),
    })
    .eq('id', demande.id);

  return { client_id: clientId, presence_id: presenceId };
}

/**
 * Envoie l'email de confirmation au visiteur (auto/semi/manuel-validé).
 * Non-bloquant : les erreurs sont loggées mais ne font pas échouer le flow.
 */
export async function emailConfirmationVisiteur({ profileNom, studioSlug, prenom, email, cours, paiement, prix, stripeLink }) {
  if (!process.env.RESEND_API_KEY) return;
  try {
    const resend = new Resend(process.env.RESEND_API_KEY);
    const dateStr = new Date(cours.date + 'T12:00:00').toLocaleDateString('fr-FR', {
      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
    });
    const heureStr = cours.heure ? cours.heure.slice(0, 5).replace(':', 'h') : '';
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://izisolo.fr';
    const paiementBlock = paiement === 'stripe' && stripeLink
      ? `<div style="background:#fffaf0;border:1px solid #ffe0b2;border-radius:10px;padding:12px 16px;margin:0 0 16px;color:#7c4a03;font-size:0.875rem;">
           <strong>Paiement</strong><br/>
           Pour confirmer ta place, merci de régler <strong>${prix}€</strong> via ce lien :<br/>
           <a href="${stripeLink}" style="color:#635bff;font-weight:600;">${stripeLink}</a>
         </div>`
      : paiement === 'sur_place' && prix > 0
      ? `<div style="background:#fffaf0;border:1px solid #ffe0b2;border-radius:10px;padding:12px 16px;margin:0 0 16px;color:#7c4a03;font-size:0.875rem;">
           <strong>Paiement</strong> : <strong>${prix}€</strong> à régler sur place le jour du cours.
         </div>`
      : '';
    await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || 'IziSolo <no-reply@izisolo.fr>',
      to: email,
      subject: `Cours d'essai confirmé — ${cours.nom}`,
      html: `
        <div style="font-family:-apple-system,BlinkMacSystemFont,sans-serif;max-width:560px;margin:0 auto;padding:24px;">
          <h2 style="color:#d4a0a0;margin:0 0 6px;">Cours d'essai confirmé !</h2>
          <p style="color:#555;margin:0 0 16px;">Bonjour ${prenom},</p>
          <p style="color:#555;margin:0 0 12px;">Ta place est réservée pour ton cours d'essai chez <strong>${profileNom}</strong> :</p>
          <div style="background:#faf8f5;border-radius:12px;padding:16px 20px;margin:0 0 20px;">
            <strong style="font-size:1.1rem;color:#1a1a2e;">${cours.nom}</strong><br/>
            <span style="color:#888;">📅 ${dateStr}</span><br/>
            <span style="color:#888;">🕐 ${heureStr}</span>
            ${cours.lieu ? `<br/><span style="color:#888;">📍 ${cours.lieu}</span>` : ''}
          </div>
          ${paiementBlock}
          <p style="color:#888;font-size:0.8rem;margin:32px 0 0;border-top:1px solid #eee;padding-top:16px;text-align:center;">
            Propulsé par <a href="${appUrl}" style="color:#d4a0a0;">IziSolo</a>
          </p>
        </div>
      `,
    });
  } catch (err) {
    console.error('[essai] emailConfirmationVisiteur err:', err);
  }
}

/**
 * Envoie l'email "demande en cours d'examen" au visiteur (mode manuel).
 */
export async function emailEnAttenteVisiteur({ profileNom, prenom, email, cours }) {
  if (!process.env.RESEND_API_KEY) return;
  try {
    const resend = new Resend(process.env.RESEND_API_KEY);
    const dateStr = new Date(cours.date + 'T12:00:00').toLocaleDateString('fr-FR', {
      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
    });
    const heureStr = cours.heure ? cours.heure.slice(0, 5).replace(':', 'h') : '';
    await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || 'IziSolo <no-reply@izisolo.fr>',
      to: email,
      subject: `Demande de cours d'essai reçue — ${cours.nom}`,
      html: `
        <div style="font-family:-apple-system,BlinkMacSystemFont,sans-serif;max-width:560px;margin:0 auto;padding:24px;">
          <h2 style="color:#d4a0a0;margin:0 0 6px;">Demande reçue</h2>
          <p style="color:#555;margin:0 0 16px;">Bonjour ${prenom},</p>
          <p style="color:#555;margin:0 0 12px;">On a bien reçu ta demande de cours d'essai :</p>
          <div style="background:#faf8f5;border-radius:12px;padding:16px 20px;margin:0 0 20px;">
            <strong style="font-size:1.1rem;color:#1a1a2e;">${cours.nom}</strong><br/>
            <span style="color:#888;">📅 ${dateStr}</span><br/>
            <span style="color:#888;">🕐 ${heureStr}</span>
          </div>
          <p style="color:#555;margin:0 0 16px;">
            ${profileNom} va examiner ta demande et te répondra rapidement par email.
          </p>
        </div>
      `,
    });
  } catch (err) {
    console.error('[essai] emailEnAttenteVisiteur err:', err);
  }
}

/**
 * Envoie une notif email au pro (mode semi ou manuel) avec lien vers la
 * page d'admin pour valider.
 */
export async function emailNotifPro({ proEmail, proNom, modeManuel, demande, cours }) {
  if (!process.env.RESEND_API_KEY || !proEmail) return;
  try {
    const resend = new Resend(process.env.RESEND_API_KEY);
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://izisolo.fr';
    const dateStr = new Date(cours.date + 'T12:00:00').toLocaleDateString('fr-FR', {
      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
    });
    const heureStr = cours.heure ? cours.heure.slice(0, 5).replace(':', 'h') : '';
    const ctaText = modeManuel ? 'Valider ou refuser la demande' : 'Voir la demande';
    await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || 'IziSolo <no-reply@izisolo.fr>',
      to: proEmail,
      subject: modeManuel
        ? `📥 Nouvelle demande d'essai à valider — ${demande.prenom}`
        : `🆕 Nouveau cours d'essai inscrit — ${demande.prenom}`,
      html: `
        <div style="font-family:-apple-system,BlinkMacSystemFont,sans-serif;max-width:560px;margin:0 auto;padding:24px;">
          <h2 style="color:#d4a0a0;margin:0 0 6px;">${modeManuel ? 'Demande à valider' : 'Nouveau visiteur inscrit'}</h2>
          <p style="color:#555;margin:0 0 12px;">Bonjour ${proNom || ''},</p>
          <p style="color:#555;margin:0 0 16px;">
            <strong>${demande.prenom} ${demande.nom || ''}</strong> souhaite ${modeManuel ? 'venir' : 'est inscrit·e'} en cours d'essai :
          </p>
          <div style="background:#faf8f5;border-radius:12px;padding:16px 20px;margin:0 0 20px;">
            <strong style="font-size:1.05rem;color:#1a1a2e;">${cours.nom}</strong><br/>
            <span style="color:#888;">📅 ${dateStr} · 🕐 ${heureStr}</span><br/>
            <span style="color:#888;">📧 ${demande.email}</span>
            ${demande.telephone ? `<br/><span style="color:#888;">📞 ${demande.telephone}</span>` : ''}
            ${demande.message_visiteur ? `<br/><br/><em style="color:#666;">"${demande.message_visiteur}"</em>` : ''}
          </div>
          <div style="text-align:center;margin:0 0 20px;">
            <a href="${appUrl}/essais" style="display:inline-block;background:#d4a0a0;color:white;text-decoration:none;padding:12px 28px;border-radius:10px;font-weight:600;">
              ${ctaText}
            </a>
          </div>
        </div>
      `,
    });
  } catch (err) {
    console.error('[essai] emailNotifPro err:', err);
  }
}
