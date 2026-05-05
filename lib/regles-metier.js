// ============================================================================
// IziSolo — Règles métier (cas particuliers paramétrables)
// ----------------------------------------------------------------------------
// 7 cas que la prof configure une fois, l'app applique ensuite la règle
// automatiquement OU remonte le cas dans une inbox "À traiter" si elle a
// choisi le mode manuel.
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
    desc: 'Quand un·e inscrit·e annule un cours complet, comment proposer la place aux personnes en attente ?',
    icone: '⏳',
    options: [
      { value: 'premier_30min',    label: 'Notif au 1er, place réservée 30 min, sinon au 2e', subText: 'Mode actuel par défaut. Équitable mais demande à l\'élève d\'être réactive.' },
      { value: 'simultane',        label: 'Notif simultanée à tous, premier clic gagne',     subText: 'Plus rapide à remplir, mais frustrant pour les autres.' },
      { value: 'choix_prof',       label: 'Tu choisis manuellement parmi les en-attente',    subText: 'Tu vois la liste, tu sélectionnes qui prend la place.' },
    ],
    defaut: { mode: 'auto', choix: 'premier_30min', notifProf: false, notifEleveEmail: true, notifEleveSms: false },
  },
  {
    id: 'workshop_vs_cours',
    titre: 'Workshop / stage spécial',
    desc: 'Comment l\'app gère les évènements ponctuels (workshop, stage week-end) par rapport aux carnets/abos classiques ?',
    icone: '🎯',
    options: [
      { value: 'separe',           label: 'Facturé séparément — pas de décompte carnet',    subText: 'Workshop = paiement ponctuel via Stripe Payment Link, indépendant.' },
      { value: 'decompte_n_seances', label: 'Décompter N séances du carnet (équivalence durée)', subText: 'Ex: workshop 2h = 2 séances décomptées du carnet 1h.' },
      { value: 'une_seance',       label: 'Accessible avec carnet, 1 séance décomptée',     subText: 'Workshop traité comme un cours régulier dans le carnet.' },
      { value: 'au_cas_par_cas',   label: 'Configurable à la création de l\'évènement',     subText: 'Une case à cocher dans le formulaire de création de workshop.' },
    ],
    defaut: { mode: 'auto', choix: 'au_cas_par_cas', notifProf: false, notifEleveEmail: false, notifEleveSms: false },
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
