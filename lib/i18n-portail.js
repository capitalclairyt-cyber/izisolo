/**
 * lib/i18n-portail.js — la langue du portail élève (2026-09-22).
 *
 * Déclencheur : Romain (Shared Experience, Chessy, à côté de Disneyland).
 * Cinq de ses treize élèves passées par « Mon espace » se sont arrêtées à la
 * connexion sans jamais réserver : Hannah, Alfie, Andrea, Jesse… des
 * anglophones devant un portail qui ne parle que français.
 *
 * PUR : aucune requête, aucun accès à `cookies()`. Le serveur et le navigateur
 * l'importent tous les deux (le serveur passe par lib/i18n-portail-serveur.js
 * pour LIRE le cookie et le réglage du studio).
 *
 * Le principe, volontairement le moins invasif possible :
 *   - la CLÉ d'une traduction est la phrase FRANÇAISE telle qu'elle est
 *     écrite dans l'écran : `t('Réserver ma place')`. Le français reste la
 *     source, lisible dans le code, et une clé absente du dictionnaire rend le
 *     français (jamais un identifiant technique à l'écran) ;
 *   - les variables s'écrivent `{n}` : `t('{n} places restantes', { n })` ;
 *   - une seule langue de plus pour l'instant, l'anglais. Le dictionnaire est
 *     ÉCLATÉ par écran dans lib/i18n/en-*.js pour que plusieurs lots puissent
 *     y écrire sans se marcher dessus.
 *
 * Résolution (du plus précis au plus général) :
 *   1. le cookie `izi_lang` posé par le sélecteur FR / EN du portail (le choix
 *      de LA visiteuse, sur son appareil) ;
 *   2. `profiles.langue_portail`, le réglage du STUDIO (v121, défaut 'fr') ;
 *   3. le français.
 *
 * Verrou CI : tests/e2e/i18n-portail.spec.js (chaque `t('…')` du portail a sa
 * traduction anglaise, et elle diffère du français).
 */
import EN_COMMUN from './i18n/en-commun.js';
import EN_HOME from './i18n/en-home.js';
import EN_COURS from './i18n/en-cours.js';
import EN_ESPACE from './i18n/en-espace.js';
import EN_CONNEXION from './i18n/en-connexion.js';
import EN_EMAILS from './i18n/en-emails.js';
import EN_CRONS from './i18n/en-crons.js';
import EN_ROUTES from './i18n/en-routes.js';
import EN_SERVICES from './i18n/en-services.js';

export const LANGUES_PORTAIL = ['fr', 'en'];
export const LANGUE_DEFAUT = 'fr';
export const COOKIE_LANGUE = 'izi_lang';
/** Un an : le choix d'une visiteuse tient d'une rentrée à l'autre. */
export const COOKIE_LANGUE_MAX_AGE = 60 * 60 * 24 * 365;

export const LIBELLES_LANGUES = { fr: 'Français', en: 'English' };

/** Les dictionnaires par langue. Le français n'en a pas : c'est la clé. */
export const DICTIONNAIRES = {
  en: { ...EN_COMMUN, ...EN_HOME, ...EN_COURS, ...EN_ESPACE, ...EN_CONNEXION, ...EN_EMAILS, ...EN_CRONS, ...EN_ROUTES, ...EN_SERVICES },
};

export function estLangue(x) {
  return typeof x === 'string' && LANGUES_PORTAIL.includes(x);
}

/**
 * Normalise ce qui vient d'un cookie, d'un réglage ou d'un en-tête
 * (« en-GB », « EN », « fr_FR » → 'en' / 'fr'). Inconnu → null.
 */
export function normaliserLangue(x) {
  if (typeof x !== 'string') return null;
  const code = x.trim().toLowerCase().slice(0, 2);
  return estLangue(code) ? code : null;
}

/**
 * La langue d'affichage : cookie de la visiteuse > réglage du studio > fr.
 * @param {{ cookie?: string|null, studio?: string|null }} p
 */
export function resoudreLangue({ cookie, studio } = {}) {
  return normaliserLangue(cookie) || normaliserLangue(studio) || LANGUE_DEFAUT;
}

/** La langue par défaut d'un studio, lue sur son profil (défensif). */
export function langueStudio(profile) {
  return normaliserLangue(profile?.langue_portail) || LANGUE_DEFAUT;
}

/**
 * La langue d'un EMAIL ou d'un push adressé à une élève, quand aucun cookie
 * n'est disponible (cron, geste de la prof) : son choix mémorisé sur sa fiche
 * (`clients.langue`, v122) > le réglage du studio (`profiles.langue_portail`,
 * v121) > français. Un `client` ou un `studio` absent ou sans colonne ne
 * casse rien : c'est le français.
 */
export function langueEleve({ client, studio } = {}) {
  return normaliserLangue(client?.langue) || normaliserLangue(studio?.langue_portail) || LANGUE_DEFAUT;
}

/** Le locale à passer à `toLocaleDateString` et consorts. */
export function localeDe(langue) {
  return langue === 'en' ? 'en-GB' : 'fr-FR';
}

/** Remplace `{n}` par vars.n ; une variable absente laisse le marqueur. */
export function interpoler(texte, vars) {
  if (!vars || typeof texte !== 'string') return texte;
  return texte.replace(/\{(\w+)\}/g, (m, k) => (k in vars && vars[k] != null ? String(vars[k]) : m));
}

/**
 * Traduit une phrase française. Clé absente ou langue française → le
 * français, interpolé lui aussi.
 */
export function traduire(langue, fr, vars) {
  const dico = langue === LANGUE_DEFAUT ? null : DICTIONNAIRES[langue];
  const texte = (dico && typeof dico[fr] === 'string') ? dico[fr] : fr;
  return interpoler(texte, vars);
}

/** Fabrique le `t` d'une langue : `const t = traducteur('en'); t('Réserver')`. */
export function traducteur(langue) {
  const l = estLangue(langue) ? langue : LANGUE_DEFAUT;
  const t = (fr, vars) => traduire(l, fr, vars);
  t.langue = l;
  t.locale = localeDe(l);
  return t;
}

/** Le `Set-Cookie` du sélecteur (posé côté navigateur, lu par le serveur). */
export function cookieLangue(langue) {
  const l = estLangue(langue) ? langue : LANGUE_DEFAUT;
  return `${COOKIE_LANGUE}=${l}; path=/; max-age=${COOKIE_LANGUE_MAX_AGE}; samesite=lax`;
}
