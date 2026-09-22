import Link from 'next/link';
import { traducteurPortail } from '@/lib/i18n-portail-serveur';

/**
 * L'espace élève d'un studio Essentiel (2026-09-07, lot « frontière des
 * plans ») : la carte Essentiel promet « pas d'espace élève », la page le
 * dit à l'élève au lieu de la laisser se connecter dans un espace que le
 * studio ne paie pas. Le planning public, lui, reste ouvert.
 * Composant SANS hook, SERVEUR (async) : rendu par des pages et layouts
 * serveur ; la langue est lue côté serveur (cookie > studio > fr).
 */
export default async function EspaceIndisponible({ studioNom, studioSlug }) {
  const t = await traducteurPortail(studioSlug);
  return (
    <div data-testid="espace-indisponible" style={{ maxWidth: 520, margin: '48px auto', padding: '32px 24px', textAlign: 'center', background: '#fff', borderRadius: 16, border: '1px solid #f0ebe8' }}>
      <div style={{ fontSize: '2rem', marginBottom: 8 }}>🧘</div>
      <h1 style={{ fontSize: '1.25rem', margin: '0 0 10px' }}>{t('Pas d\'espace élève chez {studio} pour le moment', { studio: studioNom || t('ce studio') })}</h1>
      <p style={{ color: '#6b6560', lineHeight: 1.55, margin: '0 0 18px' }}>
        {t('{studio} n\'a pas activé l\'espace en ligne pour ses élèves : les réservations et les carnets se gèrent directement avec lui.', { studio: studioNom || t('Ce studio') })}{' '}
        {t('Son planning reste consultable ici.')}
      </p>
      {studioSlug && (
        <Link href={`/p/${studioSlug}`} style={{ display: 'inline-block', padding: '10px 18px', borderRadius: 10, background: '#b87333', color: '#fff', textDecoration: 'none', fontWeight: 600 }}>
          {t('Voir le planning')}
        </Link>
      )}
    </div>
  );
}
