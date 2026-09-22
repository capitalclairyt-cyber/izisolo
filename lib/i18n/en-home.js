/**
 * lib/i18n/en-home.js — traductions ANGLAISES du portail élève, groupe « home ».
 * Clé = la phrase FRANÇAISE exacte passée à t(), valeur = l'anglais.
 * Variables : {n}, {studio}, {date}… identiques des deux côtés.
 * Jamais de tiret cadratin. Verrou : tests/e2e/i18n-portail.spec.js.
 *
 * Couvre : PortailHome (l'accueil du portail), page.js (ses metadata),
 * BottomNav, not-found, EspaceIndisponible et la page d'une intervenante.
 * Les mots partagés (Réserver, En ligne, Complet, min, Mon espace, Messages…)
 * vivent dans en-commun.js et ne sont pas redéclarés ici.
 */
const EN = {
  // Metadata de l'accueil (page.js)
  'Studio introuvable': 'Studio not found',
  '{studio} · Réserver un cours': '{studio} · Book a class',
  '{metier} à {ville}. Réserve tes cours en ligne.': '{metier} in {ville}. Book your classes online.',

  // Dates et jauges (PortailHome)
  "Aujourd'hui": 'Today',
  'Demain': 'Tomorrow',
  '{n} places': '{n} spots left',
  '{n} place': '{n} spot left',
  'Places disponibles': 'Spots available',

  // Ce qu'une offre donne droit à faire (miroir de lib/offres-seances)
  '{n} séances au total, {c} par semaine maximum': '{n} classes in total, up to {c} a week',
  '{n} séance au total, {c} par semaine maximum': '{n} class in total, up to {c} a week',
  '{n} séances au total': '{n} classes in total',
  '{n} séance au total': '{n} class in total',
  '{n} séances par semaine': '{n} classes a week',
  '{n} séance par semaine': '{n} class a week',
  'Séances illimitées': 'Unlimited classes',

  // Créneaux repliés (miroir de lib/seances-groupees)
  '{n} créneaux': '{n} time slots',
  '{n} créneaux, de {debut} à {fin}': '{n} time slots, from {debut} to {fin}',
  'Replier': 'Collapse',
  'Choisir mon heure': 'Pick my time',

  // Les portails qui se citent (miroir de lib/ponts)
  '{liste} et {dernier}': '{liste} and {dernier}',
  'Je donne aussi des cours à {noms}': 'I also teach at {noms}',

  // Réservation en un clic
  'Tu es déjà inscrit·e à ce cours.': "You're already booked on this class.",
  "Ce cours est complet : rejoins la liste d'attente depuis sa page.": 'This class is full: join the waiting list from its page.',
  'La réservation a échoué': 'The booking failed',
  "C'est réservé ! 🌿": 'Booked! 🌿',
  'Inscrit·e': 'Booked',

  // Carte d'une séance
  'avec {prenom}': 'with {prenom}',
  '{prix} € ou carnet': '{prix} € or class pass',
  '{prix} € / séance': '{prix} € / class',

  // Bandeaux aperçu et démo (vus par la prof qui visite sa propre page)
  'Mode aperçu': 'Preview mode',
  ': tu vois ton brouillon, pas encore publié.': ': you are looking at your draft, not published yet.',
  'Mode démo': 'Demo mode',
  ': tu visites ton portail comme une élève.': ': you are visiting your page as a student would.',
  "Réserve un cours pour tester, ou ouvre l'espace élève fictif (Camille, carnet 10 séances).": 'Book a class to try it out, or open the sample student account (Camille, 10-class pass).',
  "Voir l'espace démo →": 'See the demo account →',

  // Sondage planning
  'Aide {studio} à construire son planning idéal, 30 secondes': 'Help {studio} build the ideal schedule, 30 seconds',
  'Répondre →': 'Answer →',

  // Prochain cours
  'Prochain cours': 'Next class',
  'Voir le cours': 'See the class',
  "Complet · liste d'attente": 'Full · waiting list',

  // Cours d'essai
  "Réserve ton cours d'essai offert": 'Book your free trial class',
  "Réserve ton cours d'essai · dès {prix}€": 'Book your trial class · from {prix}€',
  "Réserve ton cours d'essai · {prix}€": 'Book your trial class · {prix}€',
  "Découvre le studio dans l'ambiance d'un vrai cours.": 'Discover the studio in the atmosphere of a real class.',

  // Accroche et onglets
  'Lire la suite': 'Read more',
  'Cours': 'Classes',
  'À propos': 'About',
  'Tarifs': 'Prices',
  "L'équipe": 'The team',
  'Infos': 'Info',

  // Vue semaine / liste, filtres
  "Mode d'affichage": 'Display mode',
  'Semaine': 'Week',
  'Liste': 'List',
  'Semaine précédente': 'Previous week',
  'Semaine suivante': 'Next week',
  'Rechercher un cours…': 'Search for a class…',
  'Tous': 'All',
  'Toutes les profs': 'All teachers',
  'Seuls les jours avec cours sont affichés.': 'Only days with classes are shown.',
  'Aucun cours cette semaine': 'No classes this week',
  'Aucun cours à venir': 'No upcoming classes',
  'Les prochains cours seront affichés ici.': 'Upcoming classes will appear here.',
  'Aucun cours correspond à ta recherche': 'No classes match your search',

  // À propos
  "{n} ans d'expérience": '{n} years of experience',
  "{n} an d'expérience": '{n} year of experience',
  'Ma philosophie': 'My philosophy',

  // Tarifs et demande d'offre
  'Carnet de {n} séances': 'Pass for {n} classes',
  '{n} jours': '{n} days',
  "Adhésion à l'association, pour la saison": 'Association membership, for the season',
  "Cours à l'unité": 'Single class',
  "À prendre auprès de l'association": 'Available from the association',
  'Demander cette offre': 'Request this offer',
  'Ton prénom': 'Your first name',
  'Ton email': 'Your email',
  'Envoi…': 'Sending…',
  'Envoyer ma demande': 'Send my request',
  'Ton prénom et ton email, pour que le studio puisse te répondre.': 'Your first name and email, so the studio can get back to you.',
  'Demande impossible pour le moment.': "We can't send your request right now.",
  'ton studio': 'your studio',
  "Demande envoyée pour « {offre} ». {studio} la reçoit et revient vers toi pour le règlement. Rien n'est débité, rien n'est réservé pour l'instant.": 'Request sent for "{offre}". {studio} will receive it and get back to you about payment. Nothing has been charged or booked yet.',
  "Demande envoyée. {studio} la reçoit et revient vers toi pour le règlement. Rien n'est débité, rien n'est réservé pour l'instant.": 'Request sent. {studio} will receive it and get back to you about payment. Nothing has been charged or booked yet.',

  // L'équipe
  'Sa page : {nom} →': 'Their page: {nom} →',
  'Voir ses cours': 'See their classes',

  // Infos
  'Où nous trouver': 'Where to find us',
  'Itinéraire Google Maps →': 'Directions on Google Maps →',
  'Questions fréquentes': 'Frequently asked questions',
  'Site web': 'Website',

  // Acheter en ligne
  'Acheter en ligne': 'Buy online',
  'Paye ton carnet ou abonnement par CB en quelques clics.': 'Pay for your class pass or membership by card in a few clicks.',
  'Paiement sécurisé via Stripe, IziSolo ne stocke aucune donnée bancaire.': 'Secure payment via Stripe, IziSolo never stores any card details.',

  // Barre de navigation (BottomNav)
  'Navigation principale': 'Main navigation',
  'Accueil, cours du studio': 'Home, studio classes',
  'Espace': 'Account',
  'Réserver un cours': 'Book a class',
  'Mon profil': 'My profile',
  'Profil': 'Profile',

  // Page introuvable (not-found)
  'Oups, page introuvable': 'Oops, page not found',
  "Cette page n'existe pas, ou ce studio est introuvable.": "This page doesn't exist, or this studio can't be found.",
  'Le lien que tu as suivi est peut-être incomplet ou a expiré.': 'The link you followed may be incomplete or expired.',
  'Si tu cherches à réserver un cours, demande à ton professeur le bon lien vers son studio.': 'If you want to book a class, ask your teacher for the right link to their studio.',
  "Aller à l'accueil": 'Go to the homepage',

  // Espace indisponible (studio Essentiel)
  "Pas d'espace élève chez {studio} pour le moment": 'No student account at {studio} for now',
  'ce studio': 'this studio',
  'Ce studio': 'This studio',
  "{studio} n'a pas activé l'espace en ligne pour ses élèves : les réservations et les carnets se gèrent directement avec lui.": "{studio} hasn't enabled the online account for students: bookings and class passes are handled directly with them.",
  'Son planning reste consultable ici.': 'Their schedule is still available here.',
  'Voir le planning': 'See the schedule',

  // Page d'une intervenante
  '{nom} donne des cours chez {studio}.': '{nom} teaches at {studio}.',
  'Ses prochaines séances ici': 'Their next classes here',
  "Aucune séance publique à venir pour l'instant.": 'No public classes coming up for now.',
  'à {heure}': 'at {heure}',
  'en ligne': 'online',
};

export default EN;
