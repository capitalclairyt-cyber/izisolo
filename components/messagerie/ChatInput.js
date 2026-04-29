'use client';

import { useState, useRef } from 'react';
import { Send, Paperclip, X, Loader2, Image as ImageIcon } from 'lucide-react';

/**
 * ChatInput — barre de saisie d'un message + pièce jointe.
 *
 * Props :
 *   onSend(opts) — async, opts: { content, mediaUrls }
 *   disabled
 *   placeholder
 */
export default function ChatInput({ onSend, disabled = false, placeholder = "Écrire un message…" }) {
  const [text, setText] = useState('');
  const [attachments, setAttachments] = useState([]); // [{ url, kind, name }]
  const [uploading, setUploading] = useState(false);
  const [sending, setSending] = useState(false);
  const fileInputRef = useRef(null);
  const taRef = useRef(null);

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
