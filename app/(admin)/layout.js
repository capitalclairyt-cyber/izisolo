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
