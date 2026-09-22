/**
 * lib/i18n/en-routes.js — traductions ANGLAISES des emails et push adressés à une
 * élève SANS son cookie (v122), groupe « routes ».
 * Clé = la phrase FRANÇAISE exacte passée à t(), valeur = l'anglais.
 * Variables : {n}, {studio}, {cours}, {date}… identiques des deux côtés.
 * Jamais de tiret cadratin. Verrou : tests/e2e/i18n-portail.spec.js.
 *
 * Couvre : les gestes de la PROF vers ses élèves (séance annulée, séance
 * maintenue, invitation à un cours privé, réponse à une demande d'essai,
 * promotion de la liste d'attente) et les requêtes de l'ÉLÈVE (demande
 * d'essai, liste d'attente, réservation en série, annulation). Les clés
 * partagées avec les autres groupes (« Bonjour {prenom} », « {date} à
 * {heure} », « Ton studio », « Propulsé par »…) vivent là où elles sont nées.
 */
const EN = {
  // ── Communs à plusieurs routes ───────────────────────────────────────────
  'la date prévue': 'the scheduled date',
  'ton cours': 'your class',
  'Ton cours': 'Your class',
  'Cours annulé': 'Class cancelled',
  'Client introuvable': 'Student record not found',
  'Bonne nouvelle !': 'Good news!',
  'déjà enregistrée': 'already confirmed',

  // ── La prof annule une séance (/api/cours/[coursId]/annuler) ─────────────
  'Séance annulée — {cours}': 'Class cancelled: {cours}',
  'Ta séance est bien re-créditée sur ton carnet automatiquement (rien à faire).': 'The class has been credited back to your class pass automatically (nothing to do).',
  '{studio} revient vers toi pour la suite (report ou crédit).': '{studio} will get back to you about what happens next (a new date or a credit).',
  'Si tu avais réglé cette séance, rapproche-toi de ton studio pour la suite.': 'If you had already paid for this class, please get in touch with your studio about what happens next.',
  'La séance « {cours} » du {quand} est annulée.': 'The class "{cours}" on {quand} is cancelled.',
  'Motif : {raison}': 'Reason: {raison}',
  'Désolé·e pour le désagrément, à très vite.': 'Sorry for the inconvenience, see you soon.',
  'Seance annulee : « {cours} » du {quand}.': 'Class cancelled: "{cours}" on {quand}.',
  'Ton credit est restitue.': 'Your credit has been returned.',
  '{cours} — {quand} est annulé.': '{cours} on {quand} is cancelled.',
  "Tu étais en liste d'attente pour « {cours} » du {quand} — cette séance est finalement {annulee}.": 'You were on the waiting list for "{cours}" on {quand}: this class has been {annulee}.',
  'annulée': 'cancelled',
  "Ta place en liste d'attente est retirée, rien à faire de ton côté.": 'You have been removed from the waiting list, nothing to do on your side.',

  // ── La prof rétablit une séance annulée (/api/cours/[coursId]/retablir) ──
  'Séance maintenue — {cours}': 'Class back on: {cours}',
  'Bonne nouvelle : la séance « {cours} » du {quand} a finalement lieu.': 'Good news: the class "{cours}" on {quand} is back on after all.',
  'Lieu : {lieu}.': 'Location: {lieu}.',
  'Ta réservation est toujours valable, rien à faire de ton côté. Si tu ne peux plus venir, annule depuis ton espace.': 'Your booking is still valid, nothing to do on your side. If you can no longer make it, cancel from your account.',
  'Seance maintenue : « {cours} » du {quand} a finalement lieu. Ta reservation est valable.': 'Class back on: "{cours}" on {quand} is happening after all. Your booking is valid.',
  '{cours} — {quand} a finalement lieu.': '{cours} on {quand} is back on after all.',
  'Séance maintenue': 'Class back on',

  // ── La prof prévient les invité·es d'un cours privé (/api/cours/inviter) ─
  'Ta séance « {cours} » — {date} · {studio}': 'Your class "{cours}" on {date} · {studio}',
  'Ta séance « {cours} » · {studio}': 'Your class "{cours}" · {studio}',
  "Une séance t'attend 🌿": 'A class is waiting for you 🌿',
  "{prof} t'a réservé une place pour « {cours} ».": '{prof} has booked you a spot for "{cours}".',
  "Ta prof t'a réservé une place pour « {cours} ».": 'Your teacher has booked you a spot for "{cours}".',
  'Voir dans mon espace': 'See it in my account',
  "Cette séance est privée : elle n'apparaît que dans ton espace. Le lien te connecte sans mot de passe et expire dans 1 heure — après, connecte-toi simplement avec ton email sur le portail.": 'This class is private: it only appears in your account. The link signs you in without a password and expires in 1 hour. After that, simply sign in with your email on the portal.',

  // ── La prof répond à une demande d'essai (/api/admin/essais/[id]) ────────
  "Cours d'essai confirmé 🎉": 'Trial class confirmed 🎉',
  '{studio} a validé ta demande — {cours}.': '{studio} has accepted your request: {cours}.',
  "Demande de cours d'essai chez {studio}": 'Trial class request at {studio}',
  "Merci pour ta demande de cours d'essai chez {studio}.": 'Thank you for your trial class request at {studio}.',
  "Malheureusement, {studio} n'a pas pu donner suite à ta demande pour le moment.": 'Unfortunately, {studio} was not able to accept your request for now.',
  "N'hésite pas à proposer une autre date depuis le portail public si l'envie te reprend.": 'Feel free to suggest another date from the public page whenever you like.',
  "Réponse à ta demande d'essai": 'Reply to your trial class request',
  "{studio} n'a pas pu donner suite pour le moment.": '{studio} was not able to accept your request for now.',

  // ── Une place se libère (promotion de la liste d'attente) ────────────────
  "🎉 Une place s'est libérée pour {cours} !": '🎉 A spot has opened up for {cours}!',
  "🎉 Une place s'est libérée !": '🎉 A spot has opened up!',
  "Une place s'est libérée pour le cours auquel tu étais sur liste d'attente :": 'A spot has opened up for the class you were on the waiting list for:',
  "Ta réservation est {deja}. Tu n'as rien à faire — à très bientôt !": 'Your booking is {deja}. Nothing to do on your side, see you very soon!',
  "Ta réservation est {deja}. Tu n'as rien à faire.": 'Your booking is {deja}. Nothing to do on your side.',
  "Une place s'est libérée 🎉": 'A spot has opened up 🎉',
  'Ta place est réservée pour {cours}.': 'Your spot is booked for {cours}.',

  // ── La demande d'essai de l'élève (/api/portail/[slug]/essai + lib/essai) ─
  'coursId, prenom et email sont requis': 'coursId, prenom and email are required',
  "Les cours d'essai ne sont pas activés sur ce studio": 'Trial classes are not enabled for this studio',
  'Cet email est déjà associé à {studio}. Vérifie ta boîte mail (lien de connexion ou de confirmation), ou contacte directement le studio.': 'This email is already linked to {studio}. Check your inbox (sign-in or confirmation link), or get in touch with the studio directly.',
  'Erreur lors de la création de la demande': 'Your request could not be created',
  "Ce cours vient de se remplir — tu peux t'inscrire en liste d'attente depuis la page du cours.": 'This class has just filled up. You can join the waiting list from the class page.',
  "Une fiche à ton nom existe déjà chez ce studio, avec une autre adresse email. Refais ta demande avec l'adresse utilisée la première fois — ou contacte directement le studio.": 'Someone with your name is already registered at this studio, with a different email address. Send your request again with the address you used the first time, or get in touch with the studio directly.',
  'Erreur lors de la finalisation : {message}': 'Your request could not be completed: {message}',
  'Ce cours est désormais complet.': 'This class is now full.',
  'Ce cours a été annulé.': 'This class has been cancelled.',
  'Cours introuvable.': 'Class not found.',
  'Réservation impossible.': 'Booking not possible.',
  'Pour confirmer ta place, merci de régler {prix} via ce lien :': 'To confirm your spot, please pay {prix} through this link:',
  '{paiement} : {prix} à régler sur place le jour du cours.': '{paiement}: {prix} to be paid on site on the day of the class.',
  "Cours d'essai confirmé · {cours}": 'Trial class confirmed · {cours}',
  "Cours d'essai confirmé !": 'Trial class confirmed!',
  "Ta place est réservée pour ton cours d'essai chez {studio} :": 'Your spot is booked for your trial class at {studio}:',
  'Ce lien te connecte sans mot de passe (valable 1 heure).': 'This link signs you in without a password (valid for 1 hour).',
  "Demande de cours d'essai reçue · {cours}": 'Trial class request received · {cours}',
  'Demande reçue': 'Request received',
  "On a bien reçu ta demande de cours d'essai :": 'We have received your trial class request:',
  '{studio} va examiner ta demande et te répondra rapidement par email.': '{studio} will review your request and get back to you by email shortly.',

  // ── L'élève rejoint la liste d'attente (/api/portail/[slug]/liste-attente) ─
  'Body JSON invalide': 'Invalid request',
  "La liste d'attente n'est pas disponible pour ce studio.": 'The waiting list is not available for this studio.',
  "Ce cours n'a pas de capacité limitée": 'This class has no limit on the number of spots',
  'Ce cours a encore des places — réserve directement.': 'This class still has spots available: book directly.',
  "Tu es déjà inscrit·e à ce cours — pas besoin de la liste d'attente.": 'You are already booked for this class, no need for the waiting list.',
  "Erreur lors de l'inscription": 'You could not be added to the waiting list',
  "Tu es sur la liste d'attente — {cours}": 'You are on the waiting list: {cours}',
  'Le cours {cours} ({quand}) est complet.': 'The class {cours} ({quand}) is full.',
  "Tu es inscrit·e sur la liste d'attente en {position}.": 'You are on the waiting list in {position}.',
  'position {n}': 'position {n}',
  "Si une place se libère, tu recevras automatiquement un email — ta place sera alors réservée, tu n'auras rien à faire.": 'If a spot opens up, you will automatically receive an email: your spot will then be booked, with nothing to do on your side.',
  'Tu ne veux plus attendre ce cours ? Réponds simplement à cet email et {studio} te retirera de la liste.': 'No longer want to wait for this class? Simply reply to this email and {studio} will remove you from the list.',

  // ── L'élève réserve une série (/api/portail/[slug]/reserver-serie) ───────
  'coursId et jusquAu requis': 'coursId and jusquAu are required',
  'Tu dois être connecté·e': 'You need to be signed in',
  "Ce cours n'est pas récurrent": 'This class is not a recurring one',
  'La date limite doit être après le cours initial': 'The end date must be after the first class',
  'Séance passée': 'Past class',
  'Limite {n}×/semaine atteinte': 'Limit of {n} per week reached',
  'Déjà inscrit·e': 'Already booked',
  'Tes {n} séances « {cours} » sont réservées ✓': 'Your {n} "{cours}" classes are booked ✓',
  'Ta séance « {cours} » est réservée ✓': 'Your "{cours}" class is booked ✓',
  "C'est noté {prenom} !": 'All set {prenom}!',
  'Tu es inscrit·e à {seances} de « {cours} » :': 'You are booked for {seances} of "{cours}":',
  '… et {n} autres.': '… and {n} more.',
  '… et {n} autre.': '… and {n} more.',
  "{n} dates n'ont pas pu être réservées (complet, passé…) — le détail est dans ton espace.": '{n} dates could not be booked (full, already past…). The details are in your account.',
  "{n} date n'a pas pu être réservée (complet, passé…) — le détail est dans ton espace.": '{n} date could not be booked (full, already past…). The details are in your account.',
  'Gérer mes séances': 'Manage my classes',
  'Un empêchement ? Tu peux annuler chaque séance depuis ton espace, selon les règles du studio.': "Can't make it? You can cancel each class from your account, according to the studio's rules.",

  // ── L'élève annule sa réservation (/api/portail/[slug]/annuler) ──────────
  'Non authentifié': 'Not signed in',
  "L'annulation en ligne n'est pas activée pour ce studio. Contacte directement ton studio pour annuler.": 'Online cancellation is not enabled for this studio. Get in touch with your studio directly to cancel.',
  'Réservation introuvable': 'Booking not found',
  'Cette réservation est déjà annulée.': 'This booking is already cancelled.',
  'Cette réservation a déjà été annulée côté studio — rien à faire de ton côté.': 'This booking has already been cancelled by the studio, nothing to do on your side.',
  'Ce cours a été annulé par ton studio — rien à faire de ton côté.': 'This class has been cancelled by your studio, nothing to do on your side.',
  'Ce cours est déjà passé': 'This class has already taken place',
  "Erreur lors de l'annulation": 'The cancellation could not be completed',
  "Pour rappel, l'annulation de ta séance prévue le {quand} est intervenue moins de {h}h avant le cours. Conformément à la politique d'annulation du studio, la séance a été décomptée de ton carnet.": "As a reminder, you cancelled your class scheduled on {quand} less than {h} hours before it started. In line with the studio's cancellation policy, the class has been deducted from your class pass.",
  'À noter : ta séance du {date} reste due': 'Please note: your class on {date} is still due',
  "Ton annulation pour la séance du {quand} est intervenue moins de {h}h avant le cours. Conformément à la politique d'annulation du studio, la séance reste due{tarif} — le règlement se fera directement avec ton studio.": "You cancelled your class on {quand} less than {h} hours before it started. In line with the studio's cancellation policy, the class is still due{tarif}. Payment is to be settled directly with your studio.",
  'Annulation tardive (<{h}h) — la seance du {quand} a ete decomptee de ton carnet.': 'Late cancellation (<{h}h): the class on {quand} has been deducted from your class pass.',
  'Annulation tardive (<{h}h) — la seance du {quand} reste due, a regler avec ton studio.': 'Late cancellation (<{h}h): the class on {quand} is still due, to be settled with your studio.',
};

export default EN;
