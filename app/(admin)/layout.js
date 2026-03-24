import { createServerClient } from '@/lib/supabase-server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import './admin.css';

// Emails autorisés à accéder au panel admin Mélutek
// À terme : gérer via un champ "role" dans la table profiles
const ADMIN_EMAILS = [
  'admin@melutek.fr',
  'colin.boulgakoff@free.fr', // dev
  // Ajouter ici les emails des admins Mélutek
];

export default async function AdminLayout({ children }) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user || !ADMIN_EMAILS.includes(user.email)) {
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
        {children}
      </main>

    </div>
  );
}
