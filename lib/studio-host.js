// ============================================================================
// IziSolo — Le portail sur SON sous-domaine (v104, 2026-08-25)
// ----------------------------------------------------------------------------
// `mon-studio.izisolo.fr` sert le portail de `mon-studio`, sans que l'adresse
// change dans la barre du navigateur (RÉÉCRITURE, pas redirection).
//
// Déclencheur : une prof pour qui le branding passe avant tout, venue d'un
// vocal Instagram. Elle acceptait que la réservation ouvre un nouvel onglet ;
// ce qu'elle regardait, c'est l'adresse de la page où l'on atterrit. Et le
// hero de notre propre landing montre `ton-studio.izisolo.fr` depuis des mois
// (components/landing/Sections.js) : la maquette promettait ce sous-domaine
// avant que le produit ne sache le servir.
//
// Fonctions PURES, compatibles edge runtime (le proxy tourne là).
//
// ⚠️ Même famille que lib/admin-host.js, et les deux doivent rester cohérents :
// `capsule.` est l'admin et ne doit JAMAIS être pris pour un studio. Le proxy
// teste l'hôte admin EN PREMIER ; la liste ci-dessous est la ceinture.
// ============================================================================

/**
 * Sous-domaines qui ne seront jamais un studio. Un slug de studio ne doit pas
 * pouvoir les prendre non plus : `genererSlugStudioUnique` les évite, sinon
 * une prof nommant son studio « Admin » se retrouverait à servir le portail
 * sur un hôte réservé.
 */
export const SOUS_DOMAINES_RESERVES = [
  'www', 'capsule', 'admin', 'api', 'app', 'mail', 'email', 'blog',
  'static', 'assets', 'cdn', 'demo', 'staging', 'preview', 'dev', 'test',
  'support', 'aide', 'help', 'status', 'docs', 'compte', 'espace',
];

/** Le domaine racine servi en prod. Surchargeable pour un futur domaine. */
const RACINE = (process.env.STUDIO_ROOT_DOMAIN || 'izisolo.fr').toLowerCase();

/**
 * `mon-studio.izisolo.fr` → 'mon-studio'. `null` pour tout le reste :
 * l'apex, www, capsule, les previews Vercel, une IP, ou un hôte inconnu.
 *
 * Accepte aussi `mon-studio.localhost:3333` en développement : les navigateurs
 * résolvent *.localhost tout seuls, donc la fonctionnalité se teste sans
 * toucher au fichier hosts (même astuce que l'hôte admin).
 */
export function slugDepuisHote(host) {
  if (!host) return null;
  const h = host.toLowerCase().split(':')[0];

  // Une IP n'est jamais un sous-domaine de studio.
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(h)) return null;

  let sous = null;
  if (h.endsWith('.' + RACINE)) {
    sous = h.slice(0, -(RACINE.length + 1));
  } else if (h.endsWith('.localhost')) {
    sous = h.slice(0, -'.localhost'.length);
  } else {
    return null; // apex, vercel.app, domaine inconnu
  }

  // Un seul niveau : `a.b.izisolo.fr` n'est pas un studio.
  if (!sous || sous.includes('.')) return null;
  if (SOUS_DOMAINES_RESERVES.includes(sous)) return null;
  // Même grammaire que les slugs produits par slugify.
  if (!/^[a-z0-9](?:[a-z0-9-]{0,60}[a-z0-9])?$/.test(sous)) return null;

  return sous;
}

/**
 * Chemins qui NE doivent PAS être réécrits vers /p/<slug> sur un hôte studio :
 * ils sont servis à l'identique.
 *
 * `/auth/` en fait partie, et c'est essentiel : le lien magique d'une élève
 * atterrit là. ⚠️ Côté Supabase, `https://*.izisolo.fr/**` doit figurer dans
 * les Redirect URLs, sinon le lien retombe sur www et la session se pose sur
 * le mauvais hôte (les cookies Supabase sont posés PAR HÔTE).
 */
const TELS_QUELS = [
  '/api/', '/_next/', '/auth/', '/icons/', '/illustrations/', '/videos/',
  '/manifest', '/sw.js', '/worker-', '/workbox-', '/offline',
  '/favicon', '/robots.txt', '/sitemap.xml',
];

export function servirTelQuel(pathname) {
  return TELS_QUELS.some(p => pathname.startsWith(p));
}

/**
 * Le chemin réel à servir pour une requête arrivée sur l'hôte d'un studio.
 * `null` = ne rien réécrire.
 *
 * `/` → `/p/<slug>` ; `/espace` → `/p/<slug>/espace`. Une URL qui porte DÉJÀ
 * le préfixe est laissée telle quelle : sinon un vieux lien
 * `mon-studio.izisolo.fr/p/mon-studio` deviendrait `/p/mon-studio/p/…`.
 */
export function cheminReecrit(slug, pathname) {
  if (!slug || servirTelQuel(pathname)) return null;
  if (pathname === '/p' || pathname.startsWith('/p/')) return null;
  const suite = pathname === '/' ? '' : pathname;
  return `/p/${slug}${suite}`;
}

/** L'URL publique canonique d'un studio, sous-domaine si on sait le servir. */
export function urlPortail(slug, base = 'https://www.izisolo.fr') {
  if (!slug) return base;
  if (process.env.STUDIO_SOUS_DOMAINES !== '1') return `${base}/p/${slug}`;
  return `https://${slug}.${RACINE}`;
}
