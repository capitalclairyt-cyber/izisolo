/**
 * IziSolo · Sheet — bottom sheet modal
 * src/components/mobile/Sheet.tsx
 *
 * Sheet qui glisse depuis le bas. Animation spring (entrée punchy).
 * Backdrop semi-transparent.
 *
 * Note : pour la prod, brancher sur Vaul ou Radix Dialog.
 * Cette implémentation est minimale pour valider le pattern visuel.
 *
 * Dépendance : framer-motion (npm i framer-motion)
 */

'use client';

import * as React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { cn } from '@/lib/cn';

export interface SheetProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  hint?: React.ReactNode;
  className?: string;
}

export function Sheet({ open, onClose, title, children, hint, className }: SheetProps) {
  // Lock scroll body when open
  React.useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [open]);

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            className="absolute inset-0 z-[var(--m-z-sheet)] bg-[oklch(0.18_0.022_30/0.45)]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            onClick={onClose}
            aria-hidden
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={title}
            className={cn(
              'absolute bottom-0 left-0 right-0 z-[calc(var(--m-z-sheet)+1)]',
              'bg-m-surface rounded-t-[28px]',
              'px-[22px] pt-[10px] pb-6',
              'shadow-m-sheet',
              className,
            )}
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
          >
            <div className="w-[38px] h-1 bg-m-line-strong rounded-pill mx-auto mb-3" aria-hidden />
            {title && (
              <div className="font-display font-medium text-center mb-[18px] text-[19px] tracking-[-0.015em]"
                   style={{ fontVariationSettings: '"opsz" 36' }}>
                {title}
              </div>
            )}
            {children}
            {hint && (
              <div className="text-[10.5px] text-m-ink-mute text-center px-3 py-1.5 bg-m-surface-2 rounded-md mt-3.5">
                {hint}
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
