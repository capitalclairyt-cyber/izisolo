/**
 * Hôte admin dédié (capsule.izisolo.fr) — SOURCE UNIQUE de la détection.
 *
 * Pourquoi un sous-domaine : les cookies de session Supabase sont posés PAR
 * HÔTE (jamais domain=.izisolo.fr, c'est ce qui garantit la séparation).
 * La session admin vit donc sur capsule.izisolo.fr et coexiste avec une
 * session studio sur www.izisolo.fr dans le même navigateur — fin du
 * déconnecter/reconnecter pour piloter le compte démo. Bonus : manifest
 * dédié → l'admin s'installe comme sa propre PWA (icône distincte).
 *
 * « capsule » plutôt qu'« admin » : choix Colin 2026-08-21 — un nom discret
 * n'annonce pas une surface d'administration à qui scanne les sous-domaines.
 *
 * Utilisé par proxy.js (routage) et app/(admin)/layout.js (redirect non-admin
 * vers l'hôte principal). Fonctions pures, compatibles edge runtime.
 *
 * Env optionnelle ADMIN_HOST pour forcer un hôte précis ; par défaut, tout
 * hôte préfixé « capsule. » est reconnu (couvre capsule.izisolo.fr en prod et
 * capsule.localhost:3333 en dev — les navigateurs résolvent *.localhost seuls).
 */
export function estHoteAdmin(host) {
  if (!host) return false;
  const h = host.toLowerCase();
  const configure = (process.env.ADMIN_HOST || '').toLowerCase();
  if (configure) return h === configure;
  return h.startsWith('capsule.');
}

/** capsule.izisolo.fr → izisolo.fr (l'hôte studio correspondant). */
export function hotePrincipal(host) {
  return (host || '').replace(/^capsule\./i, '');
}
