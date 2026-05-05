'use client';

/**
 * UnsavedChangesGuard — protège un formulaire avec modifs non sauvegardées
 * contre la navigation accidentelle.
 *
 * 3 vecteurs de navigation interceptés :
 *   1. Bouton retour navigateur (popstate)
 *   2. Fermeture onglet / refresh / lien externe (beforeunload)
 *   3. Clic sur un lien interne Next.js (<a href="/...">) — manuel via
 *      addEventListener('click', ...) car Next.js App Router ne fournit
 *      PAS d'API officielle pour intercepter la navigation client-side.
 *
 * Modal "Modifications non enregistrées" avec 2 actions :
 *   - Rester sur la page (annule la navigation)
 *   - Quitter sans enregistrer (laisse passer + setDirty(false) via callback)
 *
 * Limite connue : ne couvre pas les navigations programmatiques via
 * router.push() depuis du code applicatif (rare en pratique car la plupart
 * des nav passent par <Link>). Si besoin un jour : monkey-patch
 * router.push() ou exposer un hook navigateGuarded() à utiliser à la place.
 *
 * Props :
 *   dirty (bool)         — true si modifs en attente de save
 *   onConfirmLeave (fn)  — callback exécuté quand l'utilisateur quitte
 *                          (typiquement setDirty(false) côté parent)
 */

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AlertTriangle } from 'lucide-react';

export default function UnsavedChangesGuard({ dirty, onConfirmLeave }) {
  const router = useRouter();
  const [showModal, setShowModal] = useState(false);
  // Navigation en attente après confirmation : { type: 'back' | 'link', href? }
  const [pendingNav, setPendingNav] = useState(null);
  const leavingRef = useRef(false); // flag : true = on autorise la nav suivante

  useEffect(() => {
    if (!dirty) {
      leavingRef.current = false;
      return;
    }

    // ── 1. Back button : push state pour intercepter popstate ──────────────
    history.pushState({ izUnsavedGuard: true }, '', location.href);

    const popHandler = () => {
      if (leavingRef.current) return;
      history.pushState({ izUnsavedGuard: true }, '', location.href);
      setPendingNav({ type: 'back' });
      setShowModal(true);
    };
    window.addEventListener('popstate', popHandler);

    // ── 2. Tab close / refresh / lien externe : beforeunload natif ────────
    const beforeHandler = (e) => {
      e.preventDefault();
      e.returnValue = '';
      return '';
    };
    window.addEventListener('beforeunload', beforeHandler);

    // ── 3. Clic sur lien interne Next.js (<a href="/...">) ────────────────
    // Capture phase pour intercepter AVANT que Next.js ne lance la
    // navigation client-side. Si l'user confirme, on relance via router.push.
    const clickHandler = (e) => {
      if (leavingRef.current) return;

      // Modifier keys (cmd/ctrl/shift click → nouvel onglet, on laisse passer)
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      // Bouton autre que clic gauche
      if (e.button !== 0) return;

      // Trouve le <a> parent (le clic peut être sur un <span> à l'intérieur)
      const anchor = e.target.closest('a');
      if (!anchor) return;

      // Cible un nouvel onglet → on laisse passer
      if (anchor.target && anchor.target !== '_self') return;

      // Pas de href, hash anchor, mailto, tel → ignore
      const href = anchor.getAttribute('href');
      if (!href || href.startsWith('mailto:') || href.startsWith('tel:') || href.startsWith('#')) {
        return;
      }

      // Résoudre l'URL
      let targetUrl;
      try {
        targetUrl = new URL(href, window.location.href);
      } catch {
        return;
      }

      // Lien externe (autre origine) → on laisse passer (beforeunload prend le relais)
      if (targetUrl.origin !== window.location.origin) return;

      // Même page (juste hash ou query identique) → on laisse passer
      if (
        targetUrl.pathname === window.location.pathname &&
        targetUrl.search === window.location.search
      ) {
        return;
      }

      // Lien interne : on intercepte
      e.preventDefault();
      e.stopPropagation();
      const internalPath = targetUrl.pathname + targetUrl.search + targetUrl.hash;
      setPendingNav({ type: 'link', href: internalPath });
      setShowModal(true);
    };
    document.addEventListener('click', clickHandler, true); // capture phase

    return () => {
      window.removeEventListener('popstate', popHandler);
      window.removeEventListener('beforeunload', beforeHandler);
      document.removeEventListener('click', clickHandler, true);
    };
  }, [dirty]);

  const handleStay = () => {
    setShowModal(false);
    setPendingNav(null);
  };

  const handleLeave = () => {
    leavingRef.current = true;
    setShowModal(false);
    onConfirmLeave?.();
    const nav = pendingNav;
    setPendingNav(null);
    // Petit délai pour laisser le parent reset son state si besoin
    setTimeout(() => {
      if (nav?.type === 'link' && nav.href) {
        router.push(nav.href);
      } else {
        history.back();
      }
    }, 30);
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
          background: var(--brand, #B87333);
          color: white;
        }
        .ucg-btn-primary:hover { background: var(--brand-dark, #8B5722); }
        .ucg-btn-ghost {
          background: transparent;
          color: var(--text-secondary, #6b6359);
          border-color: var(--border, #e8e2da);
        }
        .ucg-btn-ghost:hover { color: var(--danger, #C4574E); border-color: var(--danger, #C4574E); }
      `}</style>
    </div>
  );
}
