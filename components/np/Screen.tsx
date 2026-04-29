/**
 * Composants de structure d'écran mobile (pattern designer).
 *  - <Screen> : wrap de l'écran, sticky header + scrollable body
 *  - <ScreenHeader> : eyebrow date + titre Fraunces + actions
 *  - <HeaderIconBtn> : bouton circulaire pour les actions du header
 *  - <Section> : section avec titre + lien "Tout voir"
 */
'use client';

import * as React from 'react';
import { Icon, type IconName } from './Icon';

export function Screen({ children }: { children: React.ReactNode }) {
  return <div className="np-app">{children}</div>;
}

export interface ScreenHeaderProps {
  date?: string;
  title: string;
  actions?: React.ReactNode;
}

export function ScreenHeader({ date, title, actions }: ScreenHeaderProps) {
  return (
    <header className="np-hd">
      <div>
        {date && <div className="np-hd__date">{date}</div>}
        <h1 className="np-hd__title">{title}</h1>
      </div>
      {actions && <div className="np-hd__actions">{actions}</div>}
    </header>
  );
}

export function HeaderIconBtn({
  icon, onClick, ariaLabel,
}: { icon: IconName; onClick?: () => void; ariaLabel: string }) {
  return (
    <button type="button" className="np-hd__btn" onClick={onClick} aria-label={ariaLabel}>
      <Icon name={icon} size={17} />
    </button>
  );
}

export function ScreenBody({ children }: { children: React.ReactNode }) {
  return <div className="np-body">{children}</div>;
}

export interface SectionProps {
  title: string;
  link?: { href: string; label?: string };
  children: React.ReactNode;
}

export function Section({ title, link, children }: SectionProps) {
  return (
    <div className="np-sec">
      <div className="np-sec__hd">
        <h2>{title}</h2>
        {link && (
          <a href={link.href}>{link.label || 'Tout voir →'}</a>
        )}
      </div>
      {children}
    </div>
  );
}
