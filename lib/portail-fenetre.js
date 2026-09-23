/**
 * lib/portail-fenetre.js — la fenêtre de la page publique, et ce qui se passe
 * quand une élève regarde plus loin (2026-09-23, retour Manon / Soleya).
 *
 * Le constat : la page publique ne chargeait que 60 jours de séances et la vue
 * semaine laissait cliquer ▶ sans limite. Soleya programme sa saison entière
 * (249 séances jusqu'en juillet) ; une élève arrivée sur la semaine du 23 au
 * 29 novembre lisait « Aucun cours cette semaine » alors que huit séances y
 * étaient, publiques, non annulées. Ce n'était pas la base qui manquait, c'est
 * l'écran qui ne savait pas et qui l'affirmait quand même.
 *
 * La forme retenue (option 2, décision Colin) : la page garde ses 60 jours
 * (léger, cachable) et, au-delà, le navigateur va chercher la plage qu'il
 * n'a pas encore par une route publique, jusqu'à UN AN devant. Un studio à
 * plusieurs profs (1 500 séances par an) ne coûte donc jamais 700 Ko au
 * premier chargement.
 *
 * Tout ici est PUR (aucune requête, aucune date implicite : « aujourd'hui »
 * est toujours passé en argument) pour que le verrou CI le fige.
 */

/** Jours chargés au premier rendu de la page publique. */
export const FENETRE_JOURS = 60;
/** Horizon maximal : au-delà d'un an, la route refuse (personne ne programme plus loin, et un robot n'a rien à y lire). */
export const HORIZON_JOURS = 366;
/** Une plage demandée à la route ne dépasse jamais un mois (une semaine pour ▶, quatre pour la liste). */
export const PLAGE_MAX_JOURS = 31;
/** Ce que « Voir les semaines suivantes » charge d'un coup en vue liste. */
export const PAS_LISTE_JOURS = 28;

const RE_ISO = /^\d{4}-\d{2}-\d{2}$/;

/** Ajoute n jours à une date ISO (calcul en UTC, donc jamais de dérive DST). */
export function ajouterJours(iso, n) {
  const d = new Date(iso + 'T12:00:00Z');
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

/** Nombre de jours entre deux dates ISO (a - de), entier. */
export function joursEntre(de, a) {
  return Math.round((new Date(a + 'T12:00:00Z') - new Date(de + 'T12:00:00Z')) / 86400000);
}

/** Vrai pour une date ISO valide qui existe (le 31 février est refusé). */
export function dateIsoValide(iso) {
  if (typeof iso !== 'string' || !RE_ISO.test(iso)) return false;
  const d = new Date(iso + 'T12:00:00Z');
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === iso;
}

/** La fin de la fenêtre chargée par la page : aujourd'hui + 60 jours. */
export function finFenetre(aujourdhui) {
  return ajouterJours(aujourdhui, FENETRE_JOURS);
}

/** La dernière date qu'une élève peut regarder : aujourd'hui + un an. */
export function finHorizon(aujourdhui) {
  return ajouterJours(aujourdhui, HORIZON_JOURS);
}

/**
 * Valide une plage demandée à la route publique.
 * @returns {{ ok: true, de: string, a: string } | { ok: false, raison: string }}
 *   raison ∈ 'DATE_INVALIDE' | 'PLAGE_INVERSEE' | 'PLAGE_TROP_LONGUE' | 'PLAGE_PASSEE' | 'HORS_HORIZON'
 * Une plage qui commence dans le passé est ramenée à aujourd'hui (une élève
 * qui recule d'une semaine ne doit pas recevoir une erreur), et refusée
 * seulement si elle est ENTIÈREMENT passée.
 */
export function validerPlage(de, a, aujourdhui) {
  if (!dateIsoValide(de) || !dateIsoValide(a)) return { ok: false, raison: 'DATE_INVALIDE' };
  if (a < de) return { ok: false, raison: 'PLAGE_INVERSEE' };
  if (joursEntre(de, a) + 1 > PLAGE_MAX_JOURS) return { ok: false, raison: 'PLAGE_TROP_LONGUE' };
  if (a < aujourdhui) return { ok: false, raison: 'PLAGE_PASSEE' };
  if (de > finHorizon(aujourdhui)) return { ok: false, raison: 'HORS_HORIZON' };
  return { ok: true, de: de < aujourdhui ? aujourdhui : de, a: a > finHorizon(aujourdhui) ? finHorizon(aujourdhui) : a };
}

/**
 * Ce qu'il manque pour afficher une semaine : null si tout est déjà chargé,
 * sinon la plage à demander (jamais ce qu'on a déjà, jamais au-delà de
 * l'horizon).
 * @param {string} debutSemaine   lundi ISO
 * @param {string} finSemaine     dimanche ISO
 * @param {string} chargeJusqu    dernière date déjà chargée (incluse)
 * @param {string} aujourdhui
 */
export function plageManquante(debutSemaine, finSemaine, chargeJusqu, aujourdhui) {
  if (finSemaine <= chargeJusqu) return null;
  const horizon = finHorizon(aujourdhui);
  const de = ajouterJours(chargeJusqu, 1) > debutSemaine ? ajouterJours(chargeJusqu, 1) : debutSemaine;
  if (de > horizon) return null;
  const a = finSemaine > horizon ? horizon : finSemaine;
  return { de, a };
}

/** La plage que « Voir les semaines suivantes » demande en vue liste. */
export function plageSuivante(chargeJusqu, aujourdhui, pas = PAS_LISTE_JOURS) {
  const horizon = finHorizon(aujourdhui);
  const de = ajouterJours(chargeJusqu, 1);
  if (de > horizon) return null;
  const a = ajouterJours(chargeJusqu, pas) > horizon ? horizon : ajouterJours(chargeJusqu, pas);
  return { de, a };
}

/** Vrai si la semaine commence après la dernière date qu'on peut regarder. */
export function semaineHorsHorizon(debutSemaine, aujourdhui) {
  return debutSemaine > finHorizon(aujourdhui);
}

/**
 * Fusionne des séances déjà chargées et des séances reçues : une séance
 * reçue REMPLACE celle de même id (ses places sont plus fraîches), aucune
 * n'est dupliquée, et la liste ressort triée par date puis heure.
 */
export function fusionnerSeances(existantes, nouvelles) {
  const parId = new Map();
  for (const c of existantes || []) if (c && c.id) parId.set(c.id, c);
  for (const c of nouvelles || []) if (c && c.id) parId.set(c.id, c);
  return [...parId.values()].sort((x, y) =>
    (x.date + (x.heure || '')).localeCompare(y.date + (y.heure || ''))
  );
}

/** Clé du cache mémoire d'une plage (anonyme par construction : le filtre de visibilité vient APRÈS). */
export function cleCachePlage(slug, de, a) {
  return `${slug}|${de}|${a}`;
}
