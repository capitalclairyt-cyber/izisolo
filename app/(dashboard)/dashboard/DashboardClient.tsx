'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AlertTriangle, Plus, CheckCircle2, Copy, X, ChevronRight } from 'lucide-react';
import { formatHeure, formatMontant } from '@/lib/utils';
import { getVocabulaire } from '@/lib/vocabulaire';
import { useToast } from '@/components/ui/ToastProvider';
import {
  Screen, ScreenHeader, ScreenBody, HeaderIconBtn,
  Section, Hero, SessionCard, type Tone,
} from '@/components/np';

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

// Map type_cours → tone
function disciplineToTone(typeCours?: string | null): Tone {
  const t = (typeCours || '').toLowerCase();
  if (t.includes('vinyasa') || t.includes('pilates') || t.includes('yoga chaise')) return 'sage';
  if (t.includes('médita') || t.includes('medita') || t.includes('ashtanga')) return 'sand';
  if (t.includes('danse') || t.includes('créa') || t.includes('crea')) return 'lavender';
  return 'rose';
}

export default function DashboardClient({
  profile, coursDuJour, nbClients, nbCoursTotal, revenusMois, alertes, coutsMois, hasSondage = false,
}: DashboardClientProps) {
  const vocab = getVocabulaire(profile?.metier || 'yoga', profile?.vocabulaire);
  const prenom = profile?.prenom || 'là';
  const studioSlug = profile?.studio_slug;
  const router = useRouter();
  const { toast } = useToast();

  const [checklistDismissed, setChecklistDismissed] = useState(false);
  useEffect(() => {
    if (typeof window !== 'undefined') {
      setChecklistDismissed(localStorage.getItem('izi_checklist_dismissed') === '1');
    }
  }, []);

  const checklistItems = [
    { key: 'cours',  label: 'Crée ton premier cours', done: nbCoursTotal > 0, href: '/cours/nouveau' },
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
      toast.success('Lien copié !');
    } catch { toast.error('Impossible de copier'); }
  };
  const dismissChecklist = () => {
    if (typeof window !== 'undefined') localStorage.setItem('izi_checklist_dismissed', '1');
    setChecklistDismissed(true);
  };

  // Date eyebrow
  const today = new Date();
  const dateEyebrow = today.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' })
    .toUpperCase().replace(/\.$/, '').replace(' ', ' · ');
  const inscritsAujourdhui = coursDuJour.reduce((sum, c) => sum + (c.presences?.[0]?.count || 0), 0);

  // Stats du Hero — semaine plutôt que mois si pas de revenus mensuels
  const heroStats = [
    { label: 'COURS',    value: coursDuJour.length },
    { label: 'INSCRITS', value: inscritsAujourdhui || nbClients },
    { label: 'TOTAL',    value: nbCoursTotal },
  ];

  return (
    <Screen>
      <ScreenHeader
        date={dateEyebrow}
        title={`Bonjour ${prenom}`}
        actions={
          <>
            <HeaderIconBtn icon="search" ariaLabel="Recherche" onClick={() => router.push('/clients')} />
            <HeaderIconBtn icon="bell"   ariaLabel="Notifications" onClick={() => router.push('/messagerie')} />
          </>
        }
      />

      <ScreenBody>
        <Hero
          tag="CE MOIS-CI"
          value={formatMontant(revenusMois)}
          sub={revenusMois > 0 ? "Ton chiffre d'affaires mensuel" : "Pas encore de paiement ce mois"}
          stats={heroStats}
        />

        {/* Checklist onboarding */}
        {showChecklist && (
          <div className="dash-checklist">
            <button className="dash-checklist-close" onClick={dismissChecklist} aria-label="Masquer">
              <X size={14} />
            </button>
            <div className="dash-checklist-header">Démarre en 3 étapes</div>
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
                        <Copy size={12} /> Copier
                      </button>
                    ) : !item.done ? <ChevronRight size={14} /> : null}
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
          <Link href="/sondages/nouveau" className="dash-cta">
            <span className="dash-cta__title">Sondage planning</span>
            <span className="dash-cta__sub">Découvre tes meilleurs créneaux</span>
            <ChevronRight size={16} />
          </Link>
        )}

        {/* Alertes */}
        {alertes.length > 0 && (
          <Section title="Alertes">
            {alertes.slice(0, 3).map((a, i) => (
              <div key={i} className={`dash-alerte dash-alerte--${a.type}`}>
                <AlertTriangle size={14} />
                <span>{a.message}</span>
              </div>
            ))}
          </Section>
        )}

        {/* Aujourd'hui */}
        <Section title="Aujourd'hui" link={coursDuJour.length > 0 ? { href: '/agenda' } : undefined}>
          {coursDuJour.length === 0 ? (
            <div className="dash-empty">
              <p>Pas de cours prévu</p>
              <Link href="/cours/nouveau" className="dash-empty__cta">
                <Plus size={14} /> Créer un cours
              </Link>
            </div>
          ) : (
            coursDuJour.map((c, i) => (
              <SessionCard
                key={c.id}
                time={c.heure ? formatHeure(c.heure) : '—'}
                title={c.nom}
                location={[
                  c.duree_minutes && `${c.duree_minutes}min`,
                  c.presences?.[0]?.count != null && `${c.presences[0].count} inscrit${c.presences[0].count > 1 ? 's' : ''}`,
                ].filter(Boolean).join(' · ')}
                tone={disciplineToTone(c.type_cours)}
                badge={i === 0 ? 'prochain' : undefined}
                onClick={() => router.push(`/pointage/${c.id}`)}
              />
            ))
          )}
        </Section>

        {/* Coûts du mois */}
        {coutsMois && (coutsMois.sms.count > 0 || coutsMois.stripe.montant > 0) && (
          <Section title="Mes coûts ce mois" link={{ href: '/parametres', label: 'Régler →' }}>
            <div className="dash-couts">
              <div className="dash-couts__row">
                <span>SMS envoyés <em>{coutsMois.sms.count}</em></span>
                <strong>{formatMontant(coutsMois.sms.montant)}</strong>
              </div>
              <div className="dash-couts__row">
                <span>Frais IziSolo (1 %)</span>
                <strong>{formatMontant(coutsMois.stripe.montant)}</strong>
              </div>
              <div className="dash-couts__row dash-couts__total">
                <span>Total</span>
                <strong>{formatMontant(coutsMois.total)}</strong>
              </div>
            </div>
          </Section>
        )}
      </ScreenBody>

      <style jsx>{`
        .dash-checklist {
          position: relative;
          background: var(--m-tone-rose);
          border-radius: 16px;
          padding: 14px 16px 12px;
          margin-bottom: 18px;
        }
        .dash-checklist-close {
          position: absolute; top: 8px; right: 8px;
          background: none; border: none; cursor: pointer;
          color: var(--m-ink-mute); padding: 4px;
          border-radius: 50%;
        }
        .dash-checklist-header {
          font-family: var(--font-display);
          font-weight: 500; font-size: 14px;
          color: var(--m-ink); margin-bottom: 10px;
        }
        .dash-checklist-items { display: flex; flex-direction: column; gap: 5px; }
        .dash-checklist-item {
          display: flex; align-items: center; gap: 10px;
          padding: 8px 10px; background: var(--m-surface);
          border-radius: 10px;
          text-decoration: none; color: var(--m-ink);
          font-size: 12.5px;
        }
        .dash-checklist-bullet {
          width: 18px; height: 18px; border-radius: 50%;
          border: 2px solid var(--m-line); flex-shrink: 0;
          display: flex; align-items: center; justify-content: center;
          color: white;
        }
        .dash-checklist-bullet.done { border-color: var(--m-success); background: var(--m-success); }
        .dash-checklist-label { flex: 1; font-weight: 500; }
        .dash-checklist-label.done { text-decoration: line-through; color: var(--m-ink-mute); }
        .dash-checklist-cta {
          display: inline-flex; align-items: center; gap: 4px;
          padding: 4px 10px; border-radius: 999px;
          background: var(--m-accent); color: white;
          border: none; font-size: 11px; font-weight: 600; cursor: pointer;
        }

        .dash-cta {
          display: flex; align-items: center; gap: 10px;
          padding: 14px 16px;
          background: var(--m-tone-lavender); color: var(--m-tone-lavender-ink);
          border-radius: 16px;
          text-decoration: none;
          margin-bottom: 18px;
        }
        .dash-cta__title { font-family: var(--font-display); font-weight: 500; font-size: 14px; flex: 1; }
        .dash-cta__sub { font-size: 11px; opacity: 0.75; }

        .dash-alerte {
          display: flex; align-items: center; gap: 8px;
          padding: 9px 12px; border-radius: 10px;
          font-size: 12px; margin-bottom: 6px;
        }
        .dash-alerte--warning { background: oklch(0.97 0.05 75); color: oklch(0.42 0.13 75); }
        .dash-alerte--danger  { background: oklch(0.96 0.05 25); color: oklch(0.42 0.15 25); }
        .dash-alerte--info    { background: oklch(0.95 0.04 230); color: oklch(0.40 0.13 230); }

        .dash-empty {
          background: var(--m-surface-2);
          border-radius: 14px;
          padding: 20px 16px;
          text-align: center;
          font-size: 12.5px; color: var(--m-ink-mute);
        }
        .dash-empty p { margin: 0 0 10px; }
        .dash-empty__cta {
          display: inline-flex; align-items: center; gap: 4px;
          padding: 6px 14px; border-radius: 999px;
          background: var(--m-surface); border: 1px solid var(--m-line);
          font-size: 12px; color: var(--m-ink); text-decoration: none;
          font-family: var(--font-display); font-weight: 500;
        }

        .dash-couts {
          background: var(--m-surface);
          border: 1px solid var(--m-line);
          border-radius: 14px;
          padding: 10px 14px;
        }
        .dash-couts__row {
          display: flex; justify-content: space-between; align-items: center;
          padding: 6px 0;
          font-size: 12.5px;
        }
        .dash-couts__row span em {
          font-style: normal;
          font-family: var(--font-mono);
          font-size: 11px;
          color: var(--m-accent-deep);
          background: var(--m-accent-soft);
          padding: 2px 6px;
          border-radius: 999px;
          margin-left: 6px;
        }
        .dash-couts__row strong {
          font-family: var(--font-mono);
          font-variant-numeric: tabular-nums;
        }
        .dash-couts__total {
          padding-top: 10px; margin-top: 4px;
          border-top: 1px dashed var(--m-line);
          font-family: var(--font-display); font-weight: 500;
        }
        .dash-couts__total strong { color: var(--m-accent-deep); }
      `}</style>
    </Screen>
  );
}
