'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Coins, Check, Loader2, FileText } from 'lucide-react';
import { useToast } from '@/components/ui/ToastProvider';
import { MODES_REMUNERATION, CODES_REMUNERATION, labelRemuneration } from '@/lib/remuneration';

/**
 * La rémunération convenue avec une intervenante (v112, lot 2 Associations &
 * Studios) : un mode, un montant. Le relevé mensuel (page Compta → Relevés)
 * en déduit ce qui est dû. Rien de convenu = le relevé compte les séances
 * sans montant.
 */
export default function Remuneration({ membre, onMaj }) {
  const { toast } = useToast();
  const [ouvert, setOuvert] = useState(false);
  const [mode, setMode] = useState(membre.remuneration?.mode || 'par_seance');
  const [montant, setMontant] = useState(membre.remuneration?.montant != null ? String(membre.remuneration.montant) : '');
  const [envoi, setEnvoi] = useState(false);

  const enregistrer = async (retirer = false) => {
    setEnvoi(true);
    try {
      const res = await fetch(`/api/equipe/${membre.id}/remuneration`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(retirer ? { remuneration: null } : { mode, montant }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { toast.error(data.error || 'Enregistrement impossible.'); return; }
      onMaj?.(data.remuneration || null);
      setOuvert(false);
      toast.success(retirer ? 'Rémunération retirée.' : 'Rémunération enregistrée.');
    } catch { toast.error('Enregistrement impossible, réessaie.'); }
    finally { setEnvoi(false); }
  };

  return (
    <div className="rm-bloc" data-testid="remuneration" data-etat={membre.remuneration ? 'convenue' : 'aucune'}>
      {!ouvert ? (
        <div className="rm-etat">
          <Coins size={14} />
          <span>{membre.remuneration ? `Rémunération : ${labelRemuneration(membre.remuneration)}` : 'Aucune rémunération convenue'}</span>
          <button type="button" className="rm-lien" onClick={() => setOuvert(true)} data-testid="remuneration-modifier">{membre.remuneration ? 'Modifier' : 'Convenir'}</button>
          <Link href="/compta?onglet=releves" className="rm-lien"><FileText size={12} /> Relevé du mois</Link>
        </div>
      ) : (
        <div className="rm-form">
          <select value={mode} onChange={e => setMode(e.target.value)} data-testid="remuneration-mode">
            {CODES_REMUNERATION.map(c => <option key={c} value={c}>{MODES_REMUNERATION[c].label}</option>)}
          </select>
          <input type="text" inputMode="decimal" value={montant} placeholder="30" onChange={e => setMontant(e.target.value)} data-testid="remuneration-montant" />
          <span className="rm-unite">{MODES_REMUNERATION[mode].unite}</span>
          <button type="button" className="izi-btn btn-sm izi-btn-primary" onClick={() => enregistrer(false)} disabled={envoi} data-testid="remuneration-enregistrer">
            {envoi ? <Loader2 size={14} className="rm-spin" /> : <Check size={14} />} Enregistrer
          </button>
          {membre.remuneration && <button type="button" className="izi-btn btn-sm izi-btn-ghost" onClick={() => enregistrer(true)} disabled={envoi}>Retirer</button>}
          <button type="button" className="izi-btn btn-sm izi-btn-ghost" onClick={() => setOuvert(false)}>Annuler</button>
          <em className="rm-aide">{MODES_REMUNERATION[mode].aide}</em>
        </div>
      )}
      <style jsx global>{`
        .rm-bloc { flex-basis: 100%; margin-top: 8px; padding-top: 8px; border-top: 1px dashed rgba(0,0,0,.08); font-size: .82rem; color: var(--text-soft, #7a6f6a); }
        .rm-etat { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
        .rm-lien { background: none; border: none; padding: 0; font: inherit; font-size: .8rem; color: var(--brand, #b87333); cursor: pointer; text-decoration: underline; display: inline-flex; align-items: center; gap: 4px; }
        .rm-form { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }
        .rm-form select, .rm-form input { padding: 7px 9px; border-radius: 8px; border: 1px solid rgba(0,0,0,.13); font: inherit; font-size: .86rem; background: #fff; color: inherit; }
        .rm-form input { width: 90px; }
        .rm-unite { font-size: .8rem; }
        .rm-aide { flex-basis: 100%; font-style: normal; font-size: .76rem; line-height: 1.45; }
        .rm-spin { animation: rm-rot 1s linear infinite; }
        @keyframes rm-rot { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
