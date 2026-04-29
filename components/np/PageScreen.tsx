/**
 * PageHeader — ScreenHeader standalone qui s'insère en haut d'une page
 * existante sans casser son flow scroll natif.
 *
 * Usage minimal pour donner le look "Claude Design" à n'importe quelle page :
 *
 *   import { PageHeader } from '@/components/np';
 *
 *   <PageHeader title="Mes élèves" eyebrow="ÉLÈVES" actions={...} />
 *   {... contenu legacy de la page ...}
 *
 * Pas de wrapper flex/overflow → le scroll de la page reste celui du body.
 */
'use client';

import * as React from 'react';
import { Icon, type IconName } from './Icon';

export interface PageHeaderProps {
  /** Eyebrow mono uppercase au-dessus du titre */
  eyebrow?: string;
  /** Titre Fraunces principal */
  title: string;
  /** Actions à droite (boutons icônes circulaires) */
  actions?: React.ReactNode;
  /** Sous-titre meta sous le header (ex: "12 élèves actifs") */
  meta?: string;
}

export function PageHeader({ eyebrow, title, actions, meta }: PageHeaderProps) {
  return (
    <header className="np-page-hd">
      <div className="np-page-hd__top">
        <div>
          {eyebrow && <div className="np-hd__date">{eyebrow}</div>}
          <h1 className="np-hd__title">{title}</h1>
          {meta && <div className="np-page-hd__meta">{meta}</div>}
        </div>
        {actions && <div className="np-hd__actions">{actions}</div>}
      </div>
      <style jsx>{`
        .np-page-hd {
          padding: 16px 22px 14px;
        }
        .np-page-hd__top {
          display: flex; justify-content: space-between; align-items: flex-start;
          gap: 12px;
        }
        .np-page-hd__meta {
          font-size: 12px;
          color: var(--m-ink-mute);
          margin-top: 4px;
          font-family: var(--font-mono);
        }
      `}</style>
    </header>
  );
}

/**
 * PageActionBtn — bouton icône circulaire pour les actions du header
 */
export function PageActionBtn({
  icon, onClick, ariaLabel,
}: { icon: IconName; onClick?: () => void; ariaLabel: string }) {
  return (
    <button type="button" className="np-hd__btn" onClick={onClick} aria-label={ariaLabel}>
      <Icon name={icon} size={17} />
    </button>
  );
}
