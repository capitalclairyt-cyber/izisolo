import { redirect } from 'next/navigation';
import OuvrirLien from '@/components/auth/OuvrirLien';
import { fetchStudioPublic } from '@/lib/portail-metadata';
import { traducteurPortail } from '@/lib/i18n-portail-serveur';

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
export const dynamic = 'force-dynamic';

// Le titre de l'onglet suit la langue du portail (cookie > studio > français).
export async function generateMetadata({ params }) {
  const { studioSlug } = await params;
  const t = await traducteurPortail(studioSlug);
  return { title: t('Ouvrir mon espace'), robots: { index: false, follow: false } };
}

const texte = (v) => (typeof v === 'string' ? v : '');

export default async function ConnectePage({ params, searchParams }) {
  const { studioSlug } = await params;
  const sp = await searchParams;
  const token_hash = texte(sp?.token_hash);
  const type = texte(sp?.type);
  const code = texte(sp?.code);

  // Format inattendu → la page de connexion, comme l'ancienne route.
  if (!(token_hash && type) && !code) redirect(`/p/${studioSlug}/connexion`);

  // La langue de la visiteuse (2026-09-22) : les libellés passés au composant
  // partagé sont traduits ICI, le composant n'a pas à connaître le studio.
  const t = await traducteurPortail(studioSlug);
  const studio = await fetchStudioPublic(studioSlug);
  const nom = studio?.studio_nom?.trim() || t('ton studio');

  return (
    <OuvrirLien
      action={`/p/${studioSlug}/connecte/ouvrir`}
      champs={{ token_hash, type, code }}
      titre={t('Ouvrir mon espace')}
      texte={t('Bonjour ! Appuie sur le bouton pour entrer dans ton espace élève chez {studio}.', { studio: nom })}
      bouton={t('Ouvrir mon espace')}
      note={t("Pourquoi ce bouton ? Certaines messageries ouvrent les liens avant toi pour les vérifier. Ce geste garantit que c'est bien toi qui entres.")}
    />
  );
}
