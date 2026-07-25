'use client';

// ════════════════════════════════════════════════════════════════════════════
// "HorairesStudioEditor" — widget 7 jours avec toggle + plage horaire.
// Extrait de parametres/page.js en B2d (découpe mécanique, zéro changement).
// ════════════════════════════════════════════════════════════════════════════

import { Check, X, Plus } from 'lucide-react';

export default function HorairesStudioEditor({ horaires, onChange }) {
  const JOURS = [
    { key: 'lun', label: 'Lundi' },
    { key: 'mar', label: 'Mardi' },
    { key: 'mer', label: 'Mercredi' },
    { key: 'jeu', label: 'Jeudi' },
    { key: 'ven', label: 'Vendredi' },
    { key: 'sam', label: 'Samedi' },
    { key: 'dim', label: 'Dimanche' },
  ];
  const DEFAUT = {
    lun: { ouvert: true,  plages: [{ debut: '09:00', fin: '20:00' }] },
    mar: { ouvert: true,  plages: [{ debut: '09:00', fin: '20:00' }] },
    mer: { ouvert: true,  plages: [{ debut: '09:00', fin: '20:00' }] },
    jeu: { ouvert: true,  plages: [{ debut: '09:00', fin: '20:00' }] },
    ven: { ouvert: true,  plages: [{ debut: '09:00', fin: '20:00' }] },
    sam: { ouvert: true,  plages: [{ debut: '10:00', fin: '14:00' }] },
    dim: { ouvert: false, plages: [] },
  };

  const current = horaires || DEFAUT;

  // Convertit {jour → {ouvert, plages}} en texte "Lun 9h–20h · Mar fermé · …"
  const toText = (h) => {
    const lines = [];
    for (const { key, label } of JOURS) {
      const day = h[key] || { ouvert: false, plages: [] };
      const short = label.slice(0, 3);
      if (!day.ouvert || (day.plages || []).length === 0) {
        lines.push(`${short} fermé`);
      } else {
        const plages = day.plages
          .map(p => {
            const fmt = (t) => t.endsWith(':00') ? t.replace(':00', 'h') : t.replace(':', 'h');
            return `${fmt(p.debut)}–${fmt(p.fin)}`;
          })
          .join(', ');
        lines.push(`${short} ${plages}`);
      }
    }
    return lines.join(' · ');
  };

  const updateDay = (dayKey, patch) => {
    const newDay = { ...current[dayKey], ...patch };
    if (newDay.ouvert && (!newDay.plages || newDay.plages.length === 0)) {
      newDay.plages = [{ debut: '09:00', fin: '18:00' }];
    }
    if (!newDay.ouvert) newDay.plages = [];
    const newHoraires = { ...current, [dayKey]: newDay };
    onChange(newHoraires, toText(newHoraires));
  };

  const updatePlage = (dayKey, plageIdx, field, value) => {
    const day = current[dayKey];
    const newPlages = day.plages.map((p, i) => i === plageIdx ? { ...p, [field]: value } : p);
    updateDay(dayKey, { plages: newPlages });
  };

  const addPlage = (dayKey) => {
    const day = current[dayKey];
    const newPlages = [...(day.plages || []), { debut: '14:00', fin: '18:00' }];
    updateDay(dayKey, { plages: newPlages });
  };

  const removePlage = (dayKey, plageIdx) => {
    const day = current[dayKey];
    const newPlages = day.plages.filter((_, i) => i !== plageIdx);
    updateDay(dayKey, { plages: newPlages });
  };

  return (
    <div className="form-group">
      <label className="form-label">Horaires d'ouverture du studio</label>
      <p className="form-hint" style={{ marginTop: -2, marginBottom: 10 }}>
        Active les jours où ton studio est ouvert et précise les plages horaires.
        S'affiche sur ta page publique pour que tes élèves sachent quand te joindre.
      </p>

      <div className="horaires-grid">
        {JOURS.map(({ key, label }) => {
          const day = current[key] || { ouvert: false, plages: [] };
          return (
            <div key={key} className={`horaires-row ${day.ouvert ? 'open' : 'closed'}`}>
              <button
                type="button"
                onClick={() => updateDay(key, { ouvert: !day.ouvert })}
                className="horaires-toggle"
                aria-pressed={day.ouvert}
              >
                <span className={`horaires-checkbox ${day.ouvert ? 'checked' : ''}`}>
                  {day.ouvert && <Check size={12} strokeWidth={3} />}
                </span>
                <span className="horaires-day">{label}</span>
              </button>
              {day.ouvert ? (
                <div className="horaires-plages">
                  {day.plages.map((p, idx) => (
                    <div key={idx} className="horaires-plage">
                      <input
                        type="time"
                        value={p.debut}
                        onChange={e => updatePlage(key, idx, 'debut', e.target.value)}
                        className="izi-input horaires-time"
                      />
                      <span className="horaires-dash">–</span>
                      <input
                        type="time"
                        value={p.fin}
                        onChange={e => updatePlage(key, idx, 'fin', e.target.value)}
                        className="izi-input horaires-time"
                      />
                      {day.plages.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removePlage(key, idx)}
                          className="horaires-remove"
                          title="Supprimer cette plage"
                        >
                          <X size={14} />
                        </button>
                      )}
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() => addPlage(key)}
                    className="horaires-add"
                  >
                    <Plus size={12} /> Ajouter une plage
                  </button>
                </div>
              ) : (
                <span className="horaires-fermee">Fermé</span>
              )}
            </div>
          );
        })}
      </div>

      <style jsx>{`
        .horaires-grid {
          display: flex; flex-direction: column; gap: 6px;
        }
        .horaires-row {
          display: flex; align-items: flex-start; gap: 12px;
          padding: 10px 12px;
          border: 1px solid var(--border, #e5e0d8);
          border-radius: 8px;
          background: var(--bg-card, #fff);
          flex-wrap: wrap;
        }
        .horaires-row.closed {
          background: var(--cream, #faf8f5);
        }
        .horaires-toggle {
          display: inline-flex; align-items: center; gap: 8px;
          background: none; border: none;
          padding: 4px 0;
          cursor: pointer;
          font-family: inherit; font-size: 0.875rem;
          color: var(--text-primary);
          min-width: 110px;
          text-align: left;
        }
        .horaires-checkbox {
          width: 20px; height: 20px;
          border-radius: 4px;
          border: 1.5px solid var(--border-strong, #d0c8bc);
          display: inline-flex; align-items: center; justify-content: center;
          background: white;
          color: white;
          flex-shrink: 0;
          transition: all 0.15s ease;
        }
        .horaires-checkbox.checked {
          background: var(--brand, #b87333);
          border-color: var(--brand, #b87333);
        }
        .horaires-day {
          font-weight: 500;
        }
        .horaires-plages {
          display: flex; flex-direction: column; gap: 6px;
          flex: 1;
        }
        .horaires-plage {
          display: flex; align-items: center; gap: 6px;
        }
        .horaires-time {
          width: 110px;
          padding: 4px 8px;
          font-size: 0.8125rem;
        }
        .horaires-dash {
          color: var(--text-muted, #888);
          font-weight: 600;
        }
        .horaires-remove {
          margin-left: 4px;
          background: none; border: none;
          color: var(--text-muted, #888);
          padding: 4px; border-radius: 4px;
          cursor: pointer;
          display: inline-flex; align-items: center; justify-content: center;
        }
        .horaires-remove:hover { background: #fef2f2; color: #dc2626; }
        .horaires-add {
          display: inline-flex; align-items: center; gap: 4px;
          background: none;
          border: 1px dashed var(--border-strong, #d0c8bc);
          color: var(--text-secondary);
          padding: 4px 10px;
          border-radius: 6px;
          font-size: 0.75rem;
          cursor: pointer;
          align-self: flex-start;
          font-family: inherit;
        }
        .horaires-add:hover { border-color: var(--brand); color: var(--brand-700); }
        .horaires-fermee {
          color: var(--text-muted, #888);
          font-style: italic;
          font-size: 0.875rem;
        }
      `}</style>
    </div>
  );
}
