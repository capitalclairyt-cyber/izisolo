/**
 * Verrou CI — la langue du portail élève (2026-09-22).
 *
 * Node pur, zéro navigateur. Ce qu'il fige :
 *   1. chaque t('…') du portail a son anglais dans lib/i18n/en-*.js, et aucun
 *      appel n'est écrit en template literal (clé illisible) ;
 *   2. les {variables} d'une traduction sont celles de sa clé française ;
 *   3. aucune traduction ne porte de tiret cadratin (règle Colin 2026-08-19) ;
 *   4. la résolution : cookie > studio > français, et un code inconnu retombe
 *      sur le français ;
 *   5. traduire() rend le français pour une clé absente, interpole des deux
 *      côtés, et le cookie posé par le sélecteur est bien formé ;
 *   6. plus aucun 'fr-FR' en dur dans les composants NAVIGATEUR du portail :
 *      une date se formate avec `locale`.
 */
import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { auditerFichiers, listerFichiers, variablesDe } from '../../lib/i18n-audit.js';
import EN_COMMUN from '../../lib/i18n/en-commun.js';
import EN_HOME from '../../lib/i18n/en-home.js';
import EN_COURS from '../../lib/i18n/en-cours.js';
import EN_ESPACE from '../../lib/i18n/en-espace.js';
import EN_CONNEXION from '../../lib/i18n/en-connexion.js';
import EN_EMAILS from '../../lib/i18n/en-emails.js';
import EN_CRONS from '../../lib/i18n/en-crons.js';
import EN_ROUTES from '../../lib/i18n/en-routes.js';
import EN_SERVICES from '../../lib/i18n/en-services.js';
import {
  DICTIONNAIRES, LANGUES_PORTAIL, COOKIE_LANGUE, cookieLangue, interpoler, localeDe,
  normaliserLangue, resoudreLangue, traduire, traducteur, langueStudio, langueEleve,
  langueNavigateur, reglageLangueStudio, REGLAGES_LANGUE_STUDIO, REGLAGE_LANGUE_DEFAUT,
} from '../../lib/i18n-portail.js';

const racine = process.cwd();
const fichiers = listerFichiers(racine);
const { cles, templates } = auditerFichiers(fichiers);
const EN = DICTIONNAIRES.en;
const rel = (f) => f.replace(racine, '').replace(/\\/g, '/');

test.describe('i18n portail : le code', () => {
  test('le portail appelle t() (le mécanisme est branché)', () => {
    expect(cles.length).toBeGreaterThan(50);
  });

  test('aucun t(`…`) en template literal', () => {
    expect(templates.map(x => `${rel(x.fichier)}:${x.ligne}`)).toEqual([]);
  });

  test('chaque clé du portail a son anglais', () => {
    const manquantes = cles.filter(c => typeof EN[c.cle] !== 'string')
      .map(c => `${JSON.stringify(c.cle)} (${rel(c.fichier)}:${c.ligne})`);
    expect(manquantes).toEqual([]);
  });

  test('les variables d\'une traduction sont celles de sa clé', () => {
    const ecarts = Object.entries(EN)
      .filter(([fr, en]) => JSON.stringify(variablesDe(fr)) !== JSON.stringify(variablesDe(en)))
      .map(([fr, en]) => `${fr} → ${en}`);
    expect(ecarts).toEqual([]);
  });

  test('une même clé dans deux dictionnaires porte le même anglais', () => {
    // Les dictionnaires sont fusionnés par spread : une clé courte (« à »,
    // « le », « Inscrit·e ») déclarée deux fois avec deux valeurs, c'est la
    // dernière qui gagne, en silence. On refuse la divergence.
    const groupes = { commun: EN_COMMUN, home: EN_HOME, cours: EN_COURS, espace: EN_ESPACE, connexion: EN_CONNEXION, emails: EN_EMAILS, crons: EN_CRONS, routes: EN_ROUTES, services: EN_SERVICES };
    const vus = new Map();
    const conflits = [];
    for (const [g, dico] of Object.entries(groupes)) {
      for (const [k, v] of Object.entries(dico)) {
        const prev = vus.get(k);
        if (prev && prev.v !== v) conflits.push(`${JSON.stringify(k)} : ${prev.g}=${JSON.stringify(prev.v)} / ${g}=${JSON.stringify(v)}`);
        if (!prev) vus.set(k, { g, v });
      }
    }
    expect(conflits).toEqual([]);
  });

  test('aucune traduction vide, aucun tiret cadratin', () => {
    const fautes = Object.entries(EN)
      .filter(([, en]) => !String(en).trim() || /[—–]/.test(en))
      .map(([fr]) => fr);
    expect(fautes).toEqual([]);
  });

  test('plus de \'fr-FR\' en dur dans les composants navigateur du portail', () => {
    const restes = [];
    for (const f of fichiers) {
      const src = readFileSync(f, 'utf8');
      if (!/^['"]use client['"]/m.test(src)) continue;
      const lignes = src.split('\n');
      lignes.forEach((l, i) => { if (/['"]fr-FR['"]/.test(l)) restes.push(`${rel(f)}:${i + 1}`); });
    }
    expect(restes).toEqual([]);
  });
});

test.describe('i18n portail : la résolution', () => {
  test('deux langues, le français par défaut', () => {
    expect(LANGUES_PORTAIL).toEqual(['fr', 'en']);
    expect(resoudreLangue({})).toBe('fr');
    expect(resoudreLangue({ cookie: null, studio: null })).toBe('fr');
  });

  test('le cookie de la visiteuse prime sur le réglage du studio', () => {
    expect(resoudreLangue({ cookie: 'fr', studio: 'en' })).toBe('fr');
    expect(resoudreLangue({ cookie: 'en', studio: 'fr' })).toBe('en');
    expect(resoudreLangue({ cookie: null, studio: 'en' })).toBe('en');
  });

  test('un code inconnu ou difforme retombe sur le français', () => {
    expect(resoudreLangue({ cookie: 'de', studio: 'es' })).toBe('fr');
    expect(resoudreLangue({ cookie: '', studio: 42 })).toBe('fr');
    expect(normaliserLangue('en-GB')).toBe('en');
    expect(normaliserLangue('FR_fr')).toBe('fr');
    expect(normaliserLangue('klingon')).toBeNull();
    expect(langueStudio({ langue_portail: 'en' })).toBe('en');
    expect(langueStudio(null)).toBe('fr');
  });

  test('un email à une élève : sa fiche > le studio > français (v122)', () => {
    expect(langueEleve({ client: { langue: 'en' }, studio: { langue_portail: 'fr' } })).toBe('en');
    expect(langueEleve({ client: { langue: 'fr' }, studio: { langue_portail: 'en' } })).toBe('fr');
    expect(langueEleve({ client: { langue: null }, studio: { langue_portail: 'en' } })).toBe('en');
    expect(langueEleve({ client: null, studio: { langue_portail: 'en' } })).toBe('en');
    expect(langueEleve({ client: {}, studio: {} })).toBe('fr');
    expect(langueEleve()).toBe('fr');
    expect(langueEleve({ client: { langue: 'klingon' }, studio: { langue_portail: 'de' } })).toBe('fr');
  });

  // v123 (2026-09-23) : le navigateur de la visiteuse en repli, « auto » par défaut.
  test('la langue du navigateur : la première préférée qui soit fr ou en', () => {
    expect(langueNavigateur('en-US,en;q=0.9')).toBe('en');
    expect(langueNavigateur('fr-FR,fr;q=0.9,en;q=0.8')).toBe('fr');
    expect(langueNavigateur('es-ES,en;q=0.8')).toBe('en');
    expect(langueNavigateur('de-DE,de;q=0.9')).toBeNull();
    expect(langueNavigateur('en;q=0.5, fr;q=0.9')).toBe('fr');
    expect(langueNavigateur('*')).toBeNull();
    expect(langueNavigateur('')).toBeNull();
    expect(langueNavigateur(null)).toBeNull();
    expect(langueNavigateur('fr-CA')).toBe('fr');
  });

  test('le réglage du studio : auto | fr | en, tout le reste vaut auto', () => {
    expect(REGLAGES_LANGUE_STUDIO).toEqual(['auto', 'fr', 'en']);
    expect(REGLAGE_LANGUE_DEFAUT).toBe('auto');
    expect(reglageLangueStudio({ langue_portail: 'en' })).toBe('en');
    expect(reglageLangueStudio({ langue_portail: 'FR' })).toBe('fr');
    expect(reglageLangueStudio({ langue_portail: 'auto' })).toBe('auto');
    expect(reglageLangueStudio({ langue_portail: null })).toBe('auto');
    expect(reglageLangueStudio(null)).toBe('auto');
    expect(reglageLangueStudio({ langue_portail: 'klingon' })).toBe('auto');
  });

  test('résolution : cookie > studio qui a choisi > navigateur si auto > fr', () => {
    expect(resoudreLangue({ cookie: 'fr', studio: 'auto', navigateur: 'en' })).toBe('fr');
    expect(resoudreLangue({ cookie: null, studio: 'auto', navigateur: 'en' })).toBe('en');
    expect(resoudreLangue({ cookie: null, studio: 'auto', navigateur: 'fr' })).toBe('fr');
    expect(resoudreLangue({ cookie: null, studio: 'auto', navigateur: null })).toBe('fr');
    // Le studio a CHOISI : le navigateur ne compte plus.
    expect(resoudreLangue({ cookie: null, studio: 'fr', navigateur: 'en' })).toBe('fr');
    expect(resoudreLangue({ cookie: null, studio: 'en', navigateur: 'fr' })).toBe('en');
    // Sans v123 (colonne absente → null) : le navigateur compte, comme en auto.
    expect(resoudreLangue({ cookie: null, studio: null, navigateur: 'en' })).toBe('en');
    // Un email n'a pas de navigateur : auto vaut français.
    expect(langueStudio({ langue_portail: 'auto' })).toBe('fr');
    expect(langueEleve({ client: { langue: null }, studio: { langue_portail: 'auto' } })).toBe('fr');
  });

  test('v123 : la migration dit la même chose que le code, et plus aucune surface ne pose la langue sans passer par memoriserLangueVisite', () => {
    const sql = readFileSync(join(racine, 'migrations-v123-langue-portail-auto.sql'), 'utf8');
    expect(sql).toContain("check (langue_portail in ('auto', 'fr', 'en'))");
    expect(sql).toContain("set default 'auto'");
    expect(sql).toMatch(/set langue_portail = 'auto'\s+where langue_portail = 'fr'/);
    const surfaces = [
      'app/p/[studioSlug]/page.js', 'app/p/[studioSlug]/espace/page.js',
      'app/api/portail/[studioSlug]/reserver/route.js', 'app/api/portail/[studioSlug]/reserver-serie/route.js',
      'app/api/portail/[studioSlug]/essai/route.js', 'app/api/portail/[studioSlug]/liste-attente/route.js',
      'app/api/portail/[studioSlug]/annuler/route.js',
    ];
    for (const f of surfaces) {
      const src = readFileSync(join(racine, f), 'utf8');
      expect(src, f).toMatch(/memoriserLangueVisite(Requete)?\(/);
      expect(src, f).not.toMatch(/poserLangueFiche\(/);
    }
    const carte = readFileSync(join(racine, 'app/(dashboard)/parametres/sections/PagePubliqueSection.js'), 'utf8');
    expect(carte).toContain("['auto', 'Automatique']");
  });

  test('le locale suit la langue', () => {
    expect(localeDe('fr')).toBe('fr-FR');
    expect(localeDe('en')).toBe('en-GB');
    expect(traducteur('en').locale).toBe('en-GB');
    expect(traducteur('xx').langue).toBe('fr');
  });
});

test.describe('i18n portail : traduire', () => {
  test('rend le français en français, l\'anglais en anglais', () => {
    expect(traduire('fr', 'Mon espace')).toBe('Mon espace');
    expect(traduire('en', 'Mon espace')).toBe(EN['Mon espace']);
    expect(EN['Mon espace']).not.toBe('Mon espace');
  });

  test('une clé absente rend le français, jamais un identifiant', () => {
    expect(traduire('en', 'Phrase que personne n\'a traduite')).toBe('Phrase que personne n\'a traduite');
  });

  test('interpole des deux côtés, et laisse un marqueur sans valeur', () => {
    expect(interpoler('{n} places', { n: 3 })).toBe('3 places');
    expect(interpoler('{n} places', {})).toBe('{n} places');
    expect(traduire('en', 'Messages ({n} non lus)', { n: 2 })).toBe('Messages (2 unread)');
    expect(traduire('fr', 'Messages ({n} non lus)', { n: 2 })).toBe('Messages (2 non lus)');
  });

  test('le cookie du sélecteur est bien formé et borné aux deux langues', () => {
    expect(cookieLangue('en')).toMatch(new RegExp(`^${COOKIE_LANGUE}=en; path=/; max-age=\\d+; samesite=lax$`));
    expect(cookieLangue('klingon')).toMatch(new RegExp(`^${COOKIE_LANGUE}=fr;`));
  });
});
