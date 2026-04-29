'use client';

import { useState } from 'react';

/**
 * /test-tokens — visualisation des tokens de design system.
 *
 * À utiliser pendant la refonte pour vérifier que :
 *   - les 4 palettes (rose / sauge / sable / lavande) basculent correctement
 *   - les couleurs accent / surface / ink ressortent comme prévu
 *   - les fonts (Fraunces / Inter / JetBrains Mono) sont bien chargées
 *   - les tones sémantiques (rose/sage/sand/lavender/ink) sont disponibles
 *
 * Page non-protégée pour faciliter le QA visuel.
 */

const PALETTES = ['rose', 'sauge', 'sable', 'lavande'] as const;
const TOKENS = [
  '--c-bg', '--c-bg-warm', '--c-surface', '--c-surface-2',
  '--c-ink', '--c-ink-soft', '--c-ink-muted',
  '--c-line', '--c-line-strong',
  '--c-accent', '--c-accent-deep', '--c-accent-soft', '--c-accent-tint', '--c-accent-ink',
];
const TONES = [
  { name: 'rose',     bg: 'var(--m-tone-rose)',     fg: 'var(--m-tone-rose-ink)' },
  { name: 'sage',     bg: 'var(--m-tone-sage)',     fg: 'var(--m-tone-sage-ink)' },
  { name: 'sand',     bg: 'var(--m-tone-sand)',     fg: 'var(--m-tone-sand-ink)' },
  { name: 'lavender', bg: 'var(--m-tone-lavender)', fg: 'var(--m-tone-lavender-ink)' },
  { name: 'ink',      bg: 'var(--m-tone-ink)',      fg: 'var(--m-tone-ink-text)' },
];

export default function TestTokensPage() {
  const [palette, setPalette] = useState<string>('sable');

  const switchPalette = (p: string) => {
    document.documentElement.setAttribute('data-palette', p);
    setPalette(p);
  };

  return (
    <div className="tt-page">
      <header className="tt-header">
        <h1>Design tokens — Test visual</h1>
        <p>Validation que les 4 palettes, les fonts et les tones sémantiques fonctionnent correctement.</p>
        <div className="tt-palette-switcher">
          {PALETTES.map(p => (
            <button
              key={p}
              type="button"
              onClick={() => switchPalette(p)}
              className={`tt-palette-btn ${palette === p ? 'active' : ''}`}
            >
              {p}
            </button>
          ))}
        </div>
      </header>

      {/* Typography */}
      <section className="tt-section">
        <h2 className="tt-section-h">Typographie</h2>
        <div className="tt-card">
          <div style={{ fontFamily: 'var(--font-display)', fontSize: '3rem', fontWeight: 500, fontVariationSettings: '"opsz" 144', letterSpacing: '-0.03em', lineHeight: 1 }}>
            Fraunces 144
          </div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', fontWeight: 500, fontVariationSettings: '"opsz" 60', marginTop: 16 }}>
            Fraunces 60 — h2
          </div>
          <div style={{ fontFamily: 'var(--font-body)', fontSize: '1.0625rem', marginTop: 12 }}>
            Inter Regular — body 17px. Le quick brown fox jumps over the lazy dog. Fraunces ne s'italise jamais.
          </div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.16em', marginTop: 12, color: 'var(--c-ink-muted)' }}>
            JetBrains Mono · Eyebrow · 2025
          </div>
        </div>
      </section>

      {/* Tokens couleurs */}
      <section className="tt-section">
        <h2 className="tt-section-h">Tokens couleur (palette : {palette})</h2>
        <div className="tt-grid">
          {TOKENS.map(t => (
            <div key={t} className="tt-color-card">
              <div className="tt-color-swatch" style={{ background: `var(${t})` }} />
              <code>{t}</code>
            </div>
          ))}
        </div>
      </section>

      {/* Tones sémantiques */}
      <section className="tt-section">
        <h2 className="tt-section-h">Tones sémantiques (mobile)</h2>
        <div className="tt-tones">
          {TONES.map(t => (
            <div key={t.name} className="tt-tone-card" style={{ background: t.bg, color: t.fg }}>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.25rem', fontWeight: 500 }}>{t.name}</div>
              <div style={{ fontSize: '0.8125rem', opacity: 0.8, marginTop: 4 }}>Tone surface + ink</div>
            </div>
          ))}
        </div>
      </section>

      {/* Boutons */}
      <section className="tt-section">
        <h2 className="tt-section-h">Boutons (compat shim)</h2>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
          <button className="izi-btn izi-btn-primary">Primary</button>
          <button className="izi-btn izi-btn-secondary">Secondary</button>
          <button className="izi-btn izi-btn-ghost">Ghost</button>
        </div>
      </section>

      <style jsx>{`
        .tt-page {
          background: var(--c-bg);
          color: var(--c-ink);
          font-family: var(--font-body);
          padding: 32px 24px 60px;
          min-height: 100vh;
          max-width: 1100px;
          margin: 0 auto;
        }
        .tt-header { margin-bottom: 32px; }
        .tt-header h1 {
          font-family: var(--font-display);
          font-weight: 500;
          font-size: 2.5rem;
          font-variation-settings: "opsz" 90;
          letter-spacing: -0.02em;
          margin-bottom: 8px;
        }
        .tt-header p { color: var(--c-ink-muted); font-size: 0.9375rem; margin-bottom: 16px; }

        .tt-palette-switcher { display: flex; gap: 8px; flex-wrap: wrap; }
        .tt-palette-btn {
          padding: 8px 16px;
          border: 1.5px solid var(--c-line);
          background: var(--c-surface);
          color: var(--c-ink);
          border-radius: 999px;
          cursor: pointer;
          font-size: 0.875rem; font-weight: 500;
          text-transform: capitalize;
          font-family: var(--font-body);
          transition: all 0.15s;
        }
        .tt-palette-btn.active {
          background: var(--c-accent);
          color: var(--c-accent-ink);
          border-color: var(--c-accent);
        }

        .tt-section { margin-bottom: 32px; }
        .tt-section-h {
          font-family: var(--font-display);
          font-weight: 500;
          font-size: 1.25rem;
          margin-bottom: 12px;
          color: var(--c-ink);
        }

        .tt-card {
          padding: 20px;
          border: 1px solid var(--c-line);
          background: var(--c-surface);
          border-radius: 16px;
        }

        .tt-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
          gap: 10px;
        }
        .tt-color-card {
          padding: 10px;
          border: 1px solid var(--c-line);
          border-radius: 12px;
          background: var(--c-surface);
          display: flex; align-items: center; gap: 10px;
        }
        .tt-color-swatch {
          width: 32px; height: 32px; border-radius: 8px;
          border: 1px solid var(--c-line);
          flex-shrink: 0;
        }
        .tt-color-card code {
          font-family: var(--font-mono);
          font-size: 0.7rem;
          color: var(--c-ink-soft);
        }

        .tt-tones {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
          gap: 10px;
        }
        .tt-tone-card {
          padding: 16px 18px;
          border-radius: 16px;
          text-transform: capitalize;
        }
      `}</style>
    </div>
  );
}
