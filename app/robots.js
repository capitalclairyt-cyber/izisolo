const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://izisolo.fr';

export default function robots() {
  return {
    rules: [
      {
        userAgent: '*',
        allow: ['/', '/login', '/register', '/legal/', '/p/'],
        disallow: [
          '/api/',
          '/admin/',
          '/dashboard',
          '/agenda',
          '/clients',
          '/cours',
          '/abonnements',
          '/offres',
          '/paiements',
          '/revenus',
          '/communication',
          '/parametres',
          '/pointage',
          '/evenements',
          '/assistant',
          '/support',
          '/plus',
          '/onboarding',
          '/auth/',
          '/mot-de-passe-oublie',
          '/nouveau-mot-de-passe',
        ],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
    host: baseUrl,
  };
}
