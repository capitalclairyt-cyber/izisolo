import Link from 'next/link';

/**
 * L'espace élève d'un studio Essentiel (2026-09-07, lot « frontière des
 * plans ») : la carte Essentiel promet « pas d'espace élève », la page le
 * dit à l'élève au lieu de la laisser se connecter dans un espace que le
 * studio ne paie pas. Le planning public, lui, reste ouvert.
 * Composant SANS hook : rendu par des pages et layouts serveur.
 */
export default function EspaceIndisponible({ studioNom, studioSlug }) {
  return (
    <div data-testid="espace-indisponible" style={{ maxWidth: 520, margin: '48px auto', padding: '32px 24px', textAlign: 'center', background: '#fff', borderRadius: 16, border: '1px solid #f0ebe8' }}>
      <div style={{ fontSize: '2rem', marginBottom: 8 }}>🧘</div>
      <h1 style={{ fontSize: '1.25rem', margin: '0 0 10px' }}>Pas d&apos;espace élève chez {studioNom || 'ce studio'} pour le moment</h1>
      <p style={{ color: '#6b6560', lineHeight: 1.55, margin: '0 0 18px' }}>
        {studioNom || 'Ce studio'} n&apos;a pas activé l&apos;espace en ligne pour ses élèves : les réservations et les carnets se gèrent directement avec lui.
        Son planning reste consultable ici.
      </p>
      {studioSlug && (
        <Link href={`/p/${studioSlug}`} style={{ display: 'inline-block', padding: '10px 18px', borderRadius: 10, background: '#b87333', color: '#fff', textDecoration: 'none', fontWeight: 600 }}>
          Voir le planning
        </Link>
      )}
    </div>
  );
}
