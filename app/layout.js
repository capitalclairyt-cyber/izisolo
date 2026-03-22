import './globals.css';

export const metadata = {
  title: 'IziSolo — Gère ton studio simplement',
  description: 'L\'app des praticien·es indépendant·es : yoga, pilates, danse, musique, coaching. Gère tes élèves, tes cours et tes crédits.',
  manifest: '/manifest.json',
  themeColor: '#d4a0a0',
  viewport: {
    width: 'device-width',
    initialScale: 1,
    maximumScale: 1,
    userScalable: false,
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'IziSolo',
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="fr">
      <head>
        <link rel="apple-touch-icon" href="/icons/icon-192.png" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
      </head>
      <body>{children}</body>
    </html>
  );
}
