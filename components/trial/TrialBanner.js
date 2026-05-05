'use client';

/**
 * Banner persistant en haut du dashboard pour signaler l'état du trial 14j.
 *
 * 3 modes :
 *   - active    : bandeau crème "Il te reste X jours d'essai Pro" + bouton "Choisir mon abo"
 *   - expired   : bandeau persimmon (urgent) "Ton essai est terminé" + bouton CTA fort
 *   - subscribed/ineligible : ne s'affiche pas (return null)
 *
 * Posé dans le DashboardLayoutClient pour être visible sur TOUTES les pages
 * du dashboard (accueil, agenda, cours, élèves, etc.).
 */

import Link from 'next/link';
import { Sparkles, AlertTriangle, ArrowRight } from 'lucide-react';

export default function TrialBanner({ trial }) {
  if (!trial || (!trial.active && !trial.expired)) return null;

  if (trial.active) {
    const daysWord = trial.daysLeft > 1 ? 'jours' : 'jour';
    // Quand le trial est actif (pas expiré), on reste discret : chip slim
    // au lieu d'un grand bandeau, pour ne pas concurrencer les alertes
    // dashboard et autres bandeaux importants (audit UX 2026-05-05).
    return (
      <div className="trial-banner trial-banner--active">
        <Sparkles size={14} className="trial-banner-icon" />
        <span className="trial-banner-text">
          Essai <strong>Pro</strong> — {trial.daysLeft} {daysWord} restant{trial.daysLeft > 1 ? 's' : ''}
        </span>
        <Link href="/parametres?tab=abonnement" className="trial-banner-cta">
          Choisir mon abo
        </Link>

        <style jsx>{`
          .trial-banner {
            display: inline-flex; align-items: center; gap: 8px;
            padding: 6px 12px;
            background: var(--brand-light);
            border: 1px solid var(--brand-200);
            border-radius: 99px;
            margin-bottom: 12px;
            font-size: 0.8125rem;
            color: var(--brand-700);
            flex-wrap: wrap;
          }
          .trial-banner-icon { flex-shrink: 0; }
          .trial-banner-text { flex: 0 1 auto; }
          .trial-banner-cta {
            display: inline-flex; align-items: center; gap: 4px;
            padding: 3px 10px;
            background: var(--brand);
            color: white;
            border-radius: 99px;
            font-size: 0.75rem; font-weight: 600;
            text-decoration: none;
            transition: background var(--transition-fast);
            white-space: nowrap;
          }
          .trial-banner-cta:hover {
            background: var(--brand-dark);
          }
        `}</style>
      </div>
    );
  }

  // trial.expired
  return (
    <div className="trial-banner trial-banner--expired">
      <AlertTriangle size={18} className="trial-banner-icon" />
      <div className="trial-banner-content">
        <div className="trial-banner-title">Ton essai est terminé</div>
        <div className="trial-banner-desc">
          Pour continuer à utiliser IziSolo (ajouter cours, élèves, paiements…),
          choisis ton abonnement.
        </div>
      </div>
      <Link href="/parametres?tab=abonnement" className="trial-banner-cta">
        Choisir mon plan <ArrowRight size={14} />
      </Link>

      <style jsx>{`
        .trial-banner {
          display: flex; align-items: center; gap: 12px;
          padding: 14px 16px;
          background: var(--hot-light, #FCE8DA);
          border: 1px solid var(--hot, #E8722A);
          border-radius: var(--radius-md);
          margin-bottom: 14px;
          color: var(--hot, #E8722A);
          flex-wrap: wrap;
        }
        .trial-banner-icon { flex-shrink: 0; color: var(--hot, #E8722A); }
        .trial-banner-content { flex: 1; min-width: 200px; }
        .trial-banner-title { font-weight: 700; color: var(--text-primary); font-size: 0.9375rem; }
        .trial-banner-desc { font-size: 0.8125rem; color: var(--text-secondary); margin-top: 2px; line-height: 1.4; }
        .trial-banner-cta {
          display: inline-flex; align-items: center; gap: 4px;
          padding: 8px 16px;
          background: var(--hot, #E8722A);
          color: white;
          border-radius: 99px;
          font-size: 0.875rem; font-weight: 600;
          text-decoration: none;
          transition: opacity var(--transition-fast);
          white-space: nowrap;
        }
        .trial-banner-cta:hover { opacity: 0.9; }
      `}</style>
    </div>
  );
}
