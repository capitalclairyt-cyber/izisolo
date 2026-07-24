import { createAdminClient } from '@/lib/supabase-admin';
import FeedbacksClient from './FeedbacksClient';

export const dynamic = 'force-dynamic';

// ─── /admin/feedbacks — retours des testeuses (widget in-app) ───────────────
// La table feedback (v41) a déjà le workflow de triage en schéma (status +
// admin_note + resolved_at) — Colin lisait la table SQL à la main faute d'UI.

const MAX_FEEDBACKS = 500;

export default async function AdminFeedbacksPage() {
  const supabase = createAdminClient();

  const { data: feedbacks, error } = await supabase
    .from('feedback')
    .select('id, user_id, type, message, url, status, admin_note, resolved_at, created_at')
    .order('created_at', { ascending: false })
    .limit(MAX_FEEDBACKS);

  if (error) console.error('[admin/feedbacks]', error.message);

  // Qui parle : prénom + studio (l'email détaillé vit sur la fiche studio).
  const userIds = [...new Set((feedbacks || []).map(f => f.user_id).filter(Boolean))];
  const profilById = {};
  if (userIds.length) {
    const { data: profils, error: pErr } = await supabase
      .from('profiles')
      .select('id, prenom, studio_nom, studio_slug')
      .in('id', userIds);
    if (pErr) console.error('[admin/feedbacks] profiles:', pErr.message);
    for (const p of profils || []) profilById[p.id] = p;
  }

  return (
    <FeedbacksClient
      initialFeedbacks={feedbacks || []}
      profilById={profilById}
      tronque={(feedbacks || []).length === MAX_FEEDBACKS}
    />
  );
}
