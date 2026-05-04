import { createServerClient } from '@/lib/supabase-server';
import { redirect } from 'next/navigation';
import MessagerieClient from './MessagerieClient';

export const metadata = { title: 'Messagerie' };

export default async function MessageriePage() {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  // Charger les types de cours du profil + clients + offres pour le picker "Annoncer"
  const [
    { data: profile },
    { data: clients },
    { data: cours },
    { data: offres },
  ] = await Promise.all([
    supabase.from('profiles').select('id, types_cours, studio_nom').eq('id', user.id).single(),
    supabase.from('clients')
      .select('id, prenom, nom, email')
      .eq('profile_id', user.id)
      .in('statut', ['prospect', 'actif', 'fidele'])
      .order('nom'),
    supabase.from('cours')
      .select('id, nom, type_cours, date, heure')
      .eq('profile_id', user.id)
      .gte('date', new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10))
      .order('date'),
    supabase.from('offres')
      .select('id, nom, type')
      .eq('profile_id', user.id)
      .eq('actif', true)
      .order('nom'),
  ]);

  return (
    <MessagerieClient
      profile={profile || { id: user.id, studio_nom: '' }}
      clients={clients || []}
      cours={cours || []}
      offres={offres || []}
    />
  );
}
