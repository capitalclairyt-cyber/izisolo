import { createServerClient } from '@/lib/supabase-server';
import { resoudreStudioActif } from '@/lib/studio-actif';
import { redirect } from 'next/navigation';
import { can } from '@/lib/plan-guard';
import { peut } from '@/lib/studio-membre';
import { membrePublic } from '@/lib/equipe';
import EquipeClient from './EquipeClient';

/**
 * /equipe — qui travaille dans ce studio (lot 3 du chantier multi-prof).
 *
 * Deux gardes serveur, comme sur les routes : le STUDIO doit avoir le plan
 * Multi, et la PERSONNE doit avoir le droit de gérer l'équipe. La nav cache
 * déjà l'entrée, mais une URL se tape à la main.
 */
export default async function EquipePage() {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { studioId, membre } = await resoudreStudioActif(supabase, user);
  if (!studioId) redirect('/onboarding');

  const { data: profile } = await supabase
    .from('profiles')
    .select('plan, trial_started_at, stripe_subscription_status, created_at, studio_nom, prenom')
    .eq('id', studioId)
    .single();

  const planOk = can(profile, 'equipe');
  const droitOk = peut(membre, 'equipe_gerer');
  if (!droitOk) redirect('/dashboard');

  // Chargement DÉFENSIF : sans la migration v101, la table n'existe pas et
  // l'écran doit le dire, pas afficher « aucun membre » comme si tout allait
  // bien (§12 : PostgREST rend PGRST205, pas le 42P01 de Postgres).
  let membres = [];
  let indisponible = false;
  if (planOk) {
    const { data, error } = await supabase
      .from('studio_membres')
      .select('*')
      .eq('profile_id', studioId)
      .order('role', { ascending: true })
      .order('invite_at', { ascending: true });
    if (error) indisponible = error.code === 'PGRST205' || error.code === '42P01';
    else membres = (data || []).map(membrePublic);
  }

  return (
    <EquipeClient
      membresInit={membres}
      planOk={planOk}
      indisponible={indisponible}
      studioNom={profile?.studio_nom || 'ton studio'}
    />
  );
}
