/**
 * IziSolo · ProfileGroup — Wrapper de groupe pour le hub Profil
 * src/components/mobile/ProfileGroup.tsx
 *
 * Pattern :
 *   <ProfileGroup label="ACTIVITÉ">
 *     <ListRow ... />
 *     <ListRow ... />
 *   </ProfileGroup>
 *
 * Les ListRow sont automatiquement séparées par un border-top après la première.
 */

import * as React from 'react';
import { cn } from '@/lib/cn';

export interface ProfileGroupProps {
  label: string;
  children: React.ReactNode;
  className?: string;
}

export function ProfileGroup({ label, children, className }: ProfileGroupProps) {
  return (
    <section className={cn('mt-[18px]', className)}>
      <div className="font-mono text-[9.5px] tracking-[0.16em] uppercase text-m-ink-mute px-1 pb-2">
        {label}
      </div>
      <div className={cn(
        'bg-m-surface rounded-md border border-line overflow-hidden',
        '[&>*+*]:border-t [&>*+*]:border-line',
      )}>
        {children}
      </div>
    </section>
  );
}
