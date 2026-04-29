import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';

// Routes publiques (pas besoin d'auth)
//   - Auth flows : login, register, onboarding, mot de passe
//   - Portails publics élèves : /p/[studioSlug]/...
//   - Pages SEO marketing : /profs-de-yoga, /profs-de-pilates, /coachs-bien-etre, /therapeutes
//   - Pages légales : /legal/...
//   - Offline, sitemap, robots
const PUBLIC_ROUTES = [
  '/login', '/register', '/onboarding', '/offline',
  '/mot-de-passe-oublie', '/nouveau-mot-de-passe',
  '/auth/',                 // /auth/callback Supabase
  '/p/',                    // portails publics studio (sondages, cours, espace, etc.)
  '/legal/',                // CGU/CGV/Mentions/RGPD
  '/profs-de-yoga', '/profs-de-pilates', '/coachs-bien-etre', '/therapeutes',
  '/sitemap.xml', '/robots.txt',
  '/test-tokens', '/components', '/np-preview',  // pages QA design system (refonte big-bang)
  '/_debug-clean',                                 // page debug d'urgence (clean SW + caches)
];

export async function proxy(request) {
  const { pathname } = request.nextUrl;

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
