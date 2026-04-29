/**
 * IziSolo · Button
 * src/components/ui/Button.tsx
 *
 * Variants : primary | ghost | soft | dark
 * Sizes    : sm | md | lg
 *
 * - Toujours rond pleine pilule (--r-pill)
 * - Primary : fond accent + ombre teintée terracotta
 * - Hover : translateY(-1px) — micro-feedback
 * - Hit target ≥ 44px (mobile-friendly)
 */

import * as React from 'react';
import { cn } from '@/lib/cn';

type Variant = 'primary' | 'ghost' | 'soft' | 'dark';
type Size = 'sm' | 'md' | 'lg';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  iconLeft?: React.ReactNode;
  iconRight?: React.ReactNode;
  asChild?: boolean;
}

const base = [
  'inline-flex items-center justify-center gap-2.5',
  'font-sans font-medium',
  'rounded-pill whitespace-nowrap',
  'transition-all duration-fast ease-base',
  'border border-transparent',
  'hover:-translate-y-px active:translate-y-0',
  'disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0',
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-soft focus-visible:ring-offset-2 focus-visible:ring-offset-bg',
].join(' ');

const variants: Record<Variant, string> = {
  primary: [
    'bg-accent text-accent-ink',
    'shadow-[0_6px_18px_oklch(0.65_0.10_25/0.28)]',
    'hover:bg-accent-deep',
    'hover:shadow-[0_10px_24px_oklch(0.65_0.10_25/0.34)]',
  ].join(' '),
  ghost: [
    'bg-transparent text-ink border-line-strong',
    'hover:bg-surface-2 hover:border-ink-muted',
  ].join(' '),
  soft: [
    'bg-accent-soft text-accent-deep',
    'hover:bg-accent-tint',
  ].join(' '),
  dark: [
    'bg-ink text-bg',
    'hover:bg-ink-soft',
  ].join(' '),
};

const sizes: Record<Size, string> = {
  sm: 'h-10 px-4 text-[0.92rem]',
  md: 'h-12 px-5 text-base',
  lg: 'h-14 px-7 text-[1.05rem]',
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', iconLeft, iconRight, children, ...props }, ref) => (
    <button
      ref={ref}
      className={cn(base, variants[variant], sizes[size], className)}
      {...props}
    >
      {iconLeft && <span className="shrink-0" aria-hidden>{iconLeft}</span>}
      {children}
      {iconRight && <span className="shrink-0" aria-hidden>{iconRight}</span>}
    </button>
  )
);
Button.displayName = 'Button';
