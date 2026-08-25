import PortailLayoutClient from './PortailLayoutClient';
import { fetchStudioPublic, ogPortail } from '@/lib/portail-metadata';
import { createAdminClient } from '@/lib/supabase-admin';
import { stylePortail } from '@/lib/couleurs-marque';

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

  // Les couleurs de marque (v104) : lecture SÉPARÉE, défensive, en admin
  // (le portail est PUBLIC, il n'y a pas de session pour lire le profil).
  // Sans la migration, `couleurs` reste null et le portail garde la palette
  // du métier — exactement le comportement d'avant.
  let couleurs = null;
  try {
    const admin = createAdminClient();
    const { data, error } = await admin
      .from('profiles')
      .select('couleurs_marque')
      .eq('studio_slug', studioSlug)
      .maybeSingle();
    if (!error) couleurs = stylePortail(data?.couleurs_marque);
  } catch { /* pré-v104, ou service_role absente en local : palette par défaut */ }

  return (
    <>
      <link rel="apple-touch-icon" href="/icons/icon-192.png" />
      {/* Style INLINE : il gagne sur les palettes [data-theme] de globals.css.
          Les rôles sont dérivés avec un plancher de contraste, jamais la
          couleur brute sur du texte (lib/embed-couleurs). */}
      <div style={couleurs || undefined} data-marque={couleurs ? 'perso' : undefined}>
        <PortailLayoutClient studioSlug={studioSlug}>
          {children}
        </PortailLayoutClient>
      </div>
    </>
  );
}
