/**
 * SessionCard — card cours dans agenda/dashboard (pattern designer).
 * Format compact : heure | titre + lieu | badge optionnel.
 */
import * as React from 'react';

export type Tone = 'rose' | 'sage' | 'sand' | 'lavender';

export interface SessionCardProps {
  time: string;        // ex "9:00"
  title: string;       // ex "Hatha doux"
  location: string;    // ex "rue Mercière · 6/8"
  tone?: Tone;
  badge?: string;      // ex "prochain"
  onClick?: () => void;
}

export function SessionCard({ time, title, location, tone = 'rose', badge, onClick }: SessionCardProps) {
  const Wrap = onClick ? 'button' : 'div';
  return (
    <Wrap
      className={`np-card np-card--${tone}`}
      onClick={onClick}
      style={onClick ? { width: '100%', border: 'none', textAlign: 'left' } : undefined}
    >
      <span className="np-card__time">{time}</span>
      <div>
        <div className="np-card__t">{title}</div>
        <div className="np-card__l">{location}</div>
      </div>
      {badge && <span className="np-badge">{badge}</span>}
    </Wrap>
  );
}
