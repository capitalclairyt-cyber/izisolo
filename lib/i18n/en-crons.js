/**
 * lib/i18n/en-crons.js — traductions ANGLAISES des emails et push adressés à une
 * élève SANS son cookie (v122), groupe « crons ».
 * Clé = la phrase FRANÇAISE exacte passée à t(), valeur = l'anglais.
 * Variables : {n}, {studio}, {cours}, {date}… identiques des deux côtés.
 * Jamais de tiret cadratin. Verrou : tests/e2e/i18n-portail.spec.js.
 *
 * Couvre : le rappel de séance J-1 (cron alertes), les notifications carnet /
 * abonnement et l'email d'avis Google (cron notifs-eleves, lib/avis-google),
 * l'enveloppe HTML de lib/notifs-eleves et la branche élève du digest de
 * messagerie. Les clés communes (« Bonjour {prenom} », « À très vite »,
 * « Propulsé par », « ton studio », « en ligne ») vivent dans en-commun,
 * en-emails et en-home : on les réutilise, on ne les redéclare pas.
 */
const EN = {
  // ── Rappel de séance J-1 (app/api/cron/alertes) ──────────────────────────
  '{date} à {heure}': '{date} at {heure}',
  'Rappel : {cours} demain': 'Reminder: {cours} tomorrow',
  'Petit rappel : tu es inscrit·e à la séance {cours} demain {quand}{lieu} chez {studio}.': 'A quick reminder: you are booked for the {cours} class tomorrow, {quand}{lieu} at {studio}.',
  'Le lien pour rejoindre la séance :': 'The link to join the class:',
  'Le lien de la séance apparaîtra dans ton espace une fois ta séance réglée.': 'The class link will appear in your account once your class is paid for.',
  'À demain !': 'See you tomorrow!',
  'Demain : {cours} ⏰': 'Tomorrow: {cours} ⏰',

  // ── Carnet bas (app/api/cron/notifs-eleves, PASS 1) ──────────────────────
  'carnet': 'class pass',
  'ton carnet': 'your class pass',
  'Plus que {n} séances sur ton carnet': 'Only {n} classes left on your class pass',
  'Plus que {n} séance sur ton carnet': 'Only {n} class left on your class pass',
  'Petit rappel amical : il te reste seulement {n} séances sur ton carnet « {offre} » chez {studio}.': 'A friendly reminder: you only have {n} classes left on your "{offre}" class pass at {studio}.',
  'Petit rappel amical : il te reste seulement {n} séance sur ton carnet « {offre} » chez {studio}.': 'A friendly reminder: you only have {n} class left on your "{offre}" class pass at {studio}.',
  "Pour ne pas être pris·e de court, n'hésite pas à renouveler dès que possible : on aura toujours plaisir à te revoir.": 'So you are not caught short, feel free to renew as soon as you can: we will always be happy to see you again.',
  'Hello {prenom}, plus que {n} seances sur ton carnet {offre} chez {studio}. Pense a renouveler !': 'Hi {prenom}, only {n} classes left on your {offre} class pass at {studio}. Time to renew!',
  'Hello {prenom}, plus que {n} seance sur ton carnet {offre} chez {studio}. Pense a renouveler !': 'Hi {prenom}, only {n} class left on your {offre} class pass at {studio}. Time to renew!',
  'Plus que {n} séances 📋': 'Only {n} classes left 📋',
  'Plus que {n} séance 📋': 'Only {n} class left 📋',
  'Ton carnet « {offre} » chez {studio} : pense à renouveler.': 'Your "{offre}" class pass at {studio}: time to renew.',

  // ── Abonnement qui expire (app/api/cron/notifs-eleves, PASS 1) ───────────
  'abonnement': 'membership',
  'ton abonnement': 'your membership',
  'Ton abonnement expire dans {n} jours': 'Your membership expires in {n} days',
  'Ton abonnement expire dans {n} jour': 'Your membership expires in {n} day',
  'Ton abonnement « {offre} » chez {studio} arrive à échéance le {date} (dans {n} jours).': 'Your "{offre}" membership at {studio} ends on {date} (in {n} days).',
  'Ton abonnement « {offre} » chez {studio} arrive à échéance le {date} (dans {n} jour).': 'Your "{offre}" membership at {studio} ends on {date} (in {n} day).',
  'Pour assurer la continuité de tes cours, pense à le renouveler avant cette date.': 'To keep your classes going, remember to renew it before then.',
  'Hello {prenom}, ton abonnement {offre} chez {studio} expire dans {n}j ({date}). Pense a renouveler !': 'Hi {prenom}, your {offre} membership at {studio} expires in {n}d ({date}). Time to renew!',
  'Ton abonnement expire bientôt ⏳': 'Your membership expires soon ⏳',
  '« {offre} » chez {studio}, dans {n} j.': '"{offre}" at {studio}, in {n} days.',

  // ── Textes par défaut d'une règle SI/ALORS (PASS 2), quand la prof n'a rien écrit
  'Un mot pour toi': 'A note for you',
  'Hello {prenom}, à très vite. {studio}': 'Hi {prenom}, see you soon. {studio}',

  // ── L'email d'avis Google (lib/avis-google, emailAvis) ───────────────────
  'Un mot sur tes séances chez {studio} ?': 'A word about your classes at {studio}?',
  'Tu es venue plusieurs fois maintenant, et ça fait vraiment plaisir.': 'You have been to several classes now, and it is a real pleasure to have you.',
  "Si tu as une minute, un avis sur Google aide énormément : c'est comme ça que d'autres personnes trouvent {studio}.": 'If you have a minute, a review on Google helps enormously: that is how other people find {studio}.',
  'Laisser un avis :': 'Leave a review:',
  "Tu écris ce que tu veux, ce que tu penses vraiment. Ce message n'est envoyé qu'une seule fois.": 'Write whatever you like, what you really think. This message is only sent once.',
  'Merci, et à bientôt sur le tapis,': 'Thank you, and see you on the mat soon,',

  // ── L'enveloppe HTML des notifications (lib/notifs-eleves, htmlWrap) ─────
  'Studio': 'Studio',

  // ── Le digest de messagerie, branche élève (app/api/cron/digest-messagerie)
  'Ton studio': 'Your studio',
  'là': 'there',
  "{studio} t'a écrit": '{studio} sent you a message',
  ', avec {n} photos ou fichiers joints': ', with {n} photos or files attached',
  ', avec {n} photo ou fichier joint': ', with {n} photo or file attached',
  "{studio} t'a envoyé {n} messages{pieces}. Voici le lien pour les consulter :": '{studio} sent you {n} messages{pieces}. Here is the link to read them:',
  "{studio} t'a envoyé {n} message{pieces}. Voici le lien pour le consulter :": '{studio} sent you {n} message{pieces}. Here is the link to read it:',
  'Ouvrir ma messagerie': 'Open my messages',
  'Tu reçois ce récap au maximum une fois par jour. Tu peux le désactiver dans tes réglages de notifications (section « Messages »).': 'You receive this recap at most once a day. You can turn it off in your notification settings (under "Messages").',
};

export default EN;
