import { createServerClient } from '@/lib/supabase-server';
import { notFound } from 'next/navigation';
import CoursReservationClient from './CoursReservationClient';

async function getData(studioSlug, coursId) {
  const supabase = await createServerClient();

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, studio_nom, studio_slug, metier, ville')
    .eq('studio_slug', studioSlug)
    .single();
  if (!profile) return null;

  const { data: cours } = await supabase
    .from('cours')
    .select('*')
    .eq('id', coursId)
    .eq('profile_id', profile.id)
    .single();
  if (!cours) return null;

  const { count: nbInscrits } = await supabase
    .from('presences')
    .select('id', { count: 'exact', head: true })
    .eq('cours_id', coursId);

  return { profile, cours, nbInscrits: nbInscrits || 0 };
}

export async function generateMetadata({ params }) {
  const { studioSlug, coursId } = await params;
  const data = await getData(studioSlug, coursId);
  if (!data) return { title: 'Cours introuvable' };
  return { title: `${data.cours.nom} — ${data.profile.studio_nom}` };
}

export default async function CoursDetailPortailPage({ params }) {
  const { studioSlug, coursId } = await params;
  const data = await getData(studioSlug, coursId);
  if (!data) notFound();

  return (
    <CoursReservationClient
      cours={data.cours}
      profile={data.profile}
      nbInscrits={data.nbInscrits}
      studioSlug={studioSlug}
    />
  );
}
