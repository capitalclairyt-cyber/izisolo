/**
 * Allowlist admin Mélutek — SOURCE UNIQUE.
 * (Était dupliquée en 3 exemplaires : layout admin, update-plan, tickets.)
 *
 * Extensible SANS déploiement de code : variable d'env ADMIN_EMAILS
 * (emails séparés par des virgules) fusionnée avec la base hardcodée.
 * Ex. sur Vercel : ADMIN_EMAILS=colin@ateliermelusine.com
 * ⚠️ Comme toute env : ne s'applique qu'aux NOUVEAUX déploiements.
 */
const BASE_ADMIN_EMAILS = [
  'admin@melutek.fr',
  'colin.boulgakoff@free.fr',
];

export function getAdminEmails() {
  const fromEnv = (process.env.ADMIN_EMAILS || '')
    .split(',')
    .map(e => e.trim().toLowerCase())
    .filter(Boolean);
  return [...new Set([...BASE_ADMIN_EMAILS.map(e => e.toLowerCase()), ...fromEnv])];
}

export function isAdminEmail(email) {
  return getAdminEmails().includes((email || '').trim().toLowerCase());
}
