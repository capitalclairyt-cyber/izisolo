/**
 * IziSolo · SessionCard — Card cours dans agenda / dashboard
 * src/components/mobile/SessionCard.tsx
 *
 * Format compact : heure (display) | titre + lieu | badge optionnel
 * Tone hérité de la discipline (cf. disciplineTone dans design-tokens.ts).
 */

import * as React from 'react';
import { cn } from '@/lib/cn';
import { Badge } from '@/components/ui-ds/Badge';

type Tone = 'rose' | 'sage' | 'sand' | 'lavender';

export interface SessionCardProps extends React.HTMLAttributes<HTMLDivElement> {
  time: string;        // ex "9:00"
  title: string;       // ex "Hatha doux"
  location: string;    // ex "rue Mercière · 6/8"
  tone?: Tone;
  /** Badge optionnel ex: "prochain", "complet" */
  badge?: { label: string; variant?: 'success' | 'warn' | 'info' | 'accent' };
}

const tones: Record<Tone, string> = {
  rose: 'bg-tone-rose text-tone-rose-ink',
  sage: 'bg-tone-sage text-tone-sage-ink',
  sand: 'bg-tone-sand text-tone-sand-ink',
  lavender: 'bg-tone-lavender text-tone-lavender-ink',
};

export function SessionCard({ time, title, location, tone = 'rose', badge, className, ...props }: SessionCardProps) {
  return (
    <div
      className={cn(
        'rounded-md p-3.5 flex items-center gap-3 mb-2',
        tones[tone],
        className,
      )}
      {...props}
    >
      <span
        className="font-display font-medium text-[17px] tracking-[-0.015em] w-11 shrink-0"
        style={{ fontVariationSettings: '"opsz" 50' }}
      >
        {time}
      </span>
      <div className="flex-1 min-w-0">
        <div className="font-display font-medium text-[13.5px]">{title}</div>
        <div className="text-[11px] opacity-70 mt-px">{location}</div>
      </div>
      {badge && <Badge variant={badge.variant ?? 'accent'}>{badge.label}</Badge>}
    </div>
  );
}
