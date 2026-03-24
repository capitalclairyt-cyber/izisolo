import { createServerClient } from '@/lib/supabase-server';
import PortailLayoutClient from './PortailLayoutClient';

/**
 * Layout server du portail élève.
 * Génère un manifest PWA dynamique au nom du studio (ex: "Maude Yoga")
 * → l'élève peut installer l'app sur son écran d'accueil avec le bon nom.
 */
async function getStudioNom(studioSlug) {
  try {
    const supabase = await createServerClient();
    const { data } = await supabase
      .from('profiles')
      .select('studio_nom')
      .eq('studio_slug', studioSlug)
      .single();
    return data?.studio_nom || null;
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }) {
  const { studioSlug } = await params;
  const nom = await getStudioNom(studioSlug);
  const title = nom || 'Mon Studio';

  return {
    title,
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
  maximumScale: 1,
  userScalable: false,
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
