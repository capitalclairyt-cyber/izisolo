/**
 * lib/coherence-offres.js — Cohérence silencieuse offres ↔ cours (types).
 *
 * Analyse système 2026-07-28 (cas Manon/Soleya) : la sémantique de résolution
 * — figée 2026-07-13, identique JS (lib/carnet-resolution) et SQL (v64/v82) —
 * est « un cours SANS type est TOUJOURS accepté, même par un carnet
 * restreint ». Conséquence : une prof qui restreint une offre à « Vinyasa »
 * alors que ses séances n'ont pas de type croit avoir limité son abo… et il
 * couvre tout. 4 classes de pièges silencieux recensées :
 *   1. restriction INERTE  — offre restreinte + séances à venir sans type
 *      (couvertes par fail-open : la limite ne limite rien) ;
 *   2. type FANTÔME        — offre restreinte à des types dont aucune séance
 *      à venir (catalogue renommé, saison finie…) ;
 *   3. exclusion réelle    — séances d'un autre type : c'est LA feature,
 *      informatif seulement ;
 *   4. legacy « cours_unique » — l'unité se règle désormais par le
 *      `tarif_unitaire` du cours (Lot C 2026-07-22), pas par une offre.
 *
 * ⚠️ Le verdict « couvert / pas couvert » est DÉLÉGUÉ à
 * `resoudreCarnetApplicable` via un carnet fictif : ce module ne réimplémente
 * jamais la formule (il ne peut pas diverger d'elle).
 */
import { resoudreCarnetApplicable } from './carnet-resolution';

// Carnet fictif actif portant uniquement la restriction à analyser.
const aboFictif = (typesAutorises) => ({
  statut: 'actif',
  seances_total: null,
  seances_utilisees: 0,
  date_fin: null,
  types_cours_autorises: Array.isArray(typesAutorises) && typesAutorises.length > 0
    ? typesAutorises
    : null,
});

/** Une séance serait-elle couverte par une offre ainsi restreinte ?
 *  (régime tarifaire volontairement ignoré : on analyse la restriction seule) */
export function coursCouvert(typesAutorises, cours) {
  return !!resoudreCarnetApplicable([aboFictif(typesAutorises)], {
    type_cours: cours?.type_cours ?? null,
    date: cours?.date ?? null,
    tarif_unitaire: null,
  });
}

/**
 * Compte, sur les séances à venir, l'effet réel d'une restriction de types.
 * @returns {{ restreinte, total, couvertes, sansType, duType, autresTypes }}
 *   sansType    = séances sans type (couvertes malgré la restriction — piège 1)
 *   duType      = séances portant un des types autorisés
 *   autresTypes = séances d'un autre type (exclues — comportement voulu)
 */
export function analyserRestrictionOffre(typesAutorises, coursAVenir) {
  const restreinte = Array.isArray(typesAutorises) && typesAutorises.length > 0;
  const out = { restreinte, total: (coursAVenir || []).length, couvertes: 0, sansType: 0, duType: 0, autresTypes: 0 };
  for (const c of coursAVenir || []) {
    if (coursCouvert(typesAutorises, c)) out.couvertes++;
    if (!restreinte) continue;
    if (!c?.type_cours) out.sansType++;
    else if (typesAutorises.includes(c.type_cours)) out.duType++;
    else out.autresTypes++;
  }
  return out;
}

/**
 * Diagnostic de toutes les offres actives contre les séances à venir.
 * @returns {Array<{ kind, offre, analyse? }>} kinds :
 *   'restriction_inerte' | 'type_fantome' | 'legacy_unite'
 */
export function diagnostiquerOffres(offres, coursAVenir) {
  const issues = [];
  for (const o of offres || []) {
    if (o?.actif === false) continue;
    if (o?.type === 'cours_unique') {
      issues.push({ kind: 'legacy_unite', offre: o });
      continue;
    }
    const types = o?.types_cours_autorises;
    if (!Array.isArray(types) || types.length === 0) continue;
    const analyse = analyserRestrictionOffre(types, coursAVenir);
    if (analyse.duType === 0 && analyse.total > 0) {
      issues.push({ kind: 'type_fantome', offre: o, analyse });
    } else if (analyse.sansType > 0) {
      issues.push({ kind: 'restriction_inerte', offre: o, analyse });
    }
  }
  return issues;
}
