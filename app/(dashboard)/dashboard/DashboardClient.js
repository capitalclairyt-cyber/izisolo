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

export default function DashboardClient({ profile, coursDuJour, nbClients, nbCoursTotal, revenusMois, alertes, coutsMois, hasSondage = false, nbCasATraiter = 0 }) {
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

  // Path relatif uniquement pour l'affichage (= cohérent SSR + client,
  // évite hydration mismatch). L'origin est ajouté à la volée dans le
  // copy handler qui ne tourne que côté client.
  const portalPath = studioSlug ? `/p/${studioSlug}` : null;

  const copyPortalUrl = async () => {
    if (!portalPath) return;
    const fullUrl = typeof window !== 'undefined'
      ? `${window.location.origin}${portalPath}`
      : portalPath;
    try {
      await navigator.clipboard.writeText(fullUrl);
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
                  {!item.done && item.action === 'share' && portalPath ? (
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

      {/* Bandeau alertes — chaque alerte est un Link vers la fiche élève
          si client_id est présent (ouvert directement la fiche, pas la
          liste — fix demandé 2026-05-06). */}
      {alertes.length > 0 && (
        <div className="dash-alertes animate-slide-up">
          {alertes.slice(0, 3).map((a, i) => {
            const inner = (
              <>
                <AlertTriangle size={16} />
                <span>{a.message}</span>
              </>
            );
            return a.client_id ? (
              <Link
                key={i}
                href={`/clients/${a.client_id}`}
                className={`alerte-item alerte-${a.type} alerte-link`}
              >
                {inner}
              </Link>
            ) : (
              <div key={i} className={`alerte-item alerte-${a.type}`}>
                {inner}
              </div>
            );
          })}
          {alertes.length > 3 && (
            <Link href="/clients" className="alerte-more">
              +{alertes.length - 3} autres alertes
            </Link>
          )}
        </div>
      )}

      {/* === BENTO GRID — Phase 3 charte 2026 ===
          Remplace les anciennes 3 stat-tiles par une grille bento qui
          consolide : revenus (main), agenda, élèves, sondage, portail,
          + bandeau alerte large (si alertes.length > 0).
          Couleurs = catégorie métier (cf. uxui-bible §02 Bento Grid). */}
      <div className="dash-bento animate-slide-up">
        {/* Grosse tuile : Revenus du mois (KPI principal — la boussole prof) */}
        <Link href="/revenus" className="bento-cell bento-cell--main">
          <div>
            <div className="bento-icon"><BarChart3 size={20} /></div>
            <div className="bento-label" style={{ marginTop: 14 }}>Revenus ce mois</div>
          </div>
          <div>
            <div className="bento-value">{formatMontant(revenusMois)}</div>
          </div>
        </Link>

        {/* Agenda — séances aujourd'hui → ouvre directement la VUE JOUR */}
        <Link href="/agenda?vue=jour" className="bento-cell bento-cell--agenda">
          <div className="bento-icon"><CalendarDays size={20} /></div>
          <div>
            <div className="bento-value">{coursDuJour.length}</div>
            <div className="bento-label">Séances aujourd'hui</div>
          </div>
        </Link>

        {/* Élèves — compteur fiable. On affiche TOUJOURS le total des
            élèves actifs (nbClients) pour ne pas confondre avec le compte
            potentiellement bug du select count(*) sur presences (cf.
            audit 2026-05-06 : "4 inscrits aujourd'hui" était en fait le
            count total des présences, pas du jour). */}
        <Link href="/clients" className="bento-cell bento-cell--eleves">
          <div className="bento-icon"><Users size={20} /></div>
          <div>
            <div className="bento-value">{nbClients}</div>
            <div className="bento-label">{vocab.Clients || 'Élèves'}</div>
          </div>
        </Link>

        {/* Sondage : si pas encore créé → CTA, sinon → résumé */}
        <Link href="/sondages" className="bento-cell bento-cell--info">
          <div className="bento-icon"><ClipboardList size={20} /></div>
          <div>
            <div className="bento-value bento-value--small">{hasSondage ? 'Sondage' : 'Lancer'}</div>
            <div className="bento-label">{hasSondage ? 'Voir résultats' : 'Découvre tes créneaux'}</div>
          </div>
        </Link>

        {/* Portail public — clic = ouvre le portail dans un nouvel onglet
            (action principale, ce qu'on attend intuitivement). Bouton
            "Copier le lien" en secondaire (icône en haut à droite). */}
        {studioSlug && portalPath && (
          <a
            href={portalPath}
            target="_blank"
            rel="noopener noreferrer"
            className="bento-cell bento-cell--portal"
          >
            <div className="bento-icon"><Share2 size={20} /></div>
            <div>
              <div className="bento-value bento-value--small">Portail</div>
              <div className="bento-label bento-portal-url">{portalPath}</div>
            </div>
            <button
              type="button"
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); copyPortalUrl(); }}
              className="bento-portal-copy"
              title="Copier le lien"
              aria-label="Copier le lien du portail"
            >
              <Copy size={14} />
            </button>
          </a>
        )}

        {/* Bandeau alerte (full width bottom) — si au moins une alerte */}
        {alertes.length > 0 && (
          <Link href="/clients" className="bento-cell bento-cell--alerte">
            <div className="bento-icon"><AlertTriangle size={20} /></div>
            <div className="bento-alerte-msg">
              <div className="bento-alerte-title">{alertes[0].message}</div>
              {alertes.length > 1 && (
                <div className="bento-alerte-desc">+{alertes.length - 1} autre{alertes.length > 2 ? 's' : ''} alerte{alertes.length > 2 ? 's' : ''}</div>
              )}
            </div>
            <ChevronRight size={16} />
          </Link>
        )}

        {/* Bandeau "Cas à traiter" — si au moins un cas non résolu */}
        {nbCasATraiter > 0 && (
          <Link href="/cas-a-traiter" className="bento-cell bento-cell--alerte">
            <div className="bento-icon"><AlertTriangle size={20} /></div>
            <div className="bento-alerte-msg">
              <div className="bento-alerte-title">
                {nbCasATraiter} cas à traiter
              </div>
              <div className="bento-alerte-desc">
                Élève sans carnet, annulation tardive, etc. — clique pour voir et résoudre.
              </div>
            </div>
            <ChevronRight size={16} />
          </Link>
        )}
      </div>

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

      {/* Le widget portail séparé a été retiré (Phase 3 charte 2026) :
          il est désormais intégré dans la grille bento en haut, qui
          affiche déjà l'URL + clic pour copier. Évite le doublon. */}

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
          font-family: var(--font-fraunces), Georgia, serif;
          font-variation-settings: 'opsz' 144, 'SOFT' 100;
        }
        .dash-greeting h1 {
          font-size: 2rem;
          font-weight: 500;
          color: #1a1612;
          line-height: 1.05;
          font-family: var(--font-fraunces), Georgia, serif;
          font-variation-settings: 'opsz' 144, 'SOFT' 100;
          letter-spacing: -0.02em;
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
        .alerte-link {
          text-decoration: none;
          cursor: pointer;
          transition: transform 0.12s ease, box-shadow 0.12s ease;
        }
        .alerte-link:hover {
          transform: translateY(-1px);
          box-shadow: 0 2px 8px rgba(0,0,0,0.05);
        }
        .alerte-more {
          font-size: 0.75rem;
          color: var(--brand);
          text-align: center;
          text-decoration: none;
          font-weight: 600;
        }

        /* === BENTO GRID — Phase 3 charte 2026 ===
           Layout : 1 grosse cellule "main" (revenus) + 4 petites + 1 large bottom alerte.
           Couleurs = catégorie métier (cuivre = activité, sage = humain, info = comm).
           Mobile : tout passe en colonne unique sauf paire agenda+élèves. */
        .dash-bento {
          display: grid;
          grid-template-columns: 2fr 1fr 1fr;
          grid-template-rows: 130px 130px auto;
          gap: 12px;
        }
        .bento-cell {
          display: flex; flex-direction: column; justify-content: space-between;
          padding: 18px 16px 18px;
          background: var(--bg-card);
          border: 1px solid var(--border);
          border-radius: 18px;
          text-decoration: none; color: inherit;
          cursor: pointer;
          transition: transform 0.15s, box-shadow 0.15s, border-color 0.15s;
          font-family: inherit;
          text-align: left;
        }
        .bento-cell:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(70, 35, 25, 0.08);
        }

        /* Tuile MAIN : grosse + sombre, signal "KPI principal" */
        .bento-cell--main {
          grid-column: 1; grid-row: 1 / 3;
          background: linear-gradient(135deg, var(--sage-deep) 0%, var(--sage-dark) 100%);
          color: white;
          border-color: transparent;
        }
        .bento-cell--main .bento-icon { background: rgba(255, 255, 255, 0.16); color: white; }
        .bento-cell--main .bento-label { color: rgba(255, 255, 255, 0.7); }
        .bento-cell--main .bento-value { color: white; font-size: 2.25rem; }

        /* Agenda : cuivre */
        .bento-cell--agenda { background: var(--brand-light); border-color: transparent; }
        .bento-cell--agenda .bento-icon { background: var(--brand); color: white; }
        .bento-cell--agenda .bento-value { color: var(--brand-700); }
        .bento-cell--agenda .bento-label { color: var(--brand-700); opacity: 0.8; }

        /* Élèves : sauge */
        .bento-cell--eleves { background: var(--sage-light); border-color: transparent; }
        .bento-cell--eleves .bento-icon { background: var(--sage-dark); color: white; }
        .bento-cell--eleves .bento-value { color: var(--sage-deep); }
        .bento-cell--eleves .bento-label { color: var(--sage-dark); }

        /* Sondage : bleu fumé info */
        .bento-cell--info { background: var(--info-light); border-color: transparent; }
        .bento-cell--info .bento-icon { background: var(--info); color: white; }
        .bento-cell--info .bento-value { color: var(--info); }
        .bento-cell--info .bento-label { color: var(--info); opacity: 0.85; }

        /* Portail : cuivre clair (button, pas link) */
        .bento-cell--portal { background: var(--brand-50); border-color: transparent; }
        .bento-cell--portal .bento-icon { background: var(--brand); color: white; }
        .bento-cell--portal .bento-value { color: var(--brand-700); }
        .bento-cell--portal .bento-label { color: var(--brand-700); opacity: 0.85; }
        .bento-portal-url {
          font-family: var(--font-geist-mono), ui-monospace, monospace;
          font-size: 0.6875rem;
          overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
          max-width: 100%;
        }
        .bento-cell--portal { position: relative; }
        .bento-portal-copy {
          position: absolute; top: 8px; right: 8px;
          background: oklch(1 0 0 / 0.7);
          border: 1px solid oklch(from var(--brand) l c h / 0.25);
          color: var(--brand-700);
          width: 26px; height: 26px;
          border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          cursor: pointer;
          transition: background 0.15s ease;
        }
        .bento-portal-copy:hover {
          background: white;
        }

        /* Alerte : pleine largeur bas, persimmon hot (signal action) */
        .bento-cell--alerte {
          grid-column: 1 / -1; grid-row: 3;
          background: var(--hot-light);
          border-color: transparent;
          flex-direction: row; align-items: center; gap: 14px;
          padding: 14px 18px;
          color: var(--hot);
        }
        .bento-cell--alerte .bento-icon {
          background: var(--hot); color: white;
          flex-shrink: 0; margin: 0;
        }
        .bento-alerte-msg { flex: 1; min-width: 0; }
        .bento-alerte-title { font-weight: 600; color: var(--text-primary); font-size: 0.9375rem; line-height: 1.3; }
        .bento-alerte-desc { font-size: 0.75rem; color: var(--text-secondary); margin-top: 2px; }

        /* Atomes communs */
        .bento-icon {
          width: 38px; height: 38px;
          border-radius: 12px;
          display: inline-flex; align-items: center; justify-content: center;
        }
        .bento-label {
          font-size: 0.75rem; font-weight: 600;
          text-transform: uppercase; letter-spacing: 0.04em;
          color: var(--text-muted);
          line-height: 1.3;
        }
        .bento-value {
          font-size: 2rem; font-weight: 600;
          line-height: 1;
          font-family: var(--font-fraunces), Georgia, serif;
          font-variation-settings: 'opsz' 144, 'SOFT' 100;
          letter-spacing: -0.02em;
          color: var(--text-primary);
          margin-bottom: 4px;
        }
        .bento-value--small { font-size: 1.25rem; }

        /* Mobile : 2 colonnes simples, alerte full-width */
        @media (max-width: 768px) {
          .dash-bento {
            grid-template-columns: 1fr 1fr;
            grid-template-rows: 130px 110px 110px auto;
          }
          .bento-cell--main {
            grid-column: 1 / 3; grid-row: 1;
            min-height: 130px;
          }
          .bento-cell--agenda { grid-column: 1; grid-row: 2; }
          .bento-cell--eleves { grid-column: 2; grid-row: 2; }
          .bento-cell--info   { grid-column: 1; grid-row: 3; }
          .bento-cell--portal { grid-column: 2; grid-row: 3; }
          .bento-cell--alerte { grid-column: 1 / 3; grid-row: 4; }
          .bento-value { font-size: 1.625rem; }
          .bento-cell--main .bento-value { font-size: 1.875rem; }
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
          font-size: 1.5rem;
          font-weight: 500;
          color: #1a1612;
          font-family: var(--font-fraunces), Georgia, serif;
          font-variation-settings: 'opsz' 144, 'SOFT' 100;
          letter-spacing: -0.02em;
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
