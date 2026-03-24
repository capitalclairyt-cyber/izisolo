'use client';

import Link from 'next/link';
import { TrendingUp, TrendingDown, Clock, Plus, Banknote } from 'lucide-react';
import { formatMontant, formatDate } from '@/lib/utils';
import { STATUTS_PAIEMENT } from '@/lib/constantes';

export default function RevenusClient({ revenuMois, enAttente, revenuMoisDernier, paiementsRecents }) {
  const variation = revenuMoisDernier > 0
    ? Math.round(((revenuMois - revenuMoisDernier) / revenuMoisDernier) * 100)
    : null;

  return (
    <div className="revenus-page">
      <div className="page-header animate-fade-in">
        <h1>Revenus</h1>
        <Link href="/revenus/nouveau" className="izi-btn izi-btn-primary header-cta-btn">
          <Plus size={16} /> Paiement
        </Link>
      </div>

      {/* Stat cards */}
      <div className="stats-grid animate-slide-up">
        <div className="big-stat izi-card">
          <div className="big-stat-label">Ce mois</div>
          <div className="big-stat-value">{formatMontant(revenuMois)}</div>
          {variation !== null && (
            <div className={`big-stat-trend ${variation >= 0 ? 'up' : 'down'}`}>
              {variation >= 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
              {variation >= 0 ? '+' : ''}{variation}% vs mois dernier
            </div>
          )}
        </div>
        {enAttente > 0 && (
          <div className="small-stat izi-card">
            <Clock size={18} style={{ color: 'var(--warning)' }} />
            <div>
              <div className="small-stat-value">{formatMontant(enAttente)}</div>
              <div className="small-stat-label">en attente</div>
            </div>
          </div>
        )}
      </div>

      {/* Derniers paiements */}
      <div className="section animate-slide-up">
        <div className="section-header">
          <h2>Derniers paiements</h2>
          <Link href="/revenus/nouveau" className="section-link-btn">
            <Plus size={14} /> Saisir
          </Link>
        </div>

        {paiementsRecents.length === 0 ? (
          <div className="empty-state izi-card">
            <div className="empty-emoji">&#x1f4b0;</div>
            <p className="empty-title">Aucun paiement enregistré</p>
            <Link href="/revenus/nouveau" className="izi-btn izi-btn-secondary">
              <Plus size={18} /> Premier paiement
            </Link>
          </div>
        ) : (
          <div className="paiements-list">
            {paiementsRecents.map(p => {
              const sInfo = STATUTS_PAIEMENT[p.statut] || {};
              return (
                <div key={p.id} className="paiement-item izi-card">
                  <div className="paiement-info">
                    <div className="paiement-nom">
                      {p.clients ? `${p.clients.prenom} ${p.clients.nom}` : p.intitule || 'Paiement'}
                    </div>
                    <div className="paiement-meta">
                      {formatDate(p.date)} · {p.mode}
                    </div>
                  </div>
                  <div className="paiement-right">
                    <div className="paiement-montant">{formatMontant(p.montant)}</div>
                    <span className={`izi-badge izi-badge-${sInfo.color || 'neutral'}`}>{sInfo.label || p.statut}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <Link href="/revenus/nouveau" className="izi-fab"><Plus size={24} /></Link>

      <style jsx global>{`
        .revenus-page { display: flex; flex-direction: column; gap: 20px; padding-bottom: 80px; }
        .page-header { display: flex; align-items: center; justify-content: space-between; gap: 10px; }
        .page-header h1 { font-size: 1.375rem; font-weight: 700; }
        .header-cta-btn { font-size: 0.8125rem; padding: 8px 14px; gap: 5px; }
        .stats-grid { display: flex; flex-direction: column; gap: 10px; }
        .big-stat { padding: 20px; text-align: center; }
        .big-stat-label { font-size: 0.8125rem; color: var(--text-muted); font-weight: 500; }
        .big-stat-value { font-size: 2rem; font-weight: 700; color: var(--text-primary); margin: 4px 0; }
        .big-stat-trend { display: flex; align-items: center; justify-content: center; gap: 4px; font-size: 0.8125rem; font-weight: 600; }
        .big-stat-trend.up { color: #16a34a; }
        .big-stat-trend.down { color: #dc2626; }
        .small-stat { display: flex; align-items: center; gap: 12px; padding: 14px 16px; }
        .small-stat-value { font-weight: 700; font-size: 1.0625rem; }
        .small-stat-label { font-size: 0.75rem; color: var(--text-muted); }
        .section-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }
        .section-header h2 { font-size: 1.0625rem; font-weight: 700; }
        .section-link-btn {
          display: inline-flex; align-items: center; gap: 4px;
          padding: 5px 12px; border-radius: var(--radius-full);
          background: var(--brand-light); color: var(--brand-700);
          font-size: 0.8125rem; font-weight: 600; text-decoration: none;
          border: 1px solid var(--brand-200, #fbd5d5);
          transition: background var(--transition-fast);
        }
        .section-link-btn:hover { background: var(--brand); color: white; }
        .paiements-list { display: flex; flex-direction: column; gap: 6px; }
        .paiement-item { display: flex; align-items: center; gap: 12px; padding: 12px 16px; }
        .paiement-info { flex: 1; }
        .paiement-nom { font-weight: 600; font-size: 0.9375rem; }
        .paiement-meta { font-size: 0.75rem; color: var(--text-muted); margin-top: 2px; }
        .paiement-right { text-align: right; display: flex; flex-direction: column; align-items: flex-end; gap: 4px; }
        .paiement-montant { font-weight: 700; font-size: 1rem; }
        .empty-state { display: flex; flex-direction: column; align-items: center; gap: 8px; padding: 40px 20px; text-align: center; }
        .empty-emoji { font-size: 2.5rem; }
        .empty-title { font-weight: 600; }
      `}</style>
    </div>
  );
}
