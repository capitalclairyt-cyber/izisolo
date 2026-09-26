// ═══════════════════════════════════════════════════════════════════════════
// Verrou CI — d'où vient une inscription (2026-09-26, campagne Google Ads).
//
// Le site n'a aucune balise Google et sa page RGPD promet « aucun cookie
// publicitaire, traqueur tiers, pixel ». La campagne se mesure quand même :
// les utm_* de l'annonce voyagent dans l'URL, recopiés par LienCta sur les
// liens internes, puis rangés dans la metadata du compte (/register) et sur
// la demande concierge (colonne `source`, v125, UPDATE séparé).
//
// Ce qu'on ne laisse pas glisser :
//   1. AUCUN stockage sur le terminal : ni cookie, ni localStorage, ni
//      sessionStorage dans lib/acquisition ni dans LienCta. La promesse RGPD
//      tient parce que la mesure ne touche pas au navigateur de la visiteuse.
//   2. Un paramètre déjà posé sur un lien n'est jamais écrasé : le
//      `?src=changer` de /changer-d-outil pré-remplit le formulaire concierge,
//      il doit survivre à la recopie des utm.
//   3. Ce qui arrive de l'URL ou d'un corps JSON est nettoyé : longueur,
//      chevrons, guillemets, ValueTrack non rempli (« {keyword} »).
//   4. La colonne `source` n'entre JAMAIS dans l'insert de la demande : une
//      demande doit passer avec ou sans v125.
// ═══════════════════════════════════════════════════════════════════════════
import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  lireAcquisition, sanitizeAcquisition, hrefAvecAcquisition,
  resumeAcquisition, libelleSource, inscriptionsParSource,
} from '../../lib/acquisition.js';

// Playwright compile les specs en CommonJS : pas d'import.meta.url ici, la
// racine du dépôt est le cwd (comme les autres verrous textuels).
const lire = (p) => readFileSync(join(process.cwd(), p), 'utf8');
const URL_ADS = 'utm_source=google&utm_medium=cpc&utm_campaign=recherche-oct-2026&utm_content=yoga&utm_term=logiciel+prof+yoga';
const ACQ = { source: 'google', canal: 'cpc', campagne: 'recherche-oct-2026', groupe: 'yoga', mot: 'logiciel prof yoga' };

test.describe('lireAcquisition : les utm_* de l\'URL', () => {
  test('lit les cinq champs, en minuscules, décodés', () => {
    expect(lireAcquisition('?' + URL_ADS)).toEqual(ACQ);
    expect(lireAcquisition(new URLSearchParams(URL_ADS))).toEqual(ACQ);
    expect(lireAcquisition('?utm_source=Google&utm_medium=CPC')).toEqual({ source: 'google', canal: 'cpc' });
  });

  test('sans utm_source, rien : null', () => {
    expect(lireAcquisition('')).toBeNull();
    expect(lireAcquisition('?src=qr-carte')).toBeNull();
    expect(lireAcquisition('?utm_medium=cpc&utm_campaign=x')).toBeNull();
    expect(lireAcquisition(null)).toBeNull();
  });

  test('un ValueTrack non rempli n\'est pas un mot, les chevrons partent, la longueur est bornée', () => {
    expect(lireAcquisition('?utm_source=google&utm_term=%7Bkeyword%7D')).toEqual({ source: 'google' });
    expect(lireAcquisition('?utm_source=google&utm_term=%3Cscript%3Ealert(1)%3C/script%3E').mot).toBe('scriptalert(1)/script');
    const long = 'a'.repeat(300);
    expect(lireAcquisition(`?utm_source=google&utm_term=${long}`).mot).toHaveLength(100);
    expect(lireAcquisition(`?utm_source=${long}`).source).toHaveLength(40);
  });
});

test.describe('sanitizeAcquisition : un objet reçu d\'un corps JSON', () => {
  test('accepte un objet propre, refuse le reste', () => {
    expect(sanitizeAcquisition(ACQ)).toEqual(ACQ);
    expect(sanitizeAcquisition({ source: ' Google ', groupe: 'Yoga' })).toEqual({ source: 'google', groupe: 'yoga' });
    expect(sanitizeAcquisition({ canal: 'cpc' })).toBeNull();
    expect(sanitizeAcquisition(['google'])).toBeNull();
    expect(sanitizeAcquisition('google')).toBeNull();
    expect(sanitizeAcquisition(null)).toBeNull();
  });
});

test.describe('hrefAvecAcquisition : la source suit les liens internes', () => {
  test('recopie les utm sur /register et /creer-mon-studio', () => {
    expect(hrefAvecAcquisition('/register', ACQ)).toBe('/register?' + URL_ADS);
    expect(hrefAvecAcquisition('/creer-mon-studio', ACQ)).toBe('/creer-mon-studio?' + URL_ADS);
  });

  test('ne touche jamais à un paramètre déjà posé', () => {
    const h = hrefAvecAcquisition('/creer-mon-studio?src=changer', ACQ);
    expect(h.startsWith('/creer-mon-studio?src=changer&')).toBe(true);
    expect(h).toContain('utm_source=google');
    expect(hrefAvecAcquisition('/register?utm_source=newsletter', ACQ)).toBe('/register?utm_source=newsletter&utm_medium=cpc&utm_campaign=recherche-oct-2026&utm_content=yoga&utm_term=logiciel+prof+yoga');
    expect(hrefAvecAcquisition('/register?structure=studio', ACQ)).toContain('structure=studio&utm_source=google');
  });

  test('garde l\'ancre, laisse passer l\'externe, l\'ancre seule et l\'href non textuel', () => {
    expect(hrefAvecAcquisition('/#tarifs', ACQ)).toBe('/?' + URL_ADS + '#tarifs');
    expect(hrefAvecAcquisition('https://www.instagram.com/izisoloyoga', ACQ)).toBe('https://www.instagram.com/izisoloyoga');
    expect(hrefAvecAcquisition('//evil.example', ACQ)).toBe('//evil.example');
    expect(hrefAvecAcquisition('#faq', ACQ)).toBe('#faq');
    expect(hrefAvecAcquisition('mailto:bonjour@izisolo.fr', ACQ)).toBe('mailto:bonjour@izisolo.fr');
    const obj = { pathname: '/register' };
    expect(hrefAvecAcquisition(obj, ACQ)).toBe(obj);
  });

  test('sans source, le lien est rendu tel quel', () => {
    expect(hrefAvecAcquisition('/register', null)).toBe('/register');
    expect(hrefAvecAcquisition('/register', {})).toBe('/register');
  });
});

test.describe('libellés et regroupement pour l\'admin', () => {
  test('resumeAcquisition et libelleSource', () => {
    expect(resumeAcquisition(ACQ)).toBe('google / cpc / recherche-oct-2026 / yoga / logiciel prof yoga');
    expect(resumeAcquisition(null)).toBeNull();
    expect(libelleSource(ACQ)).toBe('Google Ads · yoga');
    expect(libelleSource({ source: 'google', canal: 'cpc' })).toBe('Google Ads');
    expect(libelleSource({ source: 'newsletter', groupe: 'sept' })).toBe('newsletter · sept');
    expect(libelleSource(null)).toBe('Direct ou inconnu');
  });

  test('inscriptionsParSource : funnel par source, comptes de test exclus, tri par volume', () => {
    const profils = [
      { est_test: false, acquisition: ACQ, created_at: '2026-09-20', studio_slug: 'a', nb_cours: 3, nb_clients: 2 },
      { est_test: false, acquisition: ACQ, created_at: '2026-08-01', studio_slug: null, nb_cours: 0, nb_clients: 0 },
      { est_test: false, acquisition: null, created_at: '2026-09-25', studio_slug: 'c', nb_cours: 0, nb_clients: 5 },
      { est_test: true, acquisition: ACQ, created_at: '2026-09-25', studio_slug: 't', nb_cours: 9, nb_clients: 9 },
    ];
    expect(inscriptionsParSource(profils, { depuis: '2026-09-01' })).toEqual([
      { source: 'Google Ads · yoga', inscrits: 2, recents: 1, onboardes: 1, avecCours: 1, avecEleves: 1 },
      { source: 'Direct ou inconnu', inscrits: 1, recents: 1, onboardes: 1, avecCours: 0, avecEleves: 1 },
    ]);
    expect(inscriptionsParSource([])).toEqual([]);
  });
});

test.describe('câblage : la mesure existe sans jamais toucher au navigateur', () => {
  test('lib/acquisition et LienCta ne posent ni cookie ni stockage', () => {
    for (const f of ['lib/acquisition.js', 'components/landing/LienCta.js']) {
      const src = lire(f);
      // Un USAGE (accès à une propriété ou un appel), pas le mot dans un commentaire
      // qui explique justement pourquoi on ne s'en sert pas.
      expect(src, f).not.toMatch(/document\.cookie|(localStorage|sessionStorage)\s*[.[]|indexedDB\s*[.(]/);
    }
  });

  test('les huit surfaces marketing passent par LienCta, plus aucune par next/link', () => {
    for (const f of ['Calculateur', 'ChangerOutil', 'ComptabiliteLanding', 'LocalLanding', 'LogicielGestionLanding', 'PersonaLanding', 'Sections', 'Structures']) {
      const src = lire(`components/landing/${f}.js`);
      expect(src, f).toMatch(/import Link from '\.\/LienCta'/);
      expect(src, f).not.toMatch(/from 'next\/link'/);
    }
  });

  test('/register range la source dans la metadata du compte, le guichet l\'envoie avec la demande', () => {
    expect(lire('app/(auth)/register/page.js')).toMatch(/acquisition: acq/);
    expect(lire('components/landing/CreerMonStudio.js')).toMatch(/acquisition: acq/);
  });

  test('la route concierge pose `source` par UPDATE séparé, jamais dans l\'insert', () => {
    const route = lire('app/api/demande-studio/route.js');
    expect(route).toMatch(/\.insert\(valeurs\)/);
    expect(route).toMatch(/\.update\(\{ source \}\)/);
    expect(route).toMatch(/PGRST204/);
    expect(lire('lib/demande-studio.js')).not.toMatch(/source: texte\(/);
  });

  test('la page RGPD promet toujours l\'absence de traceur tiers', () => {
    expect(lire('app/(legal)/legal/rgpd/page.js')).toMatch(/Aucun cookie publicitaire/);
    expect(lire('app/layout.js')).not.toMatch(/googletagmanager|gtag\(/);
  });
});
