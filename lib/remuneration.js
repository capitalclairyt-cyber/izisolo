// ============================================================================
// IziSolo — La rémunération d'une intervenante et son RELEVÉ mensuel
// (v112, lot 2 du chantier Associations & Studios, 2026-09-13,
// PLAN-ASSOS-STUDIOS-2026.md §4.3)
// ----------------------------------------------------------------------------
// Un studio paie ses profs, une asso aussi (souvent des auto-entrepreneures
// qui facturent l'asso à la séance). Ce que l'app peut dire SANS RIEN
// INVENTER : par intervenante et par mois, les séances données (pointées), leur
// durée, les présentes, le chiffre d'affaires rattaché (présences décomptées
// d'un carnet au prorata, ou payées à la séance), et, si une rémunération est
// convenue, ce qui est dû.
//
// Ce fichier est PUR : aucune requête, aucun `window`. Le chargement des
// séances vit dans lib/releve-service.js (serveur) ; le calcul vit ICI pour
// être testable sans base (verrou CI `argent-ecosysteme.spec.js`) et
// recalculable à la main dans la preuve.
// ============================================================================

/** Les quatre façons de convenir d'une rémunération. */
export const MODES_REMUNERATION = {
  par_seance:      { label: 'Par séance',           unite: '€ / séance',  aide: 'Un montant fixe pour chaque séance donnée, quel que soit le nombre de présentes.' },
  horaire:         { label: "À l'heure",            unite: '€ / heure',   aide: 'Un taux horaire, multiplié par la durée de chaque séance.' },
  pourcentage_ca:  { label: 'Pourcentage du CA',    unite: '% du CA',     aide: 'Une part du chiffre d\'affaires rattaché à ses séances (carnets décomptés au prorata, séances payées à l\'unité).' },
  forfait_mensuel: { label: 'Forfait mensuel',      unite: '€ / mois',    aide: 'Un montant fixe par mois, dès qu\'au moins une séance a été donnée.' },
};
export const CODES_REMUNERATION = Object.keys(MODES_REMUNERATION);

const arrondi = (n) => Math.round((Number(n) || 0) * 100) / 100;

/**
 * La valeur à ÉCRIRE en base, ou null. Un mode inconnu, un montant absent,
 * négatif ou absurde (au-delà de 100 % ou de 10 000 €) rend null : mieux vaut
 * « rien de convenu » qu'un relevé qui multiplie une faute de frappe.
 */
export function sanitizeRemuneration(brut) {
  if (!brut || typeof brut !== 'object') return null;
  const mode = CODES_REMUNERATION.includes(brut.mode) ? brut.mode : null;
  const montant = Number(String(brut.montant ?? '').replace(',', '.'));
  if (!mode || !Number.isFinite(montant) || montant < 0) return null;
  if (mode === 'pourcentage_ca' && montant > 100) return null;
  if (mode !== 'pourcentage_ca' && montant > 10000) return null;
  return { mode, montant: arrondi(montant) };
}

/** « 30 € / séance », « 12 % du CA », ou null si rien n'est convenu. */
export function labelRemuneration(rem) {
  const r = sanitizeRemuneration(rem);
  if (!r) return null;
  const n = Number.isInteger(r.montant) ? String(r.montant) : r.montant.toFixed(2).replace('.', ',');
  return `${n} ${MODES_REMUNERATION[r.mode].unite}`;
}

// ── Le mois ──────────────────────────────────────────────────────────────────
export const REGEX_MOIS = /^\d{4}-(0[1-9]|1[0-2])$/;
const MOIS_FR = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin',
  'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];

/** 'AAAA-MM' → { from: 'AAAA-MM-01', to: 'AAAA-MM-31' }, ou null. */
export function bornesMois(mois) {
  if (!REGEX_MOIS.test(String(mois || ''))) return null;
  const [a, m] = String(mois).split('-').map(Number);
  const dernier = new Date(Date.UTC(a, m, 0)).getUTCDate();
  return { from: `${mois}-01`, to: `${mois}-${String(dernier).padStart(2, '0')}` };
}

/** '2026-09' → 'septembre 2026'. */
export function labelMois(mois) {
  if (!REGEX_MOIS.test(String(mois || ''))) return String(mois || '');
  const [a, m] = String(mois).split('-');
  return `${MOIS_FR[Number(m) - 1]} ${a}`;
}

/** Le mois d'une date ISO, en heure de Paris quand c'est un instant. */
export function moisDe(date) {
  return String(date || '').slice(0, 7);
}

/** Le mois précédent d'un 'AAAA-MM' (ou du mois courant Paris si absent). */
export function moisPrecedent(mois = null, maintenant = new Date()) {
  let base = mois;
  if (!REGEX_MOIS.test(String(base || ''))) {
    base = maintenant.toLocaleDateString('sv-SE', { timeZone: 'Europe/Paris' }).slice(0, 7);
  }
  const [a, m] = base.split('-').map(Number);
  const d = new Date(Date.UTC(a, m - 2, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}

/** Le mois courant, en heure de Paris. */
export function moisCourant(maintenant = new Date()) {
  return maintenant.toLocaleDateString('sv-SE', { timeZone: 'Europe/Paris' }).slice(0, 7);
}

/** Les N derniers mois (courant compris), du plus récent au plus ancien. */
export function derniersMois(n = 6, maintenant = new Date()) {
  const out = [];
  let m = moisCourant(maintenant);
  for (let i = 0; i < n; i++) { out.push(m); m = moisPrecedent(m); }
  return out;
}

// ── Le relevé ────────────────────────────────────────────────────────────────
/**
 * Une présence compte-t-elle comme « présente » sur le relevé ? Pointée
 * présente, jamais une annulation tardive ni une ligne d'information.
 */
export function presenceComptee(p) {
  if (!p || p.annulation_tardive) return false;
  const statut = p.statut_pointage || (p.pointee ? 'present' : 'inscrit');
  return statut === 'present';
}

/**
 * Le CA rattaché à UNE présence, sans rien inventer :
 *   • une séance payée à l'unité (paiement lié à la présence, réglé) vaut ce
 *     paiement ;
 *   • une séance décomptée d'un carnet vaut le prix du carnet divisé par son
 *     nombre de séances (prorata), si les deux sont connus ;
 *   • sinon 0 : un abonnement illimité n'a pas de « prix par séance », et on
 *     ne le devine pas. Le relevé le DIT (`ca_inconnu`).
 * @param p            la présence ({ abonnement_id, paiement_montant })
 * @param abonnements  Map id → { prix, seances_total }
 */
export function caPresence(p, abonnements) {
  if (!p) return { montant: 0, source: 'aucune' };
  if (Number.isFinite(Number(p.paiement_montant)) && Number(p.paiement_montant) > 0) {
    return { montant: arrondi(p.paiement_montant), source: 'seance' };
  }
  if (p.abonnement_id && abonnements) {
    const a = abonnements.get ? abonnements.get(p.abonnement_id) : abonnements[p.abonnement_id];
    const total = Number(a?.seances_total);
    const prix = Number(a?.prix);
    if (a && total > 0 && Number.isFinite(prix) && prix > 0) {
      return { montant: arrondi(prix / total), source: 'carnet' };
    }
    return { montant: 0, source: 'inconnu' };
  }
  return { montant: 0, source: 'aucune' };
}

/**
 * LE calcul du relevé d'un mois.
 *
 * @param {object[]} seances  les séances de l'intervenante sur le mois, déjà
 *   passées et non annulées, chacune avec ses `presences` ({ statut_pointage,
 *   pointee, annulation_tardive, abonnement_id, paiement_montant })
 * @param {Map} abonnements  id → { prix, seances_total }
 * @param {object|null} remuneration  la rémunération convenue (brute ou saine)
 * @returns {{ nb_seances, minutes, heures, nb_presentes, ca, ca_inconnu, remuneration, montant_du, lignes }}
 */
export function calculerReleve(seances, abonnements, remuneration) {
  const rem = sanitizeRemuneration(remuneration);
  const lignes = [];
  let minutes = 0, nbPresentes = 0, ca = 0, caInconnu = 0;
  for (const s of (seances || [])) {
    if (!s || s.est_annule) continue;
    const presentes = (s.presences || []).filter(presenceComptee);
    let caSeance = 0, inconnues = 0;
    for (const p of presentes) {
      const r = caPresence(p, abonnements);
      caSeance += r.montant;
      if (r.source === 'inconnu') inconnues++;
    }
    const duree = Number(s.duree_minutes) || 60;
    minutes += duree;
    nbPresentes += presentes.length;
    ca += caSeance;
    caInconnu += inconnues;
    lignes.push({
      id: s.id,
      date: s.date,
      heure: s.heure ? String(s.heure).slice(0, 5) : null,
      nom: s.nom,
      duree_minutes: duree,
      nb_presentes: presentes.length,
      ca: arrondi(caSeance),
      ca_inconnu: inconnues,
    });
  }
  lignes.sort((a, b) => (a.date + (a.heure || '')).localeCompare(b.date + (b.heure || '')));
  const heures = arrondi(minutes / 60);
  const nbSeances = lignes.length;
  let montantDu = null;
  if (rem) {
    if (rem.mode === 'par_seance') montantDu = rem.montant * nbSeances;
    else if (rem.mode === 'horaire') montantDu = rem.montant * heures;
    else if (rem.mode === 'pourcentage_ca') montantDu = ca * rem.montant / 100;
    else if (rem.mode === 'forfait_mensuel') montantDu = nbSeances > 0 ? rem.montant : 0;
    montantDu = arrondi(montantDu);
  }
  return {
    nb_seances: nbSeances,
    minutes,
    heures,
    nb_presentes: nbPresentes,
    ca: arrondi(ca),
    // Le nombre de présences décomptées d'un abonnement sans prix par séance :
    // le CA affiché est un plancher, et le relevé le dit.
    ca_inconnu: caInconnu,
    remuneration: rem,
    montant_du: montantDu,
    lignes,
  };
}

/** Une phrase pour la ligne d'équipe et l'en-tête du relevé. */
export function resumeReleve(r) {
  if (!r) return '';
  const parts = [`${r.nb_seances} séance${r.nb_seances > 1 ? 's' : ''}`];
  if (r.heures) parts.push(`${String(r.heures).replace('.', ',')} h`);
  parts.push(`${r.nb_presentes} présente${r.nb_presentes > 1 ? 's' : ''}`);
  if (r.montant_du != null) parts.push(`${euros(r.montant_du)} dû`);
  return parts.join(' · ');
}

export function euros(n) {
  const v = arrondi(n);
  return (Number.isInteger(v) ? String(v) : v.toFixed(2).replace('.', ',')) + ' €';
}
