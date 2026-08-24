import withPWA from 'next-pwa';

// ⚠️ runtimeCaching EXPLICITE (2026-08-24, dashboard de Maude cassé « une
// erreur est survenue » à la réouverture) : les DÉFAUTS de next-pwa 5.6
// cachaient TOUT le same-origin — documents, navigations RSC (`?_rsc=`),
// et même les réponses d'API AUTHENTIFIÉES (règles 'others' et 'apis',
// NetworkFirst). Sur une app dynamique redéployée plusieurs fois par jour,
// le SW ressert des payloads RSC périmés → error boundary, et pourrait
// resservir des données privées d'une session à l'autre. Personne n'a
// jamais promis d'offline sur les pages : le SW ne cache QUE les polices
// et les images. Aucune règle = requête au réseau, le comportement normal.
// Le nettoyage des caches toxiques existants vit dans worker/index.js.
const pwaConfig = withPWA({
  dest: 'public',
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === 'development',
  cacheStartUrl: false,
  dynamicStartUrl: false,
  // Le précache embarquait TOUT public/ — captures landing, photos persona,
  // vidéos réels, illustrations du guide (~8 Mo) : l'activation du SW prenait
  // des MINUTES au premier passage (donc « sw-pending » au clic push), et
  // chaque déploiement re-téléchargeait le tout sur le forfait mobile des
  // profs. Personne n'a besoin du marketing hors-ligne : on ne précache que
  // l'app (chunks) et les petites icônes.
  // ⚠️ Syntaxe next-pwa 5.6 : patterns de NÉGATION préfixés « ! » (le défaut
  // de la lib est ['!noprecache/**/*']) — sans le « ! », rien n'est exclu et
  // ça ne se voit pas (vérifier par grep dans public/sw.js, pas à l'œil).
  publicExcludes: [
    '!videos/**/*',
    '!blog/**/*',
    '!icons/aide/**/*',
    '!icons/screen-*.png',
    '!icons/persona-*.jpg',
    '!icons/*.jpg',
    '!icons/hero-*.png',
  ],
  runtimeCaching: [
    {
      urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
      handler: 'CacheFirst',
      options: { cacheName: 'google-fonts-webfonts', expiration: { maxEntries: 8, maxAgeSeconds: 365 * 24 * 3600 } },
    },
    {
      urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
      handler: 'StaleWhileRevalidate',
      options: { cacheName: 'google-fonts-stylesheets', expiration: { maxEntries: 8, maxAgeSeconds: 24 * 3600 } },
    },
    {
      urlPattern: /\/_next\/image\?url=.+$/i,
      handler: 'StaleWhileRevalidate',
      options: { cacheName: 'next-image', expiration: { maxEntries: 96, maxAgeSeconds: 24 * 3600 } },
    },
    {
      urlPattern: /\.(?:jpg|jpeg|gif|png|svg|ico|webp)$/i,
      handler: 'StaleWhileRevalidate',
      options: { cacheName: 'static-image-assets', expiration: { maxEntries: 96, maxAgeSeconds: 24 * 3600 } },
    },
  ],
});

// Headers sécurité — X-Frame-Options est géré À PART (B2g) : il s'applique
// PARTOUT sauf /embed/* (le planning intégrable DOIT être iframable sur les
// sites des profs). Ne JAMAIS assouplir XFO globalement : le dashboard porte
// des sessions prof, l'iframer = clickjacking réel. La page /embed est
// anonyme et sans action authentifiée — frame-ancestors * y est sans risque.
const securityHeaders = [
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), payment=()' },
];

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // AVIF en plus de WebP : -20 à -30% de poids sur les photos (hero, personas,
  // couverture portail) servies via next/image, sans perte visible.
  images: {
    formats: ['image/avif', 'image/webp'],
    // Photos uploadées par les profs (couverture/avatar portail = Supabase
    // Storage, docs = Vercel Blob) : sans remotePatterns, next/image ne PEUT
    // pas les optimiser (AUDIT-PERF 2.9 — la couverture 1920px partait
    // entière sur un mobile 375px). Jokers : le ref du projet Supabase
    // changera à la migration Paris.
    remotePatterns: [
      { protocol: 'https', hostname: '**.supabase.co' },
      { protocol: 'https', hostname: '**.public.blob.vercel-storage.com' },
    ],
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: securityHeaders,
      },
      {
        // X-Frame-Options partout SAUF /embed/* (lookahead négatif).
        source: '/((?!embed/).*)',
        headers: [{ key: 'X-Frame-Options', value: 'SAMEORIGIN' }],
      },
      {
        // L'embed s'iframe partout (CSP moderne, remplace XFO ici).
        source: '/embed/:studioSlug*',
        headers: [{ key: 'Content-Security-Policy', value: 'frame-ancestors *' }],
      },
    ];
  },
};

// SDK Sentry retiré en B2d (2026-07-25, décision D4) : le monitoring vit
// dans reportError → erreurs_app → /admin/erreurs.
export default pwaConfig(nextConfig);
