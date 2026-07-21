'use client';

/**
 * Sélecteur d'heure en DEUX selects (heure + minute) au lieu d'un
 * <input type="time">. Motif : sur certains Android le bouton « Définir » du
 * sélecteur natif est coupé et l'heure ne peut pas être validée (feedback #17).
 * Les selects sont toujours entièrement visibles, sur tous les appareils.
 *
 * @param {string} value   - "HH:MM"
 * @param {(v:string)=>void} onChange - reçoit la nouvelle valeur "HH:MM"
 */
const MINUTES = ['00', '05', '10', '15', '20', '25', '30', '35', '40', '45', '50', '55'];
const HEURES = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'));

export default function HeureSelect({ value, onChange, className = '' }) {
  const [hh, mm] = (value || '18:00').split(':');
  return (
    <div className={`heure-selects ${className}`}>
      <select
        className="izi-input"
        aria-label="Heure"
        value={hh}
        onChange={e => onChange(`${e.target.value}:${mm}`)}
      >
        {HEURES.map(h => <option key={h} value={h}>{h}h</option>)}
      </select>
      <span className="heure-sep">:</span>
      <select
        className="izi-input"
        aria-label="Minutes"
        value={MINUTES.includes(mm) ? mm : '00'}
        onChange={e => onChange(`${hh}:${e.target.value}`)}
      >
        {MINUTES.map(m => <option key={m} value={m}>{m}</option>)}
      </select>

      <style jsx>{`
        .heure-selects { display: flex; align-items: center; gap: 6px; }
        .heure-selects select { flex: 1; min-width: 0; text-align: center; }
        .heure-sep { font-weight: 700; color: var(--text-muted); }
      `}</style>
    </div>
  );
}
