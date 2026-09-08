import { redirect } from 'next/navigation';
import OuvrirLien from '@/components/auth/OuvrirLien';

/**
 * GET /auth/ouvrir — l'atterrissage des liens PROF à jeton (token_hash).
 *
 * Même parade que /p/[slug]/connecte côté élève (2026-09-08) : un lien de
 * confirmation d'inscription, de connexion sans mot de passe ou de nouveau
 * mot de passe ne doit rien consommer au chargement, sinon le robot de la
 * messagerie (Outlook/Hotmail, antivirus) l'use avant la prof. La page rend
 * un bouton, et c'est l'appui (POST /auth/callback) qui vérifie le jeton.
 *
 * `/auth/callback` en GET redirige ici dès qu'il voit un token_hash. Le
 * `next` est repassé tel quel, il est re-validé par safeNext côté callback.
 */
export const metadata = { title: 'Continuer', robots: { index: false, follow: false } };
export const dynamic = 'force-dynamic';

const LIBELLES = {
  recovery: {
    titre: 'Choisir mon nouveau mot de passe',
    texte: 'Appuie sur le bouton pour continuer : tu choisiras ton nouveau mot de passe juste après.',
    bouton: 'Continuer',
  },
  signup: {
    titre: 'Confirmer mon adresse email',
    texte: 'Appuie sur le bouton pour confirmer ton adresse et entrer dans ton studio.',
    bouton: 'Confirmer et entrer',
  },
  invite: {
    titre: 'Accepter l\'invitation',
    texte: 'Appuie sur le bouton pour accepter l\'invitation et entrer.',
    bouton: 'Accepter et entrer',
  },
  defaut: {
    titre: 'Me connecter',
    texte: 'Appuie sur le bouton pour te connecter à IziSolo.',
    bouton: 'Me connecter',
  },
};

const texte = (v) => (typeof v === 'string' ? v : '');

export default async function OuvrirPage({ searchParams }) {
  const sp = await searchParams;
  const token_hash = texte(sp?.token_hash);
  const type = texte(sp?.type);
  const next = texte(sp?.next);
  if (!token_hash || !type) redirect('/login?error=auth_callback');

  const l = LIBELLES[type] || LIBELLES.defaut;
  return (
    <div className="ouvrir-page">
      <OuvrirLien
        action="/auth/callback"
        champs={{ token_hash, type, next }}
        titre={l.titre}
        texte={l.texte}
        bouton={l.bouton}
        note="Pourquoi ce bouton ? Certaines messageries ouvrent les liens avant toi pour les vérifier. Ce geste garantit que c'est bien toi qui continues."
      />
    </div>
  );
}
