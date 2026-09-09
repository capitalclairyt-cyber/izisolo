// ════════════════════════════════════════════════════════════════════════════
// Les CARTES de Paramètres : la source unique de « quelle carte possède
// quelles colonnes » et de « comment chaque colonne s'écrit ».
//
// Extrait de app/(dashboard)/parametres/page.js le 2026-09-09 (lot 1 du plan
// « Paramètres qui respirent »). PUR : aucune requête, aucun React, pour que
// le verrou CI puisse le relire sans navigateur.
//
// Règle B2e conservée telle quelle : chaque carte = la liste EXACTE des
// colonnes qu'elle possède. Le bouton Enregistrer d'une carte n'écrit QUE ces
// colonnes (UPDATE partiel) : une erreur sur un champ ne bloque que sa carte,
// et le save d'un écran ne réécrit jamais les champs des autres.
// ════════════════════════════════════════════════════════════════════════════

import { sanitizeDocs } from '@/lib/docs-inscription';
import { sanitizeEssaiPrixParType } from '@/lib/essai-tarif';
import { sanitizeConfigUrssaf } from '@/lib/urssaf';
import { sanitizeReglementConfig } from '@/lib/reglement';
import { sanitizeTonsParType, sanitizeVignettesParType } from '@/lib/vignette-cours';

// Normalise une URL utilisateur :
//   - vide / null / espaces → null (pour respecter la CHECK constraint NULL OK)
//   - sans protocole "https://" ou "http://" → on préfixe avec "https://"
// Évite l'erreur DB : profiles_website_url_format / instagram / facebook
export function normalizeUrl(value) {
  if (!value) return null;
  const trimmed = String(value).trim();
  if (!trimmed) return null;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return 'https://' + trimmed;
}

export const CARTES = {
  profil:        ['prenom', 'nom', 'email_contact', 'telephone', 'adresse'],
  activite:      ['studio_nom', 'ville', 'metier'],
  facturation:   ['facturation_raison_sociale', 'facturation_siret', 'facturation_mention_tva', 'pays'],
  reglement:     ['reglement_config'],
  urssaf:        ['urssaf_config'],
  champs:        ['client_fields_config'],
  page:          ['photo_couverture_focal_y', 'bio', 'philosophie', 'formations', 'annees_experience',
                  'horaires_studio', 'horaires_studio_jours', 'afficher_tarifs', 'afficher_horaires',
                  'faq_publique', 'instagram_url', 'facebook_url', 'website_url'],
  docs:          ['docs_inscription'],
  apparence:     ['tons_par_type', 'vignettes_par_type'],
  visibilite:    ['visibilite_default', 'afficher_inscrits'],
  essai:         ['essai_actif', 'essai_mode', 'essai_paiement', 'essai_prix', 'essai_prix_par_type', 'essai_stripe_payment_link', 'essai_message'],
  paiement:      ['stripe_webhook_secret'],
  seuils_prof:   ['alerte_paiement_attente_jours'],
  seuils:        ['alerte_seances_seuil', 'alerte_expiration_jours'],
  anniv:         ['anniversaire_mode', 'anniversaire_message'],
  // Le bloc SMS est retiré de l'écran (2026-09-09, décision Colin) : la
  // feature n'a jamais été livrée (SMS_ENABLED = false). `sms_seuil_mois`
  // reste en base, 0 lecteur, 0 writer.
  notifs_eleves: ['notifs_eleves'],
  annulation:    ['regles_annulation'],
};

// Colonnes dont la migration peut ne pas encore être appliquée en prod. Une
// entrée ici = « si PostgREST la refuse, rejoue l'enregistrement sans elle
// plutôt que de tout perdre ». À VIDER une fois la migration passée partout.
export const COLONNES_EN_ATTENTE_DE_MIGRATION = new Set(['pays']); // v105

// Transformations avant écriture — miroir exact de l'ancien handleSave
// monolithique (comportement constant). Champ absent d'ici = valeur brute.
export const SERIALIZERS = {
  email_contact:             v => v || null,
  facturation_raison_sociale: v => v || null,
  facturation_siret:         v => (v ? String(v).replace(/\s/g, '') : null),
  facturation_mention_tva:   v => v || null,
  pays:                      v => (['FR', 'BE', 'LU'].includes(v) ? v : 'FR'),
  // La config URSSAF n'est JAMAIS écrite brute : sanitize = taux bornés,
  // régime/périodicité de la liste blanche, défauts du régime si difforme.
  urssaf_config:             v => sanitizeConfigUrssaf(v),
  // v98 — même règle : IBAN validé mod-97 (un IBAN faux est JETÉ), modes de
  // la liste blanche. undefined pré-migration → omis du payload (pattern v92).
  reglement_config:          v => (v === undefined ? undefined : sanitizeReglementConfig(v)),
  alerte_seances_seuil:      v => parseInt(v) || 2,
  alerte_expiration_jours:   v => parseInt(v) || 7,
  alerte_paiement_attente_jours: v => parseInt(v) || 14,
  anniversaire_message:      v => v || null,
  stripe_webhook_secret:     v => v || null,
  regles_annulation:         v => v || null,
  docs_inscription:          v => { const s = sanitizeDocs(v); return s.length ? s : null; },
  // v99 — jamais écrites brutes : tons de la liste blanche, vignettes sur NOS
  // hosts uniquement (une URL étrangère ferait jeter next/image au rendu).
  // undefined pré-migration → omis du payload (même patron que v92 / v98).
  tons_par_type:             v => (v === undefined ? undefined : sanitizeTonsParType(v)),
  vignettes_par_type:        v => (v === undefined ? undefined : sanitizeVignettesParType(v)),
  notifs_eleves:             v => v || null,
  photo_couverture_focal_y:  v => (v != null ? parseInt(v) : 50),
  bio:                       v => v || null,
  philosophie:               v => v || null,
  formations:                v => v || null,
  annees_experience:         v => (v ? parseInt(v) : null),
  horaires_studio:           v => v || null,
  horaires_studio_jours:     v => v || null,
  client_fields_config:      v => v || null,
  afficher_tarifs:           v => v === true,
  afficher_horaires:         v => v === true,
  afficher_inscrits:         v => v !== false,
  faq_publique:              v => v || [],
  instagram_url:             normalizeUrl,
  facebook_url:              normalizeUrl,
  website_url:               normalizeUrl,
  essai_actif:               v => v === true,
  essai_mode:                v => v || 'manuel',
  essai_paiement:            v => v || 'gratuit',
  essai_prix:                v => parseFloat(v) || 0,
  // v92 — undefined (colonne pas encore migrée, jamais touchée) doit RESTER
  // undefined : supabase-js l'omet du payload, la carte se sauve pré-migration.
  essai_prix_par_type:       v => (v === undefined ? undefined : sanitizeEssaiPrixParType(v)),
  essai_stripe_payment_link: v => v || null,
  essai_message:             v => v || null,
  visibilite_default:        v => v || 'public',
};

// Message d'anniversaire par défaut (le même que le prefill de la messagerie).
export const ANNIV_MESSAGE_DEFAUT = 'Joyeux anniversaire {prenom} ! 🎂 En ce jour spécial, toute l\'équipe du studio te souhaite une magnifique journée. À très bientôt sur le tapis !';

/** field → carte propriétaire (déduit de CARTES). */
export function carteDuChamp() {
  const index = {};
  for (const [carte, fields] of Object.entries(CARTES)) {
    for (const f of fields) index[f] = carte;
  }
  return index;
}

/**
 * Le payload EXACT qu'écrit le bouton Enregistrer d'une carte : les seules
 * colonnes de la carte, chacune passée par son sérialiseur.
 * @returns {object|null} null si la carte est inconnue.
 */
export function payloadCarte(carte, profile) {
  const fields = CARTES[carte];
  if (!fields || !profile) return null;
  const payload = {};
  for (const f of fields) {
    const brut = profile[f];
    payload[f] = SERIALIZERS[f] ? SERIALIZERS[f](brut) : brut;
  }
  return payload;
}
