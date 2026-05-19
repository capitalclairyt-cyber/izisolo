'use client';

import { useRef, useState, useEffect, useCallback } from 'react';
import { Upload, Loader2, Trash2, Image as ImageIcon, Move } from 'lucide-react';

const MAX_DIMENSION = 1920;
const MAX_BYTES_AVANT = 8 * 1024 * 1024; // 8 Mo
const QUALITY = 0.85;

/**
 * Editeur de photo de couverture avec point focal ajustable.
 *
 * UX : drag vertical (ou slider) pour choisir quelle zone de la photo est
 * visible quand elle est cadrée en format paysage. Le dégradé du bas est
 * affiché en preview pour que la prof visualise comment ça rendra sur sa
 * page publique.
 *
 * Props :
 *   currentUrl     : URL actuelle (ou null)
 *   focalY         : 0-100 (position verticale du point focal, 50 = centre)
 *   studioNom      : pour l'overlay preview
 *   metier         : pour l'overlay preview
 *   onUploaded(url): callback après upload réussi
 *   onFocalChange(y) : callback quand focalY change
 */
export default function CoverPhotoEditor({
  currentUrl,
  focalY = 50,
  studioNom = '',
  metier = '',
  onUploaded,
  onFocalChange,
}) {
  const inputRef = useRef(null);
  const previewRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [previewLocal, setPreviewLocal] = useState(null);
  const [dragging, setDragging] = useState(false);
  const [localFocalY, setLocalFocalY] = useState(focalY);

  // Sync external focalY changes
  useEffect(() => { setLocalFocalY(focalY); }, [focalY]);

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
      setError(`Fichier trop lourd (max ${MAX_BYTES_AVANT / 1024 / 1024} Mo).`);
      return;
    }

    setUploading(true);
    try {
      const localUrl = URL.createObjectURL(file);
      setPreviewLocal(localUrl);

      const resizedBlob = await resizeImage(file);
      const resizedFile = new File([resizedBlob], file.name.replace(/\.[^.]+$/, '.jpg'), { type: 'image/jpeg' });

      const formData = new FormData();
      formData.append('file', resizedFile);
      const res = await fetch('/api/profile/upload-photo?kind=couverture', { method: 'POST', body: formData });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Erreur upload');

      onUploaded?.(json.url);
      setPreviewLocal(null);
      URL.revokeObjectURL(localUrl);
    } catch (err) {
      setError(err.message);
      setPreviewLocal(null);
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const onRemove = () => {
    if (!confirm('Supprimer la photo de couverture ?')) return;
    onUploaded?.(null);
  };

  // ─── Drag du point focal (vertical uniquement) ──────────────────────
  const updateFocalFromEvent = useCallback((clientY) => {
    const el = previewRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const y = Math.max(0, Math.min(100, ((clientY - rect.top) / rect.height) * 100));
    const rounded = Math.round(y);
    setLocalFocalY(rounded);
    onFocalChange?.(rounded);
  }, [onFocalChange]);

  const onPointerDown = (e) => {
    if (!displayedUrl) return;
    e.preventDefault();
    setDragging(true);
    updateFocalFromEvent(e.clientY);
  };

  useEffect(() => {
    if (!dragging) return;
    const onMove = (e) => updateFocalFromEvent(e.clientY);
    const onUp = () => setDragging(false);
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
    };
  }, [dragging, updateFocalFromEvent]);

  const displayedUrl = previewLocal || currentUrl;

  return (
    <div className="cover-editor">
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={onChange}
        style={{ display: 'none' }}
      />

      {/* ─── Preview avec point focal + dégradé ───────────────────────── */}
      <div
        ref={previewRef}
        className={`cover-editor-preview ${dragging ? 'is-dragging' : ''} ${!displayedUrl ? 'is-empty' : ''}`}
        onPointerDown={onPointerDown}
        style={{ cursor: displayedUrl ? (dragging ? 'grabbing' : 'grab') : 'default' }}
      >
        {displayedUrl ? (
          <>
            <img
              src={displayedUrl}
              alt="Photo de couverture"
              draggable={false}
              style={{
                width: '100%', height: '100%',
                objectFit: 'cover',
                objectPosition: `50% ${localFocalY}%`,
              }}
            />
            {/* Dégradé du bas (preview de l'effet final) */}
            <div className="cover-editor-gradient" aria-hidden="true" />
            {/* Overlay nom + métier (preview du rendu page publique) */}
            {(studioNom || metier) && (
              <div className="cover-editor-overlay">
                {studioNom && <div className="cover-editor-overlay-nom">{studioNom}</div>}
                {metier && <div className="cover-editor-overlay-metier">{metier}</div>}
              </div>
            )}
            {/* Indicateur de point focal — ligne horizontale qui suit le drag */}
            <div
              className="cover-editor-focal-line"
              style={{ top: `${localFocalY}%` }}
              aria-hidden="true"
            >
              <span className="cover-editor-focal-handle">
                <Move size={11} />
              </span>
            </div>
          </>
        ) : (
          <div className="cover-editor-empty">
            <ImageIcon size={28} />
            <span>Pas encore de photo de couverture</span>
          </div>
        )}
        {uploading && (
          <div className="cover-editor-overlay-loading">
            <Loader2 size={22} className="spin" />
          </div>
        )}
      </div>

      {/* ─── Slider de secours (mobile + accessibilité) ──────────────── */}
      {displayedUrl && (
        <div className="cover-editor-slider-row">
          <span className="cover-editor-slider-label">Cadrage vertical</span>
          <input
            type="range"
            min={0}
            max={100}
            value={localFocalY}
            onChange={(e) => {
              const v = parseInt(e.target.value);
              setLocalFocalY(v);
              onFocalChange?.(v);
            }}
            className="cover-editor-slider"
            aria-label="Position verticale du point focal"
          />
          <span className="cover-editor-slider-value">{localFocalY}%</span>
        </div>
      )}

      <div className="cover-editor-actions">
        <button type="button" onClick={onPick} disabled={uploading} className="izi-btn izi-btn-secondary">
          <Upload size={14} /> {currentUrl ? 'Changer la photo' : 'Téléverser une photo'}
        </button>
        {currentUrl && !uploading && (
          <button type="button" onClick={onRemove} className="izi-btn izi-btn-ghost" title="Supprimer">
            <Trash2 size={14} />
          </button>
        )}
      </div>

      {error && <p className="cover-editor-error">{error}</p>}

      {displayedUrl && (
        <p className="form-hint" style={{ marginTop: 4 }}>
          🎯 Glisse la ligne verticalement (ou utilise le curseur) pour choisir la zone à mettre en avant.
        </p>
      )}

      <style jsx global>{`
        .cover-editor { display: flex; flex-direction: column; gap: 10px; }
        .cover-editor-preview {
          position: relative;
          width: 100%;
          aspect-ratio: 16 / 7;
          border-radius: 14px;
          background: var(--bg-soft, #faf8f5);
          border: 1.5px dashed var(--border);
          overflow: hidden;
          user-select: none;
          touch-action: none;
        }
        .cover-editor-preview.is-empty {
          border-style: dashed;
          background: linear-gradient(135deg, #faf8f5 0%, #fef0dc 100%);
        }
        .cover-editor-empty {
          position: absolute; inset: 0;
          display: flex; flex-direction: column;
          align-items: center; justify-content: center;
          gap: 8px;
          color: var(--text-muted);
          font-size: 0.875rem;
        }
        .cover-editor-gradient {
          position: absolute; left: 0; right: 0; bottom: 0;
          height: 55%;
          background: linear-gradient(to bottom,
            transparent 0%,
            rgba(0,0,0,0.05) 25%,
            rgba(0,0,0,0.35) 60%,
            rgba(0,0,0,0.65) 100%);
          pointer-events: none;
        }
        .cover-editor-overlay {
          position: absolute;
          left: 20px; right: 20px; bottom: 16px;
          color: white;
          pointer-events: none;
          text-shadow: 0 2px 14px rgba(0,0,0,0.4);
        }
        .cover-editor-overlay-nom {
          font-family: var(--font-display, 'Instrument Serif', serif);
          font-size: clamp(1.25rem, 4vw, 1.85rem);
          font-weight: 400;
          line-height: 1.1;
          letter-spacing: -0.01em;
        }
        .cover-editor-overlay-metier {
          font-size: 0.8125rem;
          font-weight: 500;
          text-transform: uppercase;
          letter-spacing: 0.1em;
          opacity: 0.92;
          margin-top: 3px;
        }
        .cover-editor-focal-line {
          position: absolute;
          left: 0; right: 0;
          height: 2px;
          background: rgba(255, 255, 255, 0.85);
          transform: translateY(-50%);
          pointer-events: none;
          box-shadow: 0 0 0 1px rgba(0,0,0,0.25);
        }
        .cover-editor-preview.is-dragging .cover-editor-focal-line {
          background: white;
          height: 3px;
        }
        .cover-editor-focal-handle {
          position: absolute;
          left: 50%; top: 50%;
          transform: translate(-50%, -50%);
          width: 24px; height: 24px;
          border-radius: 50%;
          background: white;
          color: var(--brand-700, #b87333);
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 2px 8px rgba(0,0,0,0.3);
          pointer-events: none;
        }
        .cover-editor-overlay-loading {
          position: absolute; inset: 0;
          background: rgba(255,255,255,0.75);
          display: flex; align-items: center; justify-content: center;
          color: var(--brand);
        }

        .cover-editor-slider-row {
          display: flex; align-items: center; gap: 10px;
          padding: 4px 0;
        }
        .cover-editor-slider-label {
          font-size: 0.75rem; color: var(--text-muted);
          font-weight: 600;
          min-width: 110px;
        }
        .cover-editor-slider {
          flex: 1;
          accent-color: var(--brand);
        }
        .cover-editor-slider-value {
          font-size: 0.75rem; color: var(--text-secondary);
          font-variant-numeric: tabular-nums;
          min-width: 40px;
          text-align: right;
        }

        .cover-editor-actions { display: flex; gap: 6px; flex-wrap: wrap; }
        .cover-editor-error { font-size: 0.75rem; color: #dc2626; margin: 0; }
        @keyframes spin { to { transform: rotate(360deg); } }
        .spin { animation: spin 1s linear infinite; }
      `}</style>
    </div>
  );
}

function resizeImage(file) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      try {
        let { width, height } = img;
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
