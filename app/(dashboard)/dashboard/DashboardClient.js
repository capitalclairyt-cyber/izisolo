'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  CalendarDays, Users, BarChart3, AlertTriangle, ChevronRight,
  Clock, Plus, CheckCircle2, XCircle
} from 'lucide-react';
import { formatHeure, formatMontant, formatDateCourte } from '@/lib/utils';
import { getVocabulaire } from '@/lib/vocabulaire';

export default function DashboardClient({ profile, coursDuJour, nbClients, revenusMois, alertes }) {
  const vocab = getVocabulaire(profile?.metier || 'yoga', profile?.vocabulaire);
  const prenom = profile?.prenom || 'toi';
  const router = useRouter();

  // Date du jour formatée
  const today = new Date();
  const jourStr = today.toLocaleDateString('fr-FR', {
    weekday: 'long', day: 'numeric', month: 'long'
  });

  // Nombre d'inscrits aujourd'hui
  const inscritsAujourdhui = coursDuJour.reduce((sum, c) => sum + (c.presences?.[0]?.count || 0), 0);

  return (
    <div className="dashboard">
      {/* Header avec avatar + salutation + date */}
      <div className="dash-header animate-fade-in">
        <div className="dash-header-top">
          <div className="dash-avatar">
            {(prenom[0] || 'M').toUpperCase()}
          </div>
          <div className="dash-greeting">
            <h1>Bonjour {prenom} !</h1>
            <p className="dash-date">{jourStr}</p>
          </div>
        </div>
      </div>

      {/* Bandeau alertes */}
      {alertes.length > 0 && (
        <div className="dash-alertes animate-slide-up">
          {alertes.slice(0, 3).map((a, i) => (
            <div key={i} className={`alerte-item alerte-${a.type}`}>
              <AlertTriangle size={16} />
              <span>{a.message}</span>
            </div>
          ))}
          {alertes.length > 3 && (
            <Link href="/clients" className="alerte-more">
              +{alertes.length - 3} autres alertes
            </Link>
          )}
        </div>
      )}

      {/* 3 stat cards */}
      <div className="dash-stats animate-slide-up">
        <Link href="/agenda" className="stat-card izi-card izi-card-interactive">
          <div className="stat-icon stat-icon-primary">
            <CalendarDays size={20} />
          </div>
          <div className="stat-value">{coursDuJour.length}</div>
          <div className="stat-label">Séances</div>
        </Link>

        <Link href="/clients" className="stat-card izi-card izi-card-interactive">
          <div className="stat-icon stat-icon-success">
            <Users size={20} />
          </div>
          <div className="stat-value">{inscritsAujourdhui || nbClients}</div>
          <div className="stat-label">{coursDuJour.length > 0 ? 'Inscrits' : vocab.Clients || 'Élèves'}</div>
        </Link>

        <Link href="/revenus" className="stat-card izi-card izi-card-interactive">
          <div className="stat-icon stat-icon-warning">
            <BarChart3 size={20} />
          </div>
          <div className="stat-value">{formatMontant(revenusMois)}</div>
          <div className="stat-label">Ce mois</div>
        </Link>
      </div>

      {/* Prochaines séances */}
      <div className="dash-section animate-slide-up">
        <div className="section-header">
          <h2>Tes séances aujourd'hui</h2>
          <Link href="/agenda" className="section-link">
            Tout voir <ChevronRight size={16} />
          </Link>
        </div>

        {coursDuJour.length === 0 ? (
          <div className="empty-state izi-card">
            <div className="empty-emoji">&#x1f9d8;</div>
            <p className="empty-title">Pas de cours prévu aujourd'hui</p>
            <p className="empty-desc">Profite de ta journée ou ajoute une séance</p>
            <Link href="/cours/nouveau" className="izi-btn izi-btn-secondary">
              <Plus size={18} /> Créer un cours
            </Link>
          </div>
        ) : (
          <div className="cours-list">
            {coursDuJour.map(cours => (
              <div key={cours.id} className="cours-card izi-card">
                <div className="cours-color-bar" />
                <div className="cours-body">
                  <div className="cours-top">
                    <div className="cours-info">
                      <div className="cours-nom">{cours.nom}</div>
                      <div className="cours-meta">
                        <Clock size={14} />
                        {formatHeure(cours.heure)}
                        {cours.duree_minutes && ` · ${cours.duree_minutes}min`}
                        {cours.presences?.[0]?.count > 0 && ` · ${cours.presences[0].count} inscrits`}
                      </div>
                    </div>
                    {cours.type_cours && (
                      <span className="izi-badge izi-badge-brand">{cours.type_cours}</span>
                    )}
                  </div>
                  <Link
                    href={`/pointage/${cours.id}`}
                    className="cours-pointer-btn"
                  >
                    <CheckCircle2 size={18} />
                    Pointer
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* FAB : nouveau cours */}
      <Link href="/cours/nouveau" className="izi-fab" aria-label="Nouvelle séance">
        <Plus size={24} />
      </Link>

      <style jsx global>{`
        .dashboard {
          display: flex;
          flex-direction: column;
          gap: 20px;
          padding-bottom: 80px;
        }

        /* Header */
        .dash-header-top {
          display: flex;
          align-items: center;
          gap: 14px;
        }
        .dash-avatar {
          width: 48px;
          height: 48px;
          border-radius: 50%;
          background: var(--brand);
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.25rem;
          font-weight: 700;
          flex-shrink: 0;
        }
        .dash-greeting h1 {
          font-size: 1.375rem;
          font-weight: 700;
          color: var(--text-primary);
          line-height: 1.2;
        }
        .dash-date {
          font-size: 0.875rem;
          color: var(--text-muted);
          margin-top: 2px;
          text-transform: capitalize;
        }

        /* Alertes */
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
        .alerte-info {
          background: #eff6ff;
          color: #1e40af;
          border: 1px solid #dbeafe;
        }
        .alerte-more {
          font-size: 0.75rem;
          color: var(--brand);
          text-align: center;
          text-decoration: none;
          font-weight: 600;
        }

        /* Stats */
        .dash-stats {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 12px;
        }
        .stat-card {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 6px;
          padding: 16px 8px;
          text-align: center;
          text-decoration: none;
          color: inherit;
        }
        .stat-icon {
          width: 40px;
          height: 40px;
          border-radius: var(--radius-sm);
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .stat-icon-primary {
          background: var(--brand-light);
          color: var(--brand-700);
        }
        .stat-icon-success {
          background: #d4e8d4;
          color: #3d703d;
        }
        .stat-icon-warning {
          background: #f2e8d4;
          color: #8c702a;
        }
        .stat-value {
          font-size: 1.375rem;
          font-weight: 700;
          color: var(--text-primary);
          line-height: 1;
        }
        .stat-label {
          font-size: 0.6875rem;
          color: var(--text-muted);
          font-weight: 500;
        }

        /* Section header */
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

        /* Empty state */
        .empty-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 8px;
          padding: 40px 20px;
          text-align: center;
        }
        .empty-emoji {
          font-size: 2.5rem;
        }
        .empty-title {
          font-weight: 600;
          font-size: 1rem;
          color: var(--text-primary);
        }
        .empty-desc {
          font-size: 0.875rem;
          color: var(--text-muted);
          margin-bottom: 8px;
        }

        /* Cours list */
        .cours-list {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        .cours-card {
          display: flex;
          overflow: hidden;
        }
        .cours-color-bar {
          width: 4px;
          background: var(--brand);
          flex-shrink: 0;
          border-radius: var(--radius-md) 0 0 var(--radius-md);
        }
        .cours-body {
          flex: 1;
          padding: 14px 16px;
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        .cours-top {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 8px;
        }
        .cours-nom {
          font-weight: 600;
          font-size: 0.9375rem;
          color: var(--text-primary);
        }
        .cours-meta {
          display: flex;
          align-items: center;
          gap: 4px;
          font-size: 0.8125rem;
          color: var(--text-secondary);
          margin-top: 2px;
        }
        .cours-pointer-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: 10px 16px;
          background: var(--brand);
          color: white;
          border-radius: var(--radius-full);
          text-decoration: none;
          font-size: 0.875rem;
          font-weight: 600;
          min-height: 44px;
          transition: background var(--transition-fast);
        }
        .cours-pointer-btn:active {
          background: var(--brand-dark);
          transform: scale(0.97);
        }
      `}</style>
    </div>
  );
}
