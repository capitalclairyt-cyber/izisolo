'use client';

import { useState, useMemo } from 'react';
import { X, Search, ArrowRight, Loader2, Users, AlertTriangle, Check } from 'lucide-react';
import { createClient } from '@/lib/supabase';
import { useToast } from '@/components/ui/ToastProvider';

/**
 * Modal de fusion de deux fiches élèves en double.
 * Modes :
 *  - paire (auto)   : initialA + initialB fournis → choisir la principale + fusionner
 *  - manuel         : slots vides → rechercher/sélectionner les deux fiches
 * La fusion appelle la RPC atomique `fusionner_clients` (migration v68).
 */
export default function MergeClientsModal({ allClients = [], initialA = null, initialB = null, onClose, onMerged }) {
  const { toast } = useToast();
  const [a, setA] = useState(initialA);
  const [b, setB] = useState(initialB);
  // Fiche principale (celle qu'on GARDE). Défaut : celle avec un email, sinon la plus ancienne.
  const [primaryId, setPrimaryId] = useState(null);
  const [merging, setMerging] = useState(false);

  const nom = (c) => [c?.prenom, c?.nom].filter(Boolean).join(' ') || '(sans nom)';

  // Défaut de fiche principale dès que les deux sont là
  const defaultPrimary = useMemo(() => {
    if (!a || !b) return null;
    if (!!a.email !== !!b.email) return a.email ? a.id : b.id; // celle avec email
    return (a.created_at || '') <= (b.created_at || '') ? a.id : b.id; // la plus ancienne
  }, [a, b]);
  const effectivePrimary = primaryId || defaultPrimary;

  const doMerge = async () => {
    if (!a || !b || !effectivePrimary) return;
    const primary = effectivePrimary;
    const secondary = primary === a.id ? b.id : a.id;
    setMerging(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.rpc('fusionner_clients', { p_primary: primary, p_secondary: secondary });
      if (error) throw error;
      toast.success('Fiches fusionnées ✓');
      onMerged?.({ keptId: primary, removedId: secondary });
    } catch (err) {
      toast.error('Erreur : ' + (err.message || 'fusion impossible'));
    } finally {
      setMerging(false);
    }
  };

  return (
    <div className="merge-overlay" onClick={onClose}>
      <div className="merge-modal" onClick={e => e.stopPropagation()}>
        <div className="merge-header">
          <h3><Users size={18} /> Fusionner deux fiches</h3>
          <button className="merge-close" onClick={onClose} aria-label="Fermer"><X size={18} /></button>
        </div>

        <div className="merge-body">
          <p className="merge-intro">
            Rapatrie présences, paiements, carnets et historique sur <strong>une seule</strong> fiche.
            L'autre est supprimée. Choisis laquelle garder.
          </p>

          <div className="merge-slots">
            <FicheSlot client={a} label="Fiche A" allClients={allClients} exclude={b?.id}
              isPrimary={effectivePrimary === a?.id} onPickPrimary={() => a && setPrimaryId(a.id)}
              onSelect={setA} nom={nom} />
            <FicheSlot client={b} label="Fiche B" allClients={allClients} exclude={a?.id}
              isPrimary={effectivePrimary === b?.id} onPickPrimary={() => b && setPrimaryId(b.id)}
              onSelect={setB} nom={nom} />
          </div>

          {a && b && (
            <div className="merge-recap">
              <AlertTriangle size={15} />
              <span>
                On garde <strong>{nom(effectivePrimary === a.id ? a : b)}</strong> et on supprime{' '}
                <strong>{nom(effectivePrimary === a.id ? b : a)}</strong> (son historique est transféré).
              </span>
            </div>
          )}
        </div>

        <div className="merge-actions">
          <button className="izi-btn izi-btn-ghost" onClick={onClose} disabled={merging}>Annuler</button>
          <button className="izi-btn izi-btn-primary" onClick={doMerge} disabled={!a || !b || merging}>
            {merging ? <><Loader2 size={16} className="merge-spin" /> Fusion…</> : <>Fusionner <ArrowRight size={16} /></>}
          </button>
        </div>
      </div>

      <style jsx global>{`
        .merge-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.45); z-index: 300; display: flex; align-items: flex-end; justify-content: center; }
        @media (min-width: 600px) { .merge-overlay { align-items: center; } }
        .merge-modal { background: var(--bg-card); border-radius: var(--radius-lg) var(--radius-lg) 0 0; width: 100%; max-width: 560px; max-height: 90vh; display: flex; flex-direction: column; }
        @media (min-width: 600px) { .merge-modal { border-radius: var(--radius-lg); } }
        .merge-header { display: flex; align-items: center; justify-content: space-between; padding: 16px 18px; border-bottom: 1px solid var(--border); flex-shrink: 0; }
        .merge-header h3 { display: flex; align-items: center; gap: 8px; font-size: 1rem; font-weight: 700; }
        .merge-close { background: var(--cream-dark); border: none; width: 32px; height: 32px; border-radius: 50%; cursor: pointer; display: flex; align-items: center; justify-content: center; color: var(--text-secondary); }
        .merge-body { padding: 16px 18px; overflow-y: auto; display: flex; flex-direction: column; gap: 14px; }
        .merge-intro { font-size: 0.875rem; color: var(--text-secondary); line-height: 1.5; margin: 0; }
        .merge-slots { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
        @media (max-width: 480px) { .merge-slots { grid-template-columns: 1fr; } }
        .merge-recap { display: flex; align-items: flex-start; gap: 8px; padding: 10px 12px; background: #fff7ed; border: 1px solid #fed7aa; border-radius: var(--radius-md); font-size: 0.8125rem; color: #9a3412; line-height: 1.45; }
        .merge-recap svg { flex-shrink: 0; margin-top: 1px; }
        .merge-actions { display: flex; justify-content: flex-end; gap: 8px; padding: 14px 18px; border-top: 1px solid var(--border); flex-shrink: 0; }
        .merge-spin { animation: merge-spin-anim 0.8s linear infinite; }
        @keyframes merge-spin-anim { to { transform: rotate(360deg); } }

        .fiche-slot { border: 1.5px solid var(--border); border-radius: var(--radius-md); padding: 12px; display: flex; flex-direction: column; gap: 8px; }
        .fiche-slot.primary { border-color: var(--brand); background: var(--brand-light); }
        .fiche-slot-label { font-size: 0.6875rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.04em; color: var(--text-muted); }
        .fiche-slot-nom { font-weight: 700; font-size: 0.9375rem; }
        .fiche-slot-line { font-size: 0.75rem; color: var(--text-secondary); }
        .fiche-slot-keep { display: inline-flex; align-items: center; gap: 5px; font-size: 0.75rem; font-weight: 600; border: 1px solid var(--border); background: var(--bg-card); border-radius: 99px; padding: 4px 10px; cursor: pointer; align-self: flex-start; }
        .fiche-slot-keep.on { background: var(--brand); color: white; border-color: var(--brand); }
        .fiche-slot-change { background: none; border: none; color: var(--brand-700); font-size: 0.75rem; cursor: pointer; text-align: left; padding: 0; text-decoration: underline; align-self: flex-start; }
        .fiche-search { position: relative; }
        .fiche-search input { width: 100%; padding: 8px 10px 8px 30px; border: 1px solid var(--border); border-radius: var(--radius-sm); font-size: 0.8125rem; background: var(--bg-card); }
        .fiche-search .s-icon { position: absolute; left: 9px; top: 50%; transform: translateY(-50%); color: var(--text-muted); }
        .fiche-results { display: flex; flex-direction: column; gap: 2px; max-height: 160px; overflow-y: auto; }
        .fiche-result { text-align: left; background: none; border: none; padding: 7px 8px; border-radius: var(--radius-sm); cursor: pointer; font-size: 0.8125rem; }
        .fiche-result:hover { background: var(--cream-dark); }
        .fiche-result-mail { color: var(--text-muted); font-size: 0.7rem; }
      `}</style>
    </div>
  );
}

function FicheSlot({ client, label, allClients, exclude, isPrimary, onPickPrimary, onSelect, nom }) {
  const [q, setQ] = useState('');
  const results = useMemo(() => {
    if (!q.trim()) return [];
    const s = q.trim().toLowerCase();
    return allClients
      .filter(c => c.id !== exclude && (`${c.prenom || ''} ${c.nom || ''}`.toLowerCase().includes(s) || (c.email || '').toLowerCase().includes(s)))
      .slice(0, 6);
  }, [q, allClients, exclude]);

  if (!client) {
    return (
      <div className="fiche-slot">
        <span className="fiche-slot-label">{label}</span>
        <div className="fiche-search">
          <Search size={13} className="s-icon" />
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="Chercher une fiche…" />
        </div>
        <div className="fiche-results">
          {results.map(c => (
            <button key={c.id} type="button" className="fiche-result" onClick={() => { onSelect(c); setQ(''); }}>
              {nom(c)} {c.email && <span className="fiche-result-mail">· {c.email}</span>}
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className={`fiche-slot ${isPrimary ? 'primary' : ''}`}>
      <span className="fiche-slot-label">{label}</span>
      <div className="fiche-slot-nom">{nom(client)}</div>
      <div className="fiche-slot-line">{client.email || '— pas d\'email'}</div>
      <div className="fiche-slot-line">{client.telephone || '— pas de tél.'} · {client.statut || 'prospect'}</div>
      <button type="button" className={`fiche-slot-keep ${isPrimary ? 'on' : ''}`} onClick={onPickPrimary}>
        {isPrimary ? <><Check size={13} /> On garde celle-ci</> : 'Garder celle-ci'}
      </button>
      <button type="button" className="fiche-slot-change" onClick={() => onSelect(null)}>Changer</button>
    </div>
  );
}
