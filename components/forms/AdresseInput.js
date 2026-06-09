'use client';

import { useState, useEffect, useRef } from 'react';
import { MapPin, Navigation, Loader2 } from 'lucide-react';

/**
 * Champ adresse structuré : rue + code postal (autocomplete) + ville.
 *
 * Stockage : "rue\nCODE_POSTAL ville" (compatible avec l'existant TEXT).
 * API : geo.api.gouv.fr (gratuite, pas de clé).
 */

function parseAdresse(raw) {
  if (!raw) return { rue: '', codePostal: '', ville: '' };
  const lines = raw.split('\n').map(l => l.trim()).filter(Boolean);
  if (lines.length === 0) return { rue: '', codePostal: '', ville: '' };
  if (lines.length === 1) {
    const match = lines[0].match(/^(\d{5})\s+(.+)$/);
    if (match) return { rue: '', codePostal: match[1], ville: match[2] };
    return { rue: lines[0], codePostal: '', ville: '' };
  }
  const last = lines[lines.length - 1];
  const match = last.match(/^(\d{5})\s+(.+)$/);
  if (match) {
    return { rue: lines.slice(0, -1).join('\n'), codePostal: match[1], ville: match[2] };
  }
  return { rue: raw, codePostal: '', ville: '' };
}

function formatAdresse(rue, codePostal, ville) {
  const parts = [];
  if (rue.trim()) parts.push(rue.trim());
  const cpVille = [codePostal.trim(), ville.trim()].filter(Boolean).join(' ');
  if (cpVille) parts.push(cpVille);
  return parts.join('\n') || null;
}

export default function AdresseInput({ value, onChange, id }) {
  const parsed = parseAdresse(value);
  const [rue, setRue] = useState(parsed.rue);
  const [codePostal, setCodePostal] = useState(parsed.codePostal);
  const [ville, setVille] = useState(parsed.ville);
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const debounceRef = useRef(null);
  const wrapRef = useRef(null);
  // Dernière valeur émise par CE composant. Sert à distinguer un changement
  // de `value` venant de l'extérieur (reset après création, chargement d'une
  // fiche en édition) d'un simple écho de notre propre onChange.
  const lastEmittedRef = useRef(value);

  useEffect(() => {
    const handler = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setShowSuggestions(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Resynchronise l'état interne quand `value` change DE L'EXTÉRIEUR.
  // Sans ça : l'adresse d'une fiche en édition ne s'affiche pas, et le champ
  // garde l'adresse de la cliente précédente après un reset (fuite de données).
  // La comparaison à lastEmittedRef évite la boucle infinie avec onChange.
  useEffect(() => {
    if (value !== lastEmittedRef.current) {
      const p = parseAdresse(value);
      setRue(p.rue);
      setCodePostal(p.codePostal);
      setVille(p.ville);
      lastEmittedRef.current = value;
    }
  }, [value]);

  const emit = (r, cp, v) => {
    const formatted = formatAdresse(r, cp, v);
    lastEmittedRef.current = formatted;
    onChange(formatted);
  };

  const handleRueChange = (val) => {
    setRue(val);
    emit(val, codePostal, ville);
  };

  const handleCpChange = (val) => {
    const clean = val.replace(/\D/g, '').slice(0, 5);
    setCodePostal(clean);
    emit(rue, clean, ville);

    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (clean.length === 5) {
      setLoading(true);
      debounceRef.current = setTimeout(async () => {
        try {
          const res = await fetch(`https://geo.api.gouv.fr/communes?codePostal=${clean}&fields=nom&limit=20`);
          if (!res.ok) throw new Error();
          const data = await res.json();
          const noms = data.map(c => c.nom).sort();
          setSuggestions(noms);
          setShowSuggestions(true);
          if (noms.length === 1) {
            setVille(noms[0]);
            emit(rue, clean, noms[0]);
            setShowSuggestions(false);
          }
        } catch {
          setSuggestions([]);
        } finally {
          setLoading(false);
        }
      }, 200);
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  };

  const selectVille = (nom) => {
    setVille(nom);
    setShowSuggestions(false);
    emit(rue, codePostal, nom);
  };

  const handleVilleChange = (val) => {
    setVille(val);
    emit(rue, codePostal, val);
  };

  return (
    <div className="adresse-input" ref={wrapRef}>
      <input
        id={id}
        className="izi-input"
        type="text"
        value={rue}
        onChange={e => handleRueChange(e.target.value)}
        placeholder="N° et rue"
      />
      <div className="adresse-cp-row">
        <div className="adresse-cp-wrap">
          <input
            className="izi-input adresse-cp"
            type="text"
            inputMode="numeric"
            value={codePostal}
            onChange={e => handleCpChange(e.target.value)}
            placeholder="Code postal"
            maxLength={5}
          />
          {loading && <Loader2 size={14} className="adresse-cp-spinner" />}
        </div>
        <input
          className="izi-input adresse-ville"
          type="text"
          value={ville}
          onChange={e => handleVilleChange(e.target.value)}
          placeholder="Ville"
        />
      </div>
      {showSuggestions && suggestions.length > 1 && (
        <div className="adresse-suggestions">
          {suggestions.map(s => (
            <button
              key={s}
              type="button"
              className={`adresse-suggestion ${s === ville ? 'active' : ''}`}
              onClick={() => selectVille(s)}
            >
              <MapPin size={12} /> {s}
            </button>
          ))}
        </div>
      )}

      <style jsx>{`
        .adresse-input { display: flex; flex-direction: column; gap: 8px; position: relative; }
        .adresse-cp-row { display: flex; gap: 8px; }
        .adresse-cp-wrap { position: relative; flex-shrink: 0; width: 120px; }
        .adresse-cp { width: 100%; font-variant-numeric: tabular-nums; letter-spacing: 0.05em; }
        .adresse-cp-spinner {
          position: absolute; right: 10px; top: 50%; transform: translateY(-50%);
          color: var(--brand); animation: spin 0.8s linear infinite;
        }
        @keyframes spin { to { transform: translateY(-50%) rotate(360deg); } }
        .adresse-ville { flex: 1; }
        .adresse-suggestions {
          position: absolute; top: 100%; left: 0; right: 0; z-index: 50;
          background: var(--bg-card, white); border: 1px solid var(--border);
          border-radius: var(--radius-sm); box-shadow: 0 4px 16px rgba(0,0,0,0.1);
          max-height: 180px; overflow-y: auto;
          display: flex; flex-direction: column;
          margin-top: 4px;
        }
        .adresse-suggestion {
          display: flex; align-items: center; gap: 6px;
          padding: 8px 12px; border: none; background: none;
          text-align: left; cursor: pointer; font-size: 0.875rem;
          font-family: inherit; color: var(--text-primary);
          transition: background 0.1s;
        }
        .adresse-suggestion:hover { background: var(--brand-light, #f5f0eb); }
        .adresse-suggestion.active { background: var(--brand-light); font-weight: 600; }
      `}</style>
    </div>
  );
}

export function AdresseDisplay({ value }) {
  if (!value) return null;
  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(value.replace(/\n/g, ', '))}`;

  return (
    <div className="adresse-display">
      <div className="adresse-display-text">
        {value.split('\n').map((line, i) => (
          <span key={i}>{line}{i < value.split('\n').length - 1 && <br />}</span>
        ))}
      </div>
      <a
        href={mapsUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="adresse-maps-btn"
        title="Voir sur Google Maps"
      >
        <Navigation size={13} /> Maps
      </a>

      <style jsx>{`
        .adresse-display {
          display: flex; align-items: flex-start; gap: 8px;
        }
        .adresse-display-text {
          flex: 1; font-size: 0.8125rem; color: var(--text-primary); line-height: 1.45;
        }
        .adresse-maps-btn {
          display: inline-flex; align-items: center; gap: 4px; flex-shrink: 0;
          padding: 4px 10px; border-radius: var(--radius-full);
          background: #e8f5e9; color: #2e7d32; border: 1px solid #a5d6a7;
          font-size: 0.6875rem; font-weight: 600;
          text-decoration: none; white-space: nowrap;
          transition: all 0.15s;
        }
        .adresse-maps-btn:hover { background: #4caf50; color: white; border-color: #4caf50; }
      `}</style>
    </div>
  );
}
