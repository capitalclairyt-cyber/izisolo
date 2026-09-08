'use client';

import { useState } from 'react';

/**
 * OuvrirLien — l'écran qui sépare « le lien a été chargé » de « la personne
 * a cliqué ».
 *
 * Pourquoi il existe (2026-09-08, retour Manon/Soleya) : Juliette, sur
 * Hotmail, recevait son lien de connexion et le trouvait TOUJOURS « expiré
 * ou déjà utilisé », y compris après en avoir redemandé un. En base, la
 * connexion avait bien eu lieu 14 secondes après l'envoi, sans qu'elle ait
 * jamais atteint son espace (sa fiche n'a jamais reçu le lien de compte que
 * l'espace pose à la première visite). C'est la messagerie qui ouvre les
 * liens avant elle, pour les vérifier (Outlook/Hotmail « Safe Links », mais
 * aussi certains antivirus et filtres d'entreprise). Un jeton à usage unique
 * consommé par un simple GET est consommé par ce robot.
 *
 * Règle : un lien à usage unique ne fait RIEN au chargement. La page rend un
 * formulaire, et c'est l'appui sur le bouton (un POST) qui vérifie le jeton.
 * Un robot suit les liens, il n'appuie pas sur les boutons. Pas
 * d'auto-envoi par JavaScript non plus : certains scanners exécutent le JS.
 *
 * Composant sans requête ni hook de données : il rend un formulaire natif
 * (marche sans JavaScript), le petit état ne sert qu'à griser le bouton
 * après l'appui, pour ne pas poster deux fois le même jeton.
 */
export default function OuvrirLien({ action, champs = {}, titre, texte, bouton, note }) {
  const [envoye, setEnvoye] = useState(false);
  return (
    <div className="ouvrir-lien">
      <div className="ouvrir-lien-card">
        <div className="ouvrir-lien-icone" aria-hidden="true">🔑</div>
        <h1 className="ouvrir-lien-titre">{titre}</h1>
        {texte && <p className="ouvrir-lien-texte">{texte}</p>}
        <form method="post" action={action} onSubmit={() => setEnvoye(true)}>
          {Object.entries(champs).filter(([, v]) => v).map(([k, v]) => (
            <input key={k} type="hidden" name={k} value={v} />
          ))}
          <button type="submit" className="ouvrir-lien-btn" disabled={envoye}>
            {envoye ? 'Un instant…' : bouton}
          </button>
        </form>
        {note && <p className="ouvrir-lien-note">{note}</p>}
      </div>
      <style jsx>{`
        .ouvrir-lien { display: flex; justify-content: center; padding: 24px 0; }
        .ouvrir-lien-card {
          width: 100%; max-width: 420px; background: #fff; border-radius: 16px;
          box-shadow: 0 2px 12px rgba(0,0,0,0.06); padding: 36px 28px; text-align: center;
        }
        .ouvrir-lien-icone { font-size: 2rem; margin-bottom: 8px; }
        .ouvrir-lien-titre { font-size: 1.25rem; font-weight: 800; color: #1a1a2e; margin: 0 0 8px; }
        .ouvrir-lien-texte { color: #666; font-size: 0.9375rem; line-height: 1.55; margin: 0 0 22px; }
        .ouvrir-lien-btn {
          display: inline-flex; align-items: center; justify-content: center; gap: 8px;
          width: 100%; padding: 14px 20px; border: 0; border-radius: 99px; cursor: pointer;
          background: #b87333; color: #fff; font-weight: 700; font-size: 1rem; font-family: inherit;
        }
        .ouvrir-lien-btn:disabled { opacity: 0.7; cursor: default; }
        .ouvrir-lien-note { color: #999; font-size: 0.8125rem; line-height: 1.5; margin: 18px 0 0; }
      `}</style>
    </div>
  );
}
