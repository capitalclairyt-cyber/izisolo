// ============================================================================
// IziSolo — Les prestations : le pont 4 de l'écosystème (v112, lot 2 du
// chantier Associations & Studios, PLAN-ASSOS-STUDIOS-2026.md §6.5)
// ----------------------------------------------------------------------------
// « L'argent, un document et deux vues. » La structure valide le relevé d'une
// intervenante pour un mois : une PRESTATION naît, avec sa dépense « à
// régler » côté structure. L'intervenante qui a son IziSolo la voit dans SES
// revenus, la FACTURE (facture v2, non acquittée, dans SA séquence), et quand
// la structure règle, le règlement devient un paiement encaissé chez elle.
// Une intervenante sans compte a son relevé en PDF sur son lien, et rien
// d'autre.
//
// Fichier PUR : statuts, libellés, le snapshot de la facture v2, ce que chaque
// côté a le droit de voir. Les écritures vivent dans lib/prestations-service.js.
// ============================================================================

import { winAnsiSafe } from './factures.js';
import { labelIdentifiant, formaterIdentifiant, mentionParDefaut } from './pays.js';
import { labelMois, euros, labelRemuneration } from './remuneration.js';

export const STATUTS_PRESTATION = {
  emise:    { label: 'À facturer',  aide: 'Le relevé est validé par la structure. L\'intervenante peut le facturer.' },
  facturee: { label: 'Facturée',    aide: 'La facture est émise. La structure doit la régler.' },
  reglee:   { label: 'Réglée',      aide: 'La structure a réglé ; l\'encaissement est chez l\'intervenante.' },
  annulee:  { label: 'Annulée',     aide: 'Le relevé a été retiré par la structure.' },
};

export function labelStatutPrestation(statut) {
  return STATUTS_PRESTATION[statut]?.label || statut || '';
}

/** « Prestation · Asso Yoga · septembre 2026 » : l'intitulé partout. */
export function libellePrestation(nomStructure, periode) {
  return `Prestation · ${nomStructure || 'structure'} · ${labelMois(periode)}`;
}

/** Ce que l'intervenante voit d'une prestation (jamais la dépense de la structure). */
export function prestationPourIntervenante(p, structure) {
  if (!p) return null;
  return {
    id: p.id,
    periode: p.periode,
    periode_label: labelMois(p.periode),
    montant: Number(p.montant) || 0,
    statut: p.statut,
    statut_label: labelStatutPrestation(p.statut),
    releve: p.releve || {},
    structure_id: p.profile_id,
    structure_nom: structure?.studio_nom || 'Structure',
    facture_id: p.facture_id || null,
    facture_numero: p.facture_numero || null,
    paiement_id: p.paiement_id || null,
    created_at: p.created_at,
    facturee_at: p.facturee_at || null,
    reglee_at: p.reglee_at || null,
  };
}

/** Ce que la structure voit d'une prestation. */
export function prestationPourStructure(p, membre) {
  if (!p) return null;
  return {
    id: p.id,
    periode: p.periode,
    periode_label: labelMois(p.periode),
    montant: Number(p.montant) || 0,
    statut: p.statut,
    statut_label: labelStatutPrestation(p.statut),
    releve: p.releve || {},
    membre_id: p.membre_id,
    membre_label: membre?.label || null,
    membre_a_un_compte: !!membre?.auth_user_id,
    depense_id: p.depense_id || null,
    facture_numero: p.facture_numero || null,
    created_at: p.created_at,
    facturee_at: p.facturee_at || null,
    reglee_at: p.reglee_at || null,
  };
}

/**
 * Le SNAPSHOT figé de la facture v2 (non acquittée), rendu par le même moteur
 * PDF que v84 : l'émetteur est l'intervenante (sa facturation), le
 * « client » est la structure. Une seule ligne : la prestation du mois.
 */
export function construireSnapshotPrestation({ profile, facturation, structure, prestation, mentionTva }) {
  const montant = Math.round((Number(prestation?.montant) || 0) * 100) / 100;
  const releve = prestation?.releve || {};
  const detail = [
    releve.nb_seances != null ? `${releve.nb_seances} séance${releve.nb_seances > 1 ? 's' : ''}` : null,
    releve.heures ? `${String(releve.heures).replace('.', ',')} h` : null,
    releve.remuneration ? labelRemuneration(releve.remuneration) : null,
  ].filter(Boolean).join(', ');
  return {
    type: 'a_regler',
    emetteur: {
      nom: winAnsiSafe(facturation?.facturation_raison_sociale) || winAnsiSafe(profile?.studio_nom) || winAnsiSafe(`${profile?.prenom || ''} ${profile?.nom || ''}`.trim()) || 'Intervenante',
      siret: winAnsiSafe(facturation?.facturation_siret).replace(/\s/g, '') || null,
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
      nom: winAnsiSafe(structure?.studio_nom) || 'Structure',
      email: winAnsiSafe(structure?.email_contact) || null,
      adresse: winAnsiSafe(structure?.adresse) || null,
      ville: winAnsiSafe([structure?.code_postal, structure?.ville].filter(Boolean).join(' ')) || null,
      rna: winAnsiSafe(structure?.rna) || null,
      siret: winAnsiSafe(structure?.facturation_siret) || null,
    },
    lignes: [{
      paiement_id: null,
      intitule: winAnsiSafe(`${libellePrestation(structure?.studio_nom, prestation?.periode)}${detail ? ` (${detail})` : ''}`),
      montant,
      mode: null,
      date_reglement: null,
      // Le mois de la prestation, pour le rendu « période ».
      periode: prestation?.periode || null,
    }],
    total: montant,
    // Non acquittée : le rendu écrit « À régler à réception », jamais
    // « acquittée ». `echeance` = 30 jours, un usage, pas une loi.
    a_regler: true,
    mention_tva: winAnsiSafe(mentionTva ?? facturation?.facturation_mention_tva)
      || mentionParDefaut(facturation?.pays) || '',
  };
}

/** L'email « ton relevé est prêt » envoyé à l'intervenante par la structure. PUR. */
export function emailRelevePret({ prenom, nomStructure, periode, montant, aUnCompte, lien }) {
  const bonjour = prenom ? `Bonjour ${prenom},` : 'Bonjour,';
  const somme = montant != null ? ` Le montant convenu est de <strong>${euros(montant)}</strong>.` : '';
  return {
    subject: `Ton relevé de ${labelMois(periode)} · ${nomStructure}`,
    html: `
      <p>${bonjour}</p>
      <p><strong>${nomStructure}</strong> a validé ton relevé de séances de <strong>${labelMois(periode)}</strong>.${somme} Il est en pièce jointe.</p>
      ${aUnCompte
        ? `<p>Dans ton IziSolo, page Revenus → <strong>« Mes prestations »</strong>, tu peux émettre ta facture en un clic : elle part à ${nomStructure}, et dès qu'elle est réglée l'encaissement apparaît dans tes revenus.</p>${lien ? `<p><a href="${lien}" style="display:inline-block;background:#1a1612;color:#ffffff;padding:12px 20px;border-radius:10px;text-decoration:none;font-weight:600;">Voir mes prestations</a></p>` : ''}`
        : `<p>Tu factures ${nomStructure} comme d'habitude, avec ce relevé comme détail. Si un jour tu ouvres ton IziSolo (c'est gratuit, avec la même adresse), tes relevés y arriveront tout seuls et ta facture se fera en un clic.</p>`}
      <p style="color:#6b5f5a;font-size:14px;">Une question sur ce relevé ? Réponds à cet email : il arrive chez ${nomStructure}.</p>
    `,
  };
}

/** L'email « voici ma facture » envoyé à la structure par l'intervenante. PUR. */
export function emailFacturePrestation({ nomIntervenante, nomStructure, periode, montant, numero, lien }) {
  return {
    subject: `Facture ${numero} · ${nomIntervenante} · ${labelMois(periode)}`,
    html: `
      <p>Bonjour,</p>
      <p><strong>${nomIntervenante}</strong> vous adresse sa facture <strong>${numero}</strong> pour ses séances de <strong>${labelMois(periode)}</strong> chez ${nomStructure} : <strong>${euros(montant)}</strong>, en pièce jointe.</p>
      <p>Dans votre IziSolo, page Compta → <strong>« Prestations »</strong>, « Réglée » enregistre le règlement : la dépense est soldée chez vous, et l'encaissement apparaît chez elle.</p>
      ${lien ? `<p><a href="${lien}" style="display:inline-block;background:#1a1612;color:#ffffff;padding:12px 20px;border-radius:10px;text-decoration:none;font-weight:600;">Ouvrir la compta</a></p>` : ''}
    `,
  };
}
