// ============================================================================
// IziSolo — Les couleurs de marque d'un studio (v104, 2026-08-25)
// ----------------------------------------------------------------------------
// SOURCE UNIQUE de lecture et d'écriture de `profiles.couleurs_marque`.
// Règle §12 : un JSONB de config se lit par SON helper, jamais brut avec ses
// propres défauts — sinon chaque lecture invente le sien et ils divergent.
//
// Les deux couleurs vivaient déjà dans le bloc intégrable (Manon, 07/2026),
// mais uniquement dans le code collé sur le site de la prof. Le portail, lui,
// gardait la palette du métier : son planning était à ses couleurs et la page
// où l'on atterrit ne l'était pas. Depuis v104 elles sont stockées, et les
// deux surfaces parlent la même langue.
//
// ⚠️ La colonne ne va JAMAIS dans un select principal ni dans un insert
// (patron poserLienVisio v86 / vignettes v99) : un select qui nomme une
// colonne absente rend `data` null, et la page entière affiche « introuvable ».
// ============================================================================

import { parseHexCouleur, deriverCouleursPortail } from './embed-couleurs';

/** Codes PostgREST d'une colonne inconnue du cache de schéma (§12). */
const ABSENTE = ['PGRST204', '42703'];

/**
 * Nettoie ce qui vient d'un formulaire. Deux couleurs MAX (cadrage Colin) :
 * au-delà, on ne fabrique plus une identité, on fabrique un sapin de Noël.
 * Une valeur illisible est JETÉE plutôt que devinée.
 */
export function sanitizeCouleursMarque(brut) {
  const c1 = parseHexCouleur(brut?.c1);
  if (!c1) return null;                       // sans la première, la seconde n'a pas de sens
  const c2 = parseHexCouleur(brut?.c2);
  return c2 ? { c1, c2 } : { c1 };
}

/** Lecture depuis une row profiles déjà chargée. `null` = aucun réglage. */
export function lireCouleursMarque(row) {
  return sanitizeCouleursMarque(row?.couleurs_marque);
}

/**
 * Les surcharges de tokens à poser en style INLINE sur la racine du portail.
 * `null` quand la prof n'a rien choisi : la palette du métier reste, et c'est
 * exactement le comportement d'avant.
 */
export function stylePortail(couleurs) {
  const c = sanitizeCouleursMarque(couleurs);
  if (!c) return null;
  return deriverCouleursPortail(c.c1, c.c2);
}

/**
 * Chargement DÉFENSIF, en requête SÉPARÉE. Pré-v104 la colonne n'existe pas :
 * on rend `null` et personne ne s'en aperçoit.
 */
export async function chargerCouleursMarque(supabase, profileId) {
  if (!profileId) return null;
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('couleurs_marque')
      .eq('id', profileId)
      .maybeSingle();
    if (error) return null;
    return lireCouleursMarque(data);
  } catch {
    return null;
  }
}

/**
 * Écriture défensive. Retourne { ok } ou { ok:false, migrationManquante } —
 * jamais une exception : le reste de la sauvegarde des Paramètres ne doit pas
 * tomber parce qu'une couleur n'a pas pu être enregistrée.
 */
export async function poserCouleursMarque(supabase, profileId, brut) {
  try {
    const { error } = await supabase
      .from('profiles')
      .update({ couleurs_marque: sanitizeCouleursMarque(brut) })
      .eq('id', profileId);
    if (error) return { ok: false, migrationManquante: ABSENTE.includes(error.code) };
    return { ok: true };
  } catch {
    return { ok: false, migrationManquante: false };
  }
}
