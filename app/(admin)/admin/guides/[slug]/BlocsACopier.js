'use client';

import { useEffect } from 'react';

// Les blocs de code écrits en ```texte dans un guide sont des textes PRÊTS À
// COLLER (légendes Insta, posts LinkedIn, réponses types) : ce composant leur
// pose un bouton « Copier » et les fait respirer comme du texte (retours à la
// ligne conservés, pas de défilement horizontal). Depuis un téléphone, un tap
// et le texte est dans le presse-papiers, emojis et sauts de ligne compris.
export default function BlocsACopier() {
  useEffect(() => {
    const blocs = document.querySelectorAll('.admin-md pre > code.language-texte');
    const nettoyages = [];
    blocs.forEach((code) => {
      const pre = code.parentElement;
      if (!pre || pre.dataset.copiable) return;
      pre.dataset.copiable = '1';
      pre.classList.add('admin-pre-texte');
      const bouton = document.createElement('button');
      bouton.type = 'button';
      bouton.className = 'admin-copier';
      bouton.textContent = 'Copier';
      const onClick = async () => {
        try {
          await navigator.clipboard.writeText(code.textContent.replace(/\n$/, ''));
          bouton.textContent = 'Copié ✓';
        } catch {
          bouton.textContent = 'Sélectionne et copie à la main';
        }
        setTimeout(() => { bouton.textContent = 'Copier'; }, 2500);
      };
      bouton.addEventListener('click', onClick);
      pre.appendChild(bouton);
      nettoyages.push(() => { bouton.removeEventListener('click', onClick); bouton.remove(); });
    });
    return () => nettoyages.forEach((n) => n());
  }, []);
  return null;
}
