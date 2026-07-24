import { createAdminClient } from '@/lib/supabase-admin';
import AdminUsersClient from './AdminUsersClient';
import { fetchAllRows, countParProfil, enrichirProfil } from '@/lib/admin-stats';

async function getUsers(supabase) {
  // ⚠️ Pas de colonne email sur profiles (l'ancien select la demandait →
  // 42703 → la page affichait « 0 inscrits » depuis toujours). L'email vit
  // dans auth.users : on fusionne les deux sources par id.
  const { data: users, error } = await supabase
    .from('profiles')
    .select('id, prenom, studio_nom, studio_slug, plan, metier, created_at, updated_at, trial_started_at, stripe_subscription_status')
    .order('created_at', { ascending: false });

  if (error) console.error('getUsers error:', error);

  const emailById = {};
  const lastSignInById = {};
  try {
    const { data: page } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 });
    for (const u of page?.users || []) {
      emailById[u.id] = u.email;
      lastSignInById[u.id] = u.last_sign_in_at || null;
    }
  } catch (e) {
    console.error('getUsers listUsers error:', e?.message);
  }

  // Activité par compte — lectures PAGINÉES (jamais tronquées à 1000 en silence)
  const trenteJours = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);
  const [clientsRows, coursRows, paiementsRows] = await Promise.all([
    fetchAllRows(supabase, 'clients', 'profile_id'),
    fetchAllRows(supabase, 'cours', 'profile_id'),
    fetchAllRows(supabase, 'paiements', 'profile_id, date, statut'),
  ]);
  const paiementsPaid = paiementsRows.filter(p => p.statut === 'paid');
  const usage = {
    clientsParProfil: countParProfil(clientsRows),
    coursParProfil: countParProfil(coursRows),
    paiements30jParProfil: countParProfil(paiementsPaid.filter(p => (p.date || '') >= trenteJours)),
    dernierPaiementParProfil: paiementsPaid.reduce((m, p) => {
      if (p.profile_id && (!m[p.profile_id] || p.date > m[p.profile_id])) m[p.profile_id] = p.date;
      return m;
    }, {}),
  };

  return (users || []).map(p => enrichirProfil(p, emailById, lastSignInById, usage));
}

export default async function AdminUsersPage() {
  // Client ADMIN : liste GLOBALE des utilisateurs (le client session + RLS
  // ne renvoyait que le profil de l'admin connecté).
  const supabase = createAdminClient();
  const users = await getUsers(supabase);

  return <AdminUsersClient initialUsers={users} />;
}
