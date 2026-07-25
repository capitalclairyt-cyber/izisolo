// ============================================================================
// IziSolo — Règles métier du studio (LE module de la politique du studio)
// ----------------------------------------------------------------------------
// Fusion B2a (2026-07-25) : ce module réunit les DEUX volets de la politique
// du studio, autrefois éclatés en 2 fichiers synchronisés à la main :
//
//   1. Les 7 cas paramétrables (JSONB profiles.regles_metier) — QUE FAIRE
//      quand un cas se présente (élève sans carnet, no-show, annulation
//      tardive…). Helpers : CASES, defaultRegles, getRegle, shouldAutoApply,
//      getChoixLabel.
//   2. La loi d'annulation (JSONB profiles.regles_annulation) — QUAND une
//      annulation est tardive (délai global + par type de cours). Helpers :
//      getReglesAnnulation, getDelaiPourCours, evaluerAnnulation,
//      formatDateLimite.
//
// Les deux se complètent : evaluerAnnulation() dit si l'annulation est
// tardive, getRegle(profile, 'annulation_hors_delai') dit quoi en faire.
// TOUTE lecture de ces 2 JSONB passe par ici — jamais de lecture brute avec
// ses propres défauts (les divergences silencieuses ont déjà mordu : cf.
// PointageClient pré-B2a).
//
// ⚠️ Frontière avec lib/regles.js : là-bas vivent les AUTOMATIONS custom
// SI/ALORS (table `regles`, builder + cron). Elles ne portent AUCUNE loi
// d'annulation — l'action dormante `annulation_libre` qui aurait créé un 2e
// delai_heures a été supprimée en B2a. Si un jour une automation doit toucher
// à l'annulation, elle LIT ce module, elle ne stocke pas son propre délai.
//
// Structure d'une règle stockée dans profiles.regles_metier (JSONB) :
//   {
//     mode: 'auto' | 'manuel',
//     choix: 'A' | 'B' | 'C' | 'D' | null,  // null si mode='manuel'
//     notifProf: bool,         // alerte sur le dashboard prof
//     notifEleveEmail: bool,   // email auto à l'élève quand la règle se déclenche
//     notifEleveSms: bool,     // SMS auto (gardé désactivé tant que SMS_ENABLED=false)
//     messageCustom: string | null,
//   }
//
// Structure de profiles.regles_annulation (JSONB, depuis migration v5) :
//   {
//     delai_heures: 24,                                  // global
//     politique: "excuse_si_delai",                      // info
//     message: "Annulation acceptée jusqu'à 24h avant",  // affiché à l'élève
//     regles_par_type: { "Yoga Prénatal": { delai_heures: 48 } }  // optionnel
//   }
// ============================================================================

// ─── Définition des 7 cas ──────────────────────────────────────────────────
export const CASES = [
  {
    id: 'eleve_sans_carnet',
    titre: 'Élève sans carnet ni abonnement qui réserve un cours',
    desc: 'Que doit faire l\'app quand un·e élève réserve un cours alors qu\'iel n\'a aucun carnet ni abonnement actif ?',
    icone: '🎟️',
    options: [
      { value: 'bloquer',          label: 'Bloquer la réservation',                   subText: 'L\'élève doit acheter un carnet/abo avant de pouvoir réserver.' },
      { value: 'paiement_sur_place', label: 'Accepter — paiement à régler sur place', subText: 'Réservation OK, alerte sur ton dashboard pour relancer ou encaisser au cours.' },
      { value: 'forcer_stripe',    label: 'Accepter — forcer paiement Stripe',         subText: 'Cours à l\'unité : l\'élève doit payer avant de valider la réservation. (Pro+)' },
      { value: 'creer_dette',      label: 'Accepter — créer une dette automatique',    subText: 'L\'élève peut réserver, le solde dû s\'ajoutera au prochain achat.' },
    ],
    defaut: { mode: 'auto', choix: 'paiement_sur_place', notifProf: true, notifEleveEmail: true, notifEleveSms: false },
  },
  {
    id: 'annulation_hors_delai',
    titre: 'Annulation hors délai par l\'élève',
    desc: 'Que doit faire l\'app quand un·e élève annule trop tard (préavis non respecté) ? À synchroniser avec ton délai d\'annulation déjà configuré.',
    icone: '⏱️',
    options: [
      { value: 'decompter',          label: 'Décompter la séance',                  subText: 'Stricte : l\'élève perd la séance, comme si elle avait eu lieu.' },
      { value: 'decompter_ou_dette', label: 'Décompter (ou créer dette si pas de carnet)', subText: 'Stricte + élève sans carnet : on génère une dette à régler.' },
      { value: 'excuser',            label: 'Excuser quand même',                   subText: 'Souple : on rend la séance à chaque fois, sans pénalité.' },
    ],
    defaut: { mode: 'auto', choix: 'decompter', notifProf: false, notifEleveEmail: false, notifEleveSms: false },
  },
  {
    id: 'no_show',
    titre: 'Élève absente non excusée (no-show)',
    desc: 'Que doit faire l\'app quand un·e élève inscrit·e ne vient pas et n\'a pas annulé ?',
    icone: '🚫',
    options: [
      { value: 'decompter_auto', label: 'Décompter automatiquement',                  subText: 'Politique stricte : pas d\'excuse = pas de séance restituée.' },
      { value: 'crédit_reporté', label: 'Crédit reporté gratuitement',                subText: 'Politique souple : l\'élève peut récupérer la séance plus tard.' },
      // Pas de "manuel" en option ici — le mode 'manuel' du wrapper sert à ça
    ],
    defaut: { mode: 'manuel', choix: null, notifProf: true, notifEleveEmail: false, notifEleveSms: false },
  },
  {
    id: 'cours_annule_prof',
    titre: 'Cours annulé par toi (prof)',
    desc: 'Quand tu annules un cours (maladie, force majeure...), que doit faire l\'app pour les inscrits ?',
    icone: '🌧️',
    options: [
      { value: 'rendre_seances',    label: 'Rendre toutes les séances automatiquement', subText: 'Le carnet de chaque inscrit·e est recrédité.' },
      { value: 'eleve_choisit',     label: 'Email auto + l\'élève choisit',              subText: 'Recevoir un crédit OU demander un remboursement cash.' },
    ],
    defaut: { mode: 'auto', choix: 'rendre_seances', notifProf: false, notifEleveEmail: true, notifEleveSms: false },
  },
  {
    id: 'carnet_expire_avant_cours',
    titre: 'Carnet expire avant la date du cours réservé',
    desc: 'Une élève réserve un cours dont la date est postérieure à l\'expiration de son carnet en cours. Que faire ?',
    icone: '📅',
    options: [
      { value: 'bloquer',         label: 'Bloquer la réservation',                       subText: 'L\'élève doit racheter un carnet pour réserver.' },
      { value: 'prolonger',       label: 'Autoriser et prolonger le carnet',             subText: 'Bonus : on étend la validité jusqu\'à la date du cours.' },
      { value: 'autoriser_avertir', label: 'Autoriser mais avertir l\'élève',            subText: 'Réservation OK mais email "ton carnet expire avant ce cours".' },
    ],
    defaut: { mode: 'auto', choix: 'autoriser_avertir', notifProf: false, notifEleveEmail: true, notifEleveSms: false },
  },
  {
    id: 'liste_attente',
    titre: 'Liste d\'attente — une place se libère',
    desc: 'Quand une place se libère sur un cours complet : en automatique, la 1ʳᵉ personne de la file est promue d\'office (place réservée + email) ; en manuel, rien ne bouge sans toi — tu choisis qui promouvoir depuis la page Liste d\'attente.',
    icone: '⏳',
    // Audit 2026-07-25 : les anciennes « stratégies » (place réservée 30 min,
    // notif simultanée) n'étaient implémentées NULLE PART — la carte promettait
    // des comportements inexistants. Une seule option auto = ce qui existe.
    // Compat : la valeur garde l'ancien nom (premier_30min) pour les studios
    // qui l'ont déjà en base.
    options: [
      { value: 'premier_30min', label: 'Promotion automatique du 1er de la file', subText: 'La place est attribuée d\'office et la personne est prévenue (email + push). Toi aussi, dans ta cloche.' },
    ],
    defaut: { mode: 'auto', choix: 'premier_30min', notifProf: false, notifEleveEmail: true, notifEleveSms: false },
  },
  {
    id: 'workshop_vs_cours',
    titre: 'Atelier / stage payable à la séance',
    desc: 'Un cours avec un « prix à la séance » (atelier, stage, cours hors carnet) ne décompte jamais de carnet : l\'élève voit le tarif sur le portail et dans son espace, et tu encaisses au pointage. Cette règle sert uniquement à choisir si tu veux être prévenue à chaque réservation.',
    icone: '🎯',
    // Un seul comportement moteur (audit cohérence 2026-07-22) : la séance se
    // règle à part, aucun carnet décompté (gate v70). Les anciennes options
    // (décompter N séances, etc.) n'étaient implémentées nulle part — on ne
    // propose plus de choix qui mentent. Les valeurs legacy stockées
    // (separe/une_seance/au_cas_par_cas…) restent inoffensives : aucun code ne
    // branche sur `choix` pour ce cas.
    options: [
      { value: 'paiement_a_regler', label: 'Réglé à la séance — aucun carnet décompté', subText: 'Comportement unique : montant visible côté élève, encaissement au pointage.' },
    ],
    defaut: { mode: 'auto', choix: 'paiement_a_regler', notifProf: false, notifEleveEmail: false, notifEleveSms: false },
  },
];

// ─── Helpers ───────────────────────────────────────────────────────────────

/**
 * Retourne la config par défaut (preset démarrage). Utilisé quand
 * profiles.regles_metier est NULL (compte legacy) ou pour seed à l'inscription.
 */
export function defaultRegles() {
  const out = {};
  for (const c of CASES) {
    out[c.id] = { ...c.defaut, messageCustom: null };
  }
  return out;
}

/**
 * Retourne la config effective d'un cas pour un profile donné.
 * Si profile.regles_metier est NULL ou n'a pas le cas, on retourne le défaut.
 */
export function getRegle(profile, caseId) {
  const caseDef = CASES.find(c => c.id === caseId);
  if (!caseDef) return null;
  const stored = profile?.regles_metier?.[caseId];
  if (!stored) return { ...caseDef.defaut, messageCustom: null };
  return {
    mode: stored.mode || caseDef.defaut.mode,
    choix: stored.choix !== undefined ? stored.choix : caseDef.defaut.choix,
    notifProf: stored.notifProf !== undefined ? stored.notifProf : caseDef.defaut.notifProf,
    notifEleveEmail: stored.notifEleveEmail !== undefined ? stored.notifEleveEmail : caseDef.defaut.notifEleveEmail,
    notifEleveSms: stored.notifEleveSms !== undefined ? stored.notifEleveSms : caseDef.defaut.notifEleveSms,
    messageCustom: stored.messageCustom || null,
  };
}

/**
 * L'app doit-elle appliquer automatiquement la règle, ou remonter le cas
 * dans l'inbox "À traiter" pour gestion manuelle ?
 */
export function shouldAutoApply(profile, caseId) {
  const r = getRegle(profile, caseId);
  return r?.mode === 'auto' && r?.choix != null;
}

/**
 * Label lisible d'un choix (pour affichage dans inbox / logs).
 */
export function getChoixLabel(caseId, choixValue) {
  const caseDef = CASES.find(c => c.id === caseId);
  if (!caseDef) return choixValue || '—';
  const opt = caseDef.options.find(o => o.value === choixValue);
  return opt?.label || choixValue || '—';
}

// ═══════════════════════════════════════════════════════════════════════════
// LA LOI D'ANNULATION — délais (JSONB profiles.regles_annulation)
// (ex-lib/regles-annulation.js, fusionné ici en B2a à comportement constant)
// ═══════════════════════════════════════════════════════════════════════════

const DEFAULT_DELAI_HEURES = 24;
const DEFAULT_MESSAGE = 'Annulation acceptée jusqu\'au délai indiqué';

export function getReglesAnnulation(profile) {
  const r = profile?.regles_annulation || {};
  return {
    delai_heures: typeof r.delai_heures === 'number' ? r.delai_heures : DEFAULT_DELAI_HEURES,
    politique: r.politique || 'excuse_si_delai',
    message: r.message || DEFAULT_MESSAGE,
    regles_par_type: r.regles_par_type || {},
  };
}

/**
 * Récupère le délai applicable à un cours, en tenant compte des règles
 * spécifiques par type si définies (sinon retombe sur le délai global).
 */
export function getDelaiPourCours(profile, typeCours) {
  const r = getReglesAnnulation(profile);
  if (typeCours && r.regles_par_type[typeCours]?.delai_heures != null) {
    return r.regles_par_type[typeCours].delai_heures;
  }
  return r.delai_heures;
}

/**
 * Indique si l'élève peut encore annuler librement à cet instant.
 * @returns { annulable: boolean, diffHeures: number, delaiHeures: number, dateLimite: Date }
 */
export function evaluerAnnulation(profile, coursDate, coursHeure, typeCours, now = Date.now()) {
  const delaiHeures = getDelaiPourCours(profile, typeCours);
  // ⚠️ Postgres renvoie une colonne `time` en 'HH:MM:SS'. L'ancien code
  // collait ':00' derrière → '17:45:00:00' → Invalid Date → diff NaN →
  // `NaN >= delai` = false → TOUTE annulation était « tardive », même un
  // mois avant (bug Manon/Soleya 2026-07-25, exposé dès la résurrection de
  // la route annuler). On normalise en 'HH:MM'.
  const heure = String(coursHeure || '00:00').slice(0, 5);
  const coursDateTime = new Date(`${coursDate}T${heure}:00`);
  // Le cours est stocké en heure de Paris (naïve) : on projette « now » dans
  // le même référentiel (le serveur Vercel tourne en UTC — sans ça, 2 h
  // d'écart l'été). Même astuce sv-SE que la route reserver.
  const nowParis = new Date(
    new Date(now).toLocaleString('sv-SE', { timeZone: 'Europe/Paris' }).replace(' ', 'T')
  );
  if (isNaN(coursDateTime.getTime()) || isNaN(nowParis.getTime())) {
    // Donnée imparsable → on ne sanctionne JAMAIS l'élève sur un bug de
    // parsing : annulation libre, et la prof garde la main via le pointage.
    return { annulable: true, diffHeures: Infinity, delaiHeures, dateLimite: null, coursDateTime: null };
  }
  const diffMs = coursDateTime - nowParis;
  const diffHeures = diffMs / (1000 * 60 * 60);
  const dateLimite = new Date(coursDateTime.getTime() - delaiHeures * 60 * 60 * 1000);
  return {
    annulable: diffHeures >= delaiHeures,
    diffHeures,
    delaiHeures,
    dateLimite,
    coursDateTime,
  };
}

/**
 * Formate la date limite d'annulation pour affichage (ex: "lundi 5 mai à 18h").
 */
export function formatDateLimite(dateLimite) {
  if (!dateLimite || isNaN(dateLimite.getTime())) return '';
  const j = dateLimite.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
  const h = dateLimite.toTimeString().slice(0, 5).replace(':', 'h');
  return `${j} à ${h}`;
}
