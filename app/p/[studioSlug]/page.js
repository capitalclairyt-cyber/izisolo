import { createServerClient } from '@/lib/supabase-server';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import PortailHome from './PortailHome';

export async function generateMetadata({ params }) {
  const { studioSlug } = await params;
  const supabase = await createServerClient();
  const { data: profile } = await supabase
    .from('profiles')
    .select('studio_nom, metier, ville')
    .eq('studio_slug', studioSlug)
    .single();

  if (!profile) return { title: 'Studio introuvable' };
  return {
    title: `${profile.studio_nom} — Réserver un cours`,
    description: `${profile.metier || 'Studio'} à ${profile.ville || 'France'}. Réservez vos cours en ligne.`,
  };
}

async function getStudioData(studioSlug) {
  const supabase = await createServerClient();
  const today = new Date().toISOString().slice(0, 10);
  const in60 = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

  const { data: profile } = await supabase
    .from('profiles')
    .select(`
      id, studio_nom, studio_slug, metier, adresse, code_postal, ville, types_cours,
      photo_url, photo_couverture, bio, philosophie, formations, annees_experience,
      horaires_studio, afficher_tarifs, faq_publique,
      instagram_url, facebook_url, website_url,
      page_publique_draft
    `)
    .eq('studio_slug', studioSlug)
    .single();

  if (!profile) return null;

  // Si le pro a coché "Afficher mes tarifs", on charge aussi toutes les offres actives
  const offresAffichables = profile.afficher_tarifs
    ? supabase
        .from('offres')
        .select('id, nom, type, prix, seances, duree_jours, stripe_payment_link')
        .eq('profile_id', profile.id)
        .eq('actif', true)
        .order('ordre')
    : Promise.resolve({ data: [] });

  // Sondage actif (le plus récent, non clos) — pour CTA visible sur le portail
  const sondageActifPromise = supabase
    .from('sondages_planning')
    .select('slug, titre, date_fin')
    .eq('profile_id', profile.id)
    .eq('actif', true)
    .or(`date_fin.is.null,date_fin.gte.${today}`)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  const [{ data: cours }, { data: offresStripe }, { data: offresPubliques }, { data: sondageActif }] = await Promise.all([
    supabase
      .from('cours')
      .select('id, nom, date, heure, duree_minutes, type_cours, lieu, capacite_max, est_annule, recurrence_parent_id')
      .eq('profile_id', profile.id)
      .eq('est_annule', false)
      .gte('date', today)
      .lte('date', in60)
      .order('date', { ascending: true })
      .order('heure', { ascending: true })
      .limit(40),
    supabase
      .from('offres')
      .select('id, nom, type, prix, seances, duree_jours, stripe_payment_link')
      .eq('profile_id', profile.id)
      .eq('actif', true)
      .not('stripe_payment_link', 'is', null)
      .order('ordre'),
    offresAffichables,
    sondageActifPromise,
  ]);

  // Count presences per cours
  const coursIds = (cours || []).map(c => c.id);
  let presencesCounts = {};
  if (coursIds.length > 0) {
    const { data: presences } = await supabase
      .from('presences')
      .select('cours_id')
      .in('cours_id', coursIds);
    (presences || []).forEach(p => {
      presencesCounts[p.cours_id] = (presencesCounts[p.cours_id] || 0) + 1;
    });
  }

  // Filtrer les cours du jour dont l'heure est déjà passée
  // (ex : à 18h, ne pas afficher le cours de 9h ce matin)
  const now = new Date();
  const todayStr = now.toISOString().slice(0, 10);
  const coursFutur = (cours || []).filter(c => {
    if (c.date > todayStr) return true;
    if (c.date < todayStr) return false;
    // Aujourd'hui : compare l'heure
    if (!c.heure) return true; // pas d'heure → on garde
    const [hh, mm] = c.heure.split(':').map(Number);
    const coursDateTime = new Date(now);
    coursDateTime.setHours(hh, mm, 0, 0);
    return coursDateTime > now;
  });

  return {
    profile,
    cours: coursFutur.map(c => ({
      ...c,
      nbInscrits: presencesCounts[c.id] || 0,
    })),
    offresStripe: offresStripe || [],
    offresPubliques: offresPubliques || [],
    sondageActif: sondageActif || null,
  };
}

export default async function PortailPage({ params, searchParams }) {
  const { studioSlug } = await params;
  const sp = await searchParams;
  const data = await getStudioData(studioSlug);
  if (!data) notFound();

  // Mode preview : si ?preview=1 ET le visiteur est le pro propriétaire du studio,
  // on applique le brouillon (page_publique_draft) sur les champs publics pour
  // simuler ce que verrait un visiteur après publication.
  let profile = data.profile;
  let isPreview = false;
  if (sp?.preview === '1') {
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (user && user.id === profile.id && profile.page_publique_draft) {
      profile = { ...profile, ...profile.page_publique_draft };
      isPreview = true;
    }
  }

  return (
    <PortailHome
      profile={profile}
      cours={data.cours}
      offresStripe={data.offresStripe}
      offresPubliques={data.offresPubliques}
      sondageActif={data.sondageActif}
      studioSlug={studioSlug}
      isPreview={isPreview}
    />
  );
}
