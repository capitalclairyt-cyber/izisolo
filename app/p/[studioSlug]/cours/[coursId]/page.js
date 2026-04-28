import { createServerClient } from '@/lib/supabase-server';
import { notFound } from 'next/navigation';
import CoursReservationClient from './CoursReservationClient';

async function getData(studioSlug, coursId) {
  const supabase = await createServerClient();

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, studio_nom, studio_slug, metier, ville, regles_annulation')
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

  // Récupérer l'utilisateur connecté et son profil client dans ce studio
  const { data: { user } } = await supabase.auth.getUser();
  let currentUser = null;
  let alreadyRegistered = false;
  if (user) {
    const { data: client } = await supabase
      .from('clients')
      .select('id, prenom, nom, email, telephone')
      .eq('profile_id', profile.id)
      .ilike('email', user.email)
      .single();
    if (client) {
      currentUser = {
        nom: [client.prenom, client.nom].filter(Boolean).join(' '),
        email: client.email,
        tel: client.telephone || '',
      };
      // Détecter si déjà inscrit·e à ce cours pour bloquer le formulaire AVANT clic
      const { data: existing } = await supabase
        .from('presences')
        .select('id')
        .eq('cours_id', coursId)
        .eq('client_id', client.id)
        .maybeSingle();
      alreadyRegistered = !!existing;
    } else {
      currentUser = { nom: '', email: user.email, tel: '' };
    }
  }

  return { profile, cours, nbInscrits: nbInscrits || 0, currentUser, alreadyRegistered };
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
      currentUser={data.currentUser}
      alreadyRegistered={data.alreadyRegistered}
    />
  );
}
