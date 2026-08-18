'use client';

import { useState } from 'react';
import Link from 'next/link';
import { CircleHelp, ChevronDown, ChevronUp } from 'lucide-react';

/**
 * AideEleve — mini-aide statique de l'espace élève (2026-08-18, état des
 * lieux aide : « côté élève : rien » était LE trou — chaque question d'élève
 * atterrissait chez la prof, puis chez nous).
 *
 * Même philosophie que /aide côté prof : réponses courtes, chaque libellé
 * vérifié contre l'écran qu'il décrit (« Annuler », « Mes paiements »,
 * « En pause jusqu'au… », « Facture du mois »…). Statique, zéro requête.
 *
 * @param {string} studioNom   nom du studio (les réponses parlent de « ton studio »)
 * @param {string} studioSlug  pour les liens internes (messages)
 */
export default function AideEleve({ studioNom = 'ton studio', studioSlug }) {
  const [ouverte, setOuverte] = useState(null);

  const QUESTIONS = [
    {
      q: 'Comment réserver une séance ?',
      r: <>Depuis la page du studio (bouton « 📅 Voir les prochains cours » en bas), choisis un cours puis <strong>« Réserver »</strong>. Connecté·e, ta réservation se rattache automatiquement à ta fiche — et certains cours te proposent de réserver la série entière d'un coup.</>,
    },
    {
      q: 'Comment annuler ma réservation ?',
      r: <>Ici même, dans <strong>« Mes prochains cours »</strong> : bouton <strong>« Annuler »</strong> sur la séance. Dans le délai d'annulation de {studioNom}, ta séance est rendue ; passé ce délai, c'est la règle du studio qui s'applique (séance décomptée ou due) — elle t'est rappelée avant de confirmer.</>,
    },
    {
      q: 'Comment lire mon carnet ou mon abonnement ?',
      r: <>Le bloc de tes carnets affiche les <strong>séances restantes</strong>, la <strong>validité</strong>, et « ⏸ En pause jusqu'au… » le cas échéant. Bon à savoir : une séance se décompte quand le studio fait l'appel — pas au moment où tu réserves. Annuler à temps ne te coûte donc jamais une séance.</>,
    },
    {
      q: 'J\'ai un montant « à régler » — c\'est quoi ?',
      r: <>C'est ce que tu dois à {studioNom} : un paiement convenu « à régler plus tard », un versement d'un paiement en plusieurs fois, ou une séance payable à l'unité. Tu règles directement auprès du studio (espèces, chèque, virement, CB) — ou en ligne si la section « Acheter en ligne » est proposée.</>,
    },
    {
      q: 'Comment obtenir un reçu ou une facture ?',
      r: <>Dans <strong>« Mes paiements »</strong>, chaque paiement réglé a son bouton de téléchargement. Si {studioNom} a activé la facturation, tu obtiens une vraie <strong>facture numérotée</strong> (acceptée par les CSE, employeurs et mutuelles) — et « Facture du mois » regroupe plusieurs paiements en un seul document.</>,
    },
    {
      q: 'Comment installer l\'app sur mon téléphone ?',
      r: <>Ton espace s'installe comme une vraie app, sans App Store. Android + Chrome : menu <strong>⋮</strong> → « Installer l'application ». iPhone : bouton <strong>Partager</strong> → « Sur l'écran d'accueil ». Ensuite, ouvre toujours depuis l'icône : tu restes connecté·e, sans redemander de lien par email.</>,
    },
    {
      q: 'Comment écrire au studio ?',
      r: <>Bouton <strong>« Messages »</strong> en haut de ton espace : tu écris directement à {studioNom}, et tu es prévenu·e par email quand on te répond. {studioSlug && <Link href={`/p/${studioSlug}/espace/messages`} style={{ color: '#8a5a44', fontWeight: 600 }}>Ouvrir la messagerie →</Link>}</>,
    },
  ];

  return (
    <div className="aide-eleve">
      <h2 className="aide-eleve-titre"><CircleHelp size={16} /> Une question ?</h2>
      <div className="aide-eleve-liste">
        {QUESTIONS.map((item, i) => (
          <div key={i} className={`aide-eleve-item ${ouverte === i ? 'open' : ''}`}>
            <button type="button" className="aide-eleve-q" onClick={() => setOuverte(ouverte === i ? null : i)}>
              <span>{item.q}</span>
              {ouverte === i ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
            </button>
            {ouverte === i && <div className="aide-eleve-r">{item.r}</div>}
          </div>
        ))}
      </div>

      <style jsx>{`
        .aide-eleve { margin-top: 28px; padding-top: 20px; border-top: 1px solid #f0ebe8; }
        .aide-eleve-titre {
          display: flex; align-items: center; gap: 7px;
          font-size: 0.9375rem; font-weight: 700; color: #1a1a2e; margin: 0 0 10px;
        }
        .aide-eleve-liste { display: flex; flex-direction: column; gap: 6px; }
        .aide-eleve-item { background: white; border: 1px solid #eee5d8; border-radius: 10px; overflow: hidden; }
        .aide-eleve-item.open { border-color: #d4a574; }
        .aide-eleve-q {
          display: flex; align-items: center; justify-content: space-between; gap: 8px;
          width: 100%; padding: 11px 14px; background: none; border: none; cursor: pointer;
          font-family: inherit; font-size: 0.855rem; font-weight: 600; color: #1a1a2e; text-align: left;
        }
        .aide-eleve-r {
          padding: 0 14px 12px; font-size: 0.8125rem; line-height: 1.55; color: #666;
        }
      `}</style>
    </div>
  );
}
