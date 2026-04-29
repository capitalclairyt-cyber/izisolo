/**
 * IziSolo · Tile — tuile colorée pour Sheet "Nouveau" (et autres)
 * src/components/mobile/Tile.tsx
 *
 * Tuile carrée : icône en chip + titre display + sub.
 * Tones : rose | sage | sand | lavender | ink
 */

import * as React from 'react';
import { cn } from '@/lib/cn';
import { Icon, IconName } from '@/components/ui-ds/Icon';

type Tone = 'rose' | 'sage' | 'sand' | 'lavender' | 'ink';

export interface TileProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  icon: IconName;
  title: string;
  sub?: string;
  tone?: Tone;
}

const tones: Record<Tone, string> = {
  rose: 'bg-tone-rose text-tone-rose-ink',
  sage: 'bg-tone-sage text-tone-sage-ink',
  sand: 'bg-tone-sand text-tone-sand-ink',
  lavender: 'bg-tone-lavender text-tone-lavender-ink',
  ink: 'bg-tone-ink text-tone-ink-text',
};

export function Tile({ icon, title, sub, tone = 'rose', className, ...props }: TileProps) {
  return (
    <button
      type="button"
      className={cn(
        'rounded-md p-3 cursor-pointer',
        'flex flex-col items-center gap-1',
        'transition-all duration-fast active:scale-[0.96]',
        tones[tone],
        className,
      )}
      {...props}
    >
      <span className={cn(
        'w-9 h-9 rounded-md flex items-center justify-center mb-1',
        tone === 'ink' ? 'bg-white/10' : 'bg-white/50',
      )}>
        <Icon name={icon} size={20} strokeWidth={1.5} />
      </span>
      <div className="font-display font-medium text-xs">{title}</div>
      {sub && <div className="text-[9.5px] opacity-70 text-center">{sub}</div>}
    </button>
  );
}
