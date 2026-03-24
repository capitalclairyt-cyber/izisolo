import { createServerClient } from '@/lib/supabase-server';

async function getStats(supabase) {
  const today = new Date();
  const todayStr = today.toISOString().slice(0, 10);

  // Last 12 months labels
  const months = [];
  for (let i = 11; i >= 0; i--) {
    const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
    months.push({
      label: d.toLocaleDateString('fr-FR', { month: 'short', year: '2-digit' }),
      year: d.getFullYear(),
      month: d.getMonth() + 1,
      start: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`,
      end: new Date(d.getFullYear(), d.getMonth() + 1, 1).toISOString().slice(0, 10),
    });
  }

  const [
    { data: allProfiles },
    { data: allCours },
    { data: allClients },
  ] = await Promise.all([
    supabase.from('profiles').select('id, plan, created_at, metier'),
    supabase.from('cours').select('id, created_at, date, type_cours'),
    supabase.from('clients').select('id, created_at'),
  ]);

  // Inscriptions par mois
  const signupsByMonth = months.map(m => ({
    ...m,
    count: (allProfiles || []).filter(p =>
      p.created_at >= m.start && p.created_at < m.end
    ).length,
  }));

  // Cours créés par mois
  const coursByMonth = months.map(m => ({
    ...m,
    count: (allCours || []).filter(c =>
      c.created_at >= m.start && c.created_at < m.end
    ).length,
  }));

  // Clients créés par mois
  const clientsByMonth = months.map(m => ({
    ...m,
    count: (allClients || []).filter(c =>
      c.created_at >= m.start && c.created_at < m.end
    ).length,
  }));

  // Distribution métiers
  const metierDist = (allProfiles || []).reduce((acc, p) => {
    const m = p.metier || 'Non renseigné';
    acc[m] = (acc[m] || 0) + 1;
    return acc;
  }, {});
  const metierSorted = Object.entries(metierDist).sort((a, b) => b[1] - a[1]).slice(0, 10);

  // Upcoming cours count (today + 30 days)
  const in30 = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const upcomingCours = (allCours || []).filter(c => c.date >= todayStr && c.date <= in30).length;

  return {
    signupsByMonth,
    coursByMonth,
    clientsByMonth,
    metierSorted,
    totalUsers: (allProfiles || []).length,
    totalCours: (allCours || []).length,
    totalClients: (allClients || []).length,
    upcomingCours,
  };
}

function MiniBarChart({ data, color = '#60a5fa', label }) {
  const max = Math.max(...data.map(d => d.count), 1);
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: '3px', height: '64px', marginBottom: '6px' }}>
        {data.map((d, i) => (
          <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
            <div
              title={`${d.label}: ${d.count}`}
              style={{
                width: '100%',
                height: `${Math.max((d.count / max) * 56, d.count > 0 ? 4 : 0)}px`,
                background: i === data.length - 1 ? color : color + '80',
                borderRadius: '3px 3px 0 0',
                transition: 'height 0.3s',
                minHeight: d.count > 0 ? '4px' : '0',
              }}
            />
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <span style={{ fontSize: '0.65rem', color: '#475569' }}>{data[0]?.label}</span>
        <span style={{ fontSize: '0.65rem', color: '#475569' }}>{data[data.length - 1]?.label}</span>
      </div>
    </div>
  );
}

export default async function AdminStatsPage() {
  const supabase = await createServerClient();
  const stats = await getStats(supabase);

  const currentMonthSignups = stats.signupsByMonth[stats.signupsByMonth.length - 1]?.count ?? 0;
  const prevMonthSignups = stats.signupsByMonth[stats.signupsByMonth.length - 2]?.count ?? 0;
  const signupsDelta = currentMonthSignups - prevMonthSignups;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
      <h1 className="admin-title">📈 Statistiques</h1>

      {/* KPIs */}
      <div className="admin-stat-grid">
        <div className="admin-stat">
          <div className="admin-stat-label">Utilisateurs total</div>
          <div className="admin-stat-value">{stats.totalUsers}</div>
          <div className="admin-stat-sub" style={{ color: signupsDelta >= 0 ? '#4ade80' : '#f87171' }}>
            {signupsDelta >= 0 ? '+' : ''}{signupsDelta} vs mois dernier
          </div>
        </div>
        <div className="admin-stat">
          <div className="admin-stat-label">Cours créés</div>
          <div className="admin-stat-value">{stats.totalCours}</div>
          <div className="admin-stat-sub">{stats.upcomingCours} dans les 30 prochains jours</div>
        </div>
        <div className="admin-stat">
          <div className="admin-stat-label">Élèves gérés</div>
          <div className="admin-stat-value">{stats.totalClients}</div>
          <div className="admin-stat-sub">toutes activités confondues</div>
        </div>
        <div className="admin-stat">
          <div className="admin-stat-label">Moy. cours / user</div>
          <div className="admin-stat-value">
            {stats.totalUsers > 0 ? (stats.totalCours / stats.totalUsers).toFixed(1) : '—'}
          </div>
          <div className="admin-stat-sub">cours par utilisateur</div>
        </div>
      </div>

      {/* Charts */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
        <div className="admin-card">
          <div className="admin-subtitle" style={{ marginBottom: '16px' }}>Inscriptions (12 mois)</div>
          <MiniBarChart data={stats.signupsByMonth} color="#60a5fa" />
          <div style={{ marginTop: '12px', display: 'flex', gap: '16px' }}>
            {[...stats.signupsByMonth].reverse().slice(0, 3).reverse().map((m, i) => (
              <div key={i} style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '1.125rem', fontWeight: 700, color: '#e2e8f0' }}>{m.count}</div>
                <div style={{ fontSize: '0.7rem', color: '#64748b' }}>{m.label}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="admin-card">
          <div className="admin-subtitle" style={{ marginBottom: '16px' }}>Cours créés (12 mois)</div>
          <MiniBarChart data={stats.coursByMonth} color="#4ade80" />
          <div style={{ marginTop: '12px', display: 'flex', gap: '16px' }}>
            {[...stats.coursByMonth].reverse().slice(0, 3).reverse().map((m, i) => (
              <div key={i} style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '1.125rem', fontWeight: 700, color: '#e2e8f0' }}>{m.count}</div>
                <div style={{ fontSize: '0.7rem', color: '#64748b' }}>{m.label}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="admin-card">
          <div className="admin-subtitle" style={{ marginBottom: '16px' }}>Élèves ajoutés (12 mois)</div>
          <MiniBarChart data={stats.clientsByMonth} color="#c084fc" />
          <div style={{ marginTop: '12px', display: 'flex', gap: '16px' }}>
            {[...stats.clientsByMonth].reverse().slice(0, 3).reverse().map((m, i) => (
              <div key={i} style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '1.125rem', fontWeight: 700, color: '#e2e8f0' }}>{m.count}</div>
                <div style={{ fontSize: '0.7rem', color: '#64748b' }}>{m.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Métiers */}
      <div className="admin-card">
        <h2 className="admin-subtitle" style={{ marginBottom: '16px' }}>Top métiers</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {stats.metierSorted.length === 0 ? (
            <p style={{ color: '#475569', fontSize: '0.875rem', margin: 0 }}>Aucune donnée</p>
          ) : stats.metierSorted.map(([metier, count]) => {
            const pct = stats.totalUsers > 0 ? Math.round((count / stats.totalUsers) * 100) : 0;
            return (
              <div key={metier}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <span style={{ fontSize: '0.875rem', color: '#94a3b8' }}>{metier}</span>
                  <span style={{ fontSize: '0.875rem', color: '#64748b' }}>{count} · {pct}%</span>
                </div>
                <div style={{ height: '6px', borderRadius: '99px', background: '#2d2d3f', overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${pct}%`, background: 'linear-gradient(90deg, #c084fc, #60a5fa)', borderRadius: '99px' }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
