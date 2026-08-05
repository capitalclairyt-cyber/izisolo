// ============================================
// IziSolo — Factures (v84) : couche service (serveur)
// ============================================
//
// Orchestration DB partagée par les routes portail (élève) et dashboard
// (prof). Le client `admin` (service_role) est passé en paramètre — les RPC
// emettre_facture / annuler_facture ne sont exécutables QUE par lui (v84),
// chaque route ayant vérifié la propriété en amont.
//
// Tout est DÉFENSIF : migration v84 absente (table/colonnes/RPC manquantes)
// → { active: false } / null / fallback, jamais de crash. Le portail retombe
// alors sur le reçu simple d'avant — aucune régression au déploiement.

import { construireSnapshot, facturationActive } from './factures.js';
import { reportError } from './report.js';

/**
 * Champs de facturation du studio — requête SÉPARÉE et défensive (jamais dans
 * le select principal d'une page : une colonne absente y tuerait toute la
 * surface, cf. anti-pattern « colonnes fantômes »).
 */
export async function chargerFacturation(admin, profileId) {
  const { data, error } = await admin
    .from('profiles')
    .select('facturation_siret, facturation_raison_sociale, facturation_mention_tva')
    .eq('id', profileId)
    .maybeSingle();
  if (error || !data) {
    // 42703 = migration pas appliquée : facturation inactive, reçu simple.
    return { active: false, facturation: null };
  }
  return { active: facturationActive(data), facturation: data };
}

/**
 * Factures ÉMISES portant ces paiements → Map paiementId → { facture_id,
 * numero_affiche }. Table absente / erreur → Map vide (les boutons UI
 * proposeront l'émission, la RPC tranchera).
 */
export async function facturesPourPaiements(admin, paiementIds) {
  const map = new Map();
  if (!paiementIds?.length) return map;
  const { data, error } = await admin
    .from('factures_paiements')
    .select('paiement_id, facture:facture_id (id, numero_affiche, statut)')
    .in('paiement_id', paiementIds);
  if (error) return map; // migration absente : silencieux voulu (fallback reçu)
  for (const l of data || []) {
    if (l.facture?.statut === 'emise') {
      map.set(l.paiement_id, { facture_id: l.facture.id, numero_affiche: l.facture.numero_affiche });
    }
  }
  return map;
}

/** Une facture par id (snapshot compris), scopée studio. */
export async function chargerFacture(admin, profileId, factureId) {
  const { data, error } = await admin
    .from('factures')
    .select('id, numero_affiche, date_emission, statut, snapshot')
    .eq('id', factureId)
    .eq('profile_id', profileId)
    .maybeSingle();
  if (error || !data) return null;
  return data;
}

/**
 * Émet une facture (RPC atomique v84) pour ces paiements et la retourne
 * chargée. → { facture } | { fallback: true } (RPC/migration absente) |
 * { erreur: 'deja_facture' | 'paiement_invalide' | ... }.
 */
export async function emettreFacture(admin, { profileId, clientId, profile, facturation, client, paiements }) {
  const snapshot = construireSnapshot({ profile, facturation, client, paiements });
  const { data, error } = await admin.rpc('emettre_facture', {
    p_profile_id: profileId,
    p_client_id: clientId,
    p_paiement_ids: paiements.map(p => p.id),
    p_snapshot: snapshot,
  });
  if (error) {
    // RPC absente (migration pas appliquée) → fallback reçu, sans bruit.
    // Toute autre erreur est loggée : une émission qui rate doit se voir.
    const rpcAbsente = error.code === '42883' || error.code === 'PGRST202';
    if (!rpcAbsente) reportError('[factures] emettre_facture err:', error, { route: 'lib/factures-service' });
    return { fallback: true };
  }
  if (!data?.ok) return { erreur: data?.reason || 'inconnu' };
  return {
    facture: {
      id: data.facture_id,
      numero_affiche: data.numero_affiche,
      date_emission: data.date_emission,
      statut: 'emise',
      snapshot,
    },
  };
}

/**
 * Le geste unique des boutons « par paiement » : re-télécharge la facture
 * ÉMISE qui porte ce paiement (même document, même numéro — qu'elle soit
 * individuelle ou mensuelle), sinon en émet une nouvelle d'une ligne.
 * → { facture } | { fallback: true } | { erreur }
 */
export async function obtenirOuEmettreFacture(admin, { profileId, clientId, profile, facturation, client, paiement }) {
  const existantes = await facturesPourPaiements(admin, [paiement.id]);
  const existante = existantes.get(paiement.id);
  if (existante) {
    const facture = await chargerFacture(admin, profileId, existante.facture_id);
    if (facture) return { facture };
  }
  const res = await emettreFacture(admin, { profileId, clientId, profile, facturation, client, paiements: [paiement] });
  // Course (double clic / deux onglets) : quelqu'un a émis entre-temps → on
  // re-cherche et on sert le document gagnant.
  if (res.erreur === 'deja_facture') {
    const retry = await facturesPourPaiements(admin, [paiement.id]);
    const gagnante = retry.get(paiement.id);
    if (gagnante) {
      const facture = await chargerFacture(admin, profileId, gagnante.facture_id);
      if (facture) return { facture };
    }
  }
  return res;
}

/** Nom de fichier téléchargé. */
export function nomFichierFacture(facture) {
  return `facture-${String(facture.numero_affiche || 'izisolo').toLowerCase()}.pdf`;
}
