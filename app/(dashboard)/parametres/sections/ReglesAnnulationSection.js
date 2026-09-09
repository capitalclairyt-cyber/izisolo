'use client';

// ════════════════════════════════════════════════════════════════════════════
// Section "Règles d'annulation" — l'app applique automatiquement les règles
// configurées ici (délai libre, séance comptée si tardive). La carte (titre,
// résumé, bouton) est rendue par la rubrique (lot 2).
// ════════════════════════════════════════════════════════════════════════════

import { getReglesAnnulation } from '@/lib/regles-metier';
import { EnSavoirPlus } from '../CarteReglage';

const DELAIS_PRESETS = [
  { value: 6,   label: '6 heures', sub: 'très souple' },
  { value: 12,  label: '12 heures', sub: 'demi-journée' },
  { value: 24,  label: '24 heures', sub: 'recommandé' },
  { value: 48,  label: '48 heures', sub: 'pour cours premium' },
  { value: 72,  label: '72 heures', sub: 'stages et ateliers' },
];

export default function ReglesAnnulationSection({ profile, setProfile, setDirty }) {
  // Délai effectif via la loi unique (B2a) — le champ message reste lu brut.
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
    <>
      <p className="section-desc">
        <strong>Au-delà du délai, la séance est comptée</strong> dans le crédit de l'élève, tout seul : tu n'as plus la règle à expliquer.
      </p>

      <div className="form-group">
        <label className="form-label">Délai libre d'annulation avant le cours</label>
        <div className="ra-presets">
          {DELAIS_PRESETS.map(p => (
            <button key={p.value} type="button" onClick={() => updateRegles({ delai_heures: p.value })} className={`ra-preset-btn ${delai === p.value ? 'active' : ''}`}>
              <span className="ra-preset-label">{p.label}</span>
              <span className="ra-preset-sub">{p.sub}</span>
            </button>
          ))}
        </div>
        <EnSavoirPlus>
          <p>En deçà de ce délai, l'élève peut toujours annuler depuis son espace, mais la séance est décomptée de son carnet ou de son abonnement, ou marquée due si elle n'a pas de crédit.</p>
        </EnSavoirPlus>
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
        <p className="form-hint">Vide = « Annulation libre jusqu'au [date limite] ».</p>
      </div>

      <div className="ra-preview">
        <strong>Aperçu côté élève :</strong>
        <p>Annulation libre jusqu'à <strong>{delai}h avant le cours</strong>. Après, la séance sera décomptée de ton crédit.</p>
      </div>

      <style jsx global>{`
        .ra-presets {
          display: grid; grid-template-columns: repeat(auto-fit, minmax(110px, 1fr));
          gap: 8px; margin-top: 4px;
        }
        .ra-preset-btn {
          display: flex; flex-direction: column; align-items: center; gap: 2px;
          padding: 10px 8px; border-radius: 12px;
          border: 1.5px solid var(--border); background: white;
          cursor: pointer; transition: all 0.15s;
        }
        .ra-preset-btn:hover { border-color: var(--brand); }
        .ra-preset-btn.active { border-color: var(--brand); background: var(--brand-light); }
        .ra-preset-label { font-weight: 600; font-size: 0.875rem; color: var(--text-primary); }
        .ra-preset-sub { font-size: 0.7rem; color: var(--text-muted); }
        .ra-preset-btn.active .ra-preset-label { color: var(--brand-700); }
        .ra-preview {
          background: var(--bg-soft, #faf8f5);
          border: 1px dashed var(--border);
          border-radius: 10px;
          padding: 10px 14px;
          font-size: 0.8125rem;
          color: var(--text-secondary);
        }
        .ra-preview strong { color: var(--text-primary); }
        .ra-preview p { margin: 4px 0 0; line-height: 1.5; }
      `}</style>
    </>
  );
}
