/**
 * IziSolo · SectionHeader — En-tête de section avec lien "Tout voir"
 * src/components/mobile/SectionHeader.tsx
 *
 * Pattern : titre display + lien optionnel en accent.
 */

import * as React from 'react';
import { cn } from '@/lib/cn';

export interface SectionHeaderProps {
  title: string;
  action?: { label: string; onClick?: () => void; href?: string };
  className?: string;
}

export function SectionHeader({ title, action, className }: SectionHeaderProps) {
  return (
    <div className={cn('flex justify-between items-baseline mb-2.5 px-1', className)}>
      <h2
        className="font-display font-medium text-base tracking-[-0.015em] m-0"
        style={{ fontVariationSettings: '"opsz" 36' }}
      >
        {title}
      </h2>
      {action && (
        action.href ? (
          <a href={action.href} className="text-xs text-accent-deep no-underline">{action.label} →</a>
        ) : (
          <button type="button" onClick={action.onClick} className="text-xs text-accent-deep">{action.label} →</button>
        )
      )}
    </div>
  );
}
