// ════════════════════════════════════════════════════════════════════════════
// Les RUBRIQUES de Paramètres : la carte de l'écran (lot 1 du plan
// « Paramètres qui respirent », 2026-09-09, décisions Colin du même jour :
// rubrique « Argent », Profil et Activité fusionnés en « Studio & lieux »,
// bloc SMS retiré, structure d'abord).
//
// Avant : 5 onglets × 13 sous-onglets, deux barres qui débordaient sur mobile,
// et l'argent éparpillé sur trois onglets. Après : UNE liste de rubriques,
// groupées par la question que se pose la prof, chaque ligne avec un résumé
// d'état, et une URL par rubrique (/parametres/<id>).
//
// PUR : aucune requête, aucun React. Le verrou CI (parametres-rubriques.spec)
// relit ce fichier pour garantir que chaque carte a une rubrique et une seule,
// que chaque ancien deep-link atterrit quelque part, et qu'aucun résumé ne
// jette sur un profil vide.
// ════════════════════════════════════════════════════════════════════════════

import { PLANS, METIERS } from '@/lib/constantes';
import { can, effectivePlan } from '@/lib/plan-guard';
import { getTrialStatus } from '@/lib/trial';
import { paysDe, aDeclarationAutomatisable, formaterIdentifiant } from '@/lib/pays';
import { REGIMES, PERIODICITES, sanitizeConfigUrssaf } from '@/lib/urssaf';
import { sanitizeReglementConfig } from '@/lib/reglement';
import { sanitizeDocs } from '@/lib/docs-inscription';
import { webhookConfigure } from '@/lib/paiement-en-ligne';
import { getReglesAnnulation } from '@/lib/regles-metier';
import { getAllTypesFromCategories } from '@/lib/utils';

export const GROUPES = [
  { id: 'studio',        label: 'Mon studio' },
  { id: 'page',          label: 'Ma page publique' },
  { id: 'argent',        label: 'Argent' },
  { id: 'eleves',        label: 'Élèves & cours' },
  { id: 'notifications', label: 'Notifications' },
  { id: 'abonnement',    label: 'Abonnement IziSolo' },
];

const pluriel = (n, un, des) => `${n} ${n > 1 ? des : un}`;

/**
 * Chaque rubrique :
 *   id       = le segment d'URL (/parametres/<id>), stable : le guide, la FAQ
 *              et les écrans y renvoient.
 *   groupe   = l'un des GROUPES.
 *   label    = ce que la liste affiche.
 *   icone    = nom lucide, résolu côté client (ce module reste pur).
 *   cartes   = les cartes de lib/parametres-cartes qu'elle rend. Une carte
 *              vit dans UNE rubrique ; les rubriques sans carte (cas
 *              particuliers, mes notifications…) écrivent par leurs propres
 *              routes.
 *   visible  = (profile, ctx) → boolean ; absent = toujours.
 *   resume   = (profile, ctx) → string : l'état sur une ligne, jamais une
 *              erreur (un profil vide donne un résumé « pas encore »).
 *   aide     = ancre du guide /aide pour le « ? » contextuel (optionnel).
 */
export const RUBRIQUES = [
  {
    id: 'profil', groupe: 'studio', label: 'Profil', icone: 'User',
    cartes: ['profil'],
    resume: (p) => [`${p?.prenom || ''} ${p?.nom || ''}`.trim(), p?.email_contact].filter(Boolean).join(' · ') || 'Ton nom et tes coordonnées',
  },
  {
    id: 'studio', groupe: 'studio', label: 'Studio & lieux', icone: 'Building2',
    cartes: ['activite'],
    resume: (p, ctx) => {
      const metier = METIERS[p?.metier]?.label;
      const lieux = Array.isArray(ctx?.lieux) ? ctx.lieux.length : null;
      return [p?.studio_nom, metier, p?.ville, lieux != null ? pluriel(lieux, 'lieu', 'lieux') : null].filter(Boolean).join(' · ') || 'Nom, métier, ville et lieux';
    },
  },
  {
    id: 'equipe', groupe: 'studio', label: 'Équipe', icone: 'UserCog',
    cartes: [], lien: '/equipe', aide: 'equipe',
    visible: (p) => !!p && can(p, 'equipe'),
    resume: () => 'Inviter des profs, régler leurs droits',
  },

  {
    id: 'page', groupe: 'page', label: 'Ma page', icone: 'Eye', aide: 'page-publique',
    cartes: ['page'],
    resume: (p) => {
      const parts = [];
      if (p?.photo_couverture) parts.push('couverture');
      if (p?.bio) parts.push('bio');
      if (p?.instagram_url || p?.facebook_url || p?.website_url) parts.push('réseaux');
      if (Array.isArray(p?.faq_publique) && p.faq_publique.length) parts.push('FAQ');
      if (p?.afficher_tarifs === true) parts.push('tarifs affichés');
      return parts.length ? parts.join(' · ') : 'Photos, bio, réseaux, FAQ';
    },
  },
  {
    id: 'types-cours', groupe: 'page', label: 'Types de cours', icone: 'Palette', aide: 'apparence-cours',
    cartes: ['apparence'],
    resume: (p) => {
      const types = getAllTypesFromCategories(p?.types_cours);
      const vignettes = (p?.vignettes_par_type && typeof p.vignettes_par_type === 'object') ? Object.keys(p.vignettes_par_type).length : 0;
      if (!types.length) return 'Couleur et photo de chaque type';
      return [pluriel(types.length, 'type', 'types'), vignettes ? pluriel(vignettes, 'photo', 'photos') : null].filter(Boolean).join(' · ');
    },
  },
  {
    id: 'essai', groupe: 'page', label: "Cours d'essai", icone: 'Sparkles', aide: 'cours-essai',
    cartes: ['essai'],
    resume: (p) => {
      if (p?.essai_actif !== true) return 'Désactivé';
      const mode = p?.essai_mode === 'auto' ? 'validation automatique' : p?.essai_mode === 'semi' ? 'validation semi-automatique' : 'validation manuelle';
      const prix = p?.essai_paiement === 'gratuit' || !p?.essai_paiement ? 'gratuit' : `${Number(p.essai_prix) || 0} €`;
      return `Activé · ${mode} · ${prix}`;
    },
  },
  {
    id: 'documents', groupe: 'page', label: "Documents d'inscription", icone: 'FileText',
    cartes: ['docs'],
    resume: (p) => { const n = sanitizeDocs(p?.docs_inscription).length; return n ? pluriel(n, 'PDF', 'PDF') : 'Aucun document'; },
  },
  {
    id: 'integrer', groupe: 'page', label: 'Intégrer sur mon site', icone: 'Code2', aide: 'page-publique',
    cartes: [],
    resume: (p) => (p?.couleurs_marque?.c1 ? 'Planning, offres, QR code · tes couleurs' : 'Planning, offres, QR code'),
  },

  {
    id: 'facturation', groupe: 'argent', label: 'Facturation', icone: 'Receipt', aide: 'factures',
    cartes: ['facturation'],
    resume: (p) => {
      const pays = paysDe(p);
      const num = String(p?.facturation_siret || '').trim();
      if (!num) return `${pays.identifiant.label} à renseigner`;
      return [`${pays.identifiant.label} ${formaterIdentifiant(p?.pays, num)}`, p?.facturation_auto === true ? 'facture envoyée à chaque encaissement' : null].filter(Boolean).join(' · ');
    },
  },
  {
    id: 'paiement-en-ligne', groupe: 'argent', label: 'Paiement en ligne', icone: 'CreditCard', aide: 'offres',
    cartes: ['paiement'],
    resume: (p) => (webhookConfigure(p) ? 'Stripe branché' : 'Pas encore branché'),
  },
  {
    id: 'virement', groupe: 'argent', label: 'Virement (RIB)', icone: 'Landmark', aide: 'encaisser',
    cartes: ['reglement'],
    resume: (p) => {
      const cfg = sanitizeReglementConfig(p?.reglement_config);
      if (!cfg?.rib?.iban) return 'RIB à renseigner';
      const iban = cfg.rib.iban;
      return `${iban.slice(0, 4)} … ${iban.slice(-3)}`;
    },
  },
  {
    id: 'urssaf', groupe: 'argent', label: 'Déclaration URSSAF', icone: 'Scale', aide: 'urssaf',
    cartes: ['urssaf'],
    visible: (p) => aDeclarationAutomatisable(p?.pays),
    resume: (p) => {
      const cfg = sanitizeConfigUrssaf(p?.urssaf_config);
      if (!cfg) return 'Pas encore configurée';
      return [(REGIMES[cfg.regime]?.label || '').replace(/\s*\(.*$/, ''), PERIODICITES[cfg.periodicite]?.label?.toLowerCase(), cfg.rappel_email !== false ? 'rappel activé' : null].filter(Boolean).join(' · ');
    },
  },

  {
    id: 'champs', groupe: 'eleves', label: 'Infos collectées', icone: 'ClipboardList', aide: 'eleves',
    cartes: ['champs'],
    resume: (p) => {
      const cfg = p?.client_fields_config;
      const custom = Array.isArray(cfg?.custom) ? cfg.custom.length : 0;
      return custom ? pluriel(custom, 'champ perso', 'champs perso') : 'Les champs de tes fiches élèves';
    },
  },
  {
    id: 'visibilite', groupe: 'eleves', label: 'Visibilité par défaut', icone: 'EyeOff',
    cartes: ['visibilite'],
    resume: (p) => {
      const v = { public: 'Tout le monde', inscrits: 'Élèves inscrits', abonnes: "Détenteurs d'abonnement", fideles: 'Élèves fidèles', prive: 'Sur invitation' }[p?.visibilite_default || 'public'] || 'Tout le monde';
      return `${v} · inscrits ${p?.afficher_inscrits === false ? 'masqués' : 'affichés'}`;
    },
  },
  {
    id: 'annulation', groupe: 'eleves', label: 'Annulation', icone: 'Clock', aide: 'regles-annulation',
    cartes: ['annulation'],
    resume: (p) => `${getReglesAnnulation(p).delai_heures} h avant la séance`,
  },
  {
    id: 'cas-particuliers', groupe: 'eleves', label: 'Cas particuliers', icone: 'Zap', aide: 'cas-a-traiter',
    cartes: [],
    resume: () => 'Absence, retard, atelier, liste d\'attente…',
  },
  {
    id: 'seuils', groupe: 'eleves', label: "Seuils d'alerte", icone: 'Gauge',
    cartes: ['seuils', 'seuils_prof'],
    resume: (p) => `${parseInt(p?.alerte_seances_seuil) || 2} séances · ${parseInt(p?.alerte_expiration_jours) || 7} jours · paiement ${parseInt(p?.alerte_paiement_attente_jours) || 14} jours`,
  },

  {
    id: 'mes-notifications', groupe: 'notifications', label: 'Ce que je reçois', icone: 'Bell',
    cartes: [],
    resume: () => 'Cloche, push et emails, type par type',
  },
  {
    id: 'notifications-eleves', groupe: 'notifications', label: 'Ce que tes élèves reçoivent', icone: 'Send',
    cartes: ['notifs_eleves', 'anniv'],
    resume: (p) => {
      const n = p?.notifs_eleves && typeof p.notifs_eleves === 'object'
        ? Object.values(p.notifs_eleves).filter(v => v && typeof v === 'object' && v.email === true).length
        : 0;
      const anniv = (p?.anniversaire_mode || 'semi') !== 'off';
      return [pluriel(n, 'email automatique', 'emails automatiques'), anniv ? 'anniversaires' : null].filter(Boolean).join(' · ');
    },
  },

  {
    id: 'abonnement', groupe: 'abonnement', label: 'Mon abonnement IziSolo', icone: 'Crown', aide: 'abonnement',
    cartes: [],
    resume: (p) => {
      if (!p) return 'Ton plan et ta facturation';
      const trial = getTrialStatus(p);
      const plan = PLANS[effectivePlan(p)] || PLANS.solo;
      if (trial.active) return `Essai · ${plan.nom} · ${trial.daysLeft} ${trial.daysLeft > 1 ? 'jours restants' : 'jour restant'}`;
      if (trial.expired) return 'Essai terminé · choisis ton plan';
      return plan.prix > 0 ? `${plan.nom} · ${plan.prix} €/mois` : plan.nom;
    },
  },
];

export const RUBRIQUE_IDS = RUBRIQUES.map(r => r.id);

export function rubriqueParId(id) {
  return RUBRIQUES.find(r => r.id === id) || null;
}

/** Les rubriques que CE profil doit voir, groupées dans l'ordre de GROUPES. */
export function rubriquesVisibles(profile, ctx = {}) {
  return RUBRIQUES.filter(r => (typeof r.visible === 'function' ? r.visible(profile, ctx) : true));
}

export function rubriquesParGroupe(profile, ctx = {}) {
  const visibles = rubriquesVisibles(profile, ctx);
  return GROUPES
    .map(g => ({ ...g, rubriques: visibles.filter(r => r.groupe === g.id) }))
    .filter(g => g.rubriques.length);
}

/** Le résumé d'une rubrique, garanti sans exception (le résumé est décoratif). */
export function resumeRubrique(rubrique, profile, ctx = {}) {
  try {
    const s = rubrique.resume ? rubrique.resume(profile, ctx) : '';
    return typeof s === 'string' ? s : '';
  } catch {
    return '';
  }
}

// ── Anciens deep-links ?tab=…&s=… → rubrique ─────────────────────────────
// 17 sites du code, 2 URL de retour Stripe et l'email du cron de fin d'essai
// pointaient sur l'ancienne forme. On ne touche pas aux appelants qu'on ne
// contrôle pas (emails déjà envoyés, favoris) : la redirection les sert.
const ANCIENS_LIENS = {
  'profil':               'profil',
  'profil/profil':        'profil',
  'profil/activite':      'studio',
  'profil/lieux':         'studio',
  'profil/champs':        'champs',
  'portail':              'page',
  'portail/page':         'page',
  'portail/apparence':    'types-cours',
  'portail/visibilite':   'visibilite',
  'portail/essai':        'essai',
  'portail/paiement':     'paiement-en-ligne',
  'notifications':        'mes-notifications',
  'notifications/notifs': 'mes-notifications',
  'notifications/eleves': 'notifications-eleves',
  'notifications/seuils': 'seuils',
  'notifications/anniv':  'notifications-eleves',
  'regles':               'annulation',
  'regles/annulation':    'annulation',
  'regles/metier':        'cas-particuliers',
  'abonnement':           'abonnement',
};

/**
 * @param {string|null} tab  l'ancien ?tab=
 * @param {string|null} s    l'ancien &s=
 * @returns {string|null} l'id de rubrique, ou null si l'ancien lien est inconnu
 */
export function rubriqueDepuisAncienLien(tab, s) {
  if (!tab) return null;
  return ANCIENS_LIENS[s ? `${tab}/${s}` : tab] || ANCIENS_LIENS[tab] || null;
}

export const ANCIENS_LIENS_CONNUS = Object.keys(ANCIENS_LIENS);
