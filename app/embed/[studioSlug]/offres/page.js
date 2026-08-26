import { notFound } from 'next/navigation';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { reportError } from '@/lib/report';
import { cacheEmbed } from '@/lib/embed-cache';
import { parseHexCouleur, deriverCouleursEmbed } from '@/lib/embed-couleurs';
import EmbedOffres from './EmbedOffres';
import '../../embed-palette.css';

// ════════════════════════════════════════════════════════════════════════════
// v99 — « Mes offres » : le SECOND bloc intégrable, à côté du planning (B2g).
// Même architecture, mêmes garde-fous :
//   - vue ANONYME : aucune session dans l'iframe (les cookies tiers sont
//     partitionnés, toute auth ici serait un mirage) ;
//   - l'ACTION SORT de l'iframe. Le bouton ouvre le portail sur l'onglet des
//     tarifs (?tab=tarifs&src=embed), où vivent DÉJÀ le paiement en ligne et la
//     demande d'offre (v97). On ne recrée aucun chemin d'écriture ici : une
//     iframe posée sur un site tiers est le pire endroit pour en ouvrir un.
//   - noindex : la page n'existe que pour être iframée.
//
// Volontairement indépendant de `afficher_tarifs` : coller ce bloc sur son site
// EST l'acte de publication. Le réglage du portail dit ce que montre le
// portail ; ce bloc dit ce que montre son site. Les Paramètres l'écrivent noir
// sur blanc au moment de copier le code.
// ════════════════════════════════════════════════════════════════════════════

const CACHE_TTL = 120 * 1000;
const PALETTES_EMBED = ['sable', 'rose', 'sauge', 'lavande'];

async function getDataFresh(studioSlug) {
  const supabase = supabaseAdmin;

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, studio_nom, studio_slug, portail_actif')
    .eq('studio_slug', studioSlug)
    .single();
  if (!profile || profile.portail_actif !== true) return null;

  const { data: offres, error } = await supabase
    .from('offres')
    .select('id, nom, type, prix, seances, seances_par_semaine, duree_jours, date_debut, date_fin, stripe_payment_link')
    .eq('profile_id', profile.id)
    .eq('actif', true)
    .order('ordre');
  if (error) reportError('[embed/offres] lecture offres err:', error, { route: `/embed/${studioSlug}/offres` });

  return {
    studioNom: profile.studio_nom,
    slug: profile.studio_slug,
    offres: offres || [],
  };
}

async function getData(studioSlug) {
  return cacheEmbed('offres', studioSlug, CACHE_TTL, () => getDataFresh(studioSlug));
}

export async function generateMetadata({ params }) {
  const { studioSlug } = await params;
  return {
    title: `Offres · ${studioSlug}`,
    robots: { index: false, follow: false }, // page technique, iframée seulement
  };
}

export default async function EmbedOffresPage({ params, searchParams }) {
  const { studioSlug } = await params;
  const sp = await searchParams;
  const data = await getData(studioSlug);
  if (!data) notFound();

  const c1 = parseHexCouleur(sp?.c1);
  const c2 = parseHexCouleur(sp?.c2);
  const couleurs = c1 ? deriverCouleursEmbed(c1, c2) : null;
  const palette = PALETTES_EMBED.includes(sp?.palette) ? sp.palette : 'sable';

  return <EmbedOffres {...data} palette={palette} couleurs={couleurs} />;
}
