'use client';

import { useState, useEffect } from 'react';

/**
 * Grille.jsx — Grille tarifaire personnalisable et imprimable.
 *
 * UX :
 *   - Tous les champs sont éditables directement dans la grille (inputs
 *     stylés pour ressembler à du texte normal)
 *   - Choix de palette (sable / sage / blush / sky) au-dessus
 *   - Boutons : Imprimer (window.print + CSS @media print) /
 *     Réinitialiser / Sauvegarde manuelle (avec feedback)
 *   - Auto-save localStorage à chaque modification
 *
 * Print : @media print masque toute la décoration (hero, breadcrumb,
 * CTA, contrôles, bordures inputs) pour laisser uniquement la grille
 * sur A4.
 */

const DEFAULT = {
  // En-tête
  nomStudio: 'Marie Durand · Yoga',
  slogan: 'Hatha, Vinyasa, Yin — Lyon Croix-Rousse',
  // Cours collectifs
  colUnit: '17 €',
  col10: '150 € (15 €/cours)',
  col20: '280 € (14 €/cours)',
  // Particuliers
  partStudio: '70 €',
  partDom: '90 €',
  pack5: '320 € (64 €/séance)',
  // Ateliers / Stages
  atelier: '45 €',
  stageWE: '180 €',
  // Entreprises
  entHebdo: '110 €/séance',
  entSeminaire: '180 €/h',
  // Conditions
  essai: '5 €',
  annulation: '12h avant le cours',
  validite: '6 mois après achat',
  // Signature
  contact: 'marie@yoga-lyon.fr · 06 12 34 56 78',
  date: new Date().toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' }),
};

const PALETTES = [
  { key: 'sable', label: 'Sable',  swatch: '#b9794d' },
  { key: 'sage',  label: 'Sauge',  swatch: '#6b8e5a' },
  { key: 'blush', label: 'Blush',  swatch: '#c8665e' },
  { key: 'sky',   label: 'Ciel',   swatch: '#6a8b9d' },
];

const STORAGE_KEY = 'izisolo-grille-v1';

export default function Grille() {
  const [data, setData] = useState(DEFAULT);
  const [palette, setPalette] = useState('sable');
  const [savedFlash, setSavedFlash] = useState(false);

  // Hydrate depuis localStorage au montage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.data) setData({ ...DEFAULT, ...parsed.data });
        if (parsed.palette) setPalette(parsed.palette);
      }
    } catch {}
  }, []);

  // Auto-save sur chaque modification
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ data, palette }));
    } catch {}
  }, [data, palette]);

  const update = (key) => (e) => {
    setData((prev) => ({ ...prev, [key]: e.target.value }));
  };

  const handleReset = () => {
    if (confirm('Réinitialiser tous les champs aux valeurs d\'exemple ?')) {
      setData(DEFAULT);
      setPalette('sable');
    }
  };

  const handleSave = () => {
    setSavedFlash(true);
    setTimeout(() => setSavedFlash(false), 1800);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <>
      {/* Contrôles (cachés à l'impression) */}
      <section className="grille-controls">
        <div className="controls-left">
          <span className="controls-eyebrow">Palette</span>
          <div className="palette-swatches">
            {PALETTES.map((p) => (
              <button
                key={p.key}
                type="button"
                className={`palette-swatch ${palette === p.key ? 'active' : ''}`}
                style={{ background: p.swatch }}
                onClick={() => setPalette(p.key)}
                aria-label={`Palette ${p.label}`}
                title={p.label}
              />
            ))}
          </div>
        </div>
        <div className="controls-right">
          <button type="button" onClick={handleSave} className="btn-ghost btn-sm">
            {savedFlash ? '✓ Sauvegardé' : 'Sauver les modifs'}
          </button>
          <button type="button" onClick={handleReset} className="btn-ghost btn-sm">
            Réinitialiser
          </button>
          <button type="button" onClick={handlePrint} className="btn-primary btn-sm btn-print">
            🖨️ Imprimer / PDF
          </button>
        </div>
      </section>

      <p className="grille-hint">
        💡 Clique sur n'importe quel texte pour le modifier. Tes changements sont
        sauvegardés automatiquement dans ton navigateur — tu peux fermer et
        revenir plus tard sans rien perdre.
      </p>

      {/* La grille elle-même (visible en print) */}
      <article className="grille-preview" data-palette={palette}>

        <header className="grille-header">
          <input
            type="text"
            className="grille-input grille-input-studio"
            value={data.nomStudio}
            onChange={update('nomStudio')}
            placeholder="Nom du studio / prof"
            aria-label="Nom du studio"
          />
          <input
            type="text"
            className="grille-input grille-input-slogan"
            value={data.slogan}
            onChange={update('slogan')}
            placeholder="Slogan, disciplines, ville..."
            aria-label="Slogan"
          />
          <div className="grille-divider"></div>
          <span className="grille-title-meta">Grille tarifaire · {data.date}</span>
        </header>

        <section className="grille-section">
          <h3>Cours collectifs</h3>
          <div className="grille-row">
            <span className="row-label">Cours à l'unité</span>
            <input type="text" className="grille-input grille-input-price" value={data.colUnit} onChange={update('colUnit')} />
          </div>
          <div className="grille-row">
            <span className="row-label">Carnet 10 cours</span>
            <input type="text" className="grille-input grille-input-price" value={data.col10} onChange={update('col10')} />
          </div>
          <div className="grille-row">
            <span className="row-label">Carnet 20 cours</span>
            <input type="text" className="grille-input grille-input-price" value={data.col20} onChange={update('col20')} />
          </div>
        </section>

        <section className="grille-section">
          <h3>Cours particuliers</h3>
          <div className="grille-row">
            <span className="row-label">1-à-1 chez moi</span>
            <input type="text" className="grille-input grille-input-price" value={data.partStudio} onChange={update('partStudio')} />
          </div>
          <div className="grille-row">
            <span className="row-label">1-à-1 à domicile</span>
            <input type="text" className="grille-input grille-input-price" value={data.partDom} onChange={update('partDom')} />
          </div>
          <div className="grille-row">
            <span className="row-label">Pack 5 séances 1-à-1</span>
            <input type="text" className="grille-input grille-input-price" value={data.pack5} onChange={update('pack5')} />
          </div>
        </section>

        <section className="grille-section">
          <h3>Ateliers &amp; stages</h3>
          <div className="grille-row">
            <span className="row-label">Atelier 3 h (thématique)</span>
            <input type="text" className="grille-input grille-input-price" value={data.atelier} onChange={update('atelier')} />
          </div>
          <div className="grille-row">
            <span className="row-label">Stage week-end (Ven. soir → Dim. midi)</span>
            <input type="text" className="grille-input grille-input-price" value={data.stageWE} onChange={update('stageWE')} />
          </div>
        </section>

        <section className="grille-section">
          <h3>Entreprises &amp; CSE</h3>
          <div className="grille-row">
            <span className="row-label">Cours hebdo récurrent</span>
            <input type="text" className="grille-input grille-input-price" value={data.entHebdo} onChange={update('entHebdo')} />
          </div>
          <div className="grille-row">
            <span className="row-label">Séminaire / journée bien-être</span>
            <input type="text" className="grille-input grille-input-price" value={data.entSeminaire} onChange={update('entSeminaire')} />
          </div>
        </section>

        <section className="grille-section grille-section-conditions">
          <h3>Conditions</h3>
          <div className="grille-row">
            <span className="row-label">Cours d'essai</span>
            <input type="text" className="grille-input grille-input-price" value={data.essai} onChange={update('essai')} />
          </div>
          <div className="grille-row">
            <span className="row-label">Délai d'annulation</span>
            <input type="text" className="grille-input grille-input-price" value={data.annulation} onChange={update('annulation')} />
          </div>
          <div className="grille-row">
            <span className="row-label">Validité des carnets</span>
            <input type="text" className="grille-input grille-input-price" value={data.validite} onChange={update('validite')} />
          </div>
        </section>

        <footer className="grille-footer">
          <div className="grille-divider"></div>
          <input
            type="text"
            className="grille-input grille-input-contact"
            value={data.contact}
            onChange={update('contact')}
            placeholder="email · téléphone"
            aria-label="Contact"
          />
        </footer>

      </article>
    </>
  );
}
