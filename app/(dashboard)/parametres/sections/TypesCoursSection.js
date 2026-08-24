'use client';

// ═══════════════════════════════════════════════════════════════════════════
// « Types de cours » — l'identité visuelle du planning public (v99).
//
// Deux réglages par type, du moins cher au plus cher pour la prof :
//   1. la COULEUR. Elle existait déjà sur le portail, mais elle était DÉDUITE
//      d'un mapping de vocabulaire yoga (lib/tones.js) avec un repli « première
//      lettre modulo 4 » : Pilates et Danse ressortaient de la même couleur et
//      aucun écran ne permettait de corriger. Ici, elle choisit.
//   2. la PHOTO, facultative. Déposée une fois par type, elle habille toutes
//      les séances de ce type, y compris celles qui n'existent pas encore.
//      Une séance précise peut la remplacer depuis sa propre fiche (l'atelier
//      ponctuel qui mérite son image).
//
// Sondage prod avant écriture : 3 studios sur 20 avaient déposé une photo de
// couverture. D'où l'ordre : la couleur d'abord, elle profite à tout le monde.
// ═══════════════════════════════════════════════════════════════════════════

import { Palette, ImageIcon } from 'lucide-react';
import PhotoUploader from '@/components/ui/PhotoUploader';
import AideContextuelle from '@/components/AideContextuelle';
import { getAllTypesFromCategories } from '@/lib/utils';
import { TONES, TONES_LABELS, toneCours } from '@/lib/vignette-cours';

export default function TypesCoursSection({ profile, setProfile, setDirty }) {
  const types = getAllTypesFromCategories(profile?.types_cours);

  const tons = (profile?.tons_par_type && typeof profile.tons_par_type === 'object' && !Array.isArray(profile.tons_par_type))
    ? profile.tons_par_type : {};
  const vignettes = (profile?.vignettes_par_type && typeof profile.vignettes_par_type === 'object' && !Array.isArray(profile.vignettes_par_type))
    ? profile.vignettes_par_type : {};

  const majCarte = (champ, type, valeur) => {
    const source = champ === 'tons_par_type' ? tons : vignettes;
    const next = { ...source };
    if (valeur) next[type] = valeur;
    else delete next[type];
    setProfile(prev => ({ ...prev, [champ]: Object.keys(next).length > 0 ? next : null }));
    setDirty?.();
  };

  if (types.length === 0) {
    return (
      <div className="section izi-card">
        <h2 className="section-title">
          <Palette size={18} /> Types de cours
          <AideContextuelle ancre="apparence-cours" titre="Ouvrir le tuto « La couleur et la photo de tes cours »" />
        </h2>
        <p className="tc-intro">
          Tes types de cours (Hatha, Pilates, Atelier…) donnent leur couleur aux séances
          de ton planning public. Tu n&apos;en as pas encore : tu en crées un en créant
          un cours, et il apparaîtra ici pour que tu l&apos;habilles.
        </p>
        <style jsx global>{`.tc-intro { color: var(--text-secondary); font-size: 0.9rem; margin: 0; }`}</style>
      </div>
    );
  }

  return (
    <div className="section izi-card">
      <h2 className="section-title">
        <Palette size={18} /> Types de cours
        <AideContextuelle ancre="apparence-cours" titre="Ouvrir le tuto « La couleur et la photo de tes cours »" />
      </h2>
      <p className="tc-intro">
        Chaque type porte une couleur sur ton planning public, et peut porter une photo.
        La photo d&apos;un type habille toutes ses séances, même celles que tu créeras
        plus tard. Pour un atelier qui mérite son image à lui, tu peux la remplacer
        directement sur la séance.
      </p>

      <div className="tc-liste">
        {types.map(type => {
          const ton = toneCours(type, tons);
          const vignette = vignettes[type] || null;
          return (
            <div key={type} className={`tc-ligne tc-ton-${ton}`}>
              <div className="tc-photo">
                <PhotoUploader
                  currentUrl={vignette}
                  kind="vignette"
                  remplace={vignette}
                  forme="carre"
                  taille={64}
                  label="Photo"
                  onUploaded={(url) => majCarte('vignettes_par_type', type, url)}
                />
              </div>

              <div className="tc-corps">
                <div className="tc-nom">{type}</div>
                <div className="tc-tons" role="group" aria-label={`Couleur de ${type}`}>
                  {TONES.map(t => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => majCarte('tons_par_type', type, tons[type] === t ? null : t)}
                      className={`tc-pastille tc-pastille-${t} ${ton === t ? 'active' : ''}`}
                      aria-pressed={ton === t}
                      title={TONES_LABELS[t]}
                    >
                      <span className="tc-pastille-nom">{TONES_LABELS[t]}</span>
                    </button>
                  ))}
                </div>
                {!vignette && (
                  <p className="tc-hint">
                    <ImageIcon size={12} /> Sans photo, la couleur suffit : la carte reste lisible.
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <p className="tc-legal">
        Dépose une photo dont tu as les droits. Si des élèves y sont reconnaissables,
        demande-leur avant : ta page est publique.
      </p>

      {/* Styles en GLOBAL : les pastilles et les lignes stylent des éléments de
          ce composant, mais PhotoUploader est un composant enfant et le scopé
          styled-jsx ne hashe jamais ses éléments (anti-pattern §12). */}
      <style jsx global>{`
        .tc-intro { color: var(--text-secondary); font-size: 0.9rem; margin: 0 0 16px; line-height: 1.55; }
        .tc-liste { display: flex; flex-direction: column; gap: 10px; }
        .tc-ligne {
          display: flex; align-items: flex-start; gap: 14px;
          padding: 12px; border-radius: 14px;
          border: 1px solid var(--border);
          border-left: 6px solid var(--tone-sand-accent);
          background: var(--bg-card, #fff);
        }
        .tc-ligne .photo-uploader { align-items: center; }
        .tc-ligne .photo-uploader-actions .izi-btn { padding: 4px 8px; font-size: 0.75rem; }
        .tc-corps { flex: 1; min-width: 0; }
        .tc-nom { font-weight: 700; color: var(--text-primary); margin-bottom: 8px; }
        .tc-tons { display: flex; flex-wrap: wrap; gap: 6px; }
        .tc-pastille {
          border: 1.5px solid transparent; border-radius: 999px;
          padding: 4px 10px; cursor: pointer;
          font-size: 0.75rem; font-weight: 600;
          transition: border-color 0.15s, transform 0.1s;
        }
        .tc-pastille:hover { transform: translateY(-1px); }
        .tc-pastille.active { border-color: var(--text-primary); }
        .tc-pastille:focus-visible { outline: 2px solid var(--brand); outline-offset: 2px; }
        .tc-hint {
          display: flex; align-items: center; gap: 5px;
          margin: 8px 0 0; font-size: 0.75rem; color: var(--text-muted);
        }
        .tc-legal {
          margin: 14px 0 0; font-size: 0.75rem; color: var(--text-muted);
          line-height: 1.5;
        }

        /* Tons : la ligne prend la couleur choisie, la pastille la montre. */
        .tc-ton-rose     { border-left-color: var(--tone-rose-accent); }
        .tc-ton-sage     { border-left-color: var(--tone-sage-accent); }
        .tc-ton-sand     { border-left-color: var(--tone-sand-accent); }
        .tc-ton-lavender { border-left-color: var(--tone-lavender-accent); }
        .tc-ton-ink      { border-left-color: var(--tone-ink-bg); }

        .tc-pastille-rose     { background: var(--tone-rose-bg);     color: var(--tone-rose-ink); }
        .tc-pastille-sage     { background: var(--tone-sage-bg);     color: var(--tone-sage-ink); }
        .tc-pastille-sand     { background: var(--tone-sand-bg);     color: var(--tone-sand-ink); }
        .tc-pastille-lavender { background: var(--tone-lavender-bg);  color: var(--tone-lavender-ink); }
        .tc-pastille-ink      { background: var(--tone-ink-bg);      color: var(--tone-ink-text, #fff); }

        @media (max-width: 520px) {
          .tc-ligne { gap: 10px; padding: 10px; }
          .tc-pastille-nom { font-size: 0.7rem; }
        }
      `}</style>
    </div>
  );
}
