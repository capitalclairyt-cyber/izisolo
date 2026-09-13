// ============================================================================
// IziSolo — Les salles d'un lieu et le chevauchement (v114, lot 4 du chantier
// Associations & Studios, 2026-09-13, PLAN-ASSOS-STUDIOS-2026.md §5.2)
// ----------------------------------------------------------------------------
// Une salle EST une ligne de `lieux` (`salle_de` = l'id du lieu parent,
// `capacite` facultative). Une séance porte sa salle par `cours.lieu_id`,
// exactement comme elle portait un lieu : rien ne change pour ce qui lit les
// lieux. Le chevauchement de deux séances dans la MÊME salle est refusé par
// la base (trigger v114) ; ce fichier en est le MIROIR pur, pour l'aperçu à
// la création et sur les séries, avant d'écrire.
//
// Fichier PUR : aucune requête. Verrou CI `gestion-studio.spec.js`.
// ============================================================================

/** Une ligne de `lieux` est-elle une salle ? */
export function estSalle(lieu) {
  return !!lieu?.salle_de;
}

/** Les salles d'un lieu, dans l'ordre d'affichage. */
export function sallesDe(lieux, lieuId) {
  return (lieux || []).filter(l => l.salle_de === lieuId).sort((a, b) => (a.ordre ?? 0) - (b.ordre ?? 0) || String(a.nom || '').localeCompare(String(b.nom || ''), 'fr'));
}

/** Les lieux (jamais une salle), dans l'ordre. */
export function lieuxRacine(lieux) {
  return (lieux || []).filter(l => !l.salle_de).sort((a, b) => (a.ordre ?? 0) - (b.ordre ?? 0));
}

/** Le lieu parent d'une salle (ou le lieu lui-même). */
export function lieuParent(lieux, lieuOuSalleId) {
  const l = (lieux || []).find(x => x.id === lieuOuSalleId);
  if (!l) return null;
  if (!l.salle_de) return l;
  return (lieux || []).find(x => x.id === l.salle_de) || null;
}

/** « Salle Zen · Studio Centre » pour une salle, « Studio Centre » pour un lieu. */
export function labelLieu(lieux, lieuOuSalleId) {
  const l = (lieux || []).find(x => x.id === lieuOuSalleId);
  if (!l) return '';
  if (!l.salle_de) return l.nom || '';
  const parent = (lieux || []).find(x => x.id === l.salle_de);
  return parent ? `${l.nom} · ${parent.nom}` : (l.nom || '');
}

/**
 * La liste à proposer dans un sélecteur de lieu : chaque lieu, puis ses
 * salles indentées. [{ id, label, salle: bool, capacite }]
 */
export function optionsLieux(lieux) {
  const out = [];
  for (const l of lieuxRacine(lieux)) {
    out.push({ id: l.id, label: l.nom || '', salle: false, capacite: null });
    for (const s of sallesDe(lieux, l.id)) out.push({ id: s.id, label: `↳ ${s.nom}`, salle: true, capacite: s.capacite ?? null });
  }
  return out;
}

/** Nettoie une salle à créer / modifier. */
export function sanitizeSalle(brut) {
  const nom = String(brut?.nom || '').replace(/\s+/g, ' ').trim().slice(0, 80);
  if (!nom) return { ok: false, raison: 'Donne un nom à la salle.' };
  const cap = brut?.capacite === '' || brut?.capacite == null ? null : Number(brut.capacite);
  if (cap !== null && (!Number.isInteger(cap) || cap < 1 || cap > 500)) return { ok: false, raison: 'La capacité est un nombre entier entre 1 et 500 (ou vide).' };
  return { ok: true, salle: { nom, capacite: cap } };
}

// ── Le chevauchement ─────────────────────────────────────────────────────────
/** [début, fin[ en minutes depuis minuit ; null si la séance n'a pas d'heure. */
export function plageDe(seance) {
  const h = String(seance?.heure || '').slice(0, 5);
  if (!/^\d{2}:\d{2}$/.test(h)) return null;
  const [hh, mm] = h.split(':').map(Number);
  const debut = hh * 60 + mm;
  return { debut, fin: debut + (Number(seance?.duree_minutes) || 60) };
}

/**
 * Deux séances se chevauchent-elles ? Même salle, même jour, aucune annulée,
 * intervalles [début, fin[ qui se croisent. Miroir EXACT du trigger v114.
 */
export function chevauche(a, b) {
  if (!a || !b || !a.lieu_id || a.lieu_id !== b.lieu_id) return false;
  if (a.est_annule || b.est_annule) return false;
  if (!a.date || a.date !== b.date) return false;
  if (a.id && b.id && a.id === b.id) return false;
  const pa = plageDe(a), pb = plageDe(b);
  if (!pa || !pb) return false;
  return pa.debut < pb.fin && pb.debut < pa.fin;
}

/**
 * Les conflits d'une liste de séances CANDIDATES (à créer) contre les
 * séances EXISTANTES d'une salle, et entre elles. `estSalle` dit si le
 * lieu_id est une salle : sans salle, aucun conflit (c'est la règle).
 * → [{ candidate, contre }]
 */
export function chevauchementsPour(candidates, existantes, { salle = true } = {}) {
  if (!salle) return [];
  const out = [];
  const cands = (candidates || []).filter(Boolean);
  for (let i = 0; i < cands.length; i++) {
    const c = cands[i];
    for (const e of (existantes || [])) if (chevauche(c, e)) out.push({ candidate: c, contre: e });
    for (let k = i + 1; k < cands.length; k++) if (chevauche(c, cands[k])) out.push({ candidate: c, contre: cands[k] });
  }
  return out;
}

/** Une phrase par conflit, pour l'aperçu et le toast. */
export function texteChevauchement(conflit, labelSalle = 'cette salle') {
  const { candidate, contre } = conflit;
  const jour = String(candidate?.date || '').slice(0, 10).split('-').reverse().join('/');
  const h = (s) => String(s?.heure || '').slice(0, 5);
  return `Le ${jour} à ${h(candidate)}, ${labelSalle} est déjà prise par « ${contre?.nom || 'une séance'} » (${h(contre)}, ${Number(contre?.duree_minutes) || 60} min).`;
}

/** Le message d'erreur d'un refus par la base (trigger v114), lisible. */
export function estRefusChevauchement(error) {
  return /CHEVAUCHEMENT_SALLE/.test(String(error?.message || error || ''));
}
