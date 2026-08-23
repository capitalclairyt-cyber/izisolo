'use client';

// ════════════════════════════════════════════════════════════════════════════
// Section "Abonnement IziSolo" — Stripe SaaS
// 2 plans publics (Essentiel 15 € / Complet 29 € TTC) — MENSUEL UNIQUEMENT
// (l'annuel est désactivé pour l'instant ; sera ajouté plus tard avec -20%)
// Trial 14 jours sur tous. Plan `free` (interne, exempté) jamais affiché ici.
// Extrait de parametres/page.js en B2d (découpe mécanique — seule prise :
// le helper mort `pillStyle`, défini après le return et jamais appelé, purgé).
// ════════════════════════════════════════════════════════════════════════════

import { useState } from 'react';
import { Check } from 'lucide-react';

export default function AbonnementCheckout({ currentPlan, profile }) {
  // Un abonnement qui VIT (pas la colonne plan, qui vaut 'solo' par défaut
  // depuis v56 même pendant l'essai).
  const aUnAbonnement = ['active', 'trialing', 'past_due']
    .includes(profile?.stripe_subscription_status);

  // Plan interne tout-inclus et gratuit (Maude, Colin, bêta-testeuses choisies).
  // Souscrire n'aurait aucun sens, et la route refuse de toute façon : autant
  // que l'écran le dise au lieu d'ouvrir un formulaire de paiement.
  const estOfferte = profile?.plan === 'free';
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

  // 2 plans (matrice §5) : « Essentiel = ton cahier, en mieux. Complet = tes
  // élèves entrent dans la boucle. » Studio (premium) retiré — plus jamais
  // vendu, vidéos/white-label au backlog sans carte grisée.
  // Grille définitive tranchée 2026-07-27 : Essentiel 15 € / Complet 29 € TTC.
  const PLANS_PUB = [
    {
      id: 'solo',
      nom: 'Essentiel',
      prixMensuel: 15,
      tagline: 'Ton cahier, en mieux',
      pitch: 'Tout ce que tu gères seule : élèves, agenda, carnets, compta.',
      features: [
        'Élèves illimités · import/export CSV',
        'Cours, agenda, récurrences, lieux illimités',
        'Pointage 1-clic + carnets/abos gérés à la main',
        'Mini-compta : encaissements, « à percevoir », export comptable',
        'Page publique vitrine (planning affiché, PWA)',
      ],
      limits: 'Tes élèves ne font rien en ligne : pas de résa, pas d\'espace élève, pas de paiement en ligne.',
    },
    {
      id: 'pro',
      nom: 'Complet',
      recommended: true,
      prixMensuel: 29,
      tagline: 'Tes élèves entrent dans la boucle',
      pitch: 'Tout Essentiel + tes élèves réservent, annulent, paient et te parlent en ligne.',
      features: [
        'Réservation en ligne + annulation élève + règles d\'annulation',
        'Espace élève connecté (compte, historique, rappels J-1)',
        'Cours d\'essai en ligne, liste d\'attente, cours privés',
        'Messagerie, mailing groupé, sondages planning',
        'Paiement en ligne élèves (Stripe Payment Link, 1 % IziSolo)',
        'Import fiche par photo (IA)',
      ],
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
          <strong>Abonnement annulé.</strong> Tes données restent accessibles en lecture
          (et exportables), mais ton studio est en pause. Re-souscris quand tu veux.
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

      {estOfferte && (
        <div className="izi-card" style={{
          background: 'var(--bg-soft, #faf8f5)', border: '1px dashed var(--border)',
          padding: '14px 16px', marginBottom: 14,
        }}>
          <strong style={{ fontSize: '0.9rem' }}>Ton accès est offert 🌿</strong>
          <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', margin: '4px 0 0', lineHeight: 1.5 }}>
            Tu as toutes les fonctionnalités, sans limite et sans rien à payer. Il n'y a
            donc rien à souscrire ici. Si un jour tu veux basculer sur un abonnement
            normal, écris-nous.
          </p>
        </div>
      )}

      <div className="plans-grid">
        {PLANS_PUB.map(p => {
          // « Plan actuel » se lit sur l'ABONNEMENT, jamais sur profile.plan.
          // La migration v56 pose default 'solo' : toute prof en essai a donc
          // plan='solo' en base, et la carte Essentiel naissait désactivée avec
          // « Plan actuel ». La moitié de la grille était invendable, sans une
          // seule erreur dans les logs.
          const isCurrent = aUnAbonnement && currentPlan === p.id;
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
                <span className="plan-period">/mois</span>
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
                onClick={() => !isDisabled && !estOfferte && subscribe(p.id)}
                disabled={isCurrent || loading === p.id || isDisabled || estOfferte}
                className={`izi-btn ${p.recommended ? 'izi-btn-primary' : 'izi-btn-secondary'} plan-cta`}
                title={isDisabled ? 'Plan bientôt disponible' : ''}
              >
                {isDisabled
                  ? 'Bientôt disponible'
                  : isCurrent
                    ? 'Plan actuel'
                    : loading === p.id
                      ? 'Redirection…'
                      : estOfferte
                        ? 'Ton accès est offert'
                        : aUnAbonnement
                          ? `Passer à ${p.nom}`
                          : `Choisir ${p.nom}`
                }
              </button>
            </div>
          );
        })}
      </div>

      <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 14, textAlign: 'center' }}>
        TVA non applicable (art. 293 B du CGI). Frais Stripe natifs (1,5 % + 0,25 €) toujours dus à Stripe.
        Les frais IziSolo (1 % sur le paiement en ligne, plan Complet) viennent en plus.
      </p>
    </div>
  );
}
