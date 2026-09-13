'use client';

/**
 * Bandeau persistant unifié : le bon message selon le statut du compte.
 * Refondu pour le FREEMIUM (2026-09-13, PLAN-ASSOS-STUDIOS §3) : plus
 * jamais de « compte gelé » à la fin d'un essai.
 *
 *   • 'trial_active' → bandeau slim « X jours d'essai restants », à J-5
 *   • 'gratuit'      → invitation, FERMABLE, seulement dans les 14 jours qui
 *                      suivent la fin de l'essai (« tes élèves n'ont plus leur
 *                      espace, le rouvrir coûte 29 € »), jamais à vie
 *   • 'canceled'     → même invitation, fermable (abonnement terminé)
 *   • 'past_due'     → bandeau warning « Paiement échoué, mets à jour ta carte »
 *   • 'impaye'       → bandeau urgent : LE seul cas qui gèle encore
 *   • 'subscribed'   → null (rien à dire)
 *   • 'free'         → null (compte interne)
 *
 * Posé en haut du DashboardLayoutClient → visible sur toutes les pages.
 *
 * Note : pour past_due et impaye, le bouton ouvre directement le Customer
 * Portal via /api/stripe/customer-portal (changement de carte = action urgente).
 */

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Sparkles, AlertTriangle, Snowflake, CreditCard, X } from 'lucide-react';
import { getAccountStatus, getTrialStatus, essaiFiniDepuisMoinsDe } from '@/lib/trial';
import { PLANS } from '@/lib/constantes';
import { planEssai } from '@/lib/structure';

const CLE_FERME = 'izi_bandeau_gratuit_ferme';

export default function AccountStatusBanner({ profile }) {
  const status = getAccountStatus(profile);
  const [portalLoading, setPortalLoading] = useState(false);
  // Fermeture mémorisée par navigateur (localStorage, jamais bloquant : un
  // accès qui jette rend simplement le bandeau à nouveau visible).
  const [ferme, setFerme] = useState(true);
  useEffect(() => {
    try { setFerme(localStorage.getItem(CLE_FERME) === '1'); } catch { setFerme(false); }
  }, []);
  const fermer = () => {
    setFerme(true);
    try { localStorage.setItem(CLE_FERME, '1'); } catch { /* rien */ }
  };

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

  const nomEssai = PLANS[planEssai(profile)]?.nom || 'Complet';
  const prixEssai = PLANS[planEssai(profile)]?.prix || 29;

  // ─── trial_active : on n'affiche le bandeau que dans la dernière
  //     ligne droite (≤ 5 jours restants) pour ne pas marteler la prof
  //     pendant les premiers jours où elle découvre l'app sereinement.
  if (status === 'trial_active') {
    const trial = getTrialStatus(profile);
    if (trial.daysLeft > 5) return null; // discret : on attend J-5

    const daysWord = trial.daysLeft > 1 ? 'jours' : 'jour';
    return (
      <div className="acc-banner acc-banner--trial-active" data-testid="bandeau-essai">
        <Sparkles size={14} className="acc-icon" />
        <span className="acc-trial-text">
          Essai <strong>{nomEssai}</strong> · {trial.daysLeft} {daysWord} restant{trial.daysLeft > 1 ? 's' : ''}, puis Essentiel gratuit
        </span>
        <Link href="/parametres/abonnement" className="acc-cta">
          Garder {nomEssai}
        </Link>
        <BannerStyle />
      </div>
    );
  }

  // ─── gratuit / canceled : une invitation, pas une alarme ───────────
  // Le compte marche entièrement en Essentiel. On le dit une fois, dans les
  // deux semaines qui suivent la fin de l'essai, et la prof peut fermer.
  if (status === 'gratuit' || status === 'canceled') {
    if (ferme) return null;
    if (status === 'gratuit' && !essaiFiniDepuisMoinsDe(profile, 14)) return null;
    return (
      <div className="acc-banner acc-banner--gratuit" data-testid="bandeau-gratuit">
        <Sparkles size={16} className="acc-icon" />
        <div className="acc-text">
          {status === 'canceled'
            ? <><strong>Ton abonnement est terminé :</strong> tu es sur Essentiel, gratuit.</>
            : <><strong>Ton essai {nomEssai} est fini :</strong> tu es sur Essentiel, gratuit, pour toujours.</>}
          {' '}Tes élèves n'ont plus leur espace ni la réservation en ligne : le rouvrir coûte {prixEssai} € par mois, sans engagement.
        </div>
        <Link href="/parametres/abonnement" className="acc-cta acc-cta--primary">
          Voir {nomEssai}
        </Link>
        <button type="button" onClick={fermer} className="acc-close" aria-label="Fermer ce message">
          <X size={14} />
        </button>
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
          Stripe va re-essayer plusieurs fois avant d'abandonner.
        </div>
        <button onClick={openPortal} disabled={portalLoading} className="acc-cta acc-cta--primary">
          {portalLoading ? 'Redirection…' : 'Mettre à jour ma carte'}
        </button>
        <BannerStyle />
      </div>
    );
  }

  // ─── impaye : LE cas qui gèle ──────────────────────────────────────
  if (status === 'impaye') {
    return (
      <div className="acc-banner acc-banner--expired" data-testid="bandeau-impaye">
        <Snowflake size={16} className="acc-icon" />
        <div className="acc-text">
          <strong>Ton abonnement a un impayé.</strong> Tu peux consulter tes
          données mais plus rien ajouter tant que la facture n'est pas réglée.
        </div>
        <button onClick={openPortal} disabled={portalLoading} className="acc-cta acc-cta--primary">
          {portalLoading ? 'Redirection…' : 'Régler ma facture'}
        </button>
        <BannerStyle />
      </div>
    );
  }

  return null;
}

function BannerStyle() {
  // Global OBLIGATOIRE : ce composant ne contient QUE le style — en scoped,
  // son hash ne peut matcher aucun élément du bandeau (rendus par un AUTRE
  // composant), et .acc-cta habille des <Link> que styled-jsx ne hashe pas.
  // En scoped, TOUT le bandeau était nu (sweep liens hors charte 2026-08-19).
  return (
    <style jsx global>{`
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
        margin-right: 4px;  /* espace clair avant le bouton */
      }
      .acc-banner--gratuit {
        background: var(--brand-light, #faf2eb);
        border: 1px solid var(--brand-200, #e8c8a8);
        border-left: 4px solid var(--brand, #b87333);
        color: var(--brand-700, #8c5826);
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
      .acc-close {
        background: none; border: none; cursor: pointer; color: inherit;
        padding: 4px; border-radius: 6px; display: inline-flex; opacity: 0.7;
      }
      .acc-close:hover { opacity: 1; background: rgba(0,0,0,0.06); }

      @media (max-width: 600px) {
        .acc-banner { font-size: 0.8125rem; }
        .acc-cta { width: 100%; text-align: center; }
      }
    `}</style>
  );
}
