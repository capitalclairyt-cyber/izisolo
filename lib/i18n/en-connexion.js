/**
 * lib/i18n/en-connexion.js — traductions ANGLAISES du portail élève, groupe « connexion ».
 * Clé = la phrase FRANÇAISE exacte passée à t(), valeur = l'anglais.
 * Variables : {n}, {studio}, {date}… identiques des deux côtés.
 * Jamais de tiret cadratin. Verrou : tests/e2e/i18n-portail.spec.js.
 *
 * Écrans couverts : la connexion par lien magique (/p/[slug]/connexion), la
 * page à bouton qui ouvre le lien (/p/[slug]/connecte) et le composant partagé
 * OuvrirLien. « Retour aux cours » vit dans en-commun.
 */
const EN = {
  // ── /p/[slug]/connexion : la demande de lien ─────────────────────────────
  'Mon espace élève': 'My account',
  'Connecte-toi pour voir tes réservations': 'Sign in to see your bookings',
  'et gérer tes inscriptions.': 'and manage your classes.',
  'Ton adresse email': 'Your email address',
  'marie@exemple.fr': 'jane@example.com',
  'Ton mot de passe': 'Your password',
  'Recevoir mon lien de connexion': 'Send me my sign-in link',
  'Me connecter': 'Sign in',
  'Envoi en cours…': 'Sending…',
  'Connexion…': 'Signing in…',
  'Recevoir un lien par email à la place': 'Get a link by email instead',
  "J'ai un mot de passe, me connecter avec": 'I have a password, sign in with it',
  'Le mot de passe se définit dans ton espace (section « Mon mot de passe »).': 'You can set a password from your account (see "My password").',
  'Un lien magique sera envoyé à ton adresse.': 'A magic link will be sent to your address.',
  'Pas besoin de mot de passe.': 'No password needed.',
  'Email ou mot de passe incorrect. Tu peux aussi recevoir un lien de connexion.': 'Wrong email or password. You can also get a sign-in link instead.',
  'Une erreur est survenue. Réessaie dans quelques instants.': 'Something went wrong. Please try again in a moment.',

  // Lien expiré (retour de /connecte/ouvrir)
  'Ton lien de connexion a expiré ou a déjà été utilisé.': 'Your sign-in link has expired or has already been used.',
  'Recevoir un nouveau lien pour {email}': 'Send a new link to {email}',
  'Entre ton email pour en recevoir un nouveau.': 'Enter your email to get a new one.',

  // Lien envoyé
  'Vérifie ta boîte mail !': 'Check your inbox!',
  'On a envoyé un lien de connexion à': 'We have sent a sign-in link to',
  "Clique sur le lien dans l'email pour accéder à ton espace.": 'Click the link in the email to open your account.',
  'Le lien expire dans 1 heure. Vérifie tes spams si besoin.': 'The link expires in 1 hour. Check your spam folder if needed.',
  "Changer d'adresse email": 'Use another email address',

  // ── /p/[slug]/connecte : la page à bouton qui ouvre le lien ──────────────
  'Ouvrir mon espace': 'Open my account',
  'ton studio': 'your studio',
  'Bonjour ! Appuie sur le bouton pour entrer dans ton espace élève chez {studio}.': 'Hello! Tap the button to open your account at {studio}.',
  "Pourquoi ce bouton ? Certaines messageries ouvrent les liens avant toi pour les vérifier. Ce geste garantit que c'est bien toi qui entres.": 'Why this button? Some email services open links before you do, to check them. This step makes sure it is really you signing in.',

  // ── components/auth/OuvrirLien (partagé avec le côté prof) ───────────────
  'Un instant…': 'One moment…',
};

export default EN;
