'use client';

import { useState, useEffect } from 'react';
import { FileSignature, Loader2, ExternalLink, Trash2, Upload } from 'lucide-react';
import { useToast } from '@/components/ui/ToastProvider';

const fmtJour = (d) => (d ? String(d).slice(0, 10).split('-').reverse().join('/') : '');

/**
 * Le contrat d'une intervenante (v114, lot 4 Associations & Studios) : un
 * document de la structure (type contrat, v113) rattaché à sa ligne d'équipe.
 * Un PDF ou une photo déposé scanné ; pas de signature électronique.
 * Chargé au premier dépli : la ligne d'équipe se charge déjà assez.
 */
export default function Contrat({ membre }) {
  const { toast } = useToast();
  const [ouvert, setOuvert] = useState(false);
  const [contrats, setContrats] = useState(null);
  const [indisponible, setIndisponible] = useState(false);
  const [upload, setUpload] = useState(false);

  useEffect(() => {
    if (!ouvert || contrats !== null) return;
    (async () => {
      const res = await fetch(`/api/equipe/${membre.id}/contrat`);
      const data = await res.json().catch(() => ({}));
      setContrats(data.contrats || []);
      setIndisponible(!!data.indisponible);
    })();
  }, [ouvert, contrats, membre.id]);

  const deposer = async (file) => {
    if (!file) return;
    setUpload(true);
    try {
      const fd = new FormData(); fd.append('file', file);
      const up = await fetch('/api/association/documents/upload', { method: 'POST', body: fd });
      const u = await up.json().catch(() => ({}));
      if (!up.ok) { toast.error(u.error || 'Téléversement impossible.'); return; }
      const res = await fetch(`/api/equipe/${membre.id}/contrat`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ url: u.url, titre: u.titre || 'Contrat', date_document: new Date().toLocaleDateString('sv-SE', { timeZone: 'Europe/Paris' }) }) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { toast.error(data.error || 'Enregistrement impossible.'); return; }
      setContrats(prev => [data.contrat, ...(prev || [])]);
      toast.success('Contrat déposé.');
    } finally { setUpload(false); }
  };

  const retirer = async (c) => {
    if (!confirm(`Retirer « ${c.titre} » ?`)) return;
    const res = await fetch(`/api/equipe/${membre.id}/contrat?document=${c.id}`, { method: 'DELETE' });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) { toast.error(data.error || 'Suppression impossible.'); return; }
    setContrats(prev => (prev || []).filter(x => x.id !== c.id));
    toast.success('Contrat retiré.');
  };

  return (
    <div className="ct-bloc" data-testid="contrat">
      <div className="ct-etat">
        <FileSignature size={14} />
        <button type="button" className="ct-lien" onClick={() => setOuvert(o => !o)} data-testid="contrat-ouvrir">{ouvert ? 'Masquer le contrat' : 'Contrat'}</button>
      </div>
      {ouvert && (
        <div className="ct-corps">
          {contrats === null ? <span className="ct-note"><Loader2 size={12} className="ct-spin" /> Chargement…</span> : (
            <>
              {indisponible && <span className="ct-note">Les contrats arrivent très bientôt : cette mise à jour n&apos;est pas encore appliquée.</span>}
              {contrats.map(c => (
                <span key={c.id} className="ct-ligne" data-testid="contrat-ligne">
                  <a href={c.url} target="_blank" rel="noopener" className="ct-lien"><ExternalLink size={12} /> {c.titre}{c.date_document ? ` (${fmtJour(c.date_document)})` : ''}</a>
                  <button type="button" className="ct-lien ct-danger" onClick={() => retirer(c)} title="Retirer"><Trash2 size={12} /></button>
                </span>
              ))}
              {!indisponible && contrats.length === 0 && <span className="ct-note">Aucun contrat déposé. Un contrat de prestation signé se dépose scanné (PDF ou photo).</span>}
              {!indisponible && (
                <label className="ct-upload">
                  <Upload size={12} /> {upload ? 'Dépôt en cours…' : 'Déposer un contrat'}
                  <input type="file" accept="application/pdf,image/jpeg,image/png,image/webp" onChange={e => deposer(e.target.files?.[0])} disabled={upload} data-testid="contrat-fichier" style={{ display: 'none' }} />
                </label>
              )}
            </>
          )}
        </div>
      )}
      <style jsx global>{`
        .ct-bloc { flex-basis: 100%; margin-top: 6px; font-size: .82rem; color: var(--text-soft, #7a6f6a); }
        .ct-etat { display: flex; align-items: center; gap: 8px; }
        .ct-lien { background: none; border: none; padding: 0; font: inherit; font-size: .8rem; color: var(--brand, #b87333); cursor: pointer; text-decoration: underline; display: inline-flex; align-items: center; gap: 4px; }
        .ct-danger { color: #b91c1c; text-decoration: none; }
        .ct-corps { display: flex; flex-direction: column; gap: 6px; margin-top: 6px; padding-left: 22px; }
        .ct-ligne { display: flex; gap: 10px; align-items: center; }
        .ct-note { font-size: .78rem; }
        .ct-upload { display: inline-flex; align-items: center; gap: 6px; cursor: pointer; color: var(--brand, #b87333); font-size: .8rem; text-decoration: underline; }
        .ct-spin { animation: ct-rot 1s linear infinite; }
        @keyframes ct-rot { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
