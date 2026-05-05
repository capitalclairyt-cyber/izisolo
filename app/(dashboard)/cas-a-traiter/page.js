import { createServerClient } from '@/lib/supabase-server';
import { redirect } from 'next/navigation';
import CasATraiterClient from './CasATraiterClient';

export const metadata = { title: 'Cas à traiter — IziSolo' };
export const dynamic = 'force-dynamic';

export default async function CasATraiterPage() {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  // Charger les cas non résolus + résolus récents (pour historique)
  const [{ data: ouverts }, { data: resolus }] = await Promise.all([
    supabase
      .from('cas_a_traiter')
      .select('*, clients(prenom, nom, email, telephone), cours(nom, date, heure)')
      .eq('profile_id', user.id)
      .is('resolu_at', null)
      .order('created_at', { ascending: false }),
    supabase
      .from('cas_a_traiter')
      .select('*, clients(prenom, nom), cours(nom, date)')
      .eq('profile_id', user.id)
      .not('resolu_at', 'is', null)
      .order('resolu_at', { ascending: false })
      .limit(20),
  ]);

  return (
    <CasATraiterClient
      casOuverts={ouverts || []}
      casResolus={resolus || []}
    />
  );
}
