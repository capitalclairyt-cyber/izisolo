/**
 * IziSolo · Pill (chip / tag inline)
 * src/components/ui/Pill.tsx
 *
 * Petit conteneur arrondi pleine pilule.
 * Variants : accent (default) | tone-* | success | warn
 */

import * as React from 'react';
import { cn } from '@/lib/cn';

type Variant = 'accent' | 'tone-rose' | 'tone-sage' | 'tone-sand' | 'tone-lavender' | 'success' | 'warn' | 'mute';

export interface PillProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: Variant;
  dot?: boolean;
}

const variants: Record<Variant, string> = {
  accent: 'bg-accent-soft text-accent-deep',
  'tone-rose': 'bg-tone-rose text-tone-rose-ink',
  'tone-sage': 'bg-tone-sage text-tone-sage-ink',
  'tone-sand': 'bg-tone-sand text-tone-sand-ink',
  'tone-lavender': 'bg-tone-lavender text-tone-lavender-ink',
  success: 'bg-[oklch(0.92_0.04_145)] text-[oklch(0.36_0.06_145)]',
  warn: 'bg-[oklch(0.94_0.06_75)] text-[oklch(0.42_0.10_60)]',
  mute: 'bg-surface-2 text-ink-muted',
};

export function Pill({ className, variant = 'accent', dot, children, ...props }: PillProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-2 px-3 py-1.5 rounded-pill text-[0.82rem] font-medium',
        variants[variant],
        className,
      )}
      {...props}
    >
      {dot && <span className="w-1.5 h-1.5 rounded-full bg-current" aria-hidden />}
      {children}
    </span>
  );
}
