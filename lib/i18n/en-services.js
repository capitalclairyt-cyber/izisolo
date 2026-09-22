/**
 * lib/i18n/en-services.js — traductions ANGLAISES des emails et push adressés à une
 * élève SANS son cookie (v122), groupe « services ».
 * Clé = la phrase FRANÇAISE exacte passée à t(), valeur = l'anglais.
 * Variables : {n}, {studio}, {cours}, {date}… identiques des deux côtés.
 * Jamais de tiret cadratin. Verrou : tests/e2e/i18n-portail.spec.js.
 *
 * Couvre : l'email instantané « {studio} t'a écrit » et les push de la
 * messagerie (lib/messagerie-email, route messages), l'email qui porte la
 * facture PDF (lib/facture-auto), l'email d'échec de prélèvement à l'élève
 * (lib/prelevement-service), les emails de règle métier (lib/notif-eleve-regle),
 * l'email « comment régler » (lib/reglement, route email-reglement) et le push
 * « paiement enregistré » (route encaisser).
 * Réutilisées telles quelles depuis les autres dictionnaires : « Bonjour »,
 * « Bonjour {prenom} », « Propulsé par », « ton studio », « Ouvrir mon espace »,
 * « Titulaire : », « IBAN : », « BIC : », « Nouveau message ».
 */
const EN = {
  // ── Messagerie : l'email instantané et les push à l'élève ────────────────
  "{studio} t'a écrit": '{studio} sent you a message',
  '{studio} — message au groupe': '{studio}: message to the group',
  'Ton studio': 'Your studio',
  "{studio} t'a envoyé un message :": '{studio} sent you a message:',
  '📷 {n} photo ou fichier joint, à voir dans ton espace': '📷 {n} photo or file attached, see it in your account',
  '📷 {n} photos ou fichiers joints, à voir dans ton espace': '📷 {n} photos or files attached, see them in your account',
  'Lire et répondre': 'Read and reply',
  "Tu reçois cet email dès que {studio} t'écrit. Tu peux le désactiver dans ton espace élève, réglages de notifications (section « Messages »).": 'You get this email as soon as {studio} writes to you. You can turn it off in your account, under notification settings ("Messages" section).',

  // ── La facture qui part toute seule (lib/facture-auto) ───────────────────
  'Ta facture {numero} · {studio}': 'Your invoice {numero} · {studio}',
  'Ton règlement de {montant} pour {intitule} est bien enregistré chez {studio}.': 'Your payment of {montant} for {intitule} has been recorded by {studio}.',
  'Ton règlement de {montant} est bien enregistré chez {studio}.': 'Your payment of {montant} has been recorded by {studio}.',
  'Ta facture {numero} est en pièce jointe. Tu la retrouveras aussi à tout moment dans ton espace, rubrique « Mes paiements ».': 'Your invoice {numero} is attached. You can also find it at any time in your account, under "My payments".',
  'Une question sur cette facture ? Réponds simplement à cet email : il arrive directement chez {studio}.': 'A question about this invoice? Just reply to this email: it goes straight to {studio}.',

  // ── Échec de prélèvement (lib/prelevement-service, email à l'élève) ──────
  "Ton prélèvement n'a pas abouti · {studio}": 'Your card payment did not go through · {studio}',
  'Petit souci de prélèvement · {studio}': 'A small hiccup with your card payment · {studio}',
  "Le prélèvement de {montant} pour {offre} chez {studio} n'a pas pu être effectué par ta banque.": 'The card payment of {montant} for {offre} at {studio} could not be processed by your bank.',
  "Après plusieurs tentatives, il n'a pas abouti : ton abonnement est {pause} le temps de régler ça. Réponds à cet email pour convenir d'un autre règlement avec {studio}, ou mets ta carte à jour depuis l'email de Stripe.": 'After several attempts, it still has not gone through: your membership is {pause} until this is sorted out. Reply to this email to arrange another way to pay with {studio}, or update your card from the email Stripe sent you.',
  'mis en pause': 'paused',
  "Rien de grave : une nouvelle tentative aura lieu le {date}. Si ta carte a changé, mets-la à jour depuis l'email que Stripe t'a envoyé.": 'Nothing serious: another attempt will be made on {date}. If your card has changed, update it from the email Stripe sent you.',
  "Rien de grave : une nouvelle tentative aura lieu dans les prochains jours. Si ta carte a changé, mets-la à jour depuis l'email que Stripe t'a envoyé.": 'Nothing serious: another attempt will be made in the next few days. If your card has changed, update it from the email Stripe sent you.',
  'Une question ? Réponds simplement à cet email : il arrive chez {studio}.': 'A question? Just reply to this email: it goes to {studio}.',

  // ── Règles métier (lib/notif-eleve-regle) ────────────────────────────────
  'Bonjour {prenom},': 'Hello {prenom},',
  'À très vite,': 'See you soon,',
  'Toutes mes excuses pour la gêne,': 'Sorry for the inconvenience,',
  'ta séance': 'your class',
  'le studio': 'the studio',
  'Information importante · {studio}': 'Important information · {studio}',
  'Ta réservation pour {cours} le {date} est bien enregistrée.': 'Your booking for {cours} on {date} has been recorded.',
  'Réservation enregistrée, pense à régler ta séance': 'Booking recorded, remember to pay for your class',
  "Comme tu n'as pas (ou plus) de carnet actif, le règlement se fera sur place avant la séance. Tu peux aussi acheter un carnet d'avance pour la prochaine fois.": 'As you do not have an active class pass (or not anymore), payment will be made in person before the class. You can also buy a class pass in advance for next time.',
  'Ce cours se règle à la séance : le règlement se fera directement avec ton studio.': 'This class is paid per session: payment will be made directly with your studio.',
  "Petite précision : ton carnet actuel ne couvre pas ce type de cours. Cette séance se règle donc séparément, directement avec ton studio. Ton carnet n'est pas touché.": 'One small note: your current class pass does not cover this type of class. This class is therefore paid separately, directly with your studio. Your class pass is not affected.',
  'À noter : ta séance du {date} a été comptée': 'Please note: your class on {date} has been counted',
  "Pour rappel, l'annulation de ta séance du {date} est intervenue trop tard pour qu'on puisse la libérer. Conformément à la politique du studio, la séance a été décomptée de ton crédit.": 'As a reminder, your class on {date} was cancelled too late for the spot to be freed up. In line with the studio policy, the class has been deducted from your credit.',
  'Tu peux retrouver le détail dans ton espace personnel.': 'You can find the details in your account.',
  'Ton carnet expire avant cette séance': 'Your class pass expires before this class',
  'Tu viens de réserver {cours} le {date}. Petit rappel : ton carnet en cours arrive à expiration avant cette date.': 'You have just booked {cours} on {date}. A quick reminder: your current class pass expires before that date.',
  'Pense à le renouveler pour ne pas perdre ta place, sinon contacte-moi.': 'Remember to renew it so you do not lose your spot, or get in touch with me.',
  'Séance annulée : {cours} du {date}': 'Class cancelled: {cours} on {date}',
  'Désolée, je dois annuler la séance {cours} prévue le {date}.': 'Sorry, I have to cancel the {cours} class planned on {date}.',
  'Ta séance est recréditée sur ton carnet automatiquement. Tu peux te réinscrire à un autre créneau dès maintenant.': 'The class has been credited back to your class pass automatically. You can book another slot right away.',

  // ── L'email « comment régler » (lib/reglement) ───────────────────────────
  '{studio} : {titre}': '{studio}: {titre}',
  'pour « {intitule} »': 'for "{intitule}"',
  'Ton échéancier :': 'Your payment schedule:',
  'Tu retrouves ce montant (et ces informations) à tout moment dans {lien}.': 'You can find this amount (and these details) at any time in {lien}.',
  'ton espace élève': 'your account',
  'Déjà réglé ? Alors tout est bon, tu peux ignorer ce message.': 'Already paid? Then all is well, you can ignore this message.',
  '{montant} à régler par virement': '{montant} to pay by bank transfer',
  '{studio} attend ton règlement de {montant}{quoi}, par virement :': '{studio} is expecting your payment of {montant}{quoi}, by bank transfer:',
  "Indique bien la référence {reference} dans le libellé du virement : c'est elle qui permet à {studio} de reconnaître ton règlement.": 'Please include the reference {reference} in the transfer description: it is what lets {studio} recognise your payment.',
  'Ton espace élève affiche aussi ce RIB et un QR code à scanner avec ton application bancaire.': 'Your account also shows these bank details and a QR code to scan with your banking app.',
  "Tu préfères régler en espèces ou par chèque ? Directement au studio, comme d'habitude.": 'Would you rather pay in cash or by cheque? Directly at the studio, as usual.',
  '{montant} à régler en espèces': '{montant} to pay in cash',
  '{studio} attend ton règlement de {montant}{quoi}, {especes} (au prochain cours, par exemple).': '{studio} is expecting your payment of {montant}{quoi}, {especes} (at your next class, for example).',
  'en espèces, directement au studio': 'in cash, directly at the studio',
  '{montant} à régler par chèque': '{montant} to pay by cheque',
  '{studio} attend ton règlement de {montant}{quoi}, {cheque}, à remettre directement au studio{ordre}.': '{studio} is expecting your payment of {montant}{quoi}, {cheque}, to hand in directly at the studio{ordre}.',
  'par chèque': 'by cheque',
  "(à l'ordre de {titulaire})": '(made payable to {titulaire})',

  // ── Le push « paiement enregistré » (route encaisser) ────────────────────
  'Paiement enregistré ✓': 'Payment recorded ✓',
  'Ton règlement a bien été pris en compte par ton studio.': 'Your payment has been recorded by your studio.',
};

export default EN;
