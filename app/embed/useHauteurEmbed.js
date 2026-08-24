'use client';

import { useEffect } from 'react';

/**
 * Auto-hauteur d'un bloc intégrable : poste { source, slug, height } au parent,
 * que public/widget.js applique à l'iframe. Partagé par le planning (B2g) et
 * les offres (v99) — deux copies auraient divergé, et une iframe mal mesurée
 * coupe le contenu sur le site de la prof sans que personne ne le voie.
 *
 * ⚠️ body.scrollHeight, PAS documentElement : dans une iframe, la hauteur du
 * documentElement ne descend jamais sous celle du viewport, donc l'embed
 * renvoyait la hauteur de l'iframe elle-même (700 → 700, jamais rétréci).
 *
 * Les images (vignettes v99) arrivent APRÈS le premier calcul. next/image
 * réserve la place d'avance, donc le ResizeObserver n'a en principe rien à
 * corriger, mais une image en échec, une police qui finit de charger ou un
 * navigateur qui ne réserve pas laisseraient l'iframe trop courte. On repose
 * donc la mesure à chaque image chargée, au load complet, et quand les polices
 * sont prêtes.
 */
export function useHauteurEmbed(slug) {
  useEffect(() => {
    const poster = () => {
      const h = Math.ceil(document.body.scrollHeight);
      if (!h) return;
      // Hauteur seule (rien de sensible) → targetOrigin '*' assumé ; le widget
      // côté hôte vérifie origine + source + forme avant d'appliquer.
      window.parent?.postMessage({ source: 'izisolo-embed', slug, height: h }, '*');
    };

    poster();
    const ro = new ResizeObserver(poster);
    ro.observe(document.body);

    // Capture : les événements load/error des <img> ne remontent pas.
    document.addEventListener('load', poster, true);
    document.addEventListener('error', poster, true);
    window.addEventListener('load', poster);
    document.fonts?.ready?.then(poster).catch(() => {});

    return () => {
      ro.disconnect();
      document.removeEventListener('load', poster, true);
      document.removeEventListener('error', poster, true);
      window.removeEventListener('load', poster);
    };
  }, [slug]);
}
