'use client';

import { useState } from 'react';
import { Loader2, Check } from 'lucide-react';
import { NOTIF_TYPES_ELEVE, NOTIF_TYPES_PROF, effectivePrefs } from '@/lib/notif-prefs';

/**
 * NotifPrefsPanel — liste de toggles pour les préférences de notification.
 * Générique : audience 'eleve' | 'prof'. La sauvegarde est déléguée au parent
 * via `onSave(prefs)` (qui connaît l'endpoint : PATCH profil élève / PUT profile prof).
 */
export default function NotifPrefsPanel({ audience = 'eleve', initialPrefs = {}, onSave }) {
  const catalog = audience === 'prof' ? NOTIF_TYPES_PROF : NOTIF_TYPES_ELEVE;
  const [prefs, setPrefs] = useState(() => effectivePrefs(initialPrefs, audience));
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const toggle = async (key) => {
    const next = { ...prefs, [key]: !prefs[key] };
    setPrefs(next);
    setSaving(true);
    setSaved(false);
    try {
      await onSave(next);
      setSaved(true);
      setTimeout(() => setSaved(false), 1800);
    } catch {
      // rollback visuel si l'enregistrement échoue
      setPrefs(prefs);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="np-panel">
      <div className="np-head">
        <span>Choisis ce que tu veux recevoir (email + notifications).</span>
        {saving ? <Loader2 size={13} className="np-spin" /> : saved ? <span className="np-saved"><Check size={13} /> Enregistré</span> : null}
      </div>
      <div className="np-list">
        {catalog.map(t => (
          <label key={t.key} className="np-row">
            <div className="np-info">
              <span className="np-label">{t.label}</span>
              <span className="np-desc">{t.desc}</span>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={!!prefs[t.key]}
              aria-label={t.label}
              className={`np-switch ${prefs[t.key] ? 'on' : ''}`}
              onClick={() => toggle(t.key)}
              disabled={saving}
            >
              <span className="np-knob" />
            </button>
          </label>
        ))}
      </div>

      <style jsx>{`
        .np-panel { display: flex; flex-direction: column; gap: 10px; }
        .np-head { display: flex; align-items: center; justify-content: space-between; gap: 8px; font-size: 0.8rem; color: var(--text-secondary, #6B5D52); }
        .np-saved { display: inline-flex; align-items: center; gap: 4px; color: #2f7a41; font-weight: 600; }
        .np-spin { animation: npspin 0.8s linear infinite; color: var(--brand, #B87333); }
        @keyframes npspin { to { transform: rotate(360deg); } }
        .np-list { display: flex; flex-direction: column; }
        .np-row { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 11px 2px; border-bottom: 1px solid #f5f0ed; }
        .np-row:last-child { border-bottom: none; }
        .np-info { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
        .np-label { font-weight: 600; font-size: 0.875rem; color: var(--text-primary, #1a1a2e); }
        .np-desc { font-size: 0.75rem; color: var(--text-muted, #999); line-height: 1.4; }
        .np-switch { flex-shrink: 0; width: 42px; height: 24px; border-radius: 99px; border: none; background: #d8d2ca; cursor: pointer; position: relative; transition: background 0.18s; padding: 0; }
        .np-switch.on { background: var(--brand, #B87333); }
        .np-switch:disabled { opacity: 0.6; cursor: wait; }
        .np-knob { position: absolute; top: 3px; left: 3px; width: 18px; height: 18px; border-radius: 50%; background: white; transition: transform 0.18s; box-shadow: 0 1px 2px rgba(0,0,0,0.2); }
        .np-switch.on .np-knob { transform: translateX(18px); }
      `}</style>
    </div>
  );
}
