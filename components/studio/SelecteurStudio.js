'use client';

import { useState } from 'react';
import { Check, ChevronsUpDown, Loader2 } from 'lucide-react';
import { useStudios, useStudioId } from '@/components/studio/StudioProvider';

/**
 * Basculer d'un studio à l'autre (lot 3b).
 *
 * Ne s'affiche QUE pour qui appartient à plusieurs studios : une prof seule
 * n'a rien à choisir, et un menu qui ne mène qu'à soi-même est du bruit.
 *
 * Le rechargement complet est volontaire (`location.assign` plutôt qu'un
 * router.refresh) : changer de studio change TOUT ce que le serveur a rendu,
 * jusqu'aux compteurs de la nav. Rafraîchir à moitié laisserait deux studios
 * mélangés à l'écran, ce qui est exactement le genre de confusion qu'on
 * cherche à éviter quand on parle de données d'élèves.
 */
export default function SelecteurStudio() {
  const studios = useStudios();
  const studioId = useStudioId();
  const [ouvert, setOuvert] = useState(false);
  const [bascule, setBascule] = useState(null);

  if (!studios || studios.length < 2) return null;

  const actuel = studios.find(s => s.id === studioId) || studios[0];

  const basculer = async (id) => {
    if (id === studioId) { setOuvert(false); return; }
    setBascule(id);
    try {
      const res = await fetch('/api/studio-actif', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studioId: id }),
      });
      if (!res.ok) { setBascule(null); return; }
      window.location.assign('/dashboard');
    } catch {
      setBascule(null);
    }
  };

  return (
    <div className="sel-studio">
      <button type="button" className="sel-bouton" onClick={() => setOuvert(o => !o)} aria-expanded={ouvert}>
        <span className="sel-nom">{actuel?.nom}</span>
        <ChevronsUpDown size={14} />
      </button>

      {ouvert && (
        <ul className="sel-liste">
          {studios.map(s => (
            <li key={s.id}>
              <button type="button" onClick={() => basculer(s.id)} disabled={!!bascule}>
                {bascule === s.id
                  ? <Loader2 size={14} className="sel-spin" />
                  : <Check size={14} style={{ opacity: s.id === studioId ? 1 : 0 }} />}
                <span>{s.nom}</span>
              </button>
            </li>
          ))}
        </ul>
      )}

      <style jsx global>{`
        .sel-studio { position: relative; margin: 6px 0 2px; }
        .sel-bouton { display: flex; align-items: center; justify-content: space-between; gap: 8px;
          width: 100%; padding: 7px 10px; border-radius: 9px; cursor: pointer; font-family: inherit;
          background: rgba(0,0,0,.035); border: 1px solid rgba(0,0,0,.07); color: inherit; }
        .sel-nom { font-size: .82rem; font-weight: 600; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .sel-liste { position: absolute; z-index: 40; left: 0; right: 0; top: calc(100% + 4px);
          list-style: none; margin: 0; padding: 4px; border-radius: 11px; background: #fff;
          border: 1px solid rgba(0,0,0,.1); box-shadow: 0 8px 24px rgba(0,0,0,.1); }
        .sel-liste button { display: flex; align-items: center; gap: 8px; width: 100%; padding: 8px 9px;
          border: none; background: none; cursor: pointer; font-family: inherit; font-size: .84rem;
          color: inherit; text-align: left; border-radius: 8px; }
        .sel-liste button:hover { background: rgba(0,0,0,.04); }
        .sel-spin { animation: sel-rot 1s linear infinite; }
        @keyframes sel-rot { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
