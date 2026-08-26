'use client';

// Sélecteur de pièces jointes pour les ANNONCES (modal « message aux
// participants » de la fiche cours + onglet Annoncer) — demande Maude
// 2026-07-30 : envoyer les photos de la veille à toutes les participantes.
// Le tuyau existait déjà de bout en bout (upload Blob → announce.media_urls →
// messages.media_urls → rendu bulles) : il ne manquait QUE ce bouton.
// Miroir de l'upload de ChatInput (même route, mêmes limites) — contrôlé par
// le parent : { attachments: [{url, kind, name}], onChange, disabled }.
import { useRef, useState } from 'react';
import { Paperclip, X, Loader2, FileText } from 'lucide-react';
import { useToast } from '@/components/ui/ToastProvider';

const MAX_FILE_MB = 5; // miroir de app/api/messagerie/upload

export default function AttachmentPicker({ attachments, onChange, disabled = false, max = 10 }) {
  const { toast } = useToast();
  const fileInputRef = useRef(null);
  const [uploading, setUploading] = useState(false);

  const handleAttach = async (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    setUploading(true);
    try {
      let next = attachments;
      for (const file of files) {
        if (next.length >= max) { toast.warning(`Maximum ${max} pièces jointes.`); break; }
        if (file.size > MAX_FILE_MB * 1024 * 1024) {
          toast.error(`« ${file.name} » dépasse ${MAX_FILE_MB} Mo : réduis-le avant de l'envoyer.`);
          continue;
        }
        const fd = new FormData();
        fd.append('file', file);
        const res = await fetch('/api/messagerie/upload', { method: 'POST', body: fd });
        const json = await res.json().catch(() => ({}));
        if (res.ok && json.url) {
          next = [...next, { url: json.url, kind: json.kind, name: json.name || file.name }];
          onChange(next);
        } else {
          toast.error(json.error || `Échec de l'envoi de « ${file.name} »`);
        }
      }
    } catch (err) {
      toast.error('Erreur upload : ' + err.message);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div className="ap-root">
      {attachments.length > 0 && (
        <div className="ap-list">
          {attachments.map((a, i) => (
            <div key={a.url} className="ap-item">
              {a.kind === 'photo'
                ? <img src={a.url} alt={a.name} />
                : <span className="ap-file"><FileText size={14} /> {a.name}</span>}
              <button type="button" className="ap-remove" onClick={() => onChange(attachments.filter((_, idx) => idx !== i))} aria-label={`Retirer ${a.name}`}>
                <X size={12} />
              </button>
            </div>
          ))}
        </div>
      )}
      <button
        type="button"
        className="ap-btn"
        onClick={() => fileInputRef.current?.click()}
        disabled={disabled || uploading}
      >
        {uploading ? <Loader2 size={15} className="ap-spin" /> : <Paperclip size={15} />}
        {uploading ? 'Envoi…' : 'Joindre des photos ou fichiers'}
      </button>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif,application/pdf,.doc,.docx"
        multiple
        hidden
        onChange={handleAttach}
      />
      <style jsx>{`
        .ap-root { margin: 4px 0 10px; }
        .ap-list { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 8px; }
        .ap-item {
          position: relative; border: 1px solid var(--border, #e4ddd2);
          border-radius: 10px; overflow: hidden; background: var(--bg-card, #fff);
        }
        .ap-item img { width: 64px; height: 64px; object-fit: cover; display: block; }
        .ap-file {
          display: inline-flex; align-items: center; gap: 6px;
          padding: 8px 10px; font-size: 0.75rem; max-width: 180px;
          overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
        }
        .ap-remove {
          position: absolute; top: 2px; right: 2px;
          width: 18px; height: 18px; border-radius: 50%;
          background: rgba(0, 0, 0, 0.55); color: #fff; border: none;
          display: flex; align-items: center; justify-content: center; cursor: pointer;
        }
        .ap-btn {
          display: inline-flex; align-items: center; gap: 7px;
          padding: 7px 12px; border-radius: 10px; cursor: pointer;
          border: 1px dashed var(--border, #d8d0c4); background: transparent;
          color: var(--text-secondary, #6b6560); font-size: 0.8125rem; font-weight: 600;
        }
        .ap-btn:hover:not(:disabled) { border-color: var(--brand, #b87333); color: var(--brand-700, #7a4a1e); }
        .ap-btn:disabled { opacity: 0.6; cursor: wait; }
        .ap-spin { animation: ap-rot 1s linear infinite; }
        @keyframes ap-rot { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
