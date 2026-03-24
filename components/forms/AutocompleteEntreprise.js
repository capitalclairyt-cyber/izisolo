'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Building2, Search, Loader2 } from 'lucide-react';
import { rechercherEntreprise } from '@/lib/api-france';

/**
 * Autocomplete Entreprise via API SIRENE
 * Tape un SIRET, SIREN ou nom → suggestions en temps réel → prérempli tout
 */
export default function AutocompleteEntreprise({ onSelect, placeholder = 'Nom, SIRET ou SIREN...' }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const timerRef = useRef(null);
  const wrapperRef = useRef(null);

  const search = useCallback((q) => {
    clearTimeout(timerRef.current);
    if (!q || q.trim().length < 3) { setResults([]); setOpen(false); return; }
    timerRef.current = setTimeout(async () => {
      setLoading(true);
      const data = await rechercherEntreprise(q);
      setResults(data);
      setOpen(data.length > 0);
      setLoading(false);
    }, 350);
  }, []);

  useEffect(() => {
    const handleClick = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const handleChange = (e) => {
    setQuery(e.target.value);
    search(e.target.value);
  };

  const handleSelect = (entreprise) => {
    setQuery(entreprise.nom);
    setOpen(false);
    onSelect(entreprise);
  };

  return (
    <div className="ac-entreprise-wrapper" ref={wrapperRef}>
      <label className="form-label">Rechercher une structure</label>
      <div className="ac-input-wrapper">
        <Search size={16} className="ac-icon" />
        <input
          className="izi-input ac-input"
          type="text"
          value={query}
          onChange={handleChange}
          placeholder={placeholder}
          onFocus={() => { if (results.length > 0) setOpen(true); }}
        />
        {loading && <Loader2 size={16} className="ac-spinner" />}
      </div>

      {open && results.length > 0 && (
        <div className="ac-dropdown">
          {results.map((r, i) => (
            <button
              key={`${r.siret}-${i}`}
              className="ac-item"
              onClick={() => handleSelect(r)}
              type="button"
            >
              <div className="ac-item-icon"><Building2 size={16} /></div>
              <div className="ac-item-info">
                <div className="ac-item-nom">{r.nom}</div>
                <div className="ac-item-meta">
                  {r.siret && <span>SIRET {r.siret}</span>}
                  {r.ville && <span>{r.codePostal} {r.ville}</span>}
                </div>
              </div>
            </button>
          ))}
          <div className="ac-footer">Source : API Recherche d'entreprises (data.gouv.fr)</div>
        </div>
      )}

      <style jsx global>{`
        .ac-entreprise-wrapper { position: relative; display: flex; flex-direction: column; gap: 6px; }
        .ac-input-wrapper { position: relative; display: flex; align-items: center; }
        .ac-icon { position: absolute; left: 12px; color: var(--text-muted); pointer-events: none; }
        .ac-input { padding-left: 36px !important; }
        .ac-spinner { position: absolute; right: 12px; color: var(--brand); animation: spin 1s linear infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }

        .ac-dropdown {
          position: absolute; top: 100%; left: 0; right: 0; z-index: 50;
          background: var(--bg-card); border: 1px solid var(--border);
          border-radius: var(--radius-md); box-shadow: var(--shadow-lg);
          max-height: 300px; overflow-y: auto; margin-top: 4px;
        }
        .ac-item {
          display: flex; align-items: flex-start; gap: 10px;
          width: 100%; padding: 10px 12px; border: none; background: none;
          text-align: left; cursor: pointer; transition: background var(--transition-fast);
        }
        .ac-item:hover { background: var(--brand-light); }
        .ac-item:not(:last-of-type) { border-bottom: 1px solid var(--border); }
        .ac-item-icon { width: 32px; height: 32px; border-radius: var(--radius-sm); background: var(--brand-light); color: var(--brand-700); display: flex; align-items: center; justify-content: center; flex-shrink: 0; margin-top: 2px; }
        .ac-item-info { flex: 1; min-width: 0; }
        .ac-item-nom { font-weight: 600; font-size: 0.875rem; color: var(--text-primary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .ac-item-meta { display: flex; flex-wrap: wrap; gap: 8px; font-size: 0.75rem; color: var(--text-muted); margin-top: 2px; }
        .ac-footer { padding: 6px 12px; font-size: 0.6875rem; color: var(--text-muted); text-align: center; border-top: 1px solid var(--border); }
      `}</style>
    </div>
  );
}
