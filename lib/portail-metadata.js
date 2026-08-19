/**
 * lib/portail-metadata.js — Métadonnées de partage (Open Graph / Twitter)
 * des pages du portail élève.
 *
 * Pourquoi : sans bloc openGraph propre, les pages /p/* héritent de celui de
 * la racine — le slogan marketing prof (« Moins d'admin. Plus de présence. »)
 * s'affichait dans l'aperçu SMS/WhatsApp quand une prof partageait le lien de
 * connexion de SON studio à une élève (retour Maude, 2026-07-27). L'aperçu
 * d'un lien portail doit parler du studio, jamais d'IziSolo.
 *
 * ⚠️ Next.js ne fusionne PAS openGraph parent/enfant : le bloc est remplacé
 * en entier. Toute page portail qui définit son propre openGraph doit donc
 * repasser par ogPortail() (image comprise), sinon elle perd l'image.
 */
import { cache } from 'react';
import { supabaseAdmin } from '@/lib/supabase-admin';

// Lecture publique du studio via admin (hors RLS : un élève connecté est
// authenticated, pas le prof). Champs PUBLICS uniquement, jamais de secrets.
// React cache() : dédupliqué PAR REQUÊTE — le generateMetadata du layout /p/*
// et celui de la page appelaient chacun leur SELECT profiles pour la même
// vue (AUDIT-PERF cat 2.5).
export const fetchStudioPublic = cache(async function fetchStudioPublic(studioSlug) {
  try {
    const { data } = await supabaseAdmin
      .from('profiles')
      .select('studio_nom, metier, ville')
      .eq('studio_slug', studioSlug)
      .single();
    return data || null;
  } catch {
    return null;
  }
});

/**
 * Bloc description + openGraph + twitter au nom du studio, à étaler dans le
 * retour d'un generateMetadata : { title, ...ogPortail({ studio, ... }) }.
 * L'image OG est la même carte studio sur toutes les pages (1 render CDN
 * par studio) ; la spécificité de la page vit dans title/description.
 */
export function ogPortail({ studio, titre, description }) {
  const nom = studio?.studio_nom || 'Mon studio';
  const eyebrow = [studio?.metier, studio?.ville].filter(Boolean).join(' · ');
  const imgParams = new URLSearchParams({
    title: nom,
    subtitle: 'Réservation en ligne & espace élève',
    palette: 'blush',
  });
  if (eyebrow) imgParams.set('eyebrow', eyebrow);
  const imageUrl = `/api/og?${imgParams.toString()}`;
  const ogTitle = titre || nom;

  return {
    description,
    openGraph: {
      type: 'website',
      siteName: nom,
      title: ogTitle,
      description,
      images: [{ url: imageUrl, width: 1200, height: 630 }],
    },
    twitter: {
      card: 'summary_large_image',
      title: ogTitle,
      description,
      images: [imageUrl],
    },
  };
}
