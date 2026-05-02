'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  CalendarDays, Users, BarChart3, AlertTriangle, ChevronRight,
  Clock, Plus, CheckCircle2, XCircle, Share2, Copy, ExternalLink, X, Sparkles,
  Receipt, MessageSquare, Settings as SettingsIcon, ClipboardList
} from 'lucide-react';
import { formatHeure, formatMontant } from '@/lib/utils';
import { getVocabulaire } from '@/lib/vocabulaire';
import { useToast } from '@/components/ui/ToastProvider';
import { toneForCours } from '@/lib/tones';

export default function DashboardClient({ profile, coursDuJour, nbClients, nbCoursTotal, revenusMois, alertes, coutsMois, hasSondage = false }) {
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

      {/* 3 tuiles stats colorées style Snug Simple */}
      <div className="dash-stats animate-slide-up">
        <Link href="/agenda" className="stat-tile stat-tile--rose">
          <div className="stat-tile-icon"><CalendarDays size={22} /></div>
          <div className="stat-tile-value">{coursDuJour.length}</div>
          <div className="stat-tile-label">Séances aujourd'hui</div>
        </Link>

        <Link href="/clients" className="stat-tile stat-tile--sage">
          <div className="stat-tile-icon"><Users size={22} /></div>
          <div className="stat-tile-value">{inscritsAujourdhui || nbClients}</div>
          <div className="stat-tile-label">{coursDuJour.length > 0 ? 'Inscrits aujourd\'hui' : (vocab.Clients || 'Élèves')}</div>
        </Link>

        <Link href="/revenus" className="stat-tile stat-tile--sand">
          <div className="stat-tile-icon"><BarChart3 size={22} /></div>
          <div className="stat-tile-value">{formatMontant(revenusMois)}</div>
          <div className="stat-tile-label">Revenus ce mois</div>
        </Link>
      </div>

      {/* CTA Sondage planning — visible si pas encore de sondage créé */}
      {!hasSondage && (
        <Link href="/sondages/nouveau" className="dash-sondage-cta animate-slide-up">
          <div className="dash-sondage-icon"><ClipboardList size={20} /></div>
          <div className="dash-sondage-text">
            <div className="dash-sondage-title">Sondage planning — découvre tes meilleurs créneaux</div>
            <div className="dash-sondage-desc">
              Découvre quels créneaux les rempliraient le mieux. 30 secondes pour eux, gros gain pour toi.
            </div>
          </div>
          <ChevronRight size={16} style={{ color: 'var(--brand)', flexShrink: 0 }} />
        </Link>
      )}

      {/* Widget Mes coûts — visible dès qu'il y a au moins un coût ce mois */}
      {coutsMois && (coutsMois.sms.count > 0 || coutsMois.stripe.montant > 0) && (
        <div className="dash-couts izi-card animate-slide-up">
          <div className="dash-couts-header">
            <div className="dash-couts-title">
              <Receipt size={16} style={{ color: 'var(--brand)' }} />
              <span>Mes coûts ce mois</span>
            </div>
            <Link href="/parametres" className="dash-couts-cog" aria-label="Régler mes notifs" title="Régler mes notifs">
              <SettingsIcon size={14} />
            </Link>
          </div>

          <div className="dash-couts-rows">
            <div className="dash-couts-row">
              <div className="dash-couts-row-left">
                <MessageSquare size={14} />
                <span>SMS envoyés</span>
                <span className="dash-couts-badge">{coutsMois.sms.count}</span>
              </div>
              <span className="dash-couts-amount">
                {formatMontant(coutsMois.sms.montant)}
              </span>
            </div>

            <div className="dash-couts-row">
              <div className="dash-couts-row-left">
                <BarChart3 size={14} />
                <span>Frais IziSolo (1 % paiements en ligne)</span>
              </div>
              <span className="dash-couts-amount">
                {formatMontant(coutsMois.stripe.montant)}
              </span>
            </div>

            <div className="dash-couts-row dash-couts-total">
              <span>Total à régler</span>
              <span className="dash-couts-amount">
                {formatMontant(coutsMois.total)}
              </span>
            </div>
          </div>

          <p className="dash-couts-note">
            Facturé sur ton abonnement IziSolo en fin de mois. Tu peux couper les SMS à tout moment depuis <Link href="/parametres">Paramètres</Link>.
          </p>
        </div>
      )}

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
            {coursDuJour.map(cours => {
              const tone = toneForCours(cours.type_cours);
              return (
              <div key={cours.id} className={`cours-card izi-card cours-card--${tone}`}>
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
                      <span className={`izi-badge tone-${tone}-bg`}>{cours.type_cours}</span>
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
              );
            })}
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

        /* Header — style Snug Simple, plus d'air, serif sur la salutation */
        .dash-header { padding: 8px 4px 4px; }
        .dash-header-top {
          display: flex;
          align-items: center;
          gap: 16px;
        }
        .dash-avatar {
          width: 60px;
          height: 60px;
          border-radius: 50%;
          background: linear-gradient(135deg, var(--tone-rose-accent), var(--tone-rose-ink));
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.5rem;
          font-weight: 700;
          flex-shrink: 0;
          box-shadow: 0 4px 14px rgba(196, 112, 112, 0.25);
          font-family: var(--font-instrument-serif), Georgia, serif;
        }
        .dash-greeting h1 {
          font-size: 1.875rem;
          font-weight: 400;
          color: #1a1612;
          line-height: 1.1;
          font-family: var(--font-instrument-serif), Georgia, serif;
          letter-spacing: -0.01em;
        }
        .dash-date {
          font-size: 0.875rem;
          color: var(--text-muted);
          margin-top: 4px;
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

        /* Stats — tuiles pleines tonées style Claude Design */
        .dash-stats {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 12px;
        }
        .stat-tile {
          display: flex;
          flex-direction: column;
          gap: 12px;
          padding: 18px 16px 20px;
          border-radius: 22px;
          text-decoration: none;
          color: inherit;
          transition: transform .15s, box-shadow .15s;
          position: relative;
          overflow: hidden;
          min-height: 130px;
        }
        .stat-tile:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(70, 35, 25, 0.08);
        }
        .stat-tile--rose {
          background: var(--tone-rose-bg);
          color: var(--tone-rose-ink);
        }
        .stat-tile--sage {
          background: var(--tone-sage-bg);
          color: var(--tone-sage-ink);
        }
        .stat-tile--sand {
          background: var(--tone-sand-bg);
          color: var(--tone-sand-ink);
        }
        .stat-tile--lavender {
          background: var(--tone-lavender-bg);
          color: var(--tone-lavender-ink);
        }
        .stat-tile-icon {
          width: 36px;
          height: 36px;
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.6);
          display: inline-flex;
          align-items: center;
          justify-content: center;
        }
        .stat-tile-value {
          font-size: 1.875rem;
          font-weight: 600;
          line-height: 1;
          font-family: var(--font-instrument-serif), Georgia, serif;
          letter-spacing: -0.01em;
          margin-top: auto;
        }
        .stat-tile-label {
          font-size: 0.75rem;
          font-weight: 500;
          opacity: 0.85;
          line-height: 1.3;
        }
        @media (max-width: 480px) {
          .stat-tile { min-height: 110px; padding: 14px 12px 16px; }
          .stat-tile-value { font-size: 1.5rem; }
          .stat-tile-label { font-size: 0.6875rem; }
        }

        /* Section header — gros titre serif Snug Simple */
        .dash-section { margin-top: 8px; }
        .section-header {
          display: flex;
          justify-content: space-between;
          align-items: baseline;
          margin-bottom: 14px;
          padding: 0 4px;
        }
        .section-header h2 {
          font-size: 1.375rem;
          font-weight: 400;
          color: #1a1612;
          font-family: var(--font-instrument-serif), Georgia, serif;
          letter-spacing: -0.01em;
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

        /* Cours list — fond plein toné + radius + padding généreux */
        .cours-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .cours-card {
          display: flex;
          overflow: hidden;
          border-radius: 20px;
          box-shadow: 0 2px 10px rgba(70, 35, 25, 0.05);
        }
        .cours-card--rose     { background: var(--tone-rose-bg); }
        .cours-card--sage     { background: var(--tone-sage-bg); }
        .cours-card--sand     { background: var(--tone-sand-bg); }
        .cours-card--lavender { background: var(--tone-lavender-bg); }
        .cours-card--ink      { background: var(--tone-ink-bg-soft); }
        .cours-color-bar {
          width: 8px;
          background: var(--brand);
          flex-shrink: 0;
        }
        .cours-card--rose     .cours-color-bar { background: var(--tone-rose-accent); }
        .cours-card--sage     .cours-color-bar { background: var(--tone-sage-accent); }
        .cours-card--sand     .cours-color-bar { background: var(--tone-sand-accent); }
        .cours-card--lavender .cours-color-bar { background: var(--tone-lavender-accent); }
        .cours-card--ink      .cours-color-bar { background: var(--tone-ink-bg); }
        .cours-body {
          flex: 1;
          padding: 18px 20px 16px;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .cours-card--rose     .cours-nom { color: var(--tone-rose-ink); }
        .cours-card--sage     .cours-nom { color: var(--tone-sage-ink); }
        .cours-card--sand     .cours-nom { color: var(--tone-sand-ink); }
        .cours-card--lavender .cours-nom { color: var(--tone-lavender-ink); }
        .cours-card--rose     .cours-meta { color: var(--tone-rose-ink); opacity: 0.8; }
        .cours-card--sage     .cours-meta { color: var(--tone-sage-ink); opacity: 0.8; }
        .cours-card--sand     .cours-meta { color: var(--tone-sand-ink); opacity: 0.8; }
        .cours-card--lavender .cours-meta { color: var(--tone-lavender-ink); opacity: 0.8; }
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
          padding: 11px 18px;
          background: rgba(255, 255, 255, 0.7);
          color: #1a1612;
          border: 1.5px solid rgba(0, 0, 0, 0.1);
          border-radius: var(--radius-full);
          text-decoration: none;
          font-size: 0.875rem;
          font-weight: 600;
          min-height: 44px;
          transition: all var(--transition-fast);
          align-self: flex-start;
        }
        .cours-pointer-btn:hover { background: white; border-color: #1a1612; }
        .cours-pointer-btn:active { transform: scale(0.97); }

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

        /* CTA Sondage planning — style Snug Simple lavender */
        .dash-sondage-cta {
          display: flex; align-items: center; gap: 14px;
          padding: 18px 20px; border-radius: 20px;
          background: var(--tone-lavender-bg);
          color: var(--tone-lavender-ink);
          text-decoration: none;
          transition: transform 0.15s, box-shadow 0.15s;
        }
        .dash-sondage-cta:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 18px rgba(90, 77, 117, 0.18);
        }
        .dash-sondage-icon {
          width: 44px; height: 44px; border-radius: 50%;
          background: rgba(255, 255, 255, 0.7);
          color: var(--tone-lavender-ink);
          flex-shrink: 0;
          display: flex; align-items: center; justify-content: center;
        }
        .dash-sondage-text { flex: 1; min-width: 0; }
        .dash-sondage-title { font-size: 0.9375rem; font-weight: 600; color: var(--tone-lavender-ink); }
        .dash-sondage-desc { font-size: 0.8125rem; color: var(--tone-lavender-ink); opacity: 0.75; margin-top: 4px; line-height: 1.4; }

        /* Widget Mes coûts */
        .dash-couts {
          display: flex; flex-direction: column; gap: 10px;
          padding: 14px 16px;
        }
        .dash-couts-header {
          display: flex; justify-content: space-between; align-items: center;
        }
        .dash-couts-title {
          display: inline-flex; align-items: center; gap: 8px;
          font-size: 0.875rem; font-weight: 700; color: var(--text-primary);
        }
        .dash-couts-cog {
          width: 30px; height: 30px; border-radius: 8px;
          display: inline-flex; align-items: center; justify-content: center;
          color: var(--text-muted); border: 1px solid var(--border);
          background: white; transition: all 0.15s;
        }
        .dash-couts-cog:hover { color: var(--brand); border-color: var(--brand); }
        .dash-couts-rows {
          display: flex; flex-direction: column; gap: 4px;
          padding: 8px 0; border-top: 1px solid var(--border);
        }
        .dash-couts-row {
          display: flex; justify-content: space-between; align-items: center;
          padding: 6px 0; font-size: 0.8125rem;
        }
        .dash-couts-row-left {
          display: inline-flex; align-items: center; gap: 8px;
          color: var(--text-secondary);
        }
        .dash-couts-badge {
          background: var(--brand-light); color: var(--brand-700);
          font-size: 0.6875rem; font-weight: 700;
          padding: 2px 8px; border-radius: 99px;
        }
        .dash-couts-amount {
          font-weight: 600; color: var(--text-primary);
          font-variant-numeric: tabular-nums;
        }
        .dash-couts-total {
          padding-top: 10px; margin-top: 4px;
          border-top: 1px dashed var(--border);
          font-weight: 700; font-size: 0.9375rem;
        }
        .dash-couts-total .dash-couts-amount { color: var(--brand); }
        .dash-couts-note {
          font-size: 0.7rem; color: var(--text-muted); line-height: 1.5;
          margin: 4px 0 0;
        }
        .dash-couts-note a { color: var(--brand); text-decoration: underline; }

        /* Widget portail élève — tonal sage */
        .dash-portal-widget {
          display: flex; align-items: center; gap: 14px;
          padding: 18px 20px;
          border-radius: 20px;
          background: var(--tone-sage-bg);
          color: var(--tone-sage-ink);
          box-shadow: 0 2px 10px rgba(70, 35, 25, 0.05);
        }
        .dash-portal-icon {
          width: 44px; height: 44px; border-radius: 50%;
          background: rgba(255, 255, 255, 0.7);
          color: var(--tone-sage-ink);
          display: flex; align-items: center; justify-content: center;
          flex-shrink: 0;
        }
        .dash-portal-text { flex: 1; min-width: 0; }
        .dash-portal-title {
          font-size: 0.9375rem; font-weight: 600;
          color: var(--tone-sage-ink);
        }
        .dash-portal-url {
          font-size: 0.8125rem; color: var(--tone-sage-ink); opacity: 0.75;
          font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
          white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
          margin-top: 4px;
        }
        .dash-portal-actions { display: flex; gap: 6px; flex-shrink: 0; }
        .dash-portal-btn {
          width: 36px; height: 36px; border-radius: 50%;
          border: none;
          background: rgba(255, 255, 255, 0.7);
          color: var(--tone-sage-ink); cursor: pointer;
          display: flex; align-items: center; justify-content: center;
          transition: all 0.15s; text-decoration: none;
        }
        .dash-portal-btn:hover { background: white; transform: scale(1.05); }

        /* Widget Coûts — tonal sand */
        .dash-couts {
          display: flex; flex-direction: column; gap: 10px;
          padding: 18px 20px;
          border-radius: 20px;
          background: var(--tone-sand-bg);
          color: var(--tone-sand-ink);
          border: none !important;
        }
        .dash-couts-title {
          font-size: 0.9375rem; font-weight: 600; color: var(--tone-sand-ink);
        }
        .dash-couts-cog {
          width: 32px; height: 32px; border-radius: 50%;
          background: rgba(255, 255, 255, 0.6);
          color: var(--tone-sand-ink);
          display: flex; align-items: center; justify-content: center;
        }
        .dash-couts-row { color: var(--tone-sand-ink); }
        .dash-couts-row-left { color: var(--tone-sand-ink); opacity: 0.85; }
        .dash-couts-amount { color: var(--tone-sand-ink); }
        .dash-couts-total .dash-couts-amount { color: var(--tone-sand-ink); font-weight: 700; }
        .dash-couts-note { color: var(--tone-sand-ink); opacity: 0.7; }
        .dash-couts-badge {
          background: rgba(255, 255, 255, 0.7);
          color: var(--tone-sand-ink);
        }
      `}</style>
    </div>
  );
}
