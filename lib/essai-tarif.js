/**
 * lib/essai-tarif.js — LE lecteur du tarif du cours d'essai (v92, retour Kim
 * 2026-08-20 : essai particulier ≠ essai collectif).
 *
 * Règles (figées à l'écriture, verrou tests/e2e/essai-tarif.spec.js) :
 *   - `essai_prix` reste LE prix ; `essai_prix_par_type` ({type: prix}) le
 *     surcharge par type de cours, UNIQUEMENT en mode 'sur_place' — le mode
 *     'stripe' a un seul lien de paiement, un prix variable y mentirait ;
 *   - 'gratuit' → 0, toujours ;
 *   - cours sans type, type inconnu de la carte → prix par défaut ;
 *   - la colonne v92 ne va JAMAIS dans un select principal (anti-pattern
 *     colonnes fantômes §12) : les surfaces la chargent par
 *     `getEssaiPrixParType` (requête séparée défensive, comme docs v85).
 */

/** Nettoie la carte {type: prix} : nombres finis > 0 seulement, clés non
 *  vides. Renvoie null si rien ne survit (= pas de surcharge). */
export function sanitizeEssaiPrixParType(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const out = {};
  for (const [k, v] of Object.entries(raw)) {
    const type = String(k || '').trim();
    const prix = typeof v === 'string' ? parseFloat(v.replace(',', '.')) : Number(v);
    if (!type) continue;
    if (!Number.isFinite(prix) || prix <= 0) continue;
    out[type] = Math.round(prix * 100) / 100;
  }
  return Object.keys(out).length > 0 ? out : null;
}

/** Prix du cours d'essai pour UN cours (par son type). `surcharges` vient de
 *  getEssaiPrixParType (déjà nettoyée) ; brut accepté par sécurité. */
export function prixEssai(profile, typeCours, surcharges) {
  const paiement = profile?.essai_paiement || 'gratuit';
  if (paiement === 'gratuit') return 0;
  const base = Number(profile?.essai_prix) || 0;
  if (paiement !== 'sur_place') return base; // stripe : un seul lien, prix unique
  const carte = sanitizeEssaiPrixParType(surcharges);
  if (!carte || !typeCours || carte[typeCours] == null) return base;
  return carte[typeCours];
}

/** Le tarif varie-t-il réellement selon le type ? (pour afficher « dès X € ») */
export function essaiVarieParType(profile, surcharges) {
  if ((profile?.essai_paiement || 'gratuit') !== 'sur_place') return false;
  const carte = sanitizeEssaiPrixParType(surcharges);
  if (!carte) return false;
  const base = Number(profile?.essai_prix) || 0;
  return Object.values(carte).some(p => p !== base);
}

/** Prix plancher (« dès X € ») : min du prix par défaut et des surcharges. */
export function minPrixEssai(profile, surcharges) {
  const base = Number(profile?.essai_prix) || 0;
  if ((profile?.essai_paiement || 'gratuit') !== 'sur_place') return base;
  const carte = sanitizeEssaiPrixParType(surcharges);
  if (!carte) return base;
  return Math.min(base, ...Object.values(carte));
}

/**
 * Charge les surcharges d'un studio — requête SÉPARÉE défensive : tant que la
 * migration v92 n'est pas appliquée, le select ciblé échoue (42703) et on
 * renvoie null = prix unique, rien ne casse (même pattern que docs v85).
 */
export async function getEssaiPrixParType(supabase, profileId) {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('essai_prix_par_type')
      .eq('id', profileId)
      .maybeSingle();
    if (error) return null;
    return sanitizeEssaiPrixParType(data?.essai_prix_par_type);
  } catch {
    return null;
  }
}
