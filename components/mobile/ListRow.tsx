/**
 * IziSolo · ListRow — ligne du hub Profil (et autres listes)
 * src/components/mobile/ListRow.tsx
 *
 * Pattern : icône colorée (chip) | titre + meta | badge | chevron
 * Utilisé dans le Profil hub pour les 11+ sections regroupées.
 *
 * À utiliser dans <ProfileGroup> qui gère la card-wrapper et les diviseurs.
 */

import * as React from 'react';
import { cn } from '@/lib/cn';
import { Icon, IconName } from '@/components/ui-ds/Icon';
import { Badge } from '@/components/ui-ds/Badge';

type IconTone = 'rose' | 'sage' | 'sand' | 'lavender' | 'ink' | 'mute';

export interface ListRowProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  icon: IconName;
  title: string;
  meta?: string;
  /** Badge à droite (avant le chevron) */
  badge?: string;
  badgeVariant?: 'success' | 'warn' | 'error' | 'info' | 'mute' | 'accent';
  iconTone?: IconTone;
  /** Mode atone (ex: "Se déconnecter") */
  muted?: boolean;
  /** Cacher le chevron (ex: action terminale) */
  hideChevron?: boolean;
}

const iconTones: Record<IconTone, string> = {
  rose: 'bg-tone-rose text-tone-rose-ink',
  sage: 'bg-tone-sage text-tone-sage-ink',
  sand: 'bg-tone-sand text-tone-sand-ink',
  lavender: 'bg-tone-lavender text-tone-lavender-ink',
  ink: 'bg-tone-ink text-tone-ink-text',
  mute: 'bg-m-surface-2 text-m-ink-soft',
};

export function ListRow({
  icon, title, meta, badge, badgeVariant = 'success',
  iconTone = 'mute', muted, hideChevron, className, ...props
}: ListRowProps) {
  return (
    <button
      type="button"
      className={cn(
        'w-full flex items-center gap-3 px-3.5 py-3',
        'text-left cursor-pointer transition-colors duration-fast',
        'hover:bg-m-surface-2 active:bg-m-surface-2',
        className,
      )}
      {...props}
    >
      <span className={cn(
        'w-[34px] h-[34px] rounded-sm flex items-center justify-center shrink-0',
        iconTones[iconTone],
      )}>
        <Icon name={icon} size={18} strokeWidth={1.5} />
      </span>
      <div className="flex-1 min-w-0">
        <div className={cn(
          'font-display font-medium text-[13.5px]',
          muted ? 'text-m-ink-soft' : 'text-m-ink',
        )}>
          {title}
        </div>
        {meta && <div className="text-[11px] text-m-ink-mute mt-px truncate">{meta}</div>}
      </div>
      {badge && <Badge variant={badgeVariant} className="mr-1">{badge}</Badge>}
      {!hideChevron && <Icon name="chev" size={16} className="text-m-ink-mute shrink-0" />}
    </button>
  );
}
