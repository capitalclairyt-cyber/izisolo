'use client';

import Link from 'next/link';

/**
 * ComparatifsLies — maillage interne vers les comparatifs du blog.
 *
 * POURQUOI (mesuré le 2026-08-30, export Performances Search Console) : les six
 * comparatifs n'étaient liés QUE depuis `content/blog/`, entre eux. Aucune page
 * de `app/` ni de `components/` ne pointait dessus, y compris
 * `/logiciel-gestion-prof-yoga`, qui vise pourtant exactement la même intention
 * de recherche et ne contenait pas une occurrence du mot « comparatif ».
 *
 * Ce que dit la mesure, et qui justifie de leur donner des liens depuis nos
 * pages les plus fortes : à neuf jours d'âge, ces articles étaient déjà en
 * position moyenne 7,0 (mirandaflow 6,7 avec 24 impressions, momoyoga 8,4,
 * bsport 8,5), là où la requête « logiciel gestion yoga » nous laisse en
 * position 49. Rapporté à l'âge des pages, c'est le meilleur rendement du site.
 *
 * ⚠️ Styles EN LIGNE et pas de classe scopée : styled-jsx ne hashe que les
 * éléments DOM natifs, jamais un composant comme <Link>. Une règle scopée
 * visant `.cmp-carte` ne matcherait donc pas le <a> rendu, et les liens
 * sortiraient en bleu navigateur (piège documenté, six occurrences déjà).
 * C'est le même patron que le bloc « Villes » de PersonaLanding.
 *
 * ⚠️ Conduite : comparatifs FACTUELS et DATÉS, jamais de dénigrement. Les
 * accroches ci-dessous décrivent NOS articles, elles n'affirment rien sur les
 * produits concurrents : ce qui les concerne est relevé à la source, daté, et
 * vérifié chaque trimestre par la routine `comparatifs-prix`.
 */

const COMPARATIFS = [
  { slug: 'izisolo-vs-momoyoga-comparatif-2026', nom: 'Momoyoga', accroche: "L'acteur international historique. Prix 2026 relevés, ses vraies forces, et un « choisis-les si » sincère." },
  { slug: 'izisolo-vs-bsport-comparatif-2026', nom: 'bsport', accroche: 'Plutôt orienté studios et salles. Ce que ça change quand on enseigne seule.' },
  { slug: 'izisolo-vs-eversports-comparatif-2026', nom: 'Eversports', accroche: 'Marketplace et logiciel à la fois. Le détail des frais et de la visibilité.' },
  { slug: 'izisolo-vs-mindbody-comparatif-2026', nom: 'Mindbody', accroche: 'Le poids lourd américain. Ce qu\'on gagne et ce qu\'on perd à passer sur un outil français.' },
  { slug: 'izisolo-vs-mirandaflow-comparatif-2026', nom: 'Mirandaflow', accroche: 'Un outil français récent. Les différences concrètes, sans caricature.' },
];

export default function ComparatifsLies({ titre = 'IziSolo comparé aux autres' }) {
  return (
    <section aria-label="Comparatifs" style={{ padding: '48px 20px' }}>
      <div style={{ maxWidth: 900, margin: '0 auto' }}>
        <h2
          className="serif"
          style={{
            fontFamily: 'var(--font-fraunces), Georgia, serif',
            fontWeight: 500,
            fontSize: 'clamp(1.5rem, 3.5vw, 2.1rem)',
            letterSpacing: '-0.01em',
            textAlign: 'center',
            margin: '0 0 10px',
          }}
        >
          {titre}
        </h2>
        <p
          style={{
            maxWidth: 620, margin: '0 auto 26px', textAlign: 'center',
            color: 'var(--c-ink-soft, #5c5148)', lineHeight: 1.6, fontSize: '0.98rem',
          }}
        >
          On est juge et partie, donc on écrit les chiffres, on les date et on dit
          quand l&apos;autre outil est le bon choix. Lis, puis fais parler les essais.
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 12 }}>
          {COMPARATIFS.map((c) => (
            <Link
              key={c.slug}
              href={`/blog/${c.slug}`}
              style={{
                display: 'flex', flexDirection: 'column', gap: 6,
                padding: '18px 20px', borderRadius: 14,
                background: 'var(--c-surface, #fff)',
                border: '1px solid var(--c-line, #ece3d5)',
                color: 'var(--c-ink, #2a2320)', textDecoration: 'none',
              }}
            >
              <span style={{ fontWeight: 600, fontSize: '1rem' }}>IziSolo vs {c.nom}</span>
              <span style={{ fontSize: '0.85rem', lineHeight: 1.5, color: 'var(--c-ink-soft, #5c5148)' }}>
                {c.accroche}
              </span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
