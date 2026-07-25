'use client';

// ════════════════════════════════════════════════════════════════════════════
// Section "Paiement en ligne (Stripe)"
// Le pro renseigne son webhook signing secret. IziSolo lui affiche l'URL endpoint
// à coller dans son dashboard Stripe (avec son profile_id en query param pour le retrouver).
// Extrait de parametres/page.js en B2d (découpe mécanique, zéro changement).
// ════════════════════════════════════════════════════════════════════════════

import { useState } from 'react';
import { CreditCard, Check, Copy, AlertCircle } from 'lucide-react';

export default function StripePaiementSection({ profile, setProfile, setDirty }) {
  const [copied, setCopied] = useState(false);
  const [showSecret, setShowSecret] = useState(false);

  const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://www.izisolo.fr';
  const webhookUrl = profile?.id ? `${baseUrl}/api/stripe/webhook?profile=${profile.id}` : '';
  const secret = profile?.stripe_webhook_secret || '';
  const configured = !!secret;

  const copyWebhookUrl = async () => {
    try {
      await navigator.clipboard.writeText(webhookUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* clipboard refusé (permissions navigateur) — l'URL reste copiable à la main */ }
  };

  const handleSecretChange = (e) => {
    setProfile(prev => ({ ...prev, stripe_webhook_secret: e.target.value }));
    setDirty(true);
  };

  return (
    <div className="section izi-card">
      <div className="section-top">
        <div className="section-icon"><CreditCard size={20} /></div>
        <h2>Paiement en ligne</h2>
        {configured && (
          <span className="stripe-status-pill"><Check size={11} /> Configuré</span>
        )}
      </div>
      <p className="section-desc">
        Branche Stripe pour permettre à tes élèves de payer leurs carnets et abonnements
        par CB depuis ton portail. <strong>Frais de fonctionnement IziSolo : 1%</strong> du volume — ajoutés
        à ta facture mensuelle, jamais prélevés sur tes paiements.
      </p>

      <div className="stripe-config">
        <div className="stripe-step">
          <span className="stripe-step-num">1</span>
          <div className="stripe-step-body">
            <strong>URL d'endpoint à configurer sur Stripe</strong>
            <div className="stripe-url-row">
              <code className="stripe-url-code">{webhookUrl}</code>
              <button type="button" onClick={copyWebhookUrl} className="stripe-copy-btn">
                {copied ? <><Check size={13} /> Copié</> : <><Copy size={13} /> Copier</>}
              </button>
            </div>
            <p className="stripe-step-hint">
              Va sur <a href="https://dashboard.stripe.com/webhooks" target="_blank" rel="noopener noreferrer">dashboard.stripe.com/webhooks</a>
              {' '}→ <strong>+ Add endpoint</strong> → colle l'URL → coche l'événement{' '}
              <code>checkout.session.completed</code> (et optionnellement <code>charge.refunded</code>).
            </p>
          </div>
        </div>

        <div className="stripe-step">
          <span className="stripe-step-num">2</span>
          <div className="stripe-step-body">
            <label className="stripe-label" htmlFor="stripe-webhook-secret">
              <strong>Webhook signing secret</strong>
            </label>
            <p className="stripe-step-hint">
              Une fois l'endpoint créé sur Stripe, clique dessus → onglet <strong>Signing secret</strong> → <strong>Reveal</strong>. Copie le secret (commence par <code>whsec_</code>) et colle-le ci-dessous.
            </p>
            <div className="stripe-secret-row">
              <input
                id="stripe-webhook-secret"
                type={showSecret ? 'text' : 'password'}
                className="izi-input"
                value={secret}
                onChange={handleSecretChange}
                placeholder="whsec_..."
                autoComplete="off"
              />
              <button type="button" onClick={() => setShowSecret(s => !s)} className="stripe-eye-btn">
                {showSecret ? 'Masquer' : 'Afficher'}
              </button>
            </div>
          </div>
        </div>

        <div className="stripe-step">
          <span className="stripe-step-num">3</span>
          <div className="stripe-step-body">
            <strong>Crée tes Payment Links sur tes offres</strong>
            <p className="stripe-step-hint">
              Va dans <a href="/offres/nouveau" target="_blank">Offres → Nouvelle offre</a> et colle un Payment Link Stripe pour chaque carnet/abonnement vendable en ligne.
            </p>
          </div>
        </div>
      </div>

      {!configured && (
        <div className="stripe-warning">
          <AlertCircle size={14} /> Tant que le secret n'est pas renseigné, IziSolo ne pourra pas confirmer automatiquement les paiements Stripe (ils devront être marqués manuellement).
        </div>
      )}

      <style jsx global>{`
        .stripe-status-pill {
          display: inline-flex; align-items: center; gap: 4px;
          background: #ecfdf5; color: #065f46;
          font-size: 0.7rem; font-weight: 700;
          padding: 3px 9px; border-radius: 99px;
          margin-left: auto; border: 1px solid #6ee7b7;
        }
        .stripe-config { display: flex; flex-direction: column; gap: 18px; margin-top: 14px; }
        .stripe-step { display: flex; gap: 12px; }
        .stripe-step-num {
          flex-shrink: 0; width: 26px; height: 26px; border-radius: 50%;
          background: #635bff; color: white;
          display: flex; align-items: center; justify-content: center;
          font-size: 0.8125rem; font-weight: 700;
        }
        .stripe-step-body { flex: 1; min-width: 0; }
        .stripe-step-body strong { display: block; font-size: 0.875rem; color: var(--text-primary); margin-bottom: 6px; }
        .stripe-step-hint { font-size: 0.75rem; color: var(--text-secondary); line-height: 1.5; margin: 4px 0 0; }
        .stripe-step-hint a { color: #635bff; font-weight: 600; }
        .stripe-step-hint code {
          background: var(--bg-soft, #f5f5f5); padding: 1px 5px; border-radius: 4px;
          font-size: 0.7rem; color: var(--text-primary);
        }
        .stripe-url-row { display: flex; gap: 6px; margin-top: 4px; align-items: center; }
        .stripe-url-code {
          flex: 1; min-width: 0; padding: 7px 10px;
          background: var(--bg-soft, #faf8f5); border: 1px solid var(--border);
          border-radius: 6px; font-size: 0.7rem; word-break: break-all;
          color: var(--text-primary);
        }
        .stripe-copy-btn {
          display: inline-flex; align-items: center; gap: 4px;
          padding: 6px 12px; border-radius: 6px;
          background: var(--brand-light); color: var(--brand-700);
          border: 1px solid var(--brand-200, #fbd5d5); cursor: pointer;
          font-size: 0.7rem; font-weight: 600; flex-shrink: 0;
        }
        .stripe-copy-btn:hover { background: var(--brand); color: white; }
        .stripe-secret-row { display: flex; gap: 6px; align-items: center; margin-top: 4px; }
        .stripe-eye-btn {
          padding: 7px 10px; border-radius: 6px; cursor: pointer;
          background: white; border: 1px solid var(--border);
          font-size: 0.7rem; color: var(--text-secondary); flex-shrink: 0;
        }
        .stripe-warning {
          display: flex; align-items: flex-start; gap: 6px;
          margin-top: 14px; padding: 10px 12px;
          background: #fffbeb; border: 1px solid #fcd34d;
          color: #78350f; border-radius: 8px;
          font-size: 0.75rem; line-height: 1.4;
        }
        .stripe-warning svg { flex-shrink: 0; margin-top: 1px; color: #f59e0b; }
        .stripe-label { font-size: 0.875rem; }
      `}</style>
    </div>
  );
}
