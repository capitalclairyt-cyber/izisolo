/**
 * Helpers pour la palette tonale Claude Design.
 *
 * Mappe un type de cours à un "tone" cohérent (rose/sage/sand/lavender) pour
 * donner du caractère visuel aux cartes (cours, ateliers, abonnements...).
 *
 * Logique :
 *   - Vinyasa, Flow, Power      → rose      (énergie, dynamisme)
 *   - Hatha, Yoga doux          → sage      (calme, équilibre)
 *   - Yin, Restoratif, Nidra    → lavender  (lenteur, profondeur)
 *   - Prénatal, Postnatal, Doux → sand      (douceur, chaleur)
 *   - Méditation, Pleine conscience → ink (centrage, retour à soi)
 *   - Default                   → sand
 */

const TONE_MAP = [
  { tone: 'rose',     keywords: ['vinyasa', 'flow', 'power', 'ashtanga', 'dynamic'] },
  { tone: 'sage',     keywords: ['hatha', 'doux', 'tradition', 'classique', 'iyengar'] },
  { tone: 'lavender', keywords: ['yin', 'restorat', 'nidra', 'sommeil', 'relax'] },
  { tone: 'sand',     keywords: ['prénatal', 'prenatal', 'postnatal', 'maternité', 'senior'] },
  { tone: 'ink',      keywords: ['méditation', 'meditation', 'pleine conscience', 'pranayama'] },
];

/**
 * Détermine le tone à utiliser pour un type de cours donné.
 * @param {string} typeCours - ex : "Vinyasa flow", "Hatha doux", "Yoga prénatal"
 * @returns {'rose' | 'sage' | 'sand' | 'lavender' | 'ink'}
 */
export function toneForCours(typeCours) {
  if (!typeCours) return 'sand';
  const t = typeCours.toLowerCase();
  for (const { tone, keywords } of TONE_MAP) {
    if (keywords.some(k => t.includes(k))) return tone;
  }
  // Fallback déterministe basé sur la première lettre
  const first = t.charCodeAt(0);
  const tones = ['rose', 'sage', 'sand', 'lavender'];
  return tones[first % tones.length];
}

/**
 * Tone pour un statut de paiement (couleur sémantique).
 * @param {string} statut - 'paid' | 'pending' | 'unpaid' | 'cb'
 */
export function toneForPaiement(statut) {
  switch (statut) {
    case 'paid':    return 'sage';     // payé = vert
    case 'pending': return 'sand';     // en attente = warm beige
    case 'unpaid':  return 'rose';     // impayé = rose-warning
    default:        return 'lavender';
  }
}
