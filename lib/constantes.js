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
  // v113 : l'adhésion d'une association, de saison, sans séance. Jamais
  // vendue par le tunnel des carnets (elle vit dans `adhesions`).
  adhesion: { label: 'Adhésion', icon: 'BadgeCheck' },
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

/// --- Plans IziSolo ---
// Grille tarifaire CANONIQUE (source de vérité). Historique des décisions :
//   - 2026-07-27 (Colin) : Essentiel 15 € / Complet 29 € TTC, Founding 100 et
//     Early Bird abandonnés, offre de lancement LANCEMENT50 (-50 % 3 mois).
//   - 2026-09-07 : Multi 49 € encaissable (forfait plat, profs illimitées).
//   - 2026-09-13 (Colin, PLAN-ASSOS-STUDIOS-2026.md) : **FREEMIUM** :
//     Essentiel passe à 0 €, sans carte, pour toujours ; Multi DISPARAÎT au
//     profit de deux plans frères, Association 39 € et Studio 59 €, avec un
//     annuel (deux mois offerts) pour ces deux-là seulement.
//   - Parrainage : prévu (mécanique à construire, AUCUNE promesse UI tant
//     que la feature n'existe pas)
//   - Essai 30 jours sans CB : une prof seule essaie Complet, une association
//     essaie Association, un studio essaie Studio (lib/structure planEssai),
//     puis retombe sur Essentiel gratuit. PLUS JAMAIS de compte gelé à la fin
//     d'un essai ; le gel ne reste que pour l'impayé (lib/trial).
//   - Frais paiement en ligne élèves : 1 % IziSolo + frais Stripe natifs
//     (plans payants)
//   - Plan `free` : full access EXEMPTÉ (admin attribuable uniquement),
//     jamais visible dans le pricing public. Réservé Colin/Maude/démos.
// ════════════════════════════════════════════════════════════════════════════
// Principe (PLAN-BATAILLE §5) : « Essentiel = ton cahier, en mieux. Complet =
// tes élèves entrent dans la boucle. » Tout ce qui fait AGIR l'élève est
// Complet ; tout ce que la prof fait seule est Essentiel. UNE frontière,
// ZÉRO quota (les limites 40 élèves / 5 offres sont mortes, v80). Au-dessus,
// Association et Studio sont deux FRÈRES (Complet + équipe + leur famille),
// pas deux marches : d'où les PALIERS ci-dessous.
//
// Clés DB : `solo`, `pro`, `asso`, `studio`. Legacy, plus jamais vendus mais
// encore en base : `premium` → pro, `multi` et `multi_free` → studio (par
// effectivePlan(), lib/trial.js). `free` = interne (Maude/Colin/démo).
//
// ⚠️ Une feature se teste par can(profile, 'capacite') (lib/plan-guard),
// JAMAIS par `plan === 'pro'` ni par un flag booléen par plan.
// ════════════════════════════════════════════════════════════════════════════

// Les PALIERS : un palier = l'ensemble des plans qui ouvrent une capacité.
// Le premier plan de chaque liste est le moins cher qui l'ouvre : c'est lui
// que requireCapacite() et PlanRequis nomment.
export const PALIERS = {
  solo:   ['solo', 'pro', 'asso', 'studio'], // tout le monde
  pro:    ['pro', 'asso', 'studio'],         // la boucle élève
  equipe: ['asso', 'studio'],                // plusieurs profs dans une structure
  asso:   ['asso'],                          // la vie d'une association
  studio: ['studio'],                        // la gestion d'un studio
};

// LA source de vérité du gating : capacité → palier.
// Ajouter une capacité = une ligne ici + can() partout où ça se consomme.
export const CAPACITES = {
  // ── La boucle élève (Complet et au-dessus) ───────────────────────────
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
  lien_pointage:        'pro',  // confier le pointage d'UNE séance par lien (v100)
  demande_offre:        'pro',  // « Je veux cette offre » depuis l'espace ou la grille (v97), décision Colin 2026-09-07
  // ── Plusieurs profs dans une même structure (Association et Studio) ──
  equipe:               'equipe', // inviter des profs, leur donner des droits
  depenses:             'equipe', // l'argent de la structure : dépenses, relevés d'intervenantes, prestations, export d'exercice (v112)
  // ── La vie d'une association (v113) ───────────────────────────────────
  vie_asso:             'asso',   // bureau, adhésions, documents, assemblées générales
  // ── La gestion d'un studio (v114) ─────────────────────────────────────
  analyse_compta:       'studio', // marge par séance, résultat par salle / intervenante / type, TVA
  // ── La prof seule (Essentiel, gratuit ; inclut D1 et D2, décisions 2026-07-26) ─
  carnets_manuels:      'solo', // D1 : carnets/abos gérés à la main
  export_compta:        'solo', // D2 : export comptable CSV
};

export const PLANS = {
  free: {
    nom: 'Free (interne)',
    public: false, // jamais affiché : comptes internes/exemptés, tout ouvert
    prix: 0,
    prixAnnuel: 0,
    limiteClients: null,
    limiteLieux: null,
    limiteOffres: null,
    fraisStripeIziSolo: 0,
  },
  solo: {
    nom: 'Essentiel', // nom marketing définitif (tranché 2026-07-27)
    public: true,
    // FREEMIUM (Colin, 2026-09-13) : 0 €, sans carte, pour toujours. Aucun
    // Price Stripe ; le checkout refuse ce plan, on ne le « souscrit » pas.
    prix: 0,
    prixAnnuel: 0,
    // Zéro quota (B3a) : la différenciation est par CAPACITES, pas par
    // limites. Champs conservés à null : les lecteurs (offres, import CSV)
    // sont null-safe et s'éteignent d'eux-mêmes.
    limiteClients: null,
    limiteLieux: null,
    limiteOffres: null,
    fraisStripeIziSolo: null, // pas de Stripe élèves en Essentiel
  },
  pro: {
    nom: 'Complet', // nom marketing définitif (tranché 2026-07-27)
    public: true,
    prix: 29,
    prixAnnuel: 278, // 29 × 12 × 0.8 ≈ 278 € (annuel non vendu sur ce plan)
    limiteClients: null,
    limiteLieux: null,
    limiteOffres: null,
    fraisStripeIziSolo: 1, // 1 % en plus des frais Stripe natifs
  },
  asso: {
    // Association loi 1901 (2026-09-13) : Complet + équipe + la vie de l'asso
    // (bureau, adhésions, documents, AG : lots 1 à 3). FORFAIT PLAT, profs
    // illimitées. Annuel VENDU : deux mois offerts.
    nom: 'Association',
    public: true,
    prix: 39,
    prixAnnuel: 390,
    limiteClients: null,
    limiteLieux: null,
    limiteOffres: null,
    fraisStripeIziSolo: 1,
  },
  studio: {
    // Studio commercial (2026-09-13) : Complet + équipe + la gestion du studio
    // (dépenses, marge, salles, relevés d'intervenantes : lots 1, 2 et 4).
    // FORFAIT PLAT, intervenantes illimitées. Annuel VENDU : deux mois offerts.
    nom: 'Studio',
    public: true,
    prix: 59,
    prixAnnuel: 590,
    limiteClients: null,
    limiteLieux: null,
    limiteOffres: null,
    fraisStripeIziSolo: 1,
  },
  multi: {
    // LEGACY (2026-09-07 → 2026-09-13) : jamais vendu, retiré au profit
    // d'Association / Studio. Un compte encore en 'multi' est traité comme
    // 'studio' par effectivePlan(). Son Price Stripe 49 € est archivé.
    nom: 'Multi (legacy)',
    public: false,
    prix: 49,
    prixAnnuel: 470,
    limiteClients: null,
    limiteLieux: null,
    limiteOffres: null,
    fraisStripeIziSolo: 1,
  },
  multi_free: {
    // La bêta offerte du multi (Atout Gym) : traitée comme 'studio' par
    // effectivePlan(), à l'identique moins la facture. Clé séparée pour
    // pouvoir la COMPTER : un studio bêta n'est pas un compte interne exempté.
    nom: 'Studio (bêta offerte)',
    public: false,
    prix: 0,
    prixAnnuel: 0,
    limiteClients: null,
    limiteLieux: null,
    limiteOffres: null,
    fraisStripeIziSolo: 1, // même économie que Studio : la bêta doit être fidèle
  },
  premium: {
    // LEGACY (ex-Studio 2026) : plus jamais vendu ni affiché. Les comptes DB
    // en 'premium' sont traités comme 'pro' (effectivePlan).
    nom: 'Studio (legacy 2026)',
    public: false,
    prix: 79,
    prixAnnuel: 758,
    limiteClients: null,
    limiteLieux: null,
    limiteOffres: null,
    fraisStripeIziSolo: 1,
  },
};

// Plans publics, pour les pages de pricing / signup.
export const PUBLIC_PLANS = ['solo', 'pro', 'asso', 'studio'];

// Plans qu'on ENCAISSE (un Price Stripe existe) : `solo` n'en a plus.
export const PLANS_PAYANTS = ['pro', 'asso', 'studio'];

// Plans vendus AUSSI à l'année (deux mois offerts) : les structures, qui votent
// un budget et paient par virement après décision du bureau.
export const PLANS_ANNUEL = ['asso', 'studio'];

// Plans qui, POSÉS À LA MAIN sans abonnement Stripe (geste admin, bêta),
// valent « abonné » pour l'app : c'est ce qui garde ces comptes ouverts.
// Un plan qui manque ici retombe sur Essentiel gratuit à la fin de l'essai.
export const PLANS_OFFRABLES = ['pro', 'premium', 'multi', 'multi_free', 'asso', 'studio'];

// Tous les plans valides en DB (free interne, multi/multi_free/premium legacy)
export const ALL_PLANS = ['free', 'solo', 'pro', 'asso', 'studio', 'multi', 'multi_free', 'premium'];

// Tarif SMS unitaire (à l'usage, sur Pro et Studio).
// SOURCE UNIQUE — utilisée partout (UI pricing, factures, helpers notifs).
// Coût Mélutek ~0,045 €/SMS FR, marge incluse. Synchronisé avec
// lib/notifs-eleves.js qui ré-exporte cette constante pour rétrocompat.
export const SMS_PRIX_UNITAIRE = 0.08;

// Durée du trial gratuit (jours) — pour tous les plans publics
export const TRIAL_DAYS = 30;

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
