/**
 * lib/regles.js
 * ─────────────────────────────────────────────────────────────────
 * Système de règles automatiques IziSolo.
 *
 * Chaque règle a une condition (SI) et une action (ALORS).
 * Ce fichier centralise :
 *  - Les définitions (pour l'UI du builder)
 *  - L'évaluateur (pour l'application runtime)
 *  - Les helpers d'affichage
 * ─────────────────────────────────────────────────────────────────
 */

// ═══════════════════════════════════════════════════════════════
// CONDITIONS — Types de "SI"
// ═══════════════════════════════════════════════════════════════

export const CONDITIONS = [
  {
    type: 'abonnement_actif',
    label: "A un abonnement ou carnet actif",
    description: "L'élève a au moins un abonnement ou carnet en cours de validité.",
    params: [],
  },
  {
    type: 'abonnement_type',
    label: "A un abonnement d'un type précis",
    description: "L'élève a un abonnement actif d'un type spécifique.",
    params: [
      {
        key: 'type',
        label: 'Type',
        type: 'select',
        default: 'abonnement',
        options: [
          { value: 'abonnement', label: 'Abonnement (mensuel / annuel)' },
          { value: 'carnet',     label: 'Carnet de séances' },
          { value: 'cours_unique', label: 'Cours à l\'unité' },
        ],
      },
    ],
  },
  {
    type: 'statut_client',
    label: "A le statut",
    description: "En fonction du statut de l'élève dans le CRM.",
    params: [
      {
        key: 'statut',
        label: 'Statut',
        type: 'select',
        default: 'actif',
        options: [
          { value: 'actif',    label: 'Actif' },
          { value: 'prospect', label: 'Prospect' },
          { value: 'fidele',   label: 'Fidèle' },
          { value: 'inactif',  label: 'Inactif' },
        ],
      },
    ],
  },
  {
    type: 'toujours',
    label: "Pour tous les élèves",
    description: "S'applique sans condition à tout le monde.",
    params: [],
  },
];

// ═══════════════════════════════════════════════════════════════
// ACTIONS — Types de "ALORS"
// ═══════════════════════════════════════════════════════════════

export const ACTIONS = [
  {
    type: 'payer_plus_tard_auto',
    label: "Peut payer plus tard sans confirmation",
    description: "Le paiement différé est accordé automatiquement — tu n'as pas besoin de confirmer manuellement.",
    params: [],
    disponible: true,      // Actif dès maintenant
    bientot: false,
  },
  {
    type: 'reservation_hebdo',
    label: "Place réservée automatiquement chaque semaine",
    description: "L'élève a une place garantie dans le cours récurrent sans avoir à réserver.",
    params: [],
    disponible: false,
    bientot: true,         // Actif avec le module de réservation en ligne
  },
  {
    type: 'annulation_libre',
    label: "Peut annuler librement jusqu'à",
    description: "L'élève peut annuler sa réservation en autonomie jusqu'à un délai paramétrable.",
    params: [
      {
        key: 'delai_heures',
        label: 'Délai',
        type: 'number',
        default: 24,
        min: 1,
        suffix: 'heures avant le cours',
      },
    ],
    disponible: false,
    bientot: true,
  },
  {
    type: 'acces_prioritaire',
    label: "Accès prioritaire aux réservations",
    description: "L'élève peut réserver avant l'ouverture générale des inscriptions.",
    params: [],
    disponible: false,
    bientot: true,
  },
];

// ═══════════════════════════════════════════════════════════════
// ÉVALUATEUR — applique les règles à un client + ses abonnements
// ═══════════════════════════════════════════════════════════════

/**
 * Vérifie si la condition d'une règle est remplie.
 * @param {object} client       — objet client (statut, etc.)
 * @param {Array}  abonnements  — liste des abonnements du client
 * @param {object} regle        — la règle à évaluer
 * @returns {boolean}
 */
function matchCondition(client, abonnements, regle) {
  const p = regle.condition_params || {};

  switch (regle.condition_type) {
    case 'toujours':
      return true;

    case 'abonnement_actif':
      return (abonnements || []).some(a => a.statut === 'actif');

    case 'abonnement_type':
      return (abonnements || []).some(a => a.statut === 'actif' && a.type === p.type);

    case 'statut_client':
      return client?.statut === p.statut;

    default:
      return false;
  }
}

/**
 * Retourne un objet { [action_type]: { ...action_params, regle_id, regle_nom } }
 * pour toutes les règles actives qui s'appliquent au client.
 *
 * Usage :
 *   const actions = evaluerRegles(client, abonnements, regles);
 *   if (actions.payer_plus_tard_auto) { ... }
 *
 * @param {object} client
 * @param {Array}  abonnements
 * @param {Array}  regles        — toutes les règles actives du profil
 * @returns {Record<string, object>}
 */
export function evaluerRegles(client, abonnements, regles) {
  const resultat = {};

  for (const regle of (regles || []).filter(r => r.actif)) {
    if (matchCondition(client, abonnements, regle)) {
      // La dernière règle correspondante "gagne" si plusieurs du même type
      resultat[regle.action_type] = {
        ...(regle.action_params || {}),
        regle_id:  regle.id,
        regle_nom: regle.nom,
      };
    }
  }

  return resultat;
}

// ═══════════════════════════════════════════════════════════════
// HELPERS D'AFFICHAGE
// ═══════════════════════════════════════════════════════════════

/**
 * Retourne un label lisible pour la condition d'une règle.
 */
export function getConditionLabel(regle) {
  const cond = CONDITIONS.find(c => c.type === regle.condition_type);
  if (!cond) return regle.condition_type;

  if (regle.condition_type === 'abonnement_type') {
    const opt = cond.params[0]?.options?.find(o => o.value === regle.condition_params?.type);
    return opt ? opt.label : cond.label;
  }

  if (regle.condition_type === 'statut_client') {
    const opt = cond.params[0]?.options?.find(o => o.value === regle.condition_params?.statut);
    return opt ? `Statut "${opt.label}"` : cond.label;
  }

  return cond.label;
}

/**
 * Retourne un label lisible pour l'action d'une règle.
 */
export function getActionLabel(regle) {
  const action = ACTIONS.find(a => a.type === regle.action_type);
  if (!action) return regle.action_type;

  if (regle.action_type === 'annulation_libre') {
    const h = regle.action_params?.delai_heures ?? 24;
    return `Peut annuler jusqu'à ${h}h avant le cours`;
  }

  return action.label;
}

/**
 * Retourne les defaults de condition_params pour un type de condition donné.
 */
export function defaultConditionParams(conditionType) {
  const cond = CONDITIONS.find(c => c.type === conditionType);
  if (!cond) return {};
  return Object.fromEntries(
    (cond.params || []).map(p => [p.key, p.default ?? (p.options?.[0]?.value || '')])
  );
}

/**
 * Retourne les defaults de action_params pour un type d'action donné.
 */
export function defaultActionParams(actionType) {
  const action = ACTIONS.find(a => a.type === actionType);
  if (!action) return {};
  return Object.fromEntries(
    (action.params || []).map(p => [p.key, p.default ?? ''])
  );
}
