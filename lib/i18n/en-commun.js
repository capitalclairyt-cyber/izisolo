/**
 * lib/i18n/en-commun.js — traductions ANGLAISES du portail élève, groupe
 * « commun » : l'en-tête, le pied, l'accueil d'un compte sans fiche, et les
 * mots qui reviennent sur plusieurs écrans.
 * Clé = la phrase FRANÇAISE exacte passée à t(), valeur = l'anglais.
 * Variables : {n}, {studio}, {date}… identiques des deux côtés.
 * Jamais de tiret cadratin. Verrou : tests/e2e/i18n-portail.spec.js.
 */
const EN = {
  // En-tête et pied (PortailLayoutClient)
  'Messages ({n} non lus)': 'Messages ({n} unread)',
  'Messages': 'Messages',
  'Mes messages': 'My messages',
  'Mon espace': 'My account',
  'Propulsé par': 'Powered by',
  'Confidentialité': 'Privacy',

  // Accueil d'un compte connecté sans fiche (EspaceClient)
  'Bienvenue sur {studio} !': 'Welcome to {studio}!',
  'Tu es connecté·e avec': 'You are signed in as',
  "Il te reste une étape : choisis une séance et réserve ta place.": 'One step left: pick a class and book your spot.',
  'En ligne': 'Online',
  'Réserver': 'Book',
  'Voir toutes les séances': 'See all classes',
  'Voir les cours disponibles': 'See available classes',

  // Mots communs
  'Retour aux cours': 'Back to classes',
  'Fermer': 'Close',
  'Annuler': 'Cancel',
  'Enregistrer': 'Save',
  'Se déconnecter': 'Sign out',
  'min': 'min',
  'Complet': 'Full',
};

export default EN;
