/**
 * BottomDock — pattern designer (CSS classes np-dock*).
 * Pilule blanche + 4 onglets + bouton + central noir 44px.
 */
'use client';

import * as React from 'react';
import { Icon, type IconName } from './Icon';

export type DockTab = 'home' | 'cal' | 'users' | 'me';

interface NavBtnProps {
  icon: IconName;
  label: string;
  active: boolean;
  onClick: () => void;
}

function NavBtn({ icon, label, active, onClick }: NavBtnProps) {
  return (
    <button
      type="button"
      className={`np-dock__btn ${active ? 'is-active' : ''}`}
      onClick={onClick}
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
}

export function BottomDock({ active, onChange, onPlus }: BottomDockProps) {
  return (
    <div className="np-dock">
      <div className="np-dock__bar">
        <NavBtn icon="home"  label="Accueil" active={active === 'home'}  onClick={() => onChange('home')} />
        <NavBtn icon="cal"   label="Agenda"  active={active === 'cal'}   onClick={() => onChange('cal')} />
        <button
          type="button"
          className="np-dock__plus"
          onClick={onPlus}
          aria-label="Nouveau"
        >
          <Icon name="plus" size={22} strokeWidth={1.7} />
        </button>
        <NavBtn icon="users" label="Élèves"  active={active === 'users'} onClick={() => onChange('users')} />
        <NavBtn icon="me"    label="Profil"  active={active === 'me'}    onClick={() => onChange('me')} />
      </div>
    </div>
  );
}
