/**
 * IziSolo · Identity — Header de la page Profil
 * src/components/mobile/Identity.tsx
 *
 * Avatar + nom + plan/lieu + bouton "Modifier".
 */

import * as React from 'react';
import { cn } from '@/lib/cn';
import { Avatar } from '@/components/ui-ds/Avatar';

export interface IdentityProps {
  initials: string;
  name: string;
  /** Plan + lieu, ex: "Plan Pro · Lyon 3" */
  meta: string;
  onEdit?: () => void;
  className?: string;
}

export function Identity({ initials, name, meta, onEdit, className }: IdentityProps) {
  return (
    <div className={cn('flex items-center gap-3.5 py-[18px] px-1', className)}>
      <Avatar initials={initials} size="lg" tone="accent" />
      <div className="flex-1 min-w-0">
        <div
          className="font-display font-medium text-[19px] tracking-[-0.015em] truncate"
          style={{ fontVariationSettings: '"opsz" 60' }}
        >
          {name}
        </div>
        <div className="text-[11.5px] text-m-ink-soft mt-0.5">{meta}</div>
      </div>
      {onEdit && (
        <button
          type="button"
          onClick={onEdit}
          className={cn(
            'font-display text-[11.5px]',
            'bg-m-surface border border-line text-m-ink',
            'px-3 py-1.5 rounded-pill cursor-pointer',
            'hover:bg-m-surface-2',
          )}
        >
          Modifier
        </button>
      )}
    </div>
  );
}
