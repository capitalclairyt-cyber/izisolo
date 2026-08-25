import { createServerClient } from '@/lib/supabase-server';
import { resoudreStudioActif } from '@/lib/studio-actif';
import { redirect } from 'next/navigation';
import MessagerieClient from './MessagerieClient';

export const metadata = { title: 'Messagerie' };

export default async function MessageriePage() {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  // Le studio affiché (v101) : pour une prof seule c'est elle-même,
  // pour une prof invitée dans une association c'est le studio de l'asso.
  const { studioId } = await resoudreStudioActif(supabase, user);
  if (!user) redirect('/login');

  // Charger les types de cours du profil + clients + offres pour le picker "Annoncer"
  const [
    { data: profile },
    { data: clients },
    { data: cours },
    { data: offres },
  ] = await Promise.all([
    // anniversaire_message = prefill du message anniv (clic depuis la cloche).
    // Les colonnes anniversaire_cadeau_* ont été retirées du select (B2e) :
    // chargées depuis toujours, utilisées nulle part (feature cadeau jamais construite).
    supabase.from('profiles').select('id, types_cours, studio_nom, anniversaire_message').eq('id', studioId).single(),
    supabase.from('clients')
      .select('id, prenom, nom, email')
      .eq('profile_id', studioId)
      .in('statut', ['prospect', 'actif', 'fidele'])
      .order('nom'),
    supabase.from('cours')
      .select('id, nom, type_cours, date, heure')
      .eq('profile_id', studioId)
      .gte('date', new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10))
      .order('date'),
    supabase.from('offres')
      .select('id, nom, type')
      .eq('profile_id', studioId)
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
