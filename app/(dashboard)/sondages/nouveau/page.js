import { createServerClient } from '@/lib/supabase-server';
import { resoudreStudioActif } from '@/lib/studio-actif';
import { redirect } from 'next/navigation';
import NouveauSondageClient from './NouveauSondageClient';
import { normalizeTypesCours } from '@/lib/utils';
import { can } from '@/lib/plan-guard';
import PlanRequis from '@/components/plan/PlanRequis';

export const metadata = { title: 'Nouveau sondage' };

export default async function NouveauSondagePage() {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { studioId } = await resoudreStudioActif(supabase, user);
  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('types_cours, studio_slug, plan, trial_started_at, stripe_subscription_status')
    .eq('id', studioId)
    .single();

  // Frontière des plans (2026-09-07) : le sondage planning est Complet.
  if (!can(profile, 'sondages')) {
    return <PlanRequis capacite="sondages" titre="Sondage planning" texte="Propose des créneaux, tes élèves votent depuis un lien, et tu crées les cours gagnants en deux clics." />;
  }

  const typesCoursList = profile?.types_cours
    ? normalizeTypesCours(profile.types_cours).flatMap(cat => cat.items || [])
    : [];

  return (
    <NouveauSondageClient
      typesCours={typesCoursList}
      studioSlug={profile?.studio_slug || ''}
    />
  );
}
