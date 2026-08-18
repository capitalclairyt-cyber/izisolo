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
export const FAQ_SUPPORT = [
  {
    q: "Comment créer un cours qui se répète chaque semaine ?",
    a: "Va dans Cours & Évènements → « Créer un cours », choisis une fréquence (hebdomadaire, tous les 15 jours, mensuelle) et une date de fin : IziSolo génère toutes les séances d'un coup. Pour prolonger une série qui se termine (rentrée, nouveau trimestre), ouvre l'écran des cours récurrents et clique sur l'icône 📅+ de la série.",
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
    q: "Comment faire payer un abonnement en plusieurs fois ?",
    a: "Le paiement en plusieurs fois se choisit au moment de la VENTE (pas à la création de l'offre) : fiche élève → « Ajouter une offre » → « En plusieurs fois », ou bouton « Vendre » sur les pages Offres et Carnets & abos. Tu choisis 2× à 10×, le rythme, et chaque versement est modifiable — avec un bouton « Arrondir aux euros ».",
    lien: { href: '/aide#encaisser', label: 'Voir le pas-à-pas' },
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
    q: "Comment exporter mes données ?",
    a: "Page Élèves → « Exporter » : un CSV de toutes tes fiches, disponible quel que soit ton plan. L'export comptable des encaissements se fait depuis Revenus (plan Complet).",
  },
  {
    q: "Comment installer IziSolo sur mon téléphone (sans App Store) ?",
    a: "IziSolo est une appli web installable. Android + Chrome : menu ⋮ → « Installer l'application ». iPhone : bouton Partager → « Sur l'écran d'accueil » (Safari, ou Chrome récent). Une fois installée, tu ouvres depuis l'icône et tu restes connecté·e.",
    lien: { href: '/aide#installer', label: 'Voir le pas-à-pas' },
  },
  {
    q: "Comment gérer mon abonnement IziSolo ?",
    a: "Paramètres → Abonnement IziSolo. Pour une facture ou une question de facturation, écris-nous à bonjour@izisolo.fr — on te répond vite.",
  },
];
