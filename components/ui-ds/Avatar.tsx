/**
 * IziSolo · Avatar
 * src/components/ui/Avatar.tsx
 *
 * Cercle avec initiales OU image.
 * Tailles : sm 32 | md 40 | lg 56 | xl 72
 */

import * as React from 'react';
import { cn } from '@/lib/cn';

type Size = 'sm' | 'md' | 'lg' | 'xl';

export interface AvatarProps extends React.HTMLAttributes<HTMLDivElement> {
  src?: string;
  alt?: string;
  initials?: string;
  size?: Size;
  /** Tone du fond quand pas d'image */
  tone?: 'rose' | 'sage' | 'sand' | 'lavender' | 'accent';
}

const sizes: Record<Size, string> = {
  sm: 'w-8 h-8 text-[12px]',
  md: 'w-10 h-10 text-[14px]',
  lg: 'w-14 h-14 text-[18px]',
  xl: 'w-[72px] h-[72px] text-[22px]',
};

const tones = {
  rose: 'bg-tone-rose text-tone-rose-ink',
  sage: 'bg-tone-sage text-tone-sage-ink',
  sand: 'bg-tone-sand text-tone-sand-ink',
  lavender: 'bg-tone-lavender text-tone-lavender-ink',
  accent: 'bg-accent-soft text-accent-deep',
};

export function Avatar({ src, alt = '', initials, size = 'md', tone = 'accent', className, ...props }: AvatarProps) {
  return (
    <div
      className={cn(
        'inline-flex items-center justify-center rounded-full overflow-hidden shrink-0',
        'font-display font-medium',
        !src && tones[tone],
        sizes[size],
        className,
      )}
      {...props}
    >
      {src
        ? <img src={src} alt={alt} className="w-full h-full object-cover" />
        : <span aria-hidden>{initials}</span>}
    </div>
  );
}
