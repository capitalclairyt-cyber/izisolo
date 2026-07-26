import withPWA from 'next-pwa';

const pwaConfig = withPWA({
  dest: 'public',
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === 'development',
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
