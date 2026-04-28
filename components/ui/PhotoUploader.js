'use client';

import { useRef, useState } from 'react';
import { Upload, Loader2, Trash2, ImageIcon } from 'lucide-react';

const MAX_DIMENSION = 1024;        // px — resize côté client avant upload
const MAX_BYTES_AVANT = 8 * 1024 * 1024; // 8 Mo (avant resize)
const QUALITY = 0.85;

/**
 * Uploader d'image avec resize automatique côté client.
 * - Limite avant upload : 8 Mo (souvent un iPhone fait 2-5 Mo)
 * - Resize en canvas à MAX_DIMENSION (1024 max sur le plus grand côté)
 * - Encode JPEG qualité 0.85 → fichier final ~100-300 Ko
 * - POST vers /api/profile/upload-photo?kind=profil
 *
 * Props:
 *   currentUrl     : string|null     URL actuelle de la photo
 *   kind           : 'profil'|'couverture'
 *   onUploaded(url): callback après upload réussi (pour mettre à jour le state parent)
 *   label          : texte du bouton si pas de photo
 */
export default function PhotoUploader({ currentUrl, kind = 'profil', onUploaded, label = 'Téléverser une photo' }) {
  const inputRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [previewLocal, setPreviewLocal] = useState(null);

  const onPick = () => inputRef.current?.click();

  const onChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError('');

    if (!file.type.startsWith('image/')) {
      setError('Choisis un fichier image (JPG, PNG, WebP).');
      return;
    }
    if (file.size > MAX_BYTES_AVANT) {
      setError(`Fichier trop lourd (${Math.round(file.size / 1024 / 1024)} Mo, max ${MAX_BYTES_AVANT / 1024 / 1024} Mo).`);
      return;
    }

    setUploading(true);
    try {
      // Preview local instantané
      const localUrl = URL.createObjectURL(file);
      setPreviewLocal(localUrl);

      // Resize via canvas
      const resizedBlob = await resizeImage(file);
      const resizedFile = new File([resizedBlob], file.name.replace(/\.[^.]+$/, '.jpg'), { type: 'image/jpeg' });

      // Upload
      const formData = new FormData();
      formData.append('file', resizedFile);
      const res = await fetch(`/api/profile/upload-photo?kind=${kind}`, { method: 'POST', body: formData });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Erreur upload');

      onUploaded?.(json.url);
      setPreviewLocal(null); // on bascule sur la vraie URL
      URL.revokeObjectURL(localUrl);
    } catch (err) {
      setError(err.message);
      setPreviewLocal(null);
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const onRemove = async () => {
    if (!confirm('Supprimer cette photo ?')) return;
    onUploaded?.(null);
  };

  const displayedUrl = previewLocal || currentUrl;

  return (
    <div className="photo-uploader">
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={onChange}
        style={{ display: 'none' }}
      />

      <div className="photo-uploader-preview">
        {displayedUrl ? (
          <img src={displayedUrl} alt="Aperçu" />
        ) : (
          <div className="photo-uploader-empty">
            <ImageIcon size={28} />
          </div>
        )}
        {uploading && (
          <div className="photo-uploader-overlay">
            <Loader2 size={20} className="spin" />
          </div>
        )}
      </div>

      <div className="photo-uploader-actions">
        <button type="button" onClick={onPick} disabled={uploading} className="izi-btn izi-btn-secondary">
          <Upload size={14} /> {currentUrl ? 'Changer' : label}
        </button>
        {currentUrl && !uploading && (
          <button type="button" onClick={onRemove} className="izi-btn izi-btn-ghost" title="Supprimer">
            <Trash2 size={14} />
          </button>
        )}
      </div>

      {error && <p className="photo-uploader-error">{error}</p>}

      <style jsx global>{`
        .photo-uploader {
          display: flex; flex-direction: column; gap: 10px; align-items: flex-start;
        }
        .photo-uploader-preview {
          position: relative;
          width: 120px; height: 120px; border-radius: 50%;
          background: var(--bg-soft, #faf8f5);
          border: 1.5px dashed var(--border);
          overflow: hidden;
          display: flex; align-items: center; justify-content: center;
        }
        .photo-uploader-preview img { width: 100%; height: 100%; object-fit: cover; }
        .photo-uploader-empty { color: var(--text-muted); }
        .photo-uploader-overlay {
          position: absolute; inset: 0;
          background: rgba(255,255,255,0.7);
          display: flex; align-items: center; justify-content: center;
          color: var(--brand);
        }
        .photo-uploader-actions { display: flex; gap: 6px; }
        .photo-uploader-error { font-size: 0.75rem; color: #dc2626; margin: 0; }
        @keyframes spin { to { transform: rotate(360deg); } }
        .spin { animation: spin 1s linear infinite; }
      `}</style>
    </div>
  );
}

// ─── Resize d'image via canvas ──────────────────────────────────────────────
function resizeImage(file) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      try {
        let { width, height } = img;
        // Calcul du redimensionnement : on garde le ratio, max MAX_DIMENSION sur le grand côté
        if (width > height && width > MAX_DIMENSION) {
          height = Math.round((height * MAX_DIMENSION) / width);
          width = MAX_DIMENSION;
        } else if (height > MAX_DIMENSION) {
          width = Math.round((width * MAX_DIMENSION) / height);
          height = MAX_DIMENSION;
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          (blob) => {
            URL.revokeObjectURL(url);
            if (!blob) return reject(new Error('Erreur de redimensionnement'));
            resolve(blob);
          },
          'image/jpeg',
          QUALITY
        );
      } catch (e) {
        URL.revokeObjectURL(url);
        reject(e);
      }
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Image illisible'));
    };
    img.src = url;
  });
}
