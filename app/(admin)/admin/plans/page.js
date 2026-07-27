import { createAdminClient } from '@/lib/supabase-admin';

// Grille définitive 2026-07-27 (cf. lib/constantes.js) : 2 plans publics
// Essentiel/Complet (clés DB solo/pro), zéro quota (v80), frontière = la
// boucle élève. free = interne, premium = legacy traité comme pro.
const PLANS_CONFIG = [
  {
    id: 'free',
    label: 'Free (interne)',
    price: '0€',
    description: 'Compte exempté — admin, early tester, démo. Full access.',
    features: ['Accès complet à toutes les features', 'Jamais visible côté pricing public', 'Attribuable uniquement par admin'],
    color: '#64748b',
    bg: '#1e293b',
  },
  {
    id: 'solo',
    label: 'Essentiel',
    price: '15 €/mois TTC',
    description: 'Ton cahier, en mieux — tout ce que la prof gère seule, sans quota',
    features: ['Élèves illimités + import/export CSV', 'Agenda, récurrences, lieux illimités', 'Pointage + carnets/abos manuels', 'Mini-compta + export comptable', 'Cas à traiter', 'Page publique vitrine (PWA)'],
    color: '#60a5fa',
    bg: '#1e3a5f',
  },
  {
    id: 'pro',
    label: 'Complet',
    price: '29 €/mois TTC',
    description: 'La boucle élève : iels réservent, annulent, paient et parlent en ligne',
    features: ['Tout Essentiel', 'Résa en ligne + annulation élève', 'Espace élève + notifs auto', 'Essai, liste d\'attente, cours privés', 'Messagerie + mailing + sondages', 'Stripe Payment Link (1 %)', 'Import fiche par photo (IA)'],
    color: '#4ade80',
    bg: '#1c3a2e',
  },
  {
    id: 'premium',
    label: 'Studio (legacy)',
    price: '79 €/mois — plus vendu',
    description: 'Plus jamais vendu (2026-07-26) : les comptes premium existants sont traités comme Complet (effectivePlan). Vidéos/white-label au backlog.',
    features: ['Traité comme Complet partout', 'Aucun Product/Price Stripe créé', 'Conservé pour l\'affichage des comptes legacy'],
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
  // Client ADMIN : stats GLOBALES (le client session + RLS ne comptait que
  // le profil de l'admin connecté → « 1 utilisateur · 100% Free »).
  const supabase = createAdminClient();
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
