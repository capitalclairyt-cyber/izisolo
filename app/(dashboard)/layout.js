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

  // Compte élève (créé via le portail d'un studio, v57) : jamais de
  // dashboard prof. /onboarding affiche l'écran dédié « tu es élève ici »
  // avec les liens vers ses portails + le parcours « devenir prof ».
  if (user.user_metadata?.role === 'eleve') {
    redirect('/onboarding');
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
  // Le marqueur fiable est studio_slug (posé UNIQUEMENT par handleFinish —
  // c'est aussi le critère v58). L'ancien test `studio_nom !== 'Mon Studio'`
  // renvoyait au wizard À VIE une prof qui nomme réellement son studio
  // « Mon Studio » — avec offre dupliquée à chaque re-complétion (B1d).
  const onboardingComplet = profile && profile.studio_slug;

  if (!onboardingComplet) {
    redirect('/onboarding');
  }

  // Pouls d'activité (v88) : horodate la présence RÉELLE de la prof dans
  // l'app — last_sign_in_at GoTrue ne bouge pas pour une session persistante
  // (PWA), anti-pattern §12, l'admin sous-comptait l'usage. Throttlé à 5 min
  // (une navigation active ne fait qu'un UPDATE par tranche) et JAMAIS
  // bloquant : pré-migration v88, l'erreur 42703 est simplement ignorée.
  {
    const derniere = profile.derniere_activite_at ? new Date(profile.derniere_activite_at).getTime() : 0;
    if (Date.now() - derniere > 5 * 60 * 1000) {
      await supabase
        .from('profiles')
        .update({ derniere_activite_at: new Date().toISOString() })
        .eq('id', user.id)
        .then(() => {}, () => {});
    }
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
  } catch { /* badge décoratif : le layout ne doit jamais tomber pour un compteur */ }

  // Demandes d'essai EN ATTENTE (mode manuel) = actions à trancher → badge nav.
  let nbEssais = 0;
  try {
    const { count } = await supabase
      .from('cours_essai_demandes')
      .select('id', { count: 'exact', head: true })
      .eq('profile_id', user.id)
      .eq('statut', 'en_attente');
    nbEssais = count || 0;
  } catch { /* badge décoratif : idem */ }

  return (
    <DashboardLayoutClient profile={profile} trial={trial} nbCasATraiter={nbCasATraiter} nbEssais={nbEssais}>
      {children}
    </DashboardLayoutClient>
  );
}
