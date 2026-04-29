'use client';

/**
 * CalendarBuilder — composant partagé pour les sondages "Planning idéal".
 *
 * Modes :
 *   - 'edit' : le pro click pour ajouter/supprimer/éditer des créneaux
 *   - 'vote' : l'élève voit les créneaux, click pour cycler oui/peut-être/non
 *   - 'results' : affichage read-only avec heatmap des votes
 *
 * Grille : 7 jours × tranches 30min entre 06h00 et 23h00 (34 lignes).
 * Mobile : scroll horizontal naturel.
 */

import { useState, useMemo } from 'react';
import { X, Plus, Edit3, Check } from 'lucide-react';

const JOURS = [
  { value: 1, short: 'Lun', long: 'Lundi' },
  { value: 2, short: 'Mar', long: 'Mardi' },
  { value: 3, short: 'Mer', long: 'Mercredi' },
  { value: 4, short: 'Jeu', long: 'Jeudi' },
  { value: 5, short: 'Ven', long: 'Vendredi' },
  { value: 6, short: 'Sam', long: 'Samedi' },
  { value: 7, short: 'Dim', long: 'Dimanche' },
];

const SLOT_MINUTES = 30;
const HEURE_DEBUT = 6;   // 6h00
const HEURE_FIN   = 23;  // 23h00 (exclu)
const SLOT_HEIGHT = 22;  // px par slot 30min

function timeToMinutes(timeStr) {
  if (!timeStr) return 0;
  const [h, m] = timeStr.split(':').map(Number);
  return h * 60 + (m || 0);
}

function minutesToTime(min) {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function generateSlots() {
  const slots = [];
  for (let h = HEURE_DEBUT; h < HEURE_FIN; h++) {
    slots.push({ minute: h * 60, label: `${String(h).padStart(2, '0')}:00`, hour: true });
    slots.push({ minute: h * 60 + 30, label: `${String(h).padStart(2, '0')}:30`, hour: false });
  }
  return slots;
}

const SLOTS = generateSlots();

export default function CalendarBuilder({
  mode = 'edit',                          // 'edit' | 'vote' | 'results'
  creneaux = [],                          // [{ id, type_cours, jour_semaine, heure, duree_minutes }]
  onAdd = null,                           // (creneau) => void  (mode 'edit')
  onUpdate = null,                        // (id, fields) => void
  onRemove = null,                        // (id) => void
  votes = {},                             // { creneauId: 'oui'|'peut_etre'|'non' }  (mode 'vote')
  onVote = null,                          // (creneauId, valeur) => void
  resultsByCreneau = {},                  // { creneauId: { oui, peutEtre, non, score } }  (mode 'results')
  defaultType = '',                       // type pré-rempli au click
  typesCoursList = [],                    // datalist de suggestions
}) {
  const [editingId, setEditingId] = useState(null);

  // Index : pour chaque (jour, slotIndex), liste des créneaux qui démarrent ici
  const indexByJourSlot = useMemo(() => {
    const idx = {};
    creneaux.forEach(c => {
      const startMin = timeToMinutes(c.heure?.slice(0, 5)) - HEURE_DEBUT * 60;
      const slotIdx = Math.floor(startMin / SLOT_MINUTES);
      const key = `${c.jour_semaine}-${slotIdx}`;
      if (!idx[key]) idx[key] = [];
      idx[key].push(c);
    });
    return idx;
  }, [creneaux]);

  // Vérifie si un créneau couvre un slot donné (pour griser les cellules occupées)
  const occupiedKeys = useMemo(() => {
    const occ = new Set();
    creneaux.forEach(c => {
      const startMin = timeToMinutes(c.heure?.slice(0, 5)) - HEURE_DEBUT * 60;
      const startSlot = Math.floor(startMin / SLOT_MINUTES);
      const nbSlots = Math.max(1, Math.ceil((c.duree_minutes || 60) / SLOT_MINUTES));
      for (let i = 0; i < nbSlots; i++) {
        occ.add(`${c.jour_semaine}-${startSlot + i}`);
      }
    });
    return occ;
  }, [creneaux]);

  const handleCellClick = (jour, slotIdx) => {
    if (mode !== 'edit' || !onAdd) return;
    const startMin = HEURE_DEBUT * 60 + slotIdx * SLOT_MINUTES;
    if (occupiedKeys.has(`${jour}-${slotIdx}`)) return; // cellule occupée
    onAdd({
      type_cours: defaultType || (typesCoursList[0] || 'Cours'),
      jour_semaine: jour,
      heure: minutesToTime(startMin),
      duree_minutes: 60,
    });
  };

  const cycleVote = (creneauId) => {
    if (mode !== 'vote' || !onVote) return;
    const current = votes[creneauId];
    const next = current === 'oui' ? 'peut_etre'
              : current === 'peut_etre' ? 'non'
              : current === 'non' ? null
              : 'oui';
    onVote(creneauId, next);
  };

  // Couleur de fond du créneau selon mode
  const getCreneauStyle = (c) => {
    if (mode === 'vote') {
      const v = votes[c.id];
      if (v === 'oui')      return { background: '#16a34a', color: 'white', borderColor: '#15803d' };
      if (v === 'peut_etre') return { background: '#f59e0b', color: 'white', borderColor: '#d97706' };
      if (v === 'non')       return { background: '#dc2626', color: 'white', borderColor: '#b91c1c' };
      return { background: 'var(--brand-light)', color: 'var(--brand-700)', borderColor: 'var(--brand-200, #f0d0d0)' };
    }
    if (mode === 'results') {
      const r = resultsByCreneau[c.id];
      const intensity = r?.score || 0;
      const max = Math.max(1, ...Object.values(resultsByCreneau).map(x => x?.score || 0));
      const opacity = 0.25 + (intensity / max) * 0.7;
      return {
        background: `rgba(212, 160, 160, ${opacity})`,
        color: opacity > 0.6 ? 'white' : 'var(--brand-700)',
        borderColor: 'var(--brand)',
      };
    }
    // edit
    return { background: 'var(--brand)', color: 'white', borderColor: 'var(--brand-dark, var(--brand))' };
  };

  return (
    <div className="cb-wrap">
      <div className="cb-scroll">
        <div className="cb-grid">
          {/* Colonne heures */}
          <div className="cb-hours">
            <div className="cb-corner" />
            {SLOTS.map((s, i) => (
              <div key={i} className={`cb-hour-cell ${s.hour ? 'hour-major' : ''}`}>
                {s.hour && <span>{s.label}</span>}
              </div>
            ))}
          </div>

          {/* Colonnes jours */}
          {JOURS.map(j => (
            <div key={j.value} className="cb-day-col">
              <div className="cb-day-header">
                <div className="cb-day-short">{j.short}</div>
              </div>
              <div className="cb-day-body">
                {/* Cellules vides cliquables */}
                {SLOTS.map((s, i) => {
                  const occupied = occupiedKeys.has(`${j.value}-${i}`);
                  const startsHere = indexByJourSlot[`${j.value}-${i}`];
                  return (
                    <div
                      key={i}
                      className={`cb-cell ${s.hour ? 'hour-major' : ''} ${occupied ? 'occupied' : ''} ${mode === 'edit' && !occupied ? 'clickable' : ''}`}
                      onClick={() => handleCellClick(j.value, i)}
                      role={mode === 'edit' && !occupied ? 'button' : undefined}
                      aria-label={mode === 'edit' && !occupied ? `Ajouter un créneau ${j.long} ${s.label}` : undefined}
                    >
                      {mode === 'edit' && !occupied && <span className="cb-add-hint"><Plus size={10} /></span>}
                    </div>
                  );
                })}

                {/* Créneaux placés en absolu */}
                {creneaux.filter(c => c.jour_semaine === j.value).map(c => {
                  const startMin = timeToMinutes(c.heure?.slice(0, 5)) - HEURE_DEBUT * 60;
                  const startSlot = Math.floor(startMin / SLOT_MINUTES);
                  const nbSlots = Math.max(1, Math.ceil((c.duree_minutes || 60) / SLOT_MINUTES));
                  const top = startSlot * SLOT_HEIGHT;
                  const height = nbSlots * SLOT_HEIGHT - 2;
                  const style = getCreneauStyle(c);
                  const isEditing = editingId === c.id;
                  const result = mode === 'results' ? resultsByCreneau[c.id] : null;

                  return (
                    <div
                      key={c.id || `${c.jour_semaine}-${c.heure}`}
                      className={`cb-creneau cb-mode-${mode}`}
                      style={{ top, height, ...style }}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (mode === 'vote') cycleVote(c.id);
                      }}
                    >
                      {mode === 'edit' && isEditing ? (
                        <CreneauEditor
                          creneau={c}
                          typesCoursList={typesCoursList}
                          onSave={(fields) => { onUpdate?.(c.id, fields); setEditingId(null); }}
                          onCancel={() => setEditingId(null)}
                          onRemove={() => { onRemove?.(c.id); setEditingId(null); }}
                        />
                      ) : (
                        <>
                          <div className="cb-cr-titre">
                            {c.heure?.slice(0, 5)} · {c.type_cours}
                          </div>
                          {height >= 40 && (
                            <div className="cb-cr-meta">
                              {c.duree_minutes}min
                            </div>
                          )}
                          {mode === 'results' && result && (
                            <div className="cb-cr-stats">
                              <strong>{result.score} pts</strong>
                              <span>{result.oui}/{result.peutEtre}/{result.non}</span>
                            </div>
                          )}
                          {mode === 'vote' && votes[c.id] && (
                            <div className="cb-cr-vote-badge">
                              {votes[c.id] === 'oui' && '✓ Oui'}
                              {votes[c.id] === 'peut_etre' && '? Peut-être'}
                              {votes[c.id] === 'non' && '✕ Non'}
                            </div>
                          )}
                          {mode === 'edit' && (
                            <div className="cb-cr-actions">
                              <button
                                type="button"
                                className="cb-cr-btn"
                                onClick={(e) => { e.stopPropagation(); setEditingId(c.id); }}
                                aria-label="Modifier"
                              >
                                <Edit3 size={11} />
                              </button>
                              <button
                                type="button"
                                className="cb-cr-btn danger"
                                onClick={(e) => { e.stopPropagation(); onRemove?.(c.id); }}
                                aria-label="Supprimer"
                              >
                                <X size={12} />
                              </button>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      {mode === 'edit' && (
        <p className="cb-hint">
          <Plus size={11} /> Clique sur une case vide pour ajouter un créneau (durée par défaut 1h).
        </p>
      )}
      {mode === 'vote' && (
        <p className="cb-hint">
          Clique sur un créneau pour cycler entre <strong style={{ color: '#16a34a' }}>Oui</strong> →{' '}
          <strong style={{ color: '#d97706' }}>Peut-être</strong> →{' '}
          <strong style={{ color: '#dc2626' }}>Non</strong> → vide
        </p>
      )}

      <style jsx global>{`
        .cb-wrap { display: flex; flex-direction: column; gap: 8px; }
        .cb-scroll {
          overflow-x: auto;
          border: 1px solid var(--border);
          border-radius: 12px;
          background: var(--bg-card);
          -webkit-overflow-scrolling: touch;
        }
        .cb-grid {
          display: grid;
          grid-template-columns: 60px repeat(7, minmax(80px, 1fr));
          min-width: 600px;
        }
        .cb-hours { display: flex; flex-direction: column; }
        .cb-corner { height: 36px; border-bottom: 1px solid var(--border); border-right: 1px solid var(--border); background: var(--bg-soft, #faf8f5); }
        .cb-hour-cell {
          height: ${SLOT_HEIGHT}px;
          border-right: 1px solid var(--border);
          border-bottom: 1px dashed transparent;
          display: flex; align-items: flex-start; justify-content: flex-end;
          padding: 1px 6px;
          font-size: 0.65rem;
          color: var(--text-muted);
          background: var(--bg-soft, #faf8f5);
        }
        .cb-hour-cell.hour-major { border-bottom-color: var(--border); font-weight: 600; }

        .cb-day-col { display: flex; flex-direction: column; border-right: 1px solid var(--border); }
        .cb-day-col:last-child { border-right: none; }

        .cb-day-header {
          height: 36px; padding: 6px 4px;
          display: flex; align-items: center; justify-content: center;
          background: var(--bg-soft, #faf8f5);
          border-bottom: 1px solid var(--border);
        }
        .cb-day-short {
          font-size: 0.75rem; font-weight: 700; color: var(--text-secondary);
          text-transform: uppercase; letter-spacing: 0.04em;
        }

        .cb-day-body { position: relative; }
        .cb-cell {
          height: ${SLOT_HEIGHT}px;
          border-bottom: 1px dashed transparent;
          position: relative;
          transition: background 0.1s;
        }
        .cb-cell.hour-major { border-bottom: 1px solid var(--border); }
        .cb-cell.clickable { cursor: pointer; }
        .cb-cell.clickable:hover { background: var(--brand-light); }
        .cb-cell.occupied { pointer-events: none; }
        .cb-add-hint {
          position: absolute; inset: 0;
          display: flex; align-items: center; justify-content: center;
          color: var(--brand); opacity: 0;
          transition: opacity 0.15s;
        }
        .cb-cell.clickable:hover .cb-add-hint { opacity: 1; }

        /* Créneau positionné en absolu */
        .cb-creneau {
          position: absolute;
          left: 2px; right: 2px;
          border: 1.5px solid;
          border-radius: 6px;
          padding: 3px 5px;
          font-size: 0.6875rem;
          font-weight: 600;
          overflow: hidden;
          z-index: 2;
          transition: transform 0.1s, box-shadow 0.15s;
        }
        .cb-creneau.cb-mode-vote { cursor: pointer; }
        .cb-creneau.cb-mode-vote:hover { transform: scale(1.02); box-shadow: 0 2px 8px rgba(0,0,0,0.12); }
        .cb-creneau.cb-mode-edit { padding-right: 36px; }

        .cb-cr-titre {
          font-weight: 700; line-height: 1.15;
          white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
        }
        .cb-cr-meta {
          font-size: 0.625rem; opacity: 0.85; margin-top: 1px;
        }
        .cb-cr-stats {
          display: flex; align-items: center; gap: 4px;
          font-size: 0.625rem; margin-top: 2px;
        }
        .cb-cr-stats strong { font-size: 0.75rem; }
        .cb-cr-vote-badge {
          font-size: 0.625rem; opacity: 0.95; margin-top: 1px;
        }
        .cb-cr-actions {
          position: absolute; top: 2px; right: 2px;
          display: flex; gap: 2px;
        }
        .cb-cr-btn {
          width: 18px; height: 18px; border-radius: 4px;
          border: none; cursor: pointer;
          background: rgba(255,255,255,0.85); color: var(--text-secondary);
          display: flex; align-items: center; justify-content: center;
          padding: 0;
        }
        .cb-cr-btn:hover { background: white; color: var(--text-primary); }
        .cb-cr-btn.danger:hover { color: #dc2626; }

        .cb-hint {
          font-size: 0.7rem; color: var(--text-muted);
          display: flex; align-items: center; gap: 4px;
          margin-top: 2px;
        }

        @media (max-width: 600px) {
          .cb-cr-titre { font-size: 0.625rem; }
        }
      `}</style>
    </div>
  );
}

// ─── Mini éditeur popup pour modifier un créneau ────────────────────────────
function CreneauEditor({ creneau, typesCoursList, onSave, onCancel, onRemove }) {
  const [type, setType] = useState(creneau.type_cours || '');
  const [duree, setDuree] = useState(creneau.duree_minutes || 60);

  return (
    <div className="cb-editor" onClick={(e) => e.stopPropagation()}>
      <input
        list="cb-types-list"
        value={type}
        onChange={(e) => setType(e.target.value)}
        placeholder="Type de cours"
        className="cb-edit-input"
        autoFocus
      />
      <datalist id="cb-types-list">
        {typesCoursList.map(t => <option key={t} value={t} />)}
      </datalist>
      <div className="cb-edit-row">
        <input
          type="number"
          min="15" max="240" step="15"
          value={duree}
          onChange={(e) => setDuree(parseInt(e.target.value) || 60)}
          className="cb-edit-input cb-edit-duree"
          aria-label="Durée"
        />
        <span className="cb-edit-suffix">min</span>
        <button type="button" className="cb-edit-ok" onClick={() => onSave({ type_cours: type, duree_minutes: parseInt(duree) || 60 })}>
          <Check size={11} />
        </button>
      </div>
      <style jsx>{`
        .cb-editor {
          background: white; color: var(--text-primary);
          padding: 4px 6px; border-radius: 4px;
          display: flex; flex-direction: column; gap: 4px;
          height: 100%;
        }
        .cb-edit-input {
          font-size: 0.6875rem; font-weight: 500;
          padding: 2px 6px; border: 1px solid var(--border);
          border-radius: 4px; width: 100%;
          color: var(--text-primary); background: white;
        }
        .cb-edit-row { display: flex; align-items: center; gap: 4px; }
        .cb-edit-duree { width: 50px; }
        .cb-edit-suffix { font-size: 0.625rem; color: var(--text-muted); }
        .cb-edit-ok {
          margin-left: auto; width: 22px; height: 22px;
          border: none; border-radius: 4px;
          background: var(--brand); color: white;
          cursor: pointer;
          display: flex; align-items: center; justify-content: center;
        }
      `}</style>
    </div>
  );
}
