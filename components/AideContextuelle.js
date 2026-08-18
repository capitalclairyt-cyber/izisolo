'use client';

import Link from 'next/link';
import { CircleHelp } from 'lucide-react';

/**
 * AideContextuelle — le « ? » contextuel des headers de pages (2026-08-18,
 * chantier « propulser le guide ») : un lien discret vers LE tuto de la page
 * (/aide#ancre). L'aide au moment et à l'endroit où la question naît, plutôt
 * qu'une page qu'il faut penser à visiter.
 *
 * Les ancres valides vivent dans app/(dashboard)/aide/page.js (SECTIONS) —
 * si une section est renommée, ses « ? » doivent suivre.
 *
 * @param {string} ancre    id de section du guide (ex : 'offres', 'pointage')
 * @param {string} [titre]  accessible/tooltip — défaut générique
 */
export default function AideContextuelle({ ancre, titre = 'Ouvrir le tuto de cette page' }) {
  return (
    <Link href={`/aide#${ancre}`} className="aide-ctx" title={titre} aria-label={titre}>
      <CircleHelp size={17} />
      <style jsx>{`
        .aide-ctx {
          display: inline-flex; align-items: center; justify-content: center;
          width: 28px; height: 28px; border-radius: 50%; flex-shrink: 0;
          color: var(--text-muted); transition: color 0.15s, background 0.15s;
        }
        .aide-ctx:hover { color: var(--brand); background: var(--brand-light, #f7efe6); }
      `}</style>
    </Link>
  );
}
