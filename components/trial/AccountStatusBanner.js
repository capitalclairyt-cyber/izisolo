'use client';

/**
 * Banner persistant unifié — affiche le bon message selon le statut du
 * compte de la prof. Gère 4 états visibles + 2 invisibles :
 *
 *   • 'trial_active'  → bandeau slim "X jours d'essai Pro restants"
 *   • 'trial_expired' → bandeau urgent "Ton essai est terminé, souscris"
 *   • 'past_due'      → bandeau warning "Paiement échoué, mets à jour ta carte"
 *   • 'canceled'      → bandeau warning "Compte gelé, re-souscris"
 *   • 'subscribed'    → null (rien à dire)
 *   • 'free'          → null (compte interne)
 *
 * Posé en haut du DashboardLayoutClient → visible sur toutes les pages.
 * Le bouton "Re-souscrire" envoie sur /parametres?tab=abonnement.
 *
 * Note : pour past_due, le bouton ouvre directement le Customer Portal
 * via /api/stripe/customer-portal (changement de carte = action urgente).
 */

import { useState } from 'react';
import Link from 'next/link';
import { Sparkles, AlertTriangle, Snowflake, CreditCard } from 'lucide-react';
import { getAccountStatus, getTrialStatus } from '@/lib/trial';

export default function AccountStatusBanner({ profile }) {
  const status = getAccountStatus(profile);
  const [portalLoading, setPortalLoading] = useState(false);

  // États sans bandeau
  if (status === 'subscribed' || status === 'free') return null;

  const openPortal = async (e) => {
    e.preventDefault();
    setPortalLoading(true);
    try {
      const res = await fetch('/api/stripe/customer-portal', { method: 'POST' });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Erreur');
      if (json.url) window.location.href = json.url;
    } catch (err) {
      alert('Erreur : ' + err.message);
      setPortalLoading(false);
    }
  };

  // ─── trial_active : on n'affiche le bandeau que dans la dernière
  //     ligne droite (≤ 5 jours restants) pour ne pas marteler la prof
  //     pendant les 9 premiers jours où elle découvre l'app sereinement.
  if (status === 'trial_active') {
    const trial = getTrialStatus(profile);
    if (trial.daysLeft > 5) return null; // discret : on attend J-5

    const daysWord = trial.daysLeft > 1 ? 'jours' : 'jour';
    return (
      <div className="acc-banner acc-banner--trial-active">
        <Sparkles size={14} className="acc-icon" />
        <span className="acc-trial-text">
          Essai <strong>Pro</strong> — {trial.daysLeft} {daysWord} restant{trial.daysLeft > 1 ? 's' : ''}
        </span>
        <Link href="/parametres?tab=abonnement" className="acc-cta">
          Choisir mon abo
        </Link>
        <BannerStyle />
      </div>
    );
  }

  // ─── trial_expired : bandeau urgent ────────────────────────────────
  if (status === 'trial_expired') {
    return (
      <div className="acc-banner acc-banner--expired">
        <AlertTriangle size={16} className="acc-icon" />
        <div className="acc-text">
          <strong>Ton essai 14 jours est terminé.</strong> Choisis un plan pour
          continuer à ajouter élèves, cours et paiements.
        </div>
        <Link href="/parametres?tab=abonnement" className="acc-cta acc-cta--primary">
          Souscrire maintenant
        </Link>
        <BannerStyle />
      </div>
    );
  }

  // ─── past_due : paiement échoué, urgent mais accès maintenu ────────
  if (status === 'past_due') {
    return (
      <div className="acc-banner acc-banner--past-due">
        <CreditCard size={16} className="acc-icon" />
        <div className="acc-text">
          <strong>Paiement échoué.</strong> Mets à jour ta carte pour ne pas perdre l'accès.
          Stripe va re-essayer plusieurs fois avant l'annulation définitive.
        </div>
        <button onClick={openPortal} disabled={portalLoading} className="acc-cta acc-cta--primary">
          {portalLoading ? 'Redirection…' : 'Mettre à jour ma carte'}
        </button>
        <BannerStyle />
      </div>
    );
  }

  // ─── canceled : compte gelé ────────────────────────────────────────
  if (status === 'canceled') {
    return (
      <div className="acc-banner acc-banner--canceled">
        <Snowflake size={16} className="acc-icon" />
        <div className="acc-text">
          <strong>Compte gelé — abo annulé.</strong> Tu peux toujours consulter tes
          données mais plus en ajouter. <strong>Le trial 14j a déjà été utilisé</strong> —
          re-souscris pour ré-accéder à toutes les features.
        </div>
        <Link href="/parametres?tab=abonnement" className="acc-cta acc-cta--primary">
          Re-souscrire
        </Link>
        <BannerStyle />
      </div>
    );
  }

  return null;
}

function BannerStyle() {
  return (
    <style jsx>{`
      .acc-banner {
        display: flex; align-items: center; gap: 10px;
        padding: 10px 14px;
        border-radius: 8px;
        margin-bottom: 12px;
        font-size: 0.875rem;
        line-height: 1.4;
        flex-wrap: wrap;
      }

      .acc-banner--trial-active {
        background: var(--brand-light, #faf2eb);
        border: 1px solid var(--brand-200, #e8c8a8);
        color: var(--brand-700, #8c5826);
        padding: 6px 14px;
        font-size: 0.8125rem;
        border-radius: 99px;
        display: inline-flex;
        gap: 12px;          /* espace explicite entre icône, texte et CTA */
      }
      .acc-trial-text {
        white-space: nowrap;
        margin-right: 4px;  /* espace clair avant le bouton "Choisir mon abo" */
      }
      .acc-banner--expired {
        background: #fff7ed;
        border: 1px solid #fb923c;
        border-left: 4px solid #ea580c;
        color: #9a3412;
      }
      .acc-banner--past-due {
        background: #fef3c7;
        border: 1px solid #fbbf24;
        border-left: 4px solid #d97706;
        color: #92400e;
      }
      .acc-banner--canceled {
        background: #eff6ff;
        border: 1px solid #93c5fd;
        border-left: 4px solid #2563eb;
        color: #1e40af;
      }

      .acc-icon { flex-shrink: 0; }
      .acc-text { flex: 1; min-width: 200px; }

      .acc-cta {
        background: white;
        border: 1px solid currentColor;
        padding: 6px 12px;
        border-radius: 6px;
        font-size: 0.8125rem; font-weight: 600;
        cursor: pointer;
        color: inherit;
        text-decoration: none;
        white-space: nowrap;
        font-family: inherit;
        transition: all 0.15s ease;
      }
      .acc-cta:hover:not(:disabled) {
        background: currentColor;
        color: white !important;
      }
      .acc-cta:disabled { opacity: 0.6; cursor: wait; }

      .acc-cta--primary {
        background: currentColor;
        color: white !important;
      }
      .acc-cta--primary:hover:not(:disabled) {
        opacity: 0.85;
      }

      @media (max-width: 600px) {
        .acc-banner { font-size: 0.8125rem; }
        .acc-cta { width: 100%; text-align: center; }
      }
    `}</style>
  );
}
