import { createServerClient } from '@/lib/supabase-server';
import ClientsClient from './ClientsClient';

export default async function ClientsPage() {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  const [
    { data: profile },
    { data: clients },
  ] = await Promise.all([
    supabase.from('profiles').select('metier, vocabulaire, niveaux, sources').eq('id', user.id).single(),
    supabase.from('clients').select('*, abonnements(id, type, offre_nom, seances_total, seances_utilisees, statut, date_fin)')
      .eq('profile_id', user.id)
      .order('updated_at', { ascending: false }),
  ]);

  return <ClientsClient clients={clients || []} profile={profile} />;
}
