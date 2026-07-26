import { notFound } from 'next/navigation';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { filterCoursVisibles } from '@/lib/visibilite';
import { presenceOccupePlace } from '@/lib/presences';
import { coursDejaCommence } from '@/lib/dates';
import { studioCan } from '@/lib/plan-guard';
import { reportError } from '@/lib/report';
import EmbedPlanning from './EmbedPlanning';

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

async function getData(studioSlug, { semaines, type }) {
  const supabase = supabaseAdmin;

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, studio_nom, studio_slug, afficher_inscrits, plan, trial_started_at, created_at, stripe_subscription_status, stripe_current_period_end, portail_actif')
    .eq('studio_slug', studioSlug)
    .single();
  if (!profile || profile.portail_actif !== true) return null;

  const today = new Date().toLocaleDateString('sv-SE', { timeZone: 'Europe/Paris' });
  const jours = Math.min(JOURS_MAX, Math.max(7, (parseInt(semaines) || 4) * 7));
  const finFenetre = new Date(Date.now() + jours * 86400000).toLocaleDateString('sv-SE', { timeZone: 'Europe/Paris' });

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

  // Jauge (formule v74 — jamais de count brut sur presences).
  const coursIds = cours.map(c => c.id);
  const counts = {};
  if (coursIds.length > 0) {
    const { data: presences, error: presErr } = await supabase
      .from('presences')
      .select('cours_id, statut_pointage, annulation_tardive')
      .in('cours_id', coursIds);
    if (presErr) reportError('[embed] lecture presences err:', presErr, { route: `/embed/${studioSlug}` });
    (presences || []).filter(presenceOccupePlace).forEach(p => {
      counts[p.cours_id] = (counts[p.cours_id] || 0) + 1;
    });
  }

  return {
    studioNom: profile.studio_nom,
    slug: profile.studio_slug,
    afficherInscrits: profile.afficher_inscrits !== false,
    // Vitrine Essentiel (B3c) : le planning se voit, la résa se fait en direct.
    canReserve: studioCan(profile, 'reservation_en_ligne'),
    cours: cours.map(c => ({ ...c, nbInscrits: counts[c.id] || 0 })),
  };
}

export async function generateMetadata({ params }) {
  const { studioSlug } = await params;
  return {
    title: `Planning — ${studioSlug}`,
    robots: { index: false, follow: false }, // page technique, iframée seulement
  };
}

export default async function EmbedPage({ params, searchParams }) {
  const { studioSlug } = await params;
  const sp = await searchParams;
  const data = await getData(studioSlug, { semaines: sp?.semaines, type: sp?.type });
  if (!data) notFound();
  return <EmbedPlanning {...data} />;
}
