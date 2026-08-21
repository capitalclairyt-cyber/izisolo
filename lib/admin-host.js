/**
 * Hôte admin dédié (admin.izisolo.fr) — SOURCE UNIQUE de la détection.
 *
 * Pourquoi un sous-domaine : les cookies de session Supabase sont posés PAR
 * HÔTE (jamais domain=.izisolo.fr, c'est ce qui garantit la séparation).
 * La session admin vit donc sur admin.izisolo.fr et coexiste avec une session
 * studio sur www.izisolo.fr dans le même navigateur — fin du déconnecter/
 * reconnecter pour piloter le compte démo. Bonus : manifest dédié → l'admin
 * s'installe comme sa propre PWA (icône distincte).
 *
 * Utilisé par proxy.js (routage) et app/(admin)/layout.js (redirect non-admin
 * vers l'hôte principal). Fonctions pures, compatibles edge runtime.
 *
 * Env optionnelle ADMIN_HOST pour forcer un hôte précis ; par défaut, tout
 * hôte préfixé « admin. » est reconnu (couvre admin.izisolo.fr en prod et
 * admin.localhost:3333 en dev — les navigateurs résolvent *.localhost seuls).
 */
export function estHoteAdmin(host) {
  if (!host) return false;
  const h = host.toLowerCase();
  const configure = (process.env.ADMIN_HOST || '').toLowerCase();
  if (configure) return h === configure;
  return h.startsWith('admin.');
}

/** admin.izisolo.fr → izisolo.fr (l'hôte studio correspondant). */
export function hotePrincipal(host) {
  return (host || '').replace(/^admin\./i, '');
}
