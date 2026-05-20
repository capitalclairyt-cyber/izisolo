'use client';

/**
 * MessageBubble — bulle d'un message dans une conversation.
 * Variants selon sender (pro / eleve / system) et qui regarde (viewer).
 *
 * Props :
 *   message : { id, sender_type, content, message_type, media_url, media_urls,
 *               shared_ref_type, shared_ref_id, created_at }
 *   viewerKind : 'pro' | 'eleve'
 *   showAvatar : bool
 */

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { Calendar, Package, BookOpen, FileText, Check, CheckCheck, Smile, Plus } from 'lucide-react';

const SHARED_REF_ICONS = {
  cours: Calendar,
  offre: Package,
  abonnement: BookOpen,
};

function formatTime(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  const today = new Date();
  const sameDay = d.toDateString() === today.toDateString();
  return sameDay
    ? d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
    : d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}

export function DateSeparator({ date }) {
  const d = new Date(date);
  const label = d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
  return (
    <div className="msg-date-sep">
      <span>{label}</span>
      <style>{`
        .msg-date-sep {
          display: flex; justify-content: center;
          margin: 16px 0 8px;
        }
        .msg-date-sep span {
          font-size: 0.7rem; color: var(--text-muted);
          text-transform: capitalize; padding: 4px 12px;
          background: var(--bg-soft, #faf8f5);
          border-radius: 99px;
        }
      `}</style>
    </div>
  );
}

const QUICK_REACTIONS = ['👍', '❤️', '😂', '😮', '😢', '🙏'];

export default function MessageBubble({ message, viewerKind, showAvatar = false, isRead = false, onReact, reactions = [] }) {
  const isOwn = (viewerKind === 'pro' && message.sender_type === 'pro')
             || (viewerKind === 'eleve' && message.sender_type === 'eleve');
  const isSystem = message.sender_type === 'system';
  const [showPicker, setShowPicker] = useState(false);
  const reactWrapRef = useRef(null);

  // Fermer le picker au click extérieur OU touch (mobile-friendly)
  useEffect(() => {
    if (!showPicker) return;
    const handler = (e) => {
      if (reactWrapRef.current && !reactWrapRef.current.contains(e.target)) {
        setShowPicker(false);
      }
    };
    document.addEventListener('mousedown', handler);
    document.addEventListener('touchstart', handler, { passive: true });
    return () => {
      document.removeEventListener('mousedown', handler);
      document.removeEventListener('touchstart', handler);
    };
  }, [showPicker]);

  // Grouper les réactions par emoji avec compteurs
  const groupedReactions = reactions.reduce((acc, r) => {
    if (!acc[r.emoji]) acc[r.emoji] = { count: 0, mine: false };
    acc[r.emoji].count++;
    if (r.mine) acc[r.emoji].mine = true;
    return acc;
  }, {});

  if (isSystem) {
    return (
      <div className="msg-system">
        <span>{message.content}</span>
        <style>{`
          .msg-system {
            display: flex; justify-content: center;
            margin: 8px 0;
          }
          .msg-system span {
            font-size: 0.7rem; color: var(--text-muted);
            font-style: italic; padding: 3px 10px;
            background: rgba(0,0,0,0.04); border-radius: 99px;
          }
        `}</style>
      </div>
    );
  }

  const Icon = message.shared_ref_type ? SHARED_REF_ICONS[message.shared_ref_type] : null;

  return (
    <div className={`msg-row ${isOwn ? 'own' : 'other'}`}>
      <div className={`msg-bubble ${isOwn ? 'own' : 'other'}`}>
        {message.content && (
          <div className="msg-content">{message.content}</div>
        )}

        {message.media_url && (
          <div className="msg-media">
            <a href={message.media_url} target="_blank" rel="noopener noreferrer">
              <img src={message.media_url} alt="Pièce jointe" loading="lazy" />
            </a>
          </div>
        )}

        {message.media_urls && message.media_urls.length > 0 && (
          <div className="msg-media-grid">
            {message.media_urls.map((url, i) => (
              <a key={i} href={url} target="_blank" rel="noopener noreferrer">
                <img src={url} alt={`Photo ${i + 1}`} loading="lazy" />
              </a>
            ))}
          </div>
        )}

        {message.shared_ref_type && message.shared_ref_id && Icon && (
          <div className="msg-shared">
            <Icon size={13} />
            <span>{message.shared_ref_type}</span>
          </div>
        )}

        <div className="msg-footer">
          <span className="msg-time">{formatTime(message.created_at)}</span>
          {isOwn && (
            <span className="msg-status" aria-label={isRead ? 'Lu' : 'Envoyé'}>
              {isRead ? <CheckCheck size={12} /> : <Check size={12} />}
            </span>
          )}
        </div>

        {/* Bouton + picker quick reactions — wrap pour click-outside */}
        {onReact && (
          <div className="msg-react-wrap" ref={reactWrapRef}>
            <button
              type="button"
              className="msg-react-btn"
              onClick={() => setShowPicker(s => !s)}
              aria-label="Réagir"
              title="Réagir"
            >
              <Smile size={13} />
            </button>
            {showPicker && (
              <div className="msg-react-picker">
                {QUICK_REACTIONS.map(e => (
                  <button
                    key={e}
                    type="button"
                    className="msg-react-emoji"
                    onClick={() => { onReact?.(e); setShowPicker(false); }}
                  >
                    {e}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Réactions affichées sous la bulle */}
      {Object.keys(groupedReactions).length > 0 && (
        <div className={`msg-reactions ${isOwn ? 'own' : 'other'}`}>
          {Object.entries(groupedReactions).map(([emoji, { count, mine }]) => (
            <button
              key={emoji}
              type="button"
              className={`msg-reaction ${mine ? 'is-mine' : ''}`}
              onClick={() => onReact?.(emoji)}
              aria-label={`${count} réaction${count > 1 ? 's' : ''} ${emoji}${mine ? ' (la tienne)' : ''}`}
            >
              <span className="msg-reaction-emoji">{emoji}</span>
              {count > 1 && <span className="msg-reaction-count">{count}</span>}
            </button>
          ))}
        </div>
      )}

      <style>{`
        .msg-row {
          display: flex; flex-direction: column;
          margin-bottom: 6px;
          animation: msg-fade-up 0.25s cubic-bezier(0.22, 1, 0.36, 1);
        }
        @keyframes msg-fade-up {
          from { opacity: 0; transform: translateY(6px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @media (prefers-reduced-motion: reduce) {
          .msg-row { animation: none; }
        }
        .msg-row.own   { align-items: flex-end; }
        .msg-row.other { align-items: flex-start; }

        .msg-bubble {
          max-width: 78%;
          padding: 10px 14px 6px;
          border-radius: 18px;
          word-wrap: break-word;
          position: relative;
          transition: box-shadow 0.15s ease;
        }
        .msg-bubble.own {
          background: var(--brand);
          color: white;
          border-bottom-right-radius: 4px;
          box-shadow: 0 1px 6px rgba(184, 115, 51, 0.15);
        }
        .msg-bubble.other {
          background: var(--bg-soft, #faf8f5);
          border: 1px solid var(--border);
          color: var(--text-primary);
          border-bottom-left-radius: 4px;
        }
        .msg-bubble:hover { box-shadow: 0 4px 14px rgba(0,0,0,0.08); }

        .msg-content {
          font-size: 0.9375rem;
          line-height: 1.45;
          white-space: pre-wrap;
        }
        /* Emojis seuls (jumbo) : si le message ne contient que des emojis,
           on les agrandit pour l'effet WhatsApp. Désactivé pour l'instant —
           nécessiterait de détecter côté JS. */

        .msg-media img,
        .msg-media-grid img {
          display: block;
          max-width: 240px;
          max-height: 240px;
          object-fit: cover;
          border-radius: 12px;
          margin-top: 6px;
        }
        .msg-media-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 4px;
          margin-top: 6px;
        }
        .msg-media-grid img { max-width: 100%; max-height: 140px; }

        .msg-shared {
          display: inline-flex; align-items: center; gap: 4px;
          font-size: 0.6875rem; font-weight: 600;
          padding: 3px 8px; border-radius: 99px;
          background: rgba(255,255,255,0.2);
          margin-top: 6px;
          text-transform: capitalize;
        }
        .msg-bubble.other .msg-shared {
          background: var(--brand-light);
          color: var(--brand);
        }

        .msg-footer {
          display: flex; align-items: center; justify-content: flex-end;
          gap: 4px;
          margin-top: 2px;
          font-size: 0.625rem;
          opacity: 0.75;
          font-variant-numeric: tabular-nums;
        }
        .msg-time { line-height: 1; }
        .msg-status { display: inline-flex; align-items: center; }
        .msg-bubble.own .msg-status { color: rgba(255,255,255,0.85); }

        /* Wrap pour gérer le click-outside via ref, mais transparent au layout :
           display: contents fait disparaître la box du wrap, le bouton et le
           picker restent positionnés relativement à .msg-bubble comme avant. */
        .msg-react-wrap { display: contents; }

        /* Bouton + réactions : invisible par défaut, visible au hover bubble */
        .msg-react-btn {
          position: absolute;
          top: 50%; transform: translateY(-50%);
          ${'/* placé en miroir selon le sens */'}
          width: 28px; height: 28px;
          border-radius: 50%;
          background: white;
          border: 1px solid var(--border);
          color: var(--text-muted);
          cursor: pointer;
          display: inline-flex; align-items: center; justify-content: center;
          opacity: 0;
          transition: opacity 0.15s ease, transform 0.15s ease;
          box-shadow: 0 2px 6px rgba(0,0,0,0.08);
          z-index: 2;
        }
        .msg-row.own .msg-react-btn  { left: -36px; }
        .msg-row.other .msg-react-btn { right: -36px; }
        .msg-bubble:hover .msg-react-btn { opacity: 1; }
        .msg-react-btn:hover { color: var(--brand); transform: translateY(-50%) scale(1.1); }

        /* Quick picker */
        .msg-react-picker {
          position: absolute;
          bottom: calc(100% + 6px);
          ${'/* on s\'aligne côté origine pour éviter le débord */'}
          background: white;
          border: 1px solid var(--border);
          border-radius: 99px;
          padding: 4px 6px;
          display: flex; gap: 2px;
          box-shadow: 0 8px 24px rgba(0,0,0,0.12);
          z-index: 10;
          animation: msg-picker-pop 0.18s cubic-bezier(0.22, 1, 0.36, 1);
        }
        .msg-row.own .msg-react-picker  { right: 0; }
        .msg-row.other .msg-react-picker { left: 0; }
        @keyframes msg-picker-pop {
          from { opacity: 0; transform: scale(0.85) translateY(4px); }
          to   { opacity: 1; transform: scale(1) translateY(0); }
        }
        .msg-react-emoji {
          width: 32px; height: 32px;
          border: none; background: transparent;
          border-radius: 50%;
          font-size: 1.15rem;
          cursor: pointer;
          transition: background 0.12s ease, transform 0.12s ease;
        }
        .msg-react-emoji:hover {
          background: var(--bg-soft, #faf8f5);
          transform: scale(1.2);
        }

        /* Réactions affichées sous la bulle */
        .msg-reactions {
          display: flex; gap: 4px; flex-wrap: wrap;
          margin-top: 4px;
        }
        .msg-reactions.own  { padding-right: 4px; }
        .msg-reactions.other { padding-left: 4px; }
        .msg-reaction {
          display: inline-flex; align-items: center; gap: 4px;
          padding: 2px 8px;
          background: white;
          border: 1px solid var(--border);
          border-radius: 99px;
          font-size: 0.8125rem;
          cursor: pointer;
          transition: all 0.12s ease;
        }
        .msg-reaction:hover { transform: scale(1.05); border-color: var(--brand); }
        .msg-reaction.is-mine {
          background: var(--brand-light, #fef0dc);
          border-color: var(--brand);
        }
        .msg-reaction-emoji { line-height: 1; }
        .msg-reaction-count {
          font-size: 0.75rem; font-weight: 600;
          color: var(--text-secondary);
        }
      `}</style>
    </div>
  );
}
