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
      instagram_url, facebook_url, website_url
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

  const [{ data: cours }, { data: offresStripe }, { data: offresPubliques }] = await Promise.all([
    supabase
      .from('cours')
      .select('id, nom, date, heure, duree, type_cours, lieu, capacite_max, est_annule, recurrence_parent_id')
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

  return {
    profile,
    cours: (cours || []).map(c => ({
      ...c,
      nbInscrits: presencesCounts[c.id] || 0,
    })),
    offresStripe: offresStripe || [],
    offresPubliques: offresPubliques || [],
  };
}

export default async function PortailPage({ params }) {
  const { studioSlug } = await params;
  const data = await getStudioData(studioSlug);
  if (!data) notFound();

  return (
    <PortailHome
      profile={data.profile}
      cours={data.cours}
      offresStripe={data.offresStripe}
      offresPubliques={data.offresPubliques}
      studioSlug={studioSlug}
    />
  );
}
