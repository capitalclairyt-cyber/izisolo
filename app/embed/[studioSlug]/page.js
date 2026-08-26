import { notFound } from 'next/navigation';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { filterCoursVisibles } from '@/lib/visibilite';
import { compterPlacesOccupeesParCours } from '@/lib/presences';
import { coursDejaCommence } from '@/lib/dates';
import { studioCan } from '@/lib/plan-guard';
import { reportError } from '@/lib/report';
import EmbedPlanning from './EmbedPlanning';
import '../embed-palette.css';
import { parseHexCouleur, deriverCouleursEmbed } from '@/lib/embed-couleurs';
import { chargerVignettesConfig, chargerPhotosCours, greffePhotos } from '@/lib/vignette-cours';
import { cacheEmbed } from '@/lib/embed-cache';

// ════════════════════════════════════════════════════════════════════════════
// B2g — Planning INTÉGRABLE (demande Manon) : la version iframe-able de
// l'agenda public. Vit HORS de /p/[slug]/ exprès : le layout portail (header,
// nav, PWA) ne doit PAS s'hériter dans une iframe.
//
// Règles de la route :
// - Vue ANONYME uniquement (filterCoursVisibles(null) = cours publics seuls) —
//   aucune session dans l'iframe (les cookies tiers sont partitionnés par les
//   navigateurs : toute auth ici serait un mirage). L'ACTION sort de l'iframe :
//   chaque cours ouvre le portail dans un nouvel onglet (?src=embed).
// - Les headers de next.config retirent X-Frame-Options et posent
//   frame-ancestors * sur /embed/* SEULEMENT (clickjacking sans objet ici :
//   zéro action authentifiée — ne JAMAIS assouplir ailleurs).
// - noindex : la page n'existe que pour être iframée.
// ════════════════════════════════════════════════════════════════════════════

const JOURS_MAX = 7 * 12; // clamp ?semaines=

// Palettes de l'embed (?palette= / data-palette du widget) — presets, plus
// ?c1=/?c2= (hex libres, demande Manon) dont les rôles sont DÉRIVÉS avec
// plancher de contraste par lib/embed-couleurs (jamais de couleur brute sur
// du texte). Les couleurs libres priment sur la palette.
const PALETTES_EMBED = ['sable', 'rose', 'sauge', 'lavande'];

// Modes d'affichage : liste (jours avec séances, défaut) ou semaine (grille
// 7 colonnes façon semaine complète, jours vides compris — demande Manon).
const AFFICHAGES_EMBED = ['liste', 'semaine'];

// Cache mémoire 120 s par (slug, semaines, type) — AUDIT-PERF cat 2.5.
// La mécanique vit dans lib/embed-cache.js depuis v99 : le bloc « Mes offres »
// a exactement le même besoin, et deux copies auraient divergé.
const EMBED_CACHE_TTL = 120 * 1000;

async function getData(studioSlug, { semaines, type }) {
  const cacheKey = `${studioSlug}|${semaines || ''}|${type || ''}`;
  return cacheEmbed('planning', cacheKey, EMBED_CACHE_TTL, () => getDataFresh(studioSlug, { semaines, type }));
}

async function getDataFresh(studioSlug, { semaines, type }) {
  const supabase = supabaseAdmin;

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, studio_nom, studio_slug, afficher_inscrits, plan, trial_started_at, created_at, stripe_subscription_status, stripe_current_period_end, portail_actif')
    .eq('studio_slug', studioSlug)
    .single();
  if (!profile || profile.portail_actif !== true) return null;

  const today = new Date().toLocaleDateString('sv-SE', { timeZone: 'Europe/Paris' });
  const jours = Math.min(JOURS_MAX, Math.max(7, (parseInt(semaines) || 4) * 7));

  // Fenêtre ancrée sur la PREMIÈRE séance à venir, pas sur aujourd'hui.
  // Cas Manon/Soleya (2026-07-28) : coupure d'été, rentrée le lun 24/08 —
  // « aujourd'hui + 4 semaines » finissait le mar 25/08 et n'attrapait que
  // lundi et mardi de sa semaine type (« il n'y a que lundi et mardi sur le
  // planning intégré »). Ancré sur la rentrée, l'embed montre N semaines de
  // VRAI planning, en été comme en période normale (où ancre = aujourd'hui).
  const { data: premiere } = await supabase
    .from('cours')
    .select('date')
    .eq('profile_id', profile.id)
    .eq('est_annule', false)
    .gte('date', today)
    .order('date', { ascending: true })
    .limit(1);
  const ancre = premiere?.[0]?.date || today;
  const finFenetre = new Date(new Date(ancre + 'T12:00:00').getTime() + jours * 86400000)
    .toLocaleDateString('sv-SE', { timeZone: 'Europe/Paris' });

  let q = supabase
    .from('cours')
    .select('id, nom, date, heure, duree_minutes, type_cours, lieu, capacite_max, est_annule, visibilite, tarif_unitaire, carnets_acceptes')
    .eq('profile_id', profile.id)
    .eq('est_annule', false)
    .gte('date', today)
    .lte('date', finFenetre)
    .order('date', { ascending: true })
    .order('heure', { ascending: true })
    .limit(240);
  if (type) q = q.eq('type_cours', type);
  const { data: coursRaw, error: coursErr } = await q;
  if (coursErr) reportError('[embed] lecture cours err:', coursErr, { route: `/embed/${studioSlug}` });

  // Anonyme : cours publics uniquement + pas les séances déjà commencées.
  const cours = filterCoursVisibles(coursRaw || [], null).filter(c => !coursDejaCommence(c));

  // Jauge (formule v74) — agrégat RPC v89, fini le cap 1000 silencieux et le
  // transfert de centaines de lignes juste pour compter (AUDIT-PERF 2.5).
  const coursIds = cours.map(c => c.id);
  let counts = {};
  if (coursIds.length > 0) {
    try {
      counts = await compterPlacesOccupeesParCours(supabase, coursIds);
    } catch (presErr) {
      reportError('[embed] comptage places err:', presErr, { route: `/embed/${studioSlug}` });
    }
  }

  // v99 — les vignettes (photo par type + photo propre à une séance). Chargées
  // ICI, donc couvertes par le cache 120 s de l'embed. Les TONS, eux, ne sont
  // PAS repris : l'embed vit sur le site de la prof et ses couleurs viennent de
  // data-palette / data-couleur pour s'y fondre. Les photos sont à ses cours,
  // les couleurs sont à son site.
  const [apparence, photosSeances] = await Promise.all([
    chargerVignettesConfig(supabase, profile.id),
    chargerPhotosCours(supabase, coursIds),
  ]);

  return {
    studioNom: profile.studio_nom,
    slug: profile.studio_slug,
    afficherInscrits: profile.afficher_inscrits !== false,
    // Vitrine Essentiel (B3c) : le planning se voit, la résa se fait en direct.
    canReserve: studioCan(profile, 'reservation_en_ligne'),
    cours: greffePhotos(cours.map(c => ({ ...c, nbInscrits: counts[c.id] || 0 })), photosSeances),
    vignettes: apparence.vignettes,
  };
}

function paletteValide(palette) {
  return PALETTES_EMBED.includes(palette) ? palette : 'sable';
}

export async function generateMetadata({ params }) {
  const { studioSlug } = await params;
  return {
    title: `Planning · ${studioSlug}`,
    robots: { index: false, follow: false }, // page technique, iframée seulement
  };
}

export default async function EmbedPage({ params, searchParams }) {
  const { studioSlug } = await params;
  const sp = await searchParams;
  const data = await getData(studioSlug, { semaines: sp?.semaines, type: sp?.type });
  if (!data) notFound();

  const c1 = parseHexCouleur(sp?.c1);
  const c2 = parseHexCouleur(sp?.c2);
  const couleurs = c1 ? deriverCouleursEmbed(c1, c2) : null;
  const affichage = AFFICHAGES_EMBED.includes(sp?.affichage) ? sp.affichage : 'liste';

  return (
    <EmbedPlanning
      {...data}
      palette={paletteValide(sp?.palette)}
      couleurs={couleurs}
      affichage={affichage}
    />
  );
}
