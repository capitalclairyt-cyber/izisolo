'use client';

import { useState } from 'react';
import Link from 'next/link';
import { CircleHelp, ChevronDown, ChevronUp } from 'lucide-react';
import { useLangue } from '@/components/portail/LangueProvider';

/**
 * AideEleve — mini-aide statique de l'espace élève (2026-08-18, état des
 * lieux aide : « côté élève : rien » était LE trou — chaque question d'élève
 * atterrissait chez la prof, puis chez nous).
 *
 * Même philosophie que /aide côté prof : réponses courtes, chaque libellé
 * vérifié contre l'écran qu'il décrit (« Annuler », « Mes paiements »,
 * « En pause jusqu'au… », « Facture du mois »…). Statique, zéro requête.
 * Sweep 2026-08-23 (règle immuable « le centre d'aide suit chaque modif ») :
 * + lien visio (v86) et + « Les offres du studio » / « Demander » (v97).
 *
 * @param {string} studioNom   nom du studio (les réponses parlent de « ton studio »)
 * @param {string} studioSlug  pour les liens internes (messages)
 */
export default function AideEleve({ studioNom = null, studioSlug, sansCatalogue = false, aDesAdhesions = false, plusieursStudios = false, aUnLienAvis = false }) {
  // La langue du portail (2026-09-22) : questions ET réponses passent par t(),
  // découpées autour des <strong> et des liens.
  const { t } = useLangue();
  const [ouverte, setOuverte] = useState(null);
  const studio = studioNom || t('ton studio');

  const QUESTIONS = [
    {
      q: t('Comment réserver une séance ?'),
      r: <>{t('Depuis la page du studio (bouton « 📅 Voir les prochains cours » en bas), choisis un cours puis')} <strong>{t('« Réserver »')}</strong>. {t("Connecté·e, ta réservation se rattache automatiquement à ta fiche, et certains cours te proposent de réserver la série entière d'un coup.")}</>,
    },
    {
      q: t('Comment annuler ma réservation ?'),
      r: <>{t('Ici même, dans')} <strong>{t('« Mes prochains cours »')}</strong> {t(': bouton')} <strong>{t('« Annuler »')}</strong> {t("sur la séance. Dans le délai d'annulation de {studio}, ta séance est rendue ; passé ce délai, c'est la règle du studio qui s'applique (séance décomptée ou due), elle t'est rappelée avant de confirmer.", { studio })}</>,
    },
    {
      q: t('Où est le lien de mon cours en visio ?'),
      r: <>{t("Sur une séance 🖥 en ligne, le lien s'affiche dans")} <strong>{t('« Mes prochains cours »')}</strong> {t("(et dans l'email de rappel de la veille). Si tu lis « le lien apparaîtra une fois ta séance réglée », c'est que {studio} réserve le lien aux places réglées ou couvertes par un carnet : règle ta place (le bouton CB s'en charge quand il est proposé) et il se débloque tout seul.", { studio })}</>,
    },
    {
      q: t('Comment lire mon carnet ou mon abonnement ?'),
      r: <>{t('Le bloc de tes carnets affiche les')} <strong>{t('séances restantes')}</strong>{t(', la')} <strong>{t('validité')}</strong>{t(", et « ⏸ En pause jusqu'au… » le cas échéant. Bon à savoir : une séance se décompte quand le studio fait l'appel, pas au moment où tu réserves. Annuler à temps ne te coûte donc jamais une séance.")}</>,
    },
    {
      q: t("J'ai un montant « à régler », c'est quoi ?"),
      r: <>{t("C'est ce que tu dois à {studio} : un paiement convenu « à régler plus tard », un versement d'un paiement en plusieurs fois, ou une séance payable à l'unité. Le bouton", { studio })} <strong>{t('« 💡 Comment régler ? »')}</strong> {t("t'affiche les options : le RIB du studio avec ta référence de virement et un QR à scanner avec ton application bancaire (si le studio l'a fourni), ou espèces et chèque sur place. Et quand un bouton")} <strong>{t('« 💳 Payer par CB »')}</strong> {t('accompagne la ligne, tu peux régler en ligne.')}</>,
    },
    // v108 : quand le studio a masqué ses offres dans l'espace (il vend
    // ailleurs), la question changerait de réponse — on la retire plutôt que
    // de décrire une section qui n'existe pas à l'écran.
    ...(sansCatalogue ? [] : [{
      q: t('Comment acheter un carnet ou un abonnement ?'),
      r: <>{t('La section')} <strong>{t('« Les offres du studio »')}</strong> {t('de ton espace liste tout le catalogue. Tu paies en ligne quand le bouton le propose ; sinon,')} <strong>{t('« Demander »')}</strong> {t("prévient {studio} : rien n'est débité, rien n'est réservé, le studio revient vers toi pour valider et convenir du règlement.", { studio })}</>,
    }]),
    {
      q: t('Mon abonnement est prélevé automatiquement, comment ça marche ?'),
      r: <>{t("Quand tu souscris un abonnement « par mois » depuis le portail, c'est")} <strong>Stripe</strong> {t("qui prélève ta carte chaque mois : ton espace affiche « 💳 Prélèvement automatique par carte » sur l'abonnement, chaque prélèvement apparaît dans « Mes paiements » et ton abonnement se prolonge tout seul. Pour changer de carte, faire une pause ou arrêter, passe par l'email que Stripe t'envoie ou demande à {studio} : tu gardes l'accès jusqu'à la fin de la période déjà réglée. Si un prélèvement échoue, tu reçois un email et Stripe réessaie.", { studio })}</>,
    },
    {
      q: t('Comment obtenir un reçu ou une facture ?'),
      r: <>{t('Dans')} <strong>{t('« Mes paiements »')}</strong>{t(', chaque paiement réglé a son bouton de téléchargement. Si {studio} a activé la facturation, tu obtiens une vraie', { studio })} <strong>{t('facture numérotée')}</strong> {t("(acceptée par les CSE, employeurs et mutuelles), et « Facture du mois » regroupe plusieurs paiements en un seul document. Il se peut aussi que {studio} te l'envoie", { studio })} <strong>{t('par email, en pièce jointe')}</strong>{t(", dès qu'un paiement est enregistré : c'est exactement le même document, avec le même numéro.")}</>,
    },
    // Pont 6 (lot 5 Assos & Studios) : l'élève de plusieurs studios a un hub.
    ...(plusieursStudios ? [{
      q: t('Je suis inscrite dans plusieurs studios, où retrouver tout ?'),
      r: <>{t('Ton compte est le même partout (la même adresse email). Chaque studio a son espace, et la page')} <Link href="/mes-studios" style={{ color: '#8a5a44', fontWeight: 600 }}>{t('Mes studios')}</Link> {t('les réunit : tes prochaines séances toutes structures confondues, et une entrée vers chaque espace. Tes carnets, tes paiements et tes messages restent propres à chaque studio.')}</>,
    }] : []),
    // v113 : une association affiche « Mon adhésion » dans l'espace.
    ...(aDesAdhesions ? [{
      q: t("C'est quoi, « Mon adhésion » ?"),
      r: <>{t("{studio} est une association : l'adhésion est ta cotisation de membre pour la", { studio })} <strong>{t('saison')}</strong> {t('(de septembre à août). Le bloc')} <strong>{t('« Mon adhésion »')}</strong> {t("te dit si tu es à jour. Elle ne donne droit à aucune séance : tes cours passent par tes carnets ou abonnements, comme d'habitude. Selon les règles de l'association, une adhésion à jour peut être demandée pour réserver : dans ce cas, prends-la auprès de l'association (elle te remet un reçu de cotisation).")}</>,
    }] : []),
    // v117 : seulement si le studio a posé son lien d'avis (sinon le bloc
    // n'existe pas à l'écran, et on ne décrit jamais un bouton absent).
    ...(aUnLienAvis ? [{
      q: t('Comment laisser un avis sur le studio ?'),
      r: <>{t('En bas de ton espace, le bloc')} <strong>{t('« Un mot sur {studio} ? »', { studio })}</strong> {t('a un bouton')} <strong>{t('« Laisser un avis Google »')}</strong> {t(": il ouvre la fiche Google du studio directement sur « Écrire un avis » (il faut être connecté·e à un compte Google). Tu écris ce que tu penses vraiment, il n'y a rien en échange. Il se peut aussi que {studio} te l'ait proposé une fois par email après quelques séances : c'est le même lien.", { studio })}</>,
    }] : []),
    {
      q: t("Comment installer l'app sur mon téléphone ?"),
      r: <>{t("Ton espace s'installe comme une vraie app, sans App Store. Android + Chrome : menu")} <strong>⋮</strong> {t("→ « Installer l'application ». iPhone : bouton")} <strong>{t('Partager')}</strong> {t("→ « Sur l'écran d'accueil ». Ensuite, ouvre toujours depuis l'icône : tu restes connecté·e, sans redemander de lien par email.")}</>,
    },
    {
      q: t('Comment écrire au studio ?'),
      r: <>{t('Bouton')} <strong>{t('« Messages »')}</strong> {t("en haut de ton espace : tu écris directement à {studio}, et tu es prévenu·e par email quand on te répond.", { studio })} {studioSlug && <Link href={`/p/${studioSlug}/espace/messages`} style={{ color: '#8a5a44', fontWeight: 600 }}>{t('Ouvrir la messagerie →')}</Link>}</>,
    },
  ];

  return (
    <div className="aide-eleve">
      <h2 className="aide-eleve-titre"><CircleHelp size={16} /> {t('Une question ?')}</h2>
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
