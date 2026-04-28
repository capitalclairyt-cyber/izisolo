import './globals.css';
import { Analytics } from '@vercel/analytics/next';
import { SpeedInsights } from '@vercel/speed-insights/next';

const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://izisolo.fr';

export const metadata = {
  metadataBase: new URL(baseUrl),
  title: {
    default: 'IziSolo — Gère ton studio simplement',
    template: '%s — IziSolo',
  },
  description: "L'app des praticien·es indépendant·es : yoga, pilates, danse, musique, coaching. Gère tes élèves, tes cours et tes crédits.",
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
    title: 'IziSolo — Gère ton studio simplement',
    description: "L'app des praticien·es indépendant·es : gère tes élèves, tes cours et tes crédits.",
    url: baseUrl,
  },
  twitter: {
    card: 'summary_large_image',
    title: 'IziSolo — Gère ton studio simplement',
    description: "L'app des praticien·es indépendant·es : gère tes élèves, tes cours et tes crédits.",
  },
};

// Next.js 15+ : themeColor et viewport doivent être dans un export séparé
export const viewport = {
  themeColor: '#d4a0a0',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({ children }) {
  return (
    <html lang="fr">
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
