'use client';

import Link from 'next/link';
import { CalendarDays, Users, Wallet, AlertTriangle, ChevronRight, Clock } from 'lucide-react';
import { formatHeure, formatMontant } from '@/lib/utils';
import { getVocabulaire } from '@/lib/vocabulaire';

export default function DashboardClient({ profile, coursDuJour, nbClients, revenusMois, alertes }) {
  const vocab = getVocabulaire(profile?.metier || 'yoga', profile?.vocabulaire);
  const prenom = profile?.prenom || 'toi';

  return (
    <div className="dashboard">
      {/* Header */}
      <div className="dash-header animate-fade-in">
        <h1>Bonjour {prenom} !</h1>
        <p className="dash-studio">{profile?.studio_nom}</p>
      </div>

      {/* Alertes */}
      {alertes.length > 0 && (
        <div className="dash-alertes animate-slide-up">
          {alertes.slice(0, 3).map((a, i) => (
            <div key={i} className={`alerte-item alerte-${a.type}`}>
              <AlertTriangle size={16} />
              <span>{a.message}</span>
            </div>
          ))}
          {alertes.length > 3 && (
            <div className="alerte-more">+{alertes.length - 3} autres alertes</div>
          )}
        </div>
      )}

      {/* Stats */}
      <div className="dash-stats animate-slide-up">
        <div className="stat-card izi-card">
          <Users size={20} style={{ color: 'var(--brand)' }} />
          <div className="stat-value">{nbClients}</div>
          <div className="stat-label">{vocab.Clients || 'Élèves'}</div>
        </div>
        <div className="stat-card izi-card">
          <CalendarDays size={20} style={{ color: 'var(--sage-dark)' }} />
          <div className="stat-value">{coursDuJour.length}</div>
          <div className="stat-label">Cours aujourd'hui</div>
        </div>
        <div className="stat-card izi-card">
          <Wallet size={20} style={{ color: 'var(--terre)' }} />
          <div className="stat-value">{formatMontant(revenusMois)}</div>
          <div className="stat-label">Ce mois</div>
        </div>
      </div>

      {/* Cours du jour */}
      <div className="dash-section animate-slide-up">
        <div className="section-header">
          <h2>Tes cours aujourd'hui</h2>
          <Link href="/cours" className="section-link">
            Tout voir <ChevronRight size={16} />
          </Link>
        </div>

        {coursDuJour.length === 0 ? (
          <div className="empty-state izi-card">
            <CalendarDays size={32} style={{ color: 'var(--text-muted)' }} />
            <p>Pas de cours prévu aujourd'hui</p>
            <Link href="/cours/nouveau" className="izi-btn izi-btn-secondary" style={{ marginTop: '8px' }}>
              Créer un cours
            </Link>
          </div>
        ) : (
          <div className="cours-list">
            {coursDuJour.map(cours => (
              <Link key={cours.id} href={`/cours/${cours.id}`} className="cours-card izi-card izi-card-interactive">
                <div className="cours-heure">
                  <Clock size={14} />
                  {formatHeure(cours.heure)}
                </div>
                <div className="cours-info">
                  <div className="cours-nom">{cours.nom}</div>
                  {cours.type_cours && (
                    <span className="izi-badge izi-badge-brand">{cours.type_cours}</span>
                  )}
                </div>
                <div className="cours-action">
                  Pointer <ChevronRight size={16} />
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      <style jsx>{`
        .dashboard {
          display: flex;
          flex-direction: column;
          gap: 20px;
          padding-bottom: 20px;
        }
        .dash-header h1 {
          font-size: 1.5rem;
          font-weight: 700;
          color: var(--text-primary);
        }
        .dash-studio {
          font-size: 0.875rem;
          color: var(--text-muted);
          margin-top: 2px;
        }
        .dash-alertes {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .alerte-item {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 10px 14px;
          border-radius: var(--radius-sm);
          font-size: 0.8125rem;
          font-weight: 500;
        }
        .alerte-warning {
          background: #fef9ee;
          color: #8c702a;
          border: 1px solid #f2e8d4;
        }
        .alerte-danger {
          background: #fef2f2;
          color: #8c2a2a;
          border: 1px solid #f2d4d4;
        }
        .alerte-more {
          font-size: 0.75rem;
          color: var(--text-muted);
          text-align: center;
        }
        .dash-stats {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 12px;
        }
        .stat-card {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 4px;
          padding: 16px 8px;
          text-align: center;
        }
        .stat-value {
          font-size: 1.25rem;
          font-weight: 700;
          color: var(--text-primary);
        }
        .stat-label {
          font-size: 0.6875rem;
          color: var(--text-muted);
          font-weight: 500;
        }
        .section-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 12px;
        }
        .section-header h2 {
          font-size: 1.0625rem;
          font-weight: 700;
        }
        .section-link {
          display: flex;
          align-items: center;
          gap: 2px;
          font-size: 0.8125rem;
          color: var(--brand);
          text-decoration: none;
          font-weight: 600;
        }
        .empty-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 8px;
          padding: 32px 20px;
          text-align: center;
          color: var(--text-muted);
          font-size: 0.875rem;
        }
        .cours-list {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .cours-card {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 14px 16px;
          text-decoration: none;
          color: inherit;
        }
        .cours-heure {
          display: flex;
          align-items: center;
          gap: 4px;
          font-size: 0.875rem;
          font-weight: 600;
          color: var(--text-secondary);
          min-width: 56px;
        }
        .cours-info {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        .cours-nom {
          font-weight: 600;
          font-size: 0.9375rem;
        }
        .cours-action {
          display: flex;
          align-items: center;
          gap: 2px;
          font-size: 0.8125rem;
          color: var(--brand);
          font-weight: 600;
        }
      `}</style>
    </div>
  );
}
