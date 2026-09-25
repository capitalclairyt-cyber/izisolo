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

/**
 * v123 (2026-09-23) : le RÉGLAGE d'un studio a trois valeurs. « auto » (le
 * défaut) = la page suit la langue du navigateur de chaque visiteuse ; « fr »
 * et « en » = le studio a choisi, et le navigateur ne compte plus. Le cookie
 * de la visiteuse (bouton FR / EN) prime toujours.
 */
export const REGLAGES_LANGUE_STUDIO = ['auto', 'fr', 'en'];
export const REGLAGE_LANGUE_DEFAUT = 'auto';
export const LIBELLES_REGLAGES = { auto: 'Automatique', fr: 'Français', en: 'English' };

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

/** Le réglage d'un studio, normalisé : 'auto' | 'fr' | 'en' (inconnu, null, colonne absente → 'auto'). */
export function reglageLangueStudio(profile) {
  const v = typeof profile?.langue_portail === 'string' ? profile.langue_portail.trim().toLowerCase() : '';
  return REGLAGES_LANGUE_STUDIO.includes(v) ? v : REGLAGE_LANGUE_DEFAUT;
}

/**
 * La langue que le NAVIGATEUR de la visiteuse annonce (en-tête
 * Accept-Language), parmi celles du portail : la première par ordre de
 * préférence (q) qui soit fr ou en, sinon null. « es-ES,en;q=0.8 » → 'en',
 * « de » → null, « fr-CA » → 'fr'.
 */
export function langueNavigateur(header) {
  if (typeof header !== 'string' || !header.trim()) return null;
  const candidats = header.split(',').map((part, i) => {
    const [tag, ...params] = part.trim().split(';');
    let q = 1;
    for (const prm of params) {
      const m = prm.trim().match(/^q=([0-9.]+)$/i);
      if (m) q = Number(m[1]);
    }
    return { tag: tag.trim(), q: Number.isFinite(q) ? q : 0, i };
  }).filter(x => x.tag && x.q > 0);
  candidats.sort((a, b) => (b.q - a.q) || (a.i - b.i));
  for (const x of candidats) {
    const l = normaliserLangue(x.tag);
    if (l) return l;
  }
  return null;
}

/**
 * La langue d'affichage : cookie de la visiteuse > réglage du studio s'il a
 * CHOISI (fr ou en) > langue du navigateur si le studio est en « auto » > fr.
 * Sans v123, tout studio est « fr » (le défaut de v121) : le navigateur ne
 * compte pas, exactement l'état d'avant.
 * @param {{ cookie?: string|null, studio?: string|null, navigateur?: string|null }} p
 */
export function resoudreLangue({ cookie, studio, navigateur } = {}) {
  const c = normaliserLangue(cookie);
  if (c) return c;
  const reglage = reglageLangueStudio({ langue_portail: studio });
  if (reglage !== 'auto') return reglage;
  return normaliserLangue(navigateur) || LANGUE_DEFAUT;
}

/** La langue par défaut d'un studio SANS navigateur (emails, crons) : fr ou en, jamais « auto ». */
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
  const fiche = normaliserLangue(client?.langue);
  const choixStudio = normaliserLangue(studio?.langue_portail); // fr | en ; null si « auto » ou absent
  // v124 : une langue DEVINÉE du navigateur (langue_deduite) ne vaut que tant
  // que le studio est en « auto » ; dès qu'il a choisi, son choix reprend la
  // main. Une langue CHOISIE par le bouton FR / EN prime toujours.
  if (fiche && !client?.langue_deduite) return fiche;
  if (fiche && client?.langue_deduite) return choixStudio || fiche;
  return choixStudio || LANGUE_DEFAUT;
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
