'use client';

// ════════════════════════════════════════════════════════════════════════════
// Section « Règlement par virement » (v98, 2026-08-23 — demande Colin dans la
// foulée de la demande d'offre v97) : le RIB de la prof + le réglage de
// l'email « comment régler » qui part après une vente à régler plus tard.
// Décisions Colin : choix du mail À LA VENTE (virement RIB / espèces / chèque),
// paramètre auto ou « je choisis », dispo sur LES DEUX plans, QR SEPA côté
// espace élève.
// Éditeur du réglage : lit la config BRUTE (un input montre le vide, pas le
// défaut — §12) ; l'écriture passe par sanitizeReglementConfig (SERIALIZERS).
// ════════════════════════════════════════════════════════════════════════════

import { Landmark } from 'lucide-react';
import { validerIban, EMAIL_MODES, VARIANTES_EMAIL } from '@/lib/reglement';

const LIBELLES_DEFAUT = {
  virement: 'Virement (RIB)',
  especes: 'Espèces au studio',
  cheque: 'Chèque au studio',
};

export default function ReglementSection({ profile, setProfile, setDirty, boutonSauver = null }) {
  const cfg = (profile?.reglement_config && typeof profile.reglement_config === 'object')
    ? profile.reglement_config : {};
  const rib = (cfg.rib && typeof cfg.rib === 'object') ? cfg.rib : {};

  const maj = (patch) => {
    setProfile(prev => ({
      ...prev,
      reglement_config: { ...((prev?.reglement_config && typeof prev.reglement_config === 'object') ? prev.reglement_config : {}), ...patch },
    }));
    setDirty();
  };
  const majRib = (champ) => (e) => maj({ rib: { ...rib, [champ]: e.target.value } });

  const ibanSaisi = String(rib.iban || '').trim();
  const ibanCheck = ibanSaisi ? validerIban(ibanSaisi) : null;
  const emailMode = EMAIL_MODES.includes(cfg.email_mode) ? cfg.email_mode : 'choix';
  const emailDefaut = VARIANTES_EMAIL.includes(cfg.email_defaut) ? cfg.email_defaut : 'virement';

  return (
    <div className="section izi-card">
      <div className="section-top">
        <div className="section-icon"><Landmark size={20} /></div>
        <h2>Règlement par virement</h2>
      </div>
      <p className="section-desc">
        Avec ton RIB renseigné, une vente « à régler plus tard » peut envoyer à l&apos;élève un email
        <strong> « comment régler »</strong> : ton IBAN, une <strong>référence de virement</strong> (pour reconnaître
        son règlement sur ton relevé) et, dans son espace, un <strong>QR code</strong> à scanner avec son application
        bancaire. Sans RIB, l&apos;email peut quand même proposer espèces ou chèque au studio.
      </p>

      <div className="form-group">
        <label className="form-label">Titulaire du compte</label>
        <input
          className="izi-input"
          value={rib.titulaire || ''}
          onChange={majRib('titulaire')}
          placeholder={profile?.studio_nom || 'Ton nom, ou celui de ta structure'}
          maxLength={70}
        />
      </div>
      <div className="form-group">
        <label className="form-label">IBAN</label>
        <input
          className="izi-input"
          value={rib.iban || ''}
          onChange={majRib('iban')}
          placeholder="FR76 1234 5678 9012 3456 7890 123"
          autoComplete="off"
          spellCheck={false}
        />
        {ibanCheck && !ibanCheck.ok ? (
          <p className="form-hint" style={{ color: '#dc2626' }}>{ibanCheck.erreur}</p>
        ) : (
          <p className="form-hint">
            {ibanCheck?.ok ? 'IBAN valide ✓' : 'Un RIB se partage par nature : il permet de recevoir un virement, jamais d\'en émettre.'}
          </p>
        )}
      </div>
      <div className="form-group">
        <label className="form-label">BIC (optionnel)</label>
        <input
          className="izi-input"
          value={rib.bic || ''}
          onChange={majRib('bic')}
          placeholder="PSSTFRPPXXX"
          autoComplete="off"
          spellCheck={false}
          style={{ maxWidth: 220 }}
        />
      </div>

      <div className="form-group">
        <label className="form-label">L&apos;email « comment régler », après une vente à régler plus tard</label>
        <div className="reg-email-modes">
          <label className="reg-email-mode">
            <input
              type="radio"
              name="reg-email-mode"
              checked={emailMode === 'auto'}
              onChange={() => maj({ email_mode: 'auto' })}
            />
            <span>
              Il part tout seul, avec :{' '}
              <select
                className="izi-input reg-email-defaut"
                value={emailDefaut}
                disabled={emailMode !== 'auto'}
                onChange={e => maj({ email_defaut: e.target.value })}
              >
                {VARIANTES_EMAIL.map(v => (
                  <option key={v} value={v}>{LIBELLES_DEFAUT[v]}</option>
                ))}
              </select>
            </span>
          </label>
          <label className="reg-email-mode">
            <input
              type="radio"
              name="reg-email-mode"
              checked={emailMode === 'choix'}
              onChange={() => maj({ email_mode: 'choix' })}
            />
            <span>Je choisis à chaque vente (rien ne part sans mon clic)</span>
          </label>
          <label className="reg-email-mode">
            <input
              type="radio"
              name="reg-email-mode"
              checked={emailMode === 'jamais'}
              onChange={() => maj({ email_mode: 'jamais' })}
            />
            <span>Ne jamais envoyer d&apos;email</span>
          </label>
        </div>
        <p className="form-hint">
          Dans tous les cas, le choix reste modifiable au moment de la vente. « Part tout seul » avec
          « Virement (RIB) » ne présélectionne le virement que si ton RIB est renseigné.
        </p>
      </div>

      {boutonSauver}

      {/* jsx GLOBAL : les <label>/<select> sont natifs mais le bloc est simple —
          global par cohérence avec les autres sections de Paramètres. */}
      <style jsx global>{`
        .reg-email-modes { display: flex; flex-direction: column; gap: 10px; margin-top: 4px; }
        .reg-email-mode {
          display: flex; align-items: center; gap: 9px;
          font-size: 0.875rem; color: var(--text-primary); cursor: pointer;
        }
        .reg-email-mode input[type='radio'] { accent-color: var(--brand, #B87333); flex-shrink: 0; }
        .reg-email-defaut {
          display: inline-block; width: auto; padding: 4px 8px !important;
          font-size: 0.8125rem !important; margin-left: 2px;
        }
        .reg-email-defaut:disabled { opacity: 0.5; }
      `}</style>
    </div>
  );
}
