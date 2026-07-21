import { createServerClient } from '@/lib/supabase-server';
import ClientsClient from './ClientsClient';

export default async function ClientsPage() {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  const [
    { data: profile },
    { data: clients },
    { data: statuts },
  ] = await Promise.all([
    supabase.from('profiles').select('metier, vocabulaire, niveaux, sources, studio_slug, studio_nom, prenom').eq('id', user.id).single(),
    supabase.from('clients').select('*, abonnements(id, type, offre_nom, seances_total, seances_utilisees, statut, date_fin)')
      .eq('profile_id', user.id)
      .order('updated_at', { ascending: false }),
    // Statut de compte (RPC v67) — dégrade proprement si la migration n'est pas
    // appliquée (rpc renvoie une erreur → statuts null → aucun badge « actif »).
    supabase.rpc('eleves_statut_compte'),
  ]);

  // Map client_id → { has_account, last_sign_in_at }
  const statutMap = {};
  for (const s of statuts || []) statutMap[s.client_id] = s;

  return <ClientsClient clients={clients || []} profile={profile} statutMap={statutMap} />;
}
