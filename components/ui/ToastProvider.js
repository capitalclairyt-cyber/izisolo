'use client';

/**
 * Système de toasts IziSolo
 * ──────────────────────────────────────────────────────────────
 * Usage dans n'importe quel Client Component :
 *
 *   import { useToast } from '@/components/ui/ToastProvider';
 *   const { toast } = useToast();
 *
 *   toast.success('Client enregistré !');
 *   toast.error('Erreur : ' + err.message);
 *   toast.warning('Aucun participant avec e-mail');
 *   toast.info('Chargement en cours...');
 * ──────────────────────────────────────────────────────────────
 */

import { createContext, useContext, useState, useCallback, useRef } from 'react';
import { CheckCircle2, XCircle, AlertTriangle, Info, X } from 'lucide-react';

// ─── Contexte ────────────────────────────────────────────────
const ToastContext = createContext(null);

// ─── Hook ────────────────────────────────────────────────────
export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast doit être utilisé dans <ToastProvider>');
  return ctx;
}

// ─── Config des types ─────────────────────────────────────────
const TYPES = {
  success: {
    Icon: CheckCircle2,
    bg:   '#ecfdf5',
    border: '#6ee7b7',
    color:  '#065f46',
    iconColor: '#10b981',
    duration: 3500,
  },
  error: {
    Icon: XCircle,
    bg:   '#fef2f2',
    border: '#fca5a5',
    color:  '#7f1d1d',
    iconColor: '#ef4444',
    duration: 5000,
  },
  warning: {
    Icon: AlertTriangle,
    bg:   '#fffbeb',
    border: '#fcd34d',
    color:  '#78350f',
    iconColor: '#f59e0b',
    duration: 4000,
  },
  info: {
    Icon: Info,
    bg:   'var(--brand-light)',
    border: 'var(--brand)',
    color:  'var(--brand-700)',
    iconColor: 'var(--brand)',
    duration: 3500,
  },
};

// ─── Toast individuel ─────────────────────────────────────────
function ToastItem({ id, message, type, onRemove }) {
  const cfg = TYPES[type] || TYPES.info;
  const Icon = cfg.Icon;

  return (
    <div
      className="toast-item"
      style={{
        background: cfg.bg,
        border: `1.5px solid ${cfg.border}`,
        color: cfg.color,
      }}
      role="alert"
    >
      <Icon size={18} style={{ color: cfg.iconColor, flexShrink: 0 }} />
      <span className="toast-message">{message}</span>
      <button className="toast-close" onClick={() => onRemove(id)} aria-label="Fermer">
        <X size={14} />
      </button>
    </div>
  );
}

// ─── Provider ─────────────────────────────────────────────────
export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const counterRef = useRef(0);

  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const addToast = useCallback((message, type = 'info') => {
    const cfg = TYPES[type] || TYPES.info;
    const id = ++counterRef.current;

    setToasts(prev => {
      // Max 5 toasts empilés — supprimer le plus ancien si dépassé
      const next = [...prev, { id, message, type }];
      return next.length > 5 ? next.slice(next.length - 5) : next;
    });

    setTimeout(() => removeToast(id), cfg.duration);
    return id;
  }, [removeToast]);

  // API simplifiée
  const toast = {
    success: (msg) => addToast(msg, 'success'),
    error:   (msg) => addToast(msg, 'error'),
    warning: (msg) => addToast(msg, 'warning'),
    info:    (msg) => addToast(msg, 'info'),
  };

  return (
    <ToastContext.Provider value={{ toast, addToast, removeToast }}>
      {children}

      {/* Container des toasts */}
      {toasts.length > 0 && (
        <div className="toast-container" aria-live="polite" aria-atomic="false">
          {toasts.map(t => (
            <ToastItem key={t.id} {...t} onRemove={removeToast} />
          ))}
        </div>
      )}

      <style jsx global>{`
        /* ── Positionnement ─────────────────────────────────── */
        .toast-container {
          position: fixed;
          z-index: 9999;
          display: flex;
          flex-direction: column;
          gap: 8px;
          pointer-events: none;

          /* Mobile : en bas, centré */
          bottom: 80px;
          left: 16px;
          right: 16px;
          align-items: stretch;
        }

        @media (min-width: 640px) {
          .toast-container {
            /* Desktop : en haut à droite */
            top: 20px;
            bottom: auto;
            left: auto;
            right: 20px;
            width: 360px;
            align-items: flex-end;
          }
        }

        /* ── Toast individuel ───────────────────────────────── */
        .toast-item {
          display: flex;
          align-items: flex-start;
          gap: 10px;
          padding: 12px 14px;
          border-radius: var(--radius-md, 10px);
          box-shadow: 0 4px 16px rgba(0,0,0,0.12);
          pointer-events: all;
          animation: toast-in 0.22s cubic-bezier(0.34, 1.56, 0.64, 1) both;
          word-break: break-word;
        }

        @media (min-width: 640px) {
          .toast-item {
            animation: toast-in-right 0.22s cubic-bezier(0.34, 1.56, 0.64, 1) both;
          }
        }

        .toast-message {
          flex: 1;
          font-size: 0.875rem;
          font-weight: 500;
          line-height: 1.4;
          padding-top: 1px;
        }

        .toast-close {
          background: none;
          border: none;
          cursor: pointer;
          padding: 2px;
          opacity: 0.5;
          border-radius: 4px;
          display: flex;
          align-items: center;
          color: currentColor;
          flex-shrink: 0;
          margin-top: 1px;
        }
        .toast-close:hover { opacity: 1; }

        /* ── Animations ─────────────────────────────────────── */
        @keyframes toast-in {
          from { opacity: 0; transform: translateY(12px) scale(0.96); }
          to   { opacity: 1; transform: translateY(0)    scale(1);    }
        }
        @keyframes toast-in-right {
          from { opacity: 0; transform: translateX(16px) scale(0.96); }
          to   { opacity: 1; transform: translateX(0)    scale(1);    }
        }
      `}</style>
    </ToastContext.Provider>
  );
}
