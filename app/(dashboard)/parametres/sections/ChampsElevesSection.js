'use client';

// ════════════════════════════════════════════════════════════════════════════
// Section "Champs élèves" — config des champs collectés sur les fiches élèves.
// La prof toggle des champs prédéfinis et peut ajouter des champs perso.
// Extrait de parametres/page.js en B2d (découpe mécanique, zéro changement).
// ════════════════════════════════════════════════════════════════════════════

import { Plus, Trash2, ToggleLeft, ToggleRight } from 'lucide-react';

const PREDEFINED_FIELDS = [
  { key: 'date_naissance', label: 'Date de naissance', icon: '🎂', hint: 'Pour envoyer un mot doux le jour J' },
  { key: 'adresse',        label: 'Adresse postale',   icon: '📍', hint: 'Utile pour cadeaux ou factures papier' },
  { key: 'niveau',         label: 'Niveau de pratique', icon: '🏆', hint: 'Débutant / Intermédiaire / Avancé' },
  { key: 'source',         label: 'Source / Provenance', icon: '👀', hint: 'Comment l\'élève a découvert le studio' },
  { key: 'notes',          label: 'Notes libres (vue prof)', icon: '📝', hint: 'Tes propres notes (préférences, blessures, etc.)' },
];

const CUSTOM_FIELD_TYPES = [
  { value: 'text',     label: 'Texte court' },
  { value: 'textarea', label: 'Texte long' },
  { value: 'select',   label: 'Liste de choix' },
  { value: 'number',   label: 'Nombre' },
  { value: 'date',     label: 'Date' },
];

const DEFAULT_CFC = {
  predefined: { date_naissance: true, adresse: false, niveau: true, source: true, notes: true },
  custom: [],
};

export default function ChampsElevesSection({ profile, setProfile, setDirty }) {
  const cfg = profile?.client_fields_config || DEFAULT_CFC;
  const predefined = { ...DEFAULT_CFC.predefined, ...(cfg.predefined || {}) };
  const customs = Array.isArray(cfg.custom) ? cfg.custom : [];

  const updateConfig = (newCfg) => {
    setProfile(prev => ({ ...prev, client_fields_config: newCfg }));
    setDirty(true);
  };

  const togglePredefined = (key) => {
    updateConfig({
      predefined: { ...predefined, [key]: !predefined[key] },
      custom: customs,
    });
  };

  const addCustom = () => {
    const newId = 'cf_' + Math.random().toString(36).slice(2, 11) + '_' + Date.now().toString(36);
    updateConfig({
      predefined,
      custom: [...customs, { id: newId, label: '', type: 'text', required: false, ordre: customs.length }],
    });
  };

  const updateCustom = (id, patch) => {
    updateConfig({
      predefined,
      custom: customs.map(c => c.id === id ? { ...c, ...patch } : c),
    });
  };

  const removeCustom = (id) => {
    if (!confirm('Supprimer ce champ ? Les valeurs déjà saisies sur les fiches élèves seront conservées en base mais ne s\'afficheront plus dans le formulaire.')) return;
    updateConfig({
      predefined,
      custom: customs.filter(c => c.id !== id),
    });
  };

  return (
    <div className="section izi-card">
      <h2 style={{ fontSize: '1.125rem', fontWeight: 700, marginBottom: 4 }}>Infos collectées sur tes élèves</h2>
      <p className="section-desc">
        Choisis les champs que tu veux remplir sur chaque fiche élève. Tu peux activer/désactiver
        les champs prédéfinis ou ajouter tes propres champs (allergies, contact urgence, etc.).
      </p>

      {/* Champs prédéfinis */}
      <div className="cfc-section-label">Champs prédéfinis</div>
      <div className="cfc-list">
        {PREDEFINED_FIELDS.map(f => (
          <div key={f.key} className="cfc-item">
            <button
              type="button"
              onClick={() => togglePredefined(f.key)}
              className="cfc-toggle"
              aria-pressed={predefined[f.key]}
            >
              {predefined[f.key]
                ? <ToggleRight size={26} style={{ color: 'var(--brand)' }} />
                : <ToggleLeft size={26} style={{ color: 'var(--text-muted)' }} />
              }
            </button>
            <div className="cfc-info">
              <div className="cfc-label">{f.icon} {f.label}</div>
              <div className="cfc-hint">{f.hint}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Champs perso */}
      <div className="cfc-section-label" style={{ marginTop: 18 }}>Tes champs personnalisés</div>
      {customs.length === 0 ? (
        <p className="cfc-empty">Aucun champ perso pour l'instant.</p>
      ) : (
        <div className="cfc-list">
          {customs.map(field => (
            <div key={field.id} className="cfc-custom-row">
              <input
                className="izi-input cfc-custom-label"
                value={field.label}
                onChange={e => updateCustom(field.id, { label: e.target.value })}
                placeholder="Ex : Allergies, Pratique précédente…"
              />
              <select
                className="izi-input cfc-custom-type"
                value={field.type}
                onChange={e => updateCustom(field.id, { type: e.target.value })}
              >
                {CUSTOM_FIELD_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
              {field.type === 'select' && (
                <input
                  className="izi-input cfc-custom-options"
                  value={(field.options || []).join(', ')}
                  onChange={e => updateCustom(field.id, { options: e.target.value.split(',').map(s => s.trim()).filter(Boolean) })}
                  placeholder="Choix1, Choix2, Choix3"
                />
              )}
              <button
                type="button"
                onClick={() => removeCustom(field.id)}
                className="cfc-custom-remove"
                title="Supprimer"
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))}
        </div>
      )}
      <button type="button" onClick={addCustom} className="izi-btn izi-btn-secondary cfc-add-btn">
        <Plus size={16} /> Ajouter un champ perso
      </button>

      <style jsx>{`
        .cfc-section-label {
          font-size: 0.75rem; font-weight: 700;
          text-transform: uppercase; letter-spacing: 0.05em;
          color: var(--text-muted, #888);
          margin-top: 12px; margin-bottom: 8px;
        }
        .cfc-list { display: flex; flex-direction: column; gap: 6px; }
        .cfc-item {
          display: flex; align-items: center; gap: 10px;
          padding: 10px 12px;
          border: 1px solid var(--border, #e5e0d8);
          border-radius: 8px;
        }
        .cfc-toggle {
          background: none; border: none; padding: 0;
          cursor: pointer; flex-shrink: 0;
        }
        .cfc-info { flex: 1; min-width: 0; }
        .cfc-label { font-weight: 600; font-size: 0.9375rem; }
        .cfc-hint { font-size: 0.8125rem; color: var(--text-muted, #888); margin-top: 2px; }
        .cfc-empty { font-size: 0.875rem; color: var(--text-muted, #888); font-style: italic; }
        .cfc-custom-row {
          display: grid;
          grid-template-columns: 1fr 140px auto;
          gap: 6px;
          align-items: center;
        }
        .cfc-custom-row:has(.cfc-custom-options) {
          grid-template-columns: 1fr 140px 1fr auto;
        }
        .cfc-custom-options { font-size: 0.8125rem; }
        .cfc-custom-remove {
          background: none; border: 1px solid var(--border, #e5e0d8);
          color: var(--text-muted, #888);
          width: 36px; height: 36px;
          border-radius: 6px;
          cursor: pointer;
          display: inline-flex; align-items: center; justify-content: center;
        }
        .cfc-custom-remove:hover {
          background: #fef2f2;
          border-color: #dc2626;
          color: #dc2626;
        }
        .cfc-add-btn {
          margin-top: 10px;
        }
        @media (max-width: 600px) {
          .cfc-custom-row {
            grid-template-columns: 1fr;
          }
          .cfc-custom-row:has(.cfc-custom-options) {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
}
