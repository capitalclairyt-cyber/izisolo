'use client';

/**
 * ConfirmDialog — confirmation modale brandée, basée sur une promesse.
 * Remplace les confirm()/alert() natifs (hors charte) par une modale cohérente.
 * ──────────────────────────────────────────────────────────────
 * Usage dans n'importe quel Client Component sous <ConfirmProvider> :
 *
 *   import { useConfirm } from '@/components/ui/ConfirmDialog';
 *   const confirm = useConfirm();
 *
 *   const ok = await confirm({
 *     title: 'Supprimer cette offre ?',
 *     message: 'Cette action est irréversible.',
 *     confirmLabel: 'Supprimer',
 *     danger: true,
 *   });
 *   if (!ok) return;
 * ──────────────────────────────────────────────────────────────
 * Clavier : Échap = annuler ; Entrée = confirmer (désactivé si danger,
 * pour éviter une suppression réflexe). Focus initial : Confirmer (info)
 * ou Annuler (danger).
 */

import { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';
import { AlertTriangle, X } from 'lucide-react';

const ConfirmContext = createContext(null);

export function useConfirm() {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error('useConfirm doit être utilisé dans <ConfirmProvider>');
  return ctx;
}

export function ConfirmProvider({ children }) {
  const [opts, setOpts] = useState(null); // null = fermé
  const resolverRef = useRef(null);

  const confirm = useCallback((options = {}) => {
    return new Promise((resolve) => {
      resolverRef.current = resolve;
      setOpts(options);
    });
  }, []);

  const close = useCallback((result) => {
    setOpts(null);
    if (resolverRef.current) {
      resolverRef.current(result);
      resolverRef.current = null;
    }
  }, []);

  const danger = !!opts?.danger;

  // Échap = annuler ; Entrée = confirmer (sauf action dangereuse)
  useEffect(() => {
    if (!opts) return;
    const onKey = (e) => {
      if (e.key === 'Escape') { e.preventDefault(); close(false); }
      else if (e.key === 'Enter' && !danger) { e.preventDefault(); close(true); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [opts, danger, close]);

  const {
    title = 'Confirmer',
    message = '',
    confirmLabel = 'Confirmer',
    cancelLabel = 'Annuler',
  } = opts || {};

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}

      {opts && (
        <div
          className="izi-confirm-backdrop"
          onClick={(e) => { if (e.target === e.currentTarget) close(false); }}
        >
          <div className="izi-confirm-card izi-card" role="alertdialog" aria-modal="true" aria-label={title}>
            <button className="izi-confirm-x" onClick={() => close(false)} aria-label="Fermer">
              <X size={18} />
            </button>
            <div className={`izi-confirm-icon${danger ? ' danger' : ''}`}>
              <AlertTriangle size={24} />
            </div>
            <h2 className="izi-confirm-title">{title}</h2>
            {message && <p className="izi-confirm-message">{message}</p>}
            <div className="izi-confirm-actions">
              <button
                className="izi-btn izi-btn-ghost"
                onClick={() => close(false)}
                autoFocus={danger}
              >
                {cancelLabel}
              </button>
              <button
                className={`izi-btn ${danger ? 'izi-btn-danger' : 'izi-btn-primary'}`}
                onClick={() => close(true)}
                autoFocus={!danger}
              >
                {confirmLabel}
              </button>
            </div>
          </div>

          <style jsx global>{`
            .izi-confirm-backdrop {
              position: fixed; inset: 0; z-index: 10000;
              background: rgba(26, 22, 18, 0.45);
              backdrop-filter: blur(2px); -webkit-backdrop-filter: blur(2px);
              display: flex; align-items: center; justify-content: center;
              padding: 20px;
              animation: iziConfirmFade 0.16s ease both;
            }
            .izi-confirm-card {
              position: relative;
              max-width: 380px; width: 100%;
              padding: 28px 24px 22px;
              text-align: center;
              display: flex; flex-direction: column; align-items: center; gap: 10px;
              animation: iziConfirmIn 0.2s cubic-bezier(0.34, 1.56, 0.64, 1) both;
            }
            .izi-confirm-x {
              position: absolute; top: 12px; right: 12px;
              background: none; border: none; cursor: pointer;
              color: var(--text-muted); padding: 4px; border-radius: 6px;
              display: flex;
            }
            .izi-confirm-x:hover { color: var(--text-primary); }
            .izi-confirm-icon {
              width: 52px; height: 52px; border-radius: 50%;
              background: var(--brand-light); color: var(--brand);
              display: flex; align-items: center; justify-content: center;
            }
            .izi-confirm-icon.danger { background: var(--danger-light); color: var(--danger); }
            .izi-confirm-title { font-size: 1.125rem; font-weight: 700; color: var(--text-primary); margin: 0; }
            .izi-confirm-message {
              font-size: 0.9rem; color: var(--text-secondary);
              line-height: 1.5; margin: 0; max-width: 32ch;
            }
            .izi-confirm-actions { display: flex; gap: 10px; margin-top: 14px; width: 100%; }
            .izi-confirm-actions .izi-btn { flex: 1; justify-content: center; }
            @keyframes iziConfirmFade { from { opacity: 0; } to { opacity: 1; } }
            @keyframes iziConfirmIn {
              from { opacity: 0; transform: translateY(12px) scale(0.97); }
              to   { opacity: 1; transform: translateY(0) scale(1); }
            }
            @media (prefers-reduced-motion: reduce) {
              .izi-confirm-backdrop, .izi-confirm-card { animation: none; }
            }
          `}</style>
        </div>
      )}
    </ConfirmContext.Provider>
  );
}
