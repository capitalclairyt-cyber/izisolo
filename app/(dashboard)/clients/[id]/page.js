import { createServerClient } from '@/lib/supabase-server';
import { notFound } from 'next/navigation';
import FicheClientClient from './FicheClientClient';

export default async function FicheClientPage({ params }) {
  const { id } = await params;
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  const [
    { data: client },
    { data: profile },
    { data: abonnements },
    { data: presences },
    { data: paiements },
  ] = await Promise.all([
    supabase.from('clients').select('*').eq('id', id).eq('profile_id', user.id).single(),
    supabase.from('profiles').select('metier, vocabulaire').eq('id', user.id).single(),
    supabase.from('abonnements').select('*, offre:offres(nom, type)').eq('client_id', id).eq('profile_id', user.id).order('created_at', { ascending: false }),
    supabase.from('presences').select('*, cours(nom, date, heure)').eq('client_id', id).eq('profile_id', user.id).order('created_at', { ascending: false }).limit(20),
    supabase.from('paiements').select('id, intitule, type, montant, statut, mode, date, date_encaissement, notes').eq('client_id', id).eq('profile_id', user.id).order('date', { ascending: false }),
  ]);

  if (!client) notFound();

  // Fetch lieux linked to this client pro
  let lieux = [];
  if (client.type_client && client.type_client !== 'particulier') {
    const { data: lieuxData } = await supabase
      .from('lieux')
      .select('*')
      .eq('client_pro_id', client.id)
      .order('ordre');
    lieux = lieuxData || [];
  }

  return (
    <FicheClientClient
      client={client}
      profile={profile}
      abonnements={abonnements || []}
      presences={presences || []}
      paiements={paiements || []}
      lieux={lieux}
    />
  );
}
