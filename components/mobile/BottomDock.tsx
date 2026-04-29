/**
 * IziSolo · BottomDock — Navigation mobile
 * src/components/mobile/BottomDock.tsx
 *
 * Bar pilule flottante avec 4 onglets + bouton + central proéminent.
 * Pattern validé pour app à 11+ sections.
 *
 * Onglets standards : home / cal / users / me
 * Le `+` central ouvre la <Sheet> "Nouveau".
 */

import * as React from 'react';
import { cn } from '@/lib/cn';
import { Icon, IconName } from '@/components/ui-ds/Icon';

export type DockTab = 'home' | 'cal' | 'users' | 'me';

interface DockBtnProps {
  icon: IconName;
  label: string;
  active: boolean;
  onClick: () => void;
}

function DockBtn({ icon, label, active, onClick }: DockBtnProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'bg-transparent flex flex-col items-center gap-px',
        'font-display text-[9px] cursor-pointer px-1 py-1.5',
        'transition-colors duration-fast',
        active ? 'text-m-ink font-semibold' : 'text-m-ink-mute',
      )}
      aria-label={label}
      aria-current={active ? 'page' : undefined}
    >
      <Icon name={icon} size={22} strokeWidth={active ? 1.7 : 1.4} />
      <span>{label}</span>
    </button>
  );
}

export interface BottomDockProps {
  active: DockTab;
  onChange: (tab: DockTab) => void;
  onPlus: () => void;
  className?: string;
}

export function BottomDock({ active, onChange, onPlus, className }: BottomDockProps) {
  return (
    <div
      className={cn(
        'absolute bottom-0 left-0 right-0 z-[var(--m-z-tabbar)]',
        'px-4 pt-3 pb-[18px]',
        'bg-gradient-to-t from-bg from-30% to-transparent',
        className,
      )}
    >
      <div
        className={cn(
          'bg-m-surface rounded-pill h-14 px-1.5',
          'grid grid-cols-[1fr_1fr_56px_1fr_1fr] items-center',
          'border border-line shadow-m-md',
        )}
      >
        <DockBtn icon="home"  label="Accueil" active={active === 'home'}  onClick={() => onChange('home')} />
        <DockBtn icon="cal"   label="Agenda"  active={active === 'cal'}   onClick={() => onChange('cal')} />

        <button
          type="button"
          onClick={onPlus}
          aria-label="Nouveau"
          className={cn(
            'w-11 h-11 rounded-full justify-self-center',
            'bg-m-ink text-bg flex items-center justify-center',
            'shadow-[0_4px_12px_oklch(0.2_0.02_30/0.20)]',
            'transition-transform duration-fast',
            'hover:scale-105 active:scale-95',
          )}
        >
          <Icon name="plus" size={22} strokeWidth={1.7} />
        </button>

        <DockBtn icon="users" label="Élèves"  active={active === 'users'} onClick={() => onChange('users')} />
        <DockBtn icon="me"    label="Profil"  active={active === 'me'}    onClick={() => onChange('me')} />
      </div>
    </div>
  );
}
