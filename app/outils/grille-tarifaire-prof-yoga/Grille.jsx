'use client';

import { useState, useEffect } from 'react';

/**
 * Grille.jsx — Grille tarifaire personnalisable et imprimable.
 *
 * Modèle de données dynamique :
 *   - header  : { nomStudio, slogan, date, contact }
 *   - sections: [{ id, title, rows: [{ id, label, value }] }]
 *
 * UX :
 *   - Tous les champs sont éditables directement (inputs stylés)
 *   - Boutons + pour ajouter ligne / section
 *   - Boutons × pour supprimer ligne / section
 *   - Palette switchable (sable / sage / blush / sky)
 *   - Auto-save localStorage à chaque modification
 *   - Imprimer (window.print + CSS @media print compressé pour A4)
 *
 * Print : @media print masque toute la déco ET les boutons +/× pour
 * que seul le contenu propre s'affiche sur A4 (compressé pour 1 page).
 */

const uid = () => `r${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;

const DEFAULT_HEADER = {
  nomStudio: 'Marie Durand · Yoga',
  slogan: 'Hatha, Vinyasa, Yin — Lyon Croix-Rousse',
  date: new Date().toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' }),
  contact: 'marie@yoga-lyon.fr · 06 12 34 56 78',
};

const DEFAULT_SECTIONS = [
  {
    id: 'sec-collectifs',
    title: 'Cours collectifs',
    rows: [
      { id: 'r-c1', label: "Cours à l'unité",       value: '17 €' },
      { id: 'r-c2', label: 'Carnet 10 cours',       value: '150 € (15 €/cours)' },
      { id: 'r-c3', label: 'Carnet 20 cours',       value: '280 € (14 €/cours)' },
    ],
  },
  {
    id: 'sec-particuliers',
    title: 'Cours particuliers',
    rows: [
      { id: 'r-p1', label: '1-à-1 chez moi',         value: '70 €' },
      { id: 'r-p2', label: '1-à-1 à domicile',       value: '90 €' },
      { id: 'r-p3', label: 'Pack 5 séances 1-à-1',   value: '320 € (64 €/séance)' },
    ],
  },
  {
    id: 'sec-ateliers',
    title: 'Ateliers & stages',
    rows: [
      { id: 'r-a1', label: 'Atelier 3 h (thématique)',                     value: '45 €' },
      { id: 'r-a2', label: 'Stage week-end (Ven. soir → Dim. midi)',       value: '180 €' },
    ],
  },
  {
    id: 'sec-entreprises',
    title: 'Entreprises & CSE',
    rows: [
      { id: 'r-e1', label: 'Cours hebdo récurrent',         value: '110 €/séance' },
      { id: 'r-e2', label: 'Séminaire / journée bien-être', value: '180 €/h' },
    ],
  },
  {
    id: 'sec-conditions',
    title: 'Conditions',
    rows: [
      { id: 'r-d1', label: "Cours d'essai",         value: '5 €' },
      { id: 'r-d2', label: "Délai d'annulation",    value: '12h avant le cours' },
      { id: 'r-d3', label: 'Validité des carnets',  value: '6 mois après achat' },
    ],
  },
];

const PALETTES = [
  { key: 'sable', label: 'Sable',  swatch: '#b9794d' },
  { key: 'sage',  label: 'Sauge',  swatch: '#6b8e5a' },
  { key: 'blush', label: 'Blush',  swatch: '#c8665e' },
  { key: 'sky',   label: 'Ciel',   swatch: '#6a8b9d' },
];

const STORAGE_KEY = 'izisolo-grille-v2';

export default function Grille() {
  const [header, setHeader] = useState(DEFAULT_HEADER);
  const [sections, setSections] = useState(DEFAULT_SECTIONS);
  const [palette, setPalette] = useState('sable');
  const [savedFlash, setSavedFlash] = useState(false);

  // Hydrate depuis localStorage au montage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.header)   setHeader({ ...DEFAULT_HEADER, ...parsed.header });
        if (parsed.sections) setSections(parsed.sections);
        if (parsed.palette)  setPalette(parsed.palette);
      }
    } catch {}
  }, []);

  // Auto-save sur chaque modification
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ header, sections, palette }));
    } catch {}
  }, [header, sections, palette]);

  // --- Header ---
  const updateHeader = (key) => (e) => {
    setHeader((prev) => ({ ...prev, [key]: e.target.value }));
  };

  // --- Sections ---
  const updateSectionTitle = (sectionId, value) => {
    setSections((prev) => prev.map((s) => s.id === sectionId ? { ...s, title: value } : s));
  };

  const addSection = () => {
    setSections((prev) => [
      ...prev,
      {
        id: uid(),
        title: 'Nouvelle section',
        rows: [{ id: uid(), label: 'Nouvelle ligne', value: '0 €' }],
      },
    ]);
  };

  const removeSection = (sectionId) => {
    if (!confirm('Supprimer cette section et toutes ses lignes ?')) return;
    setSections((prev) => prev.filter((s) => s.id !== sectionId));
  };

  // --- Rows ---
  const updateRow = (sectionId, rowId, field, value) => {
    setSections((prev) => prev.map((s) =>
      s.id === sectionId
        ? { ...s, rows: s.rows.map((r) => r.id === rowId ? { ...r, [field]: value } : r) }
        : s
    ));
  };

  const addRow = (sectionId) => {
    setSections((prev) => prev.map((s) =>
      s.id === sectionId
        ? { ...s, rows: [...s.rows, { id: uid(), label: 'Nouvelle ligne', value: '0 €' }] }
        : s
    ));
  };

  const removeRow = (sectionId, rowId) => {
    setSections((prev) => prev.map((s) =>
      s.id === sectionId
        ? { ...s, rows: s.rows.filter((r) => r.id !== rowId) }
        : s
    ));
  };

  // --- Actions globales ---
  const handleReset = () => {
    if (confirm('Réinitialiser tous les champs aux valeurs d\'exemple ?')) {
      setHeader(DEFAULT_HEADER);
      setSections(DEFAULT_SECTIONS);
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
        💡 Clique sur n&apos;importe quel texte pour le modifier. Bouton <strong>+</strong> pour
        ajouter une ligne ou une section, bouton <strong>×</strong> pour supprimer. Tes
        changements sont sauvegardés automatiquement.
      </p>

      {/* La grille elle-même (visible en print) */}
      <article className="grille-preview" data-palette={palette}>

        <header className="grille-header">
          <input
            type="text"
            className="grille-input grille-input-studio"
            value={header.nomStudio}
            onChange={updateHeader('nomStudio')}
            placeholder="Nom du studio / prof"
            aria-label="Nom du studio"
          />
          <input
            type="text"
            className="grille-input grille-input-slogan"
            value={header.slogan}
            onChange={updateHeader('slogan')}
            placeholder="Slogan, disciplines, ville..."
            aria-label="Slogan"
          />
          <div className="grille-divider"></div>
          <span className="grille-title-meta">
            Grille tarifaire ·{' '}
            <input
              type="text"
              className="grille-input grille-input-date"
              value={header.date}
              onChange={updateHeader('date')}
              placeholder="mois année"
              aria-label="Date"
            />
          </span>
        </header>

        {sections.map((section) => (
          <section key={section.id} className="grille-section">
            <div className="grille-section-head">
              <input
                type="text"
                className="grille-input grille-input-section-title"
                value={section.title}
                onChange={(e) => updateSectionTitle(section.id, e.target.value)}
                aria-label="Titre de section"
              />
              <button
                type="button"
                className="btn-remove-section"
                onClick={() => removeSection(section.id)}
                title="Supprimer cette section"
                aria-label="Supprimer cette section"
              >
                ×
              </button>
            </div>

            {section.rows.map((row) => (
              <div key={row.id} className="grille-row">
                <input
                  type="text"
                  className="grille-input grille-input-label"
                  value={row.label}
                  onChange={(e) => updateRow(section.id, row.id, 'label', e.target.value)}
                  aria-label="Libellé"
                />
                <input
                  type="text"
                  className="grille-input grille-input-price"
                  value={row.value}
                  onChange={(e) => updateRow(section.id, row.id, 'value', e.target.value)}
                  aria-label="Tarif"
                />
                <button
                  type="button"
                  className="btn-remove-row"
                  onClick={() => removeRow(section.id, row.id)}
                  title="Supprimer cette ligne"
                  aria-label="Supprimer cette ligne"
                >
                  ×
                </button>
              </div>
            ))}

            <button
              type="button"
              className="btn-add-row"
              onClick={() => addRow(section.id)}
            >
              + Ajouter une ligne
            </button>
          </section>
        ))}

        <button
          type="button"
          className="btn-add-section"
          onClick={addSection}
        >
          + Ajouter une section
        </button>

        <footer className="grille-footer">
          <div className="grille-divider"></div>
          <input
            type="text"
            className="grille-input grille-input-contact"
            value={header.contact}
            onChange={updateHeader('contact')}
            placeholder="email · téléphone"
            aria-label="Contact"
          />
        </footer>

      </article>
    </>
  );
}
