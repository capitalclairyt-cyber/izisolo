import { createServerClient } from '@/lib/supabase-server';
import { notFound } from 'next/navigation';
import EssaiClient from './EssaiClient';

export const metadata = { title: 'Cours d\'essai' };

async function getData(studioSlug) {
  const supabase = await createServerClient();
  const today = new Date().toISOString().slice(0, 10);
  const in30 = new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10);

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, studio_nom, studio_slug, metier, ville, photo_url, essai_actif, essai_mode, essai_paiement, essai_prix, essai_stripe_payment_link, essai_message')
    .eq('studio_slug', studioSlug)
    .single();

  if (!profile || !profile.essai_actif) return null;

  // Cours futurs (30j) du studio, pour la sélection du créneau
  const { data: cours } = await supabase
    .from('cours')
    .select('id, nom, type_cours, date, heure, duree_minutes, lieu, capacite_max, est_annule')
    .eq('profile_id', profile.id)
    .eq('est_annule', false)
    .gte('date', today)
    .lte('date', in30)
    .order('date', { ascending: true })
    .order('heure', { ascending: true })
    .limit(60);

  return { profile, cours: cours || [] };
}

export default async function EssaiPage({ params, searchParams }) {
  const { studioSlug } = await params;
  const sp = await searchParams;
  const data = await getData(studioSlug);
  if (!data) notFound();

  return (
    <EssaiClient
      profile={data.profile}
      cours={data.cours}
      studioSlug={studioSlug}
      preselectedCoursId={sp?.cours || null}
    />
  );
}
