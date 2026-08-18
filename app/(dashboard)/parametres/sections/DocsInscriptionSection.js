'use client';

// ════════════════════════════════════════════════════════════════════════════
// Section « Documents d'inscription » (v85, demande Patricia 2026-08-18) —
// questionnaire santé (QS-SPORT), CGV / règlement intérieur… La prof dépose
// jusqu'à MAX_DOCS PDF (Vercel Blob via /api/documents/upload) ; les élèves
// les téléchargent sur le formulaire d'essai + dans leur espace avec la
// consigne « imprime et rapporte signé » (pas de signature électronique).
// La LISTE est sauvée par la carte 'docs' (profiles.docs_inscription).
// ════════════════════════════════════════════════════════════════════════════

import { useRef, useState } from 'react';
import { FileText, Upload, Trash2, ExternalLink, Loader2 } from 'lucide-react';
import { MAX_DOCS, sanitizeDocs } from '@/lib/docs-inscription';
import { useToast } from '@/components/ui/ToastProvider';

export default function DocsInscriptionSection({ profile, setProfile, setDirty }) {
  const { toast } = useToast();
  const fileRef = useRef(null);
  const [uploading, setUploading] = useState(false);

  const docs = sanitizeDocs(profile?.docs_inscription);

  const update = (nextDocs) => {
    setProfile(prev => ({ ...prev, docs_inscription: nextDocs }));
    setDirty(true);
  };

  const uploadDoc = async (file) => {
    if (!file) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch('/api/documents/upload', { method: 'POST', body: fd });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) { toast.error(j.error || 'Téléversement impossible'); return; }
      update([...docs, { url: j.url, nom: j.nom, ajoute_le: new Date().toISOString().slice(0, 10) }].slice(0, MAX_DOCS));
      toast.success('Document ajouté — pense à Enregistrer.');
    } catch (e) {
      toast.error('Téléversement impossible : ' + e.message);
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  return (
    <div className="section izi-card">
      <div className="section-top">
        <div className="section-icon"><FileText size={20} /></div>
        <h2>Documents d'inscription</h2>
      </div>
      <p className="section-desc">
        Questionnaire de santé (QS-SPORT), conditions générales, règlement intérieur…
        Tes élèves les téléchargent sur le <strong>formulaire d'essai</strong> et dans
        <strong> leur espace</strong>, avec la consigne de te les rapporter <strong>imprimés
        et signés</strong>. PDF, {MAX_DOCS} documents max.
      </p>

      {docs.length > 0 && (
        <div className="docs-liste">
          {docs.map((d, i) => (
            <div key={d.url} className="docs-row">
              <input
                className="izi-input docs-nom-input"
                value={d.nom}
                onChange={e => update(docs.map((x, j) => j === i ? { ...x, nom: e.target.value } : x))}
                placeholder="Nom affiché aux élèves"
                maxLength={80}
              />
              <a href={d.url} target="_blank" rel="noopener noreferrer" className="docs-voir" title="Voir le PDF">
                <ExternalLink size={15} />
              </a>
              <button
                type="button"
                className="docs-suppr"
                onClick={() => update(docs.filter((_, j) => j !== i))}
                title="Retirer ce document"
                aria-label="Retirer ce document"
              >
                <Trash2 size={15} />
              </button>
            </div>
          ))}
        </div>
      )}

      {docs.length < MAX_DOCS && (
        <>
          <input
            ref={fileRef}
            type="file"
            accept="application/pdf"
            style={{ display: 'none' }}
            onChange={e => uploadDoc(e.target.files?.[0])}
          />
          <button
            type="button"
            className="izi-btn izi-btn-secondary docs-add-btn"
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
          >
            {uploading ? <Loader2 size={16} className="spin" /> : <Upload size={16} />}
            {uploading ? 'Téléversement…' : 'Ajouter un PDF'}
          </button>
        </>
      )}
      {docs.length === 0 && (
        <p className="form-hint">
          💡 Le questionnaire officiel QS-SPORT se télécharge sur service-public.fr
          (cherche « QS-SPORT cerfa ») — dépose-le ici tel quel.
        </p>
      )}

      <style jsx>{`
        .docs-liste { display: flex; flex-direction: column; gap: 8px; margin-bottom: 10px; }
        .docs-row { display: flex; align-items: center; gap: 8px; }
        .docs-nom-input { flex: 1; }
        .docs-voir, .docs-suppr {
          flex-shrink: 0; width: 36px; height: 36px; border-radius: var(--radius-sm);
          display: flex; align-items: center; justify-content: center;
          border: 1px solid var(--border); background: var(--bg-card);
          color: var(--text-secondary); cursor: pointer;
        }
        .docs-voir:hover { color: var(--brand); border-color: var(--brand); }
        .docs-suppr:hover { color: var(--danger, #dc2626); border-color: var(--danger, #dc2626); }
        .docs-add-btn { align-self: flex-start; }
      `}</style>
    </div>
  );
}
