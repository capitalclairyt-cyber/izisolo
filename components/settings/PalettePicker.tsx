'use client';

import { useState, useEffect } from 'react';
import { Check, Loader2 } from 'lucide-react';

type Palette = 'rose' | 'sauge' | 'sable' | 'lavande';

const PALETTES: Array<{ value: Palette; label: string; desc: string; swatches: string[] }> = [
  { value: 'rose',    label: 'Rose',    desc: 'Terracotta + crème — chaleureux, signature historique IziSolo',
    swatches: ['oklch(0.985 0.008 60)', 'oklch(0.65 0.10 25)', 'oklch(0.93 0.04 25)', 'oklch(0.24 0.022 30)'] },
  { value: 'sauge',   label: 'Sauge',   desc: 'Vert doux — apaisant, idéal yoga et méditation',
    swatches: ['oklch(0.985 0.008 130)', 'oklch(0.6 0.07 145)', 'oklch(0.92 0.035 140)', 'oklch(0.24 0.022 150)'] },
  { value: 'sable',   label: 'Sable',   desc: 'Beige doré — neutre warm, parfait pour praticien·nes',
    swatches: ['oklch(0.985 0.012 80)', 'oklch(0.62 0.09 65)', 'oklch(0.93 0.03 75)', 'oklch(0.25 0.02 70)'] },
  { value: 'lavande', label: 'Lavande', desc: 'Violet pâle — créatif, danse, art-thérapie',
    swatches: ['oklch(0.985 0.008 300)', 'oklch(0.6 0.08 295)', 'oklch(0.92 0.035 295)', 'oklch(0.25 0.02 295)'] },
];

interface PalettePickerProps {
  initial?: Palette;
}

export default function PalettePicker({ initial = 'sable' }: PalettePickerProps) {
  const [active, setActive] = useState<Palette>(initial);
  const [saving, setSaving] = useState<Palette | null>(null);
  const [error, setError]   = useState<string | null>(null);

  // Au mount, lire la palette depuis le cookie / data-palette du <html>
  useEffect(() => {
    if (typeof document !== 'undefined') {
      const current = document.documentElement.getAttribute('data-palette') as Palette | null;
      if (current && ['rose', 'sauge', 'sable', 'lavande'].includes(current)) {
        setActive(current);
      }
    }
  }, []);

  const choose = async (p: Palette) => {
    if (p === active) return;
    setError(null);
    setSaving(p);

    // Application immédiate côté client (instant feedback)
    document.documentElement.setAttribute('data-palette', p);

    try {
      const res = await fetch('/api/profile/palette', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ palette: p }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Erreur');
      setActive(p);
    } catch (err: any) {
      setError(err.message);
      // Rollback visuel
      document.documentElement.setAttribute('data-palette', active);
    } finally {
      setSaving(null);
    }
  };

  return (
    <div className="palette-picker">
      <div className="palette-grid">
        {PALETTES.map(p => {
          const isActive = active === p.value;
          const isSaving = saving === p.value;
          return (
            <button
              key={p.value}
              type="button"
              onClick={() => choose(p.value)}
              className={`palette-card ${isActive ? 'active' : ''}`}
              disabled={isSaving || saving !== null}
              aria-pressed={isActive}
            >
              <div className="palette-swatches" aria-hidden>
                {p.swatches.map((c, i) => (
                  <div key={i} className="palette-swatch" style={{ background: c }} />
                ))}
              </div>
              <div className="palette-info">
                <div className="palette-label">
                  {p.label}
                  {isSaving && <Loader2 size={12} className="spin" />}
                  {isActive && !isSaving && <Check size={14} />}
                </div>
                <div className="palette-desc">{p.desc}</div>
              </div>
            </button>
          );
        })}
      </div>

      {error && <div className="palette-error">{error}</div>}

      <p className="palette-hint">
        Le changement s'applique immédiatement et sera mémorisé pour ta prochaine connexion.
      </p>

      <style jsx>{`
        .palette-picker {
          display: flex; flex-direction: column; gap: 12px;
        }
        .palette-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 10px;
        }
        @media (min-width: 768px) {
          .palette-grid { grid-template-columns: repeat(4, 1fr); }
        }

        .palette-card {
          display: flex; flex-direction: column; gap: 8px;
          padding: 12px;
          border: 1.5px solid var(--c-line);
          border-radius: var(--r-md);
          background: var(--c-surface);
          cursor: pointer; text-align: left;
          transition: all var(--t-fast) var(--ease);
        }
        .palette-card:hover:not(:disabled) {
          border-color: var(--c-line-strong);
          transform: translateY(-1px);
          box-shadow: var(--shadow-sm);
        }
        .palette-card.active {
          border-color: var(--c-accent);
          box-shadow: 0 0 0 3px var(--c-accent-soft);
        }
        .palette-card:disabled { opacity: 0.6; cursor: wait; }

        .palette-swatches {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 3px;
          height: 32px;
          border-radius: var(--r-sm);
          overflow: hidden;
        }
        .palette-swatch { width: 100%; height: 100%; }

        .palette-info { display: flex; flex-direction: column; gap: 4px; }
        .palette-label {
          display: inline-flex; align-items: center; gap: 6px;
          font-family: var(--font-display);
          font-size: 1rem; font-weight: 500;
          color: var(--c-ink);
        }
        .palette-desc {
          font-size: 0.75rem; line-height: 1.4;
          color: var(--c-ink-muted);
        }

        .palette-error {
          padding: 8px 12px;
          background: oklch(0.95 0.05 25 / 0.5);
          border: 1px solid oklch(0.7 0.13 25);
          border-radius: var(--r-sm);
          color: oklch(0.45 0.15 25);
          font-size: 0.8125rem;
        }

        .palette-hint {
          font-size: 0.75rem; color: var(--c-ink-muted); line-height: 1.4;
        }

        .spin { animation: pp-spin 0.8s linear infinite; }
        @keyframes pp-spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
