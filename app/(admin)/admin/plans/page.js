import { createServerClient } from '@/lib/supabase-server';

const PLANS_CONFIG = [
  {
    id: 'free',
    label: 'Free',
    price: '0€',
    description: 'Découverte de la plateforme, fonctionnalités limitées',
    features: ['1 lieu', '10 cours max', 'Agenda basique', 'Support communautaire'],
    color: '#64748b',
    bg: '#1e293b',
  },
  {
    id: 'solo',
    label: 'Solo',
    price: '9€/mois',
    description: 'Pour les praticien·es indépendant·es qui démarrent',
    features: ['3 lieux', 'Cours illimités', 'Gestion élèves', 'Pointage des présences', 'Support email'],
    color: '#60a5fa',
    bg: '#1e3a5f',
  },
  {
    id: 'pro',
    label: 'Pro',
    price: '19€/mois',
    description: 'Pour les praticien·es avec une activité établie',
    features: ['Lieux illimités', 'Cours illimités', 'Abonnements élèves', 'Revenus & facturation', 'Communication élèves', 'Support prioritaire'],
    color: '#4ade80',
    bg: '#1c3a2e',
  },
  {
    id: 'studio',
    label: 'Studio',
    price: '39€/mois',
    description: 'Pour les studios avec plusieurs intervenants',
    features: ['Tout Pro', 'Multi-intervenants', 'Statistiques avancées', 'Export comptable', 'Onboarding dédié'],
    color: '#c084fc',
    bg: '#2d1f3f',
  },
  {
    id: 'premium',
    label: 'Premium',
    price: 'Sur devis',
    description: 'Offre sur-mesure pour les grands studios',
    features: ['Tout Studio', 'API access', 'SSO', 'SLA garanti', 'Customer Success Manager'],
    color: '#fb923c',
    bg: '#3f2d1f',
  },
];

async function getPlanStats(supabase) {
  const { data: planStats } = await supabase.from('profiles').select('plan');
  const dist = (planStats || []).reduce((acc, p) => {
    const plan = p.plan || 'free';
    acc[plan] = (acc[plan] || 0) + 1;
    return acc;
  }, {});
  const total = planStats?.length || 0;
  return { dist, total };
}

export default async function AdminPlansPage() {
  const supabase = await createServerClient();
  const { dist, total } = await getPlanStats(supabase);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
      <h1 className="admin-title">💳 Plans & Abonnements</h1>

      {/* Distribution visuelle */}
      <div className="admin-card">
        <h2 className="admin-subtitle" style={{ marginBottom: '16px' }}>Répartition actuelle</h2>
        <div style={{ display: 'flex', gap: '0', height: '32px', borderRadius: '8px', overflow: 'hidden', marginBottom: '12px' }}>
          {PLANS_CONFIG.map(p => {
            const count = dist[p.id] || 0;
            const pct = total > 0 ? (count / total) * 100 : 0;
            if (pct === 0) return null;
            return (
              <div
                key={p.id}
                title={`${p.label}: ${count} (${Math.round(pct)}%)`}
                style={{ width: `${pct}%`, background: p.color, transition: 'width 0.3s', minWidth: pct > 0 ? '2px' : '0' }}
              />
            );
          })}
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
          {PLANS_CONFIG.map(p => {
            const count = dist[p.id] || 0;
            const pct = total > 0 ? Math.round((count / total) * 100) : 0;
            return (
              <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: p.color, flexShrink: 0 }} />
                <span style={{ fontSize: '0.8125rem', color: '#94a3b8' }}>
                  <span className={`admin-badge ${p.id}`}>{p.label}</span>
                  <span style={{ marginLeft: '6px', color: '#64748b' }}>{count} · {pct}%</span>
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Cards des plans */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
        {PLANS_CONFIG.map(p => {
          const count = dist[p.id] || 0;
          const pct = total > 0 ? Math.round((count / total) * 100) : 0;
          return (
            <div
              key={p.id}
              className="admin-card"
              style={{ borderColor: count > 0 ? p.color + '40' : '#2d2d3f' }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                <div>
                  <span className={`admin-badge ${p.id}`} style={{ fontSize: '0.875rem', padding: '4px 10px' }}>{p.label}</span>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '1.5rem', fontWeight: 800, color: p.color }}>{count}</div>
                  <div style={{ fontSize: '0.75rem', color: '#475569' }}>utilisateur{count !== 1 ? 's' : ''}</div>
                </div>
              </div>
              <div style={{ fontSize: '1rem', fontWeight: 700, color: '#e2e8f0', marginBottom: '4px' }}>{p.price}</div>
              <div style={{ fontSize: '0.8125rem', color: '#64748b', marginBottom: '12px', lineHeight: 1.5 }}>{p.description}</div>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                {p.features.map(f => (
                  <li key={f} style={{ fontSize: '0.8125rem', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ color: p.color, fontSize: '0.625rem' }}>●</span> {f}
                  </li>
                ))}
              </ul>
              {count > 0 && (
                <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid #2d2d3f' }}>
                  <div style={{ height: '4px', borderRadius: '99px', background: '#2d2d3f', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${pct}%`, background: p.color, borderRadius: '99px' }} />
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#475569', marginTop: '4px' }}>{pct}% des utilisateurs</div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="admin-card" style={{ borderColor: '#2d3f2d' }}>
        <h2 className="admin-subtitle" style={{ marginBottom: '8px' }}>ℹ️ Gestion des abonnements</h2>
        <p style={{ color: '#64748b', fontSize: '0.875rem', margin: 0, lineHeight: 1.6 }}>
          Les abonnements payants sont gérés via Stripe. Pour modifier le plan d'un utilisateur manuellement (ex: période d'essai offerte, remboursement, correction),
          rendez-vous dans la page <a href="/admin/users" style={{ color: '#60a5fa', textDecoration: 'none' }}>Utilisateurs</a> et cliquez sur l'icône crayon à côté du plan.
        </p>
      </div>
    </div>
  );
}
