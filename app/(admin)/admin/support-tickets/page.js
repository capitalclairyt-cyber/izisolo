import { createAdminClient } from '@/lib/supabase-admin';
import AdminTicketsClient from './AdminTicketsClient';

async function getTickets(supabase) {
  // ⚠️ Schéma RÉEL en prod (sondé 2026-07-24) : colonnes FRANÇAISES —
  // sujet / statut / reponse / profile_id. L'ancien select (subject/status/
  // user_email/admin_reply, hérité du fichier migration v11 jamais aligné)
  // → 42703 → page vide en silence. On mappe vers les noms attendus par
  // AdminTicketsClient pour ne pas toucher le composant.
  const { data, error } = await supabase
    .from('support_tickets')
    .select('id, profile_id, sujet, message, statut, reponse, created_at, updated_at, profiles(studio_nom, prenom)')
    .order('created_at', { ascending: false });

  if (error) {
    // Table may not exist yet during initial setup
    console.error('getTickets error:', error);
    return [];
  }
  return (data || []).map(t => ({
    id: t.id,
    subject: t.sujet,
    message: t.message,
    status: t.statut,
    user_id: t.profile_id,
    user_email: [t.profiles?.prenom, t.profiles?.studio_nom].filter(Boolean).join(' · ') || t.profile_id,
    admin_reply: t.reponse,
    created_at: t.created_at,
    updated_at: t.updated_at,
  }));
}

export default async function AdminTicketsPage() {
  // Client ADMIN : lecture GLOBALE (avec le client session, la RLS ne
  // renvoyait que les tickets du compte admin connecté — donc rien).
  const supabase = createAdminClient();
  const tickets = await getTickets(supabase);

  return <AdminTicketsClient initialTickets={tickets} />;
}
