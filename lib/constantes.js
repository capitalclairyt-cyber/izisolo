// ============================================
// IziSolo — Constantes & Labels
// ============================================

// --- Statuts client ---
export const STATUTS_CLIENT = {
  prospect: { label: 'Prospect', color: 'neutral' },
  actif: { label: 'Actif', color: 'success' },
  fidele: { label: 'Fidèle', color: 'brand' },
  inactif: { label: 'Inactif', color: 'warning' },
  archive: { label: 'Archivé', color: 'neutral' },
};

// --- Statuts abonnement ---
export const STATUTS_ABONNEMENT = {
  actif: { label: 'Actif', color: 'success' },
  epuise: { label: 'Épuisé', color: 'danger' },
  expire: { label: 'Expiré', color: 'warning' },
  annule: { label: 'Annulé', color: 'neutral' },
  gele: { label: 'En pause', color: 'warning' },
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
  overdue: { label: 'En retard', color: 'danger' },
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
// Refonte 2026-05-19 : 3 plans publics (Solo / Pro / Studio) + plan `free`
// hidden pour comptes interne / admin / early adopters exemptés.
//
// Grille tarifaire CANONIQUE (source de vérité : bible + landing alignées,
// réconciliée 2026-07-23 — l'ancienne version de ce commentaire disait
// Founding Solo 9€ / EB Pro 24€, vestiges de la grille d'avant « Pro à 22€ ») :
//   - Prix public : Solo 17€ / Pro 22€ / Studio 79€ mensuel ; annuel désactivé
//   - Founding 100 (à vie) : Solo 12€ / Pro 19€ / Studio 49€
//     → codes promo Stripe FOUNDING100SOLO / FOUNDING100PRO / FOUNDING100STUDIO
//   - Early Bird (places 101-300, 6 mois) : Solo 12€ / Pro 19€
//     → codes EARLYBIRDSOLO / EARLYBIRDPRO (mêmes remises, durée 6 mois)
//   - Mécanique : plein tarif au checkout + code promo saisi par la prof
//     (allow_promotion_codes) — création via scripts/setup-stripe-saas.mjs
//   - Trial 14 jours sur tous les plans publics
//   - Solo limité à 40 élèves + 1 lieu + features de base
//   - Pro limité à 3 lieux ; débloque Stripe + auto + mailing + SMS
//   - Studio = lieux illimités + white-label + vidéos
//   - SMS toujours à l'usage (0,08 €/SMS) sur Pro/Studio
//   - Plan `free` : full access EXEMPTÉ (admin attribuable uniquement),
//     jamais visible dans la page de pricing publique. Réservé Colin/Maude/démos.
//
// ⚠️ La clé interne du plan Studio reste `premium` en DB pour éviter une
//   migration. Seul le nom affiché change ("Studio").
//
// Schéma d'enforcement :
//   - lib/plan-guard.js applique les limites côté code/API
//   - migration v32 (triggers SQL) applique les limites au niveau DB
//     (defense in depth ; un attaquant ne peut pas bypass via DevTools)
// ════════════════════════════════════════════════════════════════════════════
// LES 2 PLANS (B3a 2026-07-26) — Essentiel (`solo`) / Complet (`pro`).
// Principe (PLAN-BATAILLE §5) : « Essentiel = ton cahier, en mieux. Complet =
// tes élèves entrent dans la boucle. » Tout ce qui fait AGIR l'élève est
// Complet ; tout ce que la prof fait seule est Essentiel. UNE frontière,
// ZÉRO quota (les limites 40 élèves / 5 offres sont mortes — v80).
//
// Clés DB inchangées : `solo`, `pro`. `premium` n'est PLUS un plan vendu :
// mappé → pro par effectivePlan() (lib/trial.js), conservé dans PLANS pour
// l'affichage des comptes legacy. `free` = interne (Maude/Colin/démo), tout
// ouvert. Les noms marketing définitifs se décident en P4 avec les prix.
//
// ⚠️ Une feature se teste par can(profile, 'capacite') (lib/plan-guard) —
// JAMAIS par `plan === 'pro'` ni par un flag booléen par plan (l'ancien
// système à 17 flags × 4 plans + FEATURE_TO_MIN_PLAN divergeait par design).
// ════════════════════════════════════════════════════════════════════════════

// LA source de vérité du gating : capacité → plan minimum ('solo' | 'pro').
// Ajouter une capacité = une ligne ici + can() partout où ça se consomme.
export const CAPACITES = {
  // ── La boucle élève (Complet) ─────────────────────────────────────────
  reservation_en_ligne: 'pro',  // résa portail + annulation élève + règles d'annulation
  espace_eleve:         'pro',  // compte élève, historique, notifs, rappels J-1
  cours_essai:          'pro',
  liste_attente:        'pro',
  cours_prives:         'pro',  // cours sur invitation (v73)
  messagerie:           'pro',
  mailing:              'pro',  // annonces / mailing groupé
  sondages:             'pro',
  paiement_en_ligne:    'pro',  // Stripe Payment Link élèves
  notifs_eleves_auto:   'pro',  // emails auto élèves (cours annulé, crédits bas…)
  photo_import:         'pro',  // import fiche par photo (IA)
  portail_enrichi:      'pro',  // bio, FAQ, philosophie, brouillon/aperçu
  sms:                  'pro',  // (kill-switch global SMS_ENABLED prime)
  // ── La prof seule (Essentiel — inclut D1 et D2, décisions 2026-07-26) ─
  carnets_manuels:      'solo', // D1 : carnets/abos gérés à la main
  export_compta:        'solo', // D2 : export comptable CSV
};

export const PLANS = {
  free: {
    nom: 'Free (interne)',
    public: false, // jamais affiché — comptes internes/exemptés, tout ouvert
    prix: 0,
    prixAnnuel: 0,
    limiteClients: null,
    limiteLieux: null,
    limiteOffres: null,
    fraisStripeIziSolo: 0,
  },
  solo: {
    nom: 'Solo', // nom marketing provisoire (« Essentiel » se décide en P4)
    public: true,
    prix: 17,
    prixAnnuel: 163, // 17 × 12 × 0.8 ≈ 163 €
    // Zéro quota (B3a) : la différenciation est par CAPACITES, pas par
    // limites. Champs conservés à null : les lecteurs (offres, import CSV)
    // sont null-safe et s'éteignent d'eux-mêmes.
    limiteClients: null,
    limiteLieux: null,
    limiteOffres: null,
    fraisStripeIziSolo: null, // pas de Stripe élèves en Essentiel
  },
  pro: {
    nom: 'Pro', // nom marketing provisoire (« Complet » se décide en P4)
    public: true,
    prix: 22,
    prixAnnuel: 211, // 22 × 12 × 0.8 ≈ 211 €
    limiteClients: null,
    limiteLieux: null,
    limiteOffres: null,
    fraisStripeIziSolo: 1, // 1 % en plus des frais Stripe natifs
  },
  premium: {
    // LEGACY (ex-Studio) : plus jamais vendu ni affiché. Les comptes DB en
    // 'premium' sont traités comme 'pro' (effectivePlan). Vidéos/white-label
    // → backlog, sans carte grisée (décision §5).
    nom: 'Studio (legacy)',
    public: false,
    prix: 79,
    prixAnnuel: 758,
    limiteClients: null,
    limiteLieux: null,
    limiteOffres: null,
    fraisStripeIziSolo: 1,
  },
};

// Plans publics — pour les pages de pricing / signup (2 cartes depuis B3a)
export const PUBLIC_PLANS = ['solo', 'pro'];

// Tous les plans valides en DB (free interne + premium legacy) — validation admin
export const ALL_PLANS = ['free', 'solo', 'pro', 'premium'];

// Tarif SMS unitaire (à l'usage, sur Pro et Studio).
// SOURCE UNIQUE — utilisée partout (UI pricing, factures, helpers notifs).
// Coût Mélutek ~0,045 €/SMS FR, marge incluse. Synchronisé avec
// lib/notifs-eleves.js qui ré-exporte cette constante pour rétrocompat.
export const SMS_PRIX_UNITAIRE = 0.08;

// Durée du trial gratuit (jours) — pour tous les plans publics
export const TRIAL_DAYS = 14;

// ⚠️ SMS GLOBALEMENT DÉSACTIVÉS (2026-05-05)
// L'envoi SMS est suspendu pour le moment (intégration OctoPush pas encore
// validée en prod, pas envie de cramer du crédit pendant la phase test).
// Toute UI mentionnant SMS doit être grisée / "Bientôt disponible".
// L'API /api/sms/send renvoie 503 si SMS_ENABLED = false.
//
// Pour réactiver : passer cette constante à `true` + s'assurer que les
// env vars OCTOPUSH_LOGIN / OCTOPUSH_API_KEY / OCTOPUSH_SENDER sont set.
export const SMS_ENABLED = false;

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
