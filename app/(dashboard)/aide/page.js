'use client';

import Link from 'next/link';
import {
  BookOpen, CalendarDays, Users, Wallet, ClipboardList, Globe,
  LifeBuoy, MessageSquarePlus, ArrowRight, Package, Inbox,
  MessageSquare, FileText
} from 'lucide-react';

/**
 * /aide — Guide de démarrage (2026-08-01, plan « aide utilisateur » validé Colin).
 *
 * 9 parcours pas-à-pas : les 5 d'origine ciblés sur les frictions d'activation
 * MESURÉES (récurrence non adoptée, drop-off à l'ajout d'élèves), + 4 tutos
 * « vie du studio » ajoutés le 2026-08-17 (demande Colin) : catalogue d'offres,
 * inbox « À traiter », messagerie/sondages, reçus & factures. Chaque section =
 * une ancre stable (#premier-cours, #eleves, #offres, #encaisser, #pointage,
 * #cas-a-traiter, #messagerie, #factures, #page-publique) — liée depuis la FAQ
 * de /support, la checklist du dashboard et les emails J+1/J+3.
 *
 * Règle d'or : chaque étape cite le VRAI libellé d'écran (nav Sidebar,
 * onglets Paramètres vérifiés) — si un écran est renommé, ce guide DOIT
 * suivre. Contenu statique volontairement (zéro requête, zéro API).
 */

const SECTIONS = [
  {
    id: 'premier-cours',
    icon: CalendarDays,
    titre: 'Ton premier cours récurrent',
    intro: 'La base de ton planning : un cours créé une fois, toutes les séances générées d\'un coup.',
    etapes: [
      <>Va dans <strong>Cours &amp; Évènements</strong> → <strong>« Créer un cours »</strong>.</>,
      <>Renseigne le nom, le jour, l'heure, la durée, le lieu et la capacité. Le <strong>type de cours</strong> (Hatha, Vinyasa…) est optionnel mais utile si tes carnets ne valent que pour certains cours.</>,
      <>Choisis la <strong>fréquence</strong> — hebdomadaire, tous les 15 jours, mensuelle — et une <strong>date de fin</strong> (fin de trimestre, fin de saison…). IziSolo génère toutes les séances d'un coup, en tenant compte des vacances si tu le souhaites.</>,
      <>Quand la série se termine : ne recrée rien ! Ouvre l'écran des cours récurrents et clique sur l'icône <strong>📅+</strong> de la série → nouvelle date de fin, et les séances repartent avec les mêmes réglages.</>,
    ],
    astuce: 'Pour un atelier ponctuel ou un stage, crée un cours unique avec un tarif à l\'unité — tes élèves le voient « à X € la séance » sur ton portail, carnet ou pas.',
  },
  {
    id: 'eleves',
    icon: Users,
    titre: 'Fais entrer tes élèves',
    intro: 'Ta liste d\'élèves en quelques minutes, même depuis un autre outil ou un tableur.',
    etapes: [
      <>Page <strong>Élèves</strong> → <strong>« Importer »</strong> : dépose le CSV exporté de ton ancien outil (ou de ton tableur). IziSolo reconnaît les colonnes, te montre un aperçu, et n'écrase jamais une fiche existante.</>,
      <>À la fin de l'import, un écran te propose d'<strong>inviter tout le monde par email</strong> : chaque élève reçoit son lien d'accès personnel.</>,
      <>Au fil de l'eau : bouton <strong>« Inviter »</strong> sur la liste ou depuis une fiche. Et pour les nouvelles têtes, partage ton portail (voir <a href="#page-publique">Ta page publique</a>) — la première réservation crée la fiche toute seule.</>,
      <>Ce que voit un·e élève dans son espace : ses prochaines séances, son carnet (séances restantes, validité), ses paiements, et une messagerie directe avec toi.</>,
    ],
    astuce: 'Deux fiches pour la même personne (deux emails, une faute de frappe) ? La liste Élèves les détecte et te propose de les fusionner sans rien perdre.',
  },
  {
    id: 'offres',
    icon: Package,
    titre: 'Construis ton catalogue d\'offres',
    intro: 'Ce que tu vends — carnets, abonnements — et ce qui n\'a pas besoin d\'offre du tout.',
    etapes: [
      <>Page <strong>Offres</strong> → <strong>« Créer une offre »</strong>. Deux types : <strong>Carnet de séances</strong> (ex : 10 cours pour 120 €) ou <strong>Abonnement</strong> (mensuel, trimestriel, annuel — illimité ou plafonné à X séances par semaine).</>,
      <>Pour un carnet, choisis sa <strong>validité</strong> (3 mois, 6 mois, sans limite…) : passée la date, il expire — et tes règles décident quoi faire d'une réservation qui dépasse.</>,
      <><strong>« Vaut pour quels cours ? »</strong> : par défaut, l'offre couvre tous tes cours. Restreins par type (Hatha, Fitball…) si ton carnet yoga ne doit pas payer tes ateliers.</>,
      <>La <strong>séance à l'unité</strong> (drop-in, atelier, stage) n'a pas besoin d'offre : mets un <strong>tarif à l'unité</strong> directement sur le cours à sa création — tes élèves voient « à X € la séance » sur ton portail, et tu encaisses au pointage.</>,
      <>Tarif à l'unité <em>et</em> carnets sur le même cours ? Coche <strong>« Accepter aussi les carnets/abos compatibles »</strong> : celles dont le carnet couvre ce type décomptent une séance, les autres paient le tarif.</>,
    ],
    astuce: 'Modifier une offre plus tard ne change rien aux carnets déjà vendus : chaque vente fige ses conditions (cours couverts, validité) au moment de l\'achat.',
  },
  {
    id: 'encaisser',
    icon: Wallet,
    titre: 'Vends tes carnets et abos',
    intro: 'La vente en trois clics depuis la fiche élève, le suivi dans Revenus.',
    etapes: [
      <>Ton catalogue est prêt ? (Sinon, remonte d'une section : <a href="#offres">Construis ton catalogue</a>.) Pour vendre : <strong>fiche élève</strong> → <strong>« Ajouter une offre »</strong>.</>,
      <>Trois modes de règlement : <strong>payé maintenant</strong>, <strong>à régler plus tard</strong>, ou <strong>en plusieurs fois</strong> (échéancier).</>,
      <>« À régler plus tard » n'est pas un oubli : le montant apparaît dans <strong>Revenus → « À percevoir »</strong>, encaissable en un clic (espèces, chèque, virement, CB) — sur place ou plus tard.</>,
      <>Avec le plan Complet, ajoute un <strong>lien de paiement Stripe</strong> à tes offres : tes élèves paient en ligne depuis ton portail, tu n'as plus rien à courir.</>,
    ],
    astuce: 'Le carnet se décompte au pointage, pas à la réservation — une élève qui annule à temps ne perd jamais sa séance.',
  },
  {
    id: 'pointage',
    icon: ClipboardList,
    titre: 'Le pointage au quotidien',
    intro: 'Le geste central d\'IziSolo : un clic par élève, et les carnets, absences et paiements suivent tout seuls.',
    etapes: [
      <>Le jour J : depuis l'<strong>Accueil</strong> (bloc « Aujourd'hui ») ou l'<strong>Agenda</strong>, ouvre la séance → <strong>« Pointer »</strong>.</>,
      <>Un clic par élève — présent·e, absent·e, excusé·e. Le carnet se décompte automatiquement (les séances d'essai et offertes, elles, ne décomptent jamais rien).</>,
      <>Quelqu'un débarque sans fiche ? <strong>« Ajouter des élèves »</strong> crée la fiche à la volée, sans quitter le pointage.</>,
      <>Pour corriger : menu <strong>···</strong> sur la ligne → « Décompter sur » le bon carnet, ou « À l'unité » ; tu peux aussi encaisser la séance directement depuis la ligne.</>,
      <>Les absences suivent <strong>tes</strong> règles (Paramètres → Règles) : les cas ambigus remontent dans <strong>« À traiter »</strong> et tu tranches — « Excuser » re-crédite la séance.</>,
    ],
    astuce: 'Réseau capricieux en studio ? Si un pointage ne passe pas, IziSolo te le dit clairement et rien n\'est perdu — réessaie simplement.',
  },
  {
    id: 'cas-a-traiter',
    icon: Inbox,
    titre: 'L\'inbox « À traiter »',
    intro: 'Tout ce qui demande une décision de ta part atterrit au même endroit — tu tranches en un clic, IziSolo fait le reste.',
    etapes: [
      <>Dans la nav, <strong>« À traiter »</strong> (la pastille = le nombre de cas ouverts) : élève sans carnet qui réserve, annulation hors délai, no-show, carnet qui expire avant un cours réservé…</>,
      <>Chaque carte raconte le contexte (qui, quel cours, quand) et l'<strong>action automatique déjà appliquée</strong> selon tes règles — le studio n'attend jamais ton feu vert pour tourner.</>,
      <>Ouvre le cas et choisis l'issue en français clair : <strong>« Excusé »</strong> (la séance est re-créditée, même si elle avait été décomptée), <strong>« Encaissé sur place »</strong>, <strong>« Dette créée »</strong>, « À gérer plus tard »…</>,
      <>Tu t'es trompée ? Onglet <strong>« Historique »</strong> : chaque décision est <strong>annulable pendant 7 jours</strong>, et tout est remis comme avant (carnet compris).</>,
      <>Le comportement automatique se règle dans <strong>Paramètres → Règles</strong> : onglet <strong>« Annulation »</strong> (ton délai, ta politique) et onglet <strong>« Règles métier »</strong> (les 7 situations, chacune avec ses options).</>,
    ],
    astuce: 'Un cas qui revient sans arrêt = un réglage à ajuster. Si tu excuses chaque no-show, passe la règle sur « Crédit reporté gratuitement » : l\'inbox se videra toute seule.',
  },
  {
    id: 'messagerie',
    icon: MessageSquare,
    titre: 'Préviens tes élèves',
    intro: 'Fini les infos éparpillées entre SMS et WhatsApp : tout part d\'IziSolo, et chacune reçoit un email avec le lien pour répondre.',
    etapes: [
      <>Page <strong>Messagerie</strong> : écris à une élève en direct (1-à-1). Elle reçoit un email « {'{ton studio}'} t'a écrit » et répond depuis son espace.</>,
      <>Pour une info collective, bouton <strong>« Annoncer »</strong> : choisis les destinataires — <strong>tous tes élèves</strong>, les <strong>inscrit·es d'un cours</strong>, les <strong>habitué·es d'un type</strong>, les <strong>détenteurs d'une offre</strong>, ou une <strong>sélection libre</strong> — avec aperçu de la liste avant envoi.</>,
      <>Chaque cours a aussi son <strong>canal</strong> : les inscrit·es y sont ajoutées automatiquement — parfait pour « mardi, on est en salle 2 ».</>,
      <>Tu hésites entre deux créneaux ? <strong>Sondage planning</strong> : propose 3 à 8 créneaux, partage le lien à tes élèves, elles cochent ceux où elles viendraient — et tu transformes les gagnants en série en un clic.</>,
    ],
    astuce: 'L\'annonce est l\'outil de la rentrée : « les inscriptions sont ouvertes, réserve tes cours de septembre » + le lien de ton portail, à tout le monde d\'un coup.',
  },
  {
    id: 'factures',
    icon: FileText,
    titre: 'Reçus et factures',
    intro: 'Tes élèves se servent seules : reçu simple par défaut, vraie facture dès que ton SIRET est renseigné.',
    etapes: [
      <>Sans rien configurer : chaque paiement réglé a son <strong>reçu de paiement</strong>, téléchargeable par l'élève depuis son espace — et par toi depuis sa fiche.</>,
      <>Pour des <strong>factures acquittées</strong> (celles qu'exigent CSE, employeurs et mutuelles) : <strong>Paramètres → Profil &amp; studio → Activité</strong>, carte <strong>« Facturation »</strong> — ton nom ou ta raison sociale + ton <strong>SIRET</strong>.</>,
      <>Dès le SIRET renseigné, le même bouton produit une <strong>facture numérotée</strong> (FAC-2026-0001…). Re-téléchargée plus tard : même document, même numéro — l'administration adore.</>,
      <>Plusieurs paiements dans le mois ? <strong>« Facture du mois »</strong> les regroupe en une seule.</>,
      <>Une erreur ? <strong>« Annuler la facture »</strong> depuis la fiche élève : le numéro est brûlé (jamais réutilisé), les paiements redeviennent facturables.</>,
    ],
    astuce: 'La mention TVA proposée par défaut est celle de la franchise en base (art. 293 B du CGI) — modifie-la dans la même carte si ton régime est différent.',
  },
  {
    id: 'page-publique',
    icon: Globe,
    titre: 'Ta page publique',
    intro: 'Ta vitrine izisolo.fr/p/ton-studio : planning, réservation, cours d\'essai — sans site à construire.',
    etapes: [
      <>Ton portail est déjà en ligne : <strong>izisolo.fr/p/ton-studio</strong>. Tes élèves y voient ton planning et réservent en ligne (plan Complet).</>,
      <>Réglages dans <strong>Paramètres → Portail public</strong> : ce qui s'affiche (horaires, tarifs), le cours d'essai (validation manuelle ou automatique), tes couleurs.</>,
      <>Partage-le : tuile <strong>Portail</strong> du tableau de bord → lien à copier, message prérédigé WhatsApp/SMS, et <strong>QR code</strong> à imprimer (carte, flyer, affiche A4).</>,
      <>Tu as un site ? Intègre ton planning directement dessus (un copier-coller) : Paramètres → Portail public → « Ma page ».</>,
      <>Chaque cours a sa <strong>visibilité</strong> : public, réservé aux inscrit·es, aux abonné·es, aux fidèles — ou privé sur invitation.</>,
    ],
    astuce: 'Le cours d\'essai est ta porte d\'entrée : une demande d\'essai crée la fiche, t\'alerte, et l\'élève reçoit la confirmation avec l\'accès à son espace.',
  },
];

export default function AidePage() {
  return (
    <div className="aide-page">
      <div className="aide-header">
        <div className="aide-header-icon"><BookOpen size={22} /></div>
        <div>
          <h1>Guide de démarrage</h1>
          <p className="aide-subtitle">
            Tout ce qu'il faut pour être à l'aise avec IziSolo, pas à pas — chaque tuto se lit en deux minutes.
          </p>
        </div>
      </div>

      {/* Sommaire */}
      <div className="aide-sommaire">
        {SECTIONS.map(s => (
          <a key={s.id} href={`#${s.id}`} className="aide-chip">
            <s.icon size={14} /> {s.titre}
          </a>
        ))}
      </div>

      {/* Sections */}
      {SECTIONS.map(section => (
        <section key={section.id} id={section.id} className="aide-section">
          <div className="aide-section-head">
            <section.icon size={18} />
            <h2>{section.titre}</h2>
          </div>
          <p className="aide-intro">{section.intro}</p>
          <ol className="aide-steps">
            {section.etapes.map((etape, i) => (
              <li key={i}>{etape}</li>
            ))}
          </ol>
          {section.astuce && (
            <div className="aide-astuce">
              <span className="aide-astuce-label">💡 Bon à savoir</span>
              {section.astuce}
            </div>
          )}
        </section>
      ))}

      {/* Pied : où trouver de l'aide */}
      <div className="aide-footer">
        <Link href="/support" className="aide-footer-card">
          <LifeBuoy size={20} />
          <div>
            <div className="aide-footer-title">Une question ?</div>
            <div className="aide-footer-desc">FAQ, ticket, ou un email — on est là.</div>
          </div>
          <ArrowRight size={16} className="aide-footer-arrow" />
        </Link>
        <div className="aide-footer-card static">
          <MessageSquarePlus size={20} />
          <div>
            <div className="aide-footer-title">Un bug, une idée ?</div>
            <div className="aide-footer-desc">
              Le bouton « Donner du feedback » en haut à droite — on lit chaque message.
            </div>
          </div>
        </div>
      </div>

      <style jsx global>{`
        .aide-page { display: flex; flex-direction: column; gap: 20px; padding-bottom: 80px; }

        .aide-header { display: flex; align-items: flex-start; gap: 14px; }
        .aide-header-icon {
          width: 44px; height: 44px; border-radius: 12px; flex-shrink: 0;
          background: var(--brand-light, #f7ecec); color: var(--brand);
          display: flex; align-items: center; justify-content: center;
        }
        .aide-header h1 { font-size: 1.375rem; font-weight: 800; margin: 0 0 4px; }
        .aide-subtitle { color: var(--text-secondary); font-size: 0.9rem; margin: 0; line-height: 1.5; }

        .aide-sommaire { display: flex; flex-wrap: wrap; gap: 8px; }
        .aide-chip {
          display: inline-flex; align-items: center; gap: 6px;
          padding: 7px 13px; border-radius: var(--radius-full);
          font-size: 0.8125rem; font-weight: 600; text-decoration: none;
          background: var(--bg-card); color: var(--text-secondary);
          border: 1px solid var(--border);
          transition: border-color 0.15s, color 0.15s;
        }
        .aide-chip:hover { border-color: var(--brand); color: var(--brand); }

        .aide-section {
          background: var(--bg-card); border: 1px solid var(--border);
          border-radius: var(--radius-md); padding: 20px;
          scroll-margin-top: 16px;
        }
        .aide-section-head {
          display: flex; align-items: center; gap: 10px;
          color: var(--brand); margin-bottom: 6px;
        }
        .aide-section-head h2 { font-size: 1.05rem; font-weight: 700; margin: 0; color: var(--text-primary); }
        .aide-intro { margin: 0 0 14px; font-size: 0.875rem; color: var(--text-secondary); line-height: 1.5; }

        .aide-steps { margin: 0; padding: 0 0 0 2px; list-style: none; counter-reset: aide-step; display: flex; flex-direction: column; gap: 12px; }
        .aide-steps li {
          counter-increment: aide-step;
          position: relative; padding-left: 36px;
          font-size: 0.875rem; line-height: 1.6; color: var(--text-secondary);
        }
        .aide-steps li::before {
          content: counter(aide-step);
          position: absolute; left: 0; top: 1px;
          width: 24px; height: 24px; border-radius: 50%;
          background: var(--brand-light, #f7ecec); color: var(--brand);
          font-size: 0.75rem; font-weight: 700;
          display: flex; align-items: center; justify-content: center;
        }
        .aide-steps li strong { color: var(--text-primary); }
        .aide-steps li a { color: var(--brand); font-weight: 600; }

        .aide-astuce {
          margin-top: 14px; padding: 12px 14px;
          background: var(--bg-soft, #f8f9fa); border-radius: var(--radius-md);
          font-size: 0.8125rem; line-height: 1.55; color: var(--text-secondary);
        }
        .aide-astuce-label { display: block; font-weight: 700; color: var(--text-primary); margin-bottom: 3px; font-size: 0.78rem; }

        .aide-footer { display: grid; grid-template-columns: 1fr; gap: 10px; }
        @media (min-width: 640px) { .aide-footer { grid-template-columns: 1fr 1fr; } }
        .aide-footer-card {
          display: flex; align-items: center; gap: 12px;
          padding: 16px 18px; border-radius: var(--radius-md);
          background: var(--bg-card); border: 1px solid var(--border);
          color: var(--brand); text-decoration: none;
          transition: border-color 0.15s;
        }
        .aide-footer-card:not(.static):hover { border-color: var(--brand); }
        .aide-footer-title { font-weight: 700; font-size: 0.9rem; color: var(--text-primary); }
        .aide-footer-desc { font-size: 0.8125rem; color: var(--text-secondary); line-height: 1.4; }
        .aide-footer-arrow { margin-left: auto; flex-shrink: 0; }
      `}</style>
    </div>
  );
}
