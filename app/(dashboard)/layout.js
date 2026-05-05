import { createServerClient } from '@/lib/supabase-server';
import { redirect } from 'next/navigation';
import DashboardLayoutClient from './DashboardLayoutClient';
import { getTrialStatus } from '@/lib/trial';

export default async function DashboardLayout({ children }) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Charger le profil (incluant trial_started_at + stripe_subscription_status
  // pour calculer le statut du trial 14j côté serveur, à passer au client)
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

  // Statut du trial 14j (calculé côté serveur). Sérialisable, on convertit
  // les Date en string pour passer à un Client Component.
  const trialRaw = getTrialStatus(profile);
  const trial = {
    ...trialRaw,
    endsAt: trialRaw.endsAt ? trialRaw.endsAt.toISOString() : null,
    startedAt: trialRaw.startedAt ? trialRaw.startedAt.toISOString() : null,
  };

  // Compteur de cas non résolus (badge sidebar "À traiter")
  // Try/catch silencieux : si la table cas_a_traiter n'existe pas encore
  // (migration v34 pas appliquée), on retombe sur 0 sans casser la page.
  let nbCasATraiter = 0;
  try {
    const { count } = await supabase
      .from('cas_a_traiter')
      .select('id', { count: 'exact', head: true })
      .eq('profile_id', user.id)
      .is('resolu_at', null);
    nbCasATraiter = count || 0;
  } catch {}

  return (
    <DashboardLayoutClient profile={profile} trial={trial} nbCasATraiter={nbCasATraiter}>
      {children}
    </DashboardLayoutClient>
  );
}
