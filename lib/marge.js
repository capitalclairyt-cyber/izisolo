// ============================================================================
// IziSolo — L'analyse d'exercice d'une structure (v114, lot 4 Associations &
// Studios, 2026-09-13, PLAN-ASSOS-STUDIOS-2026.md §5.2)
// ----------------------------------------------------------------------------
// Recettes, dépenses et résultat PAR MOIS, PAR SALLE, PAR INTERVENANTE, PAR
// TYPE de cours, et la MARGE d'une séance (son CA rattaché moins ce que coûte
// l'intervenante pour cette séance et les dépenses rattachées à la séance).
// Rien n'est stocké : tout se recalcule des paiements, des dépenses, des
// séances et des relevés. Une recette qui ne se rattache à aucune séance
// (une adhésion, un carnet vendu et jamais pointé) compte dans le mois, pas
// dans une salle ni une intervenante : les tableaux le DISENT (« non
// rattaché ») plutôt que de deviner.
//
// Fichier PUR. Verrou CI `gestion-studio.spec.js`.
// ============================================================================

import { caPresence, presenceComptee, sanitizeRemuneration } from './remuneration.js';
import { tvaDe } from './depenses.js';

const arrondi = (n) => Math.round((Number(n) || 0) * 100) / 100;
const moisDe = (d) => String(d || '').slice(0, 7);

/**
 * Le coût de l'intervenante pour UNE séance, selon ce qui est convenu :
 * par séance = le montant ; horaire = montant × durée ; pourcentage = % du
 * CA de la séance ; forfait mensuel = le forfait divisé par ses séances du
 * mois (fourni par l'appelant, `nbSeancesMois`). Rien de convenu = null.
 */
export function coutIntervenanteSeance(remuneration, { duree_minutes = 60, ca = 0, nbSeancesMois = 1 } = {}) {
  const rem = sanitizeRemuneration(remuneration);
  if (!rem) return null;
  if (rem.mode === 'par_seance') return arrondi(rem.montant);
  if (rem.mode === 'horaire') return arrondi(rem.montant * (Number(duree_minutes) || 60) / 60);
  if (rem.mode === 'pourcentage_ca') return arrondi(ca * rem.montant / 100);
  if (rem.mode === 'forfait_mensuel') return arrondi(rem.montant / Math.max(1, Number(nbSeancesMois) || 1));
  return null;
}

/**
 * Le CA rattaché à une séance (même règle que le relevé : paiement de la
 * présence, ou prorata du carnet ; un abonnement sans prix vaut 0 et se
 * compte en `ca_inconnu`).
 */
export function caSeance(seance, abonnements) {
  let ca = 0, inconnu = 0, presentes = 0;
  for (const p of (seance?.presences || [])) {
    if (!presenceComptee(p)) continue;
    presentes++;
    const r = caPresence(p, abonnements);
    ca += r.montant;
    if (r.source === 'inconnu') inconnu++;
  }
  return { ca: arrondi(ca), ca_inconnu: inconnu, nb_presentes: presentes };
}

/**
 * La marge d'une séance : CA − coût intervenante − dépenses rattachées à la
 * séance (cours_id). `null` de marge si le coût n'est pas connu (aucune
 * rémunération convenue) : on ne fabrique pas un chiffre.
 */
export function margeSeance(seance, { abonnements, remuneration = null, depenses = [], nbSeancesMois = 1 } = {}) {
  const { ca, ca_inconnu, nb_presentes } = caSeance(seance, abonnements);
  const cout = coutIntervenanteSeance(remuneration, { duree_minutes: seance?.duree_minutes, ca, nbSeancesMois });
  const dep = arrondi((depenses || []).filter(d => d.cours_id === seance?.id).reduce((s, d) => s + (Number(d.montant_ttc) || 0), 0));
  const marge = cout === null ? null : arrondi(ca - cout - dep);
  return { id: seance?.id, date: seance?.date, nom: seance?.nom, type_cours: seance?.type_cours || null, lieu_id: seance?.lieu_id || null, intervenant_id: seance?.intervenant_id || null, nb_presentes, ca, ca_inconnu, cout_intervenante: cout, depenses: dep, marge };
}

/**
 * L'analyse d'un exercice.
 * @param {object} p
 * @param {object[]} p.paiements  les encaissements de l'exercice ({ montant, date_encaissement|date, presence_id, abonnement_id, client_id })
 * @param {object[]} p.depenses   les dépenses de l'exercice ({ montant_ttc, montant_ht, tva_taux, date, categorie, membre_id, lieu_id, cours_id })
 * @param {object[]} p.seances    les séances passées de l'exercice avec presences ({ id, date, nom, type_cours, lieu_id, duree_minutes, intervenant_id, presences })
 * @param {Map} p.abonnements     id → { prix, seances_total }
 * @param {object[]} p.membres    [{ id, label, remuneration }]
 * @param {object[]} p.lieux      [{ id, nom, salle_de }]
 * @param {string[]} p.mois       les mois de l'exercice ('2026-09', …)
 */
export function analyserExercice({ paiements = [], depenses = [], seances = [], abonnements = new Map(), membres = [], lieux = [], mois = [] }) {
  const parMembre = new Map(membres.map(m => [m.id, m]));
  const nomLieu = (id) => { const l = lieux.find(x => x.id === id); if (!l) return 'Sans salle'; const p = l.salle_de ? lieux.find(x => x.id === l.salle_de) : null; return p ? `${l.nom} · ${p.nom}` : l.nom; };

  // Séances par mois et par intervenante (pour le forfait mensuel).
  const nbParMembreMois = new Map();
  for (const s of seances) {
    if (!s.intervenant_id) continue;
    const k = `${s.intervenant_id}:${moisDe(s.date)}`;
    nbParMembreMois.set(k, (nbParMembreMois.get(k) || 0) + 1);
  }
  const marges = seances.map(s => margeSeance(s, {
    abonnements,
    remuneration: parMembre.get(s.intervenant_id)?.remuneration || null,
    depenses,
    nbSeancesMois: nbParMembreMois.get(`${s.intervenant_id}:${moisDe(s.date)}`) || 1,
  }));

  const vide = () => ({ recettes: 0, depenses: 0, resultat: 0, nb_seances: 0, nb_presentes: 0 });
  const ajouter = (map, cle, { recettes = 0, depenses: dep = 0, nb_seances = 0, nb_presentes = 0 }) => {
    const v = map.get(cle) || vide();
    v.recettes = arrondi(v.recettes + recettes); v.depenses = arrondi(v.depenses + dep);
    v.nb_seances += nb_seances; v.nb_presentes += nb_presentes;
    v.resultat = arrondi(v.recettes - v.depenses);
    map.set(cle, v);
  };

  // Par MOIS : les encaissements (trésorerie) et les dépenses, tels quels.
  const parMois = new Map(mois.map(m => [m, vide()]));
  let recettes = 0, totalDep = 0;
  for (const p of paiements) {
    const m = moisDe(p.date_encaissement || p.date);
    const montant = Number(p.montant) || 0;
    recettes += montant;
    if (parMois.has(m)) ajouter(parMois, m, { recettes: montant });
  }
  for (const d of depenses) {
    const m = moisDe(d.date);
    const montant = Number(d.montant_ttc) || 0;
    totalDep += montant;
    if (parMois.has(m)) ajouter(parMois, m, { depenses: montant });
  }
  for (const s of marges) { const m = moisDe(s.date); if (parMois.has(m)) ajouter(parMois, m, { nb_seances: 1, nb_presentes: s.nb_presentes }); }

  // Par SALLE, par INTERVENANTE, par TYPE : le CA RATTACHÉ aux séances (pas
  // les encaissements bruts), les dépenses rattachées, et ce qui ne l'est pas.
  const parSalle = new Map(), parIntervenante = new Map(), parType = new Map();
  let caRattache = 0;
  for (const s of marges) {
    caRattache += s.ca;
    ajouter(parSalle, s.lieu_id || null, { recettes: s.ca, nb_seances: 1, nb_presentes: s.nb_presentes });
    ajouter(parIntervenante, s.intervenant_id || null, { recettes: s.ca, depenses: s.cout_intervenante || 0, nb_seances: 1, nb_presentes: s.nb_presentes });
    ajouter(parType, s.type_cours || null, { recettes: s.ca, depenses: (s.cout_intervenante || 0) + s.depenses, nb_seances: 1, nb_presentes: s.nb_presentes });
  }
  for (const d of depenses) {
    const montant = Number(d.montant_ttc) || 0;
    if (d.lieu_id) ajouter(parSalle, d.lieu_id, { depenses: montant });
    // Une dépense rattachée à une intervenante (sa prestation) : déjà comptée
    // par le coût de ses séances si une rémunération est convenue ; sinon
    // c'est la seule trace, on la prend.
    if (d.membre_id && !parMembre.get(d.membre_id)?.remuneration) ajouter(parIntervenante, d.membre_id, { depenses: montant });
  }

  const enListe = (map, label) => [...map.entries()].map(([id, v]) => ({ id, label: label(id), ...v })).sort((a, b) => b.recettes - a.recettes);
  return {
    totaux: { recettes: arrondi(recettes), depenses: arrondi(totalDep), resultat: arrondi(recettes - totalDep), ca_rattache: arrondi(caRattache), non_rattache: arrondi(recettes - caRattache), nb_seances: marges.length },
    par_mois: [...parMois.entries()].map(([id, v]) => ({ id, ...v })),
    par_salle: enListe(parSalle, nomLieu),
    par_intervenante: enListe(parIntervenante, (id) => (id ? (parMembre.get(id)?.label || 'Intervenante') : 'Sans intervenante')),
    par_type: enListe(parType, (id) => id || 'Sans type'),
    tva: tvaParTaux(depenses),
    seances: marges.sort((a, b) => String(b.date).localeCompare(String(a.date))),
  };
}

/** La TVA déductible des dépenses, par taux (HT, TVA, TTC). Une dépense sans HT ne porte pas de TVA. */
export function tvaParTaux(depenses) {
  const map = new Map();
  for (const d of (depenses || [])) {
    const tva = tvaDe(d);
    const ht = Number(d.montant_ht);
    if (!Number.isFinite(ht) || d.tva_taux == null) continue;
    const taux = Number(d.tva_taux);
    const v = map.get(taux) || { taux, ht: 0, tva: 0, ttc: 0 };
    v.ht = arrondi(v.ht + ht); v.tva = arrondi(v.tva + (Number(tva) || 0)); v.ttc = arrondi(v.ttc + (Number(d.montant_ttc) || 0));
    map.set(taux, v);
  }
  return [...map.values()].sort((a, b) => b.taux - a.taux);
}
