// ============================================================================
// IziSolo — Les dépenses d'une structure et l'exercice (v112, lot 2 du
// chantier Associations & Studios, PLAN-ASSOS-STUDIOS-2026.md §5.1, §5.2)
// ----------------------------------------------------------------------------
// La première table de dépenses de l'app, simple par construction : une date,
// une catégorie, un montant TTC (le HT et la TVA sont facultatifs : une asso
// non assujettie n'en a pas), un fournisseur, un justificatif, et des
// rattachements facultatifs (intervenante, salle, cours) qui servent la marge
// du plan Studio (lot 4).
//
// Fichier PUR : catégories, sanitize, totaux, exercice. Les écritures vivent
// dans /api/depenses/*. Verrou CI `argent-ecosysteme.spec.js`.
// ============================================================================

export const CATEGORIES_DEPENSE = {
  intervenante: { label: 'Rémunération intervenante', emoji: '🧘' },
  salle:        { label: 'Salle, loyer, charges',      emoji: '🏛️' },
  materiel:     { label: 'Matériel',                   emoji: '🧱' },
  assurance:    { label: 'Assurance, cotisations',     emoji: '🛡️' },
  logiciel:     { label: 'Logiciels, abonnements',     emoji: '💻' },
  communication:{ label: 'Communication, site',        emoji: '📣' },
  formation:    { label: 'Formation',                  emoji: '🎓' },
  frais:        { label: 'Frais divers, déplacements', emoji: '🚗' },
  autre:        { label: 'Autre',                      emoji: '📎' },
};
export const CODES_CATEGORIE = Object.keys(CATEGORIES_DEPENSE);
export const MODES_REGLEMENT_DEPENSE = ['virement', 'cb', 'especes', 'cheque', 'prelevement'];

const arrondi = (n) => Math.round((Number(n) || 0) * 100) / 100;
const nombre = (v) => {
  if (v === '' || v === null || v === undefined) return null;
  const n = Number(String(v).replace(',', '.'));
  return Number.isFinite(n) ? n : null;
};
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Nettoie une dépense saisie. Retourne { ok, depense } ou { ok:false, raison }.
 * TRONQUE les textes plutôt que de rejeter ; REFUSE ce qui rendrait la ligne
 * fausse : un montant absent ou négatif, une date difforme, une TVA hors de
 * 0..100. Un HT sans TVA (ou l'inverse) est accepté tel quel : on n'invente
 * pas l'autre.
 */
export function sanitizeDepense(brut) {
  const libelle = String(brut?.libelle || '').replace(/\s+/g, ' ').trim().slice(0, 160);
  if (!libelle) return { ok: false, raison: 'Dis en deux mots ce que c\'est.' };
  const date = String(brut?.date || '').slice(0, 10);
  if (!DATE_RE.test(date)) return { ok: false, raison: 'La date de la dépense est obligatoire.' };
  const ttc = nombre(brut?.montant_ttc);
  if (ttc === null || ttc < 0) return { ok: false, raison: 'Le montant TTC est obligatoire.' };
  const ht = nombre(brut?.montant_ht);
  if (ht !== null && ht < 0) return { ok: false, raison: 'Le montant HT ne peut pas être négatif.' };
  const tva = nombre(brut?.tva_taux);
  if (tva !== null && (tva < 0 || tva > 100)) return { ok: false, raison: 'Le taux de TVA est un pourcentage entre 0 et 100.' };
  const categorie = CODES_CATEGORIE.includes(brut?.categorie) ? brut.categorie : 'autre';
  const statut = brut?.statut === 'a_regler' ? 'a_regler' : 'reglee';
  const dateReglement = String(brut?.date_reglement || '').slice(0, 10);
  const modeReglement = MODES_REGLEMENT_DEPENSE.includes(brut?.mode_reglement) ? brut.mode_reglement : null;
  const url = String(brut?.justificatif_url || '').trim();
  return {
    ok: true,
    depense: {
      libelle,
      date,
      categorie,
      montant_ttc: arrondi(ttc),
      montant_ht: ht === null ? null : arrondi(ht),
      tva_taux: tva === null ? null : arrondi(tva),
      fournisseur: String(brut?.fournisseur || '').trim().slice(0, 120) || null,
      notes: String(brut?.notes || '').trim().slice(0, 600) || null,
      justificatif_url: /^https:\/\//.test(url) ? url.slice(0, 500) : null,
      statut,
      date_reglement: statut === 'reglee' ? (DATE_RE.test(dateReglement) ? dateReglement : date) : null,
      mode_reglement: statut === 'reglee' ? modeReglement : null,
      membre_id: brut?.membre_id || null,
      lieu_id: brut?.lieu_id || null,
      cours_id: brut?.cours_id || null,
    },
  };
}

/** Le HT et la TVA d'une dépense, quand elle les porte ; sinon null. */
export function tvaDe(d) {
  const ttc = Number(d?.montant_ttc) || 0;
  const ht = d?.montant_ht === null || d?.montant_ht === undefined ? null : Number(d.montant_ht);
  if (ht !== null && Number.isFinite(ht)) return arrondi(ttc - ht);
  const taux = d?.tva_taux === null || d?.tva_taux === undefined ? null : Number(d.tva_taux);
  if (taux !== null && Number.isFinite(taux) && taux > 0) return arrondi(ttc - ttc / (1 + taux / 100));
  return null;
}

/** Totaux d'une liste de dépenses : TTC, TTC réglé, à régler, par catégorie. */
export function totauxDepenses(depenses) {
  const out = { ttc: 0, reglees: 0, a_regler: 0, tva: 0, parCategorie: {} };
  for (const d of (depenses || [])) {
    const ttc = arrondi(d?.montant_ttc);
    out.ttc += ttc;
    if (d?.statut === 'a_regler') out.a_regler += ttc; else out.reglees += ttc;
    const tva = tvaDe(d);
    if (tva) out.tva += tva;
    const cat = CODES_CATEGORIE.includes(d?.categorie) ? d.categorie : 'autre';
    out.parCategorie[cat] = arrondi((out.parCategorie[cat] || 0) + ttc);
  }
  out.ttc = arrondi(out.ttc); out.reglees = arrondi(out.reglees); out.a_regler = arrondi(out.a_regler); out.tva = arrondi(out.tva);
  return out;
}

// ── L'exercice ───────────────────────────────────────────────────────────────
// Une association vit par SAISON (septembre → août) : son rapport financier
// d'AG couvre l'année d'activité, pas l'année civile. Un studio tient l'année
// civile de son comptable. Le mois de début se règle (1 = civil, 9 = saison).

export const EXERCICE_CIVIL = 1;
export const EXERCICE_SAISON = 9;

/** Le mois de début d'exercice par défaut selon le type de structure. */
export function debutExerciceDefaut(typeStructure) {
  return typeStructure === 'association' ? EXERCICE_SAISON : EXERCICE_CIVIL;
}

/**
 * Les bornes de l'exercice qui contient une date, pour un mois de début.
 * → { id: '2025-2026' | '2026', label, from, to }
 */
export function exerciceDe(dateIso, debutMois = EXERCICE_CIVIL) {
  const d = String(dateIso || '').slice(0, 10);
  const [a, m] = d.split('-').map(Number);
  const debut = Math.min(12, Math.max(1, Number(debutMois) || 1));
  if (!a || !m) return null;
  if (debut === 1) {
    return { id: String(a), label: `Année ${a}`, from: `${a}-01-01`, to: `${a}-12-31`, debutMois: 1 };
  }
  const anneeDebut = m >= debut ? a : a - 1;
  const mm = String(debut).padStart(2, '0');
  const finMois = debut - 1;
  const finAnnee = anneeDebut + 1;
  const dernier = new Date(Date.UTC(finAnnee, finMois, 0)).getUTCDate();
  return {
    id: `${anneeDebut}-${finAnnee}`,
    label: `Saison ${anneeDebut}-${finAnnee}`,
    from: `${anneeDebut}-${mm}-01`,
    to: `${finAnnee}-${String(finMois).padStart(2, '0')}-${String(dernier).padStart(2, '0')}`,
    debutMois: debut,
  };
}

/** Les N derniers exercices (courant compris), du plus récent au plus ancien. */
export function derniersExercices(n = 3, debutMois = EXERCICE_CIVIL, maintenant = new Date()) {
  const aujourdhui = maintenant.toLocaleDateString('sv-SE', { timeZone: 'Europe/Paris' });
  const out = [];
  let ex = exerciceDe(aujourdhui, debutMois);
  for (let i = 0; i < n && ex; i++) {
    out.push(ex);
    const veille = new Date(`${ex.from}T12:00:00Z`);
    veille.setUTCDate(veille.getUTCDate() - 1);
    ex = exerciceDe(veille.toISOString().slice(0, 10), debutMois);
  }
  return out;
}

/** Un identifiant d'exercice saisi ('2026' ou '2025-2026') → ses bornes, ou null. */
export function exerciceParId(id, debutMois = EXERCICE_CIVIL) {
  const s = String(id || '');
  if (/^\d{4}$/.test(s)) return exerciceDe(`${s}-06-15`, 1);
  const m = s.match(/^(\d{4})-(\d{4})$/);
  if (m && Number(m[2]) === Number(m[1]) + 1) {
    const debut = Math.min(12, Math.max(2, Number(debutMois) || EXERCICE_SAISON));
    return exerciceDe(`${m[1]}-${String(debut).padStart(2, '0')}-15`, debut);
  }
  return null;
}
