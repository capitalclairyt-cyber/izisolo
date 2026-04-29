/**
 * IziSolo · Card
 * src/components/ui/Card.tsx
 *
 * Card de base : surface blanche, border-line, radius lg, padding 7.
 * Variants : default | warm | dark | tone-{rose|sage|sand|lavender}
 */

import * as React from 'react';
import { cn } from '@/lib/cn';

type Variant = 'default' | 'warm' | 'dark' | 'tone-rose' | 'tone-sage' | 'tone-sand' | 'tone-lavender';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: Variant;
  hoverable?: boolean;
  /** Niveau d'ombre. 'none' par défaut (sobre). */
  elevation?: 'none' | 'sm' | 'md' | 'lg';
}

const variants: Record<Variant, string> = {
  default: 'bg-surface text-ink border border-line',
  warm: 'bg-bg-warm text-ink border border-line',
  dark: 'bg-m-surface-dark text-m-ink-onDark border border-transparent',
  'tone-rose': 'bg-tone-rose text-tone-rose-ink border border-transparent',
  'tone-sage': 'bg-tone-sage text-tone-sage-ink border border-transparent',
  'tone-sand': 'bg-tone-sand text-tone-sand-ink border border-transparent',
  'tone-lavender': 'bg-tone-lavender text-tone-lavender-ink border border-transparent',
};

const elevations = {
  none: '',
  sm: 'shadow-sm',
  md: 'shadow-md',
  lg: 'shadow-lg',
};

export const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant = 'default', hoverable, elevation = 'none', children, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        'rounded-lg p-7 transition-all duration-fast ease-base',
        variants[variant],
        elevations[elevation],
        hoverable && 'hover:border-line-strong hover:-translate-y-0.5',
        className,
      )}
      {...props}
    >
      {children}
    </div>
  )
);
Card.displayName = 'Card';
