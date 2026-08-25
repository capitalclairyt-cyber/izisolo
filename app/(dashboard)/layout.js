import { createServerClient } from '@/lib/supabase-server';
import { redirect } from 'next/navigation';
import DashboardLayoutClient from './DashboardLayoutClient';
import { getTrialStatus } from '@/lib/trial';
import { resoudreStudioActif } from '@/lib/studio-actif';
import { StudioProvider } from '@/components/studio/StudioProvider';

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

  // LE point de résolution du studio affiché (v101, lot 2 multi-prof). Un seul
  // endroit décide, tout le reste en hérite : les pages serveur par leur propre
  // appel, le navigateur par StudioProvider. Pour une prof seule, studioId vaut
  // exactement user.id — c'est le cas de 100 % des comptes existants, et c'est
  // ce qui rend cette bascule invisible le jour où elle est déployée.
  const { studioId, membre, membres } = await resoudreStudioActif(supabase, user);

  // Ni studio à soi, ni invitation dans celui d'une autre : il n'y a rien à
  // montrer ici. /onboarding sait accueillir les deux cas (élève, ou prof qui
  // n'a pas encore ouvert son studio).
  if (!studioId) {
    redirect('/onboarding');
  }

  // Le profil DU STUDIO (réglages, plan, trial) — pas celui de la personne
  // connectée : c'est le studio qui a un abonnement IziSolo, pas la prof qui
  // vient y donner un cours.
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', studioId)
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
        .eq('id', studioId)
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
      .eq('profile_id', studioId)
      .is('resolu_at', null);
    nbCasATraiter = count || 0;
  } catch { /* badge décoratif : le layout ne doit jamais tomber pour un compteur */ }

  // Demandes d'essai EN ATTENTE (mode manuel) = actions à trancher → badge nav.
  let nbEssais = 0;
  try {
    const { count } = await supabase
      .from('cours_essai_demandes')
      .select('id', { count: 'exact', head: true })
      .eq('profile_id', studioId)
      .eq('statut', 'en_attente');
    nbEssais = count || 0;
  } catch { /* badge décoratif : idem */ }

  return (
    <StudioProvider studioId={studioId} membre={membre} membres={membres}>
      <DashboardLayoutClient profile={profile} trial={trial} nbCasATraiter={nbCasATraiter} nbEssais={nbEssais}>
        {children}
      </DashboardLayoutClient>
    </StudioProvider>
  );
}
