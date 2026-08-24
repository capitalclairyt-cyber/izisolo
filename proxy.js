import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { estHoteAdmin } from '@/lib/admin-host';

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
  '/p/',                    // portails publics studio (sondages, cours, espace, etc.)
  '/embed/',                // planning intégrable iframé sur les sites des profs (B2g)
  '/widget.js',             // loader du planning intégrable, chargé par les sites tiers (B2g)
  '/legal/',                // CGU/CGV/Mentions/RGPD
  '/unsubscribe',           // désinscription email : le destinataire n'est PAS connecté
                            // (l'en-tête List-Unsubscribe de lib/email.js pointe ici, et
                            // /api/unsubscribe y redirige après traitement — sans cette
                            // ligne, se désinscrire menait à l'écran de connexion)
  '/profs-de-yoga', '/profs-de-pilates', '/profs-de-meditation', '/profs-de-danse',
  '/coachs-bien-etre', '/therapeutes', '/sophrologues',
  '/prof-yoga-',            // /prof-yoga-paris, /prof-yoga-lyon, futures villes
  '/prof-pilates-',         // /prof-pilates-paris, /prof-pilates-lyon, etc.
  '/logiciel-gestion-prof-yoga', // page SEO catégorie « logiciel/appli de gestion yoga »
  '/blog',                  // /blog (liste) + /blog/[slug] (articles)
  '/outils',                // /outils/calculateur-revenu-prof-yoga, etc. (lead magnets HTML)
  '/calculateur',                // calculateur de frais (lead magnet)
  '/creer-mon-studio',      // guichet public de la creation concierge (v96)
  '/ressources/',           // /ressources/voyage-abeille.html, etc. (cours HTML offerts)
  '/sitemap.xml', '/robots.txt',
];

// Pages marketing dont le « déjà connecté → /dashboard » vit ICI depuis
// AUDIT-PERF cat 2.4 (avant : chaque page faisait un auth.getUser() serveur
// par visite → toute la surface SEO était rendue dynamique). Le check se fait
// sur la simple PRÉSENCE du cookie de session (zéro appel réseau) : un cookie
// périmé renvoie vers /dashboard dont le layout renverra vers /login.
const MARKETING_EXACT = [
  '/', '/profs-de-yoga', '/profs-de-yoga-enfants', '/profs-de-pilates',
  '/profs-de-meditation', '/profs-de-danse', '/coachs-bien-etre',
  '/therapeutes', '/sophrologues', '/logiciel-gestion-prof-yoga', '/calculateur',
  '/creer-mon-studio',
];
const MARKETING_PREFIXES = ['/prof-yoga-', '/prof-pilates-'];

function hasSessionCookie(request) {
  return request.cookies.getAll().some(c => c.name.startsWith('sb-') && c.name.includes('-auth-token'));
}

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

  // ── Hôte admin dédié (capsule.izisolo.fr) ────────────────────────────────
  // Session Supabase séparée par hôte : l'admin vit ici, les sessions studio
  // sur l'hôte principal — les deux coexistent dans le même navigateur.
  // Surface volontairement minimale : admin + auth + API + assets, tout le
  // reste (landing, portails, dashboard studio) est renvoyé vers /admin.
  if (estHoteAdmin(host)) {
    // Atterrissages : racine et /dashboard (cible par défaut du login) → /admin.
    // Un non-admin qui atteint /admin est renvoyé vers l'hôte PRINCIPAL par le
    // layout admin (pas ici) — sinon /dashboard→/admin→/dashboard bouclerait.
    if (pathname === '/' || pathname.startsWith('/dashboard')) {
      return NextResponse.redirect(new URL('/admin', request.url));
    }
    const autorisee =
      pathname.startsWith('/admin') || // couvre aussi /admin-mfa (challenge TOTP)
      pathname.startsWith('/login') ||
      pathname.startsWith('/auth/') ||
      pathname.startsWith('/mot-de-passe-oublie') ||
      pathname.startsWith('/nouveau-mot-de-passe') ||
      pathname.startsWith('/offline') ||
      pathname.startsWith('/api/') ||
      pathname.startsWith('/_next/') ||
      pathname.startsWith('/manifest');
    if (!autorisee) {
      return NextResponse.redirect(new URL('/admin', request.url));
    }
    // On laisse continuer : login/auth passent par PUBLIC_ROUTES, /admin par le
    // contrôle d'auth générique en bas (non connecté → /login?redirect=/admin).
  }

  // ── Pages marketing : redirections légères, SANS appel réseau ────────────
  if (MARKETING_EXACT.includes(pathname) || MARKETING_PREFIXES.some(p => pathname.startsWith(p))) {
    // Cas spéciaux de la home : liens de confirmation email Supabase dont le
    // SiteURL pointe sur `/` (?code= PKCE, ?token_hash= OTP) → /auth/callback.
    // AVANT le check cookie, pour ne pas perdre les params (ex-app/page.js).
    if (pathname === '/') {
      const sp = request.nextUrl.searchParams;
      const code = sp.get('code');
      const tokenHash = sp.get('token_hash');
      const type = sp.get('type');
      const rawNext = sp.get('next');
      const next = rawNext && rawNext.startsWith('/') && !rawNext.startsWith('//') ? rawNext : '/onboarding';
      if (code) {
        const url = new URL('/auth/callback', request.url);
        url.searchParams.set('code', code);
        url.searchParams.set('next', next);
        if (type) url.searchParams.set('type', type);
        return NextResponse.redirect(url);
      }
      if (tokenHash) {
        const url = new URL('/auth/callback', request.url);
        url.searchParams.set('token_hash', tokenHash);
        url.searchParams.set('type', type || 'signup');
        url.searchParams.set('next', next);
        return NextResponse.redirect(url);
      }
    }
    if (hasSessionCookie(request)) {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
    return NextResponse.next();
  }

  // Laisser passer les routes publiques, API, assets statiques
  if (
    PUBLIC_ROUTES.some(r => pathname.startsWith(r)) ||
    pathname.startsWith('/api/') ||
    pathname.startsWith('/_next/') ||
    pathname.startsWith('/manifest') || // manifest.json + manifest-admin.json (PWA admin)
    pathname.startsWith('/sw.js') ||
    // Les compagnons du SW (2026-08-24) : sw.js importScripts les DEUX —
    // sans ces lignes, un visiteur SANS cookie recevait la page de login en
    // HTML à leur place (default-deny, §12) et l'installation du service
    // worker échouait pour tous les anonymes ; les sessions passaient, elles,
    // parce que le proxy laisse passer les cookies valides — d'où des preuves
    // vertes en session et un trou invisible.
    pathname.startsWith('/worker-') ||
    pathname.startsWith('/workbox-') ||
    pathname.startsWith('/icons/') ||
    pathname.startsWith('/illustrations/') ||
    pathname.startsWith('/videos/') || // réels produit de la landing (ReelPhone)

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
    // illustrations/ exclu comme icons/ (AUDIT-PERF cat 1.6) : l'image de la
    // Sidebar déclenchait une vérification GoTrue à chaque affichage.
    '/((?!_next/static|_next/image|favicon.ico|manifest.json|manifest-admin.json|sw.js|worker-|workbox-|icons/|illustrations/|videos/).*)',
  ],
};
