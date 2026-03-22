import { createServerClient } from '@/lib/supabase-server';
import { redirect } from 'next/navigation';
import DashboardLayoutClient from './DashboardLayoutClient';

export default async function DashboardLayout({ children }) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Charger le profil
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  // Si pas de profil ou pas d'onboarding complété, rediriger
  if (!profile || !profile.studio_nom || profile.studio_nom === 'Mon Studio') {
    // Vérifier si l'onboarding a été fait (studio_nom modifié)
    // On laisse passer pour l'instant, l'onboarding est optionnel
  }

  return (
    <DashboardLayoutClient profile={profile}>
      {children}
    </DashboardLayoutClient>
  );
}
