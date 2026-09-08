import { redirect } from 'next/navigation';
import OuvrirLien from '@/components/auth/OuvrirLien';
import { fetchStudioPublic } from '@/lib/portail-metadata';

/**
 * GET /p/[studioSlug]/connecte — l'atterrissage du lien de connexion ÉLÈVE.
 *
 * Jusqu'au 2026-09-08 c'était une route qui appelait `verifyOtp` au
 * chargement : le jeton était consommé par le premier GET, donc par le robot
 * de la messagerie quand elle en a un (Hotmail/Outlook « Safe Links »), et
 * l'élève trouvait son lien « expiré ou déjà utilisé » à chaque fois (cas
 * Juliette, chez Soleya). Désormais la page ne fait RIEN : elle rend un
 * bouton, et c'est l'appui (POST vers ./ouvrir) qui vérifie le jeton.
 *
 * Le studioSlug est dans le PATH (jamais perdu par un `next=`), la cible
 * reste /p/[slug]/espace, comme avant.
 */
export const metadata = { title: 'Ouvrir mon espace', robots: { index: false, follow: false } };
export const dynamic = 'force-dynamic';

const texte = (v) => (typeof v === 'string' ? v : '');

export default async function ConnectePage({ params, searchParams }) {
  const { studioSlug } = await params;
  const sp = await searchParams;
  const token_hash = texte(sp?.token_hash);
  const type = texte(sp?.type);
  const code = texte(sp?.code);

  // Format inattendu → la page de connexion, comme l'ancienne route.
  if (!(token_hash && type) && !code) redirect(`/p/${studioSlug}/connexion`);

  const studio = await fetchStudioPublic(studioSlug);
  const nom = studio?.studio_nom?.trim() || 'ton studio';

  return (
    <OuvrirLien
      action={`/p/${studioSlug}/connecte/ouvrir`}
      champs={{ token_hash, type, code }}
      titre="Ouvrir mon espace"
      texte={`Bonjour ! Appuie sur le bouton pour entrer dans ton espace élève chez ${nom}.`}
      bouton="Ouvrir mon espace"
      note="Pourquoi ce bouton ? Certaines messageries ouvrent les liens avant toi pour les vérifier. Ce geste garantit que c'est bien toi qui entres."
    />
  );
}
