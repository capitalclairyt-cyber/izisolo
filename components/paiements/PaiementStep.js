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
      // Encaissement PAR VERSEMENT (question Colin 2026-08-20 : « 80 € en
      // liquide et 43 € en CB ») : chaque ligne dit si elle est déjà réglée
      // et COMMENT — le mode n'a pas de défaut (fix Kim, même philosophie).
      encaisse: i === 0,
      mode: '',
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
  // Retour Kim 2026-08-20 : « aucune info de paiement renseignée » et pourtant
  // un encaissement enregistré — parce que TOUT était présélectionné (« Payé
  // maintenant » + « Espèces »). Le mode n'a plus de défaut : déclarer COMMENT
  // l'argent est arrivé est le geste conscient minimal avant d'écrire « payé »
  // (ces lignes partent dans l'export comptable et les factures v84).
  const [modePaiement, setModePaiement] = useState('');
  const [numeroCheque, setNumeroCheque] = useState('');
  const [notes, setNotes] = useState('');
  // Mode de règlement : 'paye' (encaissé maintenant), 'aregler' (impayé, à
  // régler plus tard), 'multi' (échéancier en plusieurs fois — l'encaissé et
  // le mode vivent PAR VERSEMENT depuis le 2026-08-20).
  const [reglement, setReglement] = useState('paye');
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

  // Le mode GLOBAL n'est requis que pour « payé maintenant » (paiement simple) ;
  // en échéancier, chaque versement encaissé porte SON mode.
  const modeRequis = !isAregler && !isMulti;
  const chequeQuelquePart = (modeRequis && modePaiement === 'cheque')
    || (isMulti && versements.some(v => v.encaisse && v.mode === 'cheque'));

  const handleConfirm = () => {
    if (!montant || parseFloat(montant) < 0) return;
    if (isLibre && !intituleLibre.trim()) {
      setError('Saisis un intitulé pour la prestation libre.');
      return;
    }
    if (modeRequis && !modePaiement) {
      setError('Comment as-tu été payée ? Choisis le mode de règlement (espèces, chèque, virement, CB).');
      return;
    }
    if (isMulti && versements.some(v => v.encaisse && !v.mode)) {
      setError('Un versement encaissé doit dire comment : choisis son mode (espèces, chèque, virement, CB).');
      return;
    }
    setError('');
    onConfirm({
      montant: parseFloat(montant),
      modePaiement,
      notes: notes.trim() || null,
      numeroCheque: numeroCheque.trim() || null,
      reglement,               // 'paye' | 'aregler' | 'multi'
      // compat : dérivé des lignes (l'encaissé vit par versement désormais)
      premierEncaisse: isMulti ? versements[0]?.encaisse === true : true,
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
      {/* Retour Kim 2026-08-20 : « Payé maintenant » (le défaut) a été lu comme
          « l'élève va payer » → notification d'encaissement jugée fausse. On dit
          explicitement que ce mode = argent déjà reçu, rien demandé à l'élève. */}
      {reglement === 'paye' && (
        <p className="montant-hint" style={{ marginTop: 6 }}>
          Tu as déjà reçu ce montant (espèces, chèque, virement…) : il est enregistré
          direct dans tes revenus, rien n&apos;est demandé à l&apos;élève.
        </p>
      )}

      {/* Mode de paiement — affiché seulement si un montant est encaissé
          maintenant (masqué : « à régler plus tard », échéancier sans 1er
          versement encaissé). Aucune présélection : choisir = déclarer. */}
      {modeRequis && (
        <>
          <div className="paiement-section-label">Mode de règlement</div>
          <div className="mode-grid">
            {MODES_PAIEMENT.map(({ value, label, Icon }) => (
              <button
                key={value}
                type="button"
                className={`mode-btn ${modePaiement === value ? 'active' : ''}`}
                onClick={() => { setModePaiement(value); setError(''); }}
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

          {/* Arrondi aux euros (appel Patricia 2026-08-18) : versements entiers,
              le 1er absorbe le reliquat pour que le total reste exact.
              Montants toujours modifiables à la main ensuite. */}
          {versements.some(v => (parseFloat(v.montant) || 0) % 1 !== 0) && (
            <button
              type="button"
              className="multi-arrondir-btn"
              onClick={() => {
                const total = parseFloat(montant) || 0;
                const nb = versements.length;
                if (!total || nb < 2) return;
                const base = Math.round(total / nb);
                const premier = +(total - base * (nb - 1)).toFixed(2);
                setVersements(prev => prev.map((v, i) => ({ ...v, montant: i === 0 ? premier : base })));
              }}
            >
              Arrondir aux euros (ex : {(() => {
                const total = parseFloat(montant) || 0;
                const nb = versements.length;
                const base = Math.round(total / nb);
                return `${+(total - base * (nb - 1)).toFixed(2)} € puis ${nb - 1} × ${base} €`;
              })()})
            </button>
          )}

          {/* Encaissé + mode PAR VERSEMENT (2026-08-20) : « 80 € en liquide et
              43 € en CB le même jour » se fait en un geste. Un versement coché
              « Payé » exige son mode (aucun défaut — fix Kim). */}
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
                <label className="multi-v-enc" title="Ce versement est déjà réglé">
                  <input
                    type="checkbox"
                    checked={v.encaisse === true}
                    onChange={e => { updateVersement(i, 'encaisse', e.target.checked); setError(''); }}
                  />
                  Payé
                </label>
                {v.encaisse === true ? (
                  <select
                    className="izi-input multi-v-mode"
                    value={v.mode || ''}
                    onChange={e => { updateVersement(i, 'mode', e.target.value); setError(''); }}
                    aria-label={`Mode de règlement du versement ${i + 1}`}
                  >
                    <option value="">Mode ?</option>
                    {MODES_PAIEMENT.map(m => (
                      <option key={m.value} value={m.value}>{m.label}</option>
                    ))}
                  </select>
                ) : (
                  <span className="multi-v-statut pending">À venir</span>
                )}
              </div>
            ))}
          </div>
          {isMulti && chequeQuelquePart && (
            <>
              <div className="paiement-section-label">N° de chèque</div>
              <input className="izi-input" type="text" value={numeroCheque} onChange={e => setNumeroCheque(e.target.value)} placeholder="Ex : 0012345" />
            </>
          )}
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
        .multi-v-enc {
          display: flex; align-items: center; gap: 4px; white-space: nowrap;
          font-size: 0.75rem; color: var(--text-secondary, #6B5D52); cursor: pointer;
        }
        .multi-v-enc input { accent-color: var(--brand, #B87333); }
        .multi-v-mode { width: 96px; font-size: 0.78rem !important; padding: 6px 4px !important; }
        .multi-arrondir-btn {
          align-self: flex-start; margin: 2px 0 6px;
          background: none; border: 1px dashed var(--brand-200, #e8d3bd); border-radius: 99px;
          padding: 5px 12px; font-size: 0.78rem; font-weight: 600; font-family: inherit;
          color: var(--brand, #B87333); cursor: pointer;
        }
        .multi-arrondir-btn:hover { background: var(--brand-light, #f7efe6); }
        .multi-v-date-input { flex: 1; font-size: 0.8125rem !important; padding: 6px 8px !important; min-width: 0; }
        .multi-v-montant-input { width: 80px; font-size: 0.8125rem !important; padding: 6px 8px !important; text-align: right; font-weight: 600; }
      `}</style>
    </div>
  );
}
