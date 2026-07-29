'use client';

// Symétrique de CoherenceTypesHint, côté COURS : quand le type est vide et
// que des offres restreintes existent, rappeler qu'un cours sans type est
// couvert par TOUS les carnets (même restreints) — analyse système 2026-07-28.
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase';

export default function TypeCoursHint({ typeCours }) {
  const [offresRestreintes, setOffresRestreintes] = useState(null);

  useEffect(() => {
    let vivant = true;
    (async () => {
      try {
        const supabase = createClient();
        const { data, error } = await supabase
          .from('offres')
          .select('nom, types_cours_autorises')
          .eq('actif', true)
          .not('types_cours_autorises', 'is', null)
          .limit(50);
        if (!error && vivant) {
          setOffresRestreintes((data || []).filter(o => Array.isArray(o.types_cours_autorises) && o.types_cours_autorises.length > 0));
        }
      } catch { /* hint silencieux */ }
    })();
    return () => { vivant = false; };
  }, []);

  if (typeCours || !offresRestreintes?.length) return null;
  const noms = offresRestreintes.slice(0, 2).map(o => `« ${o.nom} »`).join(' et ');
  return (
    <span className="form-hint" style={{ display: 'block', marginTop: 6 }}>
      💡 Sans type, ce cours sera couvert par <strong>tous</strong> les carnets — y compris
      {' '}{noms}{offresRestreintes.length > 2 ? '…' : ''} pourtant limité{offresRestreintes.length > 1 ? 's' : ''} à
      certains types. Renseigne le type pour que ces limites s&apos;appliquent.
    </span>
  );
}
