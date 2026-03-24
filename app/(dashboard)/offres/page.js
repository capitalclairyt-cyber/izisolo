import { createServerClient } from '@/lib/supabase-server';
import OffresClient from './OffresClient';

export default async function OffresPage() {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  const [
    { data: offres },
    { data: profile },
  ] = await Promise.all([
    supabase.from('offres').select('*').eq('profile_id', user.id).order('ordre'),
    supabase.from('profiles').select('metier, vocabulaire').eq('id', user.id).single(),
  ]);

  return <OffresClient offres={offres || []} profile={profile} />;
}
