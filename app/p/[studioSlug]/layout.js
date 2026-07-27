import PortailLayoutClient from './PortailLayoutClient';
import { fetchStudioPublic, ogPortail } from '@/lib/portail-metadata';

/**
 * Layout server du portail élève.
 * Génère un manifest PWA dynamique au nom du studio (ex: "Maude Yoga")
 * → l'élève peut installer l'app sur son écran d'accueil avec le bon nom.
 * Porte aussi l'Open Graph au nom du studio : un lien /p/* partagé par SMS ou
 * WhatsApp doit montrer le studio, pas le slogan IziSolo de la racine.
 */

export async function generateMetadata({ params }) {
  const { studioSlug } = await params;
  const studio = await fetchStudioPublic(studioSlug);
  const title = studio?.studio_nom || 'Mon Studio';

  return {
    title,
    ...ogPortail({
      studio,
      description: `Réserve tes séances et retrouve ton espace élève — ${title}.`,
    }),
    // Manifest dynamique : chaque studio → son propre nom d'appli installée
    manifest: `/p/${studioSlug}/manifest.webmanifest`,
    appleWebApp: {
      capable: true,
      title,
      statusBarStyle: 'default',
    },
    other: {
      'mobile-web-app-capable': 'yes',
    },
  };
}

export const viewport = {
  themeColor: '#d4a0a0',
  width: 'device-width',
  initialScale: 1,
  // Zoom autorisé (accessibilité malvoyants) — on ne bloque plus le pinch-to-zoom.
};

export default async function PortailLayout({ children, params }) {
  const { studioSlug } = await params;

  return (
    <>
      <link rel="apple-touch-icon" href="/icons/icon-192.png" />
      <PortailLayoutClient studioSlug={studioSlug}>
        {children}
      </PortailLayoutClient>
    </>
  );
}
