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

  // Onboarding obligatoire : si les infos minimales du studio ne sont pas
  // renseignées, on force l'utilisateur à passer par /onboarding avant de
  // pouvoir accéder à l'app. Évite que des profs débarquent sur un dashboard
  // vide sans comprendre quoi configurer.
  //   - profile manquant      → /onboarding (cas rare, post-signup raté)
  //   - studio_nom manquant   → /onboarding
  //   - studio_nom == défaut  → /onboarding (legacy : ancien défaut "Mon Studio")
  //   - metier manquant       → /onboarding
  const onboardingComplet =
    profile &&
    profile.studio_nom &&
    profile.studio_nom !== 'Mon Studio' &&
    profile.metier;

  if (!onboardingComplet) {
    redirect('/onboarding');
  }

  return (
    <DashboardLayoutClient profile={profile}>
      {children}
    </DashboardLayoutClient>
  );
}
