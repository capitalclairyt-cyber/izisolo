'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  AlertTriangle, Plus, CheckCircle2, Share2, Copy, ExternalLink, X, Sparkles,
  Receipt, MessageSquare, ClipboardList, ChevronRight,
  Settings as SettingsIcon,
} from 'lucide-react';
import { formatHeure, formatMontant } from '@/lib/utils';
import { getVocabulaire } from '@/lib/vocabulaire';
import { useToast } from '@/components/ui/ToastProvider';
import {
  ScreenHeader, RevenueHero, SectionHeader, SessionCard,
  HeaderIconButton,
} from '@/components/mobile';
import { Icon } from '@/components/ui-ds';

interface Cours {
  id: string;
  nom: string;
  heure?: string | null;
  duree_minutes?: number | null;
  type_cours?: string | null;
  presences?: Array<{ count: number }>;
}

interface Alerte { type: 'warning' | 'danger' | 'info'; message: string; }

interface Profile {
  id?: string;
  prenom?: string;
  nom?: string;
  studio_nom?: string;
  studio_slug?: string;
  metier?: string;
  vocabulaire?: any;
  alerte_seances_seuil?: number;
  alerte_expiration_jours?: number;
}

interface CoutsMois {
  sms: { count: number; montant: number };
  stripe: { montant: number };
  total: number;
}

interface DashboardClientProps {
  profile: Profile | null;
  coursDuJour: Cours[];
  nbClients: number;
  nbCoursTotal: number;
  revenusMois: number;
  alertes: Alerte[];
  coutsMois?: CoutsMois;
  hasSondage?: boolean;
}

// Map type_cours → tone (palette mobile)
function disciplineToTone(typeCours?: string | null): 'rose' | 'sage' | 'sand' | 'lavender' {
  const t = (typeCours || '').toLowerCase();
  if (t.includes('vinyasa') || t.includes('pilates')) return 'sage';
  if (t.includes('médita') || t.includes('medita') || t.includes('ashtanga')) return 'sand';
  if (t.includes('danse') || t.includes('créa') || t.includes('crea')) return 'lavender';
  return 'rose'; // hatha, yin, yoga doux, défaut
}

export default function DashboardClient({
  profile, coursDuJour, nbClients, nbCoursTotal, revenusMois, alertes, coutsMois, hasSondage = false,
}: DashboardClientProps) {
  const vocab = getVocabulaire(profile?.metier || 'yoga', profile?.vocabulaire);
  const prenom = profile?.prenom || 'là';
  const studioSlug = profile?.studio_slug;
  const router = useRouter();
  const { toast } = useToast();

  // Checklist d'onboarding
  const [checklistDismissed, setChecklistDismissed] = useState(false);
  useEffect(() => {
    if (typeof window !== 'undefined') {
      setChecklistDismissed(localStorage.getItem('izi_checklist_dismissed') === '1');
    }
  }, []);

  const checklistItems = [
    { key: 'cours',  label: 'Crée ton premier cours',   done: nbCoursTotal > 0, href: '/cours/nouveau' },
    { key: 'eleve',  label: `Ajoute ton premier ${(vocab.client || 'élève').toLowerCase()}`, done: nbClients > 0, href: '/clients/nouveau' },
    { key: 'portail', label: 'Partage ton portail élève', done: false, action: 'share' as const },
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
    } catch { toast.error('Impossible de copier'); }
  };
  const dismissChecklist = () => {
    if (typeof window !== 'undefined') localStorage.setItem('izi_checklist_dismissed', '1');
    setChecklistDismissed(true);
  };

  // Date du jour formatée
  const today = new Date();
  const dateEyebrow = today.toLocaleDateString('fr-FR', {
    weekday: 'short', day: 'numeric', month: 'short',
  }).toUpperCase().replace(/\.$/, '');
  const inscritsAujourdhui = coursDuJour.reduce((sum, c) => sum + (c.presences?.[0]?.count || 0), 0);
  const tauxRemplissage = nbClients > 0 ? Math.round((inscritsAujourdhui / nbClients) * 100) : 0;

  return (
    <div className="dashboard">
      {/* Header — Bonjour + actions */}
      <ScreenHeader
        title={`Bonjour ${prenom}`}
        date={dateEyebrow}
        actions={
          <>
            <HeaderIconButton aria-label="Recherche" onClick={() => router.push('/clients')}>
              <Icon name="search" size={16} />
            </HeaderIconButton>
            <HeaderIconButton aria-label="Notifications" onClick={() => router.push('/messagerie')}>
              <Icon name="bell" size={16} />
            </HeaderIconButton>
          </>
        }
      />

      {/* Hero KPI revenus + 3 stats */}
      <RevenueHero
        eyebrow="CE MOIS-CI"
        value={formatMontant(revenusMois)}
        sub={revenusMois > 0 ? 'Ton chiffre d\'affaires mensuel' : 'Pas encore de paiement ce mois'}
        stats={[
          { label: 'Cours du jour', value: coursDuJour.length },
          { label: 'Inscrits',      value: inscritsAujourdhui || nbClients },
          { label: 'Remplissage',   value: tauxRemplissage > 0 ? `${tauxRemplissage}%` : '—' },
        ]}
      />

      {/* Checklist onboarding */}
      {showChecklist && (
        <div className="dash-checklist animate-slide-up">
          <button className="dash-checklist-close" onClick={dismissChecklist} aria-label="Masquer">
            <X size={14} />
          </button>
          <div className="dash-checklist-header">
            <Sparkles size={16} style={{ color: 'var(--c-accent)' }} />
            <span>Démarre en 3 étapes</span>
          </div>
          <div className="dash-checklist-items">
            {checklistItems.map(item => {
              const Inner = (
                <>
                  <span className={`dash-checklist-bullet${item.done ? ' done' : ''}`}>
                    {item.done && <CheckCircle2 size={14} />}
                  </span>
                  <span className={`dash-checklist-label${item.done ? ' done' : ''}`}>{item.label}</span>
                  {!item.done && 'action' in item && item.action === 'share' && portalUrl ? (
                    <button onClick={copyPortalUrl} className="dash-checklist-cta">
                      <Copy size={12} /> Copier le lien
                    </button>
                  ) : !item.done ? <ChevronRight size={14} style={{ color: 'var(--c-accent)' }} /> : null}
                </>
              );
              return item.done || ('action' in item && item.action === 'share') ? (
                <div key={item.key} className="dash-checklist-item">{Inner}</div>
              ) : (
                <Link key={item.key} href={item.href!} className="dash-checklist-item">{Inner}</Link>
              );
            })}
          </div>
        </div>
      )}

      {/* CTA Sondage */}
      {!hasSondage && (
        <Link href="/sondages/nouveau" className="dash-sondage-cta animate-slide-up">
          <div className="dash-sondage-icon"><ClipboardList size={20} /></div>
          <div className="dash-sondage-text">
            <div className="dash-sondage-title">Sondage planning — découvre tes meilleurs créneaux</div>
            <div className="dash-sondage-desc">30 secondes pour tes élèves, gros gain pour toi</div>
          </div>
          <ChevronRight size={16} style={{ color: 'var(--c-accent)', flexShrink: 0 }} />
        </Link>
      )}

      {/* Alertes */}
      {alertes.length > 0 && (
        <div className="dash-alertes animate-slide-up">
          <SectionHeader title="Alertes" />
          {alertes.slice(0, 3).map((a, i) => (
            <div key={i} className={`alerte-item alerte-${a.type}`}>
              <AlertTriangle size={16} />
              <span>{a.message}</span>
            </div>
          ))}
          {alertes.length > 3 && (
            <Link href="/clients" className="alerte-more">+{alertes.length - 3} autres</Link>
          )}
        </div>
      )}

      {/* Coûts du mois */}
      {coutsMois && (coutsMois.sms.count > 0 || coutsMois.stripe.montant > 0) && (
        <div className="dash-couts">
          <SectionHeader title="Mes coûts ce mois" right={
            <Link href="/parametres" className="section-link" aria-label="Régler"><SettingsIcon size={14} /></Link>
          } />
          <div className="dash-couts-card">
            <div className="dash-couts-row">
              <span className="dash-couts-row-left"><MessageSquare size={14} /> SMS envoyés <span className="dash-couts-badge">{coutsMois.sms.count}</span></span>
              <span className="dash-couts-amount">{formatMontant(coutsMois.sms.montant)}</span>
            </div>
            <div className="dash-couts-row">
              <span className="dash-couts-row-left"><Receipt size={14} /> Frais IziSolo (1 %)</span>
              <span className="dash-couts-amount">{formatMontant(coutsMois.stripe.montant)}</span>
            </div>
            <div className="dash-couts-row dash-couts-total">
              <span>Total à régler</span>
              <span className="dash-couts-amount">{formatMontant(coutsMois.total)}</span>
            </div>
          </div>
        </div>
      )}

      {/* Séances du jour */}
      <div className="dash-section">
        <SectionHeader
          title="Aujourd'hui"
          right={<Link href="/agenda" className="section-link">Agenda <ChevronRight size={14} /></Link>}
        />

        {coursDuJour.length === 0 ? (
          <div className="empty-state">
            <div className="empty-emoji">🌿</div>
            <p className="empty-title">Pas de cours prévu</p>
            <Link href="/cours/nouveau" className="izi-btn izi-btn-secondary">
              <Plus size={16} /> Créer un cours
            </Link>
          </div>
        ) : (
          <div>
            {coursDuJour.map(c => (
              <Link key={c.id} href={`/pointage/${c.id}`} className="dash-cours-link">
                <SessionCard
                  time={c.heure ? formatHeure(c.heure) : '—'}
                  title={c.nom}
                  location={[
                    c.duree_minutes && `${c.duree_minutes}min`,
                    c.presences?.[0]?.count != null && `${c.presences[0].count} inscrits`,
                  ].filter(Boolean).join(' · ')}
                  tone={disciplineToTone(c.type_cours)}
                />
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Widget portail élève */}
      {studioSlug && portalUrl && (
        <div className="dash-section">
          <SectionHeader title="Ton portail élève" />
          <div className="dash-portal-widget">
            <div className="dash-portal-icon"><Share2 size={18} /></div>
            <div className="dash-portal-text">
              <div className="dash-portal-url">{portalUrl.replace(/^https?:\/\//, '')}</div>
            </div>
            <button onClick={copyPortalUrl} className="dash-portal-btn" aria-label="Copier"><Copy size={14} /></button>
            <a href={portalUrl} target="_blank" rel="noopener noreferrer" className="dash-portal-btn" aria-label="Voir"><ExternalLink size={14} /></a>
          </div>
        </div>
      )}

      <style jsx>{`
        .dashboard { display: flex; flex-direction: column; gap: 18px; padding-bottom: 40px; }

        .section-link {
          display: inline-flex; align-items: center; gap: 4px;
          font-size: 0.8125rem; color: var(--c-accent);
          text-decoration: none; font-weight: 600;
        }

        /* Checklist */
        .dash-checklist {
          position: relative;
          background: var(--c-accent-tint);
          border: 1px solid var(--c-accent-soft);
          border-radius: var(--r-md);
          padding: 16px 18px 14px;
        }
        .dash-checklist-close {
          position: absolute; top: 10px; right: 10px;
          background: none; border: none; cursor: pointer;
          color: var(--c-ink-muted); padding: 4px;
          border-radius: 50%;
        }
        .dash-checklist-close:hover { background: rgba(0,0,0,0.05); color: var(--c-ink-soft); }
        .dash-checklist-header {
          display: flex; align-items: center; gap: 8px;
          font-family: var(--font-display);
          font-size: 0.9375rem; font-weight: 500;
          color: var(--c-ink); margin-bottom: 12px;
        }
        .dash-checklist-items { display: flex; flex-direction: column; gap: 6px; }
        .dash-checklist-item {
          display: flex; align-items: center; gap: 12px;
          padding: 10px 12px; background: var(--c-surface);
          border: 1px solid var(--c-line); border-radius: 10px;
          text-decoration: none; color: var(--c-ink);
          transition: border-color 0.15s, transform 0.1s;
        }
        :global(a.dash-checklist-item:hover) { border-color: var(--c-accent); transform: translateX(2px); }
        .dash-checklist-bullet {
          width: 20px; height: 20px; border-radius: 50%;
          border: 2px solid var(--c-line); flex-shrink: 0;
          display: flex; align-items: center; justify-content: center;
          color: white;
        }
        .dash-checklist-bullet.done { border-color: oklch(0.65 0.12 145); background: oklch(0.65 0.12 145); }
        .dash-checklist-label { flex: 1; font-size: 0.875rem; font-weight: 500; }
        .dash-checklist-label.done { text-decoration: line-through; color: var(--c-ink-muted); }
        .dash-checklist-cta {
          display: inline-flex; align-items: center; gap: 4px;
          padding: 5px 12px; border-radius: 99px;
          background: var(--c-accent); color: var(--c-accent-ink);
          border: none; font-size: 0.75rem; font-weight: 600; cursor: pointer;
        }

        /* CTA Sondage */
        .dash-sondage-cta {
          display: flex; align-items: center; gap: 12px;
          padding: 14px 16px; border-radius: var(--r-md);
          background: linear-gradient(135deg, var(--c-accent-soft), var(--c-surface));
          border: 1px solid var(--c-accent-soft);
          text-decoration: none; color: inherit;
          transition: transform 0.15s;
        }
        .dash-sondage-cta:hover { transform: translateY(-1px); box-shadow: var(--shadow-sm); }
        .dash-sondage-icon {
          width: 40px; height: 40px; border-radius: 10px;
          background: var(--c-accent); color: var(--c-accent-ink); flex-shrink: 0;
          display: flex; align-items: center; justify-content: center;
        }
        .dash-sondage-text { flex: 1; min-width: 0; }
        .dash-sondage-title { font-size: 0.875rem; font-weight: 700; color: var(--c-ink); }
        .dash-sondage-desc { font-size: 0.75rem; color: var(--c-ink-muted); margin-top: 2px; line-height: 1.4; }

        /* Alertes */
        .dash-alertes { display: flex; flex-direction: column; gap: 8px; }
        .alerte-item {
          display: flex; align-items: center; gap: 10px;
          padding: 10px 14px; border-radius: var(--r-sm);
          font-size: 0.8125rem; font-weight: 500;
        }
        .alerte-warning { background: oklch(0.97 0.05 75); color: oklch(0.45 0.13 75); border: 1px solid oklch(0.85 0.10 75); }
        .alerte-danger { background: oklch(0.96 0.05 25); color: oklch(0.42 0.15 25); border: 1px solid oklch(0.85 0.10 25); }
        .alerte-info { background: oklch(0.95 0.04 230); color: oklch(0.40 0.13 230); border: 1px solid oklch(0.85 0.08 230); }
        .alerte-more { font-size: 0.75rem; color: var(--c-accent); text-align: center; text-decoration: none; font-weight: 600; }

        /* Coûts */
        .dash-couts { display: flex; flex-direction: column; gap: 6px; }
        .dash-couts-card {
          background: var(--c-surface); border: 1px solid var(--c-line);
          border-radius: var(--r-md); padding: 10px 14px;
          display: flex; flex-direction: column; gap: 4px;
        }
        .dash-couts-row {
          display: flex; justify-content: space-between; align-items: center;
          padding: 6px 0; font-size: 0.8125rem;
        }
        .dash-couts-row-left {
          display: inline-flex; align-items: center; gap: 8px;
          color: var(--c-ink-soft);
        }
        .dash-couts-badge {
          background: var(--c-accent-soft); color: var(--c-accent-deep);
          font-size: 0.6875rem; font-weight: 700;
          padding: 2px 8px; border-radius: 99px;
        }
        .dash-couts-amount { font-weight: 600; color: var(--c-ink); font-variant-numeric: tabular-nums; }
        .dash-couts-total {
          padding-top: 10px; margin-top: 4px;
          border-top: 1px dashed var(--c-line);
          font-weight: 700; font-size: 0.9375rem;
        }
        .dash-couts-total .dash-couts-amount { color: var(--c-accent); }

        /* Séances */
        .dash-section { display: flex; flex-direction: column; gap: 8px; }
        .dash-cours-link { text-decoration: none; color: inherit; display: block; }

        /* Portail */
        .dash-portal-widget {
          display: flex; align-items: center; gap: 12px;
          padding: 14px 16px;
          background: var(--c-surface);
          border: 1px solid var(--c-line);
          border-radius: var(--r-md);
        }
        .dash-portal-icon {
          width: 36px; height: 36px; border-radius: 10px;
          background: var(--c-accent-soft); color: var(--c-accent);
          display: flex; align-items: center; justify-content: center;
          flex-shrink: 0;
        }
        .dash-portal-text { flex: 1; min-width: 0; }
        .dash-portal-url {
          font-size: 0.8125rem; color: var(--c-ink-soft);
          font-family: var(--font-mono);
          white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
        }
        .dash-portal-btn {
          width: 34px; height: 34px; border-radius: 8px;
          border: 1px solid var(--c-line); background: var(--c-surface);
          color: var(--c-ink-soft); cursor: pointer;
          display: flex; align-items: center; justify-content: center;
          text-decoration: none;
        }
        .dash-portal-btn:hover { color: var(--c-accent); border-color: var(--c-accent); }

        /* Empty state */
        .empty-state {
          display: flex; flex-direction: column; align-items: center; gap: 8px;
          padding: 32px 20px;
          background: var(--c-surface); border: 1px solid var(--c-line);
          border-radius: var(--r-md);
          text-align: center;
        }
        .empty-emoji { font-size: 2rem; }
        .empty-title { font-weight: 600; font-size: 0.9375rem; color: var(--c-ink); margin-bottom: 4px; }
      `}</style>
    </div>
  );
}
