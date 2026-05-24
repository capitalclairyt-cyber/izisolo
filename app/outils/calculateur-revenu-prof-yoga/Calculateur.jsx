'use client';

import { useState, useMemo } from 'react';

/**
 * Calculateur.jsx — composant client interactif.
 *
 * State :
 *   - 3 sliders revenus principaux (tarif, cours/sem, élèves/cours)
 *   - 3 toggles sources complémentaires + leurs mini-inputs
 *   - statut juridique (radio)
 *   - loyer salle (slider)
 *
 * Calculs (en temps réel via useMemo) :
 *   - CA brut mensuel (somme des sources × facteurs)
 *   - URSSAF 21,2 % du CA (micro) — approximé en réel
 *   - IR versement libératoire 2,2 % du CA
 *   - Autres charges forfait 150 €
 *   - Revenu net = CA - charges
 *   - Zone selon revenu net (Débutante / Confirmée / Expérimentée / Studio)
 *   - Répartition % pour le donut
 *   - Insight "élèves +3" pour le bloc pédagogique
 */
export default function Calculateur() {
  // ─── State principal ────────────────────────────────────────
  const [tarif, setTarif] = useState(15);
  const [coursSemaine, setCoursSemaine] = useState(10);
  const [elevesMoyen, setElevesMoyen] = useState(7);

  const [partActif, setPartActif] = useState(true);
  const [partNbSem, setPartNbSem] = useState(3);
  const [partTarif, setPartTarif] = useState(60);

  const [entActif, setEntActif] = useState(true);
  const [entNbMois, setEntNbMois] = useState(2);
  const [entTarif, setEntTarif] = useState(120);

  const [stagesActif, setStagesActif] = useState(false);
  const [stagesTrim, setStagesTrim] = useState(1200);

  const [statut, setStatut] = useState('micro');
  const [loyer, setLoyer] = useState(350);

  // ─── Calculs ─────────────────────────────────────────────────
  const c = useMemo(() => {
    const caCollectif = tarif * coursSemaine * elevesMoyen * 4.3;
    const caParticuliers = partActif ? partNbSem * partTarif * 4 : 0;
    const caEntreprise = entActif ? entNbMois * entTarif : 0;
    const caStages = stagesActif ? stagesTrim / 3 : 0;
    const caBrut = caCollectif + caParticuliers + caEntreprise + caStages;

    // Micro-entreprise : URSSAF 21,2 % du CA brut
    // EI au réel : approximé à 40 % du bénéfice (CA - charges hors URSSAF)
    let urssaf, ir;
    if (statut === 'micro') {
      urssaf = caBrut * 0.212;
      ir = caBrut * 0.022;
    } else {
      // Approximation simplifiée pour le mockup
      const beneficeAvantCotis = caBrut - loyer - 150;
      urssaf = beneficeAvantCotis * 0.40;
      ir = beneficeAvantCotis * 0.08; // tranche moyenne IR
    }
    const autresCharges = 150;
    const totalCharges = urssaf + ir + loyer + autresCharges;
    const revenuNet = Math.max(0, caBrut - totalCharges);

    // Zone
    let zone, zoneRange, zoneClass;
    if (revenuNet >= 3800) {
      zone = 'Studio propre / multi-villes';
      zoneRange = '3 800 — 8 500 € net / mois';
      zoneClass = 'zone-sky';
    } else if (revenuNet >= 2900) {
      zone = 'Expérimentée';
      zoneRange = '2 900 — 4 900 € net / mois';
      zoneClass = 'zone-sage';
    } else if (revenuNet >= 1700) {
      zone = 'Confirmée';
      zoneRange = '1 700 — 3 200 € net / mois';
      zoneClass = 'zone-yellow';
    } else {
      zone = 'Débutante';
      zoneRange = '600 — 1 400 € net / mois';
      zoneClass = 'zone-blush';
    }

    // Donut %
    const pct = (v) => (caBrut > 0 ? (v / caBrut) * 100 : 0);
    const pctCol = pct(caCollectif);
    const pctPart = pct(caParticuliers);
    const pctEnt = pct(caEntreprise);
    const pctStages = pct(caStages);

    // Insight : si tu passais à elevesMoyen + 3 (cap 12)
    const elevesCible = Math.min(elevesMoyen + 3, 14);
    const deltaCA = (elevesCible - elevesMoyen) * tarif * coursSemaine * 4.3;
    const deltaNet = deltaCA * (1 - (statut === 'micro' ? 0.212 + 0.022 : 0.48));

    return {
      caCollectif, caParticuliers, caEntreprise, caStages, caBrut,
      urssaf, ir, autresCharges, loyer, totalCharges, revenuNet,
      zone, zoneRange, zoneClass,
      pctCol, pctPart, pctEnt, pctStages,
      elevesCible, deltaNet,
    };
  }, [tarif, coursSemaine, elevesMoyen, partActif, partNbSem, partTarif, entActif, entNbMois, entTarif, stagesActif, stagesTrim, statut, loyer]);

  // ─── Helpers ────────────────────────────────────────────────
  const fmt = (n) => Math.round(n).toLocaleString('fr-FR').replace(/ /g, ' ') + ' €';
  const fmtInt = (n) => Math.round(n).toLocaleString('fr-FR').replace(/ /g, ' ');

  // Background dynamique du slider (track rempli = couleur saturée jusqu'au thumb)
  const sliderBg = (val, min, max, color) => {
    const pct = ((val - min) / (max - min)) * 100;
    return `linear-gradient(to right, ${color} 0%, ${color} ${pct}%, color-mix(in oklch, var(--c-ink) 10%, transparent) ${pct}%, color-mix(in oklch, var(--c-ink) 10%, transparent) 100%)`;
  };

  // Donut conic-gradient en fonction des % calculés
  const donutBg = useMemo(() => {
    let start = 0;
    const segs = [];
    if (c.pctCol > 0) {
      segs.push(`var(--calc-positive) ${start}% ${start + c.pctCol}%`);
      start += c.pctCol;
    }
    if (c.pctPart > 0) {
      segs.push(`var(--calc-amber) ${start}% ${start + c.pctPart}%`);
      start += c.pctPart;
    }
    if (c.pctEnt > 0) {
      segs.push(`var(--calc-blush) ${start}% ${start + c.pctEnt}%`);
      start += c.pctEnt;
    }
    if (c.pctStages > 0) {
      segs.push(`var(--calc-sky) ${start}% ${start + c.pctStages}%`);
      start += c.pctStages;
    }
    return segs.length > 0
      ? `conic-gradient(${segs.join(', ')})`
      : `conic-gradient(color-mix(in oklch, var(--c-ink) 10%, transparent) 0% 100%)`;
  }, [c]);

  return (
    <div className="outil-grid">

      {/* ═══ INPUTS ═══════════════════════════════════════════ */}
      <section className="outil-inputs">

        <h2 className="serif">
          <span className="eyebrow">Étape 1</span>
          Tes revenus
        </h2>

        {/* Tarif cours collectif */}
        <div className="input-block is-revenu">
          <label htmlFor="tarif-cours">
            Tarif moyen par cours collectif
            <span className="input-value">{tarif} €</span>
          </label>
          <input
            id="tarif-cours"
            type="range"
            min="8"
            max="30"
            value={tarif}
            onChange={(e) => setTarif(Number(e.target.value))}
            className="input-range"
            style={{ background: sliderBg(tarif, 8, 30, 'var(--calc-positive)') }}
          />
          <div className="input-scale">
            <span>8 €</span>
            <span>30 €</span>
          </div>
        </div>

        {/* Cours par semaine */}
        <div className="input-block is-revenu">
          <label htmlFor="cours-sem">
            Nombre de cours par semaine
            <span className="input-value">{coursSemaine}</span>
          </label>
          <input
            id="cours-sem"
            type="range"
            min="0"
            max="25"
            value={coursSemaine}
            onChange={(e) => setCoursSemaine(Number(e.target.value))}
            className="input-range"
            style={{ background: sliderBg(coursSemaine, 0, 25, 'var(--calc-positive)') }}
          />
          <div className="input-scale">
            <span>0</span>
            <span>25</span>
          </div>
        </div>

        {/* Élèves par cours */}
        <div className="input-block is-revenu">
          <label htmlFor="eleves-cours">
            Élèves en moyenne par cours
            <span className="input-value">{elevesMoyen}</span>
          </label>
          <input
            id="eleves-cours"
            type="range"
            min="1"
            max="20"
            value={elevesMoyen}
            onChange={(e) => setElevesMoyen(Number(e.target.value))}
            className="input-range"
            style={{ background: sliderBg(elevesMoyen, 1, 20, 'var(--calc-positive)') }}
          />
          <div className="input-scale">
            <span>1</span>
            <span>20</span>
          </div>
        </div>

        {/* Sources complémentaires */}
        <div className="input-divider">
          <span>Sources complémentaires</span>
        </div>

        {/* Cours particuliers */}
        <div className={`input-toggle-block is-revenu ${partActif ? 'active' : ''}`}>
          <label className="input-toggle">
            <input type="checkbox" checked={partActif} onChange={(e) => setPartActif(e.target.checked)} />
            <span className="toggle-track"><span className="toggle-thumb"></span></span>
            <span className="toggle-label">Cours particuliers (1-à-1)</span>
          </label>
          {partActif && (
            <div className="toggle-inputs">
              <div className="input-row">
                <span className="micro-label">Nb / semaine</span>
                <Stepper value={partNbSem} onChange={setPartNbSem} min={1} max={10} className="positive" />
              </div>
              <div className="input-row">
                <span className="micro-label">Tarif moyen (€)</span>
                <Stepper value={partTarif} onChange={setPartTarif} min={30} max={150} step={5} suffix="€" className="positive" />
              </div>
            </div>
          )}
        </div>

        {/* Cours entreprise */}
        <div className={`input-toggle-block is-revenu ${entActif ? 'active' : ''}`}>
          <label className="input-toggle">
            <input type="checkbox" checked={entActif} onChange={(e) => setEntActif(e.target.checked)} />
            <span className="toggle-track"><span className="toggle-thumb"></span></span>
            <span className="toggle-label">Cours en entreprise (CSE)</span>
          </label>
          {entActif && (
            <div className="toggle-inputs">
              <div className="input-row">
                <span className="micro-label">Nb / mois</span>
                <Stepper value={entNbMois} onChange={setEntNbMois} min={1} max={12} className="positive" />
              </div>
              <div className="input-row">
                <span className="micro-label">Tarif moyen (€)</span>
                <Stepper value={entTarif} onChange={setEntTarif} min={70} max={250} step={10} suffix="€" className="positive" />
              </div>
            </div>
          )}
        </div>

        {/* Stages */}
        <div className={`input-toggle-block is-revenu ${stagesActif ? 'active' : ''}`}>
          <label className="input-toggle">
            <input type="checkbox" checked={stagesActif} onChange={(e) => setStagesActif(e.target.checked)} />
            <span className="toggle-track"><span className="toggle-thumb"></span></span>
            <span className="toggle-label">Stages week-end</span>
          </label>
          {stagesActif && (
            <div className="toggle-inputs">
              <div className="input-row" style={{ gridColumn: '1 / -1' }}>
                <span className="micro-label">Revenu net moyen / trimestre (€)</span>
                <Stepper value={stagesTrim} onChange={setStagesTrim} min={300} max={5000} step={100} suffix="€" className="positive" />
              </div>
            </div>
          )}
        </div>

        <h2 className="serif">
          <span className="eyebrow">Étape 2</span>
          Tes coûts
        </h2>

        <div className="input-block">
          <label>Statut juridique</label>
          <div className="radio-group">
            <label className={`radio-pill ${statut === 'micro' ? 'active' : ''}`} onClick={() => setStatut('micro')}>
              <input type="radio" name="statut" checked={statut === 'micro'} readOnly />
              <span>Micro-entreprise</span>
            </label>
            <label className={`radio-pill ${statut === 'reel' ? 'active' : ''}`} onClick={() => setStatut('reel')}>
              <input type="radio" name="statut" checked={statut === 'reel'} readOnly />
              <span>EI au réel</span>
            </label>
          </div>
        </div>

        <div className="input-block is-cout">
          <label htmlFor="loyer">
            Loyer salle mensuel
            <span className="input-value">{loyer} €</span>
          </label>
          <input
            id="loyer"
            type="range"
            min="0"
            max="1000"
            value={loyer}
            step="25"
            onChange={(e) => setLoyer(Number(e.target.value))}
            className="input-range"
            style={{ background: sliderBg(loyer, 0, 1000, 'var(--calc-negative)') }}
          />
          <div className="input-scale">
            <span>0 €</span>
            <span>1 000 €</span>
          </div>
        </div>

      </section>

      {/* ═══ OUTPUT ═══════════════════════════════════════════ */}
      <section className="outil-output">

        {/* Hero number */}
        <div className="output-hero">
          <span className="eyebrow">Ton revenu net mensuel estimé</span>
          <div className="output-big-number">
            {fmtInt(c.revenuNet)} <span className="output-unit">€</span>
          </div>
          <div className="output-period">par mois</div>
          <div className={`output-zone ${c.zoneClass}`}>
            <span className="zone-dot"></span>
            Zone <em>« {c.zone} »</em>
            <span className="zone-range">{c.zoneRange}</span>
          </div>
        </div>

        {/* Breakdown */}
        <div className="output-breakdown">
          {c.caCollectif > 0 && (
            <div className="breakdown-row breakdown-positive">
              <span>Cours collectifs</span>
              <span className="amount">+ {fmt(c.caCollectif)}</span>
            </div>
          )}
          {c.caParticuliers > 0 && (
            <div className="breakdown-row breakdown-positive">
              <span>Cours particuliers</span>
              <span className="amount">+ {fmt(c.caParticuliers)}</span>
            </div>
          )}
          {c.caEntreprise > 0 && (
            <div className="breakdown-row breakdown-positive">
              <span>Cours entreprise</span>
              <span className="amount">+ {fmt(c.caEntreprise)}</span>
            </div>
          )}
          {c.caStages > 0 && (
            <div className="breakdown-row breakdown-positive">
              <span>Stages (lissés au mois)</span>
              <span className="amount">+ {fmt(c.caStages)}</span>
            </div>
          )}
          <div className="breakdown-row breakdown-subtotal">
            <span>Chiffre d&apos;affaires brut</span>
            <span className="amount">{fmt(c.caBrut)}</span>
          </div>
          <div className="breakdown-row">
            <span>URSSAF ({statut === 'micro' ? '21,2 %' : '~40 % bénéfice'})</span>
            <span className="amount amount-negative">− {fmt(c.urssaf)}</span>
          </div>
          <div className="breakdown-row">
            <span>IR ({statut === 'micro' ? 'versement libératoire 2,2 %' : 'tranche moyenne'})</span>
            <span className="amount amount-negative">− {fmt(c.ir)}</span>
          </div>
          <div className="breakdown-row">
            <span>Loyer salle</span>
            <span className="amount amount-negative">− {fmt(c.loyer)}</span>
          </div>
          <div className="breakdown-row">
            <span>Autres charges (assurance, outils...)</span>
            <span className="amount amount-negative">− {fmt(c.autresCharges)}</span>
          </div>
          <div className="breakdown-row breakdown-total">
            <span>Revenu net réel</span>
            <span className="amount">{fmt(c.revenuNet)}</span>
          </div>
        </div>

        {/* Camembert répartition */}
        {c.caBrut > 0 && (
          <div className="output-chart">
            <div className="chart-header">
              <span className="eyebrow">Répartition de tes revenus</span>
            </div>
            <div className="chart-pie-wrapper">
              <div
                className="chart-pie"
                style={{ background: donutBg }}
                aria-hidden="true"
              />
              <ul className="chart-legend">
                {c.pctCol > 0 && (
                  <li>
                    <span className="legend-dot dot-deep"></span>
                    <span className="legend-label">Collectif</span>
                    <span className="legend-pct">{c.pctCol.toFixed(1).replace('.', ',')} %</span>
                  </li>
                )}
                {c.pctPart > 0 && (
                  <li>
                    <span className="legend-dot dot-mid"></span>
                    <span className="legend-label">Particuliers</span>
                    <span className="legend-pct">{c.pctPart.toFixed(1).replace('.', ',')} %</span>
                  </li>
                )}
                {c.pctEnt > 0 && (
                  <li>
                    <span className="legend-dot dot-light"></span>
                    <span className="legend-label">Entreprise</span>
                    <span className="legend-pct">{c.pctEnt.toFixed(1).replace('.', ',')} %</span>
                  </li>
                )}
                {c.pctStages > 0 && (
                  <li>
                    <span className="legend-dot dot-sky"></span>
                    <span className="legend-label">Stages</span>
                    <span className="legend-pct">{c.pctStages.toFixed(1).replace('.', ',')} %</span>
                  </li>
                )}
              </ul>
            </div>
          </div>
        )}

        {/* Insight pédagogique */}
        {c.deltaNet > 100 && c.elevesCible > elevesMoyen && (
          <div className="output-insight">
            <span className="insight-icon">💡</span>
            <div>
              <strong>Pour augmenter ton revenu net sans donner plus de cours :</strong>
              <p>
                Augmenter ton taux de remplissage de {elevesMoyen} → {c.elevesCible} élèves
                par cours, sans changer ton planning, te ferait gagner&nbsp;
                <strong>+{fmt(c.deltaNet)} net/mois</strong>.
              </p>
            </div>
          </div>
        )}

      </section>
    </div>
  );
}

/** Stepper compact (+ / − boutons) pour les mini-inputs des toggles. */
function Stepper({ value, onChange, min = 0, max = 999, step = 1, suffix = '', className = '' }) {
  return (
    <div className={`stepper ${className}`}>
      <button
        type="button"
        className="stepper-btn"
        onClick={() => onChange(Math.max(min, value - step))}
        aria-label="Diminuer"
      >−</button>
      <span className="stepper-value">{value}{suffix && ' ' + suffix}</span>
      <button
        type="button"
        className="stepper-btn"
        onClick={() => onChange(Math.min(max, value + step))}
        aria-label="Augmenter"
      >+</button>
    </div>
  );
}
