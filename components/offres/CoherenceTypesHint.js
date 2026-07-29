'use client';

// Coup de pouce cohérence (analyse système 2026-07-28, cas Manon) : sous le
// sélecteur « Vaut pour quels cours ? » d'une offre, dire l'effet RÉEL de la
// restriction sur les séances à venir — notamment le piège « restriction
// inerte » (un cours sans type est toujours accepté par la formule de
// résolution, la limite ne limite alors rien).
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase';
import { analyserRestrictionOffre } from '@/lib/coherence-offres';

export default function CoherenceTypesHint({ typesAutorises }) {
  const [coursAVenir, setCoursAVenir] = useState(null); // null = pas encore chargé

  useEffect(() => {
    let vivant = true;
    (async () => {
      try {
        const supabase = createClient();
        const today = new Date().toLocaleDateString('sv-SE', { timeZone: 'Europe/Paris' });
        const { data, error } = await supabase
          .from('cours')
          .select('type_cours, date')
          .gte('date', today)
          .eq('est_annule', false)
          .limit(500);
        if (!error && vivant) setCoursAVenir(data || []);
      } catch { /* hint silencieux : sans données, on ne dit rien */ }
    })();
    return () => { vivant = false; };
  }, []);

  if (!coursAVenir || !Array.isArray(typesAutorises) || typesAutorises.length === 0) return null;
  const a = analyserRestrictionOffre(typesAutorises, coursAVenir);
  if (a.total === 0) return null;

  // Type fantôme : aucune séance à venir ne porte le(s) type(s) choisi(s).
  if (a.duType === 0) {
    return (
      <span className="form-hint" style={{ display: 'block', marginTop: 6, color: '#a05a1e' }}>
        ⚠️ Aucune de tes {a.total} séances à venir ne porte le type {typesAutorises.join(' / ')}
        {a.sansType > 0 && <> — et {a.sansType} n&apos;ont pas de type du tout (elles restent couvertes : un cours sans type est toujours accepté)</>}.
        Vérifie le type de tes cours ou la restriction de cette offre.
      </span>
    );
  }
  // Restriction inerte (partielle) : des séances sans type passent au travers.
  if (a.sansType > 0) {
    return (
      <span className="form-hint" style={{ display: 'block', marginTop: 6, color: '#a05a1e' }}>
        ⚠️ {a.sansType} de tes {a.total} séances à venir n&apos;ont <strong>pas de type</strong> —
        elles seront quand même couvertes (un cours sans type est toujours accepté).
        Pour que la limite s&apos;applique vraiment, renseigne le type sur tes cours.
      </span>
    );
  }
  return null;
}
