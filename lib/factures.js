// ============================================
// IziSolo — Factures (v84) : helpers PURS
// ============================================
//
// Tout ce qui se calcule sans DB : groupement des paiements par mois,
// construction du snapshot gelé à l'émission, nettoyage WinAnsi.
// Partagé par les routes (serveur), l'espace élève et la fiche client (UI).
// Verrou : tests/e2e/factures-lib.spec.js.
//
// Modèle (design 2026-08-05) : une facture = 1..N paiements RÉGLÉS ; un
// paiement appartient à au plus UNE facture (UNIQUE en DB) ; le snapshot
// est la source de vérité du document — le PDF se re-rend à l'identique.

import { labelIdentifiant, formaterIdentifiant, mentionParDefaut } from './pays.js';

/** Le défaut FRANÇAIS, conservé pour compatibilité. Hors de France il n'y a
 *  AUCUN défaut : on suggère, la prof valide (cf. lib/pays). */
export const MENTION_TVA_DEFAUT = 'TVA non applicable, art. 293 B du CGI.';

// Mois demandé aux routes « facture du mois » : YYYY-MM strict.
export const REGEX_MOIS = /^\d{4}-(0[1-9]|1[0-2])$/;

const MOIS_FR = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin',
  'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];

/**
 * pdf-lib (StandardFonts.Helvetica) n'encode que WinAnsi : un emoji dans un
 * intitulé (« Carnet 10 ✨ ») faisait THROW → 500 (B1f). On nettoie TOUT ce
 * qui entre dans un snapshot — en GARDANT les typographiques que Windows-1252
 * encode réellement (— – ' " … œ €), fréquents dans les intitulés d'offres.
 */
export function winAnsiSafe(s) {
  return String(s ?? '').replace(/[^\x20-\x7E\xA0-\xFF–—‘’‚“”„…Œœ‰€]/g, '').trim();
}

/** La facturation est active dès qu'un SIRET est renseigné. */
export function facturationActive(facturation) {
  return !!String(facturation?.facturation_siret || '').trim();
}

/** Mois (YYYY-MM) d'un paiement : la date de RÈGLEMENT prime sur l'échéance. */
export function moisDePaiement(p) {
  return String(p?.date_encaissement || p?.date || '').slice(0, 7);
}

/** '2026-08' → 'août 2026' (libellé élève). */
export function labelMois(mois) {
  const [annee, mm] = String(mois || '').split('-');
  const nom = MOIS_FR[parseInt(mm, 10) - 1];
  return nom ? `${nom} ${annee}` : String(mois || '');
}

function idsDejaFactures(dejaFactures) {
  if (dejaFactures instanceof Set) return dejaFactures;
  return new Set(Object.keys(dejaFactures || {}));
}

/** Paiements facturables : réglés et pas encore portés par une facture. */
export function paiementsFacturables(paiements, dejaFactures) {
  const pris = idsDejaFactures(dejaFactures);
  return (paiements || []).filter(p => p?.statut === 'paid' && !pris.has(p.id));
}

/**
 * Mois proposant une « facture du mois » : ceux qui comptent AU MOINS `min`
 * paiements facturables (défaut 2 — pour 1 seul, le bouton de la ligne fait
 * exactement le même document). Triés du plus récent au plus ancien.
 * → [{ mois: '2026-08', label: 'août 2026', count, paiementIds }]
 */
export function moisFacturables(paiements, dejaFactures, { min = 2 } = {}) {
  const parMois = new Map();
  for (const p of paiementsFacturables(paiements, dejaFactures)) {
    const mois = moisDePaiement(p);
    if (!REGEX_MOIS.test(mois)) continue; // date absente/malformée : jamais groupée
    if (!parMois.has(mois)) parMois.set(mois, []);
    parMois.get(mois).push(p.id);
  }
  return [...parMois.entries()]
    .filter(([, ids]) => ids.length >= min)
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([mois, ids]) => ({ mois, label: labelMois(mois), count: ids.length, paiementIds: ids }));
}

/** Lignes du document, triées par date de règlement croissante. */
export function construireLignes(paiements) {
  return (paiements || [])
    .map(p => ({
      paiement_id: p.id,
      intitule: winAnsiSafe(p.intitule) || 'Prestation',
      montant: Math.round((parseFloat(p.montant) || 0) * 100) / 100,
      mode: p.mode || null,
      date_reglement: p.date_encaissement || p.date || null,
    }))
    .sort((a, b) => String(a.date_reglement || '').localeCompare(String(b.date_reglement || '')));
}

/**
 * Snapshot GELÉ à l'émission — tout ce que le PDF affiche, rien d'autre.
 * Re-télécharger une facture = re-rendre ce snapshot (même document, même
 * numéro), même si le profil ou la fiche ont changé depuis.
 */
export function construireSnapshot({ profile, facturation, client, paiements, mentionTva }) {
  const lignes = construireLignes(paiements);
  const total = Math.round(lignes.reduce((s, l) => s + l.montant, 0) * 100) / 100;
  return {
    emetteur: {
      nom: winAnsiSafe(facturation?.facturation_raison_sociale) || winAnsiSafe(profile?.studio_nom) || 'Studio',
      siret: winAnsiSafe(facturation?.facturation_siret).replace(/\s/g, '') || null,
      // Le pays décide du LIBELLÉ imprimé (« SIRET », « Numéro d'entreprise »)
      // et de sa mise en forme. Figé dans le snapshot comme le reste : une
      // facture re-téléchargée doit rester le MÊME document (v84).
      pays: facturation?.pays || 'FR',
      identifiant_label: labelIdentifiant(facturation?.pays),
      identifiant_affiche: formaterIdentifiant(facturation?.pays, facturation?.facturation_siret),
      adresse: winAnsiSafe(profile?.adresse) || null,
      code_postal: winAnsiSafe(profile?.code_postal) || null,
      ville: winAnsiSafe(profile?.ville) || null,
      telephone: winAnsiSafe(profile?.telephone) || null,
      email: winAnsiSafe(profile?.email_contact) || null,
    },
    client: {
      nom: [winAnsiSafe(client?.prenom), winAnsiSafe(client?.nom)].filter(Boolean).join(' ') || 'Client·e',
      email: winAnsiSafe(client?.email) || null,
      // Particulier : l'adresse vit dans adresse_postale (1re ligne) ;
      // `adresse` = champ des clients PRO.
      adresse: winAnsiSafe(((client?.adresse_postale || client?.adresse || '').split('\n')[0] || '')) || null,
      ville: winAnsiSafe(client?.ville) || null,
    },
    lignes,
    total,
    // Hors de France, `mentionParDefaut` rend null : rien ne s'imprime que la
    // prof n'ait écrit. Une mention fiscale devinée engagerait SA
    // responsabilité sur un document qu'elle n'a pas relu.
    mention_tva: winAnsiSafe(mentionTva ?? facturation?.facturation_mention_tva)
      || mentionParDefaut(facturation?.pays) || '',
  };
}
