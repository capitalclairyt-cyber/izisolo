// ============================================
// IziSolo — Constantes & Labels
// ============================================

// --- Statuts client ---
export const STATUTS_CLIENT = {
  prospect: { label: 'Prospect', color: 'neutral' },
  actif: { label: 'Actif', color: 'success' },
  fidele: { label: 'Fidèle', color: 'brand' },
  inactif: { label: 'Inactif', color: 'warning' },
};

// --- Statuts abonnement ---
export const STATUTS_ABONNEMENT = {
  actif: { label: 'Actif', color: 'success' },
  epuise: { label: 'Épuisé', color: 'danger' },
  expire: { label: 'Expiré', color: 'warning' },
  annule: { label: 'Annulé', color: 'neutral' },
};

// --- Types d'offre ---
export const TYPES_OFFRE = {
  carnet: { label: 'Carnet de séances', icon: 'Ticket' },
  abonnement: { label: 'Abonnement', icon: 'CalendarCheck' },
  cours_unique: { label: 'Cours à l\'unité', icon: 'Zap' },
};

// --- Statuts paiement ---
export const STATUTS_PAIEMENT = {
  paid: { label: 'Payé', color: 'success' },
  pending: { label: 'En attente', color: 'warning' },
  cb: { label: 'CB en cours', color: 'info' },
  unpaid: { label: 'Impayé', color: 'danger' },
};

// --- Statuts événement ---
export const STATUTS_EVENEMENT = {
  ouvert: { label: 'Ouvert', color: 'success' },
  complet: { label: 'Complet', color: 'warning' },
  termine: { label: 'Terminé', color: 'neutral' },
  annule: { label: 'Annulé', color: 'danger' },
};

// --- Modes de paiement par défaut ---
export const MODES_PAIEMENT_DEFAUT = ['CB', 'Virement', 'Espèces', 'Chèque'];

// --- Plans IziSolo ---
// Plans IziSolo — alignés avec le check VALID_PLANS de l'API admin
// (free/solo/pro/studio/premium). Les noms en DB sont en anglais ; le label
// "Découverte" pour free reste possible côté UI mais le slug stable est `free`.
//
// Pricing post-retour terrain (avr. 2026) : pouvoir d'achat faible des profs
// indé yoga/pilates → on passe sous le seuil psychologique des 10€/mois sur Solo.
//
// Ligne stratégique :
//  - Free : encaissement 100% manuel (mini-compta), portail élève, agenda
//  - Solo : ajoute mailing automatique + élèves illimités
//  - Pro  : ajoute Stripe Payment Link + multi-prof + automatisations + vidéos
//  - Studio (post-launch) : multi-établissement + API + branding poussé
export const PLANS = {
  free: {
    nom: 'Free',
    prix: 0,
    prixAnnuel: 0,
    limiteClients: 25,
    limiteCoursSemaine: null, // illimité
    portail: true,
    mailing: false,
    stripePaymentLink: false,
    multiUser: false,
    videos: false,
  },
  solo: {
    nom: 'Solo',
    prix: 9,
    prixAnnuel: 86, // 9 × 12 × 0.8 ≈ 86 €
    limiteClients: null, // illimité
    limiteCoursSemaine: null,
    portail: true,
    mailing: true,
    stripePaymentLink: false, // réservé Pro pour simplicité de l'onboarding Solo
    multiUser: false,
    videos: false,
  },
  pro: {
    nom: 'Pro',
    prix: 19,
    prixAnnuel: 182, // 19 × 12 × 0.8 ≈ 182 €
    limiteClients: null,
    limiteCoursSemaine: null,
    portail: true,
    mailing: true,
    stripePaymentLink: true,
    multiUser: true,
    videos: true,
  },
  studio: {
    nom: 'Studio',
    prix: 39,
    prixAnnuel: 374, // 39 × 12 × 0.8 ≈ 374 €
    limiteClients: null,
    limiteCoursSemaine: null,
    portail: true,
    mailing: true,
    stripePaymentLink: true,
    multiUser: true,
    videos: true,
    multiEtablissement: true, // post-launch
  },
};

// --- Métiers supportés ---
export const METIERS = {
  yoga: { label: 'Yoga', emoji: '🧘', couleurDefaut: 'rose' },
  pilates: { label: 'Pilates', emoji: '🏋️', couleurDefaut: 'ocean' },
  danse: { label: 'Danse', emoji: '💃', couleurDefaut: 'lavande' },
  musique: { label: 'Musique', emoji: '🎵', couleurDefaut: 'soleil' },
  coaching: { label: 'Coaching', emoji: '💬', couleurDefaut: 'foret' },
  arts: { label: 'Arts', emoji: '🎨', couleurDefaut: 'terre' },
  autre: { label: 'Autre', emoji: '✨', couleurDefaut: 'rose' },
};

// --- Types de cours par défaut selon le métier ---
export const TYPES_COURS_DEFAUT = {
  yoga: ['Hatha', 'Vinyasa', 'Yin', 'Restoratif', 'Prénatal', 'Ashtanga'],
  pilates: ['Mat', 'Reformer', 'Barre au sol', 'Prénatal', 'Senior'],
  danse: ['Classique', 'Contemporain', 'Jazz', 'Hip-hop', 'Salsa', 'Tango'],
  musique: ['Piano', 'Guitare', 'Chant', 'Violon', 'Batterie', 'Solfège'],
  coaching: ['Individuel', 'Groupe', 'Bien-être', 'Professionnel', 'Sport'],
  arts: ['Peinture', 'Dessin', 'Aquarelle', 'Sculpture', 'Céramique', 'Photo'],
  autre: ['Cours 1', 'Cours 2', 'Cours 3'],
};
