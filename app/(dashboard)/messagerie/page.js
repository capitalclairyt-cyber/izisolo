import { createServerClient } from '@/lib/supabase-server';
import { resoudreStudioActif } from '@/lib/studio-actif';
import { redirect } from 'next/navigation';
import MessagerieClient from './MessagerieClient';
import { can } from '@/lib/plan-guard';
import PlanRequis from '@/components/plan/PlanRequis';

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
    supabase.from('profiles').select('id, types_cours, studio_nom, anniversaire_message, plan, trial_started_at, stripe_subscription_status').eq('id', studioId).single(),
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

  // Frontière des plans (2026-09-07) : la messagerie est Complet.
  if (!can(profile, 'messagerie')) {
    return <PlanRequis capacite="messagerie" titre="Messagerie" texte="Écris à tes élèves une par une ou à tout un cours, envoie une annonce à tout le monde, reçois leurs messages : c'est la boucle qui les fait entrer dans ton studio." />;
  }

  return (
    <MessagerieClient
      profile={profile || { id: user.id, studio_nom: '' }}
      clients={clients || []}
      cours={cours || []}
      offres={offres || []}
    />
  );
}
