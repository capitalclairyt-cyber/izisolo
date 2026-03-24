import { createClient } from '@supabase/supabase-js';

/**
 * Manifest PWA dynamique par studio.
 * Chaque studio peut être installé comme une app distincte sur l'écran d'accueil :
 * "Maude Yoga", "Sophie Pilates", etc.
 */
export async function GET(request, { params }) {
  const { studioSlug } = await params;

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  const { data: profile } = await supabase
    .from('profiles')
    .select('studio_nom')
    .eq('studio_slug', studioSlug)
    .single();

  if (!profile) {
    return new Response('Studio introuvable', { status: 404 });
  }

  const name = profile.studio_nom || 'Mon Studio';

  // Court nom pour l'icône (≤ 15 car. pour affichage propre sur iOS/Android)
  const shortName = name.length <= 15
    ? name
    : name.split(' ').slice(0, 2).join(' ');

  const manifest = {
    name,
    short_name: shortName,
    description: `Réservez vos cours avec ${name}`,
    start_url: `/p/${studioSlug}`,
    scope: `/p/${studioSlug}/`,
    display: 'standalone',
    background_color: '#faf8f5',
    theme_color: '#d4a0a0',
    orientation: 'portrait',
    lang: 'fr',
    icons: [
      {
        src: '/icons/icon-192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any maskable',
      },
      {
        src: '/icons/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any maskable',
      },
    ],
    shortcuts: [
      {
        name: 'Voir les cours',
        short_name: 'Cours',
        url: `/p/${studioSlug}`,
        icons: [{ src: '/icons/icon-192.png', sizes: '192x192' }],
      },
      {
        name: 'Mon espace',
        short_name: 'Espace',
        url: `/p/${studioSlug}/espace`,
        icons: [{ src: '/icons/icon-192.png', sizes: '192x192' }],
      },
    ],
    categories: ['health', 'fitness', 'lifestyle'],
  };

  return new Response(JSON.stringify(manifest, null, 2), {
    headers: {
      'Content-Type': 'application/manifest+json',
      'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400',
    },
  });
}
