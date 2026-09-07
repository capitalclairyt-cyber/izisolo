// ============================================
// IziSolo — Prélèvement automatique : les handlers du webhook (serveur, v107)
// ============================================
//
// Appelés par app/api/stripe/webhook/route.js, avec le client service_role
// et le profile_id du studio dont la SIGNATURE vient d'être vérifiée. Les
// décisions (lecture des événements, politiques) vivent dans lib/prelevement
// (pur, testé) ; ici on écrit, dans l'ordre que Stripe NE garantit pas :
//
//   • checkout.session.completed (mode subscription) → l'abo IziSolo naît,
//     porteur du sub_… ; les prélèvements arrivés AVANT lui sont rattachés.
//   • invoice.paid → un paiement réglé (CB, commission 1 %, daté du paiement,
//     idempotent par id de facture Stripe dans stripe_session_id), l'abo
//     prolongé jusqu'à la fin de période, réactivé s'il était en pause,
//     et la facture v106 qui part toute seule si la prof l'a demandé.
//   • invoice.payment_failed → prof prévenue (cloche + push + email), élève
//     prévenue (email), et abo en pause quand l'échec est FINAL.
//   • customer.subscription.deleted → l'abo se termine à la fin de la
//     période payée, la prof est prévenue.
//
// Colonnes v107 : lues et écrites par des requêtes SÉPARÉES et défensives
// (patron poserLienVisio v86) — sans la migration, l'argent est quand même
// enregistré et rattaché à l'élève par son email ; seul le lien abo ↔ sub_
// manque, et le proof le dit.

import { sendEmail } from './email.js';
import { sendPushToUser } from './push-server.js';
import { wantsNotif } from './notif-prefs.js';
import { escapeHtml, escapeIlike } from './utils.js';
import { reportError } from './report.js';
import { envoyerFactureAuto } from './facture-auto.js';
import {
  lireSessionAbonnement, lireInvoice, echecFinal, intitulePrelevement,
  finApresPrelevement, finPeriodeSubscription, statutApresResiliation,
} from './prelevement.js';

const COMMISSION_RATE = 0.01;
const COLONNE_ABSENTE = ['42703', 'PGRST204', 'PGRST205'];
const ID_STRIPE = /^[a-zA-Z0-9_]+$/;

function idSain(id) {
  return typeof id === 'string' && ID_STRIPE.test(id) ? id : null;
}

async function profilStudio(admin, profileId) {
  const { data } = await admin
    .from('profiles')
    .select('id, studio_nom, studio_slug, email_contact, notif_prefs')
    .eq('id', profileId)
    .maybeSingle();
  return data || { id: profileId };
}

async function clientParEmail(admin, profileId, email) {
  if (!email) return null;
  const { data } = await admin
    .from('clients')
    .select('id, prenom, nom, email')
    .eq('profile_id', profileId)
    .ilike('email', escapeIlike(email))
    .maybeSingle();
  return data || null;
}

/** L'abo porteur de ce sub_… (requête défensive : colonne v107 absente → null). */
async function aboParSubscription(admin, profileId, subscriptionId) {
  const id = idSain(subscriptionId);
  if (!id) return null;
  try {
    const { data, error } = await admin
      .from('abonnements')
      .select('id, client_id, offre_id, offre_nom, statut, date_fin, date_debut')
      .eq('profile_id', profileId)
      .eq('stripe_subscription_id', id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) return null;
    return data || null;
  } catch {
    return null;
  }
}

/** Pose les ids Stripe sur un abo — UPDATE séparé, échec ignoré (pré-v107). */
async function poserIdsStripe(admin, aboId, { subscriptionId, customerId }) {
  try {
    const { error } = await admin
      .from('abonnements')
      .update({ stripe_subscription_id: idSain(subscriptionId), stripe_customer_id: idSain(customerId) })
      .eq('id', aboId);
    return { ok: !error, migrationManquante: !!error && COLONNE_ABSENTE.includes(error.code) };
  } catch {
    return { ok: false, migrationManquante: false };
  }
}

async function notifierProf(admin, profil, { type, titre, corps, data, refKey, url, emailHtml }) {
  const prefs = profil?.notif_prefs;
  if (wantsNotif(prefs, type, 'prof', 'inapp')) {
    await admin.from('notifications').upsert({
      profile_id: profil.id, type, titre, corps, data, ref_key: refKey, expires_at: null,
    }, { onConflict: 'profile_id,ref_key', ignoreDuplicates: true }).then(() => {}, () => {});
  }
  sendPushToUser(profil.id, { title: titre, body: corps, url, tag: refKey }, { type }).catch(() => {});
  if (emailHtml && wantsNotif(prefs, type, 'prof', 'email') && profil.email_contact) {
    await sendEmail({ to: profil.email_contact, subject: titre, html: emailHtml, categorie: 'notification' });
  }
}

/**
 * checkout.session.completed en mode abonnement : l'abo naît (ou est
 * retrouvé) et porte le sub_… ; les prélèvements orphelins sont rattachés.
 * → { abonnementId, cree, migrationManquante }
 */
export async function traiterSessionAbonnement(admin, profileId, session) {
  const lecture = lireSessionAbonnement(session);
  const { subscriptionId, customerId, email, paymentLinkId } = lecture;
  if (!subscriptionId) return { abonnementId: null, cree: false };

  // Déjà passé (rejeu) : l'abo existe pour ce sub_.
  const deja = await aboParSubscription(admin, profileId, subscriptionId);
  if (deja) return { abonnementId: deja.id, cree: false };

  let offre = null;
  if (paymentLinkId) {
    const { data: offres } = await admin
      .from('offres')
      .select('id, nom, type, prix, seances, duree_jours, date_debut, date_fin, types_cours_autorises')
      .eq('profile_id', profileId)
      .ilike('stripe_payment_link', `%${escapeIlike(paymentLinkId)}%`);
    offre = offres?.[0] || null;
  }
  const client = await clientParEmail(admin, profileId, email);
  if (!client) {
    // Sans fiche, pas d'abo (il est nominatif). La prof est prévenue : le
    // prélèvement, lui, sera enregistré par invoice.paid avec l'email.
    const profil = await profilStudio(admin, profileId);
    await notifierProf(admin, profil, {
      type: 'prelevement',
      titre: '💳 Abonnement en ligne sans fiche élève',
      corps: `${email || 'email inconnu'} a souscrit ${offre?.nom || 'un abonnement'} : crée sa fiche avec cet email pour rattacher les prélèvements.`,
      data: { email, offre_id: offre?.id || null, subscription_id: subscriptionId },
      refKey: `prelevement_sansfiche_${subscriptionId}`,
      url: '/clients/nouveau',
    });
    return { abonnementId: null, cree: false, sansFiche: true };
  }

  const today = new Date().toISOString().slice(0, 10);
  const { data: abo, error } = await admin.from('abonnements').insert({
    profile_id: profileId,
    client_id: client.id,
    offre_id: offre?.id || null,
    offre_nom: offre?.nom || 'Abonnement en ligne',
    type: offre?.type || 'abonnement',
    date_debut: today,
    // Fin provisoire (30 j, ou la durée de l'offre) : invoice.paid la posera
    // à la vraie fin de période dès son arrivée.
    date_fin: new Date(Date.now() + (parseInt(offre?.duree_jours, 10) > 0 ? parseInt(offre.duree_jours, 10) : 30) * 86400000).toISOString().slice(0, 10),
    seances_total: offre?.seances || null,
    seances_utilisees: 0,
    types_cours_autorises: offre?.types_cours_autorises || null,
    statut: 'actif',
    notes: `Prélèvement automatique Stripe (${subscriptionId})`,
  }).select('id').single();
  if (error || !abo) {
    reportError('[prelevement] insert abo err:', error, { profileId });
    return { abonnementId: null, cree: false };
  }

  const pose = await poserIdsStripe(admin, abo.id, { subscriptionId, customerId });

  // Rattacher les prélèvements arrivés avant le checkout (ordre non garanti).
  if (pose.ok) {
    try {
      await admin.from('paiements')
        .update({ abonnement_id: abo.id, client_id: client.id, offre_id: offre?.id || null })
        .eq('profile_id', profileId)
        .eq('stripe_subscription_id', subscriptionId)
        .is('abonnement_id', null);
    } catch { /* pré-v107 */ }
  }
  return { abonnementId: abo.id, cree: true, migrationManquante: pose.migrationManquante };
}

/**
 * invoice.paid : le prélèvement de la période.
 * → { paiementId, deja, abonnementId }
 */
export async function traiterInvoicePayee(admin, profileId, invoice) {
  const l = lireInvoice(invoice);
  const invoiceId = idSain(l.invoiceId);
  if (!invoiceId) return { paiementId: null, deja: false };

  // Idempotence : l'id de facture Stripe vit dans stripe_session_id (v12).
  const { data: existant } = await admin
    .from('paiements').select('id, abonnement_id').eq('profile_id', profileId).eq('stripe_session_id', invoiceId).maybeSingle();
  if (existant) return { paiementId: existant.id, deja: true, abonnementId: existant.abonnement_id };

  const abo = await aboParSubscription(admin, profileId, l.subscriptionId);
  const client = abo?.client_id ? { id: abo.client_id } : await clientParEmail(admin, profileId, l.email);
  const offreNom = abo?.offre_nom || null;
  const montant = l.montant;
  const dateP = l.datePaiement || new Date().toISOString().slice(0, 10);
  const intitule = intitulePrelevement({ offreNom, periodeDebut: l.periodeDebut, description: l.description });
  const commission = parseFloat((montant * COMMISSION_RATE).toFixed(2));

  const { data: paiement, error } = await admin.from('paiements').insert({
    profile_id: profileId,
    client_id: client?.id || null,
    offre_id: abo?.offre_id || null,
    abonnement_id: abo?.id || null,
    intitule,
    type: 'abonnement',
    montant,
    statut: 'paid',
    mode: 'CB',
    date: dateP,
    date_encaissement: dateP,
    stripe_session_id: invoiceId,
    commission_taux: COMMISSION_RATE,
    commission_montant: commission,
    notes: `Prélèvement Stripe · ${l.email || 'email inconnu'}${client ? '' : ' · client à attribuer'}${l.subscriptionId ? ` · ${l.subscriptionId}` : ''}`,
  }).select('id').single();
  if (error || !paiement) {
    reportError('[prelevement] insert paiement err:', error, { profileId, invoiceId });
    throw new Error('Failed to create paiement prélèvement: ' + (error?.message || 'inconnu'));
  }

  // sub_ sur le paiement (colonne v107, UPDATE séparé) : sert au rattachement
  // si le checkout arrive après.
  if (l.subscriptionId) {
    await admin.from('paiements').update({ stripe_subscription_id: idSain(l.subscriptionId) }).eq('id', paiement.id).then(() => {}, () => {});
  }

  // L'abo suit : prolongé jusqu'à la fin de période, réactivé s'il était en
  // pause pour échec (politique 1 : un prélèvement qui finit par passer).
  if (abo) {
    const patch = { date_fin: finApresPrelevement(abo.date_fin, l.periodeFin) };
    if (abo.statut === 'gele' || abo.statut === 'expire') patch.statut = 'actif';
    await admin.from('abonnements').update(patch).eq('id', abo.id).then(() => {}, () => {});
  }

  const profil = await profilStudio(admin, profileId);
  sendPushToUser(profileId, {
    title: 'Prélèvement reçu 💳',
    body: `${montant} € — ${intitule}`,
    url: '/revenus',
    tag: `prelevement-${invoiceId}`,
  }, { type: 'paiement_stripe' }).catch(() => {});

  // La facture v106, si la prof l'a demandé : c'est le maillon « une facture
  // chaque mois sans un geste ». Best effort.
  await envoyerFactureAuto(admin, { profileId, paiementId: paiement.id }).catch(() => {});

  return { paiementId: paiement.id, deja: false, abonnementId: abo?.id || null, sansFiche: !client, profil };
}

/**
 * invoice.payment_failed : prof + élève prévenues, abo en pause si l'échec
 * est final (politique 1).
 * → { final, abonnementId, notifie }
 */
export async function traiterInvoiceEchouee(admin, profileId, invoice) {
  const l = lireInvoice(invoice);
  const invoiceId = idSain(l.invoiceId) || 'inconnue';
  const abo = await aboParSubscription(admin, profileId, l.subscriptionId);
  const final = echecFinal(l);
  const profil = await profilStudio(admin, profileId);

  let client = null;
  if (abo?.client_id) {
    const { data } = await admin.from('clients').select('id, prenom, nom, email').eq('id', abo.client_id).maybeSingle();
    client = data || null;
  } else {
    client = await clientParEmail(admin, profileId, l.email);
  }
  const qui = client ? `${client.prenom || ''} ${client.nom || ''}`.trim() || (l.email || 'une élève') : (l.email || 'une élève');
  const offreNom = abo?.offre_nom || l.description || 'abonnement';

  if (final && abo && abo.statut === 'actif') {
    await admin.from('abonnements').update({
      statut: 'gele',
      notes_pause: `Prélèvement Stripe refusé (${l.tentatives || 1} tentative${(l.tentatives || 1) > 1 ? 's' : ''}) — en pause automatique`,
    }).eq('id', abo.id).then(() => {}, () => {});
  }

  const titre = final ? `⚠️ Prélèvement refusé — ${qui}` : `💳 Prélèvement en échec — ${qui}`;
  const corps = final
    ? `${offreNom} · ${l.montant} € : Stripe a abandonné${abo ? ', l\'abonnement est en pause' : ''}. Vois avec elle un autre règlement.`
    : `${offreNom} · ${l.montant} € : Stripe réessaie${l.prochaineTentative ? ` le ${l.prochaineTentative}` : ''}. Rien à faire pour l'instant.`;
  await notifierProf(admin, profil, {
    type: 'prelevement',
    titre, corps,
    data: { abonnement_id: abo?.id || null, client_id: client?.id || null, invoice_id: invoiceId, final },
    refKey: `prelevement_echec_${invoiceId}_${l.tentatives || 0}`,
    url: client?.id ? `/clients/${client.id}` : '/revenus',
    emailHtml: `
      <div style="font-family:Inter,Arial,sans-serif;max-width:560px;margin:0 auto;color:#2b2320;line-height:1.55">
        <h2 style="color:#b87333;margin:0 0 8px;">${escapeHtml(titre)}</h2>
        <p>${escapeHtml(corps)}</p>
        <p style="color:#7a6a63;font-size:13px">Le détail vit dans ton dashboard Stripe (Abonnements). Si elle a changé de carte, le prochain essai passera tout seul.</p>
      </div>`,
  });

  // L'élève : un email par facture ET par tentative (dédup emails_envoyes).
  let notifie = false;
  if (client?.email) {
    const ref = `${profileId}:${invoiceId}:${l.tentatives || 0}`;
    let claimed = true;
    try {
      const { data: claim, error: clErr } = await admin.from('emails_envoyes')
        .upsert({ type: 'prelevement_echec', destinataire: client.email.toLowerCase(), ref }, { onConflict: 'type,destinataire,ref', ignoreDuplicates: true })
        .select('id');
      if (clErr) throw clErr;
      claimed = (claim || []).length > 0;
    } catch { /* fail-open */ }
    if (claimed) {
      const studio = profil.studio_nom || 'ton studio';
      const r = await sendEmail({
        to: client.email,
        subject: final ? `Ton prélèvement n'a pas abouti · ${studio}` : `Petit souci de prélèvement · ${studio}`,
        replyTo: profil.email_contact || undefined,
        categorie: 'transactionnel',
        html: `
          <div style="font-family:Inter,Arial,sans-serif;max-width:560px;margin:0 auto;color:#2b2320;line-height:1.55">
            <p>Bonjour ${escapeHtml(client.prenom || '')},</p>
            <p>Le prélèvement de <strong>${escapeHtml(String(l.montant))} €</strong> pour <strong>${escapeHtml(offreNom)}</strong> chez <strong>${escapeHtml(studio)}</strong> n'a pas pu être effectué par ta banque.</p>
            ${final
              ? `<p>Après plusieurs tentatives, il n'a pas abouti : ton abonnement est <strong>mis en pause</strong> le temps de régler ça. Réponds à cet email pour convenir d'un autre règlement avec ${escapeHtml(studio)}, ou mets ta carte à jour depuis l'email de Stripe.</p>`
              : `<p>Rien de grave : une nouvelle tentative aura lieu${l.prochaineTentative ? ` le <strong>${escapeHtml(l.prochaineTentative)}</strong>` : ' dans les prochains jours'}. Si ta carte a changé, mets-la à jour depuis l'email que Stripe t'a envoyé.</p>`}
            <p style="color:#7a6a63;font-size:13px">Une question ? Réponds simplement à cet email : il arrive chez ${escapeHtml(studio)}.</p>
          </div>`,
      });
      notifie = !!r.ok;
    }
  }

  return { final, abonnementId: abo?.id || null, notifie };
}

/**
 * customer.subscription.deleted : l'abo se termine à la fin de la période
 * payée (politique 2), la prof est prévenue.
 * → { abonnementId, dateFin, statut }
 */
export async function traiterSubscriptionSupprimee(admin, profileId, subscription) {
  const subscriptionId = idSain(subscription?.id);
  const abo = await aboParSubscription(admin, profileId, subscriptionId);
  if (!abo) return { abonnementId: null };

  const today = new Date().toISOString().slice(0, 10);
  const finPeriode = finPeriodeSubscription(subscription) || abo.date_fin || today;
  const dateFin = abo.date_fin && abo.date_fin < finPeriode ? abo.date_fin : finPeriode;
  const statut = statutApresResiliation(dateFin, today);
  await admin.from('abonnements').update({
    statut,
    date_fin: dateFin,
    notes: `Prélèvement automatique résilié le ${today} (Stripe ${subscriptionId}) — acquis jusqu'au ${dateFin}`,
  }).eq('id', abo.id).then(() => {}, () => {});

  const profil = await profilStudio(admin, profileId);
  const { data: client } = await admin.from('clients').select('id, prenom, nom').eq('id', abo.client_id).maybeSingle();
  const qui = client ? `${client.prenom || ''} ${client.nom || ''}`.trim() : 'une élève';
  await notifierProf(admin, profil, {
    type: 'prelevement',
    titre: `🛑 Abonnement résilié — ${qui}`,
    corps: `${abo.offre_nom || 'Abonnement'} : plus de prélèvement. Elle garde l'accès jusqu'au ${dateFin}.`,
    data: { abonnement_id: abo.id, client_id: abo.client_id, subscription_id: subscriptionId },
    refKey: `prelevement_resilie_${subscriptionId}`,
    url: client?.id ? `/clients/${client.id}` : '/clients',
  });

  return { abonnementId: abo.id, dateFin, statut };
}
