'use client';

import { useState, useRef, useEffect } from 'react';
import { Send, Paperclip, X, Loader2, Image as ImageIcon, Smile } from 'lucide-react';

// Emojis curatés (~80) organisés par catégorie pour un picker léger sans dépendance
const EMOJI_CATEGORIES = [
  {
    label: 'Sourires',
    items: ['😊', '😄', '😂', '🥰', '😍', '😘', '🤗', '😎', '🤩', '😋', '😉', '🙂', '😅', '😇', '🥹', '🥲'],
  },
  {
    label: 'Cœurs',
    items: ['❤️', '🧡', '💛', '💚', '💙', '💜', '🤍', '🤎', '🖤', '💖', '💝', '💞', '💕', '💓', '💗', '✨'],
  },
  {
    label: 'Mains',
    items: ['👍', '👏', '🙏', '🤝', '👌', '✌️', '🤞', '💪', '🙌', '👋', '✋', '🤲', '👇', '👉', '👆', '👈'],
  },
  {
    label: 'Bien-être',
    items: ['🧘', '🧘‍♀️', '🧘‍♂️', '🌿', '🌱', '🍃', '🌸', '🌺', '🌻', '🌷', '🌹', '☀️', '🌙', '⭐', '🌟', '💫'],
  },
  {
    label: 'Sport',
    items: ['🤸', '🤸‍♀️', '🤸‍♂️', '🏃', '🏃‍♀️', '🏃‍♂️', '💃', '🕺', '🎉', '🎊', '🎈', '🎁', '🏆', '🥇', '🎯', '🔥'],
  },
];

/**
 * ChatInput — barre de saisie d'un message + pièce jointe.
 *
 * Props :
 *   onSend(opts) — async, opts: { content, mediaUrls }
 *   disabled
 *   placeholder
 */
export default function ChatInput({ onSend, disabled = false, placeholder = "Écrire un message…", initialText = '' }) {
  const [text, setText] = useState(initialText);
  const [attachments, setAttachments] = useState([]); // [{ url, kind, name }]
  const [uploading, setUploading] = useState(false);
  const [sending, setSending] = useState(false);
  const [emojiOpen, setEmojiOpen] = useState(false);
  const fileInputRef = useRef(null);
  const taRef = useRef(null);
  const emojiRef = useRef(null);

  // Fermer le picker au clic extérieur
  useEffect(() => {
    if (!emojiOpen) return;
    const handler = (e) => {
      if (emojiRef.current && !emojiRef.current.contains(e.target)) setEmojiOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [emojiOpen]);

  const insertEmoji = (emoji) => {
    const ta = taRef.current;
    if (!ta) {
      setText(t => t + emoji);
      return;
    }
    const start = ta.selectionStart ?? text.length;
    const end = ta.selectionEnd ?? text.length;
    const newText = text.slice(0, start) + emoji + text.slice(end);
    setText(newText);
    // Replacer le curseur juste après l'emoji après le rendu
    requestAnimationFrame(() => {
      ta.focus();
      const pos = start + emoji.length;
      ta.setSelectionRange(pos, pos);
      ta.style.height = 'auto';
      ta.style.height = Math.min(ta.scrollHeight, 140) + 'px';
    });
  };

  useEffect(() => {
    if (initialText && !text) {
      setText(initialText);
      if (taRef.current) {
        taRef.current.style.height = 'auto';
        taRef.current.style.height = Math.min(taRef.current.scrollHeight, 140) + 'px';
      }
    }
  }, [initialText]);

  const canSend = (!sending && !uploading) && (text.trim().length > 0 || attachments.length > 0);

  const handleAttach = async (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    setUploading(true);
    try {
      for (const file of files) {
        const fd = new FormData();
        fd.append('file', file);
        const res = await fetch('/api/messagerie/upload', { method: 'POST', body: fd });
        const json = await res.json();
        if (res.ok && json.url) {
          setAttachments(prev => [...prev, { url: json.url, kind: json.kind, name: json.name }]);
        } else {
          alert(json.error || 'Erreur upload');
        }
      }
    } catch (err) {
      alert('Erreur upload : ' + err.message);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const removeAttach = (i) => setAttachments(prev => prev.filter((_, idx) => idx !== i));

  const handleSend = async () => {
    if (!canSend) return;
    setSending(true);
    try {
      const photos = attachments.filter(a => a.kind === 'photo').map(a => a.url);
      const files  = attachments.filter(a => a.kind !== 'photo').map(a => a.url);
      await onSend({
        content: text.trim() || null,
        mediaUrls: [...photos, ...files],
      });
      setText('');
      setAttachments([]);
      if (taRef.current) taRef.current.style.height = 'auto';
    } catch (err) {
      alert('Erreur envoi : ' + err.message);
    } finally {
      setSending(false);
    }
  };

  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Auto-resize textarea
  const handleTextChange = (e) => {
    setText(e.target.value);
    const ta = e.target;
    ta.style.height = 'auto';
    ta.style.height = Math.min(ta.scrollHeight, 140) + 'px';
  };

  return (
    <div className="chat-input">
      {attachments.length > 0 && (
        <div className="ci-attachments">
          {attachments.map((a, i) => (
            <div key={i} className="ci-attach">
              {a.kind === 'photo' ? (
                <img src={a.url} alt={a.name} />
              ) : (
                <span className="ci-attach-file">📎 {a.name?.slice(0, 20)}</span>
              )}
              <button type="button" onClick={() => removeAttach(i)} aria-label="Retirer">
                <X size={11} />
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="ci-row">
        <button
          type="button"
          className="ci-btn"
          onClick={() => fileInputRef.current?.click()}
          disabled={disabled || uploading}
          aria-label="Ajouter une pièce jointe"
          title="Ajouter une pièce jointe"
        >
          {uploading ? <Loader2 size={18} className="spin" /> : <Paperclip size={18} />}
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,application/pdf,.doc,.docx"
          multiple
          onChange={handleAttach}
          style={{ display: 'none' }}
        />

        {/* Bouton emoji picker */}
        <div className="ci-emoji-wrap" ref={emojiRef}>
          <button
            type="button"
            className={`ci-btn ${emojiOpen ? 'is-active' : ''}`}
            onClick={() => setEmojiOpen(o => !o)}
            disabled={disabled}
            aria-label="Insérer un emoji"
            title="Insérer un emoji"
          >
            <Smile size={18} />
          </button>
          {emojiOpen && (
            <div className="ci-emoji-picker">
              {EMOJI_CATEGORIES.map(cat => (
                <div key={cat.label} className="ci-emoji-cat">
                  <div className="ci-emoji-cat-label">{cat.label}</div>
                  <div className="ci-emoji-grid">
                    {cat.items.map(e => (
                      <button
                        key={e}
                        type="button"
                        className="ci-emoji-item"
                        onClick={() => insertEmoji(e)}
                        aria-label={e}
                      >
                        {e}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <textarea
          ref={taRef}
          className="ci-textarea"
          rows={1}
          value={text}
          onChange={handleTextChange}
          onKeyDown={handleKey}
          placeholder={placeholder}
          disabled={disabled}
          maxLength={4000}
        />

        <button
          type="button"
          className="ci-btn ci-send"
          onClick={handleSend}
          disabled={!canSend || disabled}
          aria-label="Envoyer"
        >
          {sending ? <Loader2 size={18} className="spin" /> : <Send size={18} />}
        </button>
      </div>

      <style>{`
        .chat-input {
          padding: 8px 10px;
          background: white;
          border-top: 1px solid var(--border);
        }
        .ci-attachments {
          display: flex; gap: 6px; flex-wrap: wrap;
          padding-bottom: 8px;
        }
        .ci-attach {
          position: relative;
          border: 1px solid var(--border); border-radius: 8px;
          background: var(--bg-soft, #faf8f5);
          padding: 4px;
        }
        .ci-attach img {
          width: 60px; height: 60px; object-fit: cover; border-radius: 4px;
          display: block;
        }
        .ci-attach-file {
          padding: 8px 12px; font-size: 0.75rem;
        }
        .ci-attach button {
          position: absolute; top: -6px; right: -6px;
          width: 18px; height: 18px; border-radius: 50%;
          background: var(--text-primary); color: white;
          border: 2px solid white;
          cursor: pointer;
          display: flex; align-items: center; justify-content: center;
        }

        .ci-row {
          display: flex; align-items: flex-end; gap: 6px;
        }
        .ci-textarea {
          flex: 1;
          padding: 8px 12px;
          border-radius: 16px;
          border: 1px solid var(--border);
          background: var(--bg-soft, #faf8f5);
          font-size: 0.875rem;
          font-family: inherit;
          resize: none;
          outline: none;
          line-height: 1.4;
          min-height: 38px;
          max-height: 140px;
        }
        .ci-textarea:focus { border-color: var(--brand); background: white; }
        .ci-textarea:disabled { opacity: 0.5; }

        .ci-btn {
          width: 38px; height: 38px;
          border-radius: 50%;
          border: none; background: transparent;
          color: var(--text-secondary);
          cursor: pointer; flex-shrink: 0;
          display: flex; align-items: center; justify-content: center;
        }
        .ci-btn:hover:not(:disabled) { background: var(--bg-soft, #faf8f5); }
        .ci-btn:disabled { opacity: 0.4; cursor: not-allowed; }
        .ci-btn.is-active { background: var(--brand-light, #fef0dc); color: var(--brand); }

        /* Emoji picker (sans dépendance) */
        .ci-emoji-wrap { position: relative; flex-shrink: 0; }
        .ci-emoji-picker {
          position: absolute;
          bottom: calc(100% + 8px);
          left: 0;
          width: 320px;
          max-height: 340px;
          overflow-y: auto;
          background: white;
          border: 1px solid var(--border);
          border-radius: 14px;
          box-shadow: 0 12px 40px rgba(0,0,0,0.14);
          padding: 10px;
          z-index: 50;
          animation: ci-emoji-pop 0.16s cubic-bezier(0.22, 1, 0.36, 1);
        }
        @keyframes ci-emoji-pop {
          from { opacity: 0; transform: scale(0.95) translateY(6px); }
          to   { opacity: 1; transform: scale(1) translateY(0); }
        }
        .ci-emoji-cat { margin-bottom: 8px; }
        .ci-emoji-cat:last-child { margin-bottom: 0; }
        .ci-emoji-cat-label {
          font-size: 0.6875rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.1em;
          color: var(--text-muted);
          margin-bottom: 6px;
          padding: 0 4px;
        }
        .ci-emoji-grid {
          display: grid;
          grid-template-columns: repeat(8, 1fr);
          gap: 2px;
        }
        .ci-emoji-item {
          width: 34px; height: 34px;
          border: none; background: transparent;
          border-radius: 8px;
          font-size: 1.25rem;
          cursor: pointer;
          display: flex; align-items: center; justify-content: center;
          transition: background 0.12s ease, transform 0.12s ease;
        }
        .ci-emoji-item:hover {
          background: var(--bg-soft, #faf8f5);
          transform: scale(1.2);
        }
        @media (max-width: 480px) {
          .ci-emoji-picker { width: calc(100vw - 32px); left: -56px; }
        }

        .ci-send {
          background: var(--brand); color: white;
        }
        .ci-send:hover:not(:disabled) { background: var(--brand-dark, var(--brand)); }
        .ci-send:disabled { background: var(--text-muted); opacity: 0.5; }

        @keyframes ci-spin { to { transform: rotate(360deg); } }
        .spin { animation: ci-spin 0.8s linear infinite; }
      `}</style>
    </div>
  );
}
