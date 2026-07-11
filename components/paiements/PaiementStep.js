'use client';

import { useState } from 'react';
import {
  Banknote, FileText, Landmark, CreditCard, CreditCard as CardIcon,
  Loader2,
} from 'lucide-react';
import { formatMontant } from '@/lib/utils';

const MODES_PAIEMENT = [
  { value: 'especes',  label: 'Espèces',  Icon: Banknote },
  { value: 'cheque',   label: 'Chèque',   Icon: FileText },
  { value: 'virement', label: 'Virement', Icon: Landmark },
  { value: 'CB',       label: 'CB',       Icon: CreditCard },
];

const RYTHMES = [
  { value: 1,  label: 'Mensuel' },
  { value: 2,  label: 'Bimensuel' },
  { value: 3,  label: 'Trimestriel' },
];

function generateVersements(total, nb, rythmeMonths = 1) {
  const base = Math.floor((total / nb) * 100) / 100;
  const reste = Math.round((total - base * nb) * 100) / 100;
  const today = new Date();
  return Array.from({ length: nb }, (_, i) => {
    const d = new Date(today);
    d.setMonth(d.getMonth() + i * rythmeMonths);
    return {
      montant: i === 0 ? +(base + reste).toFixed(2) : base,
      date: d.toISOString().split('T')[0],
    };
  });
}

export { generateVersements, MODES_PAIEMENT };

export default function PaiementStep({
  offreNom,
  clientNom,
  offrePrix,
  isLibre = false,
  intituleLibre = '',
  onIntituleLibreChange,
  onConfirm,
  submitting = false,
}) {
  const [montant, setMontant] = useState(isLibre ? '' : String(offrePrix || ''));
  const [modePaiement, setModePaiement] = useState('especes');
  const [numeroCheque, setNumeroCheque] = useState('');
  const [notes, setNotes] = useState('');
  // Mode de règlement : 'paye' (encaissé maintenant), 'aregler' (impayé, à
  // régler plus tard), 'multi' (échéancier en plusieurs fois).
  const [reglement, setReglement] = useState('paye');
  // Pour l'échéancier : le 1er versement est-il déjà encaissé ?
  const [premierEncaisse, setPremierEncaisse] = useState(true);
  const [nbVersements, setNbVersements] = useState(3);
  const [rythme, setRythme] = useState(1);
  const [versements, setVersements] = useState([]);
  const [error, setError] = useState('');

  const isMulti = reglement === 'multi';
  const isAregler = reglement === 'aregler';

  const regenerate = (nb = nbVersements, r = rythme) => {
    if (montant) setVersements(generateVersements(parseFloat(montant), nb, r));
  };

  const selectReglement = (mode) => {
    setReglement(mode);
    if (mode === 'multi') regenerate();
  };

  const changeNbVersements = (n) => { setNbVersements(n); regenerate(n, rythme); };
  const changeRythme = (r) => { setRythme(r); regenerate(nbVersements, r); };

  const updateVersement = (idx, field, value) => {
    setVersements(prev => prev.map((v, i) => i === idx ? { ...v, [field]: field === 'montant' ? (parseFloat(value) || 0) : value } : v));
  };

  const handleConfirm = () => {
    if (!montant || parseFloat(montant) < 0) return;
    if (isLibre && !intituleLibre.trim()) {
      setError('Saisis un intitulé pour la prestation libre.');
      return;
    }
    setError('');
    onConfirm({
      montant: parseFloat(montant),
      modePaiement,
      notes: notes.trim() || null,
      numeroCheque: numeroCheque.trim() || null,
      reglement,               // 'paye' | 'aregler' | 'multi'
      premierEncaisse,         // pour l'échéancier
      versements: isMulti ? versements : [],
    });
  };

  // Options de règlement : 'multi' n'a pas de sens pour une prestation libre.
  const MODES_REGLEMENT = [
    { value: 'paye',    label: 'Payé maintenant' },
    { value: 'aregler', label: 'À régler plus tard' },
    ...(!isLibre ? [{ value: 'multi', label: 'En plusieurs fois' }] : []),
  ];

  const btnLabel = isAregler ? "Attribuer l'offre (à régler)"
    : isMulti ? "Enregistrer l'échéancier"
    : 'Valider le paiement';

  return (
    <div className="modal-body">
      <div className="paiement-recap">
        <span className="paiement-recap-nom">{isLibre ? 'Paiement libre' : offreNom}</span>
        <span className="paiement-recap-client">pour {clientNom}</span>
      </div>

      {isLibre && (
        <>
          <div className="paiement-section-label">Intitulé de la prestation</div>
          <input
            className="izi-input"
            type="text"
            value={intituleLibre}
            onChange={e => onIntituleLibreChange(e.target.value)}
            placeholder="Ex : Cours particulier, atelier découverte, frais matériel..."
            autoFocus
          />
        </>
      )}

      {/* Mode de règlement */}
      <div className="paiement-section-label">Règlement</div>
      <div className="reglement-row">
        {MODES_REGLEMENT.map(m => (
          <button
            key={m.value}
            type="button"
            className={`reglement-btn ${reglement === m.value ? 'active' : ''}`}
            onClick={() => selectReglement(m.value)}
          >
            {m.label}
          </button>
        ))}
      </div>

      {/* Mode de paiement — masqué si "à régler plus tard" (rien n'est encaissé) */}
      {!isAregler && (
        <>
          <div className="paiement-section-label">Mode de règlement</div>
          <div className="mode-grid">
            {MODES_PAIEMENT.map(({ value, label, Icon }) => (
              <button
                key={value}
                type="button"
                className={`mode-btn ${modePaiement === value ? 'active' : ''}`}
                onClick={() => setModePaiement(value)}
              >
                <Icon size={18} />
                <span>{label}</span>
              </button>
            ))}
            <button type="button" className="mode-btn mode-btn-soon" disabled title="Paiement en ligne — bientôt disponible">
              <CardIcon size={18} />
              <span>Lien CB</span>
              <span className="soon-badge">Bientôt</span>
            </button>
          </div>

          {modePaiement === 'cheque' && (
            <>
              <div className="paiement-section-label">N° de chèque</div>
              <input className="izi-input" type="text" value={numeroCheque} onChange={e => setNumeroCheque(e.target.value)} placeholder="Ex : 0012345" />
            </>
          )}
        </>
      )}

      <div className="paiement-section-label">{isAregler ? 'Montant dû' : 'Montant total'}</div>
      <div className="montant-row">
        <input
          className="izi-input montant-input"
          type="number" step="0.01" min="0"
          value={montant}
          onChange={e => { setMontant(e.target.value); if (isMulti) regenerate(); }}
          placeholder="0.00"
        />
        <span className="montant-currency">€</span>
      </div>
      {!isLibre && parseFloat(montant) !== offrePrix && montant && (
        <p className="montant-hint">Prix catalogue : {formatMontant(offrePrix)}</p>
      )}

      {isAregler && (
        <p className="montant-hint" style={{ color: '#b45309' }}>
          L'offre est attribuée tout de suite. Le montant apparaît en « à percevoir »
          — tu l'encaisses en un clic quand l'élève règle.
        </p>
      )}

      {/* Échéancier — détail des versements */}
      {isMulti && (
        <>
          <div className="multi-nb-chips">
            {[2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => (
              <button key={n} type="button" className={`multi-nb-chip ${nbVersements === n ? 'active' : ''}`} onClick={() => changeNbVersements(n)}>
                {n}x
              </button>
            ))}
          </div>

          <div className="paiement-section-label">Rythme</div>
          <div className="multi-nb-chips">
            {RYTHMES.map(r => (
              <button key={r.value} type="button" className={`multi-nb-chip ${rythme === r.value ? 'active' : ''}`} onClick={() => changeRythme(r.value)}>
                {r.label}
              </button>
            ))}
          </div>

          <label className="premier-encaisse-row">
            <input type="checkbox" checked={premierEncaisse} onChange={e => setPremierEncaisse(e.target.checked)} />
            Le 1<sup>er</sup> versement est déjà encaissé
          </label>

          <div className="multi-v-list">
            {versements.map((v, i) => {
              const encaisse = i === 0 && premierEncaisse;
              return (
                <div key={i} className="multi-v-row">
                  <span className="multi-v-label">{i === 0 ? "Auj." : `#${i + 1}`}</span>
                  <input
                    type="date"
                    className="izi-input multi-v-date-input"
                    value={v.date}
                    onChange={e => updateVersement(i, 'date', e.target.value)}
                  />
                  <input
                    type="number" step="0.01" min="0"
                    className="izi-input multi-v-montant-input"
                    value={v.montant}
                    onChange={e => updateVersement(i, 'montant', e.target.value)}
                  />
                  <span className={`multi-v-statut ${encaisse ? 'paid' : 'pending'}`}>{encaisse ? 'Payé' : 'À venir'}</span>
                </div>
              );
            })}
          </div>
          {(() => {
            const sum = versements.reduce((s, v) => s + (typeof v.montant === 'number' ? v.montant : parseFloat(v.montant) || 0), 0);
            const total = parseFloat(montant) || 0;
            const ok = Math.abs(sum - total) < 0.02;
            return <div className={`multi-total ${ok ? 'ok' : 'warn'}`}>Total : {formatMontant(sum)} / {formatMontant(total)}</div>;
          })()}
        </>
      )}

      <div className="paiement-section-label">Notes (optionnel)</div>
      <input
        className="izi-input"
        type="text"
        value={notes}
        onChange={e => setNotes(e.target.value)}
        placeholder="N° chèque, référence virement..."
      />

      {error && <p className="error-msg">{error}</p>}

      <button
        type="button"
        className="izi-btn izi-btn-primary confirm-btn"
        onClick={handleConfirm}
        disabled={submitting || !montant}
      >
        {submitting ? <><Loader2 size={16} className="spin" /> Enregistrement...</> : <>✓ {btnLabel}</>}
      </button>

      <style jsx global>{`
        .reglement-row { display: flex; gap: 6px; }
        .reglement-btn {
          flex: 1; padding: 9px 8px; border-radius: 10px;
          border: 1.5px solid var(--border, #e5e0d8); background: var(--bg-card, #fff);
          font-size: 0.8125rem; font-weight: 600; color: var(--text-secondary, #6B5D52);
          cursor: pointer; transition: all 0.15s;
        }
        .reglement-btn.active { border-color: var(--brand, #B87333); background: var(--brand-light, #f7efe6); color: var(--brand-700, #8c5826); }
        .premier-encaisse-row {
          display: flex; align-items: center; gap: 8px; margin: 10px 0 4px;
          font-size: 0.8125rem; color: var(--text-secondary, #6B5D52); cursor: pointer;
        }
        .multi-v-date-input { flex: 1; font-size: 0.8125rem !important; padding: 6px 8px !important; min-width: 0; }
        .multi-v-montant-input { width: 80px; font-size: 0.8125rem !important; padding: 6px 8px !important; text-align: right; font-weight: 600; }
      `}</style>
    </div>
  );
}
