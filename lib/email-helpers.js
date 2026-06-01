/**
 * lib/email-helpers.js
 *
 * Petits blocs HTML réutilisables pour les emails transactionnels (Resend),
 * pour garder une communication élève cohérente entre essai / réservation /
 * promotion liste d'attente.
 */

/**
 * Bloc "Infos pratiques" : adresse + téléphone + email de contact du studio,
 * suivi d'un lien vers la page publique (où vivent FAQ, accès, parking,
 * matériel à prévoir…). Chaque ligne n'apparaît que si l'info est renseignée ;
 * le lien vers la page studio n'apparaît que si `studioSlug` est fourni.
 *
 * @returns {string} HTML (chaîne vide possible si rien à afficher)
 */
export function infosPratiquesBlock({ adresse, codePostal, ville, telephone, email, studioSlug, profileNom, appUrl } = {}) {
  const base = appUrl || process.env.NEXT_PUBLIC_APP_URL || 'https://www.izisolo.fr';
  const adresseLigne = [adresse, [codePostal, ville].filter(Boolean).join(' ').trim()]
    .filter(Boolean)
    .join(', ');
  // Liens tel:/mailto: stylés explicitement (gris, pas de soulignement) pour
  // éviter que le client mail les auto-transforme en liens bleus par défaut.
  const telHref = telephone ? String(telephone).replace(/[^\d+]/g, '') : '';
  const lignes = [
    adresseLigne ? `<br/><span style="color:#888;">📍 ${adresseLigne}</span>` : '',
    telephone ? `<br/><span style="color:#888;">📞 <a href="tel:${telHref}" style="color:#888;text-decoration:none;">${telephone}</a></span>` : '',
    email ? `<br/><span style="color:#888;">✉️ <a href="mailto:${email}" style="color:#888;text-decoration:none;">${email}</a></span>` : '',
  ].join('');
  const card = lignes
    ? `<div style="background:#faf8f5;border-radius:12px;padding:16px 20px;margin:0 0 16px;"><strong style="color:#1a1a2e;">Infos pratiques</strong>${lignes}</div>`
    : '';
  const lien = studioSlug
    ? `<p style="color:#555;font-size:0.9rem;margin:0 0 16px;">Accès, parking, matériel à prévoir… retrouve toutes les infos sur <a href="${base}/p/${studioSlug}" style="color:#d4a0a0;font-weight:600;">la page de ${profileNom || 'ton studio'}</a>.</p>`
    : '';
  return card + lien;
}
