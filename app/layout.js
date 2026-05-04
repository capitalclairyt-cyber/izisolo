import './globals.css';
import { Analytics } from '@vercel/analytics/next';
import { SpeedInsights } from '@vercel/speed-insights/next';
import { Instrument_Serif, Fraunces, Inter, JetBrains_Mono, Caveat } from 'next/font/google';
import AuthFragmentCatcher from '@/components/auth/AuthFragmentCatcher';

const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://izisolo.fr';

// === Phase 2 charte 2026 ===
// On garde Fraunces (display chaud, workhorse 2026 confirmé par typo-bible).
// On remplace Geist (Inter-like Vercel) par INTER directement — vrai
// workhorse 2026 (gratuit, variable, optimisé écran). Idem JetBrains Mono
// remplace Geist Mono — signature "données réelles" reconnue.
// On ajoute CAVEAT pour les accents manuscrits wellness (citation
// dashboard, message anniversaire, signature prof). À doser.
// On conserve Instrument Serif pour la landing legacy.

const instrumentSerif = Instrument_Serif({
  weight: '400',
  style: ['normal', 'italic'],
  subsets: ['latin'],
  variable: '--font-instrument-serif',
  display: 'swap',
});

// Fraunces — police display warm et généreuse (axes opsz + SOFT variables).
// Utilisée pour titres dashboard, hero, sections. Le poids se contrôle via
// font-weight ou font-variation-settings dans le CSS (axes + weight: [..]
// sont mutuellement exclusifs en next/font).
const fraunces = Fraunces({
  axes: ['opsz', 'SOFT'],
  subsets: ['latin'],
  variable: '--font-fraunces',
  display: 'swap',
});

// Inter — workhorse 2026 par défaut pour le body / UI.
// Variable name conservé `--font-geist` pour zéro refacto sur les fichiers
// qui le référencent déjà (landing.css alias `--font-body` derrière).
const inter = Inter({
  weight: ['300', '400', '500', '600', '700'],
  subsets: ['latin'],
  variable: '--font-geist',
  display: 'swap',
});

// JetBrains Mono — pour data, codes, prix dans factures, etc.
// Variable name conservé `--font-geist-mono` pour rétrocompat.
const jetMono = JetBrains_Mono({
  weight: ['400', '500', '700'],
  subsets: ['latin'],
  variable: '--font-geist-mono',
  display: 'swap',
});

// Caveat — accent manuscrit wellness (citation dashboard, message anniv).
// À doser : 2-3 endroits max, jamais en body.
const caveat = Caveat({
  weight: ['600', '700'],
  subsets: ['latin'],
  variable: '--font-script',
  display: 'swap',
});

export const metadata = {
  metadataBase: new URL(baseUrl),
  title: {
    default: 'IziSolo — Gère ton studio simplement',
    template: '%s — IziSolo',
  },
  description: "L'outil de gestion calme et beau pour les profs de yoga, pilates, méditation, danse et indépendant·e·s du bien-être. Agenda, élèves, paiements, communication — tout-en-un.",
  applicationName: 'IziSolo',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'IziSolo',
  },
  openGraph: {
    type: 'website',
    locale: 'fr_FR',
    siteName: 'IziSolo',
    title: 'IziSolo — Moins d\'admin. Plus de présence.',
    description: "L'outil de gestion calme et beau pour les indépendant·e·s du bien-être.",
    url: baseUrl,
  },
  twitter: {
    card: 'summary_large_image',
    title: 'IziSolo — Moins d\'admin. Plus de présence.',
    description: "L'outil de gestion calme et beau pour les indépendant·e·s du bien-être.",
  },
};

export const viewport = {
  themeColor: '#d4a0a0',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({ children }) {
  return (
    <html lang="fr" className={`${instrumentSerif.variable} ${fraunces.variable} ${inter.variable} ${jetMono.variable} ${caveat.variable}`}>
      <head>
        <link rel="apple-touch-icon" href="/icons/icon-192.png" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        {/*
          AUTH FRAGMENT CATCHER (inline) — s'exécute AVANT React et AVANT hydration.
          Si l'URL contient un fragment `#access_token=…&refresh_token=…` (lien
          de confirmation Supabase legacy), on forward immédiatement vers
          /auth/finaliser pour poser la session et rediriger sur /onboarding.
          Doit être inline pour être sûr de tourner même si le SW (next-pwa)
          sert un bundle JS caché. Coût : ~300 octets, exécution instantanée.
        */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
(function(){try{
  var h=window.location.hash||'';
  if(h.indexOf('access_token=')<0 && h.indexOf('refresh_token=')<0 && h.indexOf('error_description=')<0) return;
  var p=new URLSearchParams(h.replace(/^#/,''));
  var t=p.get('type')||'';
  var n=(t==='signup')?'/onboarding':((t==='recovery')?'/nouveau-mot-de-passe':'/dashboard');
  window.location.replace('/auth/finaliser?next='+encodeURIComponent(n)+h);
}catch(e){console.warn('[auth-catcher]',e);}})();
            `.trim(),
          }}
        />
      </head>
      <body>
        <AuthFragmentCatcher />
        {children}
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
