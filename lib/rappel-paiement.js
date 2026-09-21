// ============================================================================
// IziSolo — Le rappel « Paiement en attente » de la cloche (2026-09-21)
// ----------------------------------------------------------------------------
// Déclencheur : Maude, six jours après avoir saisi le premier chèque de
// Marie-Pierre (245 € sur 480), lit encore « 235 € · en attente depuis
// 26 jours » dans sa cloche, tous les deux jours. Diagnostic en base : le
// rappel était JUSTE (235 € restent attendus) mais il mentait deux fois par
// omission : il ne disait pas ce qui avait déjà été reçu, et il comptait les
// jours depuis la VENTE du 25/08 et non depuis le chèque du 08/09. Et il se
// réarmait toutes les 48 h en NON LU, pour un reste que la prof connaît.
//
// Ce module est la règle PURE du texte et de la cadence :
//   • « déjà reçu » = les lignes RÉGLÉES sœurs par l'échéancier (l'imputation
//     du 15/09 et « Plusieurs moyens » les rattachent ainsi) ;
//   • les jours d'attente se comptent depuis le DERNIER mouvement (le dernier
//     encaissement reçu, sinon la date de la ligne) ;
//   • un rappel vit SEPT jours : lu, il ne revient pas avant une semaine ;
//   • un rappel dont la ligne n'attend plus rien est purgé, jamais laissé
//     sonner jusqu'à son expiration.
//
// Aucune requête ici : /api/notifications/check exécute.
// Verrou CI : tests/e2e/rappel-paiement.spec.js.
// ============================================================================

/** Durée de vie d'un rappel : lu, il ne revient pas avant une semaine. */
export const DUREE_RAPPEL_JOURS = 7;

const MS_JOUR = 86400000;

function nombre(v) {
  const n = typeof v === 'number' ? v : parseFloat(v);
  return Number.isFinite(n) ? n : 0;
}

function arrondi(n) {
  return Math.round(n * 100) / 100;
}

/** Convertit une date ISO (AAAA-MM-JJ ou horodatage) en Date à midi UTC, sinon null. */
function jourDe(iso) {
  if (typeof iso !== 'string' || !/^\d{4}-\d{2}-\d{2}/.test(iso)) return null;
  const d = new Date(iso.slice(0, 10) + 'T12:00:00Z');
  return Number.isNaN(d.getTime()) ? null : d;
}

function formatJJMM(iso) {
  const d = jourDe(iso);
  if (!d) return '';
  const jj = String(d.getUTCDate()).padStart(2, '0');
  const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
  return `${jj}/${mm}`;
}

function formatMontant(n) {
  const v = arrondi(nombre(n));
  return Number.isInteger(v) ? String(v) : v.toFixed(2).replace('.', ',');
}

const LIBELLE_MODE = {
  cheque: 'chèque', especes: 'espèces', virement: 'virement', cb: 'CB', stripe: 'CB',
};

/**
 * Les lignes RÉGLÉES sœurs d'une ligne en attente : même échéancier, statut
 * paid, jamais la ligne elle-même. Sans échéancier, aucune sœur (une ligne
 * seule n'a reçu aucun acompte par construction).
 */
export function soeursReglees(ligne, lignes) {
  if (!ligne?.echeancier_id || !Array.isArray(lignes)) return [];
  return lignes.filter(l =>
    l && l.id !== ligne.id && l.echeancier_id === ligne.echeancier_id && l.statut === 'paid',
  );
}

/**
 * Ce qui a déjà été reçu sur la même vente : total des sœurs réglées, et le
 * dernier encaissement (date + mode) pour le dire dans le rappel.
 */
export function dejaRecu(ligne, lignes) {
  const soeurs = soeursReglees(ligne, lignes);
  let total = 0;
  let dernier = null;
  for (const s of soeurs) {
    total += nombre(s.montant);
    const date = s.date_encaissement || s.date || null;
    if (date && (!dernier || date > dernier.date)) dernier = { date, mode: s.mode || null };
  }
  return { total: arrondi(total), nb: soeurs.length, dernier };
}

/**
 * Jours d'attente : depuis le DERNIER mouvement, c'est-à-dire le dernier
 * encaissement reçu s'il est postérieur à la date de la ligne, sinon la date
 * de la ligne. Jamais négatif, jamais NaN (une date illisible vaut 0).
 */
export function joursAttente(ligne, recu, aujourdhui = new Date()) {
  const dates = [ligne?.date, recu?.dernier?.date].map(jourDe).filter(Boolean);
  if (dates.length === 0) return 0;
  const depuis = new Date(Math.max(...dates.map(d => d.getTime())));
  const auj = jourDe(typeof aujourdhui === 'string' ? aujourdhui : aujourdhui.toISOString());
  const jours = Math.floor((auj.getTime() - depuis.getTime()) / MS_JOUR);
  return Math.max(0, jours);
}

/**
 * Le rappel d'une ligne en attente : titre, corps et données pour la cloche.
 * `lignes` = les lignes réglées qui partagent son échéancier (peut contenir
 * plus large, le filtre est fait ici).
 */
export function rappelPaiement(ligne, lignes = [], aujourdhui = new Date()) {
  const recu = dejaRecu(ligne, lignes);
  const jours = joursAttente(ligne, recu, aujourdhui);
  const reste = arrondi(nombre(ligne?.montant));
  const prenom = ligne?.clients?.prenom || '';
  const nom = ligne?.clients?.nom || '';
  const eleve = `${prenom} ${nom}`.trim() || 'une élève';
  const intitule = ligne?.intitule || 'Paiement';
  const attente = `en attente depuis ${jours} jour${jours > 1 ? 's' : ''}`;

  let corps;
  if (recu.nb > 0) {
    const quand = recu.dernier?.date ? ` le ${formatJJMM(recu.dernier.date)}` : '';
    const mode = recu.dernier?.mode && LIBELLE_MODE[recu.dernier.mode] ? ` par ${LIBELLE_MODE[recu.dernier.mode]}` : '';
    corps = `${intitule} · reste ${formatMontant(reste)} € (${formatMontant(recu.total)} € déjà reçus, dernier${mode}${quand}) · ${attente}`;
  } else {
    corps = `${intitule} · ${formatMontant(reste)} € · ${attente}`;
  }

  return {
    titre: `💶 Paiement en attente — ${eleve}`,
    corps,
    jours,
    reste,
    recu: recu.total,
    data: {
      paiement_id: ligne?.id, client_id: ligne?.client_id,
      montant: reste, recu: recu.total, total: arrondi(reste + recu.total), jours,
    },
  };
}

/** La clé stable d'un rappel : une par ligne en attente. */
export function refRappel(paiementId) {
  return `paiement_retard_${paiementId}`;
}

/** L'expiration d'un rappel : sept jours après maintenant. */
export function expirationRappel(maintenant = new Date()) {
  return new Date(maintenant.getTime() + DUREE_RAPPEL_JOURS * MS_JOUR).toISOString();
}

/**
 * Les rappels à purger : ceux dont la ligne n'est PLUS en attente (encaissée,
 * supprimée, ou passée sous le seuil). Rend les ref_key à supprimer parmi les
 * rappels existants, jamais un ref d'un autre type.
 */
export function refsObsoletes(refsExistants, lignesEnAttente) {
  const vivants = new Set((lignesEnAttente || []).map(l => refRappel(l?.id)));
  return (refsExistants || []).filter(r =>
    typeof r === 'string' && r.startsWith('paiement_retard_') && !vivants.has(r),
  );
}
