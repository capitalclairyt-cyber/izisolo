'use client';

import { useState, useMemo } from 'react';

/**
 * Comparateur.jsx — Comparateur de statuts juridiques pour prof yoga indé.
 *
 * Compare : Micro-entreprise BNC / EI au réel / SASU.
 *
 * Inputs :
 *   - CA annuel (slider)
 *   - Charges réelles annuelles (slider)
 *   - Veut embaucher (toggle)
 *   - Objectif principal (radio : simplicité / optimisation / protection / image)
 *
 * Sortie : 3 cartes (1 par statut) avec :
 *   - Éligibilité (✓ ou ✗ avec raison)
 *   - Cotisations sociales
 *   - IS / IR
 *   - Compta annuelle
 *   - Revenu net annuel
 *   - Protection sociale (étoiles)
 *   - Image pro (étoiles)
 *   - Badge "Recommandé" sur le meilleur selon les inputs
 *
 * Disclaimer : approximation pédagogique. Pour décision finale,
 * consulter un expert-comptable.
 */
export default function Comparateur() {
  // State
  const [caAnnuel, setCaAnnuel] = useState(40000);
  const [chargesReelles, setChargesReelles] = useState(6000);
  const [veutEmbaucher, setVeutEmbaucher] = useState(false);
  const [objectif, setObjectif] = useState('simplicite');

  // Calculs
  const results = useMemo(() => {
    return [
      computeMicro(caAnnuel, chargesReelles, veutEmbaucher),
      computeReel(caAnnuel, chargesReelles),
      computeSasu(caAnnuel, chargesReelles),
    ];
  }, [caAnnuel, chargesReelles, veutEmbaucher]);

  // Recommandation
  const bestStatut = useMemo(() => {
    return getBestStatut(results, objectif, veutEmbaucher);
  }, [results, objectif, veutEmbaucher]);

  // Helpers
  const fmt = (n) => Math.round(n).toLocaleString('fr-FR') + ' €';
  const fmtPct = (n) => (n * 100).toFixed(1).replace('.', ',') + ' %';
  const sliderBg = (val, min, max, color) => {
    const pct = ((val - min) / (max - min)) * 100;
    return `linear-gradient(to right, ${color} 0%, ${color} ${pct}%, color-mix(in oklch, var(--c-ink) 10%, transparent) ${pct}%, color-mix(in oklch, var(--c-ink) 10%, transparent) 100%)`;
  };

  return (
    <div className="comparateur-page">

      {/* Inputs en haut, full-width */}
      <section className="comparateur-inputs">
        <div className="inputs-grid">

          {/* CA annuel */}
          <div className="input-block is-revenu">
            <label htmlFor="ca-annuel">
              Chiffre d&apos;affaires annuel
              <span className="input-value">{fmt(caAnnuel)}</span>
            </label>
            <input
              id="ca-annuel"
              type="range"
              min="10000"
              max="150000"
              step="1000"
              value={caAnnuel}
              onChange={(e) => setCaAnnuel(Number(e.target.value))}
              className="input-range"
              style={{ background: sliderBg(caAnnuel, 10000, 150000, 'var(--calc-positive)') }}
            />
            <div className="input-scale">
              <span>10 000 €</span>
              <span>150 000 €</span>
            </div>
          </div>

          {/* Charges réelles */}
          <div className="input-block is-cout">
            <label htmlFor="charges">
              Charges réelles annuelles
              <span className="input-value">{fmt(chargesReelles)}</span>
            </label>
            <input
              id="charges"
              type="range"
              min="0"
              max="40000"
              step="500"
              value={chargesReelles}
              onChange={(e) => setChargesReelles(Number(e.target.value))}
              className="input-range"
              style={{ background: sliderBg(chargesReelles, 0, 40000, 'var(--calc-negative)') }}
            />
            <div className="input-scale">
              <span>0 €</span>
              <span>40 000 €</span>
            </div>
            <p className="input-hint">Loyer studio + matos + comptable + formation + outils, lissé sur l&apos;année.</p>
          </div>

          {/* Toggle embaucher */}
          <div className={`input-toggle-block ${veutEmbaucher ? 'active' : ''}`}>
            <label className="input-toggle">
              <input type="checkbox" checked={veutEmbaucher} onChange={(e) => setVeutEmbaucher(e.target.checked)} />
              <span className="toggle-track"><span className="toggle-thumb"></span></span>
              <span className="toggle-label">
                Tu veux embaucher quelqu&apos;un
                <span className="toggle-hint">prof remplaçante, secrétaire, etc.</span>
              </span>
            </label>
          </div>

          {/* Objectif principal */}
          <div className="input-block">
            <label>Ton objectif principal</label>
            <div className="objectif-grid">
              {OBJECTIFS.map((opt) => (
                <button
                  key={opt.key}
                  type="button"
                  className={`objectif-pill ${objectif === opt.key ? 'active' : ''}`}
                  onClick={() => setObjectif(opt.key)}
                >
                  <span className="objectif-emoji">{opt.emoji}</span>
                  <span className="objectif-label">{opt.label}</span>
                </button>
              ))}
            </div>
          </div>

        </div>
      </section>

      {/* Cartes des 3 statuts */}
      <section className="comparateur-cartes">
        {results.map((r) => (
          <article
            key={r.statut}
            className={`statut-carte ${r.statut === bestStatut?.statut ? 'is-best' : ''} ${!r.eligible ? 'is-not-eligible' : ''}`}
          >
            {r.statut === bestStatut?.statut && r.eligible && (
              <div className="statut-badge-best">
                <span>★</span> Recommandé pour toi
              </div>
            )}
            {!r.eligible && (
              <div className="statut-badge-ko">
                ✗ Non éligible
              </div>
            )}

            <header className="statut-header">
              <span className="statut-emoji">{r.emoji}</span>
              <h3 className="serif">{r.nom}</h3>
              <p className="statut-sous-titre">{r.sousTitre}</p>
            </header>

            {!r.eligible ? (
              <div className="statut-non-eligible">
                <strong>Pourquoi tu n&apos;es pas éligible :</strong>
                <p>{r.raison}</p>
              </div>
            ) : (
              <>
                <div className="statut-net">
                  <span className="net-eyebrow">Revenu net annuel estimé</span>
                  <div className="net-big">{fmt(r.net)}</div>
                  <div className="net-mois">soit {fmt(r.net / 12)} / mois</div>
                  <div className="net-ratio">
                    {fmtPct(r.ratio)} du CA brut conservé
                  </div>
                </div>

                <ul className="statut-breakdown">
                  <li>
                    <span>Cotisations sociales</span>
                    <span className="amount amount-negative">− {fmt(r.cotis)}</span>
                  </li>
                  {r.ir > 0 && (
                    <li>
                      <span>Impôt sur le revenu (estimé)</span>
                      <span className="amount amount-negative">− {fmt(r.ir)}</span>
                    </li>
                  )}
                  {r.is > 0 && (
                    <li>
                      <span>IS (15-25 %)</span>
                      <span className="amount amount-negative">− {fmt(r.is)}</span>
                    </li>
                  )}
                  {r.dividendesTax > 0 && (
                    <li>
                      <span>PFU 30 % sur dividendes</span>
                      <span className="amount amount-negative">− {fmt(r.dividendesTax)}</span>
                    </li>
                  )}
                  <li>
                    <span>Comptable</span>
                    <span className="amount amount-negative">− {fmt(r.compta)}</span>
                  </li>
                  {r.charges > 0 && (
                    <li>
                      <span>Charges réelles {r.chargesDed ? '(déduites)' : '(non déductibles)'}</span>
                      <span className="amount amount-negative">− {fmt(r.charges)}</span>
                    </li>
                  )}
                </ul>

                <div className="statut-criteres">
                  <div className="critere-row">
                    <span className="critere-label">Simplicité admin</span>
                    <Stars value={r.simplicite} />
                  </div>
                  <div className="critere-row">
                    <span className="critere-label">Protection sociale</span>
                    <Stars value={r.protection} />
                  </div>
                  <div className="critere-row">
                    <span className="critere-label">Image pro / B2B</span>
                    <Stars value={r.imagePro} />
                  </div>
                </div>

                <div className="statut-resume">
                  <strong>Pour qui :</strong>
                  <p>{r.pourQui}</p>
                </div>
              </>
            )}
          </article>
        ))}
      </section>

      {/* Recommandation finale */}
      {bestStatut && bestStatut.eligible && (
        <section className="comparateur-recommandation">
          <span className="reco-eyebrow">Recommandation pour ton profil</span>
          <h3 className="serif">
            Pour <em>{caAnnuel.toLocaleString('fr-FR')} €</em> de CA avec <em>{chargesReelles.toLocaleString('fr-FR')} €</em> de charges
            {veutEmbaucher && ', et une embauche prévue'}, avec l&apos;objectif&nbsp;
            <em>« {OBJECTIFS.find(o => o.key === objectif)?.label.toLowerCase()} »</em>
            <br />→ on te recommande <strong>{bestStatut.nom}</strong>.
          </h3>
          <p>{bestStatut.raisonReco}</p>
        </section>
      )}

      {/* Disclaimer */}
      <aside className="comparateur-disclaimer">
        <strong>⚠️ Ce calcul est une approximation pédagogique.</strong>
        <p>
          Les vraies cotisations dépendent de ta situation perso (foyer fiscal, autres revenus, options choisies, etc.).
          Pour la décision finale — surtout au-delà de la micro — <strong>consulte un expert-comptable</strong>.
          Compte 80-150 €/h pour 1 séance qui te fait économiser potentiellement des milliers d&apos;euros sur plusieurs années.
        </p>
      </aside>

    </div>
  );
}

/* ─── Composants helper ───────────────────────────────────────────── */

function Stars({ value, max = 5 }) {
  return (
    <span className="stars" aria-label={`${value} sur ${max}`}>
      {Array.from({ length: max }, (_, i) => (
        <span key={i} className={i < value ? 'star-on' : 'star-off'}>
          {i < value ? '★' : '☆'}
        </span>
      ))}
    </span>
  );
}

const OBJECTIFS = [
  { key: 'simplicite',  emoji: '🌿', label: 'Simplicité administrative' },
  { key: 'optimisation', emoji: '💰', label: 'Optimisation fiscale (max net)' },
  { key: 'protection',  emoji: '🛡️', label: 'Protection sociale forte' },
  { key: 'image',       emoji: '✨', label: 'Image pro / B2B / fonds' },
];

/* ─── Calculs financiers ─────────────────────────────────────────── */

function computeMicro(ca, charges, embaucher) {
  const eligible = ca <= 77700 && !embaucher;
  let raison = null;
  if (ca > 77700) raison = `Tu dépasses le plafond BNC micro de 77 700 €/an (tu es à ${ca.toLocaleString('fr-FR')} €).`;
  else if (embaucher) raison = `La micro-entreprise est mal adaptée à l'embauche (pas de cadre URSSAF employeur simple).`;

  const urssaf = ca * 0.212;
  const cfp = ca * 0.002;
  const cfe = 250;
  const ir = ca * 0.022;
  const totalCotis = urssaf + cfp + cfe + ir;
  // Charges réelles NON déductibles (abattement forfaitaire 34 % uniquement pour calcul IR mais pas pour cotis)
  const net = ca - totalCotis - charges;

  return {
    statut: 'micro',
    nom: 'Micro-entreprise',
    sousTitre: 'BNC libéral · simple et instantanée',
    emoji: '🌱',
    eligible, raison,
    cotis: totalCotis,
    ir: 0, is: 0, dividendesTax: 0,
    compta: 0,
    charges, chargesDed: false,
    net,
    ratio: net / ca,
    simplicite: 5,
    protection: 1,
    imagePro: 2,
    pourQui: 'Tu démarres ou tu fais < 50 000 € de CA avec peu de charges réelles. Création gratuite, pas de comptable, cotisations proportionnelles au CA.',
    raisonReco: 'C\'est le statut le plus simple, sans aucun coût comptable, parfaitement adapté à ton profil pour démarrer ou consolider une activité solo avec des charges réelles modérées.',
  };
}

function computeReel(ca, charges) {
  const beneficeAvantCotis = Math.max(0, ca - charges);
  const urssaf = beneficeAvantCotis * 0.40;
  const beneficeApresCotis = beneficeAvantCotis - urssaf;

  // IR tranches progressives (barème 2026 estimé)
  const tranches = [
    { plafond: 11294,  taux: 0    },
    { plafond: 28797,  taux: 0.11 },
    { plafond: 82341,  taux: 0.30 },
    { plafond: 177106, taux: 0.41 },
    { plafond: Infinity, taux: 0.45 },
  ];
  let ir = 0;
  let bas = 0;
  let restant = beneficeApresCotis;
  for (const t of tranches) {
    if (restant <= 0) break;
    const dans = Math.min(restant, t.plafond - bas);
    ir += dans * t.taux;
    restant -= dans;
    bas = t.plafond;
  }
  const compta = 1500;
  const net = Math.max(0, beneficeApresCotis - ir - compta);

  return {
    statut: 'reel',
    nom: 'EI au réel',
    sousTitre: 'Entreprise individuelle · charges déductibles',
    emoji: '🌳',
    eligible: true,
    cotis: urssaf,
    ir, is: 0, dividendesTax: 0,
    compta,
    charges, chargesDed: true,
    net,
    ratio: net / ca,
    simplicite: 3,
    protection: 2,
    imagePro: 3,
    pourQui: 'Tu as 50-100 000 € de CA avec des charges réelles importantes (loyer studio, matos pilates Reformer, etc.). Tu déduis tout, tu optimises.',
    raisonReco: 'Avec tes charges réelles importantes par rapport à ton CA, le réel te permet de déduire toutes tes vraies dépenses (chose impossible en micro). L\'investissement comptable se rentabilise vite.',
  };
}

function computeSasu(ca, charges) {
  const beneficeAvantRemu = Math.max(0, ca - charges);

  // Stratégie : salaire minimum pour la protection sociale + tout le reste en dividendes
  // Salaire brut 12 000 €/an = mini raisonnable pour ouvrir droits retraite + IJ
  const salaireBrut = Math.min(12000, beneficeAvantRemu * 0.5);
  const cotisPatronales = salaireBrut * 0.45; // ~45 % du brut en charges patronales
  const cotisSalariales = salaireBrut * 0.22; // ~22 % du brut en charges salariales
  const salaireNet = salaireBrut - cotisSalariales;
  const packageSalaire = salaireBrut + cotisPatronales;

  const beneficeApresSalaire = Math.max(0, beneficeAvantRemu - packageSalaire);

  // IS : 15 % jusqu'à 42 500 € de bénéfice, 25 % au-delà
  let is = 0;
  if (beneficeApresSalaire <= 42500) {
    is = beneficeApresSalaire * 0.15;
  } else {
    is = 42500 * 0.15 + (beneficeApresSalaire - 42500) * 0.25;
  }

  const beneficeNetSociete = Math.max(0, beneficeApresSalaire - is);

  // Dividendes : on suppose qu'on retire 100 % du bénéfice net en dividendes
  // PFU 30 % (12,8 % IR forfaitaire + 17,2 % prélèvements sociaux)
  const dividendesBrut = beneficeNetSociete;
  const dividendesTax = dividendesBrut * 0.30;
  const dividendesNet = dividendesBrut - dividendesTax;

  const compta = 2500;
  const fraisCreation = 400 / 5; // amorti sur 5 ans

  const net = Math.max(0, salaireNet + dividendesNet - compta - fraisCreation);

  return {
    statut: 'sasu',
    nom: 'SASU',
    sousTitre: 'Société · protection top + image pro',
    emoji: '🏛️',
    eligible: true,
    cotis: cotisPatronales + cotisSalariales,
    ir: 0,
    is,
    dividendesTax,
    compta: compta + fraisCreation,
    charges, chargesDed: true,
    net,
    ratio: net / ca,
    simplicite: 1,
    protection: 5,
    imagePro: 5,
    pourQui: 'Tu fais 60 000 €+ de CA stable, tu veux embaucher OU avoir une vraie protection sociale (retraite cadre, IJ) OU signer du B2B significatif. Optimisation salaire/dividendes possible.',
    raisonReco: 'Avec ton volume, ton ambition d\'embauche et ton besoin d\'image/protection, la SASU déduit tes charges, te donne une retraite cadre, et te crédibilise auprès des CSE et entreprises. Le coût compta est compensé largement par l\'optimisation.',
  };
}

/* Sélectionne le statut recommandé selon les inputs */
function getBestStatut(results, objectif, veutEmbaucher) {
  // Si veut embaucher : SASU obligatoire (les autres sont mal adaptés)
  if (veutEmbaucher) return results.find(r => r.statut === 'sasu');

  // Si micro non éligible (CA trop haut), exclure
  const eligibles = results.filter(r => r.eligible);

  if (objectif === 'simplicite') {
    // Préférer le statut le plus simple éligible
    return eligibles.reduce((a, b) => a.simplicite >= b.simplicite ? a : b);
  }
  if (objectif === 'optimisation') {
    // Préférer le net le plus haut
    return eligibles.reduce((a, b) => a.net >= b.net ? a : b);
  }
  if (objectif === 'protection') {
    return results.find(r => r.statut === 'sasu');
  }
  if (objectif === 'image') {
    return results.find(r => r.statut === 'sasu');
  }
  return eligibles[0];
}
