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
//
// Usage:
//   import { sendNotifElevePourRegle } from '@/lib/notif-eleve-regle';
//   await sendNotifElevePourRegle({
//     caseType: 'eleve_sans_carnet',
//     regle, // résultat de getRegle(profile, 'eleve_sans_carnet')
//     profile,
//     client: { prenom, nom, email },
//     contexte: { cours: 'Vinyasa flow', date: '12 mai', heure: '9h00' },
//   });
// ============================================================================

import { sendEmail } from './email';

const DEFAULT_TEMPLATES = {
  eleve_sans_carnet: {
    sujet: 'Réservation enregistrée — pense à régler ta séance',
    corps: `Bonjour {prenom},

Ta réservation pour <strong>{cours}</strong> le <strong>{date}</strong> est bien enregistrée.

Comme tu n'as pas (ou plus) de carnet actif, le règlement se fera sur place avant la séance. Tu peux aussi acheter un carnet d'avance pour la prochaine fois.

À très vite,
{studio}`,
    // Variante : AUCUN carnet/abo ne couvre ce type de cours (payable à la
    // séance) → on ne suggère PAS d'acheter un carnet (message trompeur sinon).
    corpsSansCarnet: `Bonjour {prenom},

Ta réservation pour <strong>{cours}</strong> le <strong>{date}</strong> est bien enregistrée.

Ce cours se règle à la séance : le règlement se fera directement avec ton studio.

À très vite,
{studio}`,
    // Variante : l'élève A un carnet utilisable, mais il ne couvre pas CE type
    // de cours → « tu n'as pas de carnet actif » serait faux et vexant.
    corpsMauvaisType: `Bonjour {prenom},

Ta réservation pour <strong>{cours}</strong> le <strong>{date}</strong> est bien enregistrée.

Petite précision : ton carnet actuel ne couvre pas ce type de cours — cette séance se règle donc séparément, directement avec ton studio. Ton carnet n'est pas touché.

À très vite,
{studio}`,
  },
  annulation_hors_delai: {
    sujet: 'À noter : ta séance du {date} a été comptée',
    corps: `Bonjour {prenom},

Pour rappel, l'annulation de ta séance du <strong>{date}</strong> est intervenue trop tard pour qu'on puisse la libérer. Conformément à la politique du studio, la séance a été décomptée de ton crédit.

Tu peux retrouver le détail dans ton espace personnel.

À très vite,
{studio}`,
  },
  carnet_expire_avant_cours: {
    sujet: 'Ton carnet expire avant cette séance',
    corps: `Bonjour {prenom},

Tu viens de réserver <strong>{cours}</strong> le <strong>{date}</strong>. Petit rappel : ton carnet en cours arrive à expiration avant cette date.

Pense à le renouveler pour ne pas perdre ta place — sinon contacte-moi.

À très vite,
{studio}`,
  },
  cours_annule_prof: {
    sujet: 'Séance annulée : {cours} du {date}',
    corps: `Bonjour {prenom},

Désolée, je dois annuler la séance <strong>{cours}</strong> prévue le <strong>{date}</strong>.

Ta séance est recréditée sur ton carnet automatiquement. Tu peux te réinscrire à un autre créneau dès maintenant.

Toutes mes excuses pour la gêne,
{studio}`,
  },
};

/**
 * Interpole les variables {prenom} {cours} {date} {studio} dans un texte.
 */
function interpolate(template, vars) {
  if (!template) return '';
  return template
    .replaceAll('{prenom}', vars.prenom || '')
    .replaceAll('{cours}', vars.cours || 'ta séance')
    .replaceAll('{date}', vars.date || '')
    .replaceAll('{heure}', vars.heure || '')
    .replaceAll('{studio}', vars.studio || '');
}

/**
 * Envoie un email à l'élève selon la règle métier.
 *
 * @param {object} args
 * @param {string} args.caseType - id du cas (eleve_sans_carnet, etc.)
 * @param {object} args.regle - résultat de getRegle() (mode, choix, notifEleveEmail, messageCustom...)
 * @param {object} args.profile - { id, studio_nom }
 * @param {object} args.client - { prenom, nom, email }
 * @param {object} args.contexte - { cours, date, heure }
 * @returns {Promise<{sent: boolean, reason?: string}>}
 */
export async function sendNotifElevePourRegle({ caseType, regle, profile, client, contexte = {}, proEmail = null }) {
  if (!regle?.notifEleveEmail) return { sent: false, reason: 'notif désactivée' };
  if (!client?.email) return { sent: false, reason: 'pas d\'email élève' };
  if (!process.env.RESEND_API_KEY) return { sent: false, reason: 'Resend non configuré' };

  const template = DEFAULT_TEMPLATES[caseType];
  if (!template && !regle.messageCustom) {
    return { sent: false, reason: 'pas de template par défaut pour ' + caseType };
  }

  const vars = {
    prenom: client.prenom || '',
    cours: contexte.cours || '',
    date: contexte.date || '',
    heure: contexte.heure || '',
    studio: profile?.studio_nom || 'le studio',
  };

  const sujet = interpolate(template?.sujet || `Information importante — ${vars.studio}`, vars);
  // Le messageCustom écrase le corps par défaut si défini. Sinon, pour
  // eleve_sans_carnet, on choisit la variante honnête :
  //   1. l'élève a un carnet utilisable mais du mauvais type → corpsMauvaisType ;
  //   2. aucun carnet au catalogue ne couvre ce cours → corpsSansCarnet
  //      (pas de suggestion d'achat trompeuse) ;
  //   3. sinon → corps standard (« achète un carnet d'avance »).
  const corpsRaw = regle.messageCustom
    || (caseType === 'eleve_sans_carnet' && contexte.carnetInapplicable === true && template?.corpsMauvaisType)
    || (caseType === 'eleve_sans_carnet' && contexte.carnetAchetable === false && template?.corpsSansCarnet)
    || template?.corps
    || '';
  const corpsInterpolated = interpolate(corpsRaw, vars);
  // Convertir les sauts de ligne en <br/> pour HTML email
  const corpsHtml = corpsInterpolated.replaceAll('\n', '<br/>');

  // Pipeline central (Sprint 5) : blacklist + List-Unsubscribe + Sentry
  const r = await sendEmail({
    to: client.email,
    subject: sujet,
    replyTo: proEmail,
    categorie: 'notification',
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, sans-serif; max-width: 560px; margin: 0 auto; padding: 24px; color: #3D3028;">
        <div style="line-height: 1.6;">${corpsHtml}</div>
        <p style="color: #aaa; font-size: 0.75rem; margin: 32px 0 0; border-top: 1px solid #eee; padding-top: 16px; text-align: center;">
          Propulsé par <a href="https://www.izisolo.fr" style="color: #B87333;">IziSolo</a>
        </p>
      </div>
    `,
  });
  if (r.ok) return { sent: true };
  return { sent: false, reason: r.skipped || r.error };
}
