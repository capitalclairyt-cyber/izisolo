'use client';

// ═══════════════════════════════════════════════════════════════════════════
// « Types de cours » — l'identité visuelle du planning public (v99).
//
// Deux réglages par type : la COULEUR (elle était déduite d'un mapping de
// vocabulaire yoga sans qu'aucun écran ne permette de corriger) et la PHOTO,
// facultative, qui habille toutes les séances du type.
//
// Lot 2 « le repli » (2026-09-09) : une LIGNE par type (miniature, pastille
// de la couleur en vigueur, nom, chevron). Le clic déplie les cinq couleurs
// et le dépôt de photo pour CE type. Huit cartes ouvertes et 63 boutons
// deviennent huit lignes ; rien n'est retiré, tout est à un clic.
// ═══════════════════════════════════════════════════════════════════════════

import { useState } from 'react';
import { ImageIcon, ChevronDown } from 'lucide-react';
import PhotoUploader from '@/components/ui/PhotoUploader';
import { getAllTypesFromCategories } from '@/lib/utils';
import { TONES, TONES_LABELS, toneCours } from '@/lib/vignette-cours';

export default function TypesCoursSection({ profile, setProfile, setDirty }) {
  const types = getAllTypesFromCategories(profile?.types_cours);
  const [ouverts, setOuverts] = useState(() => new Set());
  const basculer = (type) => setOuverts(prev => { const n = new Set(prev); if (n.has(type)) n.delete(type); else n.add(type); return n; });

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
      <>
        <p className="tc-intro">
          Tes types de cours (Hatha, Pilates, Atelier…) donnent leur couleur à ton planning public. Tu n&apos;en as pas encore : crée un cours, son type apparaîtra ici.
        </p>
        <style jsx global>{`.tc-intro { color: var(--text-secondary); font-size: 0.9rem; margin: 0; }`}</style>
      </>
    );
  }

  return (
    <>
      <p className="tc-intro">
        Chaque type a sa couleur sur ton planning, et peut porter une photo qui habille toutes ses séances. Clique un type pour le régler.
      </p>

      <div className="tc-liste">
        {types.map(type => {
          const ton = toneCours(type, tons);
          const vignette = vignettes[type] || null;
          const ouvert = ouverts.has(type);
          return (
            <div key={type} className={`tc-ligne tc-ton-${ton} ${ouvert ? 'ouverte' : ''}`}>
              <button type="button" className="tc-entete" onClick={() => basculer(type)} aria-expanded={ouvert}>
                <span className="tc-mini">
                  {vignette ? <img src={vignette} alt="" /> : <ImageIcon size={16} />}
                </span>
                <span className={`tc-point tc-pastille-${ton}`} aria-hidden="true" />
                <span className="tc-nom">{type}</span>
                <span className="tc-resume">{TONES_LABELS[ton]}{vignette ? ' · photo' : ''}</span>
                <ChevronDown size={16} className="tc-chevron" />
              </button>

              {ouvert && (
                <div className="tc-corps">
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
                    {!vignette && (
                      <p className="tc-hint"><ImageIcon size={12} /> Sans photo, la couleur suffit : la carte reste lisible.</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <p className="tc-legal">
        Une photo dont tu as les droits ; si des élèves y sont reconnaissables, demande-leur avant : ta page est publique.
      </p>

      {/* Styles en GLOBAL : PhotoUploader est un composant enfant et le scopé
          styled-jsx ne hashe jamais ses éléments (anti-pattern §12). */}
      <style jsx global>{`
        .tc-intro { color: var(--text-secondary); font-size: 0.875rem; margin: 0 0 12px; line-height: 1.5; }
        .tc-liste { display: flex; flex-direction: column; gap: 6px; }
        .tc-ligne {
          border-radius: 12px; border: 1px solid var(--border);
          border-left: 5px solid var(--tone-sand-accent);
          background: var(--bg-card, #fff); overflow: hidden;
        }
        .tc-entete {
          display: flex; align-items: center; gap: 10px; width: 100%;
          padding: 8px 12px 8px 10px; background: none; border: none; cursor: pointer;
          font: inherit; color: var(--text-primary); text-align: left;
        }
        .tc-entete:hover { background: var(--cream, #faf8f5); }
        .tc-mini {
          width: 34px; height: 34px; border-radius: 8px; flex-shrink: 0; overflow: hidden;
          background: var(--bg-soft, #faf8f5); color: var(--text-muted);
          display: flex; align-items: center; justify-content: center;
        }
        .tc-mini img { width: 100%; height: 100%; object-fit: cover; display: block; }
        .tc-point { width: 12px; height: 12px; border-radius: 50%; flex-shrink: 0; border: 1px solid rgba(0,0,0,0.08); }
        .tc-nom { font-weight: 700; flex: 1; min-width: 0; }
        .tc-resume { font-size: 0.75rem; color: var(--text-muted); white-space: nowrap; }
        .tc-chevron { color: var(--text-muted); flex-shrink: 0; transition: transform 0.18s; }
        .tc-ligne.ouverte .tc-chevron { transform: rotate(180deg); }
        .tc-corps { display: flex; align-items: flex-start; gap: 16px; flex-wrap: wrap; padding: 6px 12px 12px 56px; }
        .tc-tons { display: flex; flex-wrap: wrap; gap: 6px; }
        .tc-photo { display: flex; flex-direction: column; gap: 6px; }
        .tc-photo .photo-uploader { align-items: center; }
        .tc-photo .photo-uploader-actions .izi-btn { padding: 4px 8px; font-size: 0.75rem; }
        .tc-pastille {
          border: 1.5px solid transparent; border-radius: 999px;
          padding: 4px 10px; cursor: pointer;
          font-size: 0.75rem; font-weight: 600;
          transition: border-color 0.15s, transform 0.1s;
        }
        .tc-pastille:hover { transform: translateY(-1px); }
        .tc-pastille.active { border-color: var(--text-primary); }
        .tc-pastille:focus-visible { outline: 2px solid var(--brand); outline-offset: 2px; }
        .tc-hint { display: flex; align-items: center; gap: 5px; margin: 0; font-size: 0.72rem; color: var(--text-muted); }
        .tc-legal { margin: 12px 0 0; font-size: 0.75rem; color: var(--text-muted); line-height: 1.5; }

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
        .tc-point.tc-pastille-rose     { background: var(--tone-rose-accent, var(--tone-rose-bg)); }
        .tc-point.tc-pastille-sage     { background: var(--tone-sage-accent, var(--tone-sage-bg)); }
        .tc-point.tc-pastille-sand     { background: var(--tone-sand-accent, var(--tone-sand-bg)); }
        .tc-point.tc-pastille-lavender { background: var(--tone-lavender-accent, var(--tone-lavender-bg)); }
        .tc-point.tc-pastille-ink      { background: var(--tone-ink-bg); }

        @media (max-width: 520px) {
          .tc-corps { padding-left: 12px; }
          .tc-resume { display: none; }
          .tc-pastille-nom { font-size: 0.7rem; }
        }
      `}</style>
    </>
  );
}
