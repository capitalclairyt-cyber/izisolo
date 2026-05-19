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
  const [notes, setNotes] = useState('');
  const [multiVersement, setMultiVersement] = useState(false);
  const [nbVersements, setNbVersements] = useState(3);
  const [rythme, setRythme] = useState(1);
  const [versements, setVersements] = useState([]);
  const [error, setError] = useState('');

  const regenerate = (nb = nbVersements, r = rythme) => {
    if (montant) setVersements(generateVersements(parseFloat(montant), nb, r));
  };

  const toggleMulti = (on) => {
    setMultiVersement(on);
    if (on) regenerate();
  };

  const changeNbVersements = (n) => {
    setNbVersements(n);
    regenerate(n, rythme);
  };

  const changeRythme = (r) => {
    setRythme(r);
    regenerate(nbVersements, r);
  };

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
      multiVersement,
      versements,
    });
  };

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

      <div className="paiement-section-label">Montant total</div>
      <div className="montant-row">
        <input
          className="izi-input montant-input"
          type="number" step="0.01" min="0"
          value={montant}
          onChange={e => setMontant(e.target.value)}
          placeholder="0.00"
        />
        <span className="montant-currency">€</span>
      </div>
      {!isLibre && parseFloat(montant) !== offrePrix && montant && (
        <p className="montant-hint">Prix catalogue : {formatMontant(offrePrix)}</p>
      )}

      {!isLibre && (
        <>
          <div className="paiement-section-label">Paiement en plusieurs fois</div>
          <div className="multi-toggle-row">
            <button type="button" className={`multi-toggle-btn ${!multiVersement ? 'active' : ''}`} onClick={() => toggleMulti(false)}>En 1 fois</button>
            <button type="button" className={`multi-toggle-btn ${multiVersement ? 'active' : ''}`} onClick={() => toggleMulti(true)}>Plusieurs fois</button>
          </div>
          {multiVersement && (
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

              <div className="multi-v-list">
                {versements.map((v, i) => (
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
                    <span className={`multi-v-statut ${i === 0 ? 'paid' : 'pending'}`}>{i === 0 ? 'Payé' : 'À venir'}</span>
                  </div>
                ))}
              </div>
              {(() => {
                const sum = versements.reduce((s, v) => s + (typeof v.montant === 'number' ? v.montant : parseFloat(v.montant) || 0), 0);
                const total = parseFloat(montant) || 0;
                const ok = Math.abs(sum - total) < 0.02;
                return <div className={`multi-total ${ok ? 'ok' : 'warn'}`}>Total : {formatMontant(sum)} / {formatMontant(total)}</div>;
              })()}
            </>
          )}
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
        {submitting ? <><Loader2 size={16} className="spin" /> Enregistrement...</> : <>✓ Valider le paiement</>}
      </button>

      <style jsx global>{`
        .multi-v-date-input { flex: 1; font-size: 0.8125rem !important; padding: 6px 8px !important; min-width: 0; }
        .multi-v-montant-input { width: 80px; font-size: 0.8125rem !important; padding: 6px 8px !important; text-align: right; font-weight: 600; }
      `}</style>
    </div>
  );
}
