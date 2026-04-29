/**
 * Composants du Profil hub (pattern designer) :
 *  - <Identity> : avatar + nom + meta + Modifier
 *  - <ProfileGroup> : groupe labellé
 *  - <ListRow> : ligne icône+chip + titre + meta + badge + chevron
 */
'use client';

import * as React from 'react';
import { Icon, type IconName } from './Icon';

export interface IdentityProps {
  initials: string;
  name: string;
  meta?: string;
  onEdit?: () => void;
}

export function Identity({ initials, name, meta, onEdit }: IdentityProps) {
  return (
    <div className="np-id">
      <div className="np-id__av">{initials.slice(0, 2).toUpperCase()}</div>
      <div className="np-id__main">
        <div className="np-id__name">{name}</div>
        {meta && <div className="np-id__sub">{meta}</div>}
      </div>
      {onEdit && (
        <button type="button" className="np-id__edit" onClick={onEdit}>
          Modifier
        </button>
      )}
    </div>
  );
}

export interface ProfileGroupProps {
  label: string;
  children: React.ReactNode;
}

export function ProfileGroup({ label, children }: ProfileGroupProps) {
  return (
    <div className="np-group">
      <div className="np-group__lbl">{label}</div>
      <div className="np-list">{children}</div>
    </div>
  );
}

export type RowTone = 'rose' | 'sage' | 'sand' | 'lavender' | 'ink';

export interface ListRowProps {
  icon: IconName;
  tone?: RowTone;
  title: string;
  meta?: string;
  badge?: string;
  muted?: boolean;
  onClick?: () => void;
}

export function ListRow({ icon, tone, title, meta, badge, muted, onClick }: ListRowProps) {
  return (
    <button
      type="button"
      className={`np-row ${muted ? 'is-muted' : ''}`}
      onClick={onClick}
    >
      <span className={`np-row__icon ${tone ? `np-row__icon--${tone}` : ''}`}>
        <Icon name={icon} size={18} strokeWidth={1.5} />
      </span>
      <div className="np-row__main">
        <div className="np-row__t">{title}</div>
        {meta && <div className="np-row__m">{meta}</div>}
      </div>
      {badge && <span className="np-row__badge">{badge}</span>}
      {!muted && <Icon name="chev" size={16} className="np-row__chev" />}
    </button>
  );
}
