'use client';

/**
 * UnsavedChangesBar — barre sticky en bas du viewport visible quand un formulaire
 * a des modifs non sauvegardées. Donne accès direct au bouton Enregistrer sans
 * scroller, et propose Annuler pour revenir à l'état serveur.
 *
 * Design : crème chaud (palette Claude), texte centré, accent sand pour
 * "modifications" et brand pour le bouton primaire.
 *
 * Props :
 *   dirty (bool)      — afficher / masquer
 *   saving (bool)     — état du bouton Save
 *   onSave (fn)       — clic Enregistrer
 *   onDiscard (fn)    — clic Annuler (revert state local)
 *   message (string)  — texte personnalisable, default "Modifications non enregistrées"
 */
import { Save, Undo2 } from 'lucide-react';

export default function UnsavedChangesBar({
  dirty,
  saving = false,
  onSave,
  onDiscard,
  message = 'Modifications non enregistrées',
}) {
  if (!dirty) return null;
  return (
    <div className="ucb-wrap" role="status" aria-live="polite">
      <div className="ucb-bar">
        <span className="ucb-msg">
          <span className="ucb-dot" /> {message}
        </span>
        <div className="ucb-actions">
          {onDiscard && (
            <button
              type="button"
              onClick={onDiscard}
              disabled={saving}
              className="ucb-btn ucb-btn-ghost"
            >
              <Undo2 size={14} /> Annuler
            </button>
          )}
          <button
            type="button"
            onClick={onSave}
            disabled={saving}
            className="ucb-btn ucb-btn-primary"
          >
            <Save size={14} /> {saving ? 'Enregistrement…' : 'Enregistrer'}
          </button>
        </div>
      </div>

      <style jsx>{`
        .ucb-wrap {
          position: fixed;
          left: 0; right: 0;
          /* Au-dessus de la BottomNav portail (≤768px) ou collé en bas (desktop) */
          bottom: 0;
          padding: 10px 16px calc(10px + env(safe-area-inset-bottom, 0));
          z-index: 45;
          background: linear-gradient(to top, #faf6f0 70%, rgba(250, 246, 240, 0));
          pointer-events: none;
          animation: ucb-slide-up 0.25s ease-out;
        }
        @keyframes ucb-slide-up {
          from { transform: translateY(100%); opacity: 0; }
          to   { transform: translateY(0); opacity: 1; }
        }
        .ucb-bar {
          pointer-events: auto;
          max-width: 720px;
          margin: 0 auto;
          background: var(--tone-sand-bg-soft, #fbf8f1);
          border: 1.5px solid var(--tone-sand-accent, #c4956a);
          border-radius: 16px;
          padding: 10px 14px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          box-shadow: 0 4px 16px rgba(70, 35, 25, 0.10);
        }
        .ucb-msg {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          color: var(--tone-sand-ink, #8a6a3d);
          font-size: 0.875rem;
          font-weight: 600;
        }
        .ucb-dot {
          width: 8px; height: 8px;
          border-radius: 50%;
          background: var(--tone-sand-accent, #c4956a);
          animation: ucb-pulse 1.4s ease-in-out infinite;
        }
        @keyframes ucb-pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50%      { opacity: 0.5; transform: scale(1.3); }
        }
        .ucb-actions {
          display: inline-flex;
          gap: 6px;
          flex-shrink: 0;
        }
        .ucb-btn {
          display: inline-flex; align-items: center; gap: 5px;
          padding: 8px 14px;
          font-size: 0.8125rem; font-weight: 600;
          border-radius: 99px;
          border: 1.5px solid transparent;
          cursor: pointer;
          transition: background 0.15s, transform 0.1s;
          line-height: 1;
        }
        .ucb-btn:disabled { opacity: 0.6; cursor: not-allowed; }
        .ucb-btn-ghost {
          background: white;
          color: var(--text-secondary, #888);
          border-color: var(--border, #e8e2da);
        }
        .ucb-btn-ghost:hover:not(:disabled) { color: #1a1a2e; border-color: #1a1a2e; }
        .ucb-btn-primary {
          background: var(--brand, #d4a0a0);
          color: white;
        }
        .ucb-btn-primary:hover:not(:disabled) { background: var(--brand-dark, #b07878); }
        .ucb-btn-primary:active { transform: scale(0.97); }

        /* Sur mobile, encombre le moins possible */
        @media (max-width: 480px) {
          .ucb-msg { font-size: 0.8125rem; }
          .ucb-msg .ucb-dot { width: 7px; height: 7px; }
        }
      `}</style>
    </div>
  );
}
