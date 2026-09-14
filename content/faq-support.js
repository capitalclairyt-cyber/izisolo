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
  {
    // Freemium, 2026-09-13 (décision Colin : Essentiel passe à 0 €). La
    // question que pose toute prof dont l'essai se termine. AJOUTÉE EN FIN.
    q: "Mon essai est terminé : est-ce que je perds mes données, ou est-ce que je dois payer pour continuer ?",
    a: "Ni l'un ni l'autre. À la fin des 30 jours, tu passes sur Essentiel, qui est gratuit, sans carte bancaire et sans limite de temps : tes élèves, ton agenda, tes carnets, tes encaissements, tes factures et ta déclaration URSSAF continuent de marcher exactement pareil, et tu peux toujours tout exporter. Ce que tu perds, c'est ce que tes élèves faisaient en ligne pendant l'essai : réserver, annuler, payer par carte, recevoir leurs rappels, te parler dans la messagerie. Pour le garder, c'est Complet à 29 € par mois, sans engagement, résiliable en un clic ; et si tu résilies un jour, tu retombes sur Essentiel, jamais sur un compte bloqué. Le seul cas où IziSolo bloque les nouvelles saisies, c'est une facture d'abonnement restée impayée après les relances de Stripe. Pour que la fin ne te surprenne pas, ton menu affiche dès le premier jour « Essai Complet · J-x » et une petite étiquette « Complet » sur chaque fonction concernée ; tu reçois aussi un email trois jours puis la veille de la fin.",
    lien: { href: '/aide#abonnement', label: 'Voir le pas-à-pas' },
  },
  {
    // Plans Association et Studio, 2026-09-13. Le RNA est le garde-fou du
    // plan Association. AJOUTÉE EN FIN.
    q: "Je gère une association ou un studio avec plusieurs profs : quel plan, et pourquoi on me demande un numéro RNA ?",
    a: "Deux plans existent pour les structures à plusieurs profs, tous deux avec profs illimitées et un forfait fixe : Association à 39 € par mois et Studio à 59 € par mois, ou à l'année avec deux mois offerts (390 € et 590 €). Ils contiennent tout Complet plus l'équipe : chaque prof a son accès et ses droits, et tu dis qui donne quelle séance. Le plan Association est réservé aux associations déclarées : IziSolo te demande ton numéro RNA (la lettre W suivie de neuf chiffres, sur ton récépissé de préfecture) à la création de ton espace ou dans Paramètres → Studio & lieux → Ma structure. C'est ce qui permet de proposer un tarif plus bas aux assos sans qu'un studio commercial se déclare association pour l'obtenir. Tu peux essayer ton plan 30 jours sans carte, puis tu choisis ; si tu ne prends rien, ton espace reste ouvert sur Essentiel, gratuit, et les profs invitées retrouvent leur place dès que l'abonnement reprend.",
    lien: { href: '/aide#equipe', label: 'Voir le pas-à-pas' },
  },
  {
    // Le lien permanent d'une intervenante sans compte (v111, lot 1
    // Associations & Studios, 2026-09-13). AJOUTÉE EN FIN.
    q: "Une de mes profs ne veut pas créer de compte : comment peut-elle pointer ses séances ?",
    a: "Invite-la quand même depuis Équipe (son email, son prénom), puis sur sa ligne clique « Créer son lien (sans compte) ». Tu obtiens un lien permanent, affiché une seule fois : copie-le et envoie-le-lui par SMS ou message. En l'ouvrant sur son téléphone, elle voit ses séances des prochaines semaines (celles où tu l'as désignée intervenante, plus celles que personne n'a prises), elle pointe présent, absent ou excusé, et c'est tout : ni coordonnées, ni carnets, ni paiements. Le lien vaut jusqu'à la fin de la saison ; « Désactiver » le ferme immédiatement, et un nouveau lien remplace l'ancien. Si un jour elle veut son propre IziSolo, il est gratuit : en s'inscrivant avec la même adresse, ton studio apparaît chez elle automatiquement.",
    lien: { href: '/aide#equipe', label: 'Voir le pas-à-pas' },
  },
  {
    // Le pont 1 : faire entrer sa structure (v111). AJOUTÉE EN FIN.
    q: "Je donne des cours dans une association qui n'est pas sur IziSolo : comment l'y faire venir, et est-ce que je garde mon IziSolo à moi ?",
    a: "Les deux vivent côte à côte : ton IziSolo reste le tien (tes élèves, ton agenda, tes encaissements), et l'association a le sien, avec son propre compte. Pour la faire entrer, page Équipe → « Ailleurs » → « Inviter mon asso ou mon studio » : tu saisis son nom et son adresse email (celle de l'association ou de la personne qui la gère, pas la tienne). Elle reçoit un lien ; en ouvrant son espace depuis ce lien, tu y es inscrite comme intervenante sans rien ressaisir, et ses séances où tu es désignée apparaissent dans ton propre IziSolo, en tête de ton Accueil et de ton agenda. Le nom du studio, en haut de ta barre latérale, devient un sélecteur pour basculer de l'une à l'autre. Ce que tu vois chez elle dépend des droits qu'elle te donne ; ses élèves et son argent restent chez elle.",
    lien: { href: '/aide#equipe', label: 'Voir le pas-à-pas' },
  },
  {
    // Lecture seule au downgrade (v111). AJOUTÉE EN FIN.
    q: "Le studio qui m'avait invitée n'a plus son abonnement : j'ai un bandeau « lecture seule », qu'est-ce que ça veut dire ?",
    a: "Le studio a arrêté le plan qui permet de travailler à plusieurs (Association ou Studio). Ta place n'est pas supprimée : tu entres toujours, tu vois tout ce que tu voyais, mais tu ne peux plus rien modifier ni pointer tant que l'abonnement n'a pas repris. Rien à faire de ton côté : préviens simplement la personne qui gère le studio. Ton propre IziSolo, s'il est à toi, n'est pas concerné.",
    lien: { href: '/aide#equipe', label: 'Voir le pas-à-pas' },
  },
  {
    // Le relevé mensuel d'une intervenante (v112, lot 2 Associations &
    // Studios, 2026-09-13). AJOUTÉE EN FIN.
    q: "Comment savoir combien je dois à chacune de mes profs à la fin du mois ?",
    a: "Deux réglages, puis tout se calcule. D'abord, sur chaque séance ou série, « Qui donne cette séance ? » nomme l'intervenante. Ensuite, page Équipe, sur sa ligne, « Convenir » une rémunération : par séance, à l'heure, un pourcentage du chiffre d'affaires de ses séances, ou un forfait mensuel. Page Compta → Relevés, choisis la prof et le mois : IziSolo compte ses séances passées et pointées, leurs présentes, le chiffre d'affaires rattaché (carnets au prorata, séances à l'unité) et le montant dû. Tu peux l'ajuster, le télécharger en PDF, et « Valider le relevé » : ta dépense « Séances de Léa » passe à régler et elle reçoit le relevé par email. Rien n'est inventé : un abonnement illimité n'a pas de prix par séance, le relevé le dit.",
    lien: { href: '/aide#compta', label: 'Voir le pas-à-pas' },
  },
  {
    // La boucle facture v2 → règlement → encaissement chez la prof (v112).
    // AJOUTÉE EN FIN.
    q: "Je donne des cours dans une association qui est sur IziSolo : comment je lui facture mes séances, et où arrive l'argent ?",
    a: "Quand l'association valide ton relevé du mois, il apparaît dans ton propre IziSolo, page Revenus → « Mes prestations ». « Facturer » émet ta facture en un clic, avec le prochain numéro de ta séquence, et l'envoie à l'association en PDF (il te faut avoir renseigné ton SIRET dans Paramètres → Facturation : une facture sans numéro d'entreprise n'en est pas une). Quand l'association clique « Réglée » de son côté, l'encaissement apparaît tout seul dans tes revenus, mode virement, à la date qu'elle a saisie, et ta facture passe « payée ». Cet encaissement compte dans ta déclaration URSSAF comme n'importe quel autre. Tu n'as jamais de lien vers les élèves ni la caisse de l'association : seulement ton relevé et ta facture.",
    lien: { href: '/aide#compta', label: 'Voir le pas-à-pas' },
  },
  {
    // Les dépenses et l'export d'exercice (v112). AJOUTÉE EN FIN.
    q: "Où j'enregistre le loyer de la salle, l'assurance, le matériel, et comment je sors le rapport financier pour l'AG ?",
    a: "Page Compta → Dépenses → « Ajouter une dépense » : quoi, quand, combien TTC, une catégorie, un justificatif (PDF ou photo du ticket), et « à régler » ou « réglée ». Le HT et la TVA sont facultatifs : une association non assujettie n'en a pas. Les tuiles du haut totalisent l'exercice. Compta → Export sort ensuite un seul fichier CSV pour ton trésorier ou ton comptable : les recettes encaissées (à la date d'encaissement), les dépenses avec leurs justificatifs, le récapitulatif par catégorie et le résultat. Pour une association, l'exercice suit la saison, de septembre à août : c'est exactement le rapport financier de ton assemblée générale.",
    lien: { href: '/aide#compta', label: 'Voir le pas-à-pas' },
  },
  {
    // L'adhésion d'une association (v113, lot 3 Associations & Studios,
    // 2026-09-13). AJOUTÉE EN FIN.
    q: "Comment enregistrer les adhésions de mon association, et exiger l'adhésion pour réserver ?",
    a: "Crée d'abord une offre de type « Adhésion » (Offres → Créer ; une offre par tarif : plein, réduit, famille). Puis, sur la fiche de chaque personne, « Enregistrer une adhésion » : la saison (de septembre à août), payée ou à régler, et le mode de règlement. Le reçu de cotisation se télécharge depuis la fiche. Une adhésion ne donne droit à aucune séance : elle ne se décompte jamais au pointage, et elle ne passe pas par le tunnel des carnets. Pour l'exiger, Paramètres → Cas particuliers → « Réservation sans adhésion à jour » → « Bloquer » : la personne reçoit un message clair et prend son adhésion auprès de toi. Par défaut, la réservation est acceptée et la ligne porte un repère « sans adhésion » au pointage, pour régulariser sur place. Page Élèves, « Adhérentes à jour » donne la liste, celle de ton quorum.",
    lien: { href: '/aide#association', label: 'Voir le pas-à-pas' },
  },
  {
    // L'assemblée générale (v113). AJOUTÉE EN FIN.
    q: "Comment convoquer mon assemblée générale et tenir la feuille d'émargement ?",
    a: "Page Association → Assemblées → « Nouvelle assemblée » : type (ordinaire ou extraordinaire), date, heure, lieu, ordre du jour. « Convoquer » envoie la convocation par la messagerie (un message dans l'espace de chaque adhérente et un email) à toutes celles dont l'adhésion est à jour au jour de l'AG, et te rappelle le délai de convocation de tes statuts sans l'imposer. « Feuille d'émargement » ouvre la liste imprimable : nom, signature, pouvoir donné à. Après l'AG, note les présentes et les pouvoirs : le quorum s'affiche en pourcentage des adhérentes à jour, à comparer à ce que tes statuts exigent. Dépose ensuite le PV signé comme document rattaché à l'assemblée. Le vote électronique n'existe pas : il se fait en séance.",
    lien: { href: '/aide#association', label: 'Voir le pas-à-pas' },
  },
  {
    // Les documents d'une association et le bureau (v113). AJOUTÉE EN FIN.
    q: "Où ranger les statuts, le récépissé et le règlement intérieur, et qui peut les voir ?",
    a: "Page Association → Documents : dépose un PDF ou une photo, choisis le type (statuts, récépissé de préfecture, règlement intérieur, assurance, agrément, PV d'assemblée, contrat, autre) et sa date. Pour les documents à version, le dernier déposé devient la version courante et les précédents restent dans l'historique. Toute l'équipe peut les lire ; les déposer ou les retirer demande le droit « Gérer les documents », que la fonction secrétaire propose d'office (Équipe → inviter → sa fonction). Les documents ne sont jamais publics ni visibles des élèves. Pas de signature électronique : un document signé se dépose scanné.",
    lien: { href: '/aide#association', label: 'Voir le pas-à-pas' },
  },
  {
    // Les salles et le chevauchement (v114, lot 4 Associations & Studios,
    // 2026-09-13). AJOUTÉE EN FIN.
    q: "Mon studio a plusieurs salles : comment éviter que deux cours tombent dans la même salle au même moment ?",
    a: "Paramètres → Studio & lieux : sur ton lieu, « Ajouter une salle » (nom, capacité). Ensuite, en créant un cours, une série ou en modifiant une séance, choisis la salle dans le sélecteur de lieu (elle apparaît indentée sous son lieu). Dès que deux séances se recouvrent dans la même salle, l'écran refuse en nommant celle qui gêne, et rien n'est écrit : c'est aussi la base qui le garantit. Un lieu sans salle ne bloque jamais (deux profs peuvent y donner cours en même temps). La capacité de la salle est proposée comme « Places max » de la séance.",
    lien: { href: '/aide#studio', label: 'Voir le pas-à-pas' },
  },
  {
    // La marge et l'analyse (v114). AJOUTÉE EN FIN.
    q: "Comment connaître la marge d'un cours, et ce que me rapporte chaque salle ou chaque intervenante ?",
    a: "Compta → Analyse (plan Studio). L'écran recalcule tout à la lecture : recettes, dépenses et résultat par mois, par salle, par intervenante et par type de cours, la TVA déductible par taux, et la marge de chaque séance (son chiffre d'affaires, celui du relevé : séance payée à l'unité ou prix du carnet au prorata, moins le coût de l'intervenante selon ce qui est convenu avec elle et les dépenses rattachées à la séance). Rien n'est inventé : sans rémunération convenue, la marge reste vide, et une recette qui ne se rattache à aucune séance (une adhésion, un carnet jamais pointé) compte dans le mois, pas dans une salle. « Exporter l'analyse (CSV) » pour ton comptable.",
    lien: { href: '/aide#studio', label: 'Voir le pas-à-pas' },
  },
  {
    // Le relevé automatique et le contrat (v114). AJOUTÉE EN FIN.
    q: "Mes intervenantes peuvent-elles recevoir leur relevé de séances sans que je le fasse à la main chaque mois ?",
    a: "Oui : Compta → Relevés, coche « Envoyer chaque relevé tout seul le 1er du mois ». Dans les premiers jours de chaque mois, chaque intervenante active reçoit par email le relevé de ses séances du mois passé, en PDF, une seule fois ; un relevé sans séance ne part pas. Tu valides ensuite le relevé comme d'habitude (c'est la validation qui crée la prestation et la dépense). Son contrat de prestation se dépose sur sa ligne de la page Équipe (« Contrat », PDF ou photo scannée) : pas de signature électronique.",
    lien: { href: '/aide#studio', label: 'Voir le pas-à-pas' },
  },
  {
    // Les portails qui se citent (v115, lot 5 Associations & Studios,
    // 2026-09-13). AJOUTÉE EN FIN.
    q: "Je donne aussi des cours dans une association qui est sur IziSolo : nos pages peuvent-elles se citer ?",
    a: "Oui, si tu le décides : page Équipe → volet « Ailleurs » → sur la structure, coche « Relier nos pages ». Ta page publique affiche alors « Je donne aussi des cours à … » avec le lien, et sur la page de la structure ta carte d'équipe propose « Sa page » vers la tienne. Rien n'est relié tant que tu ne coches pas, et tu décoches quand tu veux. Chaque intervenante a aussi sa page sur le portail de la structure (son nom dans « L'équipe »), avec sa bio, sa photo et ses prochaines séances.",
    lien: { href: '/aide#equipe', label: 'Voir le pas-à-pas' },
  },
  {
    // Le hub de l'élève (pont 6). AJOUTÉE EN FIN.
    q: "Une élève suit mes cours et ceux d'un autre studio sur IziSolo : elle a deux comptes ?",
    a: "Non, un seul : la même adresse email ouvre l'espace de chaque studio. Dès qu'elle est inscrite dans deux studios, son espace lui propose « Mes studios » (izisolo.fr/mes-studios) : tous ses studios, ses prochaines séances toutes structures confondues, une entrée vers chaque espace. Ses carnets, ses paiements et ses messages restent propres à chaque studio : tu ne vois jamais ce qu'elle fait ailleurs.",
    lien: { href: '/aide#eleves', label: 'Voir le pas-à-pas' },
  },
  {
    // Encaisser après coup en plusieurs moyens (2026-09-14, retour Maude :
    // l'abonnement de Marie-Pierre vendu « à régler plus tard », réglé en
    // deux chèques le mois suivant). AJOUTÉE EN FIN.
    q: "J'ai vendu un abonnement « à régler plus tard » et l'élève me règle en deux chèques : comment je l'enregistre ?",
    a: "Sur sa fiche (onglet Paiements) ou dans Revenus → « À percevoir », clique « Encaisser » sur la ligne en attente, puis « Plusieurs moyens ou plusieurs chèques ». Tu saisis chaque chèque avec son montant, son numéro et sa date d'encaissement (ou espèces + CB, jusqu'à quatre moyens) : chaque moyen fait sa propre ligne dans ta compta et le total doit tomber juste, sinon rien n'est enregistré. La vente reste la même, rien à supprimer ni à recréer. « Encaisser un versement » sur la carte de l'abonnement sert à un règlement qui arrive EN PLUS de ce qui était prévu : si une ligne attend déjà, la modale te propose de l'encaisser à la place, pour ne pas compter l'argent deux fois.",
    lien: { href: '/aide#encaisser', label: 'Voir le pas-à-pas' },
  },
];
