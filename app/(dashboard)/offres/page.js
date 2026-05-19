import { createServerClient } from '@/lib/supabase-server';
import { effectivePlan, planConfig } from '@/lib/plan-guard';
import OffresClient from './OffresClient';

export default async function OffresPage() {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  const [
    { data: offres },
    { data: profile },
  ] = await Promise.all([
    supabase.from('offres').select('*').eq('profile_id', user.id).order('ordre'),
    supabase.from('profiles').select('metier, vocabulaire, plan, trial_started_at, stripe_subscription_status').eq('id', user.id).single(),
  ]);

  const planKey = effectivePlan(profile);
  const plan = planConfig(planKey);

  return (
    <OffresClient
      offres={offres || []}
      profile={profile}
      planKey={planKey}
      limiteOffres={plan.limiteOffres}
    />
  );
}
