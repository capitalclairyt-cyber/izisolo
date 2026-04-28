'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  CalendarDays, Users, BarChart3, AlertTriangle, ChevronRight,
  Clock, Plus, CheckCircle2, XCircle, Share2, Copy, ExternalLink, X, Sparkles
} from 'lucide-react';
import { formatHeure, formatMontant } from '@/lib/utils';
import { getVocabulaire } from '@/lib/vocabulaire';
import { useToast } from '@/components/ui/ToastProvider';

export default function DashboardClient({ profile, coursDuJour, nbClients, nbCoursTotal, revenusMois, alertes }) {
  const vocab = getVocabulaire(profile?.metier || 'yoga', profile?.vocabulaire);
  const prenom = profile?.prenom || 'toi';
  const studioSlug = profile?.studio_slug;
  const router = useRouter();
  const { toast } = useToast();

  // Checklist d'onboarding : visible tant que tout n'est pas fait, dismissable
  const [checklistDismissed, setChecklistDismissed] = useState(false);
  useEffect(() => {
    if (typeof window !== 'undefined') {
      setChecklistDismissed(localStorage.getItem('izi_checklist_dismissed') === '1');
    }
  }, []);

  const checklistItems = [
    { key: 'cours',  label: 'Crée ton premier cours',   done: nbCoursTotal > 0, href: '/cours/nouveau' },
    { key: 'eleve',  label: `Ajoute ton premier ${(vocab.client || 'élève').toLowerCase()}`, done: nbClients > 0, href: '/clients/nouveau' },
    { key: 'portail', label: 'Partage ton portail élève', done: false, action: 'share' },
  ];
  const allCoreDone = checklistItems[0].done && checklistItems[1].done;
  const showChecklist = !checklistDismissed && !allCoreDone;

  const portalUrl = studioSlug
    ? `${typeof window !== 'undefined' ? window.location.origin : ''}/p/${studioSlug}`
    : null;

  const copyPortalUrl = async () => {
    if (!portalUrl) return;
    try {
      await navigator.clipboard.writeText(portalUrl);
      toast.success('Lien copié — partage-le à tes élèves !');
    } catch {
      toast.error('Impossible de copier — copie manuellement le lien');
    }
  };

  const dismissChecklist = () => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('izi_checklist_dismissed', '1');
    }
    setChecklistDismissed(true);
  };

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

      {/* Checklist de démarrage */}
      {showChecklist && (
        <div className="dash-checklist animate-slide-up">
          <button
            className="dash-checklist-close"
            onClick={dismissChecklist}
            aria-label="Masquer la checklist"
            title="Masquer"
          >
            <X size={14} />
          </button>
          <div className="dash-checklist-header">
            <Sparkles size={16} style={{ color: 'var(--brand)' }} />
            <span>Démarre ton studio en 3 étapes</span>
          </div>
          <div className="dash-checklist-items">
            {checklistItems.map(item => {
              const Inner = (
                <>
                  <span className={`dash-checklist-bullet${item.done ? ' done' : ''}`}>
                    {item.done && <CheckCircle2 size={14} />}
                  </span>
                  <span className={`dash-checklist-label${item.done ? ' done' : ''}`}>{item.label}</span>
                  {!item.done && item.action === 'share' && portalUrl ? (
                    <button onClick={copyPortalUrl} className="dash-checklist-cta">
                      <Copy size={12} /> Copier le lien
                    </button>
                  ) : !item.done ? (
                    <ChevronRight size={14} style={{ color: 'var(--brand)' }} />
                  ) : null}
                </>
              );
              return item.done || item.action === 'share' ? (
                <div key={item.key} className="dash-checklist-item">{Inner}</div>
              ) : (
                <Link key={item.key} href={item.href} className="dash-checklist-item">{Inner}</Link>
              );
            })}
          </div>
        </div>
      )}

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

      {/* Widget portail élève — toujours visible si studio_slug existe */}
      {studioSlug && portalUrl && (
        <div className="dash-portal-widget izi-card animate-slide-up">
          <div className="dash-portal-icon"><Share2 size={18} /></div>
          <div className="dash-portal-text">
            <div className="dash-portal-title">Ton portail élève</div>
            <div className="dash-portal-url">{portalUrl.replace(/^https?:\/\//, '')}</div>
          </div>
          <div className="dash-portal-actions">
            <button onClick={copyPortalUrl} className="dash-portal-btn" title="Copier le lien" aria-label="Copier le lien du portail">
              <Copy size={14} />
            </button>
            <a href={portalUrl} target="_blank" rel="noopener noreferrer" className="dash-portal-btn" title="Voir comme un élève" aria-label="Voir le portail comme un élève">
              <ExternalLink size={14} />
            </a>
          </div>
        </div>
      )}

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

        /* Checklist de démarrage */
        .dash-checklist {
          position: relative;
          background: linear-gradient(135deg, var(--brand-light), #fff);
          border: 1px solid var(--brand-200, #f0d0d0);
          border-radius: var(--radius-md);
          padding: 16px 18px 14px;
        }
        .dash-checklist-close {
          position: absolute; top: 10px; right: 10px;
          background: none; border: none; cursor: pointer;
          color: var(--text-muted); padding: 4px;
          border-radius: 50%; transition: background 0.15s;
        }
        .dash-checklist-close:hover { background: rgba(0,0,0,0.05); color: var(--text-secondary); }
        .dash-checklist-header {
          display: flex; align-items: center; gap: 8px;
          font-size: 0.875rem; font-weight: 700;
          color: var(--text-primary); margin-bottom: 12px;
        }
        .dash-checklist-items { display: flex; flex-direction: column; gap: 6px; }
        .dash-checklist-item {
          display: flex; align-items: center; gap: 12px;
          padding: 10px 12px; background: white;
          border: 1px solid var(--border); border-radius: 10px;
          text-decoration: none; color: var(--text-primary);
          transition: border-color 0.15s, transform 0.1s;
        }
        a.dash-checklist-item:hover { border-color: var(--brand); transform: translateX(2px); }
        .dash-checklist-bullet {
          width: 20px; height: 20px; border-radius: 50%;
          border: 2px solid var(--border); flex-shrink: 0;
          display: flex; align-items: center; justify-content: center;
          color: white; transition: all 0.15s;
        }
        .dash-checklist-bullet.done {
          border-color: #4ade80; background: #4ade80;
        }
        .dash-checklist-label {
          flex: 1; font-size: 0.875rem; font-weight: 500;
        }
        .dash-checklist-label.done {
          text-decoration: line-through;
          color: var(--text-muted);
        }
        .dash-checklist-cta {
          display: inline-flex; align-items: center; gap: 4px;
          padding: 5px 12px; border-radius: 99px;
          background: var(--brand); color: white; border: none;
          font-size: 0.75rem; font-weight: 600; cursor: pointer;
          transition: background 0.15s;
        }
        .dash-checklist-cta:hover { background: var(--brand-dark, #b07070); }

        /* Widget portail élève */
        .dash-portal-widget {
          display: flex; align-items: center; gap: 12px;
          padding: 14px 16px;
        }
        .dash-portal-icon {
          width: 36px; height: 36px; border-radius: 10px;
          background: var(--brand-light); color: var(--brand);
          display: flex; align-items: center; justify-content: center;
          flex-shrink: 0;
        }
        .dash-portal-text { flex: 1; min-width: 0; }
        .dash-portal-title { font-size: 0.8125rem; font-weight: 600; color: var(--text-primary); }
        .dash-portal-url {
          font-size: 0.75rem; color: var(--text-muted);
          font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
          white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
          margin-top: 2px;
        }
        .dash-portal-actions { display: flex; gap: 6px; flex-shrink: 0; }
        .dash-portal-btn {
          width: 34px; height: 34px; border-radius: 8px;
          border: 1px solid var(--border); background: white;
          color: var(--text-secondary); cursor: pointer;
          display: flex; align-items: center; justify-content: center;
          transition: all 0.15s; text-decoration: none;
        }
        .dash-portal-btn:hover {
          border-color: var(--brand); color: var(--brand);
        }
      `}</style>
    </div>
  );
}
