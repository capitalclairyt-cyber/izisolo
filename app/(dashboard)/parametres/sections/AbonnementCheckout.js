'use client';

// ════════════════════════════════════════════════════════════════════════════
// Section "Abonnement IziSolo" — Stripe SaaS
// Grille du 2026-09-13 (FREEMIUM, PLAN-ASSOS-STUDIOS-2026.md) :
//   Essentiel 0 € (gratuit, sans carte, pour toujours : rien à souscrire)
//   Complet 29 €/mois (la boucle élève)
//   Association 39 €/mois ou 390 €/an, Studio 59 €/mois ou 590 €/an
// La grille montrée dépend du TYPE de structure : une prof seule voit
// Essentiel, Complet et Studio (« tu as une équipe ? ») ; une association voit
// Essentiel, Complet et Association ; un studio voit Essentiel, Complet et
// Studio. Plan `free` (interne, exempté) jamais affiché ici.
// ════════════════════════════════════════════════════════════════════════════

import { useState } from 'react';
import { Check } from 'lucide-react';
import { PLANS, PLANS_ANNUEL } from '@/lib/constantes';
import { getAccountStatus } from '@/lib/trial';
import { typeStructure } from '@/lib/structure';

export default function AbonnementCheckout({ currentPlan, profile }) {
  // Un abonnement qui VIT (pas la colonne plan, qui vaut 'solo' par défaut
  // depuis v56 même pendant l'essai).
  const aUnAbonnement = ['active', 'trialing', 'past_due', 'unpaid']
    .includes(profile?.stripe_subscription_status);
  const statut = getAccountStatus(profile);
  const type = typeStructure(profile);

  // Plan interne tout-inclus et gratuit (Maude, Colin, bêta-testeuses choisies).
  // Souscrire n'aurait aucun sens, et la route refuse de toute façon : autant
  // que l'écran le dise au lieu d'ouvrir un formulaire de paiement.
  const estOfferte = profile?.plan === 'free';
  const [loading, setLoading] = useState(null); // clé du plan en cours de redirection
  const [portalLoading, setPortalLoading] = useState(false);
  // Mensuel ou annuel, pour les plans de structure seulement.
  const [periode, setPeriode] = useState('mensuel');

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

  const CARTES = {
    solo: {
      id: 'solo',
      nom: PLANS.solo.nom,
      tagline: 'Ton cahier, en mieux',
      pitch: 'Tout ce que tu gères seule : élèves, agenda, carnets, compta. Gratuit, sans carte, pour toujours.',
      features: [
        'Élèves illimités · import/export CSV',
        'Cours, agenda, récurrences, lieux illimités',
        'Pointage 1-clic + carnets/abos gérés à la main',
        'Encaissements, factures, déclaration URSSAF, export comptable',
        'Page publique vitrine (planning affiché, PWA)',
      ],
      limits: 'Tes élèves ne font rien en ligne : pas de résa, pas d\'espace élève, pas de paiement ni de demande d\'offre en ligne, pas de sondage.',
    },
    pro: {
      id: 'pro',
      nom: PLANS.pro.nom,
      recommended: type === 'solo',
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
    asso: {
      id: 'asso',
      nom: PLANS.asso.nom,
      recommended: type === 'association',
      tagline: 'Ton association, ses profs, son bureau',
      pitch: 'Tout Complet + ton équipe : chaque prof a son accès, ses droits, ses séances. Forfait plat, profs illimitées.',
      features: [
        'Profs illimitées, invitées par email ou par lien',
        'Droits par personne (pointer, élèves, argent, messagerie, réglages)',
        'Qui donne quelle séance, et qui peut la pointer',
        'Bientôt : bureau, adhésions, documents de l\'asso, AG',
      ],
      bonus: 'Deux mois offerts à l\'année',
    },
    studio: {
      id: 'studio',
      nom: PLANS.studio.nom,
      recommended: type === 'studio',
      tagline: 'Ton studio, tes intervenantes, tes comptes',
      pitch: 'Tout Complet + ton équipe : chaque intervenante a son accès, ses droits, ses séances. Forfait plat, intervenantes illimitées.',
      features: [
        'Intervenantes illimitées, invitées par email ou par lien',
        'Droits par personne (pointer, élèves, argent, messagerie, réglages)',
        'Qui donne quelle séance, et qui peut la pointer',
        'Bientôt : relevés par intervenante, dépenses, marge, salles',
      ],
      bonus: 'Deux mois offerts à l\'année',
    },
  };
  // La grille selon la structure : jamais Association à un studio, jamais
  // Studio à une association (le checkout le refuserait de toute façon).
  const PLANS_PUB = type === 'association'
    ? [CARTES.solo, CARTES.pro, CARTES.asso]
    : [CARTES.solo, CARTES.pro, CARTES.studio];
  const montreAnnuel = PLANS_PUB.some(p => PLANS_ANNUEL.includes(p.id));

  const subscribe = async (plan) => {
    setLoading(plan);
    try {
      const res = await fetch('/api/stripe/checkout-saas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan, periode: PLANS_ANNUEL.includes(plan) ? periode : 'mensuel' }),
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
    <>
      <p className="section-desc">
        Essentiel est gratuit, pour toujours. Les autres plans s'essaient 30 jours sans carte, puis tu changes ou tu arrêtes quand tu veux.
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
      {statut === 'impaye' && (
        <div className="abo-banner abo-banner-warning">
          <strong>Facture impayée.</strong> Ton compte est en lecture seule tant qu'elle n'est pas réglée.
          {hasCustomerId && (
            <button onClick={openPortal} disabled={portalLoading} className="abo-banner-cta">
              {portalLoading ? 'Redirection…' : 'Régler ma facture'}
            </button>
          )}
        </div>
      )}
      {statut === 'canceled' && (
        <div className="abo-banner abo-banner-warning">
          <strong>Abonnement terminé.</strong> Tu es sur Essentiel, gratuit : tout ce que tu gères seule
          continue de marcher. Re-souscris quand tu veux.
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
        .periode-toggle {
          display: inline-flex; gap: 4px; padding: 3px;
          border: 1px solid var(--border); border-radius: 99px;
          margin: 4px 0 14px;
          background: var(--bg-soft, #faf8f5);
        }
        .periode-toggle button {
          border: none; background: none; cursor: pointer; font-family: inherit;
          padding: 6px 14px; border-radius: 99px; font-size: 0.8125rem; font-weight: 600;
          color: var(--text-secondary);
        }
        .periode-toggle button.on {
          background: var(--bg-card, white); color: var(--text);
          box-shadow: 0 1px 2px rgba(0,0,0,0.08);
        }
        .periode-toggle small { font-weight: 500; opacity: 0.8; }
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

      {montreAnnuel && !estOfferte && (
        <div className="periode-toggle" role="radiogroup" aria-label="Périodicité">
          <button type="button" role="radio" aria-checked={periode === 'mensuel'} className={periode === 'mensuel' ? 'on' : ''} onClick={() => setPeriode('mensuel')}>
            Chaque mois
          </button>
          <button type="button" role="radio" aria-checked={periode === 'annuel'} className={periode === 'annuel' ? 'on' : ''} onClick={() => setPeriode('annuel')}>
            À l'année <small>· deux mois offerts</small>
          </button>
        </div>
      )}

      <div className="plans-grid">
        {PLANS_PUB.map(p => {
          const cfg = PLANS[p.id];
          const gratuit = cfg.prix === 0;
          const annuel = periode === 'annuel' && PLANS_ANNUEL.includes(p.id);
          // « Plan actuel » se lit sur l'ABONNEMENT, jamais sur profile.plan.
          // La migration v56 pose default 'solo' : toute prof en essai a donc
          // plan='solo' en base, et la carte Essentiel naissait désactivée avec
          // « Plan actuel ». Essentiel est « actuel » quand on n'a NI
          // abonnement NI essai en cours : c'est là qu'on vit, gratuitement.
          const isCurrent = gratuit
            ? (!aUnAbonnement && (statut === 'gratuit' || statut === 'canceled'))
            : (aUnAbonnement && currentPlan === p.id);
          return (
            <div
              key={p.id}
              className={`plan-card ${p.recommended ? 'recommended' : ''}`}
              data-plan={p.id}
            >
              {p.recommended && <div className="plan-badge">Recommandé</div>}
              <div className="plan-name">{p.nom}</div>
              <div className="plan-tagline">{p.tagline}</div>
              <div className="plan-price">
                {gratuit ? (
                  <>
                    <span className="plan-amount">0 €</span>
                    <span className="plan-period">pour toujours</span>
                  </>
                ) : annuel ? (
                  <>
                    <span className="plan-amount">{cfg.prixAnnuel} €</span>
                    <span className="plan-period">/an</span>
                  </>
                ) : (
                  <>
                    <span className="plan-amount">{cfg.prix} €</span>
                    <span className="plan-period">/mois</span>
                  </>
                )}
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
              {p.bonus && !annuel && (
                <p className="plan-bonus">✦ {p.bonus}</p>
              )}
              {gratuit ? (
                <button
                  type="button"
                  disabled
                  className="izi-btn izi-btn-secondary plan-cta"
                  title="Essentiel est gratuit : rien à souscrire"
                >
                  {isCurrent ? 'Ton plan actuel' : 'Gratuit, sans rien faire'}
                </button>
              ) : (
                <button
                  onClick={() => !estOfferte && subscribe(p.id)}
                  disabled={isCurrent || loading === p.id || estOfferte}
                  className={`izi-btn ${p.recommended ? 'izi-btn-primary' : 'izi-btn-secondary'} plan-cta`}
                >
                  {isCurrent
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
              )}
            </div>
          );
        })}
      </div>

      <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 14, textAlign: 'center' }}>
        TVA non applicable (art. 293 B du CGI). Frais Stripe natifs (1,5 % + 0,25 €) toujours dus à Stripe.
        Les frais IziSolo (1 % sur le paiement en ligne, plans payants) viennent en plus.
        {type === 'solo' && <> Le plan Association est réservé aux associations déclarées : indique ton RNA dans Paramètres → Studio &amp; lieux.</>}
      </p>
    </>
  );
}
