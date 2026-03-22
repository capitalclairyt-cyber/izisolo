'use client';

import { useEffect } from 'react';

/**
 * Avertit l'utilisateur avant de quitter la page s'il y a des modifications non sauvegardées.
 */
export function useUnsavedChanges(hasChanges) {
  useEffect(() => {
    const handler = (e) => {
      if (hasChanges) {
        e.preventDefault();
        e.returnValue = '';
      }
    };

    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [hasChanges]);
}
