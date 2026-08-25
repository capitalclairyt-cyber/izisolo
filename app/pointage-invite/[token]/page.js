import InvitePointageClient from './InvitePointageClient';

/**
 * /pointage-invite/[token] — l'écran de la personne à qui la prof a confié
 * le pointage d'UNE séance (v100). Aucun compte, aucune session.
 *
 * `noindex, nofollow` n'est pas décoratif : une URL qui porte un jeton
 * d'accès ne doit jamais entrer dans un index, ni être suivie par un robot.
 * La page ne charge RIEN côté serveur : tout passe par
 * /api/pointage-invite/[token], seule autorité sur ce qui a le droit de
 * sortir du studio. Deux chemins de lecture finiraient par diverger.
 */
export const metadata = {
  title: 'Pointer une séance',
  robots: { index: false, follow: false, nocache: true },
};

export default async function PointageInvitePage({ params }) {
  const { token } = await params;
  return <InvitePointageClient token={token} />;
}
