import { createServerClient } from '@/lib/supabase-server';
import { redirect } from 'next/navigation';
import ProfilClient from './ProfilClient';

export const metadata = { title: 'Profil' };

export default async function ProfilPage() {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, prenom, nom, studio_nom, metier, plan, palette')
    .eq('id', user.id)
    .single();

  return <ProfilClient profile={profile} />;
}
