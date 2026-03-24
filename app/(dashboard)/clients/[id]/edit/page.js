import { createServerClient } from '@/lib/supabase-server';
import { notFound } from 'next/navigation';
import EditClientClient from './EditClientClient';

export default async function EditClientPage({ params }) {
  const { id } = await params;
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: client } = await supabase
    .from('clients')
    .select('*')
    .eq('id', id)
    .eq('profile_id', user.id)
    .single();

  if (!client) notFound();

  // Fetch lieux for pro clients
  let lieux = [];
  if (client.type_client && client.type_client !== 'particulier') {
    const { data: lieuxData } = await supabase
      .from('lieux')
      .select('*')
      .eq('client_pro_id', client.id)
      .order('ordre');
    lieux = lieuxData || [];
  }

  return <EditClientClient client={client} lieux={lieux} />;
}
