import { createAdminClient } from '@/lib/supabase-admin';
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
  // Client ADMIN : liste GLOBALE des utilisateurs (le client session + RLS
  // ne renvoyait que le profil de l'admin connecté).
  const supabase = createAdminClient();
  const users = await getUsers(supabase);

  return <AdminUsersClient initialUsers={users} />;
}
