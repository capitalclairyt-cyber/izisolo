'use client';

import { useState } from 'react';
import { Loader2, Check, Mail, Bell, Smartphone } from 'lucide-react';
import { NOTIF_TYPES_ELEVE, NOTIF_TYPES_PROF, effectivePrefs } from '@/lib/notif-prefs';

/**
 * NotifPrefsPanel — un toggle par CANAL (email / push) et par type de notif.
 * Générique : audience 'eleve' | 'prof'. La sauvegarde est déléguée au parent
 * via `onSave(prefs)` (endpoint : PATCH profil élève / PUT profile prof).
 * Certains types n'ont qu'un canal (ex : « Messages » = push seul) : on
 * n'affiche que les toggles pertinents (déclarés dans le catalogue `channels`).
 */
const CHANNEL_META = {
  inapp: { label: 'Appli', Icon: Bell },       // cloche dans l'app
  push:  { label: 'Push',  Icon: Smartphone },  // notification téléphone
  email: { label: 'Mail',  Icon: Mail },
};

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
      setPrefs(prev); // rollback si l'enregistrement échoue
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="np-panel">
      <div className="np-head">
        <span>Choisis, pour chaque notif, si tu la reçois par mail et/ou en notification.</span>
        {saving ? <Loader2 size={13} className="np-spin" /> : saved ? <span className="np-saved"><Check size={13} /> Enregistré</span> : null}
      </div>
      <div className="np-list">
        {catalog.map(t => (
          <div key={t.key} className="np-row">
            <div className="np-info">
              <span className="np-label">{t.label}</span>
              <span className="np-desc">{t.desc}</span>
            </div>
            <div className="np-channels">
              {t.channels.map(ch => {
                const on = !!prefs[t.key]?.[ch];
                const { label, Icon } = CHANNEL_META[ch];
                return (
                  <button
                    key={ch}
                    type="button"
                    role="switch"
                    aria-checked={on}
                    aria-label={`${t.label} — ${label}`}
                    className={`np-chip ${on ? 'on' : ''}`}
                    onClick={() => toggle(t.key, ch)}
                    disabled={saving}
                  >
                    <Icon size={13} /> {label}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <style jsx>{`
        .np-panel { display: flex; flex-direction: column; gap: 10px; }
        .np-head { display: flex; align-items: center; justify-content: space-between; gap: 8px; font-size: 0.8rem; color: var(--text-secondary, #6B5D52); }
        .np-saved { display: inline-flex; align-items: center; gap: 4px; color: #2f7a41; font-weight: 600; white-space: nowrap; }
        .np-spin { animation: npspin 0.8s linear infinite; color: var(--brand, #B87333); }
        @keyframes npspin { to { transform: rotate(360deg); } }
        .np-list { display: flex; flex-direction: column; }
        .np-row { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 11px 2px; border-bottom: 1px solid #f5f0ed; }
        .np-row:last-child { border-bottom: none; }
        .np-info { display: flex; flex-direction: column; gap: 2px; min-width: 0; flex: 1; }
        .np-label { font-weight: 600; font-size: 0.875rem; color: var(--text-primary, #1a1a2e); }
        .np-desc { font-size: 0.75rem; color: var(--text-muted, #999); line-height: 1.4; }
        .np-channels { display: flex; gap: 6px; flex-shrink: 0; }
        .np-chip {
          display: inline-flex; align-items: center; gap: 5px;
          padding: 6px 10px; border-radius: 99px;
          border: 1.5px solid var(--border, #e5e0d8); background: var(--bg-card, #fff);
          color: var(--text-muted, #999); font-size: 0.75rem; font-weight: 600;
          cursor: pointer; transition: all 0.15s; font-family: inherit; white-space: nowrap;
        }
        .np-chip.on { border-color: var(--brand, #B87333); background: var(--brand-light, #f7efe6); color: var(--brand-700, #8c5826); }
        .np-chip:disabled { opacity: 0.6; cursor: wait; }
      `}</style>
    </div>
  );
}
