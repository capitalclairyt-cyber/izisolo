'use client';

import { useState, useCallback } from 'react';
import { UserCog, Loader2 } from 'lucide-react';
import { useToast } from '@/components/ui/ToastProvider';
import { useMembre } from '@/components/studio/StudioProvider';
import { peut } from '@/lib/studio-membre';

/**
 * « Qui donne cette séance ? » (v103, lot 3b).
 *
 * Ne s'affiche que dans un studio à plusieurs : une prof seule donne tous ses
 * cours, la question ne se pose pas et la carte serait du bruit.
 *
 * Désigner une intervenante a DEUX effets, et l'écran les dit tous les deux :
 * le planning sait enfin qui fait quoi, et une prof bornée à « ses séances »
 * peut pointer celle-ci. Tant que personne n'est désigné, la séance reste
 * pointable par toute l'équipe — on ne ferme jamais rétroactivement une porte.
 */
export default function IntervenanteCours({ cours, intervenantes, intervenantInit, indisponible }) {
  const { toast } = useToast();
  const membre = useMembre();
  const [valeur, setValeur] = useState(intervenantInit || '');
  const [envoi, setEnvoi] = useState(false);

  const enregistrer = useCallback(async (id) => {
    setEnvoi(true);
    const avant = valeur;
    setValeur(id);
    try {
      const res = await fetch(`/api/cours/${cours.id}/intervenante`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ intervenantId: id || null }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setValeur(avant);
        toast.error(data.error || "Ça n'a pas pu être enregistré.");
        return;
      }
      toast.success(id ? 'Intervenante enregistrée.' : 'Plus personne n\'est désignée.');
    } catch {
      setValeur(avant);
      toast.error("Ça n'a pas pu être enregistré, réessaie.");
    } finally {
      setEnvoi(false);
    }
  }, [cours.id, valeur, toast]);

  // Studio à une seule personne, ou pas le droit de toucher aux cours : rien.
  if (!intervenantes || intervenantes.length < 2) return null;
  if (!peut(membre, 'cours_gerer')) return null;

  return (
    <div className="section iv-carte">
      <div className="iv-entete">
        <span className="iv-titre"><UserCog size={17} /> Qui donne cette séance ?</span>
        {envoi && <Loader2 size={15} className="iv-spin" />}
      </div>

      {indisponible ? (
        <p className="iv-alerte">
          Cette mise à jour n&apos;est pas encore appliquée sur ton studio : la séance reste pointable
          par toute l&apos;équipe.
        </p>
      ) : (
        <>
          <select value={valeur} disabled={envoi} onChange={e => enregistrer(e.target.value)}>
            <option value="">Personne en particulier</option>
            {intervenantes.map(i => (
              <option key={i.id} value={i.id}>{i.label}</option>
            ))}
          </select>
          <p className="iv-aide">
            {valeur
              ? 'Le planning le dit, et une prof bornée à ses propres séances peut pointer celle-ci.'
              : 'Tant que personne n’est désigné, toute l’équipe peut pointer cette séance.'}
          </p>
        </>
      )}

      <style jsx global>{`
        .iv-carte { padding: 14px 16px !important; }
        .iv-entete { display: flex; align-items: center; justify-content: space-between; gap: 10px; margin-bottom: 10px; }
        .iv-titre { display: inline-flex; align-items: center; gap: 8px; font-weight: 600; font-size: 1rem; }
        .iv-carte select { width: 100%; max-width: 340px; padding: 9px 11px; border-radius: 9px;
          border: 1px solid rgba(0,0,0,.13); font: inherit; font-size: .9rem; background: #fff; color: inherit; }
        .iv-aide { margin: 8px 0 0; font-size: .8rem; line-height: 1.5; color: var(--text-soft, #7a6f6a); }
        .iv-alerte { margin: 0; padding: 10px 12px; border-radius: 10px; font-size: .85rem;
          background: #fffbeb; border: 1px solid #fde68a; color: #92400e; }
        .iv-spin { animation: iv-rot 1s linear infinite; }
        @keyframes iv-rot { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
