/**
 * IziSolo · MobileScreen — Layout shell d'écran mobile
 * src/components/mobile/MobileScreen.tsx
 *
 * Wrapper standard pour toutes les pages mobile :
 *   <MobileScreen
 *     header={<ScreenHeader title="Bonjour Camille" date="MER · 29 AVR" />}
 *     dock={<BottomDock active="home" onChange={...} onPlus={...} />}
 *   >
 *     ... contenu scrollable ...
 *   </MobileScreen>
 *
 * Gère : status bar, header sticky, body scrollable avec padding-bottom
 * pour ne pas être caché par le dock.
 */

import * as React from 'react';
import { cn } from '@/lib/cn';
import { StatusBar } from './StatusBar';

export interface MobileScreenProps {
  children: React.ReactNode;
  header?: React.ReactNode;
  dock?: React.ReactNode;
  /** Affiche/cache la status bar */
  statusBar?: boolean;
  className?: string;
}

export function MobileScreen({
  children,
  header,
  dock,
  statusBar = true,
  className,
}: MobileScreenProps) {
  return (
    <div className={cn('w-full h-full flex flex-col bg-m-bg', className)}>
      {statusBar && <StatusBar />}
      <div className="flex-1 flex flex-col min-h-0 pt-[38px] -mt-[38px]">
        {header && <div className="shrink-0 px-[22px] pt-1.5 pb-3">{header}</div>}
        <div
          className="flex-1 overflow-y-auto px-[18px] pb-[100px]"
          style={{ scrollbarWidth: 'none' }}
        >
          {children}
        </div>
      </div>
      {dock}
    </div>
  );
}

/** En-tête standard : eyebrow date + titre display + actions (search/bell) */
export interface ScreenHeaderProps {
  title: string;
  date?: string;
  actions?: React.ReactNode;
  className?: string;
}

export function ScreenHeader({ title, date, actions, className }: ScreenHeaderProps) {
  return (
    <header className={cn('flex justify-between items-start', className)}>
      <div>
        {date && (
          <div className="font-mono text-[9.5px] tracking-[0.16em] uppercase text-m-ink-mute mb-1">
            {date}
          </div>
        )}
        <h1
          className="font-display font-medium text-[22px] tracking-[-0.015em] text-m-ink m-0"
          style={{ fontVariationSettings: '"opsz" 36' }}
        >
          {title}
        </h1>
      </div>
      {actions && <div className="flex gap-1.5">{actions}</div>}
    </header>
  );
}

/** Bouton icône circulaire pour les actions du header */
export interface HeaderIconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
}

export function HeaderIconButton({ className, children, ...props }: HeaderIconButtonProps) {
  return (
    <button
      type="button"
      className={cn(
        'w-[34px] h-[34px] rounded-full',
        'bg-m-surface border border-line',
        'text-m-ink-soft cursor-pointer',
        'flex items-center justify-center',
        'transition-transform duration-fast active:scale-[0.94]',
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}
