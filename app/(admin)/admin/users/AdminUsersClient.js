'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { Search, Filter, ChevronDown, Check, X, Pencil } from 'lucide-react';
import { matchRecherche } from '@/lib/utils';

// `studio` retiré de l'admin (plan obsolète, jamais finalisé). Si des
// utilisateurs ont encore plan='studio' en BDD historique, l'UI les affichera
// quand même (l'enum ne filtre que les options du dropdown), et l'admin
// pourra les migrer en cliquant pour changer.
const PLANS = ['free', 'solo', 'pro', 'premium'];
const PLAN_COLORS = { free: 'free', solo: 'solo', pro: 'pro', premium: 'premium' };

// Statuts de compte (calculés serveur via lib/trial getAccountStatus)
const STATUTS_COMPTE = {
  subscribed:    { label: 'Abonné',        cls: 'st-subscribed' },
  trial_active:  { label: 'Essai',         cls: 'st-trial' },
  trial_expired: { label: 'Essai expiré',  cls: 'st-expired' },
  past_due:      { label: 'Impayé ⚠️',     cls: 'st-pastdue' },
  canceled:      { label: 'Résilié',       cls: 'st-canceled' },
  free:          { label: 'Free (interne)', cls: 'st-free' },
};

function relatif(dateStr) {
  if (!dateStr) return null;
  const j = Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000);
  if (j <= 0) return "aujourd'hui";
  if (j === 1) return 'hier';
  if (j < 30) return `il y a ${j} j`;
  return `le ${new Date(dateStr).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}`;
}

export default function AdminUsersClient({ initialUsers, comptesEleves = [] }) {
  const [users, setUsers] = useState(initialUsers);
  const [search, setSearch] = useState('');
  const [filterPlan, setFilterPlan] = useState('');
  const [filterStatut, setFilterStatut] = useState('');
  const [masquerTests, setMasquerTests] = useState(true);
  const [editingPlan, setEditingPlan] = useState(null); // { userId, currentPlan }
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);

  const filtered = useMemo(() => {
    return users.filter(u => {
      if (masquerTests && u.est_test) return false;
      const matchSearch = matchRecherche(search, u.prenom, u.studio_nom, u.email, u.metier);
      const matchPlan = !filterPlan || (u.plan || 'free') === filterPlan;
      const matchStatut = !filterStatut || u.compte_statut === filterStatut;
      return matchSearch && matchPlan && matchStatut;
    });
  }, [users, search, filterPlan, filterStatut, masquerTests]);

  const statutCount = useMemo(() => {
    const base = users.filter(u => !(masquerTests && u.est_test));
    return Object.keys(STATUTS_COMPTE).reduce((acc, s) => {
      acc[s] = base.filter(u => u.compte_statut === s).length;
      return acc;
    }, {});
  }, [users, masquerTests]);

  // Comptes élèves : la même barre de recherche filtre (email, prénom, studios).
  const elevesFiltres = useMemo(() => {
    if (!search) return comptesEleves;
    return comptesEleves.filter(e =>
      matchRecherche(search, e.prenom, e.email, ...(e.studios || []).map(s => s.nom)));
  }, [comptesEleves, search]);

  const handleChangePlan = async (userId, newPlan) => {
    const target = users.find(u => u.id === userId);
    const currentPlan = target?.plan || 'free';
    if (currentPlan === newPlan) {
      setEditingPlan(null);
      return;
    }
    const who = target?.studio_nom || target?.prenom || target?.email || 'cet utilisateur';
    if (!confirm(`Changer le plan de ${who} : ${currentPlan} → ${newPlan} ?\n\nL'utilisateur ne sera pas notifié automatiquement.`)) {
      return;
    }
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
          <p style={{ color: '#64748b', fontSize: '0.875rem', margin: 0 }}>{users.length} profs · {comptesEleves.length} comptes élèves</p>
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

      {/* Statut de compte + comptes de test */}
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
        {Object.entries(STATUTS_COMPTE).map(([s, cfg]) => (
          <button
            key={s}
            onClick={() => setFilterStatut(filterStatut === s ? '' : s)}
            className={`admin-filter-pill ${filterStatut === s ? 'active' : ''}`}
          >
            {cfg.label} ({statutCount[s] || 0})
          </button>
        ))}
        <label style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#64748b', fontSize: '0.8125rem', cursor: 'pointer', marginLeft: 'auto' }}>
          <input type="checkbox" checked={masquerTests} onChange={e => setMasquerTests(e.target.checked)} />
          Masquer les comptes test ({users.filter(u => u.est_test).length})
        </label>
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
                <th>Statut</th>
                <th>Activité</th>
                <th>Plan</th>
                <th>Inscrit le</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', color: '#475569', padding: '32px' }}>
                    Aucun utilisateur trouvé
                  </td>
                </tr>
              ) : filtered.map(u => (
                <tr key={u.id}>
                  <td>
                    <Link href={`/admin/studios/${u.id}`} style={{ textDecoration: 'none', display: 'block' }}>
                      <div style={{ fontWeight: 600, color: '#e2e8f0' }}>
                        {u.prenom || '—'}
                        {u.est_test && <span className="admin-test-badge">TEST</span>}
                      </div>
                      {u.email && <div style={{ fontSize: '0.75rem', color: '#475569', marginTop: '2px' }}>{u.email}</div>}
                    </Link>
                  </td>
                  <td style={{ color: '#94a3b8' }}>
                    <Link href={`/admin/studios/${u.id}`} style={{ textDecoration: 'none', color: '#94a3b8', display: 'block' }}>
                      {u.studio_nom || '—'} <span style={{ color: '#475569' }}>→</span>
                      {u.metier && <div style={{ fontSize: '0.7rem', color: '#475569', marginTop: '2px' }}>{u.metier}</div>}
                    </Link>
                  </td>
                  <td>
                    <span className={`admin-statut-badge ${STATUTS_COMPTE[u.compte_statut]?.cls || ''}`}>
                      {STATUTS_COMPTE[u.compte_statut]?.label || u.compte_statut}
                      {u.compte_statut === 'trial_active' && ` · J-${u.trial_jours_restants}`}
                    </span>
                    {u.last_sign_in_at && (
                      <div style={{ fontSize: '0.7rem', color: '#475569', marginTop: '3px' }}>
                        vu {relatif(u.last_sign_in_at)}
                      </div>
                    )}
                  </td>
                  <td style={{ fontSize: '0.78rem', color: '#94a3b8', lineHeight: 1.6 }}>
                    {u.nb_clients} élève{u.nb_clients > 1 ? 's' : ''} · {u.nb_cours} cours
                    <div style={{ fontSize: '0.7rem', color: u.nb_paiements_30j > 0 ? '#4ade80' : '#475569' }}>
                      {u.nb_paiements_30j > 0
                        ? `${u.nb_paiements_30j} encaissement${u.nb_paiements_30j > 1 ? 's' : ''} /30j`
                        : u.dernier_paiement
                          ? `dernier encaissement ${relatif(u.dernier_paiement)}`
                          : 'aucun encaissement'}
                    </div>
                  </td>
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

      {/* ── Comptes ÉLÈVES (2026-07-26, demande Colin) : les comptes de
          connexion des portails (auth sans profil, v57) — invisibles ici
          avant. Affiliation = leurs fiches par email ; la recherche du haut
          filtre aussi cette liste. */}
      <div>
        <h2 className="admin-subtitle" style={{ marginBottom: '4px' }}>🧘 Comptes élèves ({elevesFiltres.length}{search ? `/${comptesEleves.length}` : ''})</h2>
        <p style={{ color: '#64748b', fontSize: '0.78rem', margin: '0 0 12px' }}>
          Comptes de connexion aux portails. « Studios » = les fiches élève trouvées avec
          cet email — un compte peut être élève dans plusieurs studios.
        </p>
        <div className="admin-card" style={{ padding: 0, overflow: 'hidden' }}>
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Élève</th>
                  <th>Studio(s)</th>
                  <th>Dernière connexion</th>
                  <th>Créé le</th>
                </tr>
              </thead>
              <tbody>
                {elevesFiltres.length === 0 ? (
                  <tr>
                    <td colSpan={4} style={{ textAlign: 'center', color: '#475569', padding: '28px' }}>
                      {comptesEleves.length === 0 ? 'Aucun compte élève pour l\'instant' : 'Aucun compte élève ne correspond à la recherche'}
                    </td>
                  </tr>
                ) : elevesFiltres.map(e => (
                  <tr key={e.id}>
                    <td>
                      <div style={{ fontWeight: 600, color: '#e2e8f0' }}>
                        {e.prenom || '—'}
                        {e.role !== 'eleve' && (
                          <span className="admin-test-badge" title="Metadata role absente/inattendue — compte à regarder (façon Bruno)">⚠ rôle ?</span>
                        )}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: '#475569', marginTop: '2px' }}>{e.email}</div>
                    </td>
                    <td>
                      {e.studios.length === 0 ? (
                        <span style={{ color: '#f87171', fontSize: '0.78rem' }} title="Aucune fiche élève ne porte cet email — compte orphelin">
                          ⚠ aucune fiche
                        </span>
                      ) : (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                          {e.studios.map(s => (
                            <Link key={s.id} href={`/admin/studios/${s.id}`} style={{ textDecoration: 'none' }}>
                              <span style={{ background: '#1e3a5f', color: '#60a5fa', padding: '2px 8px', borderRadius: '6px', fontSize: '0.72rem', fontWeight: 600, display: 'inline-block' }}>
                                {s.nom} →
                              </span>
                            </Link>
                          ))}
                        </div>
                      )}
                    </td>
                    <td style={{ color: '#94a3b8', fontSize: '0.8125rem' }}>
                      {e.last_sign_in_at ? `vu ${relatif(e.last_sign_in_at)}` : <span style={{ color: '#475569' }}>jamais connecté</span>}
                    </td>
                    <td style={{ color: '#64748b', fontSize: '0.8125rem' }}>
                      {e.created_at ? new Date(e.created_at).toLocaleDateString('fr-FR') : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
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
        .admin-test-badge {
          margin-left: 6px; padding: 1px 6px; border-radius: 4px;
          background: #3f2d1f; color: #fb923c; font-size: 0.6rem; font-weight: 700;
          vertical-align: middle; letter-spacing: 0.5px;
        }
        .admin-statut-badge {
          display: inline-block; padding: 2px 8px; border-radius: 6px;
          font-size: 0.72rem; font-weight: 600; white-space: nowrap;
        }
        .admin-statut-badge.st-subscribed { background: #1c3a2e; color: #4ade80; }
        .admin-statut-badge.st-trial      { background: #1e3a5f; color: #60a5fa; }
        .admin-statut-badge.st-expired    { background: #3f2d1f; color: #fb923c; }
        .admin-statut-badge.st-pastdue    { background: #3f1f1f; color: #f87171; }
        .admin-statut-badge.st-canceled   { background: #2a2a35; color: #94a3b8; }
        .admin-statut-badge.st-free       { background: #1e293b; color: #94a3b8; }
      `}</style>
    </div>
  );
}
