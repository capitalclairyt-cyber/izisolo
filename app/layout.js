import './globals.css';

export const metadata = {
  title: 'IziSolo — Gère ton studio simplement',
  description: 'L\'app des praticien·es indépendant·es : yoga, pilates, danse, musique, coaching. Gère tes élèves, tes cours et tes crédits.',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'IziSolo',
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
      <body>{children}</body>
    </html>
  );
}
