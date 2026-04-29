/**
 * IziSolo · RevenueHero — Hero card avec KPI principal + 3 stats
 * src/components/mobile/RevenueHero.tsx
 *
 * Card noire (surface-dark) avec halo terracotta en arrière-plan.
 * Top : eyebrow tag (avec dot pulsant) — Centre : nombre énorme +
 * sub - Bas : 3 stats sur 3 colonnes séparées par border-top.
 *
 * Réutilisable pour : revenus, présence, taux de remplissage…
 */

import * as React from 'react';
import { cn } from '@/lib/cn';

export interface RevenueHeroProps {
  /** Tag haut, ex "CETTE SEMAINE" */
  eyebrow: string;
  /** Valeur principale, ex "2 480 €" */
  value: React.ReactNode;
  /** Sous-titre, ex "+18% vs sem. dernière" */
  sub?: string;
  /** Trio de stats en bas */
  stats?: Array<{ label: string; value: React.ReactNode }>;
  className?: string;
}

export function RevenueHero({ eyebrow, value, sub, stats, className }: RevenueHeroProps) {
  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-xl p-[18px] mb-[18px]',
        'bg-m-surface-dark text-m-ink-onDark',
        className,
      )}
    >
      {/* halo */}
      <div
        className="absolute -right-10 -top-10 w-40 h-40 rounded-full pointer-events-none"
        style={{
          background: 'radial-gradient(circle at 30% 30%, oklch(0.65 0.10 25 / 0.5), transparent 65%)',
        }}
        aria-hidden
      />

      {/* eyebrow */}
      <div className="relative font-mono text-[9px] tracking-[0.16em] uppercase text-m-ink-onDarkSoft inline-flex items-center gap-1.5">
        <span
          className="w-[5px] h-[5px] rounded-full bg-m-accent"
          style={{ boxShadow: '0 0 0 3px oklch(0.65 0.10 25 / 0.25)' }}
          aria-hidden
        />
        {eyebrow}
      </div>

      {/* value */}
      <div
        className="relative font-display font-medium text-[38px] leading-none tracking-[-0.03em] mt-3 mb-1"
        style={{ fontVariationSettings: '"opsz" 144' }}
      >
        {value}
      </div>
      {sub && <div className="relative text-xs text-m-ink-onDarkSoft mb-3.5">{sub}</div>}

      {/* stats */}
      {stats && stats.length > 0 && (
        <div className="relative grid grid-cols-3 gap-2 pt-3 border-t border-white/12">
          {stats.map((s, i) => (
            <div key={i}>
              <span className="block font-mono text-[8.5px] tracking-[0.14em] uppercase text-m-ink-onDarkMute mb-0.5">
                {s.label}
              </span>
              <b
                className="font-display font-medium text-base tracking-[-0.01em]"
                style={{ fontVariationSettings: '"opsz" 36' }}
              >
                {s.value}
              </b>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
