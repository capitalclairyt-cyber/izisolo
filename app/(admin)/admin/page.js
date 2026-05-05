import { createServerClient } from '@/lib/supabase-server';
import { createClient as createAdminClient } from '@supabase/supabase-js';
import Link from 'next/link';

async function getStats(supabase) {
  const today = new Date();
  const firstOfMonth = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-01`;
  const thirtyDaysAgo = new Date(Date.now() - 30*24*60*60*1000).toISOString().slice(0,10);

  const [
    { count: totalUsers },
    { count: newUsersMonth },
    { count: totalCours },
    { count: coursMonth },
    { data: planStats },
  ] = await Promise.all([
    supabase.from('profiles').select('id', { count: 'exact', head: true }),
    supabase.from('profiles').select('id', { count: 'exact', head: true }).gte('created_at', firstOfMonth),
    supabase.from('cours').select('id', { count: 'exact', head: true }),
    supabase.from('cours').select('id', { count: 'exact', head: true }).gte('created_at', firstOfMonth),
    supabase.from('profiles').select('plan'),
  ]);

  // Distribution des plans
  const planDist = (planStats || []).reduce((acc, p) => {
    const plan = p.plan || 'free';
    acc[plan] = (acc[plan] || 0) + 1;
    return acc;
  }, {});

  return { totalUsers, newUsersMonth, totalCours, coursMonth, planDist };
}

export default async function AdminDashboard() {
  const supabase = await createServerClient();
  const stats = await getStats(supabase);

  // Derniers inscrits
  const { data: recentUsers } = await supabase
    .from('profiles')
    .select('id, prenom, studio_nom, plan, metier, created_at')
    .order('created_at', { ascending: false })
    .limit(10);

  const PLAN_COLORS = { free: 'free', solo: 'solo', pro: 'pro', premium: 'premium' };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
      <h1 className="admin-title">📊 Dashboard IziSolo</h1>

      {/* Stats globales */}
      <div className="admin-stat-grid">
        <div className="admin-stat">
          <div className="admin-stat-label">Utilisateurs total</div>
          <div className="admin-stat-value">{stats.totalUsers ?? '—'}</div>
          <div className="admin-stat-sub">+{stats.newUsersMonth ?? 0} ce mois</div>
        </div>
        <div className="admin-stat">
          <div className="admin-stat-label">Cours créés</div>
          <div className="admin-stat-value">{stats.totalCours ?? '—'}</div>
          <div className="admin-stat-sub">+{stats.coursMonth ?? 0} ce mois</div>
        </div>
        {Object.entries(stats.planDist || {}).map(([plan, count]) => (
          <div className="admin-stat" key={plan}>
            <div className="admin-stat-label">Plan {plan}</div>
            <div className="admin-stat-value">{count}</div>
            <div className="admin-stat-sub">{stats.totalUsers ? Math.round(count/stats.totalUsers*100) : 0}% des users</div>
          </div>
        ))}
      </div>

      {/* Derniers inscrits */}
      <div className="admin-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h2 className="admin-subtitle" style={{ margin: 0 }}>Derniers inscrits</h2>
          <Link href="/admin/users" style={{ fontSize: '0.8125rem', color: '#64748b', textDecoration: 'none' }}>Voir tous →</Link>
        </div>
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Prénom</th>
                <th>Studio</th>
                <th>Métier</th>
                <th>Plan</th>
                <th>Inscrit le</th>
              </tr>
            </thead>
            <tbody>
              {(recentUsers || []).map(u => (
                <tr key={u.id}>
                  <td>{u.prenom || '—'}</td>
                  <td>{u.studio_nom || '—'}</td>
                  <td style={{ color: '#64748b', fontSize: '0.8125rem' }}>{u.metier || '—'}</td>
                  <td>
                    <span className={`admin-badge ${PLAN_COLORS[u.plan] || 'free'}`}>
                      {u.plan || 'free'}
                    </span>
                  </td>
                  <td style={{ color: '#64748b', fontSize: '0.8125rem' }}>
                    {u.created_at ? new Date(u.created_at).toLocaleDateString('fr-FR') : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
