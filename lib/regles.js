/**
 * lib/regles.js — AUTOMATIONS custom SI/ALORS (table `regles`)
 * ─────────────────────────────────────────────────────────────────
 * Chaque règle a une condition (SI) et une action (ALORS), construite
 * par la prof dans le builder (ReglesTab). Ce fichier centralise :
 *  - Les définitions (pour l'UI du builder)
 *  - L'évaluateur (pour l'application runtime)
 *  - Les helpers d'affichage
 *
 * ⚠️ Frontière (B2a, 2026-07-25) : la POLITIQUE du studio (7 cas
 * paramétrables + loi d'annulation, JSONB profiles.regles_metier et
 * profiles.regles_annulation) vit dans lib/regles-metier.js. Ici, AUCUNE
 * loi d'annulation : l'action dormante `annulation_libre` (jamais activée,
 * `bientot:true` depuis toujours) a été supprimée — elle aurait stocké un
 * 2e delai_heures en conflit de source de vérité le jour de son activation
 * (conflit latent documenté par l'AUDIT-TECHNIQUE-2026 §3). Si une
 * automation doit un jour toucher à l'annulation, elle LIT le délai via
 * lib/regles-metier.js, elle ne stocke pas le sien.
 * ─────────────────────────────────────────────────────────────────
 */

import { SMS_ENABLED, SMS_PRIX_UNITAIRE } from './constantes';

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
  // ─── Conditions enrichies (W6.3) ─────────────────────────────────
  {
    type: 'credits_restants_max',
    label: "Crédits restants ≤",
    description: "L'élève a au plus N séances restantes sur un de ses carnets actifs.",
    params: [{ key: 'seuil', label: 'Seuil', type: 'number', default: 2, min: 0, suffix: 'séances ou moins' }],
  },
  {
    type: 'derniere_visite_jours',
    label: "N'a pas pratiqué depuis",
    description: "Le dernier cours auquel l'élève a été présent date d'au moins X jours.",
    params: [{ key: 'jours', label: 'Jours', type: 'number', default: 30, min: 1, suffix: 'jours sans venir' }],
  },
  {
    type: 'nb_reservations_30j_min',
    label: "Régulier (≥ N réservations sur 30 jours)",
    description: "L'élève a au moins N réservations dans les 30 derniers jours.",
    params: [{ key: 'seuil', label: 'Seuil', type: 'number', default: 6, min: 1, suffix: 'réservations sur 30 j' }],
  },
  {
    type: 'niveau',
    label: "A le niveau",
    description: "Selon le niveau de pratique renseigné dans la fiche élève.",
    params: [
      {
        key: 'niveau', label: 'Niveau', type: 'select', default: 'Débutant',
        options: [
          { value: 'Débutant',     label: 'Débutant·e' },
          { value: 'Intermédiaire', label: 'Intermédiaire' },
          { value: 'Avancé',        label: 'Avancé·e' },
        ],
      },
    ],
  },
];

// ═══════════════════════════════════════════════════════════════
// ACTIONS — Types de "ALORS"
// ═══════════════════════════════════════════════════════════════

export const ACTIONS = [
  {
    type: 'payer_plus_tard_auto',
    label: "Peut payer plus tard sans confirmation",
    description: "Le paiement différé est accordé automatiquement, tu n'as pas besoin de confirmer manuellement.",
    params: [],
    disponible: true,      // Actif dès maintenant
    bientot: false,
  },
  // `annulation_libre` supprimée en B2a : dormante (bientot:true, option
  // disabled dans le builder → aucune règle stockée possible), elle aurait
  // porté son propre delai_heures en conflit avec la loi d'annulation de
  // lib/regles-metier.js. Le délai d'annulation a UNE seule source.
  // `reservation_hebdo` et `acces_prioritaire` retirées en B3c (2026-07-26) :
  // options « bientôt » affichées dans le builder depuis des mois sans AUCUN
  // code moteur derrière (passe promesse = produit). À re-proposer le jour
  // où le moteur existe — une règle legacy stockée resterait inoffensive
  // (fallback label brut, aucun consommateur runtime).
  // ─── Actions enrichies (W6.3) — déclenchées par le cron quotidien ───
  {
    type: 'envoyer_email',
    label: "Envoyer un email",
    description: "Envoie automatiquement un email à l'élève (variables : {{prenom}}, {{studio}}). Une seule fois par règle (idempotence).",
    params: [
      { key: 'sujet', label: 'Objet', type: 'text', default: 'Un mot pour toi' },
      { key: 'corps', label: 'Message', type: 'textarea', default: 'Bonjour {{prenom}},\n\nJ\'avais envie de prendre de tes nouvelles.\n\nÀ très vite.' },
    ],
    disponible: true,
    bientot: false,
  },
  {
    type: 'envoyer_sms',
    label: "Envoyer un SMS",
    // Prix depuis les constantes (deux prix différents s'affichaient : 0,10 €
    // ici, 0,08 € dans les paramètres — B1g) ; action grisée tant que le
    // kill-switch global SMS_ENABLED est off (elle « tournait » sans jamais
    // rien envoyer, invisiblement).
    description: `Envoie automatiquement un SMS (${String(SMS_PRIX_UNITAIRE).replace('.', ',')} €/SMS facturé sur ta facture mensuelle).`,
    params: [
      { key: 'corps', label: 'Message SMS', type: 'textarea', default: 'Hello {{prenom}}, on ne t\'a pas vu·e récemment. À très vite, {{studio}}' },
    ],
    disponible: SMS_ENABLED,
    bientot: !SMS_ENABLED,
  },
  {
    type: 'creer_alerte_pro',
    label: "Créer une alerte côté pro",
    description: "Ajoute une notification dans ton tableau de bord (pas envoyée à l'élève).",
    params: [
      { key: 'message', label: 'Message', type: 'text', default: 'Pense à recontacter cette personne' },
    ],
    disponible: true,
    bientot: false,
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
function matchCondition(client, abonnements, regle, contexte = {}) {
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

    case 'credits_restants_max': {
      const seuil = parseInt(p.seuil) || 0;
      return (abonnements || []).some(a => {
        if (a.statut !== 'actif' || a.seances_total == null) return false;
        const reste = (a.seances_total || 0) - (a.seances_utilisees || 0);
        return reste >= 0 && reste <= seuil;
      });
    }

    case 'derniere_visite_jours': {
      const jours = parseInt(p.jours) || 0;
      // contexte.derniere_presence_at : timestamp ou null si jamais venu
      const last = contexte.derniere_presence_at ? new Date(contexte.derniere_presence_at) : null;
      if (!last) return jours > 0; // jamais venu = règle s'applique
      const diffJours = (Date.now() - last.getTime()) / 86400000;
      return diffJours >= jours;
    }

    case 'nb_reservations_30j_min': {
      const seuil = parseInt(p.seuil) || 0;
      return (contexte.nb_reservations_30j || 0) >= seuil;
    }

    case 'niveau':
      return client?.niveau === p.niveau;

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
export function evaluerRegles(client, abonnements, regles, contexte = {}) {
  const resultat = {};

  for (const regle of (regles || []).filter(r => r.actif)) {
    if (matchCondition(client, abonnements, regle, contexte)) {
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

/**
 * Variante : retourne TOUTES les règles qui matchent (pas juste la dernière par
 * type d'action). Utile pour les actions email/sms qui peuvent être multiples.
 */
export function evaluerReglesAll(client, abonnements, regles, contexte = {}) {
  return (regles || [])
    .filter(r => r.actif)
    .filter(r => matchCondition(client, abonnements, r, contexte));
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

  if (regle.action_type === 'envoyer_email') {
    const s = (regle.action_params?.sujet || '').slice(0, 40);
    return `Email auto · « ${s}${s.length === 40 ? '…' : ''} »`;
  }
  if (regle.action_type === 'envoyer_sms') {
    // Prix depuis les constantes — un 0,10 € en dur a survécu à l'unification B1g
    return `SMS auto (${String(SMS_PRIX_UNITAIRE).replace('.', ',')} €)`;
  }
  if (regle.action_type === 'creer_alerte_pro') {
    return `Alerte côté pro · « ${(regle.action_params?.message || '').slice(0, 40)}… »`;
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
