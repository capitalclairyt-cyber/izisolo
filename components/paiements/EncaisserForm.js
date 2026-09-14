'use client';

// ============================================================================
// EncaisserForm — le corps de la modale « Encaisser » d'un paiement en
// attente, partagé par la fiche élève et par Revenus (2026-09-14).
// ----------------------------------------------------------------------------
// Né du cas Marie-Pierre (Maude) : abonnement vendu « à régler plus tard »,
// puis DEUX chèques. Avant, chaque page avait sa copie de la modale, toutes
// deux tout ou rien (un mode, un numéro) avec « espèces » présélectionné.
//
// Deux règles ici :
//   1. le mode se DÉCLARE (leçon Kim 2026-08-20) : aucune présélection, le
//      bouton attend que la prof dise comment l'argent est arrivé ;
//   2. « Plusieurs moyens ou plusieurs chèques » découpe la ligne en N
//      encaissements, chacun avec son moyen, son numéro et sa date ; le
//      total doit tomber juste (lib/encaissement-parts, vérifié ici ET par
//      la route), sinon rien ne part.
// La page parente garde sa coquille de modale et reçoit les lignes écrites.
// ============================================================================

import { useState } from 'react';
import { Banknote, FileText, Landmark, CreditCard, CheckCircle2, Loader2 } from 'lucide-react';
import { formatMontant } from '@/lib/utils';
import { useToast } from '@/components/ui/ToastProvider';
import { validerParts, decouperMontant, MAX_PARTS } from '@/lib/encaissement-parts';
import { aujourdhuiParis } from '@/lib/urssaf';

const MODES = [
  { value: 'especes',  label: 'Espèces',  Icon: Banknote },
  { value: 'cheque',   label: 'Chèque',   Icon: FileText },
  { value: 'virement', label: 'Virement', Icon: Landmark },
  { value: 'CB',       label: 'CB',       Icon: CreditCard },
];

const somme = parts => Math.round(parts.reduce((s, p) => s + (parseFloat(p.montant) || 0), 0) * 100) / 100;

/**
 * @param {object} paiement  la ligne en attente { id, intitule, montant }
 * @param {string} [pourQui] nom affiché sous le récap
 * @param {function} onDone  reçoit les lignes réglées telles que la route les rend
 * @param {string} [confirmLabel]
 */
export default function EncaisserForm({ paiement, pourQui, onDone, confirmLabel = 'Encaisser' }) {
  const { toast } = useToast();
  const total = parseFloat(paiement?.montant) || 0;
  const [plusieurs, setPlusieurs] = useState(false);
  const [mode, setMode] = useState('');           // jamais présélectionné
  const [date, setDate] = useState(() => aujourdhuiParis());
  const [cheque, setCheque] = useState('');
  const [notes, setNotes] = useState('');
  const [parts, setParts] = useState(() => decouperMontant(total, 2).map(m => ({ montant: String(m), mode: '', numero_cheque: '', date_encaissement: aujourdhuiParis() })));
  const [erreur, setErreur] = useState('');
  const [loading, setLoading] = useState(false);

  const updatePart = (i, champ, valeur) => {
    setParts(prev => prev.map((p, k) => (k === i ? { ...p, [champ]: valeur } : p)));
    setErreur('');
  };
  const ajouterPart = () => {
    if (parts.length >= MAX_PARTS) return;
    setParts(prev => {
      const reste = Math.round((total - somme(prev)) * 100) / 100;
      return [...prev, { montant: reste > 0 ? String(reste) : '', mode: '', numero_cheque: '', date_encaissement: aujourdhuiParis() }];
    });
  };
  const retirerPart = () => { if (parts.length > 2) setParts(prev => prev.slice(0, -1)); };

  const sommeParts = somme(parts);
  const sommeJuste = Math.abs(sommeParts - total) < 0.011;
  const verdictParts = plusieurs ? validerParts(parts, total, { aujourdhui: aujourdhuiParis() }) : null;
  const pretUnique = !plusieurs && !!mode && !!date;
  const pretParts = plusieurs && verdictParts?.ok;

  const submit = async () => {
    if (loading) return;
    let body;
    if (plusieurs) {
      const v = validerParts(parts, total, { aujourdhui: aujourdhuiParis() });
      if (!v.ok) { setErreur(v.erreur); return; }
      body = { parts: v.parts, ...(notes.trim() ? { notes: notes.trim() } : {}) };
    } else {
      if (!mode) { setErreur('Déclare comment l\'argent est arrivé : espèces, chèque, virement ou CB.'); return; }
      body = {
        mode,
        date_encaissement: date,
        ...(notes.trim() ? { notes: notes.trim() } : {}),
        ...(mode === 'cheque' && cheque.trim() ? { numero_cheque: cheque.trim() } : {}),
      };
    }
    setLoading(true);
    setErreur('');
    try {
      const res = await fetch(`/api/paiements/${paiement.id}/encaisser`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || 'Erreur');
      const lignes = Array.isArray(json.paiements) && json.paiements.length
        ? json.paiements
        : [{ ...paiement, statut: 'paid', mode, date_encaissement: date }];
      toast.success(plusieurs ? `Encaissé en ${lignes.length} moyens` : 'Paiement encaissé !');
      onDone?.(lignes);
    } catch (e) {
      setErreur(e.message);
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="ef">
      <div className="ef-recap">
        <span className="ef-recap-nom">{paiement?.intitule || 'Paiement'}</span>
        <span className="ef-recap-sub">{formatMontant(total)}{pourQui ? ` · pour ${pourQui}` : ''}</span>
      </div>

      <div className="ef-switch" role="tablist" aria-label="Comment l'argent est arrivé">
        <button type="button" role="tab" aria-selected={!plusieurs} className={`ef-switch-btn ${!plusieurs ? 'active' : ''}`} onClick={() => { setPlusieurs(false); setErreur(''); }}>
          Un seul moyen
        </button>
        <button type="button" role="tab" aria-selected={plusieurs} className={`ef-switch-btn ${plusieurs ? 'active' : ''}`} onClick={() => { setPlusieurs(true); setErreur(''); }}>
          Plusieurs moyens ou plusieurs chèques
        </button>
      </div>

      {!plusieurs ? (
        <>
          <div className="ef-label">Mode de règlement</div>
          <div className="ef-modes">
            {MODES.map(({ value, label, Icon }) => (
              <button key={value} type="button" className={`ef-mode ${mode === value ? 'active' : ''}`} onClick={() => { setMode(value); setErreur(''); }} aria-pressed={mode === value}>
                <Icon size={18} />
                <span>{label}</span>
              </button>
            ))}
          </div>
          {!mode && <p className="ef-hint">Choisis comment l&apos;argent est arrivé : IziSolo ne le devine jamais.</p>}
          {mode === 'cheque' && (
            <>
              <div className="ef-label">N° de chèque</div>
              <input className="izi-input" type="text" value={cheque} onChange={e => setCheque(e.target.value)} placeholder="Ex : 0012345" />
            </>
          )}
          <div className="ef-label">Date d&apos;encaissement <span className="ef-label-sub">(ex : dépôt du chèque)</span></div>
          <input className="izi-input" type="date" value={date} max={aujourdhuiParis()} onChange={e => setDate(e.target.value)} />
        </>
      ) : (
        <>
          <p className="ef-hint">
            Un seul paiement, réglé en plusieurs fois : deux chèques, ou espèces + CB. Chaque ligne
            part dans ta compta avec SON moyen et SA date, et le total doit tomber juste.
          </p>
          <div className="ef-parts">
            {parts.map((p, i) => (
              <div key={i} className="ef-part">
                <span className="ef-part-n">#{i + 1}</span>
                <div className="ef-part-grid">
                  <input
                    type="number" step="0.01" min="0"
                    className="izi-input ef-part-montant"
                    value={p.montant}
                    onChange={e => updatePart(i, 'montant', e.target.value)}
                    aria-label={`Montant du moyen ${i + 1}`}
                  />
                  <select
                    className="izi-input ef-part-mode"
                    value={p.mode}
                    onChange={e => updatePart(i, 'mode', e.target.value)}
                    aria-label={`Moyen de paiement ${i + 1}`}
                  >
                    <option value="">Moyen ?</option>
                    {MODES.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                  </select>
                  <input
                    type="date"
                    className="izi-input ef-part-date"
                    value={p.date_encaissement}
                    max={aujourdhuiParis()}
                    onChange={e => updatePart(i, 'date_encaissement', e.target.value)}
                    aria-label={`Date d'encaissement du moyen ${i + 1}`}
                  />
                  {p.mode === 'cheque' && (
                    <input
                      type="text"
                      className="izi-input ef-part-cheque"
                      value={p.numero_cheque}
                      onChange={e => updatePart(i, 'numero_cheque', e.target.value)}
                      placeholder="N° de chèque"
                      aria-label={`Numéro du chèque ${i + 1}`}
                    />
                  )}
                </div>
              </div>
            ))}
          </div>
          <div className="ef-part-actions">
            <button type="button" className="ef-part-btn" onClick={ajouterPart} disabled={parts.length >= MAX_PARTS}>+ Ajouter un moyen</button>
            {parts.length > 2 && <button type="button" className="ef-part-btn" onClick={retirerPart}>Retirer le dernier</button>}
          </div>
          <div className={`ef-total ${sommeJuste ? 'ok' : 'warn'}`}>
            Total : {formatMontant(sommeParts)} / {formatMontant(total)}
          </div>
        </>
      )}

      <div className="ef-label">Notes (optionnel)</div>
      <input className="izi-input" type="text" value={notes} onChange={e => setNotes(e.target.value)} placeholder="Référence virement, remarque..." />

      {erreur && <p className="ef-erreur" role="alert">{erreur}</p>}

      <button
        type="button"
        className="izi-btn izi-btn-primary ef-confirm confirm-btn"
        onClick={submit}
        disabled={loading || !(pretUnique || pretParts)}
      >
        {loading ? <><Loader2 size={16} className="spin" /> Enregistrement...</> : <><CheckCircle2 size={16} /> {plusieurs ? `${confirmLabel} en ${parts.length} moyens` : confirmLabel}</>}
      </button>

      <style jsx>{`
        .ef { display: flex; flex-direction: column; }
        .ef-recap { display: flex; flex-direction: column; gap: 2px; padding: 10px 12px; background: var(--bg-warm, #f8f5f0); border-radius: 10px; margin-bottom: 12px; }
        .ef-recap-nom { font-weight: 600; font-size: 0.9375rem; }
        .ef-recap-sub { font-size: 0.8125rem; color: var(--text-muted, #6b6560); }
        .ef-switch { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; background: var(--bg-warm, #f8f5f0); padding: 4px; border-radius: 10px; margin-bottom: 12px; }
        .ef-switch-btn { border: 0; background: transparent; border-radius: 8px; padding: 8px 10px; font: inherit; font-size: 0.8125rem; font-weight: 500; color: var(--text-muted, #6b6560); cursor: pointer; }
        .ef-switch-btn.active { background: #fff; color: var(--text, #2a2420); box-shadow: 0 1px 2px rgba(0,0,0,0.08); font-weight: 600; }
        .ef-label { font-size: 0.75rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.04em; color: var(--text-muted, #6b6560); margin: 12px 0 6px; }
        .ef-label-sub { text-transform: none; letter-spacing: 0; font-weight: 400; }
        .ef-modes { display: grid; grid-template-columns: repeat(4, 1fr); gap: 6px; }
        .ef-mode { display: flex; flex-direction: column; align-items: center; gap: 4px; padding: 10px 4px; border: 1.5px solid var(--border, #e6e0d8); border-radius: 10px; background: #fff; font: inherit; font-size: 0.75rem; cursor: pointer; color: var(--text, #2a2420); }
        .ef-mode.active { border-color: var(--brand, #B87333); background: var(--brand-tint, #fbf1e8); font-weight: 600; }
        .ef-hint { font-size: 0.8125rem; color: var(--text-muted, #6b6560); margin: 8px 0 0; line-height: 1.45; }
        .ef-parts { display: flex; flex-direction: column; gap: 8px; margin-top: 10px; }
        .ef-part { display: flex; gap: 8px; align-items: flex-start; }
        .ef-part-n { font-size: 0.75rem; font-weight: 600; color: var(--text-muted, #6b6560); padding-top: 10px; width: 22px; flex: none; }
        .ef-part-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; flex: 1; }
        .ef-part-cheque { grid-column: 1 / -1; }
        .ef-part-actions { display: flex; gap: 8px; margin-top: 8px; }
        .ef-part-btn { border: 1px dashed var(--border, #e6e0d8); background: #fff; border-radius: 8px; padding: 6px 10px; font: inherit; font-size: 0.8125rem; cursor: pointer; }
        .ef-part-btn:disabled { opacity: 0.5; cursor: default; }
        .ef-total { margin-top: 10px; padding: 8px 10px; border-radius: 8px; font-size: 0.875rem; font-weight: 600; }
        .ef-total.ok { background: #ecfdf5; color: #065f46; }
        .ef-total.warn { background: #fef3c7; color: #92400e; }
        .ef-erreur { margin: 10px 0 0; padding: 8px 10px; border-radius: 8px; background: #fef2f2; color: #991b1b; font-size: 0.8125rem; line-height: 1.4; }
        .ef-confirm { margin-top: 14px; width: 100%; justify-content: center; }
        @media (max-width: 480px) {
          .ef-modes { grid-template-columns: repeat(2, 1fr); }
          .ef-switch { grid-template-columns: 1fr; }
        }
      `}</style>
    </div>
  );
}
