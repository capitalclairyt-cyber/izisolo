// ============================================================================
// IziSolo — Archive des déclarations URSSAF (v94, 2026-08-22)
// ----------------------------------------------------------------------------
// Règles PURES de l'archive : ce qu'on photographie au moment où la prof
// déclare, et comment on lit cette photo des mois plus tard.
//
// Le point qui justifie tout le reste : les montants sont RECALCULÉS à la
// lecture depuis les paiements. Un chèque saisi en retard, un montant corrigé,
// et le T2 ne rend plus le même total en décembre qu'en juillet. Une archive
// qui se contenterait de re-calculer ne servirait donc à rien — elle rendrait
// un nombre qui n'est pas celui qui a été déclaré, sans le dire.
//
// D'où : snapshot figé + détection d'ÉCART entre ce qui a été déclaré et ce
// que la période vaut aujourd'hui. L'écart n'est pas une erreur, c'est
// l'information : il dit à la prof qu'elle a peut-être une régularisation à
// faire.
//
// Module PUR, verrou CI : declaration-archive.spec.js.
// ============================================================================

/** Statuts d'une période, du point de vue de la prof. */
export const STATUTS = {
  en_cours:   { label: 'En cours',     hint: 'La période n\'est pas finie, le montant bouge encore.' },
  a_declarer: { label: 'À déclarer',   hint: 'Période close : le montant est arrêté, il reste à le saisir sur urssaf.fr.' },
  declaree:   { label: 'Déclarée',     hint: 'Tu as marqué cette période comme déclarée.' },
  en_retard:  { label: 'En retard',    hint: 'L\'échéance est passée et la période n\'est pas marquée déclarée.' },
};

/**
 * Photo de ce qui est affiché à l'écran, au moment où la prof déclare.
 * Volontairement dénormalisée : elle doit rester lisible seule, sans avoir à
 * rejouer un calcul ni à retrouver la config du moment.
 */
export function construireSnapshot({ periode, totaux, estimation, base = 'encaissement', config = null }) {
  return {
    version: 1,
    base,
    periode: periode ? {
      id: periode.id, label: periode.label, from: periode.from, to: periode.to,
      echeance: periode.echeance, echeanceLabel: periode.echeanceLabel,
    } : null,
    totaux: {
      brut: arrondi(totaux?.brut),
      frais: arrondi(totaux?.frais),
      nombre: Number(totaux?.nombre) || 0,
      parMois: { ...(totaux?.parMois || {}) },
      parMode: { ...(totaux?.parMode || {}) },
    },
    estimation: estimation ? {
      cotisations: arrondi(estimation.cotisations),
      cfp: arrondi(estimation.cfp),
      liberatoire: arrondi(estimation.liberatoire),
      total: arrondi(estimation.total),
      estimable: !!estimation.estimable,
    } : null,
    regime: config?.regime || null,
    taux: config ? {
      cotisations: config.taux_cotisations,
      cfp: config.taux_cfp,
      liberatoire: config.versement_liberatoire ? config.taux_liberatoire : null,
    } : null,
  };
}

function arrondi(n) {
  const v = Number(n);
  return Number.isFinite(v) ? Math.round(v * 100) / 100 : 0;
}

/** Le montant tel qu'il se saisit sur le formulaire : euros entiers. */
export function montantADeclarer(brut) {
  const v = Number(brut);
  return Number.isFinite(v) ? Math.round(v) : 0;
}

/**
 * Statut d'une période, en croisant la période (close ? en retard ?) et
 * l'archive (déclarée ?).
 */
export function statutPeriode(periode, archive, aujourdhui) {
  if (archive?.declaree_at) return 'declaree';
  if (!periode?.cloturee) return 'en_cours';
  if (periode.echeance && aujourdhui && aujourdhui > periode.echeance) return 'en_retard';
  return 'a_declarer';
}

/**
 * La période vaut-elle encore ce qui a été déclaré ?
 * @returns {null|{ecart: number, declare: number, actuel: number, sens: 'hausse'|'baisse'}}
 *   null = rien de déclaré, ou montant inchangé (à l'euro près, comme le
 *   formulaire URSSAF).
 */
export function ecartDepuisDeclaration(archive, brutActuel) {
  if (!archive?.declaree_at || archive.montant_declare === null || archive.montant_declare === undefined) return null;
  const declare = montantADeclarer(archive.montant_declare);
  const actuel = montantADeclarer(brutActuel);
  if (declare === actuel) return null;
  return {
    declare,
    actuel,
    ecart: Math.round((actuel - declare) * 100) / 100,
    sens: actuel > declare ? 'hausse' : 'baisse',
  };
}

/** Phrase à afficher pour un écart. Jamais alarmiste, jamais silencieuse. */
export function texteEcart(ecart) {
  if (!ecart) return null;
  const signe = ecart.sens === 'hausse' ? '+' : '';
  return (
    `Tu avais déclaré ${ecart.declare} €. Cette période vaut aujourd'hui ${ecart.actuel} € `
    + `(${signe}${ecart.ecart} €), sans doute un paiement ajouté ou corrigé depuis. `
    + 'Une régularisation peut être à faire sur ta prochaine déclaration.'
  );
}

/**
 * Fusionne les périodes proposées avec leurs archives, pour l'historique.
 * @param {Array} periodes  cf. periodesDeclarables()
 * @param {Array} archives  lignes declarations_urssaf
 */
export function historique(periodes, archives, aujourdhui) {
  const parId = new Map((archives || []).map(a => [a.periode_id, a]));
  return (periodes || []).map(p => {
    const a = parId.get(p.id) || null;
    return {
      periode: p,
      statut: statutPeriode(p, a, aujourdhui),
      declareeAt: a?.declaree_at || null,
      montantDeclare: a?.montant_declare === null || a?.montant_declare === undefined
        ? null : montantADeclarer(a.montant_declare),
      consultations: a?.consultations || 0,
      derniereConsultation: a?.derniere_consultation_at || null,
    };
  });
}
