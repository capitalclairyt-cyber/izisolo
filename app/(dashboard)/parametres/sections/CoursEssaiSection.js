'use client';

// ════════════════════════════════════════════════════════════════════════════
// Section "Cours d'essai" — pour les visiteurs non encore clients.
// Extrait de parametres/page.js en B2d (découpe mécanique, zéro changement).
// ════════════════════════════════════════════════════════════════════════════

import { Zap } from 'lucide-react';

export default function CoursEssaiSection({ profile, setProfile, setDirty }) {
  const set = (field) => (val) => {
    setProfile(prev => ({ ...prev, [field]: val }));
    setDirty(true);
  };
  const actif = profile?.essai_actif === true;
  const mode  = profile?.essai_mode || 'manuel';
  const paiement = profile?.essai_paiement || 'gratuit';

  return (
    <div className="section izi-card">
      <div className="section-top">
        <div className="section-icon"><Zap size={20} /></div>
        <h2>Cours d'essai</h2>
      </div>
      <p className="section-desc">
        Permets aux visiteurs de demander un cours d'essai depuis ta page publique.
        Idéal pour tester ton activité avant de s'inscrire.
      </p>

      {/* Toggle actif */}
      <div className="essai-toggle-row" onClick={() => set('essai_actif')(!actif)}>
        <div>
          <div className="essai-toggle-label">{actif ? 'Activé' : 'Désactivé'}</div>
          <div className="essai-toggle-sub">
            {actif
              ? 'Le bouton "Cours d\'essai" est visible sur ton portail public.'
              : 'Aucun bouton de demande d\'essai sur ton portail public.'}
          </div>
        </div>
        <div className={`essai-switch ${actif ? 'on' : ''}`}>
          <div className="essai-switch-knob" />
        </div>
      </div>

      {actif && (
        <div className="essai-config">
          {/* Mode de validation */}
          <div className="form-group">
            <label className="form-label">Mode de validation</label>
            <div className="essai-radio-group">
              {[
                { val: 'auto',   label: 'Automatique',   desc: 'La demande est validée immédiatement, sans intervention de ta part.' },
                { val: 'semi',   label: 'Semi-automatique', desc: 'Validée immédiatement, tu reçois juste un email de notification.' },
                { val: 'manuel', label: 'Manuel',         desc: 'Tu reçois la demande, tu la valides ou la refuses depuis l\'app.' },
              ].map(opt => (
                <label key={opt.val} className={`essai-radio-opt ${mode === opt.val ? 'active' : ''}`}>
                  <input
                    type="radio"
                    name="essai_mode"
                    value={opt.val}
                    checked={mode === opt.val}
                    onChange={() => set('essai_mode')(opt.val)}
                  />
                  <div>
                    <div className="essai-radio-label">{opt.label}</div>
                    <div className="essai-radio-desc">{opt.desc}</div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Paiement */}
          <div className="form-group">
            <label className="form-label">Paiement</label>
            <div className="essai-radio-group">
              {[
                { val: 'gratuit',  label: 'Gratuit',         desc: 'Le cours d\'essai est offert.' },
                { val: 'sur_place', label: 'Payant sur place', desc: 'Le visiteur règle le jour du cours, en espèces / CB / chèque.' },
                { val: 'stripe',   label: 'Paiement Stripe',  desc: 'Le visiteur règle en ligne via un Stripe Payment Link.' },
              ].map(opt => (
                <label key={opt.val} className={`essai-radio-opt ${paiement === opt.val ? 'active' : ''}`}>
                  <input
                    type="radio"
                    name="essai_paiement"
                    value={opt.val}
                    checked={paiement === opt.val}
                    onChange={() => set('essai_paiement')(opt.val)}
                  />
                  <div>
                    <div className="essai-radio-label">{opt.label}</div>
                    <div className="essai-radio-desc">{opt.desc}</div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Prix (sauf si gratuit) */}
          {paiement !== 'gratuit' && (
            <div className="form-group">
              <label className="form-label">Prix du cours d'essai (€)</label>
              <input
                type="number"
                step="0.5"
                min="0"
                className="izi-input"
                value={profile?.essai_prix || ''}
                onChange={e => set('essai_prix')(parseFloat(e.target.value) || 0)}
                placeholder="ex : 10"
              />
            </div>
          )}

          {/* Stripe Payment Link */}
          {paiement === 'stripe' && (
            <div className="form-group">
              <label className="form-label">Lien de paiement Stripe</label>
              <input
                type="url"
                className="izi-input"
                value={profile?.essai_stripe_payment_link || ''}
                onChange={e => set('essai_stripe_payment_link')(e.target.value)}
                placeholder="https://buy.stripe.com/..."
              />
              <span className="form-hint">
                Crée un Payment Link dans ton dashboard Stripe (Produits → Payment links) et colle l'URL ici.
              </span>
            </div>
          )}

          {/* Message d'accueil */}
          <div className="form-group">
            <label className="form-label">Message d'accueil (optionnel)</label>
            <textarea
              className="izi-input"
              rows={3}
              maxLength={500}
              value={profile?.essai_message || ''}
              onChange={e => set('essai_message')(e.target.value)}
              placeholder="Bienvenue ! Je serais ravi·e de t'accueillir pour un cours d'essai."
            />
            <span className="form-hint">{(profile?.essai_message || '').length}/500</span>
          </div>
        </div>
      )}

      <style jsx>{`
        .essai-toggle-row {
          display: flex; align-items: center; justify-content: space-between;
          gap: 12px; padding: 14px; cursor: pointer;
          background: var(--bg-soft, #faf8f5); border-radius: 12px;
          margin-top: 4px;
        }
        .essai-toggle-label { font-weight: 700; color: var(--text-primary); font-size: 0.9375rem; }
        .essai-toggle-sub   { font-size: 0.8125rem; color: var(--text-muted); margin-top: 2px; }
        .essai-switch {
          width: 42px; height: 24px; flex-shrink: 0;
          background: #ccc; border-radius: 999px;
          position: relative; transition: background .2s;
        }
        .essai-switch.on { background: var(--brand); }
        .essai-switch-knob {
          position: absolute; top: 2px; left: 2px;
          width: 20px; height: 20px;
          background: white; border-radius: 50%;
          transition: transform .2s;
          box-shadow: 0 1px 3px rgba(0,0,0,0.15);
        }
        .essai-switch.on .essai-switch-knob { transform: translateX(18px); }
        .essai-config {
          margin-top: 16px; padding-top: 16px;
          border-top: 1px solid var(--border);
          display: flex; flex-direction: column; gap: 16px;
        }
        .essai-radio-group { display: flex; flex-direction: column; gap: 6px; }
        .essai-radio-opt {
          display: flex; align-items: flex-start; gap: 10px;
          padding: 10px 12px; border: 1.5px solid var(--border);
          border-radius: 10px; cursor: pointer; transition: all 0.15s;
        }
        .essai-radio-opt.active { border-color: var(--brand); background: var(--brand-light); }
        .essai-radio-opt input { margin-top: 4px; accent-color: var(--brand); }
        .essai-radio-label { font-size: 0.875rem; font-weight: 600; color: var(--text-primary); }
        .essai-radio-desc { font-size: 0.75rem; color: var(--text-secondary); margin-top: 2px; line-height: 1.4; }
      `}</style>
    </div>
  );
}
