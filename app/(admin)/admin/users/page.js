import { createAdminClient } from '@/lib/supabase-admin';
import AdminUsersClient from './AdminUsersClient';

async function getUsers(supabase) {
  // ⚠️ Pas de colonne email sur profiles (l'ancien select la demandait →
  // 42703 → la page affichait « 0 inscrits » depuis toujours). L'email vit
  // dans auth.users : on fusionne les deux sources par id.
  const { data: users, error } = await supabase
    .from('profiles')
    .select('id, prenom, studio_nom, plan, metier, created_at, updated_at')
    .order('created_at', { ascending: false });

  if (error) console.error('getUsers error:', error);

  let emailById = {};
  try {
    const { data: page } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 });
    emailById = Object.fromEntries((page?.users || []).map(u => [u.id, u.email]));
  } catch (e) {
    console.error('getUsers listUsers error:', e?.message);
  }

  return (users || []).map(p => ({ ...p, email: emailById[p.id] || null }));
}

export default async function AdminUsersPage() {
  // Client ADMIN : liste GLOBALE des utilisateurs (le client session + RLS
  // ne renvoyait que le profil de l'admin connecté).
  const supabase = createAdminClient();
  const users = await getUsers(supabase);

  return <AdminUsersClient initialUsers={users} />;
}
