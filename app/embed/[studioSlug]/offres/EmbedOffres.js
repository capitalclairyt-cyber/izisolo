'use client';

// ════════════════════════════════════════════════════════════════════════════
// « Mes offres » intégrable (v99) — le pendant du planning, pour la grille
// tarifaire. Volontairement MINCE : pas de header, pas de nav, pas de PWA.
//
// AUCUN chemin d'écriture ici. Le bouton ouvre le portail sur l'onglet des
// tarifs, où vivent déjà le paiement en ligne et la demande d'offre (v97).
// Une iframe posée sur un site tiers est le pire endroit pour ouvrir un
// formulaire : cookies partitionnés, antibot aveugle, et la visiteuse ne sait
// plus à qui elle parle.
// ════════════════════════════════════════════════════════════════════════════

import { libelleSeances } from '@/lib/offres-seances';
import { useHauteurEmbed } from '../../useHauteurEmbed';

const formatPrix = (p) => {
  const n = Number(p);
  if (!Number.isFinite(n)) return '';
  return n.toFixed(2).replace('.', ',').replace(',00', '');
};

const dateCourte = (iso) => {
  try {
    return new Date(`${iso}T12:00:00`).toLocaleDateString('fr-FR', {
      day: 'numeric', month: 'short', timeZone: 'Europe/Paris',
    });
  } catch { return null; }
};

// Ce que l'offre donne droit à faire, dit AVANT de payer — même formulation que
// la grille du portail (lib/offres-seances est la source unique depuis v99 du
// « autant qu'elle veut / X par semaine / un nombre de séances »).
function sousTitre(o) {
  if (o.type === 'carnet') {
    return o.seances ? `Carnet de ${o.seances} séances` : 'Carnet de séances';
  }
  if (o.type === 'abonnement') {
    const bouts = [libelleSeances(o)];
    if (o.duree_jours) bouts.push(`${o.duree_jours} jours`);
    else if (o.date_debut && o.date_fin) {
      const d1 = dateCourte(o.date_debut);
      const d2 = dateCourte(o.date_fin);
      if (d1 && d2) bouts.push(`du ${d1} au ${d2}`);
    }
    return bouts.filter(Boolean).join(' · ');
  }
  return 'Cours à l\'unité';
}

export default function EmbedOffres({ studioNom, slug, offres, palette = 'sable', couleurs = null }) {
  useHauteurEmbed(slug);

  const lien = `/p/${slug}?tab=tarifs&src=embed`;

  return (
    <div className="emb" data-palette={palette} style={couleurs || undefined}>
      {offres.length === 0 && (
        <p className="emb-vide">Aucune offre disponible pour le moment.</p>
      )}

      <div className="embo-grille">
        {offres.map(o => (
          <a
            key={o.id}
            className="embo-carte"
            href={lien}
            target="_blank"
            rel="noopener noreferrer"
          >
            <div className="embo-haut">
              <span className="embo-nom">{o.nom}</span>
              <span className="embo-prix">{formatPrix(o.prix)} €</span>
            </div>
            <div className="embo-sub">{sousTitre(o)}</div>
            <span className="embo-cta">Je veux cette offre →</span>
          </a>
        ))}
      </div>

      <div className="emb-pied">
        <a href={`/p/${slug}?src=embed`} target="_blank" rel="noopener noreferrer">
          Offres {studioNom}, propulsé par <strong>IziSolo</strong>
        </a>
      </div>

      <style jsx global>{`
        html, body { background: transparent; }
      `}</style>
      <style jsx>{`
        /* Les VARIABLES de palette vivent dans app/embed/embed-palette.css,
           partagées avec le planning : un studio ne doit pas avoir deux blocs
           de couleurs différentes sur la même page. */
        .emb {
          font-family: var(--font-geist-sans, ui-sans-serif, system-ui, sans-serif);
          color: #2a2a2e;
          padding: 8px 10px 4px;
          max-width: 720px;
          margin: 0 auto;
        }
        .emb-vide { text-align: center; color: #8a8a8f; font-size: 0.9375rem; padding: 28px 8px; }

        .embo-grille {
          display: grid; gap: 8px;
          grid-template-columns: repeat(auto-fill, minmax(230px, 1fr));
        }
        .embo-carte {
          display: flex; flex-direction: column; gap: 4px;
          padding: 12px 14px;
          background: #fff; border: 1px solid var(--e-border); border-radius: 12px;
          text-decoration: none; color: inherit;
          transition: border-color 0.15s, box-shadow 0.15s;
        }
        .embo-carte:hover { border-color: var(--e-accent); box-shadow: 0 2px 10px var(--e-ombre); }
        .embo-haut { display: flex; align-items: baseline; justify-content: space-between; gap: 10px; }
        .embo-nom { font-weight: 700; font-size: 0.9375rem; line-height: 1.3; overflow-wrap: anywhere; }
        .embo-prix {
          flex-shrink: 0; font-weight: 800; font-size: 1rem; color: var(--e-deep);
          font-variant-numeric: tabular-nums;
        }
        .embo-sub { font-size: 0.75rem; color: var(--e-soft); line-height: 1.4; }
        .embo-cta {
          margin-top: 4px; font-size: 0.75rem; font-weight: 700; color: var(--e-deep);
        }

        .emb-pied {
          text-align: center; padding: 10px 0 4px;
          font-size: 0.6875rem; color: var(--e-soft);
        }
        .emb-pied a { color: inherit; text-decoration: none; }
        .emb-pied a:hover { text-decoration: underline; }

        @media (max-width: 420px) {
          .embo-grille { grid-template-columns: 1fr; }
        }
      `}</style>
    </div>
  );
}
