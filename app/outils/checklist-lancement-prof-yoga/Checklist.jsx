'use client';

import { useState, useEffect, useMemo } from 'react';

/**
 * Checklist.jsx — Checklist de lancement pour prof solo bien-être.
 *
 * UX :
 *   - 7 phases (admin, légal, marque, tarifs, lieu, élèves, gestion)
 *   - ~30 items cochables
 *   - Notes personnelles par item (textarea déroulable)
 *   - Progress bar globale + par phase
 *   - Auto-save localStorage
 *   - Imprimable (@media print masque toute la déco)
 *
 * Pédagogie : chaque item a un `help` (description courte) + `link`
 * optionnel (vers un article, outil, ou ressource externe) pour
 * accompagner la prof sans la noyer.
 */

const PHASES = [
  {
    id: 'admin',
    title: 'Statut & administratif',
    emoji: '🏛️',
    color: 'sage',
    items: [
      { id: 'choisir-statut',  label: 'Choisir mon statut juridique',                help: 'Micro-entreprise, EI ou SASU — selon ton CA et ton ambition.', link: '/outils/comparateur-statuts-prof-yoga' },
      { id: 'inscription-urssaf', label: 'M\'inscrire à l\'URSSAF',                   help: 'Sur autoentrepreneur.urssaf.fr — gratuit, ~15 min.',          link: 'https://autoentrepreneur.urssaf.fr/' },
      { id: 'siret',           label: 'Recevoir mon SIRET',                          help: 'Reçu sous 2 à 4 semaines après inscription.' },
      { id: 'code-ape',        label: 'Vérifier mon code APE / NAF',                 help: 'Code 8551Z (enseignement de disciplines sportives) ou 9604Z (entretien corporel).' },
      { id: 'compte-pro',      label: 'Ouvrir un compte bancaire dédié',             help: 'Obligatoire si CA > 10 000 € pendant 2 ans consécutifs. Recommandé dès le début.' },
      { id: 'choix-compta',    label: 'Décider : compta seule ou expert-comptable',  help: 'Micro-entrepreneur·euse peut tout gérer seul·e si revenus < 50k€.' },
    ],
  },
  {
    id: 'legal',
    title: 'Protection & légal',
    emoji: '🛡️',
    color: 'sky',
    items: [
      { id: 'assurance-rc',    label: 'Souscrire une assurance RC pro',              help: 'Indispensable. ~120 à 200 €/an chez MAIF, Allianz, AssurUp.' },
      { id: 'diplome',         label: 'Vérifier mon diplôme / certification',        help: 'Yoga Alliance 200h+ minimum, ou diplôme d\'État pour le sport.' },
      { id: 'cgv',             label: 'Rédiger mes CGV (conditions générales de vente)', help: 'Obligatoire dès que tu vends en ligne ou par carnet.' },
      { id: 'mentions-legales', label: 'Écrire mes mentions légales',                help: 'Obligatoire sur tout site web pro.' },
      { id: 'rgpd',            label: 'Mettre en place le RGPD',                     help: 'Politique de confidentialité + consentement newsletter + droit à l\'oubli.' },
    ],
  },
  {
    id: 'marque',
    title: 'Identité de marque',
    emoji: '🎨',
    color: 'blush',
    items: [
      { id: 'nom',             label: 'Choisir mon nom professionnel',               help: 'Ton prénom + discipline, ou un nom de studio. Vérifie la dispo sur INPI + Google.' },
      { id: 'logo',            label: 'Créer mon logo (ou identité minimale)',       help: 'Pas besoin d\'un truc cher — typo + 1-2 couleurs suffisent au début.' },
      { id: 'photos-pro',      label: 'Faire un shooting photo professionnel',       help: 'Investissement clé : 200-500 € pour 6-12 photos qui te serviront 2-3 ans.' },
      { id: 'bio',             label: 'Rédiger ma bio / pourquoi je transmets',      help: 'Ton parcours, ta vision, ce qui te rend unique en 3-5 phrases.' },
    ],
  },
  {
    id: 'tarifs',
    title: 'Tarifs & offres',
    emoji: '💸',
    color: 'amber',
    items: [
      { id: 'fourchette-tarif', label: 'Fixer mes tarifs (cours unitaire + carnets)', help: 'Étudie le marché local + ton seuil de rentabilité.', link: '/blog/comment-fixer-tarifs-prof-yoga-2026' },
      { id: 'simuler-revenu',  label: 'Simuler mon revenu net mensuel',              help: 'Vérifie que tes tarifs te permettent de vivre dignement.', link: '/outils/calculateur-revenu-prof-yoga' },
      { id: 'grille-tarif',    label: 'Imprimer ma grille tarifaire',                help: 'Pour ton studio, ton site, ou les envois mail.', link: '/outils/grille-tarifaire-prof-yoga' },
      { id: 'cours-essai',     label: 'Définir ma politique de cours d\'essai',      help: 'Payant (5 €) convertit 3× mieux que gratuit. À documenter clairement.' },
      { id: 'regles-annulation', label: 'Écrire mes règles d\'annulation / no-show', help: 'Délai (12-24h avant), exceptions, conséquences. Annoncé à l\'inscription.' },
    ],
  },
  {
    id: 'lieu',
    title: 'Lieu & matériel',
    emoji: '🏠',
    color: 'sage',
    items: [
      { id: 'lieu-cours',      label: 'Trouver mon lieu de cours principal',         help: 'Studio en location, salle municipale, en plein air, à domicile — chacun a ses avantages.' },
      { id: 'contrat-loc',     label: 'Signer mon contrat de location (si studio)',  help: 'Vérifie : assurance du lieu, accès, ménage, créneaux disponibles.' },
      { id: 'materiel-base',   label: 'Acheter mon matériel de base',                help: 'Tapis de prêt (×3-5), briques, sangles, bolsters, couvertures. ~200-400 €.' },
      { id: 'enceinte',        label: 'Prévoir une enceinte / playlist',             help: 'Bluetooth portable + playlist Spotify dédiée par type de cours.' },
    ],
  },
  {
    id: 'eleves',
    title: 'Premiers élèves',
    emoji: '📣',
    color: 'coral',
    items: [
      { id: 'site-web',        label: 'Créer mon site web (ou page de présentation)', help: 'Minimum : qui tu es, ce que tu proposes, comment réserver.' },
      { id: 'google-business', label: 'Créer ma fiche Google Business',              help: 'Gratuit. Crucial pour apparaître en recherche locale.' },
      { id: 'insta-pro',       label: 'Configurer un Instagram pro',                 help: 'Bio claire, lien réservation, 9-12 premiers posts cohérents.' },
      { id: 'reseau-perso',    label: 'Prévenir mon entourage (lancement officiel)',  help: 'Message perso à 30-50 personnes proches : "Je lance, voici le lien."' },
      { id: 'partenariats',    label: 'Identifier 2-3 partenaires locaux',           help: 'Naturopathe, ostéo, salle de sport, café bio. Échange de cartes + recommandation croisée.' },
      { id: 'first-elevest',   label: 'Décrocher mes 5 premiers élèves',             help: 'L\'objectif #1 du mois 1. Le reste suit naturellement.' },
    ],
  },
  {
    id: 'gestion',
    title: 'Outils & gestion',
    emoji: '🧰',
    color: 'sky',
    items: [
      { id: 'outil-resa',      label: 'Choisir un outil de réservation / gestion',   help: 'IziSolo, ou un alternatif. L\'important : démarrer simple, pas un Excel qui devient ingérable.' },
      { id: 'compta-routine',  label: 'Mettre en place ma routine compta (15 min/mois)', help: 'Excel ou outil intégré. Encaissements + dépenses + déclaration URSSAF trimestrielle.' },
      { id: 'sauvegardes',     label: 'Sécuriser mes sauvegardes (élèves, paiements)', help: 'Cloud + export régulier. Tu ne veux pas perdre ta base le jour où ton ordi crash.' },
      { id: 'process-mensuel', label: 'Définir ma routine mensuelle',                help: 'Relance carnets expirés, suivi no-shows, communication newsletter. 1h/mois max.' },
    ],
  },
];

const STORAGE_KEY = 'izisolo-checklist-v1';

const TOTAL_ITEMS = PHASES.reduce((sum, p) => sum + p.items.length, 0);

export default function Checklist() {
  const [checked, setChecked] = useState({});
  const [notes, setNotes] = useState({});
  const [openNotes, setOpenNotes] = useState({});
  const [resetFlash, setResetFlash] = useState(false);

  // Hydrate depuis localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.checked) setChecked(parsed.checked);
        if (parsed.notes) setNotes(parsed.notes);
      }
    } catch {}
  }, []);

  // Auto-save
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ checked, notes }));
    } catch {}
  }, [checked, notes]);

  const toggle = (id) => {
    setChecked((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const updateNote = (id, value) => {
    setNotes((prev) => ({ ...prev, [id]: value }));
  };

  const toggleNoteOpen = (id) => {
    setOpenNotes((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleReset = () => {
    if (confirm('Réinitialiser toutes les cases et notes ? Cette action est irréversible.')) {
      setChecked({});
      setNotes({});
      setOpenNotes({});
      setResetFlash(true);
      setTimeout(() => setResetFlash(false), 1800);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  // Calculs progression
  const totalChecked = useMemo(
    () => Object.values(checked).filter(Boolean).length,
    [checked]
  );
  const globalPct = Math.round((totalChecked / TOTAL_ITEMS) * 100);

  const phaseStats = useMemo(() => {
    return PHASES.map((phase) => {
      const total = phase.items.length;
      const done = phase.items.filter((item) => checked[item.id]).length;
      const pct = Math.round((done / total) * 100);
      return { id: phase.id, total, done, pct };
    });
  }, [checked]);

  return (
    <>
      {/* Barre de progression globale + contrôles */}
      <section className="checklist-progress">
        <div className="progress-header">
          <div>
            <span className="progress-eyebrow">Ma progression</span>
            <h3 className="serif">
              {totalChecked} sur {TOTAL_ITEMS} étapes
              <em> · {globalPct} %</em>
            </h3>
          </div>
          <div className="checklist-controls">
            <button type="button" onClick={handleReset} className="btn-ghost btn-sm">
              {resetFlash ? '✓ Réinitialisé' : 'Réinitialiser'}
            </button>
            <button type="button" onClick={handlePrint} className="btn-primary btn-sm btn-print">
              🖨️ Imprimer / PDF
            </button>
          </div>
        </div>
        <div className="progress-bar">
          <div className="progress-fill" style={{ width: `${globalPct}%` }} />
        </div>
      </section>

      <p className="checklist-hint">
        💡 Coche les cases au fur et à mesure. Tes notes et progression sont
        sauvegardées automatiquement dans ton navigateur — tu peux revenir
        quand tu veux. Clique sur l'icône 📝 pour ajouter une note perso à un item.
      </p>

      {/* Les phases */}
      <div className="checklist-phases">
        {PHASES.map((phase, idx) => {
          const stats = phaseStats[idx];
          return (
            <article key={phase.id} className="phase-card" data-color={phase.color}>
              <header className="phase-header">
                <span className="phase-emoji">{phase.emoji}</span>
                <div className="phase-title-wrap">
                  <h3 className="serif">{phase.title}</h3>
                  <span className="phase-stats">{stats.done}/{stats.total} · {stats.pct} %</span>
                </div>
                <div className="phase-bar">
                  <div className="phase-bar-fill" style={{ width: `${stats.pct}%` }} />
                </div>
              </header>

              <ul className="phase-items">
                {phase.items.map((item) => {
                  const isChecked = !!checked[item.id];
                  const isNoteOpen = !!openNotes[item.id];
                  const noteValue = notes[item.id] || '';
                  return (
                    <li key={item.id} className={`phase-item ${isChecked ? 'is-done' : ''}`}>
                      <label className="item-row">
                        <input
                          type="checkbox"
                          className="item-checkbox"
                          checked={isChecked}
                          onChange={() => toggle(item.id)}
                          aria-label={item.label}
                        />
                        <span className="item-check-visual" aria-hidden="true">
                          {isChecked && '✓'}
                        </span>
                        <div className="item-body">
                          <span className="item-label">{item.label}</span>
                          <span className="item-help">{item.help}</span>
                          {item.link && (
                            <a
                              href={item.link}
                              className="item-link"
                              target={item.link.startsWith('http') ? '_blank' : undefined}
                              rel={item.link.startsWith('http') ? 'noopener noreferrer' : undefined}
                              onClick={(e) => e.stopPropagation()}
                            >
                              → Ressource utile
                            </a>
                          )}
                        </div>
                      </label>
                      <button
                        type="button"
                        className={`item-note-toggle ${noteValue ? 'has-note' : ''}`}
                        onClick={() => toggleNoteOpen(item.id)}
                        aria-label="Ajouter une note"
                        title={noteValue ? 'Note présente' : 'Ajouter une note'}
                      >
                        📝
                      </button>
                      {isNoteOpen && (
                        <div className="item-note-wrap">
                          <textarea
                            className="item-note"
                            value={noteValue}
                            onChange={(e) => updateNote(item.id, e.target.value)}
                            placeholder="Ta note personnelle pour cet item..."
                            rows={2}
                          />
                        </div>
                      )}
                      {noteValue && !isNoteOpen && (
                        <div className="item-note-preview">
                          <span className="note-icon">📝</span>
                          <span className="note-text">{noteValue}</span>
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            </article>
          );
        })}
      </div>
    </>
  );
}
