'use client';

/**
 * UnsavedChangesGuard — protège un formulaire avec modifs non sauvegardées
 * contre la navigation accidentelle (bouton retour navigateur, fermeture
 * onglet, refresh).
 *
 * Comportement :
 *   - Si `dirty=true` :
 *     - Push un state dans l'history pour intercepter le bouton retour
 *     - Listen popstate → affiche un modal pretty
 *     - Listen beforeunload → dialog natif (tab close / refresh)
 *   - Modal "Quitter ?" avec 2 actions : Rester / Quitter sans enregistrer
 *
 * Pour fermer la guard programmatiquement (après save réussi) :
 *   passer dirty=false, le composant cleanup tout seul.
 *
 * Props :
 *   dirty (bool)
 *   onConfirmLeave (fn) — optionnel, callback exécuté quand l'utilisateur
 *                         choisit "Quitter sans enregistrer"
 */

import { useEffect, useRef, useState } from 'react';
import { AlertTriangle } from 'lucide-react';

export default function UnsavedChangesGuard({ dirty, onConfirmLeave }) {
  const [showModal, setShowModal] = useState(false);
  const leavingRef = useRef(false); // flag pour distinguer un retour autorisé

  useEffect(() => {
    if (!dirty) {
      leavingRef.current = false;
      return;
    }

    // 1. Push un state pour que le bouton retour déclenche popstate (sinon
    //    l'utilisateur quitte directement vers la page précédente).
    history.pushState({ izUnsavedGuard: true }, '', location.href);

    const popHandler = () => {
      if (leavingRef.current) return;
      // Bloquer en re-pushant le state, puis afficher la modale
      history.pushState({ izUnsavedGuard: true }, '', location.href);
      setShowModal(true);
    };
    window.addEventListener('popstate', popHandler);

    // 2. Tab close / refresh / external link
    const beforeHandler = (e) => {
      e.preventDefault();
      e.returnValue = '';
      return '';
    };
    window.addEventListener('beforeunload', beforeHandler);

    return () => {
      window.removeEventListener('popstate', popHandler);
      window.removeEventListener('beforeunload', beforeHandler);
    };
  }, [dirty]);

  const handleStay = () => {
    setShowModal(false);
  };

  const handleLeave = () => {
    leavingRef.current = true;
    setShowModal(false);
    onConfirmLeave?.();
    // Petit délai pour laisser le parent reset son state si besoin, puis on
    // quitte vraiment via history.back()
    setTimeout(() => history.back(), 30);
  };

  if (!showModal) return null;

  return (
    <div className="ucg-bd" role="dialog" aria-modal="true" aria-labelledby="ucg-title">
      <div className="ucg-modal" onClick={(e) => e.stopPropagation()}>
        <div className="ucg-icon">
          <AlertTriangle size={22} />
        </div>
        <h2 id="ucg-title" className="ucg-title">Modifications non enregistrées</h2>
        <p className="ucg-desc">
          Tu as fait des changements qui n'ont pas été enregistrés. Si tu pars maintenant,
          tu vas les perdre.
        </p>
        <div className="ucg-actions">
          <button
            type="button"
            onClick={handleStay}
            className="ucg-btn ucg-btn-primary"
            autoFocus
          >
            Rester sur la page
          </button>
          <button
            type="button"
            onClick={handleLeave}
            className="ucg-btn ucg-btn-ghost"
          >
            Quitter sans enregistrer
          </button>
        </div>
      </div>

      <style jsx>{`
        .ucg-bd {
          position: fixed; inset: 0;
          background: rgba(30, 20, 15, 0.55);
          z-index: 100;
          display: flex; align-items: center; justify-content: center;
          padding: 24px;
          animation: ucg-fade .2s ease-out;
          backdrop-filter: blur(2px);
        }
        @keyframes ucg-fade { from { opacity: 0; } }

        .ucg-modal {
          background: #faf6f0;
          border-radius: 20px;
          width: 100%;
          max-width: 380px;
          padding: 26px 24px 22px;
          box-shadow: 0 20px 60px rgba(30, 20, 15, 0.30);
          text-align: center;
          animation: ucg-pop .25s cubic-bezier(.2,.8,.3,1.05);
        }
        @keyframes ucg-pop {
          from { transform: translateY(20px) scale(0.95); opacity: 0; }
          to   { transform: translateY(0) scale(1); opacity: 1; }
        }
        .ucg-icon {
          width: 52px; height: 52px;
          margin: 0 auto 14px;
          border-radius: 50%;
          background: var(--tone-sand-bg, #f5ebd8);
          color: var(--tone-sand-ink, #8a6a3d);
          display: flex; align-items: center; justify-content: center;
        }
        .ucg-title {
          font-size: 1.1rem; font-weight: 700;
          color: #1a1a2e;
          margin: 0 0 8px;
        }
        .ucg-desc {
          font-size: 0.875rem; color: #6b6359;
          margin: 0 0 22px;
          line-height: 1.5;
        }
        .ucg-actions {
          display: flex; flex-direction: column; gap: 8px;
        }
        .ucg-btn {
          padding: 11px 16px;
          font-size: 0.9rem; font-weight: 600;
          border-radius: 12px;
          border: 1.5px solid transparent;
          cursor: pointer;
          transition: all .15s;
          width: 100%;
        }
        .ucg-btn-primary {
          background: var(--brand, #d4a0a0);
          color: white;
        }
        .ucg-btn-primary:hover { background: var(--brand-dark, #b07878); }
        .ucg-btn-ghost {
          background: transparent;
          color: var(--text-secondary, #6b6359);
          border-color: var(--border, #e8e2da);
        }
        .ucg-btn-ghost:hover { color: #c47070; border-color: #c47070; }
      `}</style>
    </div>
  );
}
