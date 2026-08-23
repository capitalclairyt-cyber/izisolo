'use client';

import { useEffect } from 'react';

/**
 * RegisterSW — enregistre le service worker de next-pwa. NOUS-MÊMES.
 *
 * Découverte 2026-08-23 (enquête « les push ne marchent pas ») : next-pwa@5.6
 * avec `register: true` injecte son auto-register dans l'entry webpack `main`
 * (celle du Pages Router). Cette app est 100 % App Router : les pages ne
 * chargent que `main-app-*.js` — le chunk `main-*.js` qui porte le register
 * n'est référencé par AUCUNE page. Résultat : sw.js était généré, servi (200),
 * jamais ENREGISTRÉ. Chez personne, depuis toujours.
 *
 * Conséquences réparées par ce composant :
 *   - `navigator.serviceWorker.ready` pendait éternellement → PushToggle et
 *     PushPrompt restaient invisibles → 0 abonnement Web Push en prod ;
 *   - le mode hors-ligne (precache workbox) n'avait jamais fonctionné.
 *
 * Monté dans app/layout.js (racine) : dashboard, portail élève et admin ont
 * le MÊME sw.js à scope « / » — c'est le design d'origine, enfin branché.
 * En dev, next-pwa est désactivé (pas de /sw.js) : on ne tente rien.
 */
export default function RegisterSW() {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production') return;
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;
    navigator.serviceWorker
      .register('/sw.js')
      .catch((e) => console.warn('[pwa] register sw.js:', e?.message || e));
  }, []);
  return null;
}
