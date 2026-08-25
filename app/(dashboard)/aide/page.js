'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import {
  BookOpen, CalendarDays, Users, Wallet, ClipboardList, Globe,
  LifeBuoy, MessageSquarePlus, ArrowRight, ArrowLeft, Package, Inbox,
  MessageSquare, FileText, Smartphone, CalendarClock, Hourglass, Search, X,
  Sparkles, ListOrdered, Landmark, Palette, UserCog
} from 'lucide-react';
import { FAQ_SUPPORT } from '@/content/faq-support';

/**
 * /aide — Guide de démarrage (2026-08-01, plan « aide utilisateur » validé Colin).
 *
 * 16 parcours pas-à-pas. Historique : 5 d'origine (frictions d'activation
 * MESURÉES — récurrence non adoptée, drop-off à l'ajout d'élèves), + 4 « vie
 * du studio » le 2026-08-17 (offres, À traiter, messagerie, factures),
 * + #installer, #agenda, #regles-annulation et l'échéancier détaillé le
 * 2026-08-18 (appel Patricia + feedbacks 9-10/08), + #carnets-abos,
 * #cours-essai, #liste-attente le 2026-08-18 (état des lieux aide : la
 * gestion APRÈS la vente et la machine à prospects n'étaient pas documentées),
 * + #urssaf le 2026-08-22 (v93/v94), + le SWEEP du 2026-08-23 (règle immuable
 * Colin, cf. CLAUDE.md §2) : cours en visio v86 + déblocage CB, porte
 * « Pointer quand même », retrait/portée d'inscription au pointage, abo
 * « À partir de la vente » + cadence des séances, demandes d'offre v97,
 * « Plusieurs moyens », échéancier « Payé » par versement, « J'ai déclaré »
 * v94, « Ne pas faire apparaître dans ma compta » v95, tarif d'essai par
 * type v92, « Jour de la semaine », fil « 💬 Équipe IziSolo ».
 * Ancres stables : #premier-cours, #agenda, #eleves, #offres, #encaisser,
 * #carnets-abos, #pointage, #cas-a-traiter, #regles-annulation, #messagerie,
 * #factures, #urssaf, #page-publique, #cours-essai, #liste-attente,
 * #installer — liées depuis la FAQ de /support, la checklist du dashboard,
 * les emails J+1/J+3, la bannière d'installation et les « ? » contextuels
 * des pages (components/AideContextuelle).
 *
 * Règle d'or : chaque étape cite le VRAI libellé d'écran (vérifié contre le
 * composant qui le rend) — si un écran est renommé, ce guide DOIT suivre,
 * dans le MÊME lot que la modif (règle immuable 2026-08-23). Contenu
 * statique volontairement (zéro requête, zéro API).
 *
 * Illustrations (2026-08-24, demande Colin) : une capture RÉELLE par tuto,
 * prises sur le compte démo Atelier Soleil fraîchement refreshé, contre la
 * prod — `node scripts/shoot-aide-illustrations.mjs` → public/icons/aide/
 * (re-runnable ; FAB feedback masqué à la capture). À REFAIRE quand l'UI
 * d'un écran illustré change (même discipline que les captures landing).
 */

const SECTIONS = [
  {
    id: 'premier-cours',
    icon: CalendarDays,
    capture: { src: '/icons/aide/premier-cours.png', w: 2320, h: 1520 },
    titre: 'Ton premier cours récurrent',
    intro: 'La base de ton planning : un cours créé une fois, toutes les séances générées d\'un coup.',
    etapes: [
      <>Va dans <strong>Cours &amp; Évènements</strong> → <strong>« Créer un cours »</strong>.</>,
      <>Renseigne le nom, l'heure, la durée, le lieu et la capacité. Le <strong>type de cours</strong> (Hatha, Vinyasa…) est optionnel mais utile si tes carnets ne valent que pour certains cours.</>,
      <>Un cours en visio ? <strong>« Où se passe ce cours ? »</strong> → <strong>« 🖥 En ligne »</strong> : colle ton lien Zoom ou Meet à la place du lieu. La case <strong>« Réserver le lien aux séances réglées ou couvertes »</strong> fait le tri à ta place : le lien n'apparaît dans l'espace d'une élève (et dans le rappel de la veille) que si sa séance est couverte par un carnet, réglée (un paiement CB le débloque tout seul) ou offerte/essai.</>,
      <>Choisis la <strong>fréquence</strong> (hebdomadaire, tous les 15 jours, mensuelle) et coche le jour dans <strong>« Quel jour ? »</strong> : l'aperçu te dit la règle en toutes lettres, « Tous les mercredis, à partir du 26 août ». Pose enfin une <strong>date de fin</strong> (fin de trimestre, fin de saison…) : IziSolo génère toutes les séances d'un coup, en tenant compte des vacances si tu le souhaites.</>,
      <>Série trop courte, trop longue, ou l'été à ajouter ? Ne recrée rien ! Ouvre l'écran des cours récurrents et clique sur l'icône <strong>📅+</strong> de la série (le lien <strong>« Changer le nombre de séances »</strong> de la fiche du cours y mène aussi) → nouvelle date de fin dans les deux sens : plus loin = les séances se créent (mêmes réglages), plus proche = les séances vides se suppriment (jamais une séance avec des inscrites), et la case « pendant les vacances » comble les trous de l'été.</>,
    ],
    astuce: 'Pour un atelier ponctuel ou un stage, crée un cours unique avec un tarif à l\'unité — tes élèves le voient « à X € la séance » sur ton portail, carnet ou pas.',
  },
  {
    id: 'agenda',
    icon: CalendarClock,
    capture: { src: '/icons/aide/agenda.png', w: 2320, h: 1520 },
    titre: 'Modifier, déplacer, annuler une séance',
    intro: 'La vie réelle bouge — ton planning suit, sans jamais casser le reste de la série.',
    etapes: [
      <>Depuis l'<strong>Agenda</strong> (ou Cours &amp; Évènements), ouvre la séance concernée. L'icône <strong>crayon</strong> modifie <strong>cette séance seulement</strong> — changer l'heure du mardi 12 ne touche pas les autres mardis.</>,
      <>Pour changer l'horaire, le lieu ou le nom de <strong>toutes</strong> les séances à venir : bouton <strong>« Modifier toute la série »</strong> sur la page de la séance.</>,
      <>Le cours change de <strong>jour</strong> à la rentrée ? Toujours dans « Modifier toute la série », le bloc <strong>« Jour de la semaine »</strong> décale chaque séance à venir sur le nouveau jour : inscriptions, paiements et historique suivent, et l'aperçu t'annonce tout avant de confirmer.</>,
      <><strong>« Annuler cette séance »</strong> : les inscrit·es sont prévenu·es par email et les crédits restitués selon ta règle « Cours annulé ». La séance <strong>reste visible, barrée</strong>, sur ton agenda — c'est voulu : c'est ce qui informe tes élèves du changement.</>,
      <>Tu veux la faire disparaître complètement ? Après l'annulation, la <strong>corbeille</strong> la supprime. Attention : l'annulation est définitive, une séance annulée ne se ré-active pas — au besoin, recrée-la.</>,
      <>Une place se libère grâce à une annulation d'élève ? La <strong>liste d'attente</strong> est promue automatiquement (ou manuellement si tu as choisi ce mode dans tes règles).</>,
    ],
    astuce: 'Les vacances scolaires se gèrent à la création de la série (« exclure les vacances », zone A/B/C) — pas besoin d\'annuler l\'été à la main.',
  },
  {
    id: 'eleves',
    icon: Users,
    capture: { src: '/icons/aide/eleves.png', w: 2320, h: 1520 },
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
    capture: { src: '/icons/aide/offres.png', w: 2320, h: 1520 },
    titre: 'Construis ton catalogue d\'offres',
    intro: 'Ce que tu vends — carnets, abonnements — et ce qui n\'a pas besoin d\'offre du tout.',
    etapes: [
      <>Page <strong>Offres</strong> → <strong>« Créer une offre »</strong>. Deux types : <strong>Carnet de séances</strong> (ex : 10 cours pour 120 €) ou <strong>Abonnement</strong>, à <strong>« Dates fixes »</strong> pour une saison (sept.–juin) ou <strong>« À partir de la vente »</strong> (1 mois, 3 mois, 1 an) : chaque vente démarre alors à sa propre date, et ton abo mensuel se crée une seule fois.</>,
      <>Pour un abonnement, dis ce que l'élève pourra faire : <strong>« Autant qu'elle veut »</strong> (aucune limite), un nombre de fois <strong>par semaine</strong>, ou un <strong>nombre de séances</strong> au total. La cadence choisie s'affiche ensuite partout : ta page Offres, ta grille publique et l'espace de l'élève.</>,
      <>Pour un carnet, choisis sa <strong>validité</strong> (3 mois, 6 mois, sans limite…) : passée la date, il expire — et tes règles décident quoi faire d'une réservation qui dépasse.</>,
      <><strong>« Vaut pour quels cours ? »</strong> : par défaut, l'offre couvre tous tes cours. Restreins par type (Hatha, Fitball…) si ton carnet yoga ne doit pas payer tes ateliers. Le bloc <strong>« 🎟️ Payable avec »</strong> de la fiche de chaque cours te montre à tout moment qui le couvre, et ses cases se corrigent sur place.</>,
      <>La <strong>séance à l'unité</strong> (drop-in, atelier, stage) n'a pas besoin d'offre : mets un <strong>tarif à l'unité</strong> directement sur le cours à sa création — tes élèves voient « à X € la séance » sur ton portail, et tu encaisses au pointage.</>,
      <>Tarif à l'unité <em>et</em> carnets sur le même cours ? Coche <strong>« Accepter aussi les carnets/abos compatibles »</strong> : celles dont le carnet couvre ce type décomptent une séance, les autres paient le tarif.</>,
      <>Tes élèves voient <strong>tout ton catalogue</strong> dans leur espace, et ta page publique l'affiche aussi si tu actives ta grille (bannière <strong>« Afficher ma grille sur mon portail »</strong>). Sans paiement en ligne, une élève peut <strong>« Demander »</strong> une offre : la demande atterrit en tête de ta page Offres <em>et</em> sur la <strong>fiche de l'élève</strong> (bandeau « 🛒 Demande d'offre à traiter »), et le bouton <strong>« Voir la demande »</strong> de ta cloche t'y amène. <strong>« Attribuer l'offre »</strong> ouvre la vente directement sur le règlement, « Écarter » la retire, et une vente faite depuis la fiche solde la demande toute seule. Rien n'est encaissé ni réservé tant que tu n'as pas fait la vente.</>,
    ],
    astuce: 'Modifier une offre plus tard ne change rien aux carnets déjà vendus : chaque vente fige ses conditions (cours couverts, validité) au moment de l\'achat.',
  },
  {
    id: 'encaisser',
    icon: Wallet,
    capture: { src: '/icons/aide/encaisser.png', w: 1040, h: 1368 },
    titre: 'Vends tes carnets et abos',
    intro: 'La vente en trois clics depuis la fiche élève, le suivi dans Revenus.',
    etapes: [
      <>Ton catalogue est prêt ? (Sinon, remonte d'une section : <a href="#offres">Construis ton catalogue</a>.) Pour vendre : <strong>fiche élève</strong> → <strong>« Ajouter une offre »</strong>.</>,
      <>Choisis le règlement : <strong>payé maintenant</strong>, <strong>à régler plus tard</strong>, <strong>en plusieurs fois</strong>, ou <strong>« Plusieurs moyens »</strong> quand l'élève panache le même jour (80 € en espèces + 43 € en CB) : chaque moyen fait sa propre ligne dans ta compta, et le total doit tomber juste. Le mode de règlement se déclare à chaque fois : IziSolo ne présélectionne jamais comment l'argent est arrivé.</>,
      <><strong>« En plusieurs fois »</strong> ouvre l'échéancier : choisis <strong>2× à 10×</strong> et le rythme. Chaque versement se règle ligne par ligne : sa <strong>date</strong>, son <strong>montant</strong>, la case <strong>« Payé »</strong> s'il est déjà encaissé, avec <strong>son propre mode de règlement</strong> (le premier en espèces, le suivant en CB : ça marche). Et <strong>« Arrondir aux euros »</strong> supprime les centimes (ex : 425 € en 3× → 141 + 142 + 142).</>,
      <>« À régler plus tard » et les versements à venir ne sont pas des oublis : ils t'attendent dans <strong>Revenus → « À percevoir »</strong>, encaissables en un clic (espèces, chèque, virement, CB) — chacun à sa date.</>,
      <>Et l'élève sait quoi faire : à la vente, choisis l'email <strong>« comment régler »</strong> qui part tout seul : <strong>« Virement (RIB) »</strong> (ton IBAN + une référence de virement pour reconnaître son règlement sur ton relevé), « Espèces au studio » ou « Chèque au studio ». Ton RIB et le réglage (« part tout seul », « je choisis à chaque vente », « jamais ») vivent dans <strong>Paramètres → Profil &amp; studio → Activité</strong>, carte <strong>« Règlement par virement »</strong> — et le bouton « Comment régler ? » de son espace affiche le RIB, la référence et un <strong>QR code</strong> à scanner avec son application bancaire.</>,
      <>Avec le plan Complet, ajoute un <strong>lien de paiement Stripe</strong> à tes offres : tes élèves paient en ligne depuis ton portail, tu n'as plus rien à courir.</>,
    ],
    astuce: 'Le carnet se décompte au pointage, pas à la réservation — une élève qui annule à temps ne perd jamais sa séance.',
  },
  {
    id: 'carnets-abos',
    icon: BookOpen,
    capture: { src: '/icons/aide/carnets-abos.png', w: 2320, h: 1520 },
    titre: 'Les carnets au quotidien',
    intro: 'Après la vente : suivre, mettre en pause, corriger — sur la fiche de l\'élève et dans « Carnets & abos ».',
    etapes: [
      <>La page <strong>Carnets &amp; abos</strong> = ta vue d'ensemble : statuts <strong>Actif / En pause / Épuisé / Expiré / Annulé</strong>, filtres, et le bouton « Vendre une offre ».</>,
      <>Élève absente un moment (blessure, déplacement) ? <strong>Fiche élève</strong> → carte du carnet → <strong>« Mettre en pause »</strong> (⏸) avec dates de début et de fin : pendant la pause, <strong>aucune séance n'est décomptée</strong>, et son espace affiche « ⏸ En pause jusqu'au… ». <strong>« Réactiver »</strong> (▶) pour reprendre avant la date.</>,
      <>Corriger un compteur, prolonger une validité, changer un statut : bouton <strong>« Modifier »</strong> (crayon) sur la carte du carnet — séances totales, séances utilisées, dates, statut.</>,
      <>Carnet <strong>épuisé ou expiré</strong> : il sort de la résolution automatique au pointage, et ta règle « Carnet expire avant la date du cours réservé » décide du sort des réservations (bloquer, prolonger, autoriser en avertissant).</>,
      <>Le décompte, lui, vit au <a href="#pointage">pointage</a> : « sur carnet · 10 → 9 », corrigeable à tout moment via <strong>···</strong> → « Décompter sur ».</>,
    ],
    astuce: 'Supprimer un carnet est définitif — pour un litige ou un remboursement, préfère « Modifier » avec le statut Annulé : le compteur s\'arrête, l\'historique reste.',
  },
  {
    id: 'pointage',
    icon: ClipboardList,
    capture: { src: '/icons/aide/pointage.png', w: 2320, h: 1520 },
    titre: 'Le pointage au quotidien',
    intro: 'Le geste central d\'IziSolo : un clic par élève, et les carnets, absences et paiements suivent tout seuls.',
    etapes: [
      <>Le jour J : depuis l'<strong>Accueil</strong> (bloc « Aujourd'hui ») ou l'<strong>Agenda</strong>, ouvre la séance → <strong>« Pointer »</strong>. Elle s'ouvre au pointage 15 minutes avant l'heure ; pour pointer plus tôt (une absence annoncée à l'avance, par exemple), le bandeau propose <strong>« Pointer quand même »</strong> : les carnets se décomptent alors immédiatement, et corriger reste possible.</>,
      <>Un clic par élève — présent·e, absent·e, excusé·e. Le carnet se décompte automatiquement (les séances d'essai et offertes, elles, ne décomptent jamais rien).</>,
      <>Quelqu'un débarque sans fiche ? <strong>« Ajouter des élèves »</strong> crée la fiche à la volée, sans quitter le pointage. Et si le cours fait partie d'une série, <strong>« Inscrire sur : »</strong> te laisse choisir la portée : <strong>« Cette séance »</strong>, « Les N prochaines » ou <strong>« Toute la série »</strong>, avec un aperçu qui dit combien d'inscriptions ça crée.</>,
      <>Pour corriger : menu <strong>···</strong> sur la ligne → « Décompter sur » le bon carnet, « À l'unité », ou <strong>« 🗑 Retirer de la séance »</strong> : l'inscription s'en va, et la séance est rendue au carnet si elle avait été décomptée (jamais si un encaissement y est lié). Tu peux aussi encaisser la séance directement depuis la ligne.</>,
      <>Les absences suivent <strong>tes</strong> règles (Paramètres → Règles) : les cas ambigus remontent dans <strong>« À traiter »</strong> et tu tranches — « Excuser » re-crédite la séance.</>,
      <>Tu te fais remplacer ? Sur la fiche de la séance, <strong>« Confier le pointage »</strong> fabrique un lien à envoyer : la personne pointe depuis son téléphone, <strong>sans compte</strong>, et ne voit que les prénoms et les noms (ni coordonnées, ni carnets, ni montants). Tu choisis jusqu'à quand il est valable, tu peux le désactiver à tout moment, et tu es prévenue dès qu'il sert. Elle ne peut ni ajouter ni retirer quelqu'un : elle te laisse un mot, que tu retrouves au même endroit.</>,
    ],
    astuce: 'Réseau capricieux en studio ? Si un pointage ne passe pas, IziSolo te le dit clairement et rien n\'est perdu — réessaie simplement.',
  },
  {
    id: 'cas-a-traiter',
    icon: Inbox,
    capture: { src: '/icons/aide/cas-a-traiter.png', w: 2320, h: 1520 },
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
    id: 'regles-annulation',
    icon: Hourglass,
    capture: { src: '/icons/aide/regles-annulation.png', w: 2320, h: 1520 },
    titre: 'Ton délai d\'annulation, côté élève',
    intro: 'Une seule règle à poser — l\'app l\'affiche, l\'applique et t\'évite les conversations pénibles.',
    etapes: [
      <><strong>Paramètres → Règles → « Annulation »</strong> : choisis ton <strong>délai libre d'annulation</strong> (6 h, 12 h, 24 h — recommandé —, 48 h, 72 h) et, si tu veux, un message personnalisé.</>,
      <>Ce que vit l'élève : la règle est <strong>affichée au moment d'annuler</strong> depuis son espace. Dans le délai → annulation libre, séance rendue. Hors délai → c'est ta politique qui s'applique.</>,
      <>La politique hors délai se règle dans <strong>« Règles métier »</strong> (cas « Annulation hors délai ») : <strong>décompter la séance</strong> (stricte), <strong>excuser quand même</strong> (souple), ou décompter/créer une dette. Les cas ambigus remontent dans <a href="#cas-a-traiter">« À traiter »</a> pour ta décision au cas par cas.</>,
      <>L'email envoyé à l'élève est <strong>honnête</strong> : « séance décomptée », « séance rendue » ou « ton carnet ne couvre pas ce type de cours » — jamais de formule vague.</>,
      <>Une annulation libère une place → la <strong>liste d'attente</strong> est prévenue et promue selon ton mode (auto ou manuel).</>,
    ],
    astuce: 'Commence souple (24 h + « excuser »), durcis si les annulations tardives se multiplient — tu peux changer la règle à tout moment, elle ne s\'applique qu\'aux annulations suivantes.',
  },
  {
    id: 'messagerie',
    icon: MessageSquare,
    capture: { src: '/icons/aide/messagerie.png', w: 2320, h: 1520 },
    titre: 'Préviens tes élèves',
    intro: 'Fini les infos éparpillées entre SMS et WhatsApp : tout part d\'IziSolo, et chacune reçoit un email avec le lien pour répondre.',
    etapes: [
      <>Page <strong>Messagerie</strong> : écris à une élève en direct (1-à-1). Elle reçoit un email « {'{ton studio}'} t'a écrit » et répond depuis son espace.</>,
      <>Pour une info collective, bouton <strong>« Annoncer »</strong> : choisis les destinataires — <strong>tous tes élèves</strong>, les <strong>inscrit·es d'un cours</strong>, les <strong>habitué·es d'un type</strong>, les <strong>détenteurs d'une offre</strong>, ou une <strong>sélection libre</strong> — avec aperçu de la liste avant envoi.</>,
      <>Chaque cours a aussi son <strong>canal</strong> : les inscrit·es y sont ajoutées automatiquement — parfait pour « mardi, on est en salle 2 ».</>,
      <>Tu hésites entre deux créneaux ? <strong>Sondage planning</strong> : propose 3 à 8 créneaux, partage le lien à tes élèves, elles cochent ceux où elles viendraient — et tu transformes les gagnants en série en un clic.</>,
      <>Et pour nous écrire, à nous : le fil <strong>« 💬 Équipe IziSolo »</strong> est épinglé en tête de ta messagerie. Ta question arrive directement chez l'équipe, et la réponse revient dans le même fil (tu es aussi prévenue par email).</>,
    ],
    astuce: 'L\'annonce est l\'outil de la rentrée : « les inscriptions sont ouvertes, réserve tes cours de septembre » + le lien de ton portail, à tout le monde d\'un coup.',
  },
  {
    id: 'factures',
    icon: FileText,
    capture: { src: '/icons/aide/factures.png', w: 1728, h: 1210 },
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
    id: 'urssaf',
    icon: Landmark,
    capture: { src: '/icons/aide/urssaf.png', w: 2320, h: 1520 },
    titre: 'Ta déclaration URSSAF',
    intro: 'Le montant à recopier, sa date limite, et le registre que tu dois tenir. Sans ressortir la calculette. Ce tuto ne concerne que la France : ailleurs (Belgique, Luxembourg), ce sont tes caisses qui appellent tes cotisations, et le bloc reste masqué.',
    etapes: [
      <>Une fois : <strong>Paramètres → Profil &amp; studio → Activité</strong>, carte <strong>« Ma déclaration URSSAF »</strong> — ton régime, si tu déclares au mois ou au trimestre, et tes taux (recopie-les depuis ton compte autoentrepreneur.urssaf.fr, ils changent d&apos;une année à l&apos;autre).</>,
      <>Ensuite, sur <strong>Revenus</strong>, le bloc <strong>« Ma déclaration URSSAF »</strong> affiche le montant encaissé de la période close, arrondi à l&apos;euro comme le formulaire l&apos;attend. Bouton <strong>Copier</strong>, tu colles, c&apos;est fait.</>,
      <>IziSolo compte à la <strong>date d&apos;encaissement</strong>, pas à la date de vente : un chèque encaissé le 3 octobre compte en octobre, même si tu l&apos;as vendu fin septembre. C&apos;est la règle de la micro-entreprise.</>,
      <>Le montant à déclarer est ce que <strong>l&apos;élève a payé</strong>, pas ce qui arrive sur ton compte après les frais bancaires. En micro, les frais ne se déduisent pas.</>,
      <><strong>« Voir le détail à l&apos;écran »</strong> ouvre ta déclaration complète : ventilations par mois et par mode, détail ligne à ligne, impression. Le bouton <strong>« J&apos;ai déclaré ces X € »</strong> y archive le montant du moment : si une correction ultérieure fait bouger une période déjà déclarée, IziSolo t&apos;affiche l&apos;écart. Et « Voir le détail et les documents » déplie l&apos;estimation de tes cotisations, l&apos;historique de tes déclarations et le <strong>livre des recettes</strong> en PDF : le registre chronologique obligatoire, celui qu&apos;on te réclame en cas de contrôle.</>,
      <>Pour ton comptable, le bouton <strong>Export</strong> en haut de Revenus sort le détail en tableur, avec total, ventilation par mois et par mode de règlement. Choisis un <strong>trimestre ou un mois civil</strong> : « 3 derniers mois » est une fenêtre glissante, pas un trimestre.</>,
    ],
    astuce: 'IziSolo ne connaît que ce que tu y enregistres. Si tu encaisses aussi ailleurs (un remplacement en studio, un atelier ponctuel), ajoute-le avant de déclarer. Et à l\'inverse, un encaissement que tu déclares déjà autrement se coche « Ne pas faire apparaître dans ma compta » (en modifiant le paiement sur Revenus) : il reste dans l\'historique de l\'élève, mais sort de ta déclaration et du livre des recettes, qui l\'annoncent noir sur blanc.',
  },
  {
    id: 'page-publique',
    icon: Globe,
    capture: { src: '/icons/aide/page-publique.jpg', w: 2320, h: 1520 },
    titre: 'Ta page publique',
    intro: 'Ta vitrine izisolo.fr/p/ton-studio : planning, réservation, cours d\'essai — sans site à construire.',
    etapes: [
      <>Ton portail est déjà en ligne : <strong>izisolo.fr/p/ton-studio</strong>. Tes élèves y voient ton planning et réservent en ligne (plan Complet).</>,
      <>Réglages dans <strong>Paramètres → Portail public</strong> : ce qui s'affiche (horaires, tarifs), le cours d'essai (validation manuelle ou automatique), tes couleurs.</>,
      <>Partage-le : tuile <strong>Portail</strong> du tableau de bord → lien à copier, message prérédigé WhatsApp/SMS, et <strong>QR code</strong> à imprimer (carte, flyer, affiche A4).</>,
      <>Tu as un site ? Intègre ton <strong>planning</strong> et ta <strong>grille d&apos;offres</strong> directement dessus (un copier-coller chacun) : Paramètres → Portail public → « Ma page ». Tes élèves les consultent sans quitter ton site ; au moment de réserver ou de payer, un onglet s&apos;ouvre sur ta page IziSolo (les navigateurs bloquent les connexions et les paiements à l&apos;intérieur d&apos;un site tiers, aucun outil ne fait autrement).</>,
      <>Sur ce même écran, <strong>« Tes couleurs »</strong> : deux codes couleur, et ils habillent le bloc intégré ET ta page publique, pour que ton site et ta page IziSolo soient du même monde. Les textes restent lisibles quoi qu&apos;il arrive, les nuances sont calculées pour ça.</>,
      <>Chaque cours a sa <strong>visibilité</strong> : public, réservé aux inscrit·es, aux abonné·es, aux fidèles — ou privé sur invitation.</>,
    ],
    astuce: 'Le cours d\'essai est ta porte d\'entrée : une demande d\'essai crée la fiche, t\'alerte, et l\'élève reçoit la confirmation avec l\'accès à son espace.',
  },
  {
    id: 'apparence-cours',
    icon: Palette,
    titre: 'La couleur et la photo de tes cours',
    intro: 'Chaque type de cours porte sa couleur sur ton planning public, et peut porter une photo. Un atelier peut avoir la sienne.',
    etapes: [
      <>Va dans <strong>Paramètres → Portail public → « Types de cours »</strong>. Tu y retrouves tes types (Hatha, Pilates, Atelier…), un par ligne.</>,
      <>Choisis la <strong>couleur</strong> de chaque type : elle habille ses séances sur ta page publique. Avant, la couleur était devinée à partir du nom, et deux disciplines différentes pouvaient se retrouver de la même couleur sans que tu puisses rien y faire.</>,
      <>Dépose une <strong>photo</strong> si tu veux : elle habille toutes les séances de ce type, y compris celles que tu créeras plus tard. Rien n&apos;est obligatoire, la couleur seule reste très lisible.</>,
      <>Pour un atelier qui mérite son image à lui, la photo se met <strong>directement sur la séance</strong> : au moment de créer le cours, champ « Photo de la séance ». Elle passe devant celle du type.</>,
      <>Tes photos apparaissent sur ta page publique, sur la fiche de chaque séance, et dans le planning que tu as intégré sur ton site.</>,
    ],
    astuce: 'Dépose une photo dont tu as les droits. Si des élèves y sont reconnaissables, demande-leur avant : ta page est publique.',
  },
  {
    id: 'cours-essai',
    icon: Sparkles,
    capture: { src: '/icons/aide/cours-essai.png', w: 2320, h: 1520 },
    titre: 'Le cours d\'essai, ta porte d\'entrée',
    intro: 'Le premier contact d\'une future élève — une demande, une fiche créée, et toi qui choisis le niveau d\'automatisation.',
    etapes: [
      <>Réglages : <strong>Paramètres → Portail public → « Cours d'essai »</strong>. Active-le, puis choisis le <strong>mode de validation</strong> : <strong>Automatique</strong> (validée immédiatement), <strong>Semi-automatique</strong> (validée + tu es notifiée), ou <strong>Manuel</strong> (tu valides ou refuses chaque demande depuis l'app).</>,
      <>Choisis aussi le <strong>paiement</strong> de l'essai (gratuit, ou payant : sur place ou en ligne) et ton message d'accueil. En paiement sur place, <strong>« Un prix différent selon le type de cours ? »</strong> te laisse poser un tarif par type : l'essai collectif à un prix, le particulier à un autre.</>,
      <>Côté visiteuse : ta page publique propose le cours d'essai. Sa demande <strong>crée sa fiche</strong> (statut prospect) et t'alerte dans ta cloche. Les cours complets ne sont jamais proposés.</>,
      <>En mode manuel, les demandes t'attendent dans <strong>« Cours d'essai »</strong> (nav, avec la pastille) : accepter ou refuser en un clic.</>,
      <>L'élève reçoit sa confirmation par email, avec un lien <strong>« Accéder à mon espace »</strong> — son compte existe, sans mot de passe à créer.</>,
    ],
    astuce: 'La séance d\'essai ne décompte jamais un carnet — même acheté le jour même. Elle est marquée « essai » au pointage, avec ton quota d\'essais par élève bien visible.',
  },
  {
    id: 'liste-attente',
    icon: ListOrdered,
    capture: { src: '/icons/aide/liste-attente.png', w: 2320, h: 1520 },
    titre: 'La liste d\'attente',
    intro: 'Un cours complet ne perd plus personne : la file se remplit toute seule et se vide dès qu\'une place se libère.',
    etapes: [
      <>Côté élève : sur un cours <strong>complet</strong>, ton portail propose l'inscription en liste d'attente — elle reçoit une confirmation par email avec sa position.</>,
      <>Une place se libère (annulation, désinscription) ? La <strong>première de la file est promue automatiquement</strong> et prévenue (email + push) — toi aussi, dans ta cloche.</>,
      <>Tu préfères garder la main ? Passe la règle « Liste d'attente » en mode <strong>manuel</strong> (Paramètres → Règles → Règles métier) : la promotion attend ton clic.</>,
      <>La page <strong>Liste d'attente</strong> (nav) montre chaque file : <strong>« Promouvoir »</strong> pour attribuer la place toi-même, <strong>« Retirer »</strong>, et le badge « Promu·e ✓ » garde la trace.</>,
      <>Les files des cours passés se purgent toutes seules — rien à nettoyer.</>,
    ],
    astuce: 'Une promotion crée une vraie réservation : si l\'élève promue annule à son tour, la place repart à la file.',
  },
  {
    id: 'equipe',
    icon: UserCog,
    titre: 'Travailler à plusieurs',
    intro: "Une association, un studio partagé, une collègue qui donne deux cours par semaine : chacune son compte, et tu décides de ce qu'elle voit.",
    etapes: [
      <>Dans la nav, <strong>« Équipe »</strong> → <strong>« Inviter une prof »</strong>. Son email suffit. Elle reçoit un lien, choisit son mot de passe, et ton studio apparaît chez elle. Elle n'a rien à installer, rien à payer.</>,
      <>Deux préréglages pour ne pas cocher neuf cases : <strong>« Prof »</strong> (elle donne des cours et les pointe, sans voir l'argent ni écrire à tes élèves) et <strong>« Admin »</strong> (elle gère le studio comme toi). Tu peux ensuite ajuster droit par droit.</>,
      <>Ce qu'elle n'a pas le droit de faire, elle ne le voit pas : sa navigation ne montre que ses portes. Et trois droits (l'argent, la messagerie, les réglages) sont tenus par la base elle-même, pas seulement par l'écran.</>,
      <>Tu peux aussi choisir <strong>quelles séances elle pointe</strong> : toutes, ou seulement celles dont tu l'as désignée intervenante (sur la fiche d'une séance, carte <strong>« Qui donne cette séance ? »</strong>). Une séance que personne n'a prise en charge reste pointable par toute l'équipe.</>,
      <>Tu donnes aussi des cours ailleurs ? Le <strong>nom du studio</strong>, en haut de la navigation, devient un sélecteur dès que tu appartiens à plusieurs studios : un clic, et tu changes de maison.</>,
      <>Tu changes d'avis ? <strong>« Droits »</strong> sur sa ligne, et c'est immédiat. <strong>La corbeille</strong> la retire du studio : elle est dehors à la seconde d'après, son historique reste, et tu peux la réinviter plus tard.</>,
      <>Travailler à plusieurs fait partie du <strong>plan Multi</strong> : un seul abonnement pour tout le studio, autant de profs que tu veux. Si l'abonnement s'arrête, personne n'est effacé : chacune retrouve sa place dès qu'il reprend.</>,
    ],
    astuce: "Tu te fais juste remplacer une fois ? Pas besoin d'invitation : « Confier le pointage » sur la séance suffit, et ça marche sans compte.",
  },
  {
    id: 'installer',
    icon: Smartphone,
    capture: { src: '/icons/aide/installer.png', w: 780, h: 1688 },
    titre: 'Installe l\'appli sur ton téléphone',
    intro: 'IziSolo s\'installe comme une vraie app — sans App Store, sans téléchargement. Une icône sur ton écran d\'accueil, et tu restes connectée.',
    etapes: [
      <><strong>Android + Chrome</strong> : ouvre IziSolo, puis menu <strong>⋮</strong> (en haut à droite) → <strong>« Installer l'application »</strong> (parfois « Ajouter à l'écran d'accueil »). Confirme, l'icône apparaît. La bannière « Installer l'appli » de ton Accueil fait la même chose en un tap.</>,
      <><strong>iPhone + Safari</strong> : bouton <strong>Partager</strong> (le carré avec la flèche, en bas) → fais défiler → <strong>« Sur l'écran d'accueil »</strong> → « Ajouter ».</>,
      <><strong>iPhone + Chrome</strong> : icône <strong>Partager</strong> (en haut à droite) → <strong>« Ajouter à l'écran d'accueil »</strong>. Si l'option n'apparaît pas (anciens iOS), ouvre izisolo.fr dans <strong>Safari</strong> et suis l'étape précédente.</>,
      <><strong>Ordinateur</strong> (Chrome/Edge) : petite icône d'installation à droite de la barre d'adresse → « Installer ».</>,
      <>Ensuite, ouvre toujours IziSolo <strong>depuis l'icône</strong> : tu restes connectée (fini les reconnexions), et tu peux activer les <strong>notifications</strong> quand la bannière de l'Accueil te le propose.</>,
    ],
    astuce: 'Tes élèves ont la même magie : leur espace s\'installe pareil depuis ton portail — une bannière le leur propose, avec les mêmes étapes.',
  },
  {
    id: 'abonnement',
    icon: Wallet,
    titre: 'Ton abonnement IziSolo',
    intro: 'Choisir ta formule, profiter de l\'offre de lancement, changer de carte ou récupérer tes factures.',
    etapes: [
      <>Tu as <strong>14 jours d\'essai</strong>, sans carte bancaire, avec toutes les fonctionnalités. Rien ne se déclenche tout seul à la fin : c\'est toi qui choisis de rester, quand tu veux.</>,
      <><strong>Paramètres</strong> → onglet <strong>Abonnement IziSolo</strong> → la carte de la formule qui te va → <strong>« Choisir »</strong>. Deux formules : <strong>Essentiel</strong> à 15 € par mois, et <strong>Complet</strong> à 29 € par mois, qui ajoute la boucle élève (paiement en ligne, réservation, cours en visio).</>,
      <>Sur la page de paiement, clique <strong>« Ajouter un code promotionnel »</strong> et saisis <strong>LANCEMENT50</strong> : tu paies <strong>moitié prix pendant 3 mois</strong>. Le code est réservé à une première souscription, alors ne l\'oublie pas ce jour-là.</>,
      <>Le prélèvement démarre <strong>le jour où tu souscris</strong>, pas à la fin de tes 14 jours : tes jours d\'essai sont déjà comptés par IziSolo, on ne t\'en fait pas payer deux fois. Ensuite, c\'est tous les mois à la même date.</>,
      <>Une fois abonnée, le bouton devient <strong>« Gérer mon abonnement »</strong> : il ouvre l\'espace sécurisé de Stripe où tu <strong>changes de carte</strong>, <strong>télécharges tes factures</strong>, <strong>passes d\'Essentiel à Complet</strong> (ou l\'inverse) et <strong>résilies</strong> si tu le souhaites. Rien de tout ça ne passe par nous : c\'est ta carte, c\'est ton espace.</>,
      <>Si tu résilies, ton abonnement va <strong>jusqu\'au bout du mois déjà payé</strong>. Ensuite tes données restent, mais tu ne peux plus créer de nouvelles élèves, cours ou offres tant que tu ne reviens pas. <strong>Tu peux exporter ta base élève à tout moment</strong>, même après, depuis la page Élèves : elle est à toi.</>,
      <>Un paiement qui échoue (carte expirée, plafond) ne coupe rien du jour au lendemain : tu reçois un message, ton accès continue, et tu mets ta carte à jour depuis « Gérer mon abonnement ».</>,
    ],
    astuce: 'Les factures de ton abonnement portent la mention « TVA non applicable, article 293 B du CGI » : c\'est normal, et c\'est exactement ce que ton comptable attend d\'une entreprise en franchise.',
  },
];

// Recherche insensible aux accents, à la casse ET aux apostrophes : le contenu
// utilise l'apostrophe typographique (') qu'aucun clavier ne tape — « liste
// d attente », « liste d'attente » et « liste d'attente » doivent tous matcher.
const normaliser = (s) => (s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[''ʼ]/g, ' ');

export default function AidePage() {
  // ── Recherche instantanée (2026-08-18, décision Colin — le pont AVANT tout
  // chatbot : contenu statique fouillé côté client, zéro IA, zéro coût, zéro
  // hallucination). L'index des tutos se construit depuis le DOM : toutes les
  // sections sont rendues, leur textContent EST la vérité (étapes comprises) —
  // pas de double source à maintenir. La FAQ /support est fouillée en plus
  // (content/faq-support), résultats en liens #faq-N.
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [sectionsVisibles, setSectionsVisibles] = useState(null); // null = toutes
  const [faqTrouvees, setFaqTrouvees] = useState([]);
  const indexRef = useRef(null); // [{id, texte normalisé}] — construit au 1er caractère

  // ── Défilement vers l'ancre (#offres, #pointage…) — retour Colin 2026-08-19 :
  // les « ? » contextuels ouvraient le guide EN HAUT. Sur une navigation client
  // App Router, le scroll natif vers le hash rate (la cible n'est pas encore
  // committée au moment où Next tente le scroll). On le refait nous-mêmes au
  // mount (double rAF = après le commit complet, + une 2e passe qui rattrape
  // un décalage de layout) et à chaque changement de hash.
  useEffect(() => {
    const versAncre = () => {
      const id = decodeURIComponent((window.location.hash || '').slice(1));
      if (!id) return;
      const aller = () => document.getElementById(id)?.scrollIntoView({ block: 'start' });
      requestAnimationFrame(() => requestAnimationFrame(aller));
      setTimeout(aller, 250);
    };
    versAncre();
    window.addEventListener('hashchange', versAncre);
    return () => window.removeEventListener('hashchange', versAncre);
  }, []);

  // Retour vers la page d'où vient le « ? » (retour Colin 2026-08-19 : arrivé
  // sur le guide, aucun moyen de revenir). Ouvert en direct (nouvel onglet,
  // lien d'email) → retomber sur le dashboard.
  const retour = () => {
    if (window.history.length > 1) router.back();
    else router.push('/dashboard');
  };

  const chercher = (q) => {
    setQuery(q);
    const nq = normaliser(q.trim());
    if (nq.length < 2) { setSectionsVisibles(null); setFaqTrouvees([]); return; }
    if (!indexRef.current) {
      indexRef.current = Array.from(document.querySelectorAll('.aide-section'))
        .map(el => ({ id: el.id, texte: normaliser(el.textContent) }));
    }
    setSectionsVisibles(new Set(indexRef.current.filter(s => s.texte.includes(nq)).map(s => s.id)));
    setFaqTrouvees(
      FAQ_SUPPORT
        .map((item, i) => ({ ...item, i }))
        .filter(item => normaliser(item.q + ' ' + item.a).includes(nq))
        .slice(0, 4)
    );
  };

  const enRecherche = sectionsVisibles !== null;

  return (
    <div className="aide-page">
      <div className="aide-header">
        <button type="button" onClick={retour} className="aide-back" aria-label="Revenir à la page précédente" title="Revenir où j'étais">
          <ArrowLeft size={18} />
        </button>
        <div className="aide-header-icon"><BookOpen size={22} /></div>
        <div>
          <h1>Guide de démarrage</h1>
          <p className="aide-subtitle">
            Tout ce qu'il faut pour être à l'aise avec IziSolo, pas à pas — chaque tuto se lit en deux minutes.
          </p>
        </div>
      </div>

      {/* Recherche instantanée */}
      <div className="aide-search-wrap">
        <Search size={16} className="aide-search-icon" />
        <input
          type="search"
          className="izi-input aide-search-input"
          placeholder="Cherche dans le guide… (échéancier, annuler, facture…)"
          value={query}
          onChange={e => chercher(e.target.value)}
          aria-label="Rechercher dans le guide"
        />
        {query && (
          <button type="button" className="aide-search-clear" onClick={() => chercher('')} aria-label="Effacer la recherche">
            <X size={15} />
          </button>
        )}
      </div>

      {/* Résultats : compteur + questions FAQ correspondantes */}
      {enRecherche && (
        <div className="aide-search-etat">
          {sectionsVisibles.size > 0
            ? <span>{sectionsVisibles.size} tuto{sectionsVisibles.size > 1 ? 's' : ''} correspond{sectionsVisibles.size > 1 ? 'ent' : ''} ↓</span>
            : <span>Aucun tuto ne contient « {query.trim()} ».</span>}
          {faqTrouvees.length > 0 && (
            <div className="aide-faq-matches">
              <span className="aide-faq-matches-label">Aussi dans la FAQ :</span>
              {faqTrouvees.map(item => (
                <Link key={item.i} href={`/support#faq-${item.i}`} className="aide-faq-match">
                  {item.q}
                </Link>
              ))}
            </div>
          )}
          {sectionsVisibles.size === 0 && faqTrouvees.length === 0 && (
            <div className="aide-faq-matches">
              <Link href="/support" className="aide-faq-match">Pose ta question au support — on répond vite.</Link>
            </div>
          )}
        </div>
      )}

      {/* Sommaire */}
      {!enRecherche && (
        <div className="aide-sommaire">
          {SECTIONS.map(s => (
            <a key={s.id} href={`#${s.id}`} className="aide-chip">
              <s.icon size={14} /> {s.titre}
            </a>
          ))}
        </div>
      )}

      {/* Sections — masquées (pas démontées : l'index et les ancres restent valides) */}
      {SECTIONS.map(section => (
        <section
          key={section.id}
          id={section.id}
          className="aide-section"
          style={enRecherche && !sectionsVisibles.has(section.id) ? { display: 'none' } : undefined}
        >
          <div className="aide-section-head">
            <section.icon size={18} />
            <h2>{section.titre}</h2>
          </div>
          <p className="aide-intro">{section.intro}</p>
          {section.capture && (
            <div className={`aide-shot ${section.capture.h > section.capture.w ? 'aide-shot-portrait' : ''}`}>
              <Image
                src={section.capture.src}
                alt={`Capture d'écran — ${section.titre}`}
                width={section.capture.w}
                height={section.capture.h}
                sizes="(max-width: 860px) 100vw, 760px"
                loading="lazy"
              />
            </div>
          )}
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
        .aide-back {
          width: 38px; height: 38px; border-radius: var(--radius-sm); flex-shrink: 0;
          border: 1px solid var(--border); background: var(--bg-card);
          display: flex; align-items: center; justify-content: center;
          color: var(--text-secondary); cursor: pointer;
          transition: color 0.15s, border-color 0.15s;
          margin-top: 3px;
        }
        .aide-back:hover { color: var(--brand); border-color: var(--brand); }
        .aide-header-icon {
          width: 44px; height: 44px; border-radius: 12px; flex-shrink: 0;
          background: var(--brand-light, #f7ecec); color: var(--brand);
          display: flex; align-items: center; justify-content: center;
        }
        .aide-header h1 { font-size: 1.375rem; font-weight: 800; margin: 0 0 4px; }
        .aide-subtitle { color: var(--text-secondary); font-size: 0.9rem; margin: 0; line-height: 1.5; }

        .aide-search-wrap { position: relative; }
        .aide-search-icon { position: absolute; left: 13px; top: 50%; transform: translateY(-50%); color: var(--text-muted); pointer-events: none; }
        .aide-search-input { width: 100%; padding-left: 38px !important; padding-right: 38px !important; }
        .aide-search-clear {
          position: absolute; right: 8px; top: 50%; transform: translateY(-50%);
          background: none; border: none; cursor: pointer; color: var(--text-muted);
          width: 28px; height: 28px; display: flex; align-items: center; justify-content: center; border-radius: 50%;
        }
        .aide-search-clear:hover { color: var(--text-primary); background: var(--bg-soft, #f8f9fa); }
        .aide-search-etat { font-size: 0.8125rem; color: var(--text-secondary); display: flex; flex-direction: column; gap: 8px; }
        .aide-faq-matches { display: flex; flex-direction: column; gap: 5px; }
        .aide-faq-matches-label { font-weight: 700; font-size: 0.78rem; color: var(--text-primary); }
        .aide-faq-match {
          display: block; padding: 9px 13px; background: var(--bg-card);
          border: 1px solid var(--border); border-radius: var(--radius-md);
          color: var(--brand); font-weight: 600; font-size: 0.8125rem; text-decoration: none;
        }
        .aide-faq-match:hover { border-color: var(--brand); }

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

        .aide-shot {
          margin: 0 0 16px; border: 1px solid var(--border); border-radius: 10px;
          overflow: hidden; background: var(--bg-soft, #f8f9fa); line-height: 0;
        }
        .aide-shot img { width: 100%; height: auto; display: block; }
        .aide-shot-portrait { max-width: 400px; margin-inline: 0 auto; }

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
