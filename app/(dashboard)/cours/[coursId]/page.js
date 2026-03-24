import { createServerClient } from '@/lib/supabase-server';
import { notFound } from 'next/navigation';
import CoursDetailClient from './CoursDetailClient';

export default async function CoursDetailPage({ params, searchParams }) {
  const { coursId } = await params;
  const { edit } = (await searchParams) || {};
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Charger le cours avec ses relations
  const { data: cours } = await supabase
    .from('cours')
    .select('*, recurrence:recurrence_parent_id(*)')
    .eq('id', coursId)
    .eq('profile_id', user.id)
    .single();

  if (!cours) notFound();

  // Charger les présences (inscrits)
  const { data: presences } = await supabase
    .from('presences')
    .select('*, clients(id, prenom, nom, statut, email, telephone)')
    .eq('cours_id', coursId)
    .eq('profile_id', user.id);

  // Charger les lieux
  const { data: lieux } = await supabase
    .from('lieux')
    .select('id, nom, adresse')
    .eq('profile_id', user.id)
    .eq('actif', true)
    .order('ordre');

  // Charger le profil (types de cours, vocabulaire)
  const { data: profile } = await supabase
    .from('profiles')
    .select('metier, vocabulaire, types_cours, plan')
    .eq('id', user.id)
    .single();

  // Si récurrent, compter les occurrences restantes
  let nbOccurrences = 0;
  if (cours.recurrence_parent_id) {
    const { count } = await supabase
      .from('cours')
      .select('id', { count: 'exact', head: true })
      .eq('recurrence_parent_id', cours.recurrence_parent_id)
      .eq('profile_id', user.id)
      .gte('date', (() => { const n = new Date(); return `${n.getFullYear()}-${String(n.getMonth()+1).padStart(2,'0')}-${String(n.getDate()).padStart(2,'0')}`; })());
    nbOccurrences = count || 0;
  }

  return (
    <CoursDetailClient
      cours={cours}
      presences={presences || []}
      lieux={lieux || []}
      profile={profile}
      nbOccurrences={nbOccurrences}
      autoEdit={edit === '1'}
    />
  );
}
