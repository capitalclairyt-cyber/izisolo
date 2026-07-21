import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';

// Routes publiques (pas besoin d'auth)
//   - Auth flows : login, register, onboarding, mot de passe
//   - Portails publics élèves : /p/[studioSlug]/...
//   - Pages SEO marketing : /profs-de-yoga, /profs-de-pilates, /coachs-bien-etre, /therapeutes
//   - Pages locales SEO : /prof-yoga-paris, /prof-yoga-lyon, ...
//   - Blog : /blog, /blog/[slug]
//   - Pages légales : /legal/...
//   - Offline, sitemap, robots
//
// ⚠️ Si une route publique n'est PAS listée ici, Googlebot sera redirigé vers
// /login (qui a robots: noindex,nofollow) → la page ne sera JAMAIS indexée.
const PUBLIC_ROUTES = [
  '/login', '/register', '/onboarding', '/offline',
  '/mot-de-passe-oublie', '/nouveau-mot-de-passe',
  '/auth/',                 // /auth/callback Supabase
  '/demo/',                 // ⚠️ TEMPORAIRE — accès démo privé (token secret dans le path)
  '/p/',                    // portails publics studio (sondages, cours, espace, etc.)
  '/legal/',                // CGU/CGV/Mentions/RGPD
  '/profs-de-yoga', '/profs-de-pilates', '/profs-de-meditation', '/profs-de-danse',
  '/coachs-bien-etre', '/therapeutes', '/sophrologues',
  '/prof-yoga-',            // /prof-yoga-paris, /prof-yoga-lyon, futures villes
  '/prof-pilates-',         // /prof-pilates-paris, /prof-pilates-lyon, etc.
  '/logiciel-gestion-prof-yoga', // page SEO catégorie « logiciel/appli de gestion yoga »
  '/blog',                  // /blog (liste) + /blog/[slug] (articles)
  '/outils',                // /outils/calculateur-revenu-prof-yoga, etc. (lead magnets HTML)
  '/calculateur',                // calculateur de frais (lead magnet)
  '/ressources/',           // /ressources/voyage-abeille.html, etc. (cours HTML offerts)
  '/sitemap.xml', '/robots.txt',
];

export async function proxy(request) {
  const { pathname } = request.nextUrl;

  // ── Canonique SEO : izisolo.fr → www.izisolo.fr (308 permanent) ──────────
  // Google indexait les DEUX (www + non-www) → jus de référencement splitté
  // (cf. Search Console : le même article rankait sur les 2 URLs). On consolide
  // sur UN seul domaine. www est le canonique (baseUrl fallback + webhook Stripe
  // déjà sur www → non impacté). Ne cible QUE l'apex prod : les previews Vercel
  // (*.vercel.app) et localhost ne matchent pas. 308 = préserve méthode + corps.
  // NB : si un redirect 307 persiste après déploiement, il vient de la config
  // domaine Vercel (edge) — mettre www en domaine primaire dans Vercel → Domains.
  const host = request.headers.get('host');
  if (host === 'izisolo.fr') {
    const url = request.nextUrl.clone();
    url.protocol = 'https:';
    url.host = 'www.izisolo.fr';
    url.port = '';
    return NextResponse.redirect(url, 308);
  }

  // Laisser passer les routes publiques, API, assets statiques
  if (
    PUBLIC_ROUTES.some(r => pathname.startsWith(r)) ||
    pathname.startsWith('/api/') ||
    pathname.startsWith('/_next/') ||
    pathname.startsWith('/manifest.json') ||
    pathname.startsWith('/sw.js') ||
    pathname.startsWith('/icons/') ||
    pathname === '/'
  ) {
    return NextResponse.next();
  }

  // Vérifier l'auth via Supabase
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            request.cookies.set(name, value);
            response.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  return response;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|manifest.json|sw.js|icons/).*)',
  ],
};
