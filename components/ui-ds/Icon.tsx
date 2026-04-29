/**
 * IziSolo · Icon set
 * src/components/ui/Icon.tsx
 *
 * Set d'icônes line-only, stroke 1.4, 24x24. Compatible avec
 * notre direction visuelle (organique sensoriel + sable calme).
 *
 * Alternative recommandée : `lucide-react` avec strokeWidth={1.4}.
 * Ce fichier est un fallback minimal pour les icônes utilisées
 * dans le DS — dock, hub, sheet "Nouveau", session cards.
 */

import * as React from 'react';

export type IconName =
  | 'home' | 'cal' | 'users' | 'me' | 'plus' | 'grid'
  | 'search' | 'bell' | 'chev' | 'chart' | 'euro'
  | 'settings' | 'file' | 'help' | 'bookmark' | 'music'
  | 'tag' | 'out' | 'sparkle' | 'check' | 'close';

interface Props extends React.SVGAttributes<SVGSVGElement> {
  name: IconName;
  size?: number;
  strokeWidth?: number;
}

const paths: Record<IconName, React.ReactNode> = {
  home: <><path d="M4 11 L12 4 L20 11 V19 a1 1 0 0 1-1 1h-4v-6h-6v6H5a1 1 0 0 1-1-1z"/></>,
  cal: <><rect x="4" y="6" width="16" height="14" rx="2"/><path d="M4 10h16M9 4v4M15 4v4"/></>,
  users: <><circle cx="9" cy="9" r="3"/><path d="M3 19c0-3 2.7-5 6-5s6 2 6 5"/><circle cx="17" cy="10" r="2.2"/><path d="M16 19c0-2.5 1.5-4 5-4"/></>,
  me: <><circle cx="12" cy="9" r="3.5"/><path d="M5 20c0-3.5 3-6 7-6s7 2.5 7 6"/></>,
  plus: <><path d="M12 5v14M5 12h14"/></>,
  grid: <><rect x="4" y="4" width="6" height="6" rx="1"/><rect x="14" y="4" width="6" height="6" rx="1"/><rect x="4" y="14" width="6" height="6" rx="1"/><rect x="14" y="14" width="6" height="6" rx="1"/></>,
  search: <><circle cx="11" cy="11" r="6.5"/><path d="m20 20-3.5-3.5"/></>,
  bell: <><path d="M6 9a6 6 0 0 1 12 0c0 6 2 8 2 8H4s2-2 2-8"/><path d="M10 21a2 2 0 0 0 4 0"/></>,
  chev: <><path d="m9 6 6 6-6 6"/></>,
  chart: <><path d="M4 19h16"/><rect x="6" y="11" width="3" height="6" rx="0.5"/><rect x="11" y="7" width="3" height="10" rx="0.5"/><rect x="16" y="13" width="3" height="4" rx="0.5"/></>,
  euro: <><path d="M17 6.5a6 6 0 1 0 0 11"/><path d="M5 10h8M5 14h8"/></>,
  settings: <><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3 1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8 1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/></>,
  file: <><path d="M14 4H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V9z"/><path d="M14 4v5h5"/></>,
  help: <><circle cx="12" cy="12" r="9"/><path d="M9.5 9.5a2.5 2.5 0 0 1 5 0c0 1.5-2.5 2-2.5 3.5"/><circle cx="12" cy="17" r="0.6" fill="currentColor"/></>,
  bookmark: <><path d="M6 4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v17l-6-4-6 4z"/></>,
  music: <><circle cx="6" cy="17" r="2.5"/><circle cx="17" cy="15" r="2.5"/><path d="M8.5 17V5l11-2v12"/></>,
  tag: <><path d="M3 12V4a1 1 0 0 1 1-1h8l9 9-9 9z"/><circle cx="8" cy="8" r="1.5" fill="currentColor"/></>,
  out: <><path d="M14 4h4a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1h-4"/><path d="M9 8l-4 4 4 4M5 12h11"/></>,
  sparkle: <><path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2 2M16.4 16.4l2 2M5.6 18.4l2-2M16.4 7.6l2-2"/></>,
  check: <><path d="m5 12 5 5 9-11"/></>,
  close: <><path d="M6 6l12 12M6 18 18 6"/></>,
};

export function Icon({ name, size = 20, strokeWidth = 1.4, ...rest }: Props) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      {...rest}
    >
      {paths[name]}
    </svg>
  );
}
