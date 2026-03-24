'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { Search, Filter, ChevronDown, Check, X, Pencil } from 'lucide-react';

const PLANS = ['free', 'solo', 'pro', 'studio', 'premium'];
const PLAN_COLORS = { free: 'free', solo: 'solo', pro: 'pro', studio: 'studio', premium: 'premium' };

export default function AdminUsersClient({ initialUsers }) {
  const [users, setUsers] = useState(initialUsers);
  const [search, setSearch] = useState('');
  const [filterPlan, setFilterPlan] = useState('');
  const [editingPlan, setEditingPlan] = useState(null); // { userId, currentPlan }
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);

  const filtered = useMemo(() => {
    return users.filter(u => {
      const matchSearch = !search ||
        (u.prenom || '').toLowerCase().includes(search.toLowerCase()) ||
        (u.studio_nom || '').toLowerCase().includes(search.toLowerCase()) ||
        (u.email || '').toLowerCase().includes(search.toLowerCase()) ||
        (u.metier || '').toLowerCase().includes(search.toLowerCase());
      const matchPlan = !filterPlan || (u.plan || 'free') === filterPlan;
      return matchSearch && matchPlan;
    });
  }, [users, search, filterPlan]);

  const handleChangePlan = async (userId, newPlan) => {
    setSaving(true);
    setSaveError(null);
    try {
      const res = await fetch('/api/admin/users/update-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, plan: newPlan }),
      });
      if (!res.ok) throw new Error('Erreur serveur');
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, plan: newPlan } : u));
      setEditingPlan(null);
    } catch (e) {
      setSaveError(e.message);
    } finally {
      setSaving(false);
    }
  };

  const planCount = PLANS.reduce((acc, p) => {
    acc[p] = users.filter(u => (u.plan || 'free') === p).length;
    return acc;
  }, {});

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '16px', flexWrap: 'wrap' }}>
        <div>
          <h1 className="admin-title" style={{ marginBottom: '4px' }}>👥 Utilisateurs</h1>
          <p style={{ color: '#64748b', fontSize: '0.875rem', margin: 0 }}>{users.length} inscrits au total</p>
        </div>
      </div>

      {/* Plan summary pills */}
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
        <button
          onClick={() => setFilterPlan('')}
          className={`admin-filter-pill ${!filterPlan ? 'active' : ''}`}
        >
          Tous ({users.length})
        </button>
        {PLANS.map(p => (
          <button
            key={p}
            onClick={() => setFilterPlan(filterPlan === p ? '' : p)}
            className={`admin-filter-pill plan-${p} ${filterPlan === p ? 'active' : ''}`}
          >
            {p} ({planCount[p] || 0})
          </button>
        ))}
      </div>

      {/* Search bar */}
      <div className="admin-card" style={{ padding: '14px 16px' }}>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <Search size={16} style={{ color: '#64748b', flexShrink: 0 }} />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Rechercher par nom, studio, email, métier…"
            style={{
              flex: 1, background: 'none', border: 'none', outline: 'none',
              color: '#e2e8f0', fontSize: '0.9rem',
            }}
          />
          {search && (
            <button onClick={() => setSearch('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', padding: '2px' }}>
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      {saveError && (
        <div style={{ background: '#2a1a1a', border: '1px solid #f87171', borderRadius: '8px', padding: '10px 14px', color: '#f87171', fontSize: '0.875rem' }}>
          Erreur : {saveError}
        </div>
      )}

      {/* Users table */}
      <div className="admin-card" style={{ padding: 0, overflow: 'hidden' }}>
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Utilisateur</th>
                <th>Studio</th>
                <th>Métier</th>
                <th>Plan</th>
                <th>Inscrit le</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', color: '#475569', padding: '32px' }}>
                    Aucun utilisateur trouvé
                  </td>
                </tr>
              ) : filtered.map(u => (
                <tr key={u.id}>
                  <td>
                    <div style={{ fontWeight: 600, color: '#e2e8f0' }}>{u.prenom || '—'}</div>
                    {u.email && <div style={{ fontSize: '0.75rem', color: '#475569', marginTop: '2px' }}>{u.email}</div>}
                  </td>
                  <td style={{ color: '#94a3b8' }}>{u.studio_nom || '—'}</td>
                  <td style={{ color: '#64748b', fontSize: '0.8125rem' }}>{u.metier || '—'}</td>
                  <td>
                    {editingPlan?.userId === u.id ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', minWidth: '120px' }}>
                        {PLANS.map(p => (
                          <button
                            key={p}
                            disabled={saving}
                            onClick={() => handleChangePlan(u.id, p)}
                            style={{
                              display: 'flex', alignItems: 'center', gap: '6px',
                              background: p === (u.plan || 'free') ? '#2d2d3f' : 'none',
                              border: '1px solid #2d2d3f', borderRadius: '6px',
                              padding: '4px 8px', cursor: saving ? 'wait' : 'pointer',
                              color: '#e2e8f0', fontSize: '0.75rem', opacity: saving ? 0.6 : 1,
                            }}
                          >
                            {p === (u.plan || 'free') && <Check size={10} />}
                            <span className={`admin-badge ${PLAN_COLORS[p]}`}>{p}</span>
                          </button>
                        ))}
                        <button
                          onClick={() => setEditingPlan(null)}
                          style={{ border: 'none', background: 'none', color: '#64748b', cursor: 'pointer', fontSize: '0.75rem', textAlign: 'left', padding: '2px 0' }}
                        >
                          Annuler
                        </button>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span className={`admin-badge ${PLAN_COLORS[u.plan] || 'free'}`}>
                          {u.plan || 'free'}
                        </span>
                        <button
                          onClick={() => setEditingPlan({ userId: u.id, currentPlan: u.plan || 'free' })}
                          title="Changer le plan"
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#475569', padding: '2px', borderRadius: '4px', display: 'flex', alignItems: 'center' }}
                        >
                          <Pencil size={12} />
                        </button>
                      </div>
                    )}
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

      <div style={{ color: '#475569', fontSize: '0.75rem', textAlign: 'right' }}>
        {filtered.length} résultat{filtered.length !== 1 ? 's' : ''} affiché{filtered.length !== 1 ? 's' : ''}
      </div>

      <style jsx global>{`
        .admin-filter-pill {
          padding: 5px 12px;
          border-radius: 99px;
          border: 1px solid #2d2d3f;
          background: #1a1a27;
          color: #64748b;
          font-size: 0.8125rem;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.15s;
        }
        .admin-filter-pill:hover { border-color: #475569; color: #94a3b8; }
        .admin-filter-pill.active { border-color: #60a5fa; color: #60a5fa; background: #1e3a5f; }
        .admin-filter-pill.plan-free.active { border-color: #64748b; color: #94a3b8; background: #1e293b; }
        .admin-filter-pill.plan-solo.active { border-color: #60a5fa; color: #60a5fa; background: #1e3a5f; }
        .admin-filter-pill.plan-pro.active { border-color: #4ade80; color: #4ade80; background: #1c3a2e; }
        .admin-filter-pill.plan-studio.active { border-color: #c084fc; color: #c084fc; background: #2d1f3f; }
        .admin-filter-pill.plan-premium.active { border-color: #fb923c; color: #fb923c; background: #3f2d1f; }
      `}</style>
    </div>
  );
}
