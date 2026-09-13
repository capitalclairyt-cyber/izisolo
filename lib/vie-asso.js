// ============================================================================
// IziSolo — La vie de l'association (v113, lot 3 du chantier Associations &
// Studios, 2026-09-13, PLAN-ASSOS-STUDIOS-2026.md §5.1)
// ----------------------------------------------------------------------------
// Quatre choses, bornées : le BUREAU (des fonctions sur les rôles existants,
// jamais un troisième système de droits), l'ADHÉSION (une offre de saison
// sans séance, une règle « adhésion requise pour réserver », un reçu de
// cotisation), les DOCUMENTS (statuts, récépissé, PV…), et l'AG (convocation,
// émargement, quorum, PV). On ne devient pas AssoConnect.
//
// Fichier PUR : vocabulaire, préréglages, sanitize, calculs. Testable sans
// base (verrou CI `vie-asso.spec.js`). Les écritures vivent dans les routes.
// ============================================================================

import { PRESETS, CLES_PERMISSIONS, sanitizePermissions } from './studio-membre.js';
import { exerciceDe, EXERCICE_SAISON } from './depenses.js';

// ── 1. Le bureau ─────────────────────────────────────────────────────────────
/**
 * Une fonction = une étiquette (équipe, PV, convocations) + un PRÉRÉGLAGE de
 * permissions proposé à l'invitation. Les droits appliqués restent la
 * matrice `permissions`, réglable case par case après coup.
 */
export const FONCTIONS = {
  presidente:    { label: 'Présidente',        role: 'admin', permissions: 'admin',
                   aide: 'Elle représente l\'association : tous les droits, équipe comprise.' },
  tresoriere:    { label: 'Trésorière',        role: 'prof',  permissions: ['argent_voir', 'argent_gerer', 'eleves_voir'],
                   aide: 'L\'argent : encaisser, les relevés, la compta, l\'export d\'exercice. Elle voit les adhérentes.' },
  secretaire:    { label: 'Secrétaire',        role: 'prof',  permissions: ['eleves_voir', 'eleves_gerer', 'messagerie', 'documents'],
                   aide: 'Les adhérentes, les convocations, les documents et les PV.' },
  membre_bureau: { label: 'Membre du bureau',  role: 'prof',  permissions: ['eleves_voir', 'documents'],
                   aide: 'Elle voit les adhérentes et les documents ; rien d\'autre par défaut.' },
  prof:          { label: 'Prof',              role: 'prof',  permissions: 'prof',
                   aide: 'Elle donne des cours et les pointe. Ni argent, ni messagerie, ni réglages.' },
  benevole:      { label: 'Bénévole',          role: 'prof',  permissions: ['pointer'],
                   aide: 'Elle aide au pointage, et c\'est tout.' },
};
export const CODES_FONCTION = Object.keys(FONCTIONS);
export const FONCTIONS_BUREAU = ['presidente', 'tresoriere', 'secretaire', 'membre_bureau'];

export function sanitizeFonction(brut) {
  return CODES_FONCTION.includes(brut) ? brut : null;
}

export function labelFonction(code) {
  return FONCTIONS[code]?.label || null;
}

/** Le rôle et la matrice proposés pour une fonction. */
export function presetPourFonction(code) {
  const f = FONCTIONS[sanitizeFonction(code) || 'prof'];
  let permissions;
  if (f.permissions === 'admin') permissions = { ...PRESETS.admin };
  else if (f.permissions === 'prof') permissions = { ...PRESETS.prof };
  else permissions = Object.fromEntries(f.permissions.filter(p => CLES_PERMISSIONS.includes(p)).map(p => [p, true]));
  return { role: f.role, permissions: sanitizePermissions(permissions) };
}

// ── 2. L'adhésion ────────────────────────────────────────────────────────────
/** La saison d'une date : '2026-2027' (septembre → août), et ses bornes. */
export function saisonDe(dateIso) {
  return exerciceDe(dateIso, EXERCICE_SAISON);
}

/** La saison courante et la suivante, pour vendre une adhésion en juin pour la rentrée. */
export function saisonsProposees(aujourdhui) {
  const courante = saisonDe(aujourdhui);
  if (!courante) return [];
  const [a] = courante.id.split('-').map(Number);
  const suivante = saisonDe(`${a + 1}-09-15`);
  return [courante, suivante].filter(Boolean);
}

/** Une adhésion est à jour à cette date si elle est active et couvre la date. */
export function adhesionAJour(adhesion, dateIso) {
  if (!adhesion || adhesion.statut !== 'active') return false;
  const d = String(dateIso || '').slice(0, 10);
  return adhesion.date_debut <= d && d <= adhesion.date_fin;
}

/**
 * Le tri des adhérentes à jour d'une date : une Map client_id → adhésion.
 * Sert le filtre de /clients, le quorum et la convocation d'une AG.
 */
export function adherentesAJour(adhesions, dateIso) {
  const map = new Map();
  for (const a of (adhesions || [])) {
    if (adhesionAJour(a, dateIso)) map.set(a.client_id, a);
  }
  return map;
}

/**
 * Nettoie une vente d'adhésion : offre, saison, montant, mode de règlement.
 * Refuse une saison difforme, un montant négatif ; « payée » exige un mode
 * (leçon Kim : déclarer comment l'argent est arrivé, jamais présumé).
 */
export function sanitizeVenteAdhesion(brut, aujourdhui) {
  const saison = saisonDe(`${String(brut?.saison || '').split('-')[0] || '0'}-09-15`);
  if (!saison || !/^\d{4}-\d{4}$/.test(String(brut?.saison || '')) || saison.id !== brut.saison) {
    return { ok: false, raison: 'La saison est invalide (attendu : 2026-2027).' };
  }
  const montant = Number(String(brut?.montant ?? '').replace(',', '.'));
  if (!Number.isFinite(montant) || montant < 0) return { ok: false, raison: 'Le montant est invalide.' };
  const paye = brut?.paye === true;
  const mode = ['especes', 'cheque', 'virement', 'CB'].includes(brut?.mode) ? brut.mode : null;
  if (paye && montant > 0 && !mode) return { ok: false, raison: 'Dis comment l\'argent est arrivé (espèces, chèque, virement, CB).' };
  const date = /^\d{4}-\d{2}-\d{2}$/.test(String(brut?.date || '')) ? brut.date : String(aujourdhui || '').slice(0, 10);
  return {
    ok: true,
    vente: {
      saison: saison.id,
      date_debut: saison.from,
      date_fin: saison.to,
      montant: Math.round(montant * 100) / 100,
      paye,
      mode: paye ? mode : null,
      date,
    },
  };
}

/** Le libellé d'une adhésion sur une fiche, un paiement, un reçu. */
export function libelleAdhesion(offreNom, saison) {
  return `${offreNom || 'Adhésion'} · saison ${saison}`;
}

// ── 3. Les documents ─────────────────────────────────────────────────────────
export const TYPES_DOCUMENT = {
  statuts:             { label: 'Statuts',               aide: 'La version en vigueur, déposée en préfecture.' },
  recepisse:           { label: 'Récépissé de déclaration', aide: 'Le récépissé de préfecture (création ou modification), avec le numéro RNA.' },
  reglement_interieur: { label: 'Règlement intérieur',   aide: 'Ce que les adhérentes signent ou acceptent.' },
  assurance:           { label: 'Assurance',             aide: 'L\'attestation de responsabilité civile en cours.' },
  agrement:            { label: 'Agrément',              aide: 'Jeunesse et sports, ou autre agrément.' },
  pv_ag:               { label: 'PV d\'assemblée',       aide: 'Le procès-verbal signé d\'une assemblée générale.' },
  contrat:             { label: 'Contrat',               aide: 'Un contrat de prestation avec une intervenante.' },
  autre:               { label: 'Autre',                 aide: 'Tout autre document utile à l\'association.' },
};
export const CODES_DOCUMENT = Object.keys(TYPES_DOCUMENT);
// Les types dont on attend UNE version courante (le dernier déposé fait foi).
export const TYPES_A_VERSION = ['statuts', 'recepisse', 'reglement_interieur', 'assurance', 'agrement'];

export function sanitizeDocument(brut) {
  const type = CODES_DOCUMENT.includes(brut?.type) ? brut.type : 'autre';
  const titre = String(brut?.titre || '').replace(/\s+/g, ' ').trim().slice(0, 160) || TYPES_DOCUMENT[type].label;
  const url = String(brut?.url || '').trim();
  if (!/^https:\/\//.test(url) || url.length > 600) return { ok: false, raison: 'Le fichier n\'a pas été déposé.' };
  const date = /^\d{4}-\d{2}-\d{2}$/.test(String(brut?.date_document || '')) ? brut.date_document : null;
  return { ok: true, document: { type, titre, url, date_document: date, assemblee_id: brut?.assemblee_id || null, membre_id: brut?.membre_id || null } };
}

/**
 * La version courante par type (la plus récente), et l'historique dessous.
 * → { courants: { statuts: doc, … }, historique: doc[] }
 */
export function classerDocuments(documents) {
  const tri = [...(documents || [])].sort((a, b) => String(b.date_document || b.created_at || '').localeCompare(String(a.date_document || a.created_at || '')));
  const courants = {};
  const historique = [];
  for (const d of tri) {
    if (TYPES_A_VERSION.includes(d.type) && !courants[d.type]) courants[d.type] = d;
    else historique.push(d);
  }
  return { courants, historique };
}

// ── 4. L'assemblée générale ──────────────────────────────────────────────────
export const TYPES_AG = { ordinaire: 'Assemblée générale ordinaire', extraordinaire: 'Assemblée générale extraordinaire' };

export function sanitizeAssemblee(brut) {
  const type = brut?.type === 'extraordinaire' ? 'extraordinaire' : 'ordinaire';
  const date = String(brut?.date || '').slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return { ok: false, raison: 'La date de l\'assemblée est obligatoire.' };
  const heure = /^\d{2}:\d{2}/.test(String(brut?.heure || '')) ? String(brut.heure).slice(0, 5) : null;
  return {
    ok: true,
    assemblee: {
      type,
      titre: String(brut?.titre || '').trim().slice(0, 160) || TYPES_AG[type],
      date,
      heure,
      lieu: String(brut?.lieu || '').trim().slice(0, 200) || null,
      ordre_du_jour: String(brut?.ordre_du_jour || '').trim().slice(0, 4000) || null,
    },
  };
}

/** Le délai de convocation RAPPELÉ, jamais imposé (les statuts le fixent). */
export const DELAI_CONVOCATION_JOURS = 15;

export function joursAvant(dateIso, aujourdhui) {
  const a = new Date(`${String(dateIso).slice(0, 10)}T12:00:00Z`);
  const b = new Date(`${String(aujourdhui).slice(0, 10)}T12:00:00Z`);
  return Math.round((a.getTime() - b.getTime()) / 864e5);
}

/** Le texte de convocation, PUR (message de la messagerie + email instantané). */
export function texteConvocation({ nomAsso, assemblee }) {
  const type = TYPES_AG[assemblee?.type] || TYPES_AG.ordinaire;
  const jour = new Date(`${assemblee.date}T12:00:00`).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  const lignes = [
    `Convocation à l'${type.toLowerCase().replace('assemblée', 'assemblée')} de ${nomAsso}`,
    '',
    `Date : ${jour}${assemblee.heure ? ` à ${assemblee.heure}` : ''}`,
    assemblee.lieu ? `Lieu : ${assemblee.lieu}` : null,
    '',
    assemblee.ordre_du_jour ? `Ordre du jour :\n${assemblee.ordre_du_jour}` : null,
    '',
    'Si tu ne peux pas venir, tu peux donner pouvoir à une autre adhérente à jour (à signaler à l\'accueil ou par retour de message).',
  ].filter(l => l !== null);
  return lignes.join('\n').replace(/\n{3,}/g, '\n\n');
}

/**
 * Le quorum : les adhérentes à jour AU JOUR de l'AG. Le pourcentage requis
 * vient des statuts : on affiche le compte, on ne tranche pas.
 */
export function quorum({ adherentesAJourAuJour, presentes = 0, pouvoirs = 0 }) {
  const total = Number(adherentesAJourAuJour) || 0;
  const representees = (Number(presentes) || 0) + (Number(pouvoirs) || 0);
  return { total, representees, pourcentage: total > 0 ? Math.round((representees / total) * 1000) / 10 : 0 };
}
