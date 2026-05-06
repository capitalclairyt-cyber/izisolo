'use client';

import { useEffect } from 'react';

/**
 * Fallback JS pour les .reveal en navigateurs sans `animation-timeline: view()`
 * (Safari < 26 et anciens Firefox). Utilise IntersectionObserver pour ajouter
 * la classe .is-revealed quand l'élément entre dans le viewport.
 *
 * En navigateur moderne (Chrome 115+ / Safari 26+ / Edge 115+), le CSS pur
 * @supports (animation-timeline: view()) {} prend la main et ce composant
 * ne fait rien (CSS gère tout).
 *
 * Doit être monté UNE SEULE FOIS dans la landing (cf. Landing.js).
 */
export default function ScrollReveal() {
  useEffect(() => {
    // Détection de support : si animation-timeline est supporté, ne rien faire
    if (typeof CSS !== 'undefined' && CSS.supports && CSS.supports('animation-timeline', 'view()')) {
      return;
    }

    // Sinon : on observe les .reveal et on ajoute .is-revealed quand visible
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-revealed');
            observer.unobserve(entry.target); // une fois révélé, plus besoin
          }
        });
      },
      {
        threshold: 0.15,
        rootMargin: '0px 0px -10% 0px', // déclenche un peu avant que ça touche le bas
      }
    );

    const elements = document.querySelectorAll('.reveal');
    elements.forEach((el) => observer.observe(el));

    return () => observer.disconnect();
  }, []);

  return null; // ce composant ne rend rien
}
