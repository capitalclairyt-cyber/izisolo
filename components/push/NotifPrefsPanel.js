'use client';

import { useState } from 'react';
import { Loader2, Check, Mail, Bell, Smartphone } from 'lucide-react';
import { NOTIF_TYPES_ELEVE, NOTIF_TYPES_PROF, effectivePrefs } from '@/lib/notif-prefs';

/**
 * NotifPrefsPanel — grille propre à 3 colonnes : Appli (cloche) · Push · Mail.
 * Une ligne par notif, une case par canal. Case active = toggle réel ; « — »
 * quand le canal n'existe pas (encore) pour cette notif (jamais de faux toggle).
 * audience 'eleve' | 'prof'. Sauvegarde déléguée au parent via onSave(prefs).
 */
const COLS = [
  { ch: 'inapp', label: 'Appli', Icon: Bell },
  { ch: 'push',  label: 'Push',  Icon: Smartphone },
  { ch: 'email', label: 'Mail',  Icon: Mail },
];

export default function NotifPrefsPanel({ audience = 'eleve', initialPrefs = {}, onSave }) {
  const catalog = audience === 'prof' ? NOTIF_TYPES_PROF : NOTIF_TYPES_ELEVE;
  const [prefs, setPrefs] = useState(() => effectivePrefs(initialPrefs, audience));
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const toggle = async (key, channel) => {
    const cur = prefs[key] || {};
    const next = { ...prefs, [key]: { ...cur, [channel]: !cur[channel] } };
    const prev = prefs;
    setPrefs(next);
    setSaving(true);
    setSaved(false);
    try {
      await onSave(next);
      setSaved(true);
      setTimeout(() => setSaved(false), 1800);
    } catch {
      setPrefs(prev);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="np">
      <div className="np-top">
        <span className="np-hint">Choisis, pour chaque notif, comment tu veux être prévenu·e.</span>
        {saving ? <Loader2 size={13} className="np-spin" /> : saved ? <span className="np-saved"><Check size={13} /> Enregistré</span> : null}
      </div>

      <div className="np-grid">
        {/* En-tête de colonnes */}
        <div className="np-row np-head">
          <span />
          {COLS.map(c => (
            <span key={c.ch} className="np-colhead"><c.Icon size={14} /><span>{c.label}</span></span>
          ))}
        </div>

        {catalog.map(t => (
          <div key={t.key} className="np-row">
            <div className="np-info">
              <span className="np-label">{t.label}</span>
              <span className="np-desc">{t.desc}</span>
            </div>
            {COLS.map(c => {
              if (!t.channels.includes(c.ch)) {
                return <span key={c.ch} className="np-cell np-na" aria-hidden>—</span>;
              }
              const on = !!prefs[t.key]?.[c.ch];
              return (
                <button
                  key={c.ch}
                  type="button"
                  role="switch"
                  aria-checked={on}
                  aria-label={`${t.label} — ${c.label}`}
                  className={`np-cell np-toggle ${on ? 'on' : ''}`}
                  onClick={() => toggle(t.key, c.ch)}
                  disabled={saving}
                >
                  {on && <Check size={14} strokeWidth={3} />}
                </button>
              );
            })}
          </div>
        ))}
      </div>

      <style jsx>{`
        .np { display: flex; flex-direction: column; gap: 10px; }
        .np-top { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
        .np-hint { font-size: 0.8rem; color: var(--text-secondary, #6B5D52); }
        .np-saved { display: inline-flex; align-items: center; gap: 4px; color: #2f7a41; font-weight: 600; white-space: nowrap; font-size: 0.8rem; }
        .np-spin { animation: npspin 0.8s linear infinite; color: var(--brand, #B87333); }
        @keyframes npspin { to { transform: rotate(360deg); } }

        .np-grid { display: flex; flex-direction: column; }
        .np-row {
          display: grid;
          grid-template-columns: 1fr 40px 40px 40px;
          align-items: center; gap: 8px;
          padding: 10px 0; border-bottom: 1px solid #f5f0ed;
        }
        .np-row:last-child { border-bottom: none; }

        .np-head { padding: 6px 0 8px; border-bottom: 1px solid var(--border, #e5e0d8); }
        .np-colhead {
          display: flex; flex-direction: column; align-items: center; gap: 2px;
          font-size: 0.62rem; font-weight: 700; text-transform: uppercase;
          letter-spacing: 0.02em; color: var(--text-muted, #999);
        }

        .np-info { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
        .np-label { font-weight: 600; font-size: 0.875rem; color: var(--text-primary, #1a1a2e); }
        .np-desc { font-size: 0.72rem; color: var(--text-muted, #999); line-height: 1.35; }

        .np-cell { justify-self: center; width: 30px; height: 30px; }
        .np-na { display: flex; align-items: center; justify-content: center; color: #d8d2ca; font-size: 0.9rem; }
        .np-toggle {
          display: flex; align-items: center; justify-content: center;
          border-radius: 9px; border: 1.5px solid var(--border, #e5e0d8);
          background: var(--bg-card, #fff); color: white; cursor: pointer;
          transition: all 0.15s; padding: 0;
        }
        .np-toggle.on { background: var(--brand, #B87333); border-color: var(--brand, #B87333); }
        .np-toggle:disabled { opacity: 0.6; cursor: wait; }
      `}</style>
    </div>
  );
}
