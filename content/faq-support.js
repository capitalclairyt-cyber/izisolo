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
    q: "Le carnet ne s'est pas décompté (ou pas sur le bon carnet) — comment corriger ?",
    a: "Au pointage, ouvre le menu ··· sur la ligne de l'élève : « Décompter sur » te laisse choisir le bon carnet, ou repasser la séance « À l'unité ». Le compteur se corrige immédiatement.",
  },
  {
    q: "Comment inviter mes élèves sur leur espace en ligne ?",
    a: "Page Élèves → « Inviter » (ou depuis une fiche) : chaque élève reçoit un lien d'accès à son espace — réservations, carnet, messages. Et après un import CSV, l'écran de fin te propose d'inviter tout le monde en un clic.",
    lien: { href: '/aide#eleves', label: 'Voir le pas-à-pas' },
  },
  {
    q: "Comment vendre un carnet ou un abonnement à une élève ?",
    a: "Crée d'abord ton offre dans Offres (carnet 10 séances, abo mensuel…). Puis fiche élève → « Ajouter une offre » : payé maintenant, à régler plus tard, ou en plusieurs fois — les montants dus t'attendent dans Revenus, section « À percevoir ».",
    lien: { href: '/aide#encaisser', label: 'Voir le pas-à-pas' },
  },
  {
    q: "Comment modifier une seule séance sans toucher au reste de la série ?",
    a: "Ouvre la séance → icône crayon : la modification ne s'applique qu'à cette séance. Pour changer l'horaire ou le lieu de toutes les séances, utilise « Modifier toute la série » dans le bandeau.",
    lien: { href: '/aide#agenda', label: 'Voir le pas-à-pas' },
  },
  {
    q: "J'ai annulé une séance mais elle s'affiche encore sur l'agenda — c'est normal ?",
    a: "Oui : une séance annulée reste visible, barrée — c'est ce qui informe tes élèves du changement (ils sont aussi prévenus par email). Pour la faire disparaître complètement, utilise la corbeille sur sa page. Attention, l'annulation est définitive : une séance annulée ne se ré-active pas.",
    lien: { href: '/aide#agenda', label: 'Voir le pas-à-pas' },
  },
  {
    // Demandé 2× dans les feedbacks (19-20/07) — enfin une réponse écrite.
    q: "Comment faire apparaître le lieu d'une séance ?",
    a: "Le lieu se choisit sur le cours : à la création, ou après coup via l'icône crayon (cette séance) / « Modifier toute la série » (toutes). Tes lieux se gèrent dans Paramètres → Profil & studio → Lieux — ils sont illimités. Une fois posé, le lieu s'affiche sur l'agenda, le portail et les emails à tes élèves.",
    lien: { href: '/aide#agenda', label: 'Voir le pas-à-pas' },
  },
  {
    q: "Comment faire payer un abonnement en plusieurs fois ?",
    a: "Le paiement en plusieurs fois se choisit au moment de la VENTE (pas à la création de l'offre) : fiche élève → « Ajouter une offre » → « En plusieurs fois », ou bouton « Vendre » sur les pages Offres et Carnets & abos. Tu choisis 2× à 10× et le rythme, puis chaque versement se règle ligne par ligne : sa date, son montant, la case « Payé » s'il est déjà encaissé, avec son propre mode de règlement. Le bouton « Arrondir aux euros » supprime les centimes.",
    lien: { href: '/aide#encaisser', label: 'Voir le pas-à-pas' },
  },
  {
    q: "Puis-je modifier une offre déjà vendue ?",
    a: "Oui : page Offres → icône crayon. La modification vaut pour les PROCHAINES ventes — les carnets déjà vendus gardent leurs conditions, figées à l'achat (prix, cours couverts, validité). Pour corriger un carnet précis : fiche de l'élève → « Modifier » sur la carte du carnet.",
    lien: { href: '/aide#carnets-abos', label: 'Voir le pas-à-pas' },
  },
  {
    q: "Comment archiver ou supprimer une fiche élève ?",
    a: "Archiver (recommandé) : liste Élèves → statut de la fiche → « Archivé » — elle est masquée mais tout est conservé, réactivable à tout moment. Supprimer (fiche → corbeille) est irréversible : carnets, présences et inscriptions partent avec ; seuls les paiements encaissés restent dans ta compta.",
  },
  {
    q: "Où je règle mon délai d'annulation et mes règles (absences, retards…) ?",
    a: "Paramètres → Règles : délai d'annulation, absence non prévenue, annulation tardive… Tes élèves voient la règle au moment d'annuler, et les cas ambigus remontent dans « À traiter » pour que tu tranches.",
    lien: { href: '/aide#regles-annulation', label: 'Voir le pas-à-pas' },
  },
  {
    q: "Une élève me demande une facture pour son CSE ou son employeur — comment faire ?",
    a: "Renseigne ton SIRET une fois pour toutes : Paramètres → Profil & studio → Activité, carte « Facturation ». Ensuite chaque paiement réglé produit une vraie facture acquittée numérotée — l'élève la télécharge elle-même depuis son espace, et toi depuis sa fiche. Sans SIRET, c'est un reçu de paiement simple.",
    lien: { href: '/aide#factures', label: 'Voir le pas-à-pas' },
  },
  {
    q: "Comment prévenir tous mes élèves d'un coup (rentrée, changement de salle…) ?",
    a: "Messagerie → « Annoncer » : choisis les destinataires (tous, les inscrit·es d'un cours, les détenteurs d'une offre, ou une sélection libre), écris ton message, et chacune reçoit un email avec le lien pour répondre.",
    lien: { href: '/aide#messagerie', label: 'Voir le pas-à-pas' },
  },
  {
    q: "Comment exporter mes données (élèves, compta) ?",
    a: "Page Élèves → « Exporter » : un CSV de toutes tes fiches, disponible quel que soit ton plan. Pour ta compta (plan Complet) : Revenus → « Export » ouvre une modale où tu choisis la période (préréglée ou dates libres), l'état, le mode de règlement et l'offre — le CSV s'ouvre directement dans Excel.",
  },
  {
    // Cas Patricia 2026-08-18 : une prof crée un compte élève avec son adresse
    // perso, sa session bascule, et croit son studio disparu.
    q: "J'ai créé un compte élève et je ne retrouve plus mon compte pro — perdu ?",
    a: "Rien n'est perdu ! Un compte élève et un compte studio sont deux comptes séparés (deux adresses email). Ton navigateur est simplement resté connecté au compte élève : déconnecte-toi (bouton « Changer de compte » ou Déconnexion), puis reconnecte-toi sur izisolo.fr/login avec l'adresse email de ton studio et ton mot de passe. Ton studio et toutes tes données sont intacts.",
  },
  {
    q: "Comment installer IziSolo sur mon téléphone (sans App Store) ?",
    a: "IziSolo est une appli web installable. Android + Chrome : menu ⋮ → « Installer l'application ». iPhone : bouton Partager → « Sur l'écran d'accueil » (Safari, ou Chrome récent). Une fois installée, tu ouvres depuis l'icône et tu restes connecté·e.",
    lien: { href: '/aide#installer', label: 'Voir le pas-à-pas' },
  },
  {
    q: "Comment gérer mon abonnement IziSolo ?",
    a: "Paramètres → Abonnement IziSolo. Pour une facture ou une question de facturation, écris-nous depuis ta messagerie (fil « 💬 Équipe IziSolo ») ou à bonjour@izisolo.fr : on te répond vite.",
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
    a: "Configure une fois ta déclaration (Paramètres → Profil & studio → Activité, carte « Ma déclaration URSSAF » : régime, périodicité, taux), puis le bloc « Ma déclaration URSSAF » de la page Revenus affiche le montant de la période close, arrondi à l'euro, avec un bouton Copier. « Voir le détail à l'écran » ouvre la déclaration complète, et « J'ai déclaré ces X € » archive le montant : si ta compta bouge après coup, IziSolo t'affiche l'écart.",
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
    a: "Renseigne-le une fois : Paramètres → Profil & studio → Activité, carte « Règlement par virement » (IBAN vérifié à la saisie). Ensuite, à chaque vente « à régler plus tard », tu choisis l'email qui part tout seul : « Virement (RIB) » envoie ton IBAN avec une référence de virement (pour reconnaître le règlement sur ton relevé), et l'espace de l'élève affiche aussi le RIB avec un QR code à scanner avec son application bancaire. Tu peux aussi régler ça en automatique (carte « Règlement par virement », « il part tout seul »).",
    lien: { href: '/aide#encaisser', label: 'Voir le pas-à-pas' },
  },
  {
    // Vignettes de cours (v99, 2026-08-24).
    q: "Puis-je mettre une photo sur mes cours ?",
    a: "Oui, à deux niveaux. Par type de cours d'abord : Paramètres → Portail public → « Types de cours », tu choisis la couleur de chaque type et tu peux y déposer une photo. Elle habille toutes les séances de ce type, y compris celles que tu créeras plus tard. Et pour un atelier qui mérite son image à lui, la photo se met directement sur la séance, au moment de la créer : elle passe devant celle du type. Sans photo, la couleur suffit, ta page reste lisible.",
    lien: { href: '/aide#apparence-cours', label: 'Voir le pas-à-pas' },
  },
  {
    // Second bloc intégrable (v99, 2026-08-24).
    q: "Puis-je afficher mes tarifs sur mon propre site ?",
    a: "Oui, comme le planning : Paramètres → Portail public → « Ma page », bloc « Et tes offres, si tu veux ». Tu copies une ligne de code et tu la colles dans un bloc HTML de ton site. Tes offres actives s'affichent avec leur prix, et un clic emmène ton élève sur tes tarifs IziSolo où elle peut payer en ligne ou te demander l'offre. Les deux blocs prennent les mêmes couleurs, pour qu'ils aillent ensemble sur ta page.",
    lien: { href: '/aide#page-publique', label: 'Voir le pas-à-pas' },
  },
];
