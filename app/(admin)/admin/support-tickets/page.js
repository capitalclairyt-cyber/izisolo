import { createServerClient } from '@/lib/supabase-server';
import AdminTicketsClient from './AdminTicketsClient';

async function getTickets(supabase) {
  const { data, error } = await supabase
    .from('support_tickets')
    .select('id, subject, message, status, user_id, user_email, created_at, updated_at, admin_reply')
    .order('created_at', { ascending: false });

  if (error) {
    // Table may not exist yet during initial setup
    console.error('getTickets error:', error);
    return [];
  }
  return data || [];
}

export default async function AdminTicketsPage() {
  const supabase = await createServerClient();
  const tickets = await getTickets(supabase);

  return <AdminTicketsClient initialTickets={tickets} />;
}
