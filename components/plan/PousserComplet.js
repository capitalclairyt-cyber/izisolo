'use client';

import Link from 'next/link';
import { Eye, Sparkles, X } from 'lucide-react';
import { useEffect, useState } from 'react';

/**
 * La carte qui pousse vers Complet, sur le tableau de bord (2026-09-16).
 *
 * Pourquoi elle existe : jusqu'ici, la frontière Essentiel / Complet se voyait
 * par un cadenas dans la nav et une page « il te faut Complet ». C'est « tu ne
 * peux pas ». Ce qui décide une prof, c'est de voir ce qui se passe CHEZ ELLE :
 * combien de personnes ouvrent sa page publique sans pouvoir réserver, et ce
 * que ses élèves ont fait pendant les trente jours d'essai.
 *
 * Deux messages, jamais les deux à la fois (le bilan d'essai prime : il est
 * daté, il expire) :
 *   · `bilan`  → ce que ses élèves ont fait pendant l'essai, chiffré ;
 *   · `vues`   → sa page a été ouverte N fois, personne n'a pu réserver.
 *
 * Fermable, et la fermeture tient une semaine par navigateur : une carte de
 * vente qui revient chaque matin devient un bandeau publicitaire, et on perd
 * le droit de parler.
 */

const CLE = 'izi_pousser_complet_ferme';
const SEMAINE = 7 * 24 * 3600 * 1000;

export default function PousserComplet({ vues = null, bilan = null }) {
  const [ferme, setFerme] = useState(true);

  useEffect(() => {
    try {
      const jusqua = Number(localStorage.getItem(CLE) || 0);
      setFerme(Number.isFinite(jusqua) && jusqua > Date.now());
    } catch {
      setFerme(false);
    }
  }, []);

  const fermer = () => {
    setFerme(true);
    try { localStorage.setItem(CLE, String(Date.now() + SEMAINE)); } catch { /* rien */ }
  };

  if (ferme || (!vues && !bilan)) return null;
  const estBilan = !!bilan;

  return (
    <div className="pc">
      <button type="button" className="pc-fermer" onClick={fermer} aria-label="Masquer">
        <X size={16} />
      </button>

      <div className="pc-tete">
        <span className="pc-icone">{estBilan ? <Sparkles size={18} /> : <Eye size={18} />}</span>
        <strong>{estBilan ? bilan.titre : vues.titre}</strong>
      </div>

      {estBilan ? (
        <>
          {bilan.lignes.length > 0 && (
            <ul className="pc-liste">
              {bilan.lignes.map((l) => <li key={l.cle}>{l.texte}</li>)}
            </ul>
          )}
          <p className="pc-texte">{bilan.conclusion}</p>
        </>
      ) : (
        <>
          <p className="pc-texte">{vues.texte}</p>
          <p className="pc-note">{vues.note}</p>
        </>
      )}

      <div className="pc-actions">
        <Link href="/parametres/abonnement" className="pc-cta">
          {estBilan ? 'Garder Complet' : 'Voir ce que Complet change'}
        </Link>
        {!estBilan && <Link href="/parametres/page" className="pc-lien">Voir ma page publique</Link>}
      </div>

      <style jsx>{`
        .pc {
          position: relative;
          background: linear-gradient(150deg, #f3eff9 0%, #eef3ec 100%);
          border: 1px solid #ded3f0;
          border-radius: 16px;
          padding: 18px 44px 18px 18px;
          margin-bottom: 20px;
        }
        .pc-fermer {
          position: absolute; top: 10px; right: 10px;
          background: none; border: 0; cursor: pointer;
          color: var(--text-muted); padding: 4px; border-radius: 8px; line-height: 0;
        }
        .pc-fermer:hover { background: rgba(0,0,0,0.05); }
        .pc-tete { display: flex; align-items: center; gap: 10px; margin-bottom: 8px; }
        .pc-tete strong { font-size: 1.02rem; color: var(--text-primary); line-height: 1.3; }
        .pc-icone { color: #6b4f92; display: flex; flex: 0 0 auto; }
        .pc-texte { margin: 0; color: var(--text-secondary); font-size: 0.94rem; line-height: 1.55; }
        .pc-note { margin: 8px 0 0; color: var(--text-muted); font-size: 0.8rem; line-height: 1.5; }
        .pc-liste { margin: 8px 0 10px; padding-left: 18px; color: var(--text-secondary); font-size: 0.94rem; line-height: 1.7; }
        .pc-actions { display: flex; flex-wrap: wrap; align-items: center; gap: 14px; margin-top: 14px; }
        .pc-cta {
          display: inline-block; padding: 10px 20px; border-radius: 999px;
          background: var(--brand); color: #fff; font-weight: 600; font-size: 0.92rem;
          text-decoration: none;
        }
        .pc-cta:hover { background: var(--brand-dark); }
        .pc-lien { font-size: 0.88rem; color: var(--text-secondary); text-decoration: underline; }
        @media (max-width: 600px) {
          .pc { padding: 16px 40px 16px 16px; }
          .pc-cta { width: 100%; text-align: center; }
        }
      `}</style>
    </div>
  );
}
