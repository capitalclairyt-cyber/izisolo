/**
 * IziSolo · Badge (mono, données numériques compactes)
 * src/components/ui/Badge.tsx
 *
 * Différent de Pill : police mono + letter-spacing serré.
 * Pour : "+18%", "3 en attente", "BETA", etc.
 */

import * as React from 'react';
import { cn } from '@/lib/cn';

type Variant = 'success' | 'warn' | 'error' | 'info' | 'mute' | 'accent';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: Variant;
}

const variants: Record<Variant, string> = {
  success: 'bg-[oklch(0.92_0.04_145)] text-[oklch(0.36_0.06_145)]',
  warn:    'bg-[oklch(0.94_0.06_75)] text-[oklch(0.42_0.10_60)]',
  error:   'bg-[oklch(0.94_0.05_25)] text-[oklch(0.45_0.14_25)]',
  info:    'bg-[oklch(0.93_0.04_230)] text-[oklch(0.40_0.08_230)]',
  mute:    'bg-surface-2 text-ink-muted',
  accent:  'bg-accent text-accent-ink',
};

export function Badge({ className, variant = 'success', children, ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center px-2 py-0.5 rounded-pill',
        'font-mono text-[10px] tracking-[0.06em]',
        variants[variant],
        className,
      )}
      {...props}
    >
      {children}
    </span>
  );
}
