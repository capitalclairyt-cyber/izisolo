'use client';

import { useState } from 'react';
import { Link2, Copy, Check, Ban, Loader2 } from 'lucide-react';
import { useToast } from '@/components/ui/ToastProvider';

/**
 * Le lien permanent d'une intervenante (v111, lot 1 Associations & Studios).
 *
 * Une prof de la structure qui n'a pas de compte travaille par ce lien : ses
 * séances, leur pointage, rien d'autre. Le jeton n'est affiché qu'UNE fois,
 * à la création, comme une clé d'API ; ensuite l'écran ne montre que l'état
 * (actif jusqu'à la fin de la saison, désactivé, expiré) et l'usage.
 */
export default function LienIntervenante({ membre, onMaj }) {
  const { toast } = useToast();
  const [envoi, setEnvoi] = useState(false);
  const [url, setUrl] = useState(null);
  const [copie, setCopie] = useState(false);

  const creer = async () => {
    if (membre.lien === 'actif' && !confirm("Un nouveau lien remplace l'ancien : l'ancien ne marchera plus. Continuer ?")) return;
    setEnvoi(true);
    try {
      const res = await fetch(`/api/equipe/${membre.id}/lien`, { method: 'POST' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { toast.error(data.error || "Le lien n'a pas pu être créé."); return; }
      setUrl(data.url);
      onMaj?.(data.membre);
    } catch {
      toast.error("Le lien n'a pas pu être créé, réessaie.");
    } finally {
      setEnvoi(false);
    }
  };

  const revoquer = async () => {
    if (!confirm('Désactiver ce lien ? Elle ne pourra plus ouvrir ses séances par ce chemin.')) return;
    setEnvoi(true);
    try {
      const res = await fetch(`/api/equipe/${membre.id}/lien`, { method: 'DELETE' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { toast.error(data.error || 'Révocation impossible.'); return; }
      setUrl(null);
      onMaj?.(data.membre);
      toast.success('Lien désactivé.');
    } finally {
      setEnvoi(false);
    }
  };

  const copier = async () => {
    try { await navigator.clipboard.writeText(url); setCopie(true); setTimeout(() => setCopie(false), 2000); }
    catch { /* le champ reste sélectionnable à la main */ }
  };

  const expire = membre.lien_expire_at ? new Date(membre.lien_expire_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }) : null;

  return (
    <div className="li-bloc" data-testid="lien-intervenante" data-etat={membre.lien}>
      {url ? (
        <div className="li-url">
          <p className="li-avert">Voici son lien. <strong>Il ne sera plus jamais affiché</strong> : copie-le maintenant et envoie-le-lui (SMS, message). Il vaut jusqu'au {expire || 'bout de la saison'}.</p>
          <div className="li-url-ligne">
            <input readOnly value={url} onFocus={e => e.target.select()} data-testid="lien-intervenante-url" />
            <button type="button" className="izi-btn btn-sm izi-btn-primary" onClick={copier}>
              {copie ? <Check size={14} /> : <Copy size={14} />} {copie ? 'Copié' : 'Copier'}
            </button>
          </div>
        </div>
      ) : (
        <div className="li-etat">
          <Link2 size={14} />
          {membre.lien === 'actif' && <span>Lien actif jusqu'au {expire}{membre.lien_usages ? ` · ouvert ${membre.lien_usages} fois` : ' · jamais ouvert'}</span>}
          {membre.lien === 'revoque' && <span>Lien désactivé</span>}
          {membre.lien === 'expire' && <span>Lien expiré avec la saison</span>}
          {membre.lien === 'aucun' && <span>Pas de lien : elle entre avec son compte, ou pas du tout</span>}
        </div>
      )}
      <div className="li-actions">
        <button type="button" className="izi-btn btn-sm izi-btn-ghost" onClick={creer} disabled={envoi}>
          {envoi ? <Loader2 size={14} className="eq-spin" /> : <Link2 size={14} />}
          {membre.lien === 'actif' ? 'Nouveau lien' : membre.lien === 'aucun' ? 'Créer son lien (sans compte)' : 'Renouveler le lien'}
        </button>
        {membre.lien === 'actif' && (
          <button type="button" className="izi-btn btn-sm izi-btn-ghost li-revoquer" onClick={revoquer} disabled={envoi}>
            <Ban size={14} /> Désactiver
          </button>
        )}
      </div>
      <style jsx global>{`
        .li-bloc { margin-top: 8px; padding: 10px 12px; border-radius: 10px; background: var(--bg-soft, #faf8f5); border: 1px dashed rgba(0,0,0,.1); font-size: .84rem; }
        .li-etat { display: flex; align-items: center; gap: 8px; color: var(--text-soft, #7a6f6a); }
        .li-avert { margin: 0 0 8px; color: #92400e; background: #fffbeb; border: 1px solid #fde68a; padding: 8px 10px; border-radius: 8px; line-height: 1.45; }
        .li-url-ligne { display: flex; gap: 8px; }
        .li-url-ligne input { flex: 1; padding: 8px 10px; border-radius: 8px; border: 1px solid rgba(0,0,0,.15); font: inherit; font-size: .8rem; }
        .li-actions { display: flex; gap: 8px; flex-wrap: wrap; margin-top: 8px; }
        .li-revoquer { color: #b42318; }
      `}</style>
    </div>
  );
}
