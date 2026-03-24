import { createServerClient } from '@/lib/supabase-server';
import { createClient as createAdminClient } from '@supabase/supabase-js';
import Link from 'next/link';
import AdminUsersClient from './AdminUsersClient';

async function getUsers(supabase) {
  const { data: users, error } = await supabase
    .from('profiles')
    .select('id, prenom, studio_nom, email, plan, metier, created_at, updated_at')
    .order('created_at', { ascending: false });

  if (error) console.error('getUsers error:', error);
  return users || [];
}

export default async function AdminUsersPage() {
  const supabase = await createServerClient();
  const users = await getUsers(supabase);

  return <AdminUsersClient initialUsers={users} />;
}
