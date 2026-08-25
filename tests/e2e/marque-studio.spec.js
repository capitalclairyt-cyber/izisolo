// ═══════════════════════════════════════════════════════════════════════════
// Verrou CI — l'identité visuelle d'un studio (v104, 2026-08-25).
//
// Deux chantiers, un même déclencheur : une prof qui lance son activité,
// venue d'un vocal Instagram, revenue déçue d'un concurrent pour des raisons
// PUREMENT visuelles. Ses couleurs jusque sur son portail, et son portail sur
// son propre sous-domaine.
//
// Ce qu'on ne laisse pas glisser :
//   1. Aucune couleur brute ne peint jamais un texte. Un jaune pâle choisi
//      tel quel donnerait un bouton illisible : on l'assombrit, on ne le
//      refuse pas.
//   2. `capsule.` (l'admin) ne doit JAMAIS être pris pour un studio, et un
//      slug de studio ne doit jamais valoir un sous-domaine réservé.
//   3. Sur l'hôte d'un studio, `/api/` et `/auth/` restent intacts : le lien
//      magique d'une élève atterrit dans `/auth/`.
// ═══════════════════════════════════════════════════════════════════════════
import { test, expect } from '@playwright/test';
import {
  slugDepuisHote, cheminReecrit, servirTelQuel,
  SOUS_DOMAINES_RESERVES,
} from '../../lib/studio-host.js';
import {
  sanitizeCouleursMarque, lireCouleursMarque, stylePortail,
} from '../../lib/couleurs-marque.js';
import { deriverCouleursPortail, parseHexCouleur } from '../../lib/embed-couleurs.js';

// ── Le sous-domaine ────────────────────────────────────────────────────────

test.describe('slugDepuisHote — un studio, et rien que des studios', () => {
  test('un sous-domaine simple donne son slug', () => {
    expect(slugDepuisHote('mon-studio.izisolo.fr')).toBe('mon-studio');
    expect(slugDepuisHote('MON-STUDIO.IZISOLO.FR')).toBe('mon-studio');
    expect(slugDepuisHote('atelier-soleil.izisolo.fr:443')).toBe('atelier-soleil');
  });

  test('LE test qui compte : capsule (l\'admin) n\'est JAMAIS un studio', () => {
    // Le proxy teste l'hôte admin en premier, mais on ne se repose pas sur
    // l'ordre d'un fichier : servir le portail d'un « studio capsule »
    // exposerait la surface d'administration à qui sait taper une URL.
    expect(slugDepuisHote('capsule.izisolo.fr')).toBeNull();
    for (const reserve of SOUS_DOMAINES_RESERVES) {
      expect(slugDepuisHote(`${reserve}.izisolo.fr`), reserve).toBeNull();
    }
  });

  test('ni l\'apex, ni www, ni les previews, ni une IP', () => {
    expect(slugDepuisHote('izisolo.fr')).toBeNull();
    expect(slugDepuisHote('www.izisolo.fr')).toBeNull();
    expect(slugDepuisHote('izisolo-git-main.vercel.app')).toBeNull();
    expect(slugDepuisHote('127.0.0.1:3333')).toBeNull();
    expect(slugDepuisHote('localhost:3333')).toBeNull();
    expect(slugDepuisHote('')).toBeNull();
    expect(slugDepuisHote(null)).toBeNull();
  });

  test('un seul niveau : a.b.izisolo.fr n\'est pas un studio', () => {
    expect(slugDepuisHote('a.b.izisolo.fr')).toBeNull();
  });

  test('un sous-domaine hors grammaire de slug est refusé', () => {
    expect(slugDepuisHote('-truc.izisolo.fr')).toBeNull();
    expect(slugDepuisHote('truc-.izisolo.fr')).toBeNull();
    expect(slugDepuisHote('tru_c.izisolo.fr')).toBeNull();
  });

  test('*.localhost marche en développement (aucun fichier hosts à toucher)', () => {
    expect(slugDepuisHote('preuve.localhost:3333')).toBe('preuve');
  });
});

test.describe('cheminReecrit — on réécrit, on ne redirige pas', () => {
  test('la racine sert le portail, le reste suit', () => {
    expect(cheminReecrit('mon-studio', '/')).toBe('/p/mon-studio');
    expect(cheminReecrit('mon-studio', '/espace')).toBe('/p/mon-studio/espace');
    expect(cheminReecrit('mon-studio', '/cours/abc')).toBe('/p/mon-studio/cours/abc');
  });

  test('LE chemin à ne pas casser : /auth/ reste intact', () => {
    // Le lien magique d'une élève atterrit là. Le réécrire vers /p/… la
    // renverrait sur un portail sans session, et elle n'y comprendrait rien.
    expect(cheminReecrit('mon-studio', '/auth/callback')).toBeNull();
    expect(servirTelQuel('/auth/callback')).toBe(true);
  });

  test('API, assets et service worker sont servis tels quels', () => {
    for (const p of ['/api/portail/x', '/_next/static/a.js', '/icons/a.png',
                     '/sw.js', '/worker-abc.js', '/workbox-abc.js', '/manifest.json',
                     '/robots.txt', '/sitemap.xml', '/offline']) {
      expect(cheminReecrit('mon-studio', p), p).toBeNull();
    }
  });

  test('une URL déjà préfixée n\'est pas préfixée deux fois', () => {
    // Sinon un vieux lien mon-studio.izisolo.fr/p/mon-studio deviendrait
    // /p/mon-studio/p/mon-studio.
    expect(cheminReecrit('mon-studio', '/p/mon-studio')).toBeNull();
    expect(cheminReecrit('mon-studio', '/p/autre/espace')).toBeNull();
  });

  test('sans slug, rien n\'est réécrit', () => {
    expect(cheminReecrit(null, '/')).toBeNull();
  });
});

// ── Les couleurs de marque ─────────────────────────────────────────────────

test.describe('couleurs de marque — lisibles quoi qu\'elle choisisse', () => {
  test('deux couleurs max, nettoyées, jamais devinées', () => {
    expect(sanitizeCouleursMarque({ c1: '#7A5FB0', c2: '#E8927C' })).toEqual({ c1: '7a5fb0', c2: 'e8927c' });
    expect(sanitizeCouleursMarque({ c1: '#abc' })).toEqual({ c1: 'aabbcc' });
    // Sans la première, la seconde n'a pas de sens.
    expect(sanitizeCouleursMarque({ c2: '#e8927c' })).toBeNull();
    expect(sanitizeCouleursMarque({ c1: 'pas-une-couleur' })).toBeNull();
    expect(sanitizeCouleursMarque(null)).toBeNull();
    // Une seconde couleur illisible est jetée, la première survit.
    expect(sanitizeCouleursMarque({ c1: '#7a5fb0', c2: 'zzz' })).toEqual({ c1: '7a5fb0' });
  });

  test('lireCouleursMarque dégrade sans la colonne (pré-v104)', () => {
    expect(lireCouleursMarque({})).toBeNull();
    expect(lireCouleursMarque(null)).toBeNull();
    expect(lireCouleursMarque({ couleurs_marque: { c1: '#7a5fb0' } })).toEqual({ c1: '7a5fb0' });
  });

  test('LE test qui compte : un jaune pâle donne quand même du texte lisible', () => {
    // Sinon la prof choisit sa couleur de marque et se retrouve avec un bouton
    // blanc sur blanc. On assombrit, on ne refuse pas son choix.
    const tokens = deriverCouleursPortail('f7e08a');
    const [r, g, b] = tokens['--brand'].match(/\d+/g).map(Number);
    const lum = [r, g, b].map(v => {
      const c = v / 255;
      return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    });
    const L = 0.2126 * lum[0] + 0.7152 * lum[1] + 0.0722 * lum[2];
    const contraste = 1.05 / (L + 0.05);
    expect(contraste, `contraste de --brand vs blanc : ${contraste.toFixed(2)}:1`).toBeGreaterThanOrEqual(4.5);
  });

  test('les tokens produits sont ceux que le portail consomme', () => {
    // globals.css thème le portail par --brand* : produire d'autres noms
    // reviendrait à ne rien peindre du tout, en silence.
    const tokens = stylePortail({ c1: '#7a5fb0', c2: '#e8927c' });
    for (const cle of ['--brand', '--brand-dark', '--brand-light', '--brand-500', '--brand-700']) {
      expect(Object.keys(tokens), cle).toContain(cle);
      expect(tokens[cle]).toMatch(/^rgb\(/);
    }
  });

  test('aucun réglage = aucune surcharge (la palette du métier reste)', () => {
    expect(stylePortail(null)).toBeNull();
    expect(stylePortail({ c2: '#e8927c' })).toBeNull();
    expect(deriverCouleursPortail('nawak')).toBeNull();
  });

  test('une seule couleur suffit : la seconde se dérive de la première', () => {
    const un = stylePortail({ c1: '#7a5fb0' });
    const deux = stylePortail({ c1: '#7a5fb0', c2: '#7a5fb0' });
    expect(un['--marque-2']).toBe(deux['--marque-2']);
    expect(parseHexCouleur('#7a5fb0')).toBe('7a5fb0');
  });
});
