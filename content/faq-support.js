/**
 * content/faq-support.js — LA FAQ in-app (/support), source unique.
 *
 * Extraite de app/(dashboard)/support/page.js le 2026-08-18 (chantier
 * « recherche instantanée ») : la recherche de /aide fouille aussi ces
 * questions. Données pures (pas de JSX) — importable des deux côtés.
 */
// FAQ réécrite le 2026-08-01 (décision Colin « aide utilisateur ») : les vraies
// questions du terrain, avec les VRAIS chemins de l'app et le lexique gravé
// (Cours = modèle / Séance = occurrence / Offre = catalogue / Carnets & abos).
// L'ancienne FAQ promettait des choses fausses (« factures générées
// automatiquement », « export en bas de Paramètres ») — plus jamais ça :
// chaque réponse a été vérifiée contre l'écran qu'elle décrit.
// Sweep 2026-08-23 (règle immuable « le centre d'aide suit chaque modif ») :
// +6 questions (visio, demande d'offre, plusieurs moyens, jour de série,
// URSSAF, joindre l'équipe) AJOUTÉES EN FIN de liste — les ancres /support#faq-N
// sont indexées par position, on n'insère jamais au milieu.
export const FAQ_SUPPORT = [
  {
    q: "Comment créer un cours qui se répète chaque semaine ?",
    a: "Va dans Cours & Évènements → « Créer un cours », choisis une fréquence (hebdomadaire, tous les 15 jours, mensuelle) et une date de fin : IziSolo génère toutes les séances d'un coup. Pour ajuster une série (la prolonger à la rentrée, la raccourcir, ou ajouter les séances d'été), ouvre l'écran des cours récurrents et clique sur l'icône 📅+ de la série : la nouvelle date de fin marche dans les deux sens, et les séances avec des inscrites ne sont jamais supprimées.",
    lien: { href: '/aide#premier-cours', label: 'Voir le pas-à-pas' },
  },
  {
    q: "Comment pointer les présences d'une séance ?",
    a: "Depuis l'Accueil ou l'Agenda, ouvre la séance du jour → « Pointer ». Un clic par élève, et le carnet se décompte automatiquement.",
    lien: { href: '/aide#pointage', label: 'Voir le pas-à-pas' },
  },
  {
    q: "Le carnet ne s'est pas décompté (ou pas sur le bon carnet), comment corriger ?",
    a: "Au pointage, ouvre le menu ··· sur la ligne de l'élève : « Décompter sur » te laisse choisir le bon carnet, ou repasser la séance « À l'unité ». Le compteur se corrige immédiatement.",
  },
  {
    q: "Comment inviter mes élèves sur leur espace en ligne ?",
    a: "Page Élèves → « Inviter » (ou depuis une fiche) : chaque élève reçoit un lien d'accès à son espace (réservations, carnet, messages). Et après un import CSV, l'écran de fin te propose d'inviter tout le monde en un clic.",
    lien: { href: '/aide#eleves', label: 'Voir le pas-à-pas' },
  },
  {
    q: "Comment vendre un carnet ou un abonnement à une élève ?",
    a: "Crée d'abord ton offre dans Offres (carnet 10 séances, abo mensuel…). Puis fiche élève → « Ajouter une offre » : payé maintenant, à régler plus tard, ou en plusieurs fois. Les montants dus t'attendent dans Revenus, section « À percevoir ».",
    lien: { href: '/aide#encaisser', label: 'Voir le pas-à-pas' },
  },
  {
    q: "Comment modifier une seule séance sans toucher au reste de la série ?",
    a: "Ouvre la séance → icône crayon : la modification ne s'applique qu'à cette séance. Pour changer l'horaire ou le lieu de toutes les séances, utilise « Modifier toute la série » dans le bandeau.",
    lien: { href: '/aide#agenda', label: 'Voir le pas-à-pas' },
  },
  {
    q: "J'ai annulé une séance mais elle s'affiche encore sur l'agenda, c'est normal ?",
    a: "Oui : une séance annulée reste visible, barrée. C'est ce qui informe tes élèves du changement (ils sont aussi prévenus par email). Pour la faire disparaître complètement, utilise la corbeille sur sa page. Attention, l'annulation est définitive : une séance annulée ne se ré-active pas.",
    lien: { href: '/aide#agenda', label: 'Voir le pas-à-pas' },
  },
  {
    // Demandé 2× dans les feedbacks (19-20/07) — enfin une réponse écrite.
    q: "Comment faire apparaître le lieu d'une séance ?",
    a: "Le lieu se choisit sur le cours : à la création, ou après coup via l'icône crayon (cette séance) / « Modifier toute la série » (toutes). Tes lieux se gèrent dans Paramètres → Mon studio → Studio & lieux, ils sont illimités. Une fois posé, le lieu s'affiche sur l'agenda, le portail et les emails à tes élèves.",
    lien: { href: '/aide#agenda', label: 'Voir le pas-à-pas' },
  },
  {
    q: "Comment faire payer un abonnement en plusieurs fois ?",
    a: "Le paiement en plusieurs fois se choisit au moment de la VENTE (pas à la création de l'offre) : fiche élève → « Ajouter une offre » → « En plusieurs fois », ou bouton « Vendre » sur les pages Offres et Carnets & abos. Tu choisis 2× à 10× et le rythme, puis chaque versement se règle ligne par ligne : sa date, son montant, la case « Payé » s'il est déjà encaissé, avec son propre mode de règlement. Le bouton « Arrondir aux euros » supprime les centimes.",
    lien: { href: '/aide#encaisser', label: 'Voir le pas-à-pas' },
  },
  {
    q: "Puis-je modifier une offre déjà vendue ?",
    a: "Oui : page Offres → icône crayon. La modification vaut pour les PROCHAINES ventes : les carnets déjà vendus gardent leurs conditions, figées à l'achat (prix, cours couverts, validité). Pour corriger un carnet précis : fiche de l'élève → « Modifier » sur la carte du carnet.",
    lien: { href: '/aide#carnets-abos', label: 'Voir le pas-à-pas' },
  },
  {
    q: "Comment archiver ou supprimer une fiche élève ?",
    a: "Archiver (recommandé) : liste Élèves → statut de la fiche → « Archivé ». Elle est masquée mais tout est conservé, réactivable à tout moment. Supprimer (fiche → corbeille) est irréversible : carnets, présences et inscriptions partent avec ; seuls les paiements encaissés restent dans ta compta.",
  },
  {
    q: "Où je règle mon délai d'annulation et mes règles (absences, retards…) ?",
    a: "Paramètres → Élèves & cours (Annulation, Cas particuliers) : délai d'annulation, absence non prévenue, annulation tardive… Tes élèves voient la règle au moment d'annuler, et les cas ambigus remontent dans « À traiter » pour que tu tranches.",
    lien: { href: '/aide#regles-annulation', label: 'Voir le pas-à-pas' },
  },
  {
    q: "Une élève me demande une facture pour son CSE ou son employeur, comment faire ?",
    a: "Renseigne ton SIRET une fois pour toutes : Paramètres → Argent → Facturation. Ensuite chaque paiement réglé produit une vraie facture acquittée numérotée : l'élève la télécharge elle-même depuis son espace, et toi depuis sa fiche. Sans SIRET, c'est un reçu de paiement simple.",
    lien: { href: '/aide#factures', label: 'Voir le pas-à-pas' },
  },
  {
    q: "Comment prévenir tous mes élèves d'un coup (rentrée, changement de salle…) ?",
    a: "Messagerie → « Annoncer » : choisis les destinataires (tous, les inscrit·es d'un cours, les détenteurs d'une offre, ou une sélection libre), écris ton message, et chacune reçoit un email avec le lien pour répondre.",
    lien: { href: '/aide#messagerie', label: 'Voir le pas-à-pas' },
  },
  {
    q: "Comment exporter mes données (élèves, compta) ?",
    a: "Page Élèves → « Exporter » : un CSV de toutes tes fiches, disponible quel que soit ton plan. Pour ta compta (plan Complet) : Revenus → « Export » ouvre une modale où tu choisis la période (préréglée ou dates libres), l'état, le mode de règlement et l'offre. Le CSV s'ouvre directement dans Excel.",
  },
  {
    // Cas Patricia 2026-08-18 : une prof crée un compte élève avec son adresse
    // perso, sa session bascule, et croit son studio disparu.
    q: "J'ai créé un compte élève et je ne retrouve plus mon compte pro, perdu ?",
    a: "Rien n'est perdu ! Un compte élève et un compte studio sont deux comptes séparés (deux adresses email). Ton navigateur est simplement resté connecté au compte élève : déconnecte-toi (bouton « Changer de compte » ou Déconnexion), puis reconnecte-toi sur izisolo.fr/login avec l'adresse email de ton studio et ton mot de passe. Ton studio et toutes tes données sont intacts.",
  },
  {
    q: "Comment installer IziSolo sur mon téléphone (sans App Store) ?",
    a: "IziSolo est une appli web installable. Android + Chrome : menu ⋮ → « Installer l'application ». iPhone : bouton Partager → « Sur l'écran d'accueil » (Safari, ou Chrome récent). Une fois installée, tu ouvres depuis l'icône et tu restes connecté·e.",
    lien: { href: '/aide#installer', label: 'Voir le pas-à-pas' },
  },
  {
    q: "Comment gérer mon abonnement IziSolo ?",
    a: "Paramètres → Mon abonnement IziSolo. Pour une facture ou une question de facturation, écris-nous depuis ta messagerie (fil « 💬 Équipe IziSolo ») ou à bonjour@izisolo.fr : on te répond vite.",
  },
  {
    // Cours en ligne v86 + déblocage CB par séance (2026-08-19, cas Ariana).
    q: "Comment donner un cours en visio (Zoom, Meet) ?",
    a: "À la création du cours (ou en le modifiant), « Où se passe ce cours ? » → « 🖥 En ligne » : tu colles ton lien Zoom ou Meet à la place du lieu, et le cours porte un badge 🖥 sur ton portail. La case « Réserver le lien aux séances réglées ou couvertes » protège ton lien : une élève ne le voit dans son espace (et le rappel de la veille) que si sa séance est couverte par un carnet, réglée ou offerte. Un paiement CB de la séance le débloque tout seul.",
    lien: { href: '/aide#premier-cours', label: 'Voir le pas-à-pas' },
  },
  {
    // Demande d'offre v97 (2026-08-23).
    q: "Une élève veut un carnet : comment ça se passe depuis son espace ?",
    a: "Son espace liste tout ton catalogue (« Les offres du studio »). Si l'offre a un lien de paiement Stripe, elle paie en ligne et le carnet s'attribue tout seul. Sinon elle clique « Demander » : la demande atterrit en tête de ta page Offres et sur la fiche de l'élève, et ta cloche t'y amène (« Voir la demande »). « Attribuer l'offre » ouvre la vente directement sur le règlement (espèces, chèque, CB, en plusieurs fois…). Rien n'est débité ni réservé tant que tu n'as pas validé la vente.",
    lien: { href: '/aide#offres', label: 'Voir le pas-à-pas' },
  },
  {
    // « Plusieurs moyens » (2026-08-23).
    q: "Comment encaisser un règlement moitié chèque, moitié CB ?",
    a: "Au moment de la vente, choisis « Plusieurs moyens » : tu découpes le montant entre les moyens utilisés le même jour (80 € en espèces + 43 € en CB, par exemple). Chaque moyen fait sa propre ligne dans ta compta, comme ton livre des recettes l'attend, et IziSolo refuse un découpage qui ne fait pas le total.",
    lien: { href: '/aide#encaisser', label: 'Voir le pas-à-pas' },
  },
  {
    // Le cas exact de Maude (2026-08-22/23) : série née le mauvais jour.
    q: "Mon cours récurrent est sur le mauvais jour : comment le changer ?",
    a: "Ouvre une séance de la série → « Modifier toute la série » → bloc « Jour de la semaine » : chaque séance à venir est décalée sur le nouveau jour, en gardant les inscriptions, les paiements et l'historique. L'aperçu t'annonce le déplacement avant de confirmer, et te dit s'il y a des élèves à prévenir. (À la création, le jour se choisit avec « Quel jour ? », indépendamment de la date de début.)",
    lien: { href: '/aide#agenda', label: 'Voir le pas-à-pas' },
  },
  {
    // URSSAF v93/v94 (2026-08-22).
    q: "Combien dois-je déclarer à l'URSSAF ce trimestre ?",
    a: "Configure une fois ta déclaration (Paramètres → Argent → Déclaration URSSAF : régime, périodicité, taux), puis le bloc « Ma déclaration URSSAF » de la page Revenus affiche le montant de la période close, arrondi à l'euro, avec un bouton Copier. « Voir le détail à l'écran » ouvre la déclaration complète, et « J'ai déclaré ces X € » archive le montant : si ta compta bouge après coup, IziSolo t'affiche l'écart.",
    lien: { href: '/aide#urssaf', label: 'Voir le pas-à-pas' },
  },
  {
    // Fil support v87 (2026-08-19).
    q: "Comment joindre l'équipe IziSolo ?",
    a: "Trois portes : le fil « 💬 Équipe IziSolo » épinglé en tête de ta Messagerie (ta question arrive directement chez nous, on te répond dans le même fil), le bouton « Donner du feedback » en haut à droite pour un bug ou une idée, ou un email à bonjour@izisolo.fr. Dans tous les cas, un humain lit et répond.",
  },
  {
    // Règlement par virement (v98, 2026-08-23).
    q: "Comment envoyer mon RIB à une élève pour un virement ?",
    a: "Renseigne-le une fois : Paramètres → Argent → Virement (RIB) (IBAN vérifié à la saisie). Ensuite, à chaque vente « à régler plus tard », tu choisis l'email qui part tout seul : « Virement (RIB) » envoie ton IBAN avec une référence de virement (pour reconnaître le règlement sur ton relevé), et l'espace de l'élève affiche aussi le RIB avec un QR code à scanner avec son application bancaire. Tu peux aussi régler ça en automatique (carte « Règlement par virement », « il part tout seul »).",
    lien: { href: '/aide#encaisser', label: 'Voir le pas-à-pas' },
  },
  {
    // Vignettes de cours (v99, 2026-08-24).
    q: "Puis-je mettre une photo sur mes cours ?",
    a: "Oui, à deux niveaux. Par type de cours d'abord : Paramètres → Ma page publique → « Types de cours », tu choisis la couleur de chaque type et tu peux y déposer une photo. Elle habille toutes les séances de ce type, y compris celles que tu créeras plus tard. Et pour un atelier qui mérite son image à lui, la photo se met directement sur la séance, au moment de la créer : elle passe devant celle du type. Sans photo, la couleur suffit, ta page reste lisible.",
    lien: { href: '/aide#apparence-cours', label: 'Voir le pas-à-pas' },
  },
  {
    // Second bloc intégrable (v99, 2026-08-24).
    q: "Puis-je afficher mes tarifs sur mon propre site ?",
    a: "Oui, comme le planning : Paramètres → Ma page publique → « Intégrer sur mon site », bloc « Et tes offres, si tu veux ». Tu copies une ligne de code et tu la colles dans un bloc HTML de ton site. Tes offres actives s'affichent avec leur prix, et un clic emmène ton élève sur tes tarifs IziSolo où elle peut payer en ligne ou te demander l'offre. Les deux blocs prennent les mêmes couleurs, pour qu'ils aillent ensemble sur ta page.",
    lien: { href: '/aide#page-publique', label: 'Voir le pas-à-pas' },
  },
  {
    // Lien de pointage confié (v100, 2026-08-25). AJOUTÉE EN FIN DE LISTE :
    // les ancres /support#faq-N sont indexées par position.
    q: "Je me fais remplacer : comment ma collègue peut-elle pointer sans avoir de compte ?",
    a: "Ouvre la séance concernée, puis « Confier le pointage » : tu crées un lien à lui envoyer par SMS ou par message. Elle l'ouvre sur son téléphone et pointe présent, absent ou excusé, sans compte et sans mot de passe. Elle ne voit que les prénoms et les noms de ta liste : ni téléphone, ni email, ni carnet, ni montant. Tu choisis jusqu'à quand le lien reste valable (fin de journée, demain soir, 7 jours), tu peux le désactiver quand tu veux, et tu reçois une notification dès qu'il sert. Une chose qu'elle ne peut pas faire : ajouter ou retirer quelqu'un de la liste. Ces gestes touchent aux carnets et aux places. Si une élève arrive à l'improviste, elle te laisse un mot que tu retrouves au même endroit.",
    lien: { href: '/aide#pointage', label: 'Voir le pas-à-pas' },
  },
  {
    // Équipe / plan Multi (lot 3 multi-prof, 2026-08-25). AJOUTÉE EN FIN.
    q: "On est plusieurs profs dans le studio : comment faire ?",
    a: "Menu « Équipe » → « Inviter une prof ». Tu mets son email, elle reçoit un lien, choisit son mot de passe, et ton studio apparaît chez elle. Tu choisis ce qu'elle peut faire : « Prof » (donner des cours et les pointer, sans voir l'argent ni écrire à tes élèves) ou « Admin » (gérer le studio comme toi), et tu ajustes ensuite droit par droit. Ce qu'elle n'a pas le droit de faire n'apparaît même pas dans sa navigation. Tu peux la retirer quand tu veux, c'est immédiat, et son historique reste. Travailler à plusieurs fait partie du plan Multi : un seul abonnement pour tout le studio, autant de profs que tu veux. Pour un simple remplacement ponctuel, pas besoin d'invitation : « Confier le pointage » sur la séance suffit, et ça marche sans compte.",
    lien: { href: '/aide#equipe', label: 'Voir le pas-à-pas' },
  },
  {
    // Intervenante + portée + sélecteur de studio (lot 3b, 2026-08-25).
    q: "Je donne des cours dans deux studios : comment passer de l'un à l'autre ?",
    a: "Dès que tu appartiens à plusieurs studios, le nom du studio en haut de la navigation devient un sélecteur : un clic et tu changes de maison, chaque studio garde ses élèves, son agenda et sa compta de son côté. Et si tu gères un studio à plusieurs profs : sur la fiche d'une séance, la carte « Qui donne cette séance ? » désigne l'intervenante. Tu peux alors limiter une prof au pointage de SES séances (Équipe → « Quelles séances peut-elle pointer ? »). Une séance que personne n'a prise en charge reste pointable par toute l'équipe.",
    lien: { href: '/aide#equipe', label: 'Voir le pas-à-pas' },
  },
  {
    // Question d'une prospecte Instagram, 2026-08-25 : le branding avant tout.
    q: "Si j'intègre mon planning à mon site, mes élèves en sortent-elles ?",
    a: "Pour consulter, non : le planning et tes tarifs s'affichent DANS ton site, dans tes couleurs. Au moment de réserver ou de payer, un nouvel onglet s'ouvre sur ta page IziSolo. Ce n'est pas un choix de facilité : les navigateurs bloquent les connexions et les paiements à l'intérieur d'une page intégrée dans un autre site, et aucun outil du secteur ne fait autrement. Ce que tu peux soigner, en revanche, c'est à quoi ressemble cette page : Paramètres → Ma page publique → « Intégrer sur mon site » → « Tes couleurs » (deux codes, ils habillent le bloc intégré ET ta page publique), plus ta photo de couverture, ta bio, et une couleur et une photo par type de cours.",
    lien: { href: '/aide#page-publique', label: 'Voir le pas-à-pas' },
  },
  {
    // Retour Melyflow (Belgique), 2026-08-25. AJOUTÉE EN FIN de liste.
    q: "Je ne suis pas en France (Belgique, Luxembourg) : la facturation marche-t-elle ?",
    a: "Oui. Va dans Paramètres → Argent → Facturation et choisis ton pays d'exercice en haut de la carte. Le champ s'adapte : « SIRET » en France, « Numéro d'entreprise » en Belgique, « Numéro RCS » au Luxembourg, et c'est ce libellé qui s'imprime sur tes factures. Deux points importants : le bloc « Ma déclaration URSSAF » disparaît, parce que chez toi ce sont tes caisses qui appellent les cotisations et qu'il n'y a rien à déclarer depuis IziSolo (ton export de recettes, lui, reste disponible dans Revenus) ; et la mention de TVA n'est PAS pré-remplie hors de France, parce que nous ne devinons pas ce qui doit figurer sur ta facture. On te propose une formulation courante, mais vérifie-la auprès de ton comptable : c'est ta responsabilité qui est engagée.",
  },
  {
    // Retour Melyflow (Belgique), 2026-08-25 — 5 « Cours découverte » le même
    // samedi. AJOUTÉE EN FIN de liste.
    q: "Mes cours du même jour se sont regroupés sous une seule carte sur mon portail, c'est normal ?",
    a: "Oui, et rien n'est perdu. Quand tu proposes plusieurs fois le MÊME cours dans la journée (même nom, même lieu, même tarif, même format), ton portail les range sous une seule carte plutôt que d'en empiler cinq : « 5 créneaux, de 9h30 à 16h ». Les horaires restent écrits sur la carte, et le bouton « Choisir mon heure » les déplie, chacun avec ses places restantes et son bouton de réservation. Deux exceptions volontaires : une séance annulée garde toujours sa propre carte (c'est l'information la plus importante, elle ne doit pas se cacher), et il faut au moins trois créneaux pour que le regroupement se déclenche.",
    lien: { href: '/aide#page-publique', label: 'Voir le pas-à-pas' },
  },
  {
    // Retour Manon (Soleya), 2026-08-26 : 7 semaines de décomptes manuels sur
    // les fiches, 0 pointage. Elle avait renseigné le type de cours et
    // attendait un décompte automatique. AJOUTÉE EN FIN de liste.
    q: "Je décompte les cartes de mes élèves à la main, pourquoi ça ne se fait pas tout seul ?",
    a: "Parce qu'il manque un geste, et un seul : le pointage. C'est lui qui décompte les carnets, et rien d'autre ne le fait : ni la réservation de l'élève, ni le type de cours, ni le fait que son carnet couvre ce cours. Tant qu'une séance n'est pas pointée, les compteurs ne bougent pas. Le jour J, depuis l'Accueil (bloc « Aujourd'hui ») ou l'Agenda, ouvre la séance → « Pointer », puis un clic par élève : « Carnet 10 séances · 9 séances » s'affiche sous son nom, et c'est écrit. Tu peux pointer après le cours, le soir même ou plus tard, ça marche pareil. Le bouton « Modifier les séances déjà faites » d'une fiche élève, lui, sert au rattrapage de ce qui s'est passé AVANT IziSolo (ton ancien carnet papier) : au quotidien, tu n'as pas à y toucher.",
    lien: { href: '/aide#pointage', label: 'Voir le pas-à-pas' },
  },
  {
    // Retour Manon (Soleya), 2026-08-26 : une élève dit avoir payé une carte
    // depuis l'app, aucune trace côté prof. Payment Links collés, webhook
    // jamais déclaré. AJOUTÉE EN FIN de liste.
    q: "Une élève dit avoir payé en ligne, mais je ne vois ni le paiement ni son carnet, que faire ?",
    a: "Vérifie d'abord Paramètres → Argent → Paiement en ligne. Brancher le paiement demande DEUX gestes : coller un lien Stripe sur l'offre, et déclarer le webhook (les étapes 1 et 2 de cet écran). Le webhook est ce qui prévient IziSolo qu'une élève a payé : sans lui, l'argent arrive bien sur ton compte Stripe, mais l'app n'en sait rien, donc ni paiement ni carnet ne sont créés. Si le bandeau « Configuré » n'est pas affiché, c'est ça. Pour retrouver l'argent : va sur dashboard.stripe.com → Paiements, en mode Live (l'interrupteur « Mode test » doit être éteint, c'est le piège le plus courant) et cherche l'email de ton élève. Si le paiement y est, termine la configuration, puis dans Stripe → Webhooks, ouvre l'événement et clique « Resend » : IziSolo créera le paiement et le carnet tout seuls, à la bonne date, sans risque de doublon. Depuis le 26/08/2026, tant que le webhook manque, tes élèves ne voient plus de bouton « payer » mais un bouton « Demander » : leur demande arrive en tête de ta page Offres et tu encaisses comme tu veux.",
    lien: { href: '/aide#offres', label: 'Voir le pas-à-pas' },
  },
  {
    // Retour Maude, 2026-08-26 : « le calendrier affiche le 1er septembre un
    // jeudi alors que c'est un mardi ». Le calendrier en cause n'était pas le
    // nôtre. AJOUTÉE EN FIN de liste.
    q: "Le petit calendrier me montre le mauvais jour de la semaine, IziSolo se trompe ?",
    a: "Non, et c'est vérifiable en un coup d'œil. Le petit calendrier qui s'ouvre quand tu cliques sur un champ de date est dessiné par ton navigateur, pas par IziSolo, et il s'ouvre toujours sur le mois de la date déjà écrite dans le champ. Si un chiffre de l'année est parti de travers en tapant au clavier (2022 au lieu de 2026, par exemple), il s'ouvre sur la mauvaise année, où le même jour du mois tombe évidemment sur un autre jour de la semaine. Regarde l'année écrite en haut du calendrier. Pour t'éviter le piège, IziSolo écrit désormais sous le champ le jour choisi en toutes lettres, « Mardi 1 septembre 2026 », et te prévient en rouge si l'année n'est ni celle en cours ni l'une des deux suivantes.",
    lien: { href: '/aide#premier-cours', label: 'Voir le pas-à-pas' },
  },
  {
    // Retour Maude, 2026-08-31 : « Anne-Sophie » demande un abonnement à 480 €
    // depuis la page publique, et sa prof ne voit ni qui c'est ni comment la
    // joindre. L'email était en base, aucun écran ne l'affichait.
    // AJOUTÉE EN FIN de liste.
    q: "J'ai reçu une demande d'offre de quelqu'un que je ne connais pas, comment la contacter ?",
    a: "Son adresse email est écrite sur la demande, dans le bloc « demandes d'élèves » en tête de ta page Offres : clique dessus pour lui écrire directement. C'est normal de ne pas la connaître : ta page publique est ouverte à tout le monde, et une visiteuse peut demander une offre en laissant juste son prénom et son email, sans compte et sans fiche chez toi. La ligne porte alors le badge « page publique · pas encore de fiche ». Pour aller plus loin, le bouton « Créer la fiche et attribuer » lui crée sa fiche élève avec ces coordonnées, puis ouvre la vente directement sur le règlement (espèces, chèque, virement, en plusieurs fois : tu choisis). Si elle a déjà une fiche sous cette adresse, IziSolo reprend la sienne au lieu d'en créer une deuxième. Et tant que tu n'as pas fait la vente, rien n'est encaissé ni réservé de son côté.",
    lien: { href: '/aide#offres', label: 'Voir le pas-à-pas' },
  },
  {
    // Retour Manon (Soleya), 2026-09-07 : « pour mes abonnements au mois,
    // comment je fais pour que ça génère automatiquement une facture chaque
    // début de mois ? Je n'arrive à générer qu'une facture pour août. »
    // AJOUTÉE EN FIN de liste.
    q: "Mes élèves ont un abonnement au mois : comment avoir une facture chaque mois, sans y penser ?",
    a: "Une facture IziSolo est une facture acquittée : elle naît d'un paiement reçu, jamais avant. Une facture par mois, c'est donc un paiement par mois. Deux gestes, puis plus rien. (1) Le paiement de chaque mois : à la vente, choisis « En plusieurs fois » puis « Chaque mois jusqu'à la fin » et saisis le montant du mois (55 € par exemple) : un versement par mois se remplit tout seul jusqu'à la fin de l'abonnement, le premier réglé tout de suite, les suivants dans « À percevoir » de ta page Revenus et dans « À régler » de l'espace de l'élève. Pour un abonnement déjà vendu, ouvre-le depuis la fiche de l'élève et clique « Programmer chaque mois » : les mois déjà réglés sont sautés, jamais doublés. (2) La facture : dans Paramètres → Argent → Facturation, coche « Envoyer la facture à l'élève par email à chaque encaissement ». Ensuite, chaque mois, quand l'argent arrive, tu cliques « Encaisser » sur le versement : la facture est émise et part en pièce jointe. Le prélèvement automatique par carte, où même ce clic disparaît, est le prochain chantier.",
    lien: { href: '/aide#factures', label: 'Voir le pas-à-pas' },
  },
  {
    // Colin, 2026-09-07, dans la foulée de la question de Manon : « et le
    // prélèvement auto par carte ? ». AJOUTÉE EN FIN de liste.
    q: "Mes élèves peuvent-elles être prélevées automatiquement chaque mois par carte ?",
    a: "Oui, avec le plan Complet et ton compte Stripe. Dans Stripe, crée un lien de paiement récurrent (type « Abonnement », prix « par mois ») et colle-le sur ton offre d'abonnement, exactement comme un lien de paiement classique. Sur ton endpoint Stripe (Paramètres → Argent → Paiement en ligne), coche aussi invoice.paid, invoice.payment_failed et customer.subscription.deleted. Ensuite tout suit : quand une élève souscrit depuis ton portail, Stripe la prélève chaque mois, IziSolo enregistre chaque prélèvement dans ses paiements, prolonge son abonnement et lui envoie sa facture si tu as activé l'envoi automatique. Sur sa fiche, l'abonnement porte le badge « 💳 Prélèvement auto ». Trois choses se règlent dans ton Stripe et pas dans IziSolo : la pause, le changement de carte et la résiliation (elle garde l'accès jusqu'à la fin de la période déjà payée). Si un prélèvement échoue, ta cloche te prévient et l'élève reçoit un email ; après trois échecs, l'abonnement passe en pause tout seul et se réactive dès qu'un prélèvement passe. Un engagement sur douze mois se règle dans Stripe, IziSolo ne l'impose pas.",
    lien: { href: '/aide#offres', label: 'Voir le pas-à-pas' },
  },
  {
    // Retour Manon (Soleya), 2026-09-07 : « est-ce que je peux enlever les
    // offres sur le profil des clientes ? je gère ça via mon site internet ».
    // AJOUTÉE EN FIN de liste.
    q: "Je vends mes carnets sur mon propre site : comment enlever les offres de l'espace de mes élèves ?",
    a: "Paramètres → Ma page publique → Ma page, carte « Ce que ta page montre », désactive « Proposer mes offres dans l'espace de mes élèves ». La section « Les offres du studio » disparaît de leur espace, et avec elle le bouton « Demander ». Tout le reste reste en place : leurs paiements, leurs carnets, leurs factures, et toi tu continues d'attribuer tes offres depuis leurs fiches (« Ajouter une offre »), comme aujourd'hui. Ce réglage est indépendant de « Afficher mes tarifs sur ma page publique » : tu peux masquer l'un sans l'autre. Le jour où tu veux vendre depuis IziSolo, tu le réactives et tout revient.",
    lien: { href: '/aide#offres', label: 'Voir le pas-à-pas' },
  },
  {
    // Frontière des plans, 2026-09-07 (lot « Essentiel / Complet effectifs »).
    // AJOUTÉE EN FIN de liste.
    q: "Qu'est-ce que mes élèves ne peuvent PAS faire en ligne avec Essentiel ?",
    a: "Essentiel, c'est ton cahier en mieux : élèves illimités, agenda, carnets et abonnements gérés à la main, pointage, versements, factures, déclaration URSSAF, export comptable, et ta page publique vitrine avec le planning. Ce qui n'y est pas, c'est tout ce que tes élèves feraient elles-mêmes en ligne : réserver et annuler, avoir un espace élève, demander un cours d'essai, s'inscrire en liste d'attente, t'écrire dans la messagerie, voter à un sondage, acheter ou demander une offre en ligne. Avec Essentiel, ta page publique n'affiche ni ta bio, ni ta FAQ, ni les boutons de demande : uniquement ton planning et tes tarifs si tu les as activés. Dans ton menu, ces fonctions gardent leur entrée avec un petit cadenas, et la page te dit en un clic ce qu'elle fait et comment passer en Complet, sans engagement, à tout moment.",
    lien: { href: '/aide#abonnement', label: 'Voir le pas-à-pas' },
  },
  {
    // Lien « ouvert avant toi », 2026-09-08 (retour Manon/Soleya : une élève
    // sur Hotmail trouvait chaque lien « expiré ou déjà utilisé »).
    // AJOUTÉE EN FIN de liste.
    q: "Une élève me dit que son lien de connexion est « expiré ou déjà utilisé » alors qu'elle vient de le recevoir",
    a: "Ce n'est ni elle ni toi : c'est sa messagerie. Certaines boîtes mail (Hotmail et Outlook surtout, mais aussi des antivirus et des filtres d'entreprise) ouvrent les liens reçus avant la personne, pour les vérifier. Un lien de connexion ne sert qu'une fois : ouvert par ce robot, il était déjà usé quand elle cliquait. Depuis le 8 septembre 2026, le lien n'ouvre plus rien tout seul : il affiche une page avec un bouton « Ouvrir mon espace », et c'est son appui qui la connecte. Un robot suit les liens, il n'appuie pas sur les boutons. Demande-lui simplement un nouveau lien depuis « Mon espace » (ou renvoie-lui une invitation depuis sa fiche) : celui-là tiendra. Et si elle préfère, une fois dans son espace, elle peut se choisir un mot de passe pour ne plus dépendre de sa messagerie.",
    lien: { href: '/aide#eleves', label: 'Voir le pas-à-pas' },
  },
  {
    // Valider un essai après la séance, 2026-09-08 (retour Maude : « doit
    // pouvoir accepter après le cours »). AJOUTÉE EN FIN de liste.
    q: "Je n'ai pas validé une demande de cours d'essai avant la séance, mais la personne est venue : je peux encore l'accepter ?",
    a: "Oui. Dans « Cours d'essai », la demande porte la mention « Séance passée » mais garde son bouton Valider. Un message te demande de confirmer, puis IziSolo crée sa fiche (statut prospect) et l'inscrit sur cette séance passée, exactement comme si tu l'avais validée à temps. Deux différences : aucun email « cours d'essai confirmé » ne lui est envoyé (ce serait absurde après coup), et c'est à toi de la pointer présente depuis la séance si tu veux que sa venue compte dans son historique. Si elle n'est pas venue, refuse plutôt la demande avec un mot gentil et propose-lui un autre créneau.",
    lien: { href: '/aide#cours-essai', label: 'Voir le pas-à-pas' },
  },
  {
    // Places d'une série entière, 2026-09-09 (retour Maude : passer « Yoga
    // enfants » de 8 à 13 places, impossible autrement que séance par
    // séance). AJOUTÉE EN FIN de liste.
    q: "J'ai changé le nombre de places sur une séance, mais les autres séances de la série n'ont pas bougé",
    a: "C'est normal : le crayon d'une séance ne modifie que cette séance, pour que tu puisses ouvrir une grande salle un jour donné sans toucher au reste. Pour changer les places de toute la série, ouvre n'importe quelle séance de la série, clique sur « Modifier toute la série » et renseigne « Places max (toute la série) ». Toutes les séances à venir prennent le nouveau nombre, et les séances que tu ajouteras plus tard en rallongeant la série naîtront avec lui. Les séances passées ne changent pas. Si une séance a déjà plus d'inscrites que le nouveau nombre, l'aperçu te prévient avant de confirmer : personne n'est retiré, elle reste simplement complète jusqu'à ce qu'une place se libère.",
    lien: { href: '/aide#agenda', label: 'Voir le pas-à-pas' },
  },
  {
    // Rétablir une séance annulée, 2026-09-09 (retour Maude : deux séances de
    // séries annulées qu'elle voulait remettre). AJOUTÉE EN FIN de liste.
    q: "J'ai annulé une séance de ma série récurrente et je veux la remettre : comment faire ?",
    a: "Ouvre la séance annulée (elle est toujours sur ton agenda, barrée) et clique sur « Rétablir cette séance ». Elle redevient normale, dans sa série, avec le même horaire, sans doublon. Si des élèves y étaient encore inscrites, elles reçoivent un email « séance maintenue » ; les carnets ne bougent pas, c'est le pointage qui fera le décompte, comme d'habitude. Le même geste existe dans Cours récurrents : la case rouge barrée du calendrier porte un bouton ↺. Deux choses à ne pas faire : recréer la séance à la main (tu obtiendrais une séance orpheline, hors série, à côté de l'annulée) et rallonger la série en espérant qu'elle revienne (« Ajuster la série » ne recrée jamais une date déjà occupée, il te renvoie vers le calendrier). Une séance passée ne se rétablit pas.",
    lien: { href: '/aide#agenda', label: 'Voir le pas-à-pas' },
  },
  {
    // Changer d'outil, 2026-09-10 : la page publique « déjà équipée ? » promet
    // la reprise des élèves, des carnets (séances restantes) et du planning.
    // Cette entrée dit à la prof CE QU'ELLE PEUT FAIRE ELLE-MÊME et ce que
    // Maude fait pour elle. AJOUTÉE EN FIN de liste.
    q: "Je viens d'une autre appli : comment récupérer mes élèves, leurs carnets et mon planning ?",
    a: "Tes élèves : exporte ta liste depuis ton ancien outil (CSV ou Excel), puis page Élèves → « Importer ». IziSolo reconnaît les colonnes, garde les accents, fusionne les doublons et n'écrase jamais une fiche. Tes carnets : crée tes offres, puis sur chaque fiche « Ajouter une offre » et, dans « Modifier les séances déjà faites », pose le nombre de séances déjà utilisées pour que le compteur reparte juste. Ton planning : crée chaque cours en série (jour, heure, lieu, places, vacances sautées). Si tu préfères que ce soit fait pour toi, envoie-nous ton export, ton planning et les séances restantes de chaque carnet depuis izisolo.fr/changer-d-outil : Maude monte le tout en 48 h, gratuitement. Ce qui ne se reprend pas : l'historique des paiements et des présences de ton ancien outil, garde-en une copie avant de le fermer.",
    lien: { href: '/aide#eleves', label: 'Voir le pas-à-pas' },
  },
];
