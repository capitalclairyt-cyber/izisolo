/**
 * content/faq-logiciel.js — les FAQ des pages SEO catégorie-produit.
 *
 * SOURCE UNIQUE, lue à deux endroits qui ne doivent jamais diverger :
 *   - la page serveur, qui en fait un schema FAQPage (getFAQSchema de lib/seo)
 *   - le composant client, qui les affiche en <details>
 * Un schema qui annonce une question absente de la page est un signal trompeur
 * pour Google, et c'est le genre d'écart qui s'installe quand on tient deux
 * listes à la main.
 *
 * RÈGLE : on ne répond ici que ce que le produit fait VRAIMENT aujourd'hui.
 * Chaque affirmation ci-dessous est adossée à du code livré, pas à la roadmap.
 */

export const FAQ_LOGICIEL = [
  {
    q: "Quelle différence avec un tableur ou un carnet papier ?",
    r: "Un tableur ne fait rien tout seul. Il ne pointe pas les présences, ne décompte pas le carnet d'une élève quand elle vient, ne prévient personne quand un cours est annulé, et ne laisse personne réserver. IziSolo fait ces quatre choses, et surtout il garde le lien entre elles : une élève pointée présente voit sa carte se décrémenter, et son solde apparaît là où tu en as besoin. C'est ce lien qui disparaît le jour où le tableur grossit.",
  },
  {
    q: "Mes élèves doivent-elles créer un compte ?",
    r: "Non. Ton portail public est une page à ton adresse où elles voient ton planning et réservent, sans compte ni mot de passe. Celles qui le souhaitent peuvent avoir un espace personnel, avec leur historique, leurs carnets et leurs paiements, mais ce n'est jamais un préalable pour réserver une séance.",
  },
  {
    q: "Combien ça coûte, et qu'est-ce qui est inclus ?",
    r: "Deux plans, sans engagement. Essentiel à 15 €/mois couvre toute ta gestion : agenda, élèves, carnets, encaissements, factures, livre des recettes et export comptable. Complet à 29 €/mois ajoute la boucle élève, c'est-à-dire la réservation en ligne, l'espace élève, le paiement en carte, la messagerie et les cours d'essai. Quatorze jours d'essai sans carte bancaire, et le code LANCEMENT50 enlève la moitié du prix pendant trois mois.",
  },
  {
    q: "J'enseigne dans plusieurs salles, est-ce que ça suit ?",
    r: "Oui, et c'est prévu dès le premier plan. Chaque séance porte son propre lieu et sa propre capacité : six places sur le créneau du mardi dans une petite salle, vingt le jeudi dans une autre. Tes élèves voient le lieu sur la séance qu'elles réservent, ce qui règle le problème le plus banal et le plus coûteux, celui de la personne qui se présente au mauvais endroit.",
  },
  {
    q: "Et si je pars, est-ce que je récupère mes données ?",
    r: "Oui, et sans rien demander à personne. L'export de ta base élèves est un bouton sur la page Élèves, disponible sur tous les plans et même si ton abonnement est arrêté, parce que ce sont tes données. L'export de tes encaissements se fait depuis la page Revenus, avec les filtres que tu veux.",
  },
  {
    q: "Je suis seule, est-ce que ce n'est pas surdimensionné ?",
    r: "C'est l'inverse du projet. IziSolo n'est pas un logiciel de salle de sport allégé, il a été écrit pour une personne qui enseigne seule et qui n'a pas de secrétariat derrière elle. Il n'y a ni module à activer, ni paramétrage obligatoire avant de commencer : tu crées un cours, tu ajoutes des élèves, et le reste vient quand tu en as besoin.",
  },
];

export const FAQ_COMPTA = [
  {
    q: "IziSolo est-il un logiciel de comptabilité ?",
    r: "Non, et c'est une distinction qui compte. Un logiciel de comptabilité tient un plan comptable, des écritures en partie double et produit un bilan : c'est l'outil de ton expert-comptable si tu es au réel ou en société. IziSolo tient ce que la micro-entreprise réclame réellement, c'est-à-dire le registre de tes recettes, tes factures et le montant à déclarer. Si tu es en micro-entreprise, c'est justement tout ce que la loi te demande.",
  },
  {
    q: "Qu'est-ce que le livre des recettes, et pourquoi il compte ?",
    r: "C'est le registre chronologique de tout ce que tu encaisses, et c'est le document qu'on te réclame en cas de contrôle si tu es en micro-entreprise. Il doit porter la date, la référence de la pièce, l'origine de la recette, le montant et le mode de règlement. IziSolo le génère à la demande, en PDF paginé ou en CSV, avec les totaux par mois et une référence pour chaque ligne : le numéro de facture quand il y en a une, un identifiant d'encaissement sinon.",
  },
  {
    q: "Puis-je éditer une vraie facture, avec mon numéro d'entreprise ?",
    r: "Oui, dès que tu as renseigné ton numéro d'entreprise dans tes paramètres. La facture porte alors une numérotation séquentielle par année, tes mentions légales, et elle est figée à l'émission : la retélécharger six mois plus tard rend exactement le même document, avec le même numéro. C'est ce qui fait la différence quand une élève doit se faire rembourser par son comité d'entreprise, qui refuse un simple reçu. Une facture émise par erreur s'annule, son numéro est marqué annulé et n'est jamais réattribué.",
  },
  {
    q: "Comment est calculé le montant de ma déclaration URSSAF ?",
    r: "À la date où l'argent est réellement rentré, pas à la date de la vente. La micro-entreprise déclare en trésorerie : un chèque encaissé le 3 octobre pour un carnet vendu le 28 septembre appartient au quatrième trimestre, pas au troisième. IziSolo compte donc sur la date d'encaissement, affiche le montant arrondi à l'euro comme le formulaire l'attend, avec un bouton pour le copier, et calcule ton échéance. Si tu as renseigné ton taux, il estime aussi tes cotisations.",
  },
  {
    q: "J'encaisse des choses que je déclare ailleurs, comment faire ?",
    r: "Une case sur chaque encaissement le sort de ta déclaration, de ton livre des recettes et de ta base déclarée, tout en le gardant dans IziSolo : l'élève garde son historique, son carnet garde son décompte, et la facture éventuelle reste valable. Règle que nous nous imposons : tout document qui écarte des lignes dit combien il en écarte et pour quel montant. Un registre muet sur ses exclusions se prétend complet alors qu'il ne l'est pas.",
  },
  {
    q: "Mon expert-comptable peut-il récupérer mes chiffres ?",
    r: "Oui. L'export comptable sort en CSV, filtrable par période, par état, par mode de règlement et par offre, avec une ligne de total, une colonne par mois et un récapitulatif qui reprend ton identité, la période et les ventilations. Il est inclus dès le plan Essentiel à 15 €, parce qu'une obligation légale n'a pas à dépendre du niveau d'abonnement.",
  },
  {
    q: "Je n'exerce pas en France, est-ce que ça marche ?",
    r: "En partie, et l'app le dit franchement. La Belgique et le Luxembourg sont servis : ton numéro d'entreprise porte le bon nom, la bonne validation et la bonne mise en forme, et tes factures l'impriment correctement. En revanche tout le volet déclaration URSSAF s'éteint, parce qu'il ne correspond à aucune obligation chez toi, et l'écran te renvoie vers ta caisse d'assurances sociales. Les factures, le livre des recettes et l'export continuent de servir.",
  },
];
