'use client';

// ════════════════════════════════════════════════════════════════════════════
// Section "Abonnement IziSolo" — Stripe SaaS
// 3 plans publics (Solo 17€ / Pro 22€ / Studio 79€) — MENSUEL UNIQUEMENT
// (l'annuel est désactivé pour l'instant ; sera ajouté plus tard avec -20%)
// Trial 14 jours sur tous. Plan `free` (interne, exempté) jamais affiché ici.
// Extrait de parametres/page.js en B2d (découpe mécanique — seule prise :
// le helper mort `pillStyle`, défini après le return et jamais appelé, purgé).
// ════════════════════════════════════════════════════════════════════════════

import { useState } from 'react';
import { Check } from 'lucide-react';

export default function AbonnementCheckout({ currentPlan, profile }) {
  const [loading, setLoading] = useState(null); // 'solo' | 'pro' | 'premium'
  const [portalLoading, setPortalLoading] = useState(false);

  // ── Statut subscription Stripe (pour le bandeau du haut + bouton portail) ──
  const subStatus = profile?.stripe_subscription_status;
  const hasCustomerId = !!profile?.stripe_customer_id;
  const periodEnd = profile?.stripe_current_period_end;

  const openPortal = async () => {
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

  const PLANS_PUB = [
    {
      id: 'solo',
      nom: 'Solo',
      prixMensuel: 17,
      tagline: 'Pour démarrer en autonomie',
      pitch: 'Tout l\'essentiel pour gérer ton studio à la main.',
      features: [
        'Jusqu\'à 40 élèves',
        'Lieux illimités',
        'Cours, agenda, pointage présences',
        'Carnets / abonnements / paiements manuels',
        'Page publique studio (basique)',
        'Réservation en ligne pour élèves',
        'Messagerie chat élèves',
      ],
      limits: 'Pas d\'encaissement Stripe, pas de mailing, pas d\'automatisations.',
    },
    {
      id: 'pro',
      nom: 'Pro',
      recommended: true,
      prixMensuel: 22,
      tagline: 'Ton studio devient une machine',
      pitch: 'Encaissement en ligne + automatisations + outils marketing.',
      features: [
        'Élèves illimités',
        'Lieux illimités',
        'Tout Solo +',
        'Stripe Payment Link (1% IziSolo)',
        'Mailing campagnes par email',
        'Notifications auto élèves (rappels, carnets)',
        'Sondages planning',
        'Cours d\'essai pour visiteurs',
        'Templates communication + anniversaires auto',
        'Page publique enrichie + page brouillon',
        'Annulation par l\'élève',
        'Export comptabilité',
        'Liste d\'attente + dette annulation tardive',
      ],
    },
    {
      id: 'premium',
      nom: 'Studio',
      prixMensuel: 79,
      comingSoon: true,
      tagline: 'Pour les studios matures',
      pitch: 'Vidéos de cours vendables à l\'unité ou en abonnement + white-label.',
      features: [
        'Tout Pro +',
        'Vidéos de cours : uploader, diffuser, vendre à l\'unité ou en abonnement',
        'Logo studio dans tous les emails (white-label)',
      ],
      bonus: 'En cours de finalisation — disponible bientôt. Inscris-toi en Pro maintenant, tu pourras upgrader d\'un clic.',
    },
  ];

  const subscribe = async (plan) => {
    setLoading(plan);
    try {
      const res = await fetch('/api/stripe/checkout-saas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan, periode: 'mensuel' }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Erreur');
      if (json.url) window.location.href = json.url;
    } catch (err) {
      alert('Erreur : ' + err.message);
      setLoading(null);
    }
  };

  return (
    <div className="section izi-card">
      <h2 style={{ fontSize: '1.125rem', fontWeight: 700, marginBottom: 4 }}>Mon abonnement IziSolo</h2>
      <p className="section-desc">
        14 jours d'essai gratuit sur tous les plans. Tu peux changer ou annuler à tout moment.
      </p>

      {/* ── Bandeau d'état subscription ───────────────────────────────────── */}
      {subStatus === 'past_due' && (
        <div className="abo-banner abo-banner-warning">
          <strong>⚠️ Paiement échoué.</strong> Mets à jour ta carte pour ne pas perdre l'accès.
          {hasCustomerId && (
            <button onClick={openPortal} disabled={portalLoading} className="abo-banner-cta">
              {portalLoading ? 'Redirection…' : 'Mettre à jour'}
            </button>
          )}
        </div>
      )}
      {subStatus === 'canceled' && (
        <div className="abo-banner abo-banner-warning">
          <strong>Abonnement annulé.</strong> Tu accèdes à tes données existantes mais
          tu es ramenée aux limites Solo (40 élèves). Re-souscris quand tu veux.
        </div>
      )}
      {(subStatus === 'active' || subStatus === 'trialing') && hasCustomerId && (
        <div className="abo-banner abo-banner-active">
          <span>
            <strong>Abonnement {subStatus === 'trialing' ? 'en période d\'essai' : 'actif'}</strong>
            {periodEnd && (
              <> · prochain renouvellement le {new Date(periodEnd).toLocaleDateString('fr-FR')}</>
            )}
          </span>
          <button onClick={openPortal} disabled={portalLoading} className="abo-banner-cta">
            {portalLoading ? 'Redirection…' : 'Gérer mon abonnement (carte · factures · annuler)'}
          </button>
        </div>
      )}

      <style jsx>{`
        .abo-banner {
          display: flex; flex-wrap: wrap; gap: 10px;
          align-items: center; justify-content: space-between;
          padding: 12px 14px;
          border-radius: 8px;
          margin: 10px 0 16px;
          font-size: 0.875rem;
        }
        .abo-banner-warning {
          background: #fef3c7;
          border: 1px solid #fbbf24;
          color: #92400e;
        }
        .abo-banner-active {
          background: var(--brand-light, #faf2eb);
          border: 1px solid var(--brand, #b87333);
          color: var(--brand-700, #8c5826);
        }
        .abo-banner-cta {
          background: white;
          border: 1px solid currentColor;
          padding: 6px 12px;
          border-radius: 6px;
          font-size: 0.8125rem; font-weight: 600;
          cursor: pointer;
          color: inherit;
          transition: all 0.15s ease;
        }
        .abo-banner-cta:hover:not(:disabled) {
          background: currentColor;
          color: white;
        }
        .abo-banner-cta:disabled { opacity: 0.6; cursor: wait; }
      `}</style>

      <div className="plans-grid plans-grid-3">
        {PLANS_PUB.map(p => {
          const isCurrent = currentPlan === p.id;
          const isDisabled = p.comingSoon === true;
          return (
            <div
              key={p.id}
              className={`plan-card ${p.recommended ? 'recommended' : ''} ${isDisabled ? 'plan-card-disabled' : ''}`}
            >
              {p.recommended && !isDisabled && <div className="plan-badge">Recommandé</div>}
              {isDisabled && <div className="plan-badge plan-badge-soon">Bientôt</div>}
              <div className="plan-name">{p.nom}</div>
              <div className="plan-tagline">{p.tagline}</div>
              <div className="plan-price">
                <span className="plan-amount">{p.prixMensuel} €</span>
                <span className="plan-period">/mois TTC</span>
              </div>
              <p className="plan-desc">{p.pitch}</p>
              <ul className="plan-features">
                {p.features.map(f => (
                  <li key={f}>
                    <Check size={13} style={{ color: 'var(--success, #6B9A6B)', flexShrink: 0, marginTop: 2 }} />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
              {p.limits && (
                <p className="plan-limits">{p.limits}</p>
              )}
              {p.bonus && (
                <p className="plan-bonus">✦ {p.bonus}</p>
              )}
              <button
                onClick={() => !isDisabled && subscribe(p.id)}
                disabled={isCurrent || loading === p.id || isDisabled}
                className={`izi-btn ${p.recommended ? 'izi-btn-primary' : 'izi-btn-secondary'} plan-cta`}
                title={isDisabled ? 'Plan bientôt disponible' : ''}
              >
                {isDisabled
                  ? 'Bientôt disponible'
                  : isCurrent
                    ? 'Plan actuel'
                    : loading === p.id
                      ? 'Redirection…'
                      : (currentPlan && currentPlan !== 'free' ? `Passer à ${p.nom}` : `Démarrer mes 14 jours gratuits`)
                }
              </button>
            </div>
          );
        })}
      </div>

      <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 14, textAlign: 'center' }}>
        Tarifs TTC. Frais Stripe natifs (1,4% + 0,25 €) toujours dus à Stripe.
        Les frais IziSolo (1 % sur Pro et Studio) viennent en plus.
      </p>
    </div>
  );
}
