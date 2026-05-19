'use client';

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { MessageSquarePlus, Bug, Plus, HelpCircle, Heart, Loader2, X } from 'lucide-react';
import { useToast } from '@/components/ui/ToastProvider';

const TOOLTIP_KEY = 'izisolo_feedback_seen';
const TOOLTIP_MAX = 5;

const TYPES = [
  { value: 'bug',    label: 'Bug',    desc: 'Ça plante / casse',     Icon: Bug,        color: '#ef4444' },
  { value: 'manque', label: 'Manque', desc: 'Il faudrait que…',       Icon: Plus,       color: '#3b82f6' },
  { value: 'confus', label: 'Confus', desc: 'Je comprends pas',      Icon: HelpCircle, color: '#f59e0b' },
  { value: 'kiff',   label: 'Kiff',   desc: 'Ça je kiffe',           Icon: Heart,      color: '#10b981' },
];

const PLACEHOLDERS = {
  bug:    "Qu'est-ce qui plante ? Étapes pour reproduire si possible.",
  manque: "Qu'est-ce qu'il faudrait ajouter ?",
  confus: "Sur quoi tu butes, qu'est-ce qui n'est pas clair ?",
  kiff:   "Qu'est-ce qui t'a fait dire « ça je kiffe » ?",
  autre:  "Vas-y, dis-nous tout.",
};

const MAX_LEN = 4000;

export default function FeedbackWidget() {
  const pathname = usePathname();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [type, setType] = useState('autre');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);

  useEffect(() => {
    try {
      const seen = parseInt(localStorage.getItem(TOOLTIP_KEY) || '0', 10);
      if (seen < TOOLTIP_MAX) {
        const timer = setTimeout(() => setShowTooltip(true), 1500);
        return () => clearTimeout(timer);
      }
    } catch {}
  }, []);

  function dismissTooltip() {
    setShowTooltip(false);
    try {
      const seen = parseInt(localStorage.getItem(TOOLTIP_KEY) || '0', 10);
      localStorage.setItem(TOOLTIP_KEY, String(seen + 1));
    } catch {}
  }

  function reset() { setType('autre'); setMessage(''); }

  async function handleSubmit(e) {
    e.preventDefault();
    if (loading) return;
    const trimmed = message.trim();
    if (!trimmed) { toast.error('Dis-nous au moins un mot'); return; }

    setLoading(true);
    try {
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, message: trimmed, url: pathname }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        toast.error(data.error || 'Envoi impossible, réessaye.');
        return;
      }
      toast.success('Merci, on te lit !');
      reset();
      setOpen(false);
    } catch {
      toast.error('Connexion impossible.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <div className="feedback-fab-wrapper">
        {showTooltip && (
          <div className="feedback-tooltip">
            <button className="feedback-tooltip-close" onClick={dismissTooltip} aria-label="Fermer">
              <X size={12} />
            </button>
            <strong>Un truc à dire ?</strong>
            <span>Bug, idée, coup de cœur… clique ici, on lit tout !</span>
          </div>
        )}
        <button
          className={`feedback-fab${showTooltip ? ' feedback-fab-pulse' : ''}`}
          onClick={() => { dismissTooltip(); setOpen(true); }}
          aria-label="Donner du feedback"
          title="Un retour ? Dis-nous tout"
        >
          <MessageSquarePlus size={20} />
        </button>
      </div>

      {open && (
        <div className="feedback-overlay" onClick={() => { setOpen(false); reset(); }}>
          <div className="feedback-modal" onClick={(e) => e.stopPropagation()}>
            <div className="feedback-header">
              <div>
                <h3 className="feedback-title">Ton retour, à chaud</h3>
                <p className="feedback-subtitle">On lit tout. C'est comme ça qu'IziSolo s'améliore vite.</p>
              </div>
              <button className="feedback-close" onClick={() => { setOpen(false); reset(); }} aria-label="Fermer">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="feedback-types">
                {TYPES.map(({ value, label, desc, Icon, color }) => (
                  <button
                    key={value}
                    type="button"
                    className={`feedback-type-btn${type === value ? ' selected' : ''}`}
                    onClick={() => setType(value)}
                    style={{ '--type-color': color }}
                  >
                    <Icon size={16} />
                    <div>
                      <span className="feedback-type-label">{label}</span>
                      <span className="feedback-type-desc">{desc}</span>
                    </div>
                  </button>
                ))}
              </div>

              <div className="feedback-field">
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value.slice(0, MAX_LEN))}
                  placeholder={PLACEHOLDERS[type] || PLACEHOLDERS.autre}
                  rows={4}
                  disabled={loading}
                  autoFocus
                />
                <span className="feedback-counter">{message.length} / {MAX_LEN}</span>
              </div>

              <div className="feedback-context">
                <span style={{ fontWeight: 600 }}>Page :</span>{' '}
                <code>{pathname}</code>
              </div>

              <div className="feedback-actions">
                <button type="button" className="feedback-btn-ghost" onClick={() => { setOpen(false); reset(); }} disabled={loading}>
                  Annuler
                </button>
                <button type="submit" className="feedback-btn-primary" disabled={loading || !message.trim()}>
                  {loading && <Loader2 size={14} className="feedback-spin" />}
                  {loading ? 'Envoi…' : 'Envoyer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style jsx global>{`
        .feedback-fab-wrapper {
          position: fixed;
          bottom: 96px;
          right: 20px;
          z-index: 40;
        }
        @media (min-width: 1024px) { .feedback-fab-wrapper { bottom: 32px; right: 32px; } }

        .feedback-fab {
          width: 48px;
          height: 48px;
          border-radius: 50%;
          background: var(--c-accent, #b08968);
          color: white;
          border: none;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 4px 16px rgba(0,0,0,0.18);
          cursor: pointer;
          transition: all 0.2s ease;
        }
        .feedback-fab:hover { transform: scale(1.08); box-shadow: 0 6px 24px rgba(0,0,0,0.22); }
        .feedback-fab:active { transform: scale(0.95); }
        .feedback-fab-pulse {
          animation: feedback-pulse 2s ease-in-out infinite;
        }
        @keyframes feedback-pulse {
          0%, 100% { box-shadow: 0 4px 16px rgba(0,0,0,0.18); }
          50% { box-shadow: 0 4px 16px rgba(0,0,0,0.18), 0 0 0 8px rgba(176,137,104,0.2); }
        }

        .feedback-tooltip {
          position: absolute;
          bottom: 56px;
          right: 0;
          width: 200px;
          background: white;
          border-radius: 12px;
          padding: 12px 14px;
          box-shadow: 0 8px 30px rgba(0,0,0,0.15);
          animation: feedback-tooltip-in 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
        }
        .feedback-tooltip::after {
          content: '';
          position: absolute;
          bottom: -6px;
          right: 18px;
          width: 12px;
          height: 12px;
          background: white;
          transform: rotate(45deg);
          box-shadow: 2px 2px 4px rgba(0,0,0,0.05);
        }
        .feedback-tooltip strong {
          display: block;
          font-size: 0.8125rem;
          color: var(--c-ink, #1a1a2e);
          margin-bottom: 2px;
        }
        .feedback-tooltip span {
          font-size: 0.75rem;
          color: #888;
          line-height: 1.4;
        }
        .feedback-tooltip-close {
          position: absolute;
          top: 6px;
          right: 6px;
          background: none;
          border: none;
          cursor: pointer;
          color: #ccc;
          padding: 2px;
          border-radius: 4px;
          display: flex;
        }
        .feedback-tooltip-close:hover { color: #888; }
        @keyframes feedback-tooltip-in {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .feedback-overlay {
          position: fixed; inset: 0;
          background: rgba(0,0,0,0.3);
          backdrop-filter: blur(2px);
          z-index: 1000;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 16px;
          animation: feedback-fade-in 0.15s ease;
        }
        @keyframes feedback-fade-in { from { opacity: 0; } to { opacity: 1; } }

        .feedback-modal {
          background: white;
          border-radius: 16px;
          width: 100%;
          max-width: 440px;
          padding: 24px;
          box-shadow: 0 20px 60px rgba(0,0,0,0.15);
          animation: feedback-slide-up 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
        }
        @keyframes feedback-slide-up { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }

        .feedback-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px; }
        .feedback-title { font-size: 1.125rem; font-weight: 700; color: var(--c-ink, #1a1a2e); margin: 0; }
        .feedback-subtitle { font-size: 0.8125rem; color: #888; margin: 4px 0 0; }
        .feedback-close {
          background: none; border: none; cursor: pointer; padding: 4px;
          color: #aaa; border-radius: 6px; display: flex;
        }
        .feedback-close:hover { background: #f5f5f5; color: #555; }

        .feedback-types { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 16px; }
        .feedback-type-btn {
          display: flex; align-items: flex-start; gap: 8px;
          padding: 10px 12px; border-radius: 10px;
          border: 1.5px solid #e5e5e5; background: white;
          cursor: pointer; text-align: left; transition: all 0.15s;
          color: var(--c-ink, #333);
        }
        .feedback-type-btn:hover { border-color: var(--type-color); background: color-mix(in srgb, var(--type-color) 5%, white); }
        .feedback-type-btn.selected { border-color: var(--type-color); background: color-mix(in srgb, var(--type-color) 8%, white); }
        .feedback-type-btn svg { flex-shrink: 0; margin-top: 2px; color: var(--type-color); }
        .feedback-type-label { display: block; font-size: 0.8125rem; font-weight: 600; line-height: 1.2; }
        .feedback-type-desc { display: block; font-size: 0.6875rem; color: #999; line-height: 1.3; }

        .feedback-field { margin-bottom: 12px; position: relative; }
        .feedback-field textarea {
          width: 100%; resize: none; border: 1.5px solid #e5e5e5; border-radius: 10px;
          padding: 12px; font-size: 0.875rem; font-family: inherit; line-height: 1.5;
          transition: border-color 0.15s; color: var(--c-ink, #333);
        }
        .feedback-field textarea:focus { outline: none; border-color: var(--c-accent, #b08968); }
        .feedback-field textarea::placeholder { color: #bbb; }
        .feedback-counter { position: absolute; bottom: 8px; right: 12px; font-size: 0.6875rem; color: #ccc; font-variant-numeric: tabular-nums; }

        .feedback-context {
          background: #faf8f5; border: 1px solid #eee; border-radius: 8px;
          padding: 8px 12px; font-size: 0.6875rem; color: #888; margin-bottom: 16px;
        }
        .feedback-context code { font-family: var(--font-mono, monospace); font-size: 0.6875rem; }

        .feedback-actions { display: flex; justify-content: flex-end; gap: 8px; }
        .feedback-btn-ghost {
          padding: 8px 16px; border-radius: 8px; border: none; background: none;
          font-size: 0.8125rem; color: #888; cursor: pointer; font-weight: 500;
        }
        .feedback-btn-ghost:hover { background: #f5f5f5; }
        .feedback-btn-primary {
          padding: 8px 20px; border-radius: 8px; border: none;
          background: var(--c-accent, #b08968); color: white;
          font-size: 0.8125rem; font-weight: 600; cursor: pointer;
          display: flex; align-items: center; gap: 6px; transition: opacity 0.15s;
        }
        .feedback-btn-primary:hover { opacity: 0.9; }
        .feedback-btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }

        @keyframes feedback-spin { to { transform: rotate(360deg); } }
        .feedback-spin { animation: feedback-spin 0.8s linear infinite; }
      `}</style>
    </>
  );
}
