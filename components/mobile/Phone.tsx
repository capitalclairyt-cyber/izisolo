/**
 * IziSolo · Phone — preview iPhone (dev only)
 * src/components/mobile/Phone.tsx
 *
 * Bezel iPhone simple pour mocker les écrans en preview/storybook.
 * NE PAS UTILISER en prod app — utiliser plutôt Capacitor / PWA.
 *
 * Dimensions : 280×600 (preview compact) ou 360×780 (taille réelle).
 */

import * as React from 'react';
import { cn } from '@/lib/cn';

export interface PhoneProps {
  children: React.ReactNode;
  size?: 'compact' | 'full';
  className?: string;
}

export function Phone({ children, size = 'compact', className }: PhoneProps) {
  const dim = size === 'compact'
    ? 'w-[280px] h-[600px]'
    : 'w-[360px] h-[780px]';

  return (
    <div className={cn('flex justify-center items-center', className)}>
      <div className={cn(
        dim,
        'bg-[oklch(0.16_0.02_30)] rounded-[44px] p-[7px]',
        'shadow-[0_30px_60px_oklch(0.2_0.02_30/0.20),inset_0_0_0_1.5px_oklch(0.32_0.02_30)]',
        'relative',
      )}>
        <div
          className="absolute top-[14px] left-1/2 -translate-x-1/2 w-[90px] h-[22px] bg-[oklch(0.10_0.02_30)] rounded-pill z-30"
          aria-hidden
        />
        <div className="w-full h-full rounded-[36px] overflow-hidden bg-m-bg relative">
          {children}
        </div>
      </div>
    </div>
  );
}
