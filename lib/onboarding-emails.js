// ============================================================================
// IziSolo — emails lifecycle d'onboarding J+1 / J+3 (2026-08-01, plan « aide
// utilisateur » validé Colin)
// ----------------------------------------------------------------------------
// Deux emails, ciblés sur les frictions d'activation MESURÉES :
//   • J+1 « Ton premier cours récurrent » — la récurrence n'était pas adoptée
//     (des profs recréaient leurs cours à la main, semaine après semaine).
//   • J+3 « Fais entrer tes élèves » — le drop-off n° 1 après l'inscription.
// Chacun est SKIPPÉ si l'activation correspondante a déjà eu lieu (des cours
// existent / des élèves existent) : on ne « relance » jamais quelqu'un qui a
// déjà fait le geste.
//
// Fenêtres SANS chevauchement : J+1 = [1 j, 3 j), J+3 = [3 j, 7 j). Au-delà de
// 7 jours, plus rien — pas de backfill des anciens comptes au déploiement.
// Dédup : claims `emails_envoyes` type 'onboarding', ref `${profileId}:j1|j3`
// (zéro migration — même mécanique éprouvée que message_instant). Le claim est
// libéré si l'envoi échoue → nouvelle tentative au cron du lendemain.
//
// Module volontairement SANS dépendance (fenêtres + rendus purs) : importable
// par les specs Node pures. Verrou : onboarding-emails.spec.js. L'orchestration
// (profils, compteurs, claims, envoi) vit dans le cron `expirations`.
// ============================================================================

const JOUR_MS = 24 * 3600 * 1000;

/**
 * Quel email d'onboarding envoyer à ce profil, maintenant ?
 * @returns {'j1'|'j3'|null}
 */
export function choisirEmailOnboarding({ createdAt, nbCours = 0, nbClients = 0 }, now) {
  const creation = new Date(createdAt).getTime();
  const ref = now instanceof Date ? now.getTime() : new Date(now).getTime();
  if (!Number.isFinite(creation) || !Number.isFinite(ref)) return null;
  const ageJours = (ref - creation) / JOUR_MS;

  if (ageJours >= 1 && ageJours < 3) {
    return nbCours > 0 ? null : 'j1'; // des cours existent déjà : geste fait
  }
  if (ageJours >= 3 && ageJours < 7) {
    return nbClients > 0 ? null : 'j3'; // des élèves existent déjà : geste fait
  }
  return null;
}

/**
 * Rendu d'un email d'onboarding — même gabarit que les emails du cron
 * (560 px, bouton cuivre, « Bonjour » — jamais « Salut », retour Maude).
 * @returns {{subject: string, html: string}}
 */
export function renderEmailOnboarding(type, { prenom = '', appUrl = 'https://www.izisolo.fr' } = {}) {
  const bonjour = `Bonjour ${prenom || ''}`.trimEnd() + ',';

  if (type === 'j1') {
    return {
      subject: 'Ton premier cours récurrent en 2 minutes',
      html: `
        <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:560px;margin:0 auto;padding:24px;">
          <h2 style="color:#b87333;margin:0 0 6px;">Ton planning, en une fois</h2>
          <p style="color:#555;margin:0 0 14px;">${bonjour}</p>
          <p style="color:#555;margin:0 0 14px;">
            Bienvenue sur IziSolo ! Le premier geste qui change tout : créer ton cours
            en <strong>récurrent</strong>. Tu le règles une fois (jour, heure, fréquence,
            date de fin) — IziSolo génère toutes les séances du trimestre d'un coup.
            Plus rien à recréer semaine après semaine.
          </p>
          <div style="text-align:center;margin:24px 0;">
            <a href="${appUrl}/cours/nouveau" style="display:inline-block;padding:14px 28px;background:#b87333;color:white;text-decoration:none;border-radius:99px;font-weight:700;">
              Créer mon premier cours
            </a>
          </div>
          <p style="color:#555;margin:0 0 14px;font-size:0.875rem;">
            Deux minutes chrono, pas à pas :
            <a href="${appUrl}/aide#premier-cours" style="color:#b87333;font-weight:600;">le guide de démarrage</a>.
          </p>
          <p style="color:#999;margin:16px 0 0;font-size:0.8125rem;">
            Une question ? Réponds simplement à cet email.
          </p>
        </div>
      `,
    };
  }

  // j3
  return {
    subject: 'Fais entrer tes élèves (2 minutes, promis)',
    html: `
      <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:560px;margin:0 auto;padding:24px;">
        <h2 style="color:#b87333;margin:0 0 6px;">Tes élèves ont leur place ici</h2>
        <p style="color:#555;margin:0 0 14px;">${bonjour}</p>
        <p style="color:#555;margin:0 0 14px;">
          Ton studio prend forme — il ne manque que tes élèves. Le plus rapide :
          <strong>importe ta liste</strong> (un CSV depuis ton ancien outil ou ton
          tableur suffit). À la fin de l'import, IziSolo te propose de tous les
          <strong>inviter en un clic</strong> : chacun·e reçoit l'accès à son espace —
          réservations, carnet, messages.
        </p>
        <div style="text-align:center;margin:24px 0;">
          <a href="${appUrl}/clients/importer" style="display:inline-block;padding:14px 28px;background:#b87333;color:white;text-decoration:none;border-radius:99px;font-weight:700;">
            Importer ma liste d'élèves
          </a>
        </div>
        <p style="color:#555;margin:0 0 14px;font-size:0.875rem;">
          Pas de liste ? Ajoute-les au fil de l'eau, ou partage ton portail —
          <a href="${appUrl}/aide#eleves" style="color:#b87333;font-weight:600;">le guide te montre tout</a>.
        </p>
        <p style="color:#999;margin:16px 0 0;font-size:0.8125rem;">
          Une question ? Réponds simplement à cet email.
        </p>
      </div>
    `,
  };
}
