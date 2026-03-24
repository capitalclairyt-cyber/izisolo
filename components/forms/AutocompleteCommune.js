'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { MapPin } from 'lucide-react';
import { rechercherCommune } from '@/lib/api-france';

/**
 * Autocomplete Ville + Code Postal
 * Commence à taper le CP ou la ville → suggestions en temps réel
 */
export default function AutocompleteCommune({ codePostal, ville, onSelect, className = '' }) {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [open, setOpen] = useState(false);
  const [focused, setFocused] = useState(null); // 'cp' | 'ville'
  const timerRef = useRef(null);
  const wrapperRef = useRef(null);

  // Debounced search
  const search = useCallback((q) => {
    clearTimeout(timerRef.current);
    if (!q || q.length < 2) { setSuggestions([]); setOpen(false); return; }
    timerRef.current = setTimeout(async () => {
      const results = await rechercherCommune(q);
      setSuggestions(results);
      setOpen(results.length > 0);
    }, 250);
  }, []);

  // Close on click outside
  useEffect(() => {
    const handleClick = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const handleCPChange = (e) => {
    const v = e.target.value.replace(/\D/g, '').slice(0, 5);
    onSelect({ codePostal: v, ville });
    search(v);
    setFocused('cp');
  };

  const handleVilleChange = (e) => {
    onSelect({ codePostal, ville: e.target.value });
    search(e.target.value);
    setFocused('ville');
  };

  const handleSelect = (s) => {
    onSelect({ codePostal: s.codePostal, ville: s.nom });
    setOpen(false);
  };

  return (
    <div className={`ac-commune-wrapper ${className}`} ref={wrapperRef}>
      <div className="ac-commune-inputs">
        <div className="ac-commune-field cp">
          <label className="form-label">Code postal</label>
          <input
            className="izi-input"
            type="text"
            inputMode="numeric"
            maxLength={5}
            value={codePostal || ''}
            onChange={handleCPChange}
            onFocus={() => { setFocused('cp'); if (codePostal && codePostal.length >= 2) search(codePostal); }}
            placeholder="75001"
          />
        </div>
        <div className="ac-commune-field ville">
          <label className="form-label">Ville</label>
          <input
            className="izi-input"
            type="text"
            value={ville || ''}
            onChange={handleVilleChange}
            onFocus={() => { setFocused('ville'); if (ville && ville.length >= 2) search(ville); }}
            placeholder="Paris"
          />
        </div>
      </div>

      {open && suggestions.length > 0 && (
        <div className="ac-commune-dropdown">
          {suggestions.map((s, i) => (
            <button
              key={`${s.codePostal}-${s.nom}-${i}`}
              className="ac-commune-item"
              onClick={() => handleSelect(s)}
              type="button"
            >
              <MapPin size={14} />
              <span className="ac-cp">{s.codePostal}</span>
              <span className="ac-nom">{s.nom}</span>
              {s.departement && <span className="ac-dept">({s.departement})</span>}
            </button>
          ))}
        </div>
      )}

      <style jsx global>{`
        .ac-commune-wrapper { position: relative; }
        .ac-commune-inputs { display: grid; grid-template-columns: 120px 1fr; gap: 8px; }
        .ac-commune-field { display: flex; flex-direction: column; gap: 6px; }
        .ac-commune-dropdown {
          position: absolute; top: 100%; left: 0; right: 0; z-index: 50;
          background: var(--bg-card); border: 1px solid var(--border);
          border-radius: var(--radius-md); box-shadow: var(--shadow-lg);
          max-height: 220px; overflow-y: auto; margin-top: 4px;
        }
        .ac-commune-item {
          display: flex; align-items: center; gap: 8px;
          width: 100%; padding: 10px 12px; border: none; background: none;
          text-align: left; cursor: pointer; font-size: 0.875rem;
          color: var(--text-primary); transition: background var(--transition-fast);
        }
        .ac-commune-item:hover { background: var(--brand-light); }
        .ac-commune-item:not(:last-child) { border-bottom: 1px solid var(--border); }
        .ac-cp { font-weight: 700; color: var(--brand-700); min-width: 48px; }
        .ac-nom { font-weight: 500; }
        .ac-dept { font-size: 0.75rem; color: var(--text-muted); }
      `}</style>
    </div>
  );
}
