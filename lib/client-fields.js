/**
 * Champs élèves configurables — helpers
 *
 * La prof choisit dans /parametres quels champs elle veut collecter sur
 * les fiches élèves. Cette config est stockée dans profiles.client_fields_config
 * (JSONB), et les valeurs des champs perso dans clients.custom_fields (JSONB).
 *
 * Structure de la config :
 *   {
 *     predefined: {
 *       date_naissance: bool,  // 🎂 — pour mots doux d'anniversaire
 *       adresse: bool,         // 📍 — adresse postale
 *       niveau: bool,          // 🏆 — débutant / inter / avancé
 *       source: bool,          // 👀 — comment ils ont connu le studio
 *       notes: bool,           // 📝 — notes libres de la prof
 *     },
 *     custom: [
 *       { id, label, type, options?, required, ordre }
 *     ]
 *   }
 */

export const PREDEFINED_FIELDS = [
  {
    key:    'date_naissance',
    label:  'Date de naissance',
    icon:   '🎂',
    hint:   'Pour envoyer un mot doux le jour J',
    type:   'date',
  },
  {
    key:    'adresse',
    label:  'Adresse postale',
    icon:   '📍',
    hint:   'Utile pour les rare cas de courrier (cadeau, facture papier)',
    type:   'address',
  },
  {
    key:    'niveau',
    label:  'Niveau de pratique',
    icon:   '🏆',
    hint:   'Débutant / Intermédiaire / Avancé',
    type:   'select',
  },
  {
    key:    'source',
    label:  'Source / Provenance',
    icon:   '👀',
    hint:   'Comment l\'élève a découvert le studio',
    type:   'select',
  },
  {
    key:    'notes',
    label:  'Notes libres (vue prof uniquement)',
    icon:   '📝',
    hint:   'Pour tes propres notes (ex : "préfère le matin", "blessure dos")',
    type:   'textarea',
  },
];

// Config par défaut si jamais le user n'a rien personnalisé
export const DEFAULT_CLIENT_FIELDS_CONFIG = {
  predefined: {
    date_naissance: true,
    adresse:        false,
    niveau:         true,
    source:         true,
    notes:          true,
  },
  custom: [],
};

// Types de champs perso disponibles
export const CUSTOM_FIELD_TYPES = [
  { value: 'text',     label: 'Texte court' },
  { value: 'textarea', label: 'Texte long' },
  { value: 'select',   label: 'Liste de choix' },
  { value: 'number',   label: 'Nombre' },
  { value: 'date',     label: 'Date' },
];

/**
 * Renvoie la config effective d'un profile (avec défauts si NULL).
 */
export function getClientFieldsConfig(profile) {
  const cfg = profile?.client_fields_config;
  if (!cfg || typeof cfg !== 'object') return DEFAULT_CLIENT_FIELDS_CONFIG;
  return {
    predefined: { ...DEFAULT_CLIENT_FIELDS_CONFIG.predefined, ...(cfg.predefined || {}) },
    custom:     Array.isArray(cfg.custom) ? cfg.custom : [],
  };
}

/**
 * Génère un nouvel ID pour un champ perso (uuid v4 simple, sans dépendance).
 */
export function generateCustomFieldId() {
  // Format approximatif uuid v4 (suffisant pour ID local)
  return 'cf_' + Math.random().toString(36).slice(2, 11) + '_' + Date.now().toString(36);
}
