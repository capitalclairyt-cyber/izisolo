import './globals.css';
import './compat.css';
import { Analytics } from '@vercel/analytics/next';
import { SpeedInsights } from '@vercel/speed-insights/next';
import { fraunces, inter, jbMono } from './fonts';
import { cookies } from 'next/headers';
import type { Metadata, Viewport } from 'next';

const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://izisolo.fr';

const VALID_PALETTES = ['rose', 'sauge', 'sable', 'lavande'] as const;
type Palette = typeof VALID_PALETTES[number];
const DEFAULT_PALETTE: Palette = 'sable'; // sable = palette historique IziSolo

export const metadata: Metadata = {
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
    title: "IziSolo — Moins d'admin. Plus de présence.",
    description: "L'outil de gestion calme et beau pour les indépendant·e·s du bien-être.",
    url: baseUrl,
  },
  twitter: {
    card: 'summary_large_image',
    title: "IziSolo — Moins d'admin. Plus de présence.",
    description: "L'outil de gestion calme et beau pour les indépendant·e·s du bien-être.",
  },
};

export const viewport: Viewport = {
  themeColor: '#d4a0a0',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // Lire la palette dans le cookie (préférence côté pro). Côté visiteur portail
  // ou pages publiques : default sable. La palette peut aussi être surchargée
  // par profile.palette en SSR via les pages server qui en ont besoin.
  const cookieStore = await cookies();
  const cookiePalette = cookieStore.get('izisolo-palette')?.value as Palette | undefined;
  const palette: Palette = cookiePalette && VALID_PALETTES.includes(cookiePalette)
    ? cookiePalette
    : DEFAULT_PALETTE;

  return (
    <html
      lang="fr"
      data-palette={palette}
      className={`${fraunces.variable} ${inter.variable} ${jbMono.variable}`}
    >
      <head>
        <link rel="apple-touch-icon" href="/icons/icon-192.png" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
      </head>
      <body>
        {children}
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
