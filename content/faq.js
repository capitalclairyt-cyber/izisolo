/**
 * content/faq.js — Source unique des questions/réponses FAQ home.
 *
 * Utilisée par :
 *   - components/landing/Sections.js (composant FAQ visuel)
 *   - app/page.js (Schema.org FAQPage pour les rich snippets Google)
 *
 * Chaque entrée doit être courte et autoportante (Google tronque ~300 chars
 * dans les rich snippets). Question = formulée comme un user le ferait dans
 * Google ; Answer = réponse directe sans intro.
 */
export const FAQ_ITEMS = [
  {
    q: 'Combien de temps pour mettre en place IziSolo ?',
    a: "Compte 15 minutes pour créer ton studio, importer tes élèves (CSV ou copier-coller) et caler ton agenda. On t'accompagne par message si tu cales — réponse sous 24 h.",
  },
  {
    q: 'Mes élèves doivent-ils créer un compte ?',
    a: "Non. Ils peuvent réserver et payer sans compte depuis ton portail public (PWA installable sur leur téléphone). On leur envoie un lien magique par email pour retrouver leurs réservations s'ils le souhaitent.",
  },
  {
    q: 'Comment fonctionnent les sondages planning ?',
    a: "Avant la rentrée (ou quand tu veux), tu crées un sondage avec tes créneaux candidats. Tes élèves votent depuis leur espace pour leurs préférences. Tu vois en temps réel les créneaux gagnants, et tu transformes les vainqueurs en cours officiels en deux clics. Plus jamais de planning lancé au pif — tu sais exactement ce qui va remplir.",
  },
  {
    q: 'Et si un cours est complet, comment ça se passe ?',
    a: "Tes élèves peuvent s'inscrire en liste d'attente. Dès qu'une place se libère (annulation, désinscription), IziSolo place automatiquement le suivant et lui envoie un mail de confirmation. Tes créneaux restent toujours pleins, sans que tu aies à courir après personne.",
  },
  {
    q: 'Je peux envoyer des mails ciblés à mes élèves ?',
    a: "Oui, à tous les niveaux. Un message à un élève précis, à tous les inscrits d'un cours, à tous les détenteurs d'un type d'abonnement (les illimités, les carnets de 10…), à tous ceux d'un créneau particulier. Tu peux aussi programmer des relances auto pour les paiements en attente, des rappels avant cours, des messages d'anniversaire.",
  },
  {
    q: 'Et si je veux arrêter ?',
    a: "Annulation en 1 clic, à tout moment, depuis tes paramètres. Tu peux exporter toutes tes données (élèves, séances, paiements, présences) à n'importe quel moment au format CSV.",
  },
  {
    q: 'Comment sont gérés les paiements ?',
    a: "Tu choisis : encaissement manuel (espèces, chèque, virement, CB en présentiel) avec mini-compta intégrée, OU Stripe Payment Link (plan Pro) pour permettre à tes élèves de payer en CB depuis ton portail. Les fonds Stripe arrivent directement sur ton compte bancaire.",
  },
  {
    q: 'Quels sont les frais sur les paiements en ligne ?',
    a: "Frais de fonctionnement IziSolo : 1 % du volume payé en ligne via Stripe (ajoutés à ta facture mensuelle, jamais prélevés sur les paiements de tes élèves). À cela s'ajoutent les frais Stripe standard (1.5 % + 0,25 €) qui vont à Stripe directement.",
  },
  {
    q: 'Comment IziSolo gère un no-show ou un cours annulé ?',
    a: "Tu paramètres tes propres règles métier dans ton tableau de bord : recrédit du carnet, débit, contact prioritaire à l'élève, etc. IziSolo applique automatiquement, et te remonte les cas ambigus dans une inbox « À traiter » dédiée. Aucun cas ne passe à la trappe.",
  },
  {
    q: 'Plusieurs lieux, une équipe : c\'est possible ?',
    a: "Les lieux, oui — illimités sur un seul compte : ton studio, la salle louée du mardi, la visio du samedi, tout reste synchro. Le mode équipe (plusieurs profs sur un même compte) n'est pas encore disponible : il est sur notre roadmap — écris-nous si c'est important pour toi, ça fait remonter la priorité.",
  },
  {
    q: 'Pourquoi pas une app sur l\'App Store ?',
    a: "Par choix. IziSolo est une PWA (Progressive Web App) : ton studio et le portail élève s'installent sur l'écran d'accueil en un tap, sans téléchargement, sans mise à jour manuelle, sans attendre la validation Apple ou Google. Tu as toujours la dernière version. Tes élèves n'ont rien à installer — ils ouvrent un lien et c'est prêt. Et côté toi, ça marche sur téléphone, tablette et ordi sans rien changer.",
  },
];
