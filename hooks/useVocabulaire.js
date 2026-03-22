'use client';

import { useMemo } from 'react';
import { getVocabulaire } from '@/lib/vocabulaire';

/**
 * Hook pour accéder au vocabulaire adaptatif dans les composants.
 * Usage: const { v } = useVocabulaire(profile);
 *        <h1>Mes {v.clients}</h1>
 */
export function useVocabulaire(profile) {
  const vocab = useMemo(() => {
    return getVocabulaire(
      profile?.metier || 'yoga',
      profile?.vocabulaire
    );
  }, [profile?.metier, profile?.vocabulaire]);

  return { vocab, v: (key) => vocab[key] || key };
}
