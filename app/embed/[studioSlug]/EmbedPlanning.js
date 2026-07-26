'use client';

// ════════════════════════════════════════════════════════════════════════════
// Rendu du planning intégrable (B2g) — volontairement MINCE : pas de header,
// pas de nav, pas de PWA. Chaque cours ouvre le portail dans un NOUVEL onglet
// (l'action sort de l'iframe, la session élève vit en première partie).
// Auto-hauteur : poste { source:'izisolo-embed', height } au parent à chaque
// changement de taille — public/widget.js écoute et ajuste l'iframe.
// ════════════════════════════════════════════════════════════════════════════

import { useEffect, useRef } from 'react';

const formatHeure = (h) => (h ? String(h).slice(0, 5).replace(':', 'h') : '');
const prixTag = (c) => {
  if (!(Number(c.tarif_unitaire) > 0)) return null;
  const prix = Number(c.tarif_unitaire).toFixed(2).replace('.', ',').replace(',00', '');
  return c.carnets_acceptes === true ? `${prix} € ou carnet` : `${prix} € / séance`;
};

export default function EmbedPlanning({ studioNom, slug, afficherInscrits, canReserve, cours }) {
  const rootRef = useRef(null);

  // Auto-hauteur : à l'affichage + à chaque resize du contenu.
  // ⚠️ body.scrollHeight, PAS documentElement : dans une iframe, la hauteur
  // du documentElement ne descend jamais sous celle du viewport — l'embed
  // renvoyait la hauteur de l'iframe elle-même (700 → 700, jamais rétréci).
  useEffect(() => {
    const poster = () => {
      const h = Math.ceil(document.body.scrollHeight);
      if (!h) return;
      // Hauteur seule (rien de sensible) → targetOrigin '*' assumé ; le
      // widget côté hôte vérifie origine + source + shape avant d'appliquer.
      window.parent?.postMessage({ source: 'izisolo-embed', slug, height: h }, '*');
    };
    poster();
    const ro = new ResizeObserver(poster);
    ro.observe(document.body);
    return () => ro.disconnect();
  }, [slug]);

  // Groupement par date (les cours arrivent déjà triés date+heure).
  const parDate = [];
  for (const c of cours) {
    const dernier = parDate[parDate.length - 1];
    if (dernier && dernier.date === c.date) dernier.items.push(c);
    else parDate.push({ date: c.date, items: [c] });
  }

  const libelleDate = (iso) => {
    const d = new Date(iso + 'T12:00:00');
    const s = d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'Europe/Paris' });
    return s.charAt(0).toUpperCase() + s.slice(1);
  };

  return (
    <div className="emb" ref={rootRef}>
      {parDate.length === 0 && (
        <p className="emb-vide">Aucune séance programmée pour le moment — reviens bientôt !</p>
      )}

      {parDate.map(({ date, items }) => (
        <section key={date} className="emb-jour">
          <h2 className="emb-date">{libelleDate(date)}</h2>
          {items.map(c => {
            const complet = c.capacite_max && c.nbInscrits >= c.capacite_max;
            const prix = prixTag(c);
            return (
              <a
                key={c.id}
                className="emb-cours"
                href={`/p/${slug}/cours/${c.id}?src=embed`}
                target="_blank"
                rel="noopener noreferrer"
              >
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
          Planning {studioNom} — propulsé par <strong>IziSolo</strong>
        </a>
      </div>

      <style jsx global>{`
        html, body { background: transparent; }
      `}</style>
      <style jsx>{`
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
          color: #8a7a68; margin: 0 0 6px 2px;
        }
        .emb-cours {
          display: flex; align-items: center; gap: 12px;
          padding: 10px 12px; margin-bottom: 6px;
          background: #fff; border: 1px solid #e8e2d8; border-radius: 12px;
          text-decoration: none; color: inherit;
          transition: border-color 0.15s, box-shadow 0.15s;
        }
        .emb-cours:hover { border-color: #c9a227; box-shadow: 0 2px 10px rgba(80, 60, 30, 0.08); }
        .emb-heure {
          flex-shrink: 0; width: 58px; text-align: center;
          font-weight: 800; font-size: 0.9375rem; color: #7a4a1e;
          display: flex; flex-direction: column; line-height: 1.2;
        }
        .emb-duree { font-size: 0.6875rem; font-weight: 500; color: #a09484; }
        .emb-corps { flex: 1; min-width: 0; }
        .emb-nom { font-weight: 700; font-size: 0.9375rem; line-height: 1.3; }
        .emb-meta { display: flex; flex-wrap: wrap; gap: 6px; align-items: center; margin-top: 3px; }
        .emb-tag {
          font-size: 0.6875rem; font-weight: 600; padding: 2px 8px;
          border-radius: 999px; background: #f6efe4; color: #7a5c34;
        }
        .emb-tag-prix { background: #fdf3e0; color: #9a6b1f; }
        .emb-lieu { font-size: 0.75rem; color: #8a8a8f; }
        .emb-droite { flex-shrink: 0; display: flex; flex-direction: column; align-items: flex-end; gap: 3px; }
        .emb-complet {
          font-size: 0.6875rem; font-weight: 700; padding: 2px 8px;
          border-radius: 999px; background: #fdeaea; color: #b03030;
        }
        .emb-places { font-size: 0.75rem; color: #8a8a8f; }
        .emb-cta { font-size: 0.8125rem; font-weight: 700; color: #7a4a1e; white-space: nowrap; }
        .emb-pied { text-align: center; padding: 10px 0 8px; }
        .emb-pied a { font-size: 0.75rem; color: #a09484; text-decoration: none; }
        .emb-pied a:hover { color: #7a4a1e; }
        .emb-pied strong { color: #7a4a1e; }
        @media (max-width: 420px) {
          .emb-cours { gap: 8px; padding: 9px 10px; }
          .emb-heure { width: 48px; font-size: 0.875rem; }
          .emb-lieu { display: none; }
        }
      `}</style>
    </div>
  );
}
