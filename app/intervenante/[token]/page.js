import IntervenanteClient from './IntervenanteClient';

/**
 * /intervenante/[token] — l'écran d'une prof de la structure qui n'a pas de
 * compte (v111, lot 1 Associations & Studios). Aucune session : ses séances,
 * leur pointage, rien d'autre. Tout passe par /api/intervenante/[token]/*,
 * seule autorité sur ce qui a le droit de sortir du studio.
 *
 * `noindex, nofollow` n'est pas décoratif : une URL qui porte un jeton
 * d'accès ne doit jamais entrer dans un index.
 */
export const metadata = {
  title: 'Mes séances',
  robots: { index: false, follow: false, nocache: true },
};

export default async function IntervenantePage({ params }) {
  const { token } = await params;
  return <IntervenanteClient token={token} />;
}
