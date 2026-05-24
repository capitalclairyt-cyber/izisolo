'use client';

import { useState, useEffect } from 'react';

/**
 * Fiche.jsx — Fiche d'inscription enfant à un cours de yoga.
 *
 * Modèle :
 *   - prof    : nom & coordonnées du prof / studio
 *   - enfant  : identité (nom, prénom, naissance, école, classe)
 *   - parents : coordonnées parent 1 + parent 2 + adresse
 *   - medical : antécédents, allergies, contre-indications, traitements
 *   - urgence : personne à contacter
 *   - autorisations : 4 checkboxes (image, reprise, sortie autonome, soins)
 *   - cours   : type de cours + créneau + tarif + mode paiement
 *
 * UX :
 *   - Tous les champs sont éditables directement (inputs stylés comme texte)
 *   - 4 palettes au choix (sable, sage, blush, sky)
 *   - Auto-save localStorage
 *   - Bouton "Imprimer / PDF" — @media print masque la déco
 *   - Bouton "Réinitialiser" pour repartir d'un blanc
 *   - Bouton "Pré-remplir exemple" pour démo rapide
 */

const EMPTY = {
  prof: {
    nom: '',
    contact: '',
  },
  enfant: {
    prenom: '',
    nom: '',
    naissance: '',
    sexe: '',
    ecole: '',
    classe: '',
  },
  parents: {
    p1Nom: '',
    p1Tel: '',
    p1Mail: '',
    p2Nom: '',
    p2Tel: '',
    p2Mail: '',
    adresse: '',
  },
  medical: {
    allergies: '',
    asthme: '',
    contreIndications: '',
    traitements: '',
    suiviMedical: '',
  },
  urgence: {
    nom: '',
    lien: '',
    tel: '',
  },
  autorisations: {
    image: false,
    reprise: false,
    repriseQui: '',
    sortieAutonome: false,
    soinsUrgence: false,
  },
  cours: {
    type: '',
    creneau: '',
    tarif: '',
    paiement: '',
  },
  signature: {
    lieu: '',
    date: '',
    nom: '',
  },
};

const EXEMPLE = {
  prof: {
    nom: 'Marie Durand · Yoga',
    contact: 'marie@yoga-lyon.fr · 06 12 34 56 78',
  },
  enfant: {
    prenom: 'Léa',
    nom: 'Martin',
    naissance: '14/03/2018',
    sexe: 'F',
    ecole: 'École Jean Jaurès',
    classe: 'CE1',
  },
  parents: {
    p1Nom: 'Sophie Martin',
    p1Tel: '06 11 22 33 44',
    p1Mail: 'sophie.martin@email.fr',
    p2Nom: 'Pierre Martin',
    p2Tel: '06 55 66 77 88',
    p2Mail: 'pierre.martin@email.fr',
    adresse: '12 rue des Acacias, 69004 Lyon',
  },
  medical: {
    allergies: 'Aucune connue',
    asthme: 'Non',
    contreIndications: 'Aucune',
    traitements: 'Aucun',
    suiviMedical: 'Aucun en cours',
  },
  urgence: {
    nom: 'Claire Dupont (grand-mère)',
    lien: 'Grand-mère maternelle',
    tel: '06 99 88 77 66',
  },
  autorisations: {
    image: true,
    reprise: true,
    repriseQui: 'Mamie Claire (grand-mère)',
    sortieAutonome: false,
    soinsUrgence: true,
  },
  cours: {
    type: 'Yoga enfants 6-9 ans',
    creneau: 'Mercredi 16h30 — 17h15',
    tarif: '180 € (trimestre, 12 séances)',
    paiement: 'Chèque en 3 fois',
  },
  signature: {
    lieu: 'Lyon',
    date: new Date().toLocaleDateString('fr-FR'),
    nom: 'Sophie Martin',
  },
};

const PALETTES = [
  { key: 'sable', label: 'Sable',  swatch: '#b9794d' },
  { key: 'sage',  label: 'Sauge',  swatch: '#6b8e5a' },
  { key: 'blush', label: 'Blush',  swatch: '#c8665e' },
  { key: 'sky',   label: 'Ciel',   swatch: '#6a8b9d' },
];

const STORAGE_KEY = 'izisolo-fiche-enfant-v1';

export default function Fiche() {
  const [data, setData] = useState(EMPTY);
  const [palette, setPalette] = useState('sable');
  const [savedFlash, setSavedFlash] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.data)    setData({ ...EMPTY, ...parsed.data });
        if (parsed.palette) setPalette(parsed.palette);
      }
    } catch {}
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ data, palette }));
    } catch {}
  }, [data, palette]);

  // Helpers
  const updateField = (section, key) => (e) => {
    setData((prev) => ({
      ...prev,
      [section]: { ...prev[section], [key]: e.target.value },
    }));
  };
  const toggleField = (section, key) => () => {
    setData((prev) => ({
      ...prev,
      [section]: { ...prev[section], [key]: !prev[section][key] },
    }));
  };

  const handleReset = () => {
    if (confirm('Réinitialiser tous les champs ?')) {
      setData(EMPTY);
      setPalette('sable');
    }
  };
  const handleExample = () => {
    if (confirm('Remplacer les champs actuels par l\'exemple ?')) {
      setData(EXEMPLE);
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
      <section className="fiche-controls">
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
          <button type="button" onClick={handleExample} className="btn-ghost btn-sm">
            Pré-remplir exemple
          </button>
          <button type="button" onClick={handleSave} className="btn-ghost btn-sm">
            {savedFlash ? '✓ Sauvegardé' : 'Sauver'}
          </button>
          <button type="button" onClick={handleReset} className="btn-ghost btn-sm">
            Réinitialiser
          </button>
          <button type="button" onClick={handlePrint} className="btn-primary btn-sm btn-print">
            🖨️ Imprimer / PDF
          </button>
        </div>
      </section>

      <p className="fiche-hint">
        💡 Clique sur n&apos;importe quel champ pour le remplir. Tu peux pré-remplir
        un exemple pour voir le rendu. Tes modifs sont sauvegardées dans ton navigateur.
        Imprime la fiche, fais-la signer par les parents, conserve-la dans ton classeur.
      </p>
      <p className="fiche-hint fiche-hint-print">
        🖨️ <strong>Pour imprimer :</strong> dans le dialog d&apos;impression, ouvre
        <em> « Plus de paramètres »</em>, mets <strong>Marges → Minimum</strong> et
        <strong> décoche « En-têtes et pieds de page »</strong>.
      </p>

      {/* La fiche imprimable */}
      <article className="fiche-preview" data-palette={palette}>

        {/* En-tête prof + titre */}
        <header className="fiche-header">
          <input
            type="text"
            className="fiche-input fiche-input-prof"
            value={data.prof.nom}
            onChange={updateField('prof', 'nom')}
            placeholder="Nom du studio / prof"
            aria-label="Nom du studio"
          />
          <h1 className="fiche-title">Fiche d&apos;inscription — yoga enfants</h1>
          <input
            type="text"
            className="fiche-input fiche-input-contact-top"
            value={data.prof.contact}
            onChange={updateField('prof', 'contact')}
            placeholder="email · téléphone"
            aria-label="Contact prof"
          />
        </header>

        {/* SECTION : Identité enfant */}
        <section className="fiche-section">
          <h2>1. Identité de l&apos;enfant</h2>
          <div className="fiche-grid-2">
            <div className="fiche-field">
              <label>Prénom</label>
              <input type="text" className="fiche-input" value={data.enfant.prenom} onChange={updateField('enfant', 'prenom')} />
            </div>
            <div className="fiche-field">
              <label>Nom</label>
              <input type="text" className="fiche-input" value={data.enfant.nom} onChange={updateField('enfant', 'nom')} />
            </div>
            <div className="fiche-field">
              <label>Date de naissance</label>
              <input type="text" className="fiche-input" value={data.enfant.naissance} onChange={updateField('enfant', 'naissance')} placeholder="JJ/MM/AAAA" />
            </div>
            <div className="fiche-field">
              <label>Sexe</label>
              <input type="text" className="fiche-input" value={data.enfant.sexe} onChange={updateField('enfant', 'sexe')} placeholder="F / M / autre" />
            </div>
            <div className="fiche-field">
              <label>École</label>
              <input type="text" className="fiche-input" value={data.enfant.ecole} onChange={updateField('enfant', 'ecole')} />
            </div>
            <div className="fiche-field">
              <label>Classe</label>
              <input type="text" className="fiche-input" value={data.enfant.classe} onChange={updateField('enfant', 'classe')} />
            </div>
          </div>
        </section>

        {/* SECTION : Coordonnées parents */}
        <section className="fiche-section">
          <h2>2. Coordonnées des parents / représentant·e·s légal·e·s</h2>
          <div className="fiche-subgroup">
            <span className="fiche-subgroup-label">Parent 1</span>
            <div className="fiche-grid-3">
              <div className="fiche-field">
                <label>Nom &amp; prénom</label>
                <input type="text" className="fiche-input" value={data.parents.p1Nom} onChange={updateField('parents', 'p1Nom')} />
              </div>
              <div className="fiche-field">
                <label>Téléphone</label>
                <input type="text" className="fiche-input" value={data.parents.p1Tel} onChange={updateField('parents', 'p1Tel')} />
              </div>
              <div className="fiche-field">
                <label>Email</label>
                <input type="text" className="fiche-input" value={data.parents.p1Mail} onChange={updateField('parents', 'p1Mail')} />
              </div>
            </div>
          </div>
          <div className="fiche-subgroup">
            <span className="fiche-subgroup-label">Parent 2 (si applicable)</span>
            <div className="fiche-grid-3">
              <div className="fiche-field">
                <label>Nom &amp; prénom</label>
                <input type="text" className="fiche-input" value={data.parents.p2Nom} onChange={updateField('parents', 'p2Nom')} />
              </div>
              <div className="fiche-field">
                <label>Téléphone</label>
                <input type="text" className="fiche-input" value={data.parents.p2Tel} onChange={updateField('parents', 'p2Tel')} />
              </div>
              <div className="fiche-field">
                <label>Email</label>
                <input type="text" className="fiche-input" value={data.parents.p2Mail} onChange={updateField('parents', 'p2Mail')} />
              </div>
            </div>
          </div>
          <div className="fiche-field fiche-field-full">
            <label>Adresse du domicile</label>
            <input type="text" className="fiche-input" value={data.parents.adresse} onChange={updateField('parents', 'adresse')} />
          </div>
        </section>

        {/* SECTION : Santé */}
        <section className="fiche-section">
          <h2>3. Informations médicales</h2>
          <div className="fiche-grid-2">
            <div className="fiche-field">
              <label>Allergies (alimentaires, médicamenteuses, autres)</label>
              <input type="text" className="fiche-input" value={data.medical.allergies} onChange={updateField('medical', 'allergies')} />
            </div>
            <div className="fiche-field">
              <label>Asthme</label>
              <input type="text" className="fiche-input" value={data.medical.asthme} onChange={updateField('medical', 'asthme')} placeholder="Oui / Non, traitement..." />
            </div>
            <div className="fiche-field fiche-field-full">
              <label>Contre-indications physiques particulières</label>
              <input type="text" className="fiche-input" value={data.medical.contreIndications} onChange={updateField('medical', 'contreIndications')} />
            </div>
            <div className="fiche-field">
              <label>Traitements en cours</label>
              <input type="text" className="fiche-input" value={data.medical.traitements} onChange={updateField('medical', 'traitements')} />
            </div>
            <div className="fiche-field">
              <label>Suivi médical particulier</label>
              <input type="text" className="fiche-input" value={data.medical.suiviMedical} onChange={updateField('medical', 'suiviMedical')} />
            </div>
          </div>
        </section>

        {/* SECTION : Urgence */}
        <section className="fiche-section">
          <h2>4. Personne à contacter en cas d&apos;urgence (autre que les parents)</h2>
          <div className="fiche-grid-3">
            <div className="fiche-field">
              <label>Nom &amp; prénom</label>
              <input type="text" className="fiche-input" value={data.urgence.nom} onChange={updateField('urgence', 'nom')} />
            </div>
            <div className="fiche-field">
              <label>Lien de parenté</label>
              <input type="text" className="fiche-input" value={data.urgence.lien} onChange={updateField('urgence', 'lien')} placeholder="grand-mère, oncle, voisin·e..." />
            </div>
            <div className="fiche-field">
              <label>Téléphone</label>
              <input type="text" className="fiche-input" value={data.urgence.tel} onChange={updateField('urgence', 'tel')} />
            </div>
          </div>
        </section>

        {/* SECTION : Autorisations */}
        <section className="fiche-section">
          <h2>5. Autorisations parentales</h2>
          <div className="fiche-autorisations">
            <button
              type="button"
              className={`fiche-checkbox-row ${data.autorisations.image ? 'is-checked' : ''}`}
              onClick={toggleField('autorisations', 'image')}
              aria-pressed={data.autorisations.image}
            >
              <span className="fiche-checkbox-visual">{data.autorisations.image && '✓'}</span>
              <span className="fiche-checkbox-label">
                <strong>Droit à l&apos;image</strong>
                <span className="fiche-checkbox-help">
                  J&apos;autorise la prise et la diffusion de photos et vidéos de mon enfant dans le cadre des activités du studio (site web, réseaux sociaux, communications).
                </span>
              </span>
            </button>

            <button
              type="button"
              className={`fiche-checkbox-row ${data.autorisations.reprise ? 'is-checked' : ''}`}
              onClick={toggleField('autorisations', 'reprise')}
              aria-pressed={data.autorisations.reprise}
            >
              <span className="fiche-checkbox-visual">{data.autorisations.reprise && '✓'}</span>
              <span className="fiche-checkbox-label">
                <strong>Reprise par une tierce personne</strong>
                <span className="fiche-checkbox-help">
                  J&apos;autorise une autre personne que moi à reprendre mon enfant après le cours :
                </span>
                {data.autorisations.reprise && (
                  <input
                    type="text"
                    className="fiche-input fiche-input-inline"
                    value={data.autorisations.repriseQui}
                    onChange={updateField('autorisations', 'repriseQui')}
                    placeholder="Nom, prénom, lien de parenté..."
                    onClick={(e) => e.stopPropagation()}
                  />
                )}
              </span>
            </button>

            <button
              type="button"
              className={`fiche-checkbox-row ${data.autorisations.sortieAutonome ? 'is-checked' : ''}`}
              onClick={toggleField('autorisations', 'sortieAutonome')}
              aria-pressed={data.autorisations.sortieAutonome}
            >
              <span className="fiche-checkbox-visual">{data.autorisations.sortieAutonome && '✓'}</span>
              <span className="fiche-checkbox-label">
                <strong>Sortie autonome après le cours</strong>
                <span className="fiche-checkbox-help">
                  J&apos;autorise mon enfant à quitter le studio seul·e à la fin du cours (réservé aux 10 ans et +).
                </span>
              </span>
            </button>

            <button
              type="button"
              className={`fiche-checkbox-row ${data.autorisations.soinsUrgence ? 'is-checked' : ''}`}
              onClick={toggleField('autorisations', 'soinsUrgence')}
              aria-pressed={data.autorisations.soinsUrgence}
            >
              <span className="fiche-checkbox-visual">{data.autorisations.soinsUrgence && '✓'}</span>
              <span className="fiche-checkbox-label">
                <strong>Soins d&apos;urgence</strong>
                <span className="fiche-checkbox-help">
                  En cas d&apos;urgence, j&apos;autorise le prof à prendre toutes les mesures nécessaires (SAMU, transport hôpital, soins d&apos;urgence).
                </span>
              </span>
            </button>
          </div>
        </section>

        {/* SECTION : Cours choisi */}
        <section className="fiche-section">
          <h2>6. Cours choisi</h2>
          <div className="fiche-grid-2">
            <div className="fiche-field">
              <label>Type de cours</label>
              <input type="text" className="fiche-input" value={data.cours.type} onChange={updateField('cours', 'type')} placeholder="Yoga enfants 6-9 ans, stage vacances..." />
            </div>
            <div className="fiche-field">
              <label>Créneau</label>
              <input type="text" className="fiche-input" value={data.cours.creneau} onChange={updateField('cours', 'creneau')} placeholder="Mercredi 16h30-17h15" />
            </div>
            <div className="fiche-field">
              <label>Tarif</label>
              <input type="text" className="fiche-input" value={data.cours.tarif} onChange={updateField('cours', 'tarif')} />
            </div>
            <div className="fiche-field">
              <label>Mode de paiement</label>
              <input type="text" className="fiche-input" value={data.cours.paiement} onChange={updateField('cours', 'paiement')} placeholder="Chèque, virement, espèces..." />
            </div>
          </div>
        </section>

        {/* SECTION : Signature */}
        <section className="fiche-section fiche-section-signature">
          <h2>7. Signature parentale</h2>
          <p className="fiche-engagement">
            Je certifie l&apos;exactitude des informations renseignées ci-dessus et m&apos;engage à
            prévenir le prof de tout changement (santé, contact, adresse). Je reconnais avoir
            pris connaissance des conditions d&apos;inscription et du règlement intérieur.
          </p>
          <div className="fiche-grid-3 fiche-signature-grid">
            <div className="fiche-field">
              <label>Fait à</label>
              <input type="text" className="fiche-input" value={data.signature.lieu} onChange={updateField('signature', 'lieu')} />
            </div>
            <div className="fiche-field">
              <label>Le (date)</label>
              <input type="text" className="fiche-input" value={data.signature.date} onChange={updateField('signature', 'date')} placeholder="JJ/MM/AAAA" />
            </div>
            <div className="fiche-field">
              <label>Nom du parent signataire</label>
              <input type="text" className="fiche-input" value={data.signature.nom} onChange={updateField('signature', 'nom')} />
            </div>
          </div>
          <div className="fiche-signature-zone">
            <span className="fiche-signature-label">Signature (précédée de la mention « Lu et approuvé ») :</span>
            <div className="fiche-signature-box"></div>
          </div>
        </section>

      </article>
    </>
  );
}
