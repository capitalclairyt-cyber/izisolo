'use client';

import Link from 'next/link';
import {
  BookOpen, CalendarDays, Users, Wallet, ClipboardList, Globe,
  LifeBuoy, MessageSquarePlus, ArrowRight
} from 'lucide-react';

/**
 * /aide — Guide de démarrage (2026-08-01, plan « aide utilisateur » validé Colin).
 *
 * 5 parcours pas-à-pas ciblés sur les frictions d'activation MESURÉES
 * (récurrence non adoptée, drop-off à l'ajout d'élèves) et les questions
 * réelles du terrain. Chaque section = une ancre stable (#premier-cours,
 * #eleves, #encaisser, #pointage, #page-publique) — liée depuis la FAQ de
 * /support, la checklist du dashboard et les emails J+1/J+3.
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
    id: 'encaisser',
    icon: Wallet,
    titre: 'Vends tes carnets et abos',
    intro: 'Ton catalogue dans Offres, la vente depuis la fiche élève, le suivi dans Revenus.',
    etapes: [
      <>Page <strong>Offres</strong> → <strong>« Créer une offre »</strong> : carnet de X séances, abonnement mensuel ou trimestriel, séance à l'unité… et « Vaut pour quels cours ? » si l'offre est limitée à certains types.</>,
      <>Pour vendre : <strong>fiche élève</strong> → <strong>« Ajouter une offre »</strong>. Trois modes de règlement : <strong>payé maintenant</strong>, <strong>à régler plus tard</strong>, ou <strong>en plusieurs fois</strong> (échéancier).</>,
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
            Tout ce qu'il faut pour être à l'aise avec IziSolo, pas à pas — 10 minutes, grand maximum.
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
