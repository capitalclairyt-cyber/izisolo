const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://www.izisolo.fr';

export default function robots() {
  return {
    rules: [
      {
        userAgent: '*',
        allow: ['/', '/login', '/register', '/legal/', '/p/', '/blog', '/blog/', '/profs-de-yoga', '/profs-de-pilates', '/profs-de-meditation', '/profs-de-danse', '/coachs-bien-etre', '/therapeutes', '/sophrologues', '/calculateur', '/outils/', '/prof-yoga-paris', '/prof-yoga-lyon', '/prof-yoga-marseille', '/prof-yoga-toulouse', '/prof-yoga-bordeaux', '/prof-yoga-nantes', '/prof-yoga-strasbourg', '/prof-yoga-lille', '/prof-yoga-montpellier', '/prof-yoga-rennes', '/prof-yoga-nice', '/prof-pilates-paris', '/prof-pilates-lyon', '/prof-pilates-marseille', '/prof-pilates-toulouse', '/prof-pilates-bordeaux', '/prof-pilates-nantes', '/prof-pilates-strasbourg', '/prof-pilates-lille', '/prof-pilates-montpellier', '/prof-pilates-rennes', '/prof-pilates-nice'],
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
          '/ressources/',
        ],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
    host: baseUrl,
  };
}
