/**
 * lib/i18n/en-emails.js — traductions ANGLAISES du portail élève, groupe « emails ».
 * Clé = la phrase FRANÇAISE exacte passée à t(), valeur = l'anglais.
 * Variables : {n}, {studio}, {date}… identiques des deux côtés.
 * Jamais de tiret cadratin. Verrou : tests/e2e/i18n-portail.spec.js.
 *
 * Couvre : l'email du lien de connexion (lib/portail-magic-link), l'email de
 * confirmation de réservation et les messages d'erreur que les routes
 * /api/portail-login et /api/portail/[slug]/reserver renvoient à l'écran.
 * Les autres emails du portail (rappel J-1, annulation, essai, liste
 * d'attente, règles métier) restent en français : hors périmètre pour l'instant.
 */
const EN = {
  // ── Communs aux deux emails ──────────────────────────────────────────────
  'Bonjour {prenom}': 'Hello {prenom}',
  'Bonjour': 'Hello',
  'Accéder à mon espace': 'Open my account',

  // ── L'email du lien de connexion (lib/portail-magic-link) ────────────────
  'ton espace': 'your account',
  'Ton lien de connexion · {studio}': 'Your sign-in link · {studio}',
  "Ton espace élève t'attend !": 'Your account is ready!',
  "Voici ton accès direct à l'espace élève de {studio}.": 'Here is your direct link to your account at {studio}.',
  "Tu pourras voir tes cours réservés, t'inscrire à de nouveaux créneaux et garder un œil sur ton carnet de séances.": 'You can see the classes you have booked, sign up for new ones and keep an eye on your class pass.',
  "Ce lien te connecte automatiquement, sans mot de passe. Il expire dans 1 heure. Si tu n'as rien demandé, ignore simplement cet email.": 'This link signs you in automatically, no password needed. It expires in 1 hour. If you did not ask for it, you can simply ignore this email.',
  'À très vite, {prof}': 'See you soon, {prof}',
  'À très vite': 'See you soon',
  'Envoyé via {izisolo} de la part de {studio}': 'Sent via {izisolo} on behalf of {studio}',

  // Erreurs de sendPortailMagicLink et de /api/portail-login
  'Email invalide': 'Invalid email address',
  'Studio manquant': 'Missing studio',
  'Envoi email non configuré': 'Email sending is not set up',
  'Erreur lors de la génération du lien': 'The link could not be generated',
  'Studio introuvable': 'Studio not found',
  'Ce studio': 'This studio',
  "{studio} n'a pas activé l'espace élève en ligne : contacte-le directement.": '{studio} has not enabled the online student account: please get in touch with them directly.',
  'Erreur serveur': 'Server error',

  // ── Les refus de /api/portail/[slug]/reserver (toasts) ───────────────────
  'JSON invalide': 'Invalid request',
  'Données invalides': 'Invalid details',
  'Cours introuvable': 'Class not found',
  'Ce cours est annulé': 'This class has been cancelled',
  "La réservation en ligne n'est pas activée pour ce studio — contacte-le directement.": 'Online booking is not enabled for this studio: please get in touch with them directly.',
  'Ce cours a déjà commencé': 'This class has already started',
  'Ce cours est sur invitation.': 'This class is by invitation only.',
  'Ce cours est réservé à certain·es élèves du studio.': 'This class is reserved for some of the studio\'s students.',
  'Ce cours est complet': 'This class is full',
  "Une fiche à ce nom existe déjà chez {studio}, avec une autre adresse email. Réserve avec l'adresse utilisée la première fois — ou contacte directement ton studio pour être inscrit·e.": 'Someone with this name is already registered at {studio}, with a different email address. Book with the address you used the first time, or get in touch with your studio directly to be signed up.',
  'Erreur lors de la création du profil': 'Your profile could not be created',
  'Tu es déjà inscrit·e à ce cours': 'You are already booked for this class',
  "{studio} demande une adhésion à jour pour réserver ses cours. Prends ton adhésion auprès de l'association, et reviens réserver.": '{studio} asks for a current membership to book its classes. Join the association, then come back to book.',
  "L'association": 'The association',
  '{n} séances': '{n} classes',
  '{n} séance': '{n} class',
  '{n} cours réservés': '{n} classes booked',
  '{n} cours réservé': '{n} class booked',
  'Ton abonnement inclut {seances} par semaine. Tu as déjà {reserves} cette semaine-là.': 'Your membership includes {seances} per week. You already have {reserves} that week.',
  'Tu dois avoir un carnet ou un abonnement actif pour réserver. Contacte ton studio pour acheter un carnet.': 'You need an active class pass or membership to book. Get in touch with your studio to buy a class pass.',
  'Ton carnet expirera avant la date de ce cours. Renouvelle-le ou contacte ton studio.': 'Your class pass will expire before this class. Renew it or get in touch with your studio.',
  'Erreur lors de la réservation : {message}': 'Booking failed: {message}',

  // ── L'email de confirmation de réservation ───────────────────────────────
  'Réservation confirmée — {cours}': 'Booking confirmed: {cours}',
  'Réservation confirmée !': 'Booking confirmed!',
  'Ta place est réservée pour :': 'Your spot is booked for:',
  'Voir mon espace': 'Go to my account',
  'Ce lien te connecte automatiquement. Il expire dans 1 heure.': 'This link signs you in automatically. It expires in 1 hour.',
  'Cours à régler à la séance': 'Pay-per-class session',
  'Tarif : {montant} € — tu peux régler ta place en ligne dès maintenant :': 'Price: €{montant}. You can pay for your spot online right now:',
  '💳 Régler ma place par CB': '💳 Pay for my spot by card',
  'Tarif : {montant} € — à régler directement avec ton studio.': 'Price: €{montant}, to be paid directly to your studio.',
  'Annulation flexible': 'Flexible cancellation',
  "Tu peux annuler depuis ton espace jusqu'à {h}h avant la séance.": 'You can cancel from your account up to {h} hours before the class.',
  'Annulation': 'Cancellation',
  'Pour toute annulation, contacte directement ton studio.': 'To cancel, please get in touch with your studio directly.',
};

export default EN;
