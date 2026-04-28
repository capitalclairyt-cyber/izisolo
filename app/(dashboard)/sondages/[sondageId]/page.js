import { createServerClient } from '@/lib/supabase-server';
import { redirect, notFound } from 'next/navigation';
import ResultatsSondageClient from './ResultatsSondageClient';

export const metadata = { title: 'Résultats du sondage' };

export default async function SondageResultatsPage({ params }) {
  const { sondageId } = await params;
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  // Sondage + créneaux + réponses agrégées
  const { data: sondage } = await supabase
    .from('sondages_planning')
    .select('id, slug, titre, message, date_fin, visibilite, actif, created_at, closed_at')
    .eq('id', sondageId)
    .eq('profile_id', user.id)
    .maybeSingle();

  if (!sondage) notFound();

  const { data: creneaux } = await supabase
    .from('sondages_creneaux')
    .select('id, type_cours, jour_semaine, heure, duree_minutes, ordre, sondages_reponses(id, valeur, prenom, email, commentaire, created_at)')
    .eq('sondage_id', sondage.id)
    .order('ordre');

  // Profil pour studio_slug
  const { data: profile } = await supabase
    .from('profiles')
    .select('studio_slug, zone_vacances_default')
    .eq('id', user.id)
    .single();

  return (
    <ResultatsSondageClient
      sondage={sondage}
      creneaux={creneaux || []}
      studioSlug={profile?.studio_slug || ''}
    />
  );
}
