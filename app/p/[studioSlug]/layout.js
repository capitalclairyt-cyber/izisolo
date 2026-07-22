import { supabaseAdmin } from '@/lib/supabase-admin';
import PortailLayoutClient from './PortailLayoutClient';

/**
 * Layout server du portail élève.
 * Génère un manifest PWA dynamique au nom du studio (ex: "Maude Yoga")
 * → l'élève peut installer l'app sur son écran d'accueil avec le bon nom.
 */
async function getStudioNom(studioSlug) {
  try {
    // Lecture publique du nom du studio via admin (hors RLS) : les RLS bloquent
    // un élève connecté (authenticated ≠ prof). Ne sélectionne que le nom public.
    const { data } = await supabaseAdmin
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
