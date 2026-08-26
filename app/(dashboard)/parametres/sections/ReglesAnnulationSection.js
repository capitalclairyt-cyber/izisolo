'use client';

// ════════════════════════════════════════════════════════════════════════════
// Section "Règles d'annulation" — l'app applique automatiquement les règles
// configurées ici (délai libre, séance comptée si tardive). La prof n'a plus à
// se positionner en "méchant·e" face à ses élèves.
// Extrait de parametres/page.js en B2d (découpe mécanique, zéro changement).
// ════════════════════════════════════════════════════════════════════════════

import { AlertCircle } from 'lucide-react';
import { getReglesAnnulation } from '@/lib/regles-metier';

const DELAIS_PRESETS = [
  { value: 6,   label: '6 heures', sub: 'très souple' },
  { value: 12,  label: '12 heures', sub: 'demi-journée' },
  { value: 24,  label: '24 heures', sub: 'recommandé' },
  { value: 48,  label: '48 heures', sub: 'pour cours premium' },
  { value: 72,  label: '72 heures', sub: 'stages et ateliers' },
];

export default function ReglesAnnulationSection({ profile, setProfile, setDirty }) {
  // Délai effectif via la loi unique (B2a) — le champ message reste lu brut :
  // l'input doit montrer vide quand rien n'est saisi, pas le défaut affiché élève.
  const delai = getReglesAnnulation(profile).delai_heures;
  const message = profile?.regles_annulation?.message || '';

  const updateRegles = (patch) => {
    setProfile(prev => ({
      ...prev,
      regles_annulation: { ...(prev?.regles_annulation || {}), ...patch },
    }));
    setDirty(true);
  };

  return (
    <div className="section izi-card">
      <div className="section-top">
        <div className="section-icon"><AlertCircle size={20} /></div>
        <h2>Règles d'annulation</h2>
      </div>
      <p className="section-desc">
        L'app applique automatiquement ces règles. <strong>Au-delà du délai, la séance est comptée</strong> dans le crédit de l'élève : tu n'as plus besoin d'expliquer toi-même la règle.
      </p>

      <div className="form-group">
        <label className="form-label">Délai libre d'annulation avant le cours</label>
        <div className="ra-presets">
          {DELAIS_PRESETS.map(p => (
            <button
              key={p.value}
              type="button"
              onClick={() => updateRegles({ delai_heures: p.value })}
              className={`ra-preset-btn ${delai === p.value ? 'active' : ''}`}
            >
              <span className="ra-preset-label">{p.label}</span>
              <span className="ra-preset-sub">{p.sub}</span>
            </button>
          ))}
        </div>
        <p className="form-hint">
          En-deçà de ce délai, l'élève peut toujours annuler depuis son espace, mais
          la séance sera décomptée de son carnet/abonnement (ou marquée due si pas de crédit).
        </p>
      </div>

      <div className="form-group">
        <label className="form-label">Message affiché à l'élève (optionnel)</label>
        <input
          type="text"
          className="izi-input"
          value={message}
          onChange={e => updateRegles({ message: e.target.value })}
          placeholder={`Ex : Annulation acceptée jusqu'à ${delai}h avant le cours`}
          maxLength={200}
        />
        <p className="form-hint">
          Si vide, l'app affiche automatiquement <em>« Annulation libre jusqu'au [date limite] »</em>.
        </p>
      </div>

      <div className="ra-preview">
        <strong>Aperçu côté élève :</strong>
        <p>
          Annulation libre jusqu'à <strong>{delai}h avant le cours</strong>.
          Après, la séance sera décomptée de ton crédit.
        </p>
      </div>

      <style jsx global>{`
        .ra-presets {
          display: grid; grid-template-columns: repeat(auto-fit, minmax(110px, 1fr));
          gap: 8px; margin-top: 4px;
        }
        .ra-preset-btn {
          display: flex; flex-direction: column; align-items: center; gap: 2px;
          padding: 12px 8px; border-radius: 12px;
          border: 1.5px solid var(--border); background: white;
          cursor: pointer; transition: all 0.15s;
        }
        .ra-preset-btn:hover { border-color: var(--brand); }
        .ra-preset-btn.active {
          border-color: var(--brand);
          background: var(--brand-light);
        }
        .ra-preset-label { font-weight: 600; font-size: 0.875rem; color: var(--text-primary); }
        .ra-preset-sub { font-size: 0.7rem; color: var(--text-muted); }
        .ra-preset-btn.active .ra-preset-label { color: var(--brand-700); }
        .ra-preview {
          background: var(--bg-soft, #faf8f5);
          border: 1px dashed var(--border);
          border-radius: 10px;
          padding: 12px 14px;
          margin-top: 14px;
          font-size: 0.8125rem;
          color: var(--text-secondary);
        }
        .ra-preview strong { color: var(--text-primary); }
        .ra-preview p { margin: 6px 0 0; line-height: 1.5; }
      `}</style>
    </div>
  );
}
