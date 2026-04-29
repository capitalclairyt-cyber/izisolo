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

import Link from 'next/link';
import { Calendar, Package, BookOpen, FileText } from 'lucide-react';

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

export default function MessageBubble({ message, viewerKind, showAvatar = false }) {
  const isOwn = (viewerKind === 'pro' && message.sender_type === 'pro')
             || (viewerKind === 'eleve' && message.sender_type === 'eleve');
  const isSystem = message.sender_type === 'system';

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

        <div className="msg-time">{formatTime(message.created_at)}</div>
      </div>

      <style>{`
        .msg-row {
          display: flex;
          margin-bottom: 4px;
        }
        .msg-row.own  { justify-content: flex-end; }
        .msg-row.other { justify-content: flex-start; }

        .msg-bubble {
          max-width: 75%;
          padding: 8px 12px 4px;
          border-radius: 16px;
          word-wrap: break-word;
          position: relative;
        }
        .msg-bubble.own {
          background: var(--brand);
          color: white;
          border-bottom-right-radius: 4px;
        }
        .msg-bubble.other {
          background: var(--bg-soft, #faf8f5);
          border: 1px solid var(--border);
          color: var(--text-primary);
          border-bottom-left-radius: 4px;
        }

        .msg-content {
          font-size: 0.875rem;
          line-height: 1.4;
          white-space: pre-wrap;
        }

        .msg-media img,
        .msg-media-grid img {
          display: block;
          max-width: 240px;
          max-height: 240px;
          object-fit: cover;
          border-radius: 10px;
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

        .msg-time {
          font-size: 0.625rem;
          opacity: 0.65;
          text-align: right;
          margin-top: 2px;
          font-variant-numeric: tabular-nums;
        }
      `}</style>
    </div>
  );
}
