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
// Refonte 2026-05-05 : 3 plans publics (Solo / Pro / Premium) + plan `free`
// hidden pour comptes interne / admin / early adopters exemptés.
//
// Validés avec Colin :
//   - Pricing : 12 / 24 / 49 € mensuel ; -20 % en annuel
//   - Trial 14 jours sur tous les plans publics
//   - Solo limité à 40 élèves + 1 lieu + features de base
//   - Pro limité à 3 lieux ; débloque Stripe + auto + mailing + SMS
//   - Premium = lieux illimités + 0 % Stripe + white-label + support prio
//   - SMS toujours à l'usage (0,07 €/SMS) sur Pro/Premium
//   - Plan `free` : full access EXEMPTÉ (admin attribuable uniquement),
//     jamais visible dans la page de pricing publique. Réservé Colin/Maude/démos.
//   - On retire "studio" et "multi-prof" (pas testés/pas prêts).
//
// Schéma d'enforcement :
//   - lib/plan-guard.js applique les limites côté code/API
//   - migration v32 (triggers SQL) applique les limites au niveau DB
//     (defense in depth ; un attaquant ne peut pas bypass via DevTools)
export const PLANS = {
  free: {
    nom: 'Free (interne)',
    public: false, // ⚠️ jamais affiché dans la page de pricing publique
    prix: 0,
    prixAnnuel: 0,
    // Comptes internes/exemptés : full access comme Premium
    limiteClients: null,
    limiteLieux: null,
    portail: true,
    portailEnrichi: true,
    mailing: true,
    sms: true,
    stripePaymentLink: true,
    notifsElevesAuto: true,
    sondages: true,
    coursEssai: true,
    visibiliteCours: true,
    listeAttente: true,
    pageBrouillon: true,
    annulationParEleve: true,
    detteAnnulation: true,
    exportCompta: true,
    templatesCommunication: true,
    anniversairesAuto: true,
    reglesAnnulationAvancees: true,
    brandingEmail: true,
    fraisStripeIziSolo: 0,
    supportPrio: true,
  },
  solo: {
    nom: 'Solo',
    public: true,
    prix: 12,
    prixAnnuel: 115, // 12 × 12 × 0.8 ≈ 115 €
    // Limites
    limiteClients: 40,
    limiteLieux: 1,
    // Features base
    portail: true,
    portailEnrichi: false, // page basique : nom + photo + horaires
    mailing: false,
    sms: false,
    stripePaymentLink: false,
    notifsElevesAuto: false,
    sondages: false,
    coursEssai: false,
    visibiliteCours: false,
    listeAttente: false,
    pageBrouillon: false,
    annulationParEleve: false, // l'élève doit contacter la prof
    detteAnnulation: false,
    exportCompta: false,
    templatesCommunication: false,
    anniversairesAuto: false,
    reglesAnnulationAvancees: false,
    brandingEmail: false,
    fraisStripeIziSolo: null, // pas applicable (pas de Stripe)
    supportPrio: false,
  },
  pro: {
    nom: 'Pro',
    public: true,
    prix: 24,
    prixAnnuel: 230, // 24 × 12 × 0.8 ≈ 230 €
    // Limites (élèves illimités, 3 lieux)
    limiteClients: null,
    limiteLieux: 3,
    // Toutes les features automatisation/communication/portail enrichi
    portail: true,
    portailEnrichi: true,
    mailing: true,
    sms: true,
    stripePaymentLink: true,
    notifsElevesAuto: true,
    sondages: true,
    coursEssai: true,
    visibiliteCours: true,
    listeAttente: true,
    pageBrouillon: true,
    annulationParEleve: true,
    detteAnnulation: true,
    exportCompta: true,
    templatesCommunication: true,
    anniversairesAuto: true,
    reglesAnnulationAvancees: true,
    brandingEmail: false, // réservé Premium
    fraisStripeIziSolo: 1, // 1 % en plus des frais Stripe natifs
    supportPrio: true,
  },
  premium: {
    nom: 'Premium',
    public: true,
    prix: 49,
    prixAnnuel: 470, // 49 × 12 × 0.8 ≈ 470 €
    // Limites (tout illimité)
    limiteClients: null,
    limiteLieux: null,
    // Tout débloqué + bonus
    portail: true,
    portailEnrichi: true,
    mailing: true,
    sms: true,
    stripePaymentLink: true,
    notifsElevesAuto: true,
    sondages: true,
    coursEssai: true,
    visibiliteCours: true,
    listeAttente: true,
    pageBrouillon: true,
    annulationParEleve: true,
    detteAnnulation: true,
    exportCompta: true,
    templatesCommunication: true,
    anniversairesAuto: true,
    reglesAnnulationAvancees: true,
    brandingEmail: true, // logo studio dans signature email
    fraisStripeIziSolo: 0, // pas de frais IziSolo en plus
    supportPrio: true, // + réponse < 24h promise
  },
};

// Plans publics — pour les pages de pricing / signup
export const PUBLIC_PLANS = ['solo', 'pro', 'premium'];

// Tous les plans valides (incluant free hidden) — pour la validation API admin
export const ALL_PLANS = ['free', 'solo', 'pro', 'premium'];

// Tarif SMS unitaire (à l'usage, sur Pro et Premium)
export const SMS_PRIX_UNITAIRE = 0.07;

// Durée du trial gratuit (jours) — pour tous les plans publics
export const TRIAL_DAYS = 14;

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
