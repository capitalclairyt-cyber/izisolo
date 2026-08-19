import { createServerClient } from '@/lib/supabase-server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { isAdminEmail } from '@/lib/admin';
import './admin.css';

export default async function AdminLayout({ children }) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user || !isAdminEmail(user.email)) {
    redirect('/dashboard');
  }

  // Compteur de feedbacks non triés (badge nav) — jamais bloquant.
  let nbFeedbacksNew = 0;
  try {
    const { createAdminClient } = await import('@/lib/supabase-admin');
    const { count, error } = await createAdminClient()
      .from('feedback')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'new');
    if (!error && count) nbFeedbacksNew = count;
  } catch { /* table absente ou env manquante : badge à 0 */ }

  // Fils support « à répondre » (badge nav messagerie, v87) — jamais bloquant.
  let nbSupportNonLus = 0;
  try {
    const { createAdminClient } = await import('@/lib/supabase-admin');
    const { estNonLuePourAdmin } = await import('@/lib/messagerie-support');
    const admin = createAdminClient();
    const { data: convsSupport, error } = await admin
      .from('conversations')
      .select('id, support_admin_last_read_at')
      .eq('type', 'support')
      .limit(200);
    if (!error) {
      for (const c of (convsSupport || [])) {
        const { data: dernierPro } = await admin
          .from('messages')
          .select('created_at')
          .eq('conversation_id', c.id)
          .eq('sender_type', 'pro')
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        if (estNonLuePourAdmin(dernierPro?.created_at, c.support_admin_last_read_at)) nbSupportNonLus++;
      }
    }
  } catch { /* migration v87 absente (42703) ou env manquante : badge à 0 */ }

  return (
    <div className="admin-layout">
      <aside className="admin-sidebar">
        <div className="admin-brand">
          <span className="admin-brand-logo">⚙️</span>
          <div>
            <div className="admin-brand-name">Mélutek Admin</div>
            <div className="admin-brand-sub">IziSolo</div>
          </div>
        </div>

        <nav className="admin-nav">
          <Link href="/admin" className="admin-nav-item">📊 Dashboard</Link>
          <Link href="/admin/users" className="admin-nav-item">👥 Utilisateurs</Link>
          <Link href="/admin/plans" className="admin-nav-item">💳 Plans & abonnements</Link>
          <Link href="/admin/stats" className="admin-nav-item">📈 Statistiques</Link>
          <Link href="/admin/support-tickets" className="admin-nav-item">🎫 Tickets support</Link>
          <Link href="/admin/messagerie" className="admin-nav-item">
            📨 Messagerie profs
            {nbSupportNonLus > 0 && (
              <span style={{ marginLeft: '6px', background: '#4a2e10', color: '#f5b878', borderRadius: '999px', padding: '1px 7px', fontSize: '0.7rem', fontWeight: 700 }}>
                {nbSupportNonLus}
              </span>
            )}
          </Link>
          <Link href="/admin/feedbacks" className="admin-nav-item">
            💬 Feedbacks
            {nbFeedbacksNew > 0 && (
              <span style={{ marginLeft: '6px', background: '#1e3a5f', color: '#60a5fa', borderRadius: '999px', padding: '1px 7px', fontSize: '0.7rem', fontWeight: 700 }}>
                {nbFeedbacksNew}
              </span>
            )}
          </Link>
          <Link href="/admin/erreurs" className="admin-nav-item">🚨 Erreurs</Link>
          <Link href="/admin/demo" className="admin-nav-item">🎬 Démo</Link>
        </nav>

        <div className="admin-sidebar-footer">
          <Link href="/dashboard" className="admin-back-app">← Retour à l'app</Link>
          <div className="admin-user">{user.email}</div>
        </div>
      </aside>

      <main className="admin-main">
        <div className="admin-mode-banner" role="status">
          <span className="admin-mode-icon">⚠️</span>
          <span>
            <strong>Mode Admin Mélutek</strong> — actions visibles sur la production. Connecté en tant que <strong>{user.email}</strong>.
          </span>
        </div>
        {children}
      </main>

    </div>
  );
}
