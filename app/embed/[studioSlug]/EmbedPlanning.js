'use client';

// ════════════════════════════════════════════════════════════════════════════
// Rendu du planning intégrable (B2g) — volontairement MINCE : pas de header,
// pas de nav, pas de PWA. Chaque cours ouvre le portail dans un NOUVEL onglet
// (l'action sort de l'iframe, la session élève vit en première partie).
// Auto-hauteur : poste { source:'izisolo-embed', height } au parent à chaque
// changement de taille — public/widget.js écoute et ajuste l'iframe.
// ════════════════════════════════════════════════════════════════════════════

import { useRef } from 'react';
import Image from 'next/image';
import { vignetteCours, altVignette } from '@/lib/vignette-cours';
import { useHauteurEmbed } from '../useHauteurEmbed';

const formatHeure = (h) => (h ? String(h).slice(0, 5).replace(':', 'h') : '');
const prixTag = (c) => {
  if (!(Number(c.tarif_unitaire) > 0)) return null;
  const prix = Number(c.tarif_unitaire).toFixed(2).replace('.', ',').replace(',00', '');
  return c.carnets_acceptes === true ? `${prix} € ou carnet` : `${prix} € / séance`;
};

const JOURS_COURTS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];

export default function EmbedPlanning({
  studioNom, slug, afficherInscrits, canReserve, cours,
  palette = 'sable', couleurs = null, affichage = 'liste',
  vignettes = null,
}) {
  const rootRef = useRef(null);

  // Auto-hauteur (partagée avec le bloc « Mes offres »).
  useHauteurEmbed(slug);

  // Groupement par date (les cours arrivent déjà triés date+heure).
  const parDate = [];
  for (const c of cours) {
    const dernier = parDate[parDate.length - 1];
    if (dernier && dernier.date === c.date) dernier.items.push(c);
    else parDate.push({ date: c.date, items: [c] });
  }

  // Mode « semaine » (façon Momoyoga) : grille Lun→Dim, jours vides compris
  // sur desktop (masqués en mobile où tout s'empile).
  const parSemaine = [];
  if (affichage === 'semaine') {
    const lundiDe = (iso) => {
      const d = new Date(iso + 'T12:00:00');
      d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
      return d.toLocaleDateString('sv-SE');
    };
    const semaines = new Map();
    for (const c of cours) {
      const lundi = lundiDe(c.date);
      if (!semaines.has(lundi)) semaines.set(lundi, new Map());
      const jour = semaines.get(lundi);
      if (!jour.has(c.date)) jour.set(c.date, []);
      jour.get(c.date).push(c);
    }
    for (const [lundi, parJour] of semaines) {
      const jours = [];
      for (let i = 0; i < 7; i++) {
        const d = new Date(lundi + 'T12:00:00');
        d.setDate(d.getDate() + i);
        const iso = d.toLocaleDateString('sv-SE');
        jours.push({ date: iso, num: d.getDate(), idx: i, items: parJour.get(iso) || [] });
      }
      parSemaine.push({ lundi, jours });
    }
  }

  const libelleSemaine = (lundiIso) => {
    const d = new Date(lundiIso + 'T12:00:00');
    return 'Semaine du ' + d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', timeZone: 'Europe/Paris' });
  };

  const libelleDate = (iso) => {
    const d = new Date(iso + 'T12:00:00');
    const s = d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'Europe/Paris' });
    return s.charAt(0).toUpperCase() + s.slice(1);
  };

  return (
    <div className="emb" data-palette={palette} data-affichage={affichage} style={couleurs || undefined} ref={rootRef}>
      {parDate.length === 0 && (
        <p className="emb-vide">Aucune séance programmée pour le moment, reviens bientôt !</p>
      )}

      {affichage === 'semaine' && parSemaine.map(({ lundi, jours }) => (
        <section key={lundi} className="emb-sem">
          <h2 className="emb-date">{libelleSemaine(lundi)}</h2>
          <div className="emb-sem-scroll">
            <div className="emb-sem-grille">
              {jours.map(j => (
                <div key={j.date} className={`emb-sj ${j.items.length === 0 ? 'emb-sj-sans' : ''}`}>
                  <div className="emb-sj-tete">{JOURS_COURTS[j.idx]} {j.num}</div>
                  {j.items.length === 0 && <span className="emb-sc-vide">—</span>}
                  {j.items.map(c => {
                    const complet = c.capacite_max && c.nbInscrits >= c.capacite_max;
                    const vignette = vignetteCours(c, vignettes);
                    return (
                      <a
                        key={c.id}
                        className="emb-sc"
                        href={`/p/${slug}/cours/${c.id}?src=embed`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        {/* Colonnes de 96 px minimum : une vignette carrée à
                            gauche écraserait le texte. Bandeau en haut. */}
                        {vignette && (
                          <span className="emb-sc-vign">
                            <Image src={vignette} alt={altVignette(c)} width={192} height={96} sizes="120px"
                                   style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          </span>
                        )}
                        <span className="emb-sc-h">{formatHeure(c.heure)}</span>
                        <span className="emb-sc-nom">{c.nom}</span>
                        {complet
                          ? <span className="emb-complet">Complet</span>
                          : afficherInscrits && c.capacite_max
                            ? <span className="emb-places">{c.nbInscrits}/{c.capacite_max}</span>
                            : null}
                      </a>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </section>
      ))}

      {affichage !== 'semaine' && parDate.map(({ date, items }) => (
        <section key={date} className="emb-jour">
          <h2 className="emb-date">{libelleDate(date)}</h2>
          {items.map(c => {
            const complet = c.capacite_max && c.nbInscrits >= c.capacite_max;
            const prix = prixTag(c);
            const vignette = vignetteCours(c, vignettes);
            return (
              <a
                key={c.id}
                className="emb-cours"
                href={`/p/${slug}/cours/${c.id}?src=embed`}
                target="_blank"
                rel="noopener noreferrer"
              >
                {vignette && (
                  <span className="emb-vign">
                    <Image src={vignette} alt={altVignette(c)} width={112} height={112} sizes="56px"
                           style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  </span>
                )}
                <div className="emb-heure">
                  {formatHeure(c.heure)}
                  {c.duree_minutes ? <span className="emb-duree">{c.duree_minutes} min</span> : null}
                </div>
                <div className="emb-corps">
                  <div className="emb-nom">{c.nom}</div>
                  <div className="emb-meta">
                    {c.type_cours && <span className="emb-tag">{c.type_cours}</span>}
                    {prix && <span className="emb-tag emb-tag-prix">{prix}</span>}
                    {c.lieu && <span className="emb-lieu">{c.lieu}</span>}
                  </div>
                </div>
                <div className="emb-droite">
                  {complet
                    ? <span className="emb-complet">Complet</span>
                    : afficherInscrits && c.capacite_max
                      ? <span className="emb-places">{c.nbInscrits}/{c.capacite_max}</span>
                      : null}
                  <span className="emb-cta">{complet ? 'Voir' : canReserve ? 'Réserver' : 'Voir'} →</span>
                </div>
              </a>
            );
          })}
        </section>
      ))}

      <div className="emb-pied">
        <a href={`/p/${slug}?src=embed`} target="_blank" rel="noopener noreferrer">
          Planning {studioNom}, propulsé par <strong>IziSolo</strong>
        </a>
      </div>

      <style jsx global>{`
        html, body { background: transparent; }
      `}</style>
      <style jsx>{`
        /* Les VARIABLES de palette vivent dans app/embed/embed-palette.css
           (partagées avec le bloc « Mes offres » v99). Ici, seule la mise en
           forme du planning. */
        .emb {
          font-family: var(--font-geist-sans, ui-sans-serif, system-ui, sans-serif);
          color: #2a2a2e;
          padding: 8px 10px 4px;
          max-width: 720px;
          margin: 0 auto;
        }
        .emb-vide { text-align: center; color: #8a8a8f; font-size: 0.9375rem; padding: 28px 8px; }
        .emb-jour { margin-bottom: 14px; }
        .emb-date {
          font-size: 0.8125rem; font-weight: 700; letter-spacing: 0.03em;
          color: var(--e-jour); margin: 0 0 6px 2px;
        }
        .emb-cours {
          display: flex; align-items: center; gap: 12px;
          padding: 10px 12px; margin-bottom: 6px;
          background: #fff; border: 1px solid var(--e-border); border-radius: 12px;
          text-decoration: none; color: inherit;
          transition: border-color 0.15s, box-shadow 0.15s;
        }
        .emb-cours:hover { border-color: var(--e-accent); box-shadow: 0 2px 10px var(--e-ombre); }
        .emb-heure {
          flex-shrink: 0; width: 58px; text-align: center;
          font-weight: 800; font-size: 0.9375rem; color: var(--e-deep);
          display: flex; flex-direction: column; line-height: 1.2;
        }
        .emb-duree { font-size: 0.6875rem; font-weight: 500; color: var(--e-soft); }
        /* Vignettes (v99). Vue liste : carré à gauche. Vue semaine : bandeau en
           haut de la carte, parce que les colonnes tombent à 96 px. */
        .emb-vign {
          flex-shrink: 0; display: block; line-height: 0;
          width: 56px; height: 56px; border-radius: 9px; overflow: hidden;
          background: rgba(0, 0, 0, 0.04);
        }
        .emb-sc-vign {
          display: block; line-height: 0; width: 100%; height: 44px;
          border-radius: 6px; overflow: hidden; margin-bottom: 2px;
          background: rgba(0, 0, 0, 0.04);
        }
        .emb-corps { flex: 1; min-width: 0; }
        .emb-nom { font-weight: 700; font-size: 0.9375rem; line-height: 1.3; }
        .emb-meta { display: flex; flex-wrap: wrap; gap: 6px; align-items: center; margin-top: 3px; }
        .emb-tag {
          font-size: 0.6875rem; font-weight: 600; padding: 2px 8px;
          border-radius: 999px; background: var(--e-tag-bg); color: var(--e-tag-ink);
        }
        .emb-tag-prix { background: var(--e-prix-bg); color: var(--e-prix-ink); }
        .emb-lieu { font-size: 0.75rem; color: #8a8a8f; }
        .emb-droite { flex-shrink: 0; display: flex; flex-direction: column; align-items: flex-end; gap: 3px; }
        .emb-complet {
          font-size: 0.6875rem; font-weight: 700; padding: 2px 8px;
          border-radius: 999px; background: #fdeaea; color: #b03030;
        }
        .emb-places { font-size: 0.75rem; color: #8a8a8f; }
        .emb-cta { font-size: 0.8125rem; font-weight: 700; color: var(--e-deep); white-space: nowrap; }
        .emb-pied { text-align: center; padding: 10px 0 8px; }
        .emb-pied a { font-size: 0.75rem; color: var(--e-soft); text-decoration: none; }
        .emb-pied a:hover { color: var(--e-deep); }
        .emb-pied strong { color: var(--e-deep); }
        /* ── Mode « semaine » (grille Lun→Dim, jours vides compris) ── */
        .emb[data-affichage='semaine'] { max-width: 1080px; }
        .emb-sem { margin-bottom: 18px; }
        .emb-sem-scroll { overflow-x: auto; padding-bottom: 4px; }
        .emb-sem-grille { display: grid; grid-template-columns: repeat(7, minmax(96px, 1fr)); gap: 6px; }
        .emb-sj { display: flex; flex-direction: column; gap: 6px; min-width: 0; }
        .emb-sj-tete {
          font-size: 0.6875rem; font-weight: 700; letter-spacing: 0.03em;
          color: var(--e-jour); text-align: center; padding: 2px 0;
        }
        .emb-sc {
          display: flex; flex-direction: column; gap: 2px; padding: 8px;
          background: #fff; border: 1px solid var(--e-border); border-radius: 10px;
          text-decoration: none; color: inherit;
          transition: border-color 0.15s, box-shadow 0.15s;
        }
        .emb-sc:hover { border-color: var(--e-accent); box-shadow: 0 2px 10px var(--e-ombre); }
        .emb-sc-h { font-weight: 800; font-size: 0.8125rem; color: var(--e-deep); }
        .emb-sc-nom { font-size: 0.75rem; font-weight: 600; line-height: 1.25; overflow-wrap: anywhere; }
        .emb-sc .emb-complet, .emb-sc .emb-places { align-self: flex-start; }
        .emb-sc-vide { color: var(--e-border); text-align: center; font-size: 0.8125rem; padding-top: 6px; }
        @media (max-width: 560px) {
          /* Mobile : la grille s'empile, les jours vides disparaissent. */
          .emb-sem-grille { grid-template-columns: 1fr; }
          .emb-sj-sans { display: none; }
          .emb-sj-tete { text-align: left; padding-left: 2px; }
        }
        @media (max-width: 420px) {
          .emb-cours { gap: 8px; padding: 9px 10px; }
          .emb-heure { width: 48px; font-size: 0.875rem; }
          .emb-lieu { display: none; }
          .emb-vign { width: 46px; height: 46px; }
        }
      `}</style>
    </div>
  );
}
