/**
 * IziSolo · StatusBar (mobile)
 * src/components/mobile/StatusBar.tsx
 *
 * Status bar iOS minimal : heure à gauche, signal/batterie à droite.
 * Hauteur 38-44px. Couleur héritée (currentColor sur les SVG).
 */

import * as React from 'react';
import { cn } from '@/lib/cn';

export interface StatusBarProps extends React.HTMLAttributes<HTMLDivElement> {
  time?: string;
  /** Mode 'dark' pour fond sombre (texte blanc) */
  appearance?: 'light' | 'dark';
}

export function StatusBar({ time = '9:41', appearance = 'light', className, ...props }: StatusBarProps) {
  return (
    <div
      className={cn(
        'h-[38px] px-7 flex justify-between items-end pb-2 shrink-0',
        'text-[13px] font-semibold',
        appearance === 'light' ? 'text-m-ink' : 'text-m-ink-onDark',
        className,
      )}
      style={{ fontFamily: '-apple-system, system-ui' }}
      {...props}
    >
      <span>{time}</span>
      <span className="inline-flex items-center gap-1.5">
        <svg width="14" height="9" viewBox="0 0 14 9" aria-hidden>
          <rect x="0"    y="5" width="2.5" height="4" rx="0.5" fill="currentColor"/>
          <rect x="3.5"  y="3" width="2.5" height="6" rx="0.5" fill="currentColor"/>
          <rect x="7"    y="1" width="2.5" height="8" rx="0.5" fill="currentColor"/>
          <rect x="10.5" y="0" width="2.5" height="9" rx="0.5" fill="currentColor"/>
        </svg>
        <svg width="20" height="10" viewBox="0 0 20 10" aria-hidden>
          <rect x="0.5" y="0.5" width="17" height="9" rx="2" stroke="currentColor" fill="none" opacity="0.4"/>
          <rect x="2"   y="2"   width="14" height="6" rx="1" fill="currentColor"/>
        </svg>
      </span>
    </div>
  );
}
