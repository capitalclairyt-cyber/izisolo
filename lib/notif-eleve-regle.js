// ============================================================================
// IziSolo — Notifications email aux élèves selon les règles métier
// ----------------------------------------------------------------------------
// Helper centralisé pour envoyer un email à un·e élève quand une règle métier
// se déclenche (cf. lib/regles-metier.js, profiles.regles_metier).
//
// - Si la règle a un messageCustom, on l'utilise (avec interpolation des
//   variables {prenom}, {cours}, {date}, {studio}).
// - Sinon, on utilise un template par défaut spécifique au case_type.
// - SMS pas encore branché (SMS_ENABLED = false dans constantes.js).
// - v122 (2026-09-22) : l'email part dans la langue de l'ÉLÈVE. `langue`
//   peut être fournie par l'appelant ('fr' | 'en') ; sinon elle est résolue
//   ici : sa fiche (`client.id`, ou retrouvée par email dans le studio, par
//   une lecture défensive) > le réglage du studio > le français. Le
//   messageCustom de la prof, le nom du cours et du studio viennent de la
//   base et ne sont jamais traduits.
//
// Usage:
//   import { sendNotifElevePourRegle } from '@/lib/notif-eleve-regle';
//   await sendNotifElevePourRegle({
//     caseType: 'eleve_sans_carnet',
//     regle, // résultat de getRegle(profile, 'eleve_sans_carnet')
//     profile,
//     client: { prenom, nom, email },
//     contexte: { cours: 'Vinyasa flow', date: '12 mai', heure: '9h00' },
//     langue: 'en', // facultatif
//   });
// ============================================================================

import { sendEmail } from './email';
import { escapeIlike } from './utils';
import { createAdminClient } from './supabase-admin';
import { traducteur, normaliserLangue } from './i18n-portail';
import { traducteurEleve } from './i18n-portail-serveur';

// Chaque gabarit est une fonction de `t` : un paragraphe = une clé, les
// variables {prenom} {cours} {date} {studio} sont interpolées APRÈS par
// `interpolate` (le gras est posé sur la variable, pas dans la clé).
const gras = (v) => `<strong>${v}</strong>`;
const reservationEnregistree = (t) => t('Ta réservation pour {cours} le {date} est bien enregistrée.', { cours: gras('{cours}'), date: gras('{date}') });
const signature = (t) => `${t('À très vite,')}\n{studio}`;

const DEFAULT_TEMPLATES = {
  eleve_sans_carnet: {
    sujet: (t) => t('Réservation enregistrée, pense à régler ta séance'),
    corps: (t) => [
      t('Bonjour {prenom},'),
      reservationEnregistree(t),
      t("Comme tu n'as pas (ou plus) de carnet actif, le règlement se fera sur place avant la séance. Tu peux aussi acheter un carnet d'avance pour la prochaine fois."),
      signature(t),
    ].join('\n\n'),
    // Variante : AUCUN carnet/abo ne couvre ce type de cours (payable à la
    // séance) → on ne suggère PAS d'acheter un carnet (message trompeur sinon).
    corpsSansCarnet: (t) => [
      t('Bonjour {prenom},'),
      reservationEnregistree(t),
      t('Ce cours se règle à la séance : le règlement se fera directement avec ton studio.'),
      signature(t),
    ].join('\n\n'),
    // Variante : l'élève A un carnet utilisable, mais il ne couvre pas CE type
    // de cours → « tu n'as pas de carnet actif » serait faux et vexant.
    corpsMauvaisType: (t) => [
      t('Bonjour {prenom},'),
      reservationEnregistree(t),
      t("Petite précision : ton carnet actuel ne couvre pas ce type de cours. Cette séance se règle donc séparément, directement avec ton studio. Ton carnet n'est pas touché."),
      signature(t),
    ].join('\n\n'),
  },
  annulation_hors_delai: {
    sujet: (t) => t('À noter : ta séance du {date} a été comptée'),
    corps: (t) => [
      t('Bonjour {prenom},'),
      t("Pour rappel, l'annulation de ta séance du {date} est intervenue trop tard pour qu'on puisse la libérer. Conformément à la politique du studio, la séance a été décomptée de ton crédit.", { date: gras('{date}') }),
      t('Tu peux retrouver le détail dans ton espace personnel.'),
      signature(t),
    ].join('\n\n'),
  },
  carnet_expire_avant_cours: {
    sujet: (t) => t('Ton carnet expire avant cette séance'),
    corps: (t) => [
      t('Bonjour {prenom},'),
      t('Tu viens de réserver {cours} le {date}. Petit rappel : ton carnet en cours arrive à expiration avant cette date.', { cours: gras('{cours}'), date: gras('{date}') }),
      t('Pense à le renouveler pour ne pas perdre ta place, sinon contacte-moi.'),
      signature(t),
    ].join('\n\n'),
  },
  cours_annule_prof: {
    sujet: (t) => t('Séance annulée : {cours} du {date}'),
    corps: (t) => [
      t('Bonjour {prenom},'),
      t('Désolée, je dois annuler la séance {cours} prévue le {date}.', { cours: gras('{cours}'), date: gras('{date}') }),
      t('Ta séance est recréditée sur ton carnet automatiquement. Tu peux te réinscrire à un autre créneau dès maintenant.'),
      `${t('Toutes mes excuses pour la gêne,')}\n{studio}`,
    ].join('\n\n'),
  },
};

/**
 * Interpole les variables {prenom} {cours} {date} {studio} dans un texte.
 */
function interpolate(template, vars, t) {
  if (!template) return '';
  return template
    .replaceAll('{prenom}', vars.prenom || '')
    .replaceAll('{cours}', vars.cours || t('ta séance'))
    .replaceAll('{date}', vars.date || '')
    .replaceAll('{heure}', vars.heure || '')
    .replaceAll('{studio}', vars.studio || '');
}

/**
 * La langue de l'email quand l'appelant ne la fournit pas : la fiche de
 * l'élève (par id, sinon retrouvée par email dans CE studio), puis le studio,
 * puis le français. Chaque lecture est défensive : au moindre doute, français.
 */
async function resoudreTraducteur({ langue, client, profile }) {
  const fournie = normaliserLangue(langue);
  if (fournie) return traducteur(fournie);
  try {
    const admin = createAdminClient();
    let clientId = client?.id || null;
    if (!clientId && client?.email && profile?.id) {
      const { data } = await admin
        .from('clients')
        .select('id')
        .eq('profile_id', profile.id)
        .ilike('email', escapeIlike(String(client.email).trim()))
        .limit(1)
        .maybeSingle();
      clientId = data?.id || null;
    }
    return await traducteurEleve(admin, { clientId, profileId: profile?.id || null });
  } catch {
    return traducteur('fr');
  }
}

/**
 * Envoie un email à l'élève selon la règle métier.
 *
 * @param {object} args
 * @param {string} args.caseType - id du cas (eleve_sans_carnet, etc.)
 * @param {object} args.regle - résultat de getRegle() (mode, choix, notifEleveEmail, messageCustom...)
 * @param {object} args.profile - { id, studio_nom }
 * @param {object} args.client - { id?, prenom, nom, email }
 * @param {object} args.contexte - { cours, date, heure }
 * @param {string} [args.langue] - 'fr' | 'en' ; absente → résolue par la fiche puis le studio (v122)
 * @returns {Promise<{sent: boolean, reason?: string}>}
 */
export async function sendNotifElevePourRegle({ caseType, regle, profile, client, contexte = {}, proEmail = null, langue = null }) {
  if (!regle?.notifEleveEmail) return { sent: false, reason: 'notif désactivée' };
  if (!client?.email) return { sent: false, reason: 'pas d\'email élève' };
  if (!process.env.RESEND_API_KEY) return { sent: false, reason: 'Resend non configuré' };

  const template = DEFAULT_TEMPLATES[caseType];
  if (!template && !regle.messageCustom) {
    return { sent: false, reason: 'pas de template par défaut pour ' + caseType };
  }

  const t = await resoudreTraducteur({ langue, client, profile });

  const vars = {
    prenom: client.prenom || '',
    cours: contexte.cours || '',
    date: contexte.date || '',
    heure: contexte.heure || '',
    studio: profile?.studio_nom || t('le studio'),
  };

  const sujet = interpolate(template?.sujet ? template.sujet(t) : t('Information importante · {studio}'), vars, t);
  // Le messageCustom écrase le corps par défaut si défini. Sinon, pour
  // eleve_sans_carnet, on choisit la variante honnête :
  //   1. l'élève a un carnet utilisable mais du mauvais type → corpsMauvaisType ;
  //   2. aucun carnet au catalogue ne couvre ce cours → corpsSansCarnet
  //      (pas de suggestion d'achat trompeuse) ;
  //   3. sinon → corps standard (« achète un carnet d'avance »).
  const corpsRaw = regle.messageCustom
    || (caseType === 'eleve_sans_carnet' && contexte.carnetInapplicable === true && template?.corpsMauvaisType?.(t))
    || (caseType === 'eleve_sans_carnet' && contexte.carnetAchetable === false && template?.corpsSansCarnet?.(t))
    || template?.corps?.(t)
    || '';
  const corpsInterpolated = interpolate(corpsRaw, vars, t);
  // Convertir les sauts de ligne en <br/> pour HTML email
  const corpsHtml = corpsInterpolated.replaceAll('\n', '<br/>');

  // Pipeline central (Sprint 5) : blacklist + List-Unsubscribe + reportError
  const r = await sendEmail({
    to: client.email,
    subject: sujet,
    replyTo: proEmail,
    categorie: 'notification',
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, sans-serif; max-width: 560px; margin: 0 auto; padding: 24px; color: #3D3028;">
        <div style="line-height: 1.6;">${corpsHtml}</div>
        <p style="color: #aaa; font-size: 0.75rem; margin: 32px 0 0; border-top: 1px solid #eee; padding-top: 16px; text-align: center;">
          ${t('Propulsé par')} <a href="https://www.izisolo.fr" style="color: #B87333;">IziSolo</a>
        </p>
      </div>
    `,
  });
  if (r.ok) return { sent: true };
  return { sent: false, reason: r.skipped || r.error };
}
