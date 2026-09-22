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

import { sendEmail } from './email';
import { infosPratiquesBlock } from '@/lib/email-helpers';
import { poserSourcePresence } from './bilan-essai-service';
import { traducteur } from './i18n-portail';

/** « 18h30 » en français, « 18:30 » en anglais. */
function heureLisible(heure, langue) {
  if (!heure) return '';
  return langue === 'en' ? heure.slice(0, 5) : heure.slice(0, 5).replace(':', 'h');
}

/** « 12€ » en français, « €12 » en anglais. */
function prixLisible(prix, langue) {
  return langue === 'en' ? `€${prix}` : `${prix}€`;
}

/**
 * Finalise une demande : crée client (si inexistant) + presence + marque
 * la demande 'finalisee'.
 *
 * @param supabase  client Supabase (service-role recommandé)
 * @param demande   { id, profile_id, cours_id, prenom, nom, email, telephone }
 * @param options   { langue } : la langue des refus métier qui remontent à
 *                  l'élève (complet, annulé, introuvable). Défaut 'fr' : la
 *                  route de la prof les lit en français.
 * @returns { client_id, presence_id }
 */
export async function finaliserDemande(supabase, demande, { langue = 'fr' } = {}) {
  const t = traducteur(langue);
  // 1. Trouver ou créer le client
  let clientId;
  const { data: existing } = await supabase
    .from('clients')
    .select('id')
    .eq('profile_id', demande.profile_id)
    .ilike('email', (demande.email || '').replace(/([%_\\])/g, '\\$1')) // échappe jokers ilike
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
    if (error?.code === '23505') {
      // Index anti-doublon nom+prénom (clients_unique_nom_prenom) : une fiche
      // existe déjà à ce nom avec une AUTRE adresse. On ne rattache jamais par
      // nom (fiche d'autrui) → erreur métier typée, que les routes rendent en
      // 409 lisible au lieu d'un 500 (cf. incident Carmen à la résa, 29/07).
      const err = new Error(`Une fiche « ${[demande.prenom, demande.nom].filter(Boolean).join(' ')} » existe déjà dans ce studio, avec une autre adresse email que ${demande.email} : vérifie/corrige l'une des deux (ou fusionne les fiches), puis réessaie.`);
      err.code = 'fiche_homonyme';
      throw err;
    }
    if (error) throw new Error('create client: ' + error.message);
    clientId = newClient.id;
  }

  // 2. Créer la presence via la RPC atomique v53 (audit 2026-07-25).
  // Avant : INSERT direct sans AUCUN contrôle — l'essai était la seule porte
  // élève qui ignorait la capacité (cours 8/8 → 9/8, liste d'attente
  // court-circuitée) et l'annulation du cours. Et la présence naissait en
  // type 'normal' → la séance d'essai GRATUITE se faisait décompter du
  // carnet acheté le jour même (trou dans la promesse v70), et le compteur
  // d'essais du pointage ne la voyait pas.
  let presenceId;
  const { data: resa, error: resaErr } = await supabase.rpc('reserver_place', {
    p_profile_id: demande.profile_id,
    p_cours_id: demande.cours_id,
    p_client_id: clientId,
    p_abonnement_id: null,
    p_type_presence: 'essai',
  });
  if (resaErr) throw new Error('reserver_place: ' + resaErr.message);
  if (resa?.ok) {
    presenceId = resa.presence_id;
  } else if (resa?.reason === 'doublon') {
    // Déjà inscrit·e à ce cours (par une autre porte) : on rattache la
    // demande à la présence existante, rien à créer.
    const { data: existingPresence } = await supabase
      .from('presences')
      .select('id')
      .eq('cours_id', demande.cours_id)
      .eq('client_id', clientId)
      .maybeSingle();
    presenceId = existingPresence?.id || null;
    if (!presenceId) throw new Error('reserver_place: doublon sans présence retrouvée');
  } else {
    const messages = {
      complet: t('Ce cours est désormais complet.'),
      annule: t('Ce cours a été annulé.'),
      introuvable: t('Cours introuvable.'),
    };
    const err = new Error(messages[resa?.reason] || t('Réservation impossible.'));
    err.code = resa?.reason || 'inconnu';
    throw err;
  }

  // D'où vient cette inscription (v119) : une demande de cours d'essai,
  // donc un geste de l'élève. UPDATE séparé, jamais bloquant.
  await poserSourcePresence(supabase, presenceId, 'essai');

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
export async function emailConfirmationVisiteur({ profileNom, studioSlug, prenom, email, cours, paiement, prix, stripeLink, proEmail = null, adresse = null, codePostal = null, ville = null, telephone = null, magicLink = null, langue = 'fr' }) {
  if (!process.env.RESEND_API_KEY) return;
  try {
    // La langue de l'élève (v122) : celle de sa requête, ou de sa fiche quand
    // c'est la prof qui valide. Sans `langue`, le français, comme avant. Le
    // bloc « infos pratiques » (lib/email-helpers) reste en français.
    const t = traducteur(langue);
    const dateStr = new Date(cours.date + 'T12:00:00').toLocaleDateString(t.locale, {
      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
    });
    const heureStr = heureLisible(cours.heure, t.langue);
    const prixStr = `<strong>${prixLisible(prix, t.langue)}</strong>`;
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://www.izisolo.fr';
    const infosBlock = infosPratiquesBlock({ adresse, codePostal, ville, telephone, email: proEmail, studioSlug, profileNom, appUrl });
    const paiementBlock = paiement === 'stripe' && stripeLink
      ? `<div style="background:#fffaf0;border:1px solid #ffe0b2;border-radius:10px;padding:12px 16px;margin:0 0 16px;color:#7c4a03;font-size:0.875rem;">
           <strong>${t('Paiement')}</strong><br/>
           ${t('Pour confirmer ta place, merci de régler {prix} via ce lien :', { prix: prixStr })}<br/>
           <a href="${stripeLink}" style="color:#635bff;font-weight:600;">${stripeLink}</a>
         </div>`
      : paiement === 'sur_place' && prix > 0
      ? `<div style="background:#fffaf0;border:1px solid #ffe0b2;border-radius:10px;padding:12px 16px;margin:0 0 16px;color:#7c4a03;font-size:0.875rem;">
           ${t('{paiement} : {prix} à régler sur place le jour du cours.', { paiement: `<strong>${t('Paiement')}</strong>`, prix: prixStr })}
         </div>`
      : '';
    await sendEmail({
      categorie: 'transactionnel',
      replyTo: proEmail,
      to: email,
      subject: t("Cours d'essai confirmé · {cours}", { cours: cours.nom }),
      html: `
        <div style="font-family:-apple-system,BlinkMacSystemFont,sans-serif;max-width:560px;margin:0 auto;padding:24px;">
          <h2 style="color:#d4a0a0;margin:0 0 6px;">${t("Cours d'essai confirmé !")}</h2>
          <p style="color:#555;margin:0 0 16px;">${t('Bonjour {prenom}', { prenom })},</p>
          <p style="color:#555;margin:0 0 12px;">${t("Ta place est réservée pour ton cours d'essai chez {studio} :", { studio: `<strong>${profileNom}</strong>` })}</p>
          <div style="background:#faf8f5;border-radius:12px;padding:16px 20px;margin:0 0 20px;">
            <strong style="font-size:1.1rem;color:#1a1a2e;">${cours.nom}</strong><br/>
            <span style="color:#888;">📅 ${dateStr}</span><br/>
            <span style="color:#888;">🕐 ${heureStr}</span>
            ${cours.lieu ? `<br/><span style="color:#888;">📍 ${cours.lieu}</span>` : ''}
          </div>
          ${paiementBlock}
          ${magicLink ? `
          <div style="text-align:center;margin:0 0 20px;">
            <a href="${magicLink}" style="display:inline-block;padding:14px 28px;background:#b87333;color:white;text-decoration:none;border-radius:99px;font-weight:700;font-size:1rem;">
              ${t('Accéder à mon espace')}
            </a>
            <p style="color:#999;margin:10px 0 0;font-size:0.75rem;">${t('Ce lien te connecte sans mot de passe (valable 1 heure).')}</p>
          </div>` : ''}
          ${infosBlock}
          <p style="color:#888;font-size:0.8rem;margin:32px 0 0;border-top:1px solid #eee;padding-top:16px;text-align:center;">
            ${t('Propulsé par')} <a href="${appUrl}" style="color:#d4a0a0;">IziSolo</a>
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
export async function emailEnAttenteVisiteur({ profileNom, prenom, email, cours, proEmail = null, langue = 'fr' }) {
  if (!process.env.RESEND_API_KEY) return;
  try {
    const t = traducteur(langue);
    const dateStr = new Date(cours.date + 'T12:00:00').toLocaleDateString(t.locale, {
      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
    });
    const heureStr = heureLisible(cours.heure, t.langue);
    await sendEmail({
      categorie: 'transactionnel',
      replyTo: proEmail,
      to: email,
      subject: t("Demande de cours d'essai reçue · {cours}", { cours: cours.nom }),
      html: `
        <div style="font-family:-apple-system,BlinkMacSystemFont,sans-serif;max-width:560px;margin:0 auto;padding:24px;">
          <h2 style="color:#d4a0a0;margin:0 0 6px;">${t('Demande reçue')}</h2>
          <p style="color:#555;margin:0 0 16px;">${t('Bonjour {prenom}', { prenom })},</p>
          <p style="color:#555;margin:0 0 12px;">${t("On a bien reçu ta demande de cours d'essai :")}</p>
          <div style="background:#faf8f5;border-radius:12px;padding:16px 20px;margin:0 0 20px;">
            <strong style="font-size:1.1rem;color:#1a1a2e;">${cours.nom}</strong><br/>
            <span style="color:#888;">📅 ${dateStr}</span><br/>
            <span style="color:#888;">🕐 ${heureStr}</span>
          </div>
          <p style="color:#555;margin:0 0 16px;">
            ${t('{studio} va examiner ta demande et te répondra rapidement par email.', { studio: profileNom })}
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
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://www.izisolo.fr';
    const dateStr = new Date(cours.date + 'T12:00:00').toLocaleDateString('fr-FR', {
      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
    });
    const heureStr = cours.heure ? cours.heure.slice(0, 5).replace(':', 'h') : '';
    const ctaText = modeManuel ? 'Valider ou refuser la demande' : 'Voir la demande';
    await sendEmail({
      categorie: 'transactionnel',
      to: proEmail,
      subject: modeManuel
        ? `📥 Nouvelle demande d'essai à valider · ${demande.prenom}`
        : `🆕 Nouveau cours d'essai inscrit · ${demande.prenom}`,
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
